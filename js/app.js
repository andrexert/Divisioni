/*
 * Impariamo insieme — nucleo dell'applicazione.
 *
 * Gestisce il menu, le impostazioni (salvate nel browser), la voce, i suoni,
 * la tastiera fisica e gli sfondi. Ogni attività è un file separato in
 * js/attivita/ che si registra con Impariamo.registra({...}). Vedi il README.
 *
 * Il codice è scritto in JavaScript "classico" (ES5) e usa solo funzioni
 * disponibili da anni in tutti i browser: Safari anche vecchi (iMac, iPad),
 * Chrome, Edge, Firefox, Chromebook, telefoni Android e iPhone.
 */
(function () {
  'use strict';

  var CHIAVE_ARCHIVIO = 'impariamo.impostazioni.v1';
  var CHIAVE_ULTIMA_SESSIONE = 'impariamo.ultima-sessione.v1';
  var CHIAVE_LIVELLI = 'impariamo.livelli.v1';

  // Criterio di padronanza: due sessioni di fila al livello attuale
  var SOGLIA_PRONTO = 0.8;      // almeno l'80% al primo tentativo (es. 4 su 5): pronto per il livello dopo
  var SOGLIA_FATICA = 0.4;      // sotto il 40% due volte: il docente valuta di tornare indietro
  var SFONDO_MENU = 'img/sfondo-menu.png';
  var SFONDO_LARGHEZZA = 320, SFONDO_ALTEZZA = 192; // dimensioni originali degli sfondi
  var PAROLA_DOCENTE = 'docente'; // da scrivere per aprire le impostazioni

  var SI_NO = [
    { valore: true, testo: 'Sì' },
    { valore: false, testo: 'No' }
  ];

  /*
   * Le impostazioni d'uso quotidiano valgono per tutte le attività, così il docente
   * le sceglie una volta sola. Ogni attività ha solo le sue regole di difficoltà,
   * raccolte nelle "opzioni avanzate" e usate solo con "Difficoltà: scelgo io".
   */
  var IMPOSTAZIONI_ESERCIZI = [
    {
      chiave: 'lunghezza', etichetta: 'Esercizi per sessione', predefinito: 'media',
      opzioni: [
        { valore: 'breve', testo: 'Pochi' },
        { valore: 'media', testo: 'Normali' },
        { valore: 'lunga', testo: 'Tanti' }
      ]
    },
    {
      chiave: 'tema', etichetta: 'Animali e cibo', predefinito: 'scelta',
      opzioni: [
        { valore: 'scelta', testo: 'Li sceglie il ragazzo' },
        { valore: 'animali', testo: 'A caso (uguali per tutta la sessione)' },
        { valore: 'gatti', testo: 'Gattini e pesci' },
        { valore: 'cani', testo: 'Cagnolini e ossi' },
        { valore: 'conigli', testo: 'Coniglietti e carote' },
        { valore: 'scoiattoli', testo: 'Scoiattoli e ghiande' },
        { valore: 'pallini', testo: 'Pallini e scatole' }
      ]
    },
    {
      chiave: 'aiuto', etichetta: 'Disegni e tabelline di aiuto', predefinito: 'richiesta',
      opzioni: [
        { valore: 'sempre', testo: 'Sempre' },
        { valore: 'richiesta', testo: 'Su richiesta o dopo un errore' },
        { valore: 'mai', testo: 'Mai' }
      ]
    },
    {
      chiave: 'guida', etichetta: 'Operazioni in colonna', predefinito: 'guidato',
      opzioni: [
        { valore: 'guidato', testo: 'Guidate: una domanda per ogni passo' },
        { valore: 'semiguidato', testo: 'Semiguidate: solo la colonna evidenziata' },
        { valore: 'autonomo', testo: 'Da solo: scrive tutto, poi si controlla' }
      ]
    },
    {
      chiave: 'avanzamento', etichetta: 'Passaggio al livello successivo', predefinito: 'docente',
      opzioni: [
        { valore: 'docente', testo: 'Lo decido io (il programma propone)' },
        { valore: 'automatico', testo: 'Automatico' }
      ]
    }
  ];
  var IMPOSTAZIONI_ASPETTO = [
    { chiave: 'voce', etichetta: 'Lettura vocale delle consegne', predefinito: false, opzioni: SI_NO },
    { chiave: 'pittogrammi', etichetta: 'Pittogrammi CAA nelle consegne', predefinito: false, opzioni: SI_NO },
    { chiave: 'suoni', etichetta: 'Suoni di conferma (leggeri)', predefinito: false, opzioni: SI_NO },
    {
      chiave: 'colori', etichetta: 'Colori', predefinito: 'vivaci',
      opzioni: [{ valore: 'vivaci', testo: 'Vivaci' }, { valore: 'tenui', testo: 'Tenui (più calmi)' }]
    },
    { chiave: 'sfondi', etichetta: 'Sfondi illustrati', predefinito: true, opzioni: SI_NO },
    { chiave: 'caratteriGrandi', etichetta: 'Caratteri più grandi', predefinito: false, opzioni: SI_NO },
    { chiave: 'altoContrasto', etichetta: 'Alto contrasto', predefinito: false, opzioni: SI_NO }
  ];
  var IMPOSTAZIONI_GENERALI = IMPOSTAZIONI_ESERCIZI.concat(IMPOSTAZIONI_ASPETTO);

  // Tipi di errore registrati dalle attività, con il nome da mostrare al docente
  var NOMI_ERRORI = {
    conteggio: 'contare gli oggetti', calcolo: 'il calcolo', resto: 'il resto',
    somma: 'le somme', unita: 'scrivere solo le unità (riporto)', prodotto: 'le tabelline',
    differenza: 'le sottrazioni', decisione: 'capire se serve il prestito',
    'ci-sta': 'capire se il divisore ci sta', 'quante-volte': 'quante volte ci sta',
    operazione: 'scegliere l\'operazione', cifra: 'scrivere le cifre da solo'
  };

  var elencoAttivita = [];
  var elencoAree = [];          // macro aree del menu: una per operazione
  var indietro = null;          // dove porta il pulsante in alto a sinistra
  var impostazioni = { generale: {} };
  var contenuto, titolo, bottoneMenu;
  var audioCtx = null;
  var voceItaliana = null;
  var attivitaCorrente = null;  // serve per mostrare la sua mascotte
  var gestoreTasti = null;      // l'attività in corso può ricevere i tasti premuti
  var sulMenu = false;          // true quando si vede il menu principale
  var aggiornamentoPronto = false;

  /* ---------- Utilità DOM ---------- */

  // Crea un elemento: el('button', { classe: 'x', testo: 'Ciao', onclick: fn }, [figli])
  function el(tag, attributi, figli) {
    var nodo = document.createElement(tag);
    if (attributi) {
      Object.keys(attributi).forEach(function (k) {
        var v = attributi[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'testo') nodo.textContent = v;
        else if (k === 'classe') nodo.className = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') nodo.addEventListener(k.slice(2), v);
        else nodo.setAttribute(k, v === true ? '' : v);
      });
    }
    (figli || []).forEach(function (f) {
      if (f === null || f === undefined) return;
      nodo.appendChild(typeof f === 'object' ? f : document.createTextNode(String(f)));
    });
    return nodo;
  }

  function mascotte(classe) {
    if (!attivitaCorrente || !attivitaCorrente.immagine) return null;
    return el('img', { classe: classe, src: attivitaCorrente.immagine, alt: '', draggable: 'false' });
  }

  /* ---------- Archivio nel browser ---------- */

  function leggi(chiave) {
    try { return JSON.parse(window.localStorage.getItem(chiave)); } catch (e) { return null; }
  }

  function scrivi(chiave, valore) {
    // Navigazione privata o archiviazione bloccata: il programma funziona comunque
    try { window.localStorage.setItem(chiave, JSON.stringify(valore)); } catch (e) { /* niente */ }
  }

  // Usa il valore salvato solo se è ancora tra le opzioni valide, altrimenti il predefinito
  function conValoriValidi(descrittori, salvati) {
    var risultato = {};
    descrittori.forEach(function (d) {
      var valido = salvati && d.opzioni.some(function (o) { return o.valore === salvati[d.chiave]; });
      risultato[d.chiave] = valido ? salvati[d.chiave] : d.predefinito;
    });
    return risultato;
  }

  function carica() {
    var salvate = leggi(CHIAVE_ARCHIVIO) || {};
    statoLivelli = leggi(CHIAVE_LIVELLI) || {};
    impostazioni.generale = conValoriValidi(IMPOSTAZIONI_GENERALI, salvate.generale);
    elencoAttivita.forEach(function (a) {
      impostazioni[a.id] = conValoriValidi(a.impostazioni || [], salvate[a.id]);
    });
  }

  function salva() { scrivi(CHIAVE_ARCHIVIO, impostazioni); }

  /* ---------- Percorso a livelli ---------- */

  /*
   * Le attività con "livelli" hanno una scala ordinata: ogni gradino aggiunge una sola
   * difficoltà. In modalità "percorso" le impostazioni del livello sostituiscono quelle
   * manuali di difficoltà. Dopo ogni sessione si registra quanti esercizi sono stati
   * risolti al primo tentativo e si valuta se proporre il livello successivo.
   * (I dati restano su questo dispositivo e non contengono nomi.)
   */
  var statoLivelli = {};

  function statoDi(a) {
    var st = statoLivelli[a.id];
    if (!st || typeof st.livello !== 'number') st = statoLivelli[a.id] = { livello: 0, sessioni: [] };
    st.livello = Math.max(0, Math.min(a.livelli.length - 1, st.livello));
    return st;
  }

  function inPercorso(a) {
    return !!a.livelli && impostazioni[a.id].difficolta === 'percorso';
  }

  // 'su' (pronto per il livello dopo), 'giu' (fa fatica), oppure null
  function valuta(a) {
    if (!inPercorso(a)) return null;
    var st = statoDi(a);
    var ultime = st.sessioni.slice(-2);
    if (ultime.length < 2) return null;
    var quote = ultime.map(function (x) { return x.totale ? x.alPrimoTentativo / x.totale : 0; });
    if (st.livello < a.livelli.length - 1 && quote.every(function (q) { return q >= SOGLIA_PRONTO; })) return 'su';
    if (st.livello > 0 && quote.every(function (q) { return q < SOGLIA_FATICA; })) return 'giu';
    return null;
  }

  function cambiaLivello(a, nuovo) {
    var st = statoDi(a);
    st.livello = Math.max(0, Math.min(a.livelli.length - 1, nuovo));
    st.sessioni = [];
    scrivi(CHIAVE_LIVELLI, statoLivelli);
  }

  // Le impostazioni con cui parte l'attività: quelle del docente più quelle del livello
  function opzioniEffettive(a) {
    var opz = {};
    Object.keys(impostazioni[a.id]).forEach(function (k) { opz[k] = impostazioni[a.id][k]; });
    // Impostazioni comuni a tutte le attività
    var g = impostazioni.generale;
    var quanti = a.esercizi || [3, 5, 10];
    var indice = { breve: 0, media: 1, lunga: 2 }[g.lunghezza];
    opz.numeroEsercizi = quanti[indice === undefined ? 1 : indice];
    opz.tema = g.tema;
    opz.aiuto = g.aiuto;
    opz.guida = g.guida;
    opz.aiutoTabellina = { sempre: 'sempre', richiesta: 'errore', mai: 'mai' }[g.aiuto]; // tabellina di aiuto nella divisione in colonna
    if (inPercorso(a)) {
      var imp = a.livelli[statoDi(a).livello].imp;
      Object.keys(imp).forEach(function (k) { opz[k] = imp[k]; });
    }
    return opz;
  }

  // Proposte in attesa per il docente (pallino sull'ingranaggio)
  function proposte() {
    if (impostazioni.generale.avanzamento !== 'docente') return [];
    return elencoAttivita.filter(function (a) { return valuta(a); });
  }

  function aggiornaSegnale() {
    var n = proposte().length;
    var bottone = document.getElementById('btn-impostazioni');
    bottone.classList.toggle('con-proposta', n > 0);
    bottone.setAttribute('aria-label', 'Impostazioni per il docente' + (n ? ' (' + n + (n === 1 ? ' proposta' : ' proposte') + ' di livello)' : ''));
  }

  /* ---------- Aspetto ---------- */

  function applicaAspetto() {
    var radice = document.documentElement;
    radice.classList.toggle('caratteri-grandi', !!impostazioni.generale.caratteriGrandi);
    radice.classList.toggle('alto-contrasto', !!impostazioni.generale.altoContrasto);
    radice.classList.toggle('colori-tenui', impostazioni.generale.colori === 'tenui');
    // Gli sfondi si vedono solo con i colori vivaci: con "tenui" o alto contrasto
    // l'obiettivo è ridurre gli stimoli visivi, quindi si spengono da soli
    radice.classList.toggle('con-sfondo', !!impostazioni.generale.sfondi &&
      impostazioni.generale.colori === 'vivaci' && !impostazioni.generale.altoContrasto);
  }

  function impostaSfondo(percorso) {
    // Indirizzo assoluto: un url() relativo dentro una variabile CSS verrebbe
    // risolto rispetto al file CSS (css/) invece che rispetto alla pagina
    var assoluto = new URL(percorso, document.baseURI).href;
    document.documentElement.style.setProperty('--sfondo-immagine', 'url("' + assoluto + '")');
  }

  // Lo sfondo in pixel art viene ingrandito di un numero intero di volte
  // (2×, 3×, 4×...): così i pixel restano quadrati e nitidi su ogni schermo
  function adattaSfondo() {
    var scala = Math.max(1, Math.ceil(Math.max(
      window.innerWidth / SFONDO_LARGHEZZA,
      window.innerHeight / SFONDO_ALTEZZA
    )));
    document.documentElement.style.setProperty('--sfondo-dimensione',
      (SFONDO_LARGHEZZA * scala) + 'px ' + (SFONDO_ALTEZZA * scala) + 'px');
  }

  // Alcuni Safari meno recenti (iPad con iOS 14.4 o precedente, Mac non aggiornati)
  // non conoscono "gap" nei layout flessibili: in quel caso il CSS usa i margini
  function controllaGapFlessibile() {
    var prova = el('div', { style: 'display:flex;flex-direction:column;gap:1px;position:absolute;visibility:hidden' },
      [el('div'), el('div')]);
    document.body.appendChild(prova);
    var supportato = prova.scrollHeight === 1;
    document.body.removeChild(prova);
    document.documentElement.classList.toggle('senza-gap', !supportato);
  }

  /* ---------- Voce e suoni ---------- */

  // I simboli matematici si leggono a parole: "12 : 3 = 4" diventa "12 diviso 3 fa 4"
  function aVoce(testo) {
    return testo
      .replace(/\s\u00D7\s/g, ' per ')
      .replace(/\s\u2212\s/g, ' meno ')
      .replace(/\s:\s/g, ' diviso ')
      .replace(/\s=\s/g, ' fa ');
  }

  // Molti browser (Safari in particolare) caricano l'elenco delle voci in ritardo:
  // si cerca la voce italiana ora e di nuovo quando l'elenco è pronto
  function cercaVoceItaliana() {
    if (!('speechSynthesis' in window)) return;
    var voci = window.speechSynthesis.getVoices().filter(function (v) { return /^it([-_]|$)/i.test(v.lang); });
    voci.sort(function (a, b) { return (b.localService ? 1 : 0) - (a.localService ? 1 : 0); });
    if (voci.length) voceItaliana = voci[0];
  }

  function parla(testo) {
    if (!impostazioni.generale.voce || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var frase = new window.SpeechSynthesisUtterance(aVoce(testo));
      frase.lang = 'it-IT';
      frase.rate = 0.9;
      if (!voceItaliana) cercaVoceItaliana();
      if (voceItaliana) frase.voice = voceItaliana;
      window.speechSynthesis.speak(frase);
    } catch (e) { /* voce non disponibile */ }
  }

  function zittisci() {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* niente */ }
  }

  // Suoni brevi e morbidi generati al momento (nessun file audio)
  function suono(tipo) {
    if (!impostazioni.generale.suoni) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var note = tipo === 'giusto' ? [523.25, 659.25] : [330];
      note.forEach(function (frequenza, i) {
        var t = audioCtx.currentTime + i * 0.18;
        var osc = audioCtx.createOscillator();
        var volume = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequenza;
        volume.gain.setValueAtTime(0.0001, t);
        volume.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
        volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(volume);
        volume.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) { /* audio non disponibile */ }
  }

  /* ---------- Elementi comuni alle attività ---------- */

  // Consegna detta dalla mascotte in un fumetto. Può essere una frase sola o due:
  // consegna(['Dividi 12 pesci tra 3 gattini.', 'Tocca un gattino per dargli un pesce.'])
  // La prima riga dice che cosa fare, la seconda come: una frase, un'idea.
  function consegna(testo) {
    var righe = typeof testo === 'string' ? [testo] : testo;
    var figura = mascotte('mascotte');
    var parti = [];
    righe.forEach(function (r, i) {
      if (i > 0) parti.push(' '); // spazio tra le frasi per i lettori di schermo
      parti.push(el('span', { classe: i === 0 ? 'consegna-cosa' : 'consegna-come', testo: r }));
    });
    var fumetto = el('p', { classe: figura ? 'fumetto' : null }, parti);
    if (impostazioni.generale.pittogrammi) {
      var picto = pittogrammi(righe.join(' '));
      if (picto) fumetto.appendChild(picto);
    }
    var riga = el('div', { classe: 'consegna' + (figura ? ' con-mascotte' : '') }, [figura, fumetto]);
    var tutto = righe.join(' ');
    if (impostazioni.generale.voce && 'speechSynthesis' in window) {
      riga.appendChild(el('button', {
        type: 'button', classe: 'bottone-ascolta', 'aria-label': 'Ascolta la consegna',
        onclick: function () { parla(tutto); }
      }, ['\uD83D\uDD0A']));
      parla(tutto);
    }
    return riga;
  }

  /*
   * Pittogrammi CAA (Comunicazione Aumentativa Alternativa) sotto la consegna: uno per
   * ogni azione nominata, nell'ordine in cui compare. I pittogrammi sono di ARASAAC
   * (autore Sergio Palao, licenza CC BY-NC-SA), salvati in img/caa/.
   */
  var PITTOGRAMMI = [
    { re: /\b(dividi|divisione|diviso)/i, file: 'dividere', parola: 'dividere' },
    { re: /\b(dagli|dai |dare|porti)/i, file: 'dare', parola: 'dare' },
    { re: /\b(metti|mettici|mettili|mettile)/i, file: 'mettere', parola: 'mettere' },
    { re: /\b(mangia|sfam)/i, file: 'mangiare', parola: 'mangiare' },
    { re: /\b(togli|meno|resta)/i, file: 'togliere', parola: 'togliere' },
    { re: /\b(apri)/i, file: 'aprire', parola: 'aprire' },
    { re: /\b(conta|contare)/i, file: 'contare', parola: 'contare' },
    { re: /\b(scrivi|scrivilo)/i, file: 'scrivere', parola: 'scrivere' },
    { re: /\b(quant[ieoa])\b/i, file: 'quanti', parola: 'quanti?' }
  ];

  function pittogrammi(testo) {
    var trovati = [];
    PITTOGRAMMI.forEach(function (p) {
      var m = p.re.exec(testo);
      if (m) trovati.push({ p: p, pos: m.index });
    });
    if (!trovati.length) return null;
    trovati.sort(function (x, y) { return x.pos - y.pos; });
    return el('span', { classe: 'pittogrammi', 'aria-hidden': 'true' }, trovati.slice(0, 3).map(function (t) {
      return el('span', { classe: 'pittogramma' }, [
        el('img', { src: 'img/caa/' + t.p.file + '.png', alt: '', draggable: 'false' }),
        el('span', { testo: t.p.parola })
      ]);
    }));
  }

  // Riga per i suggerimenti e gli avvisi; p.dici(testo) la aggiorna e la legge
  function messaggio() {
    var p = el('p', { classe: 'messaggio', 'aria-live': 'polite' });
    p.dici = function (testo) {
      p.textContent = testo;
      if (testo) parla(testo);
    };
    return p;
  }

  // "Esercizio 2 di 5" con i puntini
  function avanzamento(totale) {
    var nodo = el('div', { classe: 'avanzamento' });
    return {
      nodo: nodo,
      // Agenda visiva: [✓][✓][3][4][5][Finito]. Si vede quanto è stato fatto,
      // dove si è e quanto manca prima della fine.
      aggiorna: function (indice) {
        nodo.innerHTML = '';
        nodo.appendChild(el('span', { classe: 'agenda-testo', testo: 'Esercizio ' + (indice + 1) + ' di ' + totale }));
        var agenda = el('span', { classe: 'agenda', 'aria-hidden': 'true' });
        for (var i = 0; i < totale; i++) {
          agenda.appendChild(el('span', {
            classe: 'agenda-passo' + (i < indice ? ' fatto' : i === indice ? ' attuale' : ''),
            testo: i < indice ? '\u2713' : String(i + 1)
          }));
        }
        agenda.appendChild(el('span', { classe: 'agenda-passo agenda-fine', testo: 'Finito' }));
        nodo.appendChild(agenda);
      }
    };
  }

  // Riquadro verde di fine esercizio, sempre uguale: "Esatto!", l'operazione, "Avanti".
  // "scritta" può essere un testo o due righe: [riga di collegamento, operazione],
  // per esempio ['3 + 3 + 3 + 3 = 12', '3 × 4 = 12'].
  // "scritta" può essere anche { prima: [...], operazione: '...', dopo: [...] }: le righe
  // prima e dopo collegano le operazioni ("Al contrario: 12 − 5 = 7", "La prova: ...").
  function esito(contenitore, scritta, ultimo, alAvanti) {
    var prima = [], dopo = [];
    if (scritta && typeof scritta === 'object' && !scritta.length) {
      prima = scritta.prima || [];
      dopo = scritta.dopo || [];
      scritta = prima.concat([scritta.operazione]);
    }
    var righe = typeof scritta === 'string' ? [scritta] : scritta;
    var avanti = el('button', {
      type: 'button', classe: 'bottone',
      testo: ultimo ? 'Fine' : 'Avanti \u2192',
      onclick: alAvanti
    });
    var riquadro = el('div', { classe: 'esito' }, [
      el('div', { classe: 'esito-testa' }, [
        mascotte('mascotte'),
        el('p', { classe: 'esito-lode', testo: 'Esatto!' })
      ])
    ].concat(righe.map(function (r, i) {
      return el('p', { classe: i === righe.length - 1 ? 'operazione' : 'operazione-ponte', testo: r });
    })).concat(dopo.map(function (r) {
      return el('p', { classe: 'operazione-ponte operazione-dopo', testo: r });
    })).concat([avanti]));
    contenitore.appendChild(riquadro);
    if (riquadro.scrollIntoView) riquadro.scrollIntoView({ block: 'nearest' });
    avanti.focus();
    parla('Esatto! ' + righe.concat(dopo).join('. '));
  }

  /* ---------- Tastiera fisica ---------- */

  // Un solo ascoltatore per tutta l'app: inoltra i tasti all'attività in corso.
  // Il gestore restituisce true se ha usato il tasto (che allora non fa altro).
  function alTastoPremuto(e) {
    if (!gestoreTasti || e.ctrlKey || e.metaKey || e.altKey) return;
    if (gestoreTasti(e.key)) e.preventDefault();
  }

  /* ---------- Schermate ---------- */

  // "precedente" è la pagina a cui porta il pulsante in alto a sinistra:
  // { etichetta: 'Menu', vai: mostraMenu }, oppure null sul menu principale
  function pulisci(nuovoTitolo, precedente) {
    sulMenu = false;
    zittisci();
    gestoreTasti = null;
    contenuto.innerHTML = '';
    contenuto.style.removeProperty('--colore-attivita');
    impostaSfondo(SFONDO_MENU);
    titolo.textContent = nuovoTitolo;
    bottoneMenu.hidden = !precedente;
    if (precedente) {
      bottoneMenu.textContent = '\u2190 ' + precedente.etichetta;
      indietro = precedente.vai;
    }
    window.scrollTo(0, 0);
  }

  function preparaAttivita(a) {
    attivitaCorrente = a;
    if (a.colore) contenuto.style.setProperty('--colore-attivita', a.colore);
    if (a.sfondo) impostaSfondo(a.sfondo);
  }

  var VERSO_MENU = { etichetta: 'Menu', vai: function () { mostraMenu(); } };

  function areaDi(a) {
    for (var i = 0; i < elencoAree.length; i++) if (elencoAree[i].id === a.area) return elencoAree[i];
    return null;
  }

  // Da un'attività si torna alla sua area; da un'area (o da un'attività senza area) al menu
  function precedenteDi(a) {
    var area = areaDi(a);
    return area ? { etichetta: area.titolo, vai: function () { mostraArea(area); } } : VERSO_MENU;
  }

  // Una scheda del menu: un'area o un'attività
  function scheda(cosa, titoloScheda, alClic) {
    var icona = cosa.immagine
      ? el('img', { classe: 'scheda-immagine', src: cosa.immagine, alt: '', draggable: 'false' })
      : el('span', { classe: 'scheda-icona', 'aria-hidden': 'true', testo: cosa.icona });
    return el('button', {
      type: 'button', classe: 'scheda-attivita',
      style: cosa.colore ? '--colore-attivita: ' + cosa.colore : null,
      onclick: alClic
    }, [
      cosa.passo ? el('span', { classe: 'scheda-passo', 'aria-hidden': 'true', testo: String(cosa.passo) }) : null,
      icona,
      el('span', { classe: 'scheda-titolo', testo: titoloScheda }),
      el('span', { classe: 'scheda-descrizione', testo: cosa.descrizione })
    ]);
  }

  // Menu principale: le macro aree (una per operazione), più le attività senza area
  function mostraMenu() {
    // Una versione nuova scaricata mentre si lavorava entra in uso tornando al menu
    if (aggiornamentoPronto) { window.location.reload(); return; }
    pulisci('Impariamo insieme', null);
    sulMenu = true;
    aggiornaSegnale();
    attivitaCorrente = null;
    contenuto.appendChild(el('div', { classe: 'consegna' }, [el('p', { testo: 'Scegli che cosa vuoi fare.' })]));
    var griglia = el('div', { classe: 'menu' });
    elencoAree.forEach(function (area) {
      griglia.appendChild(scheda(area, area.titolo, function () { mostraArea(area); }));
    });
    elencoAttivita.forEach(function (a) {
      if (!areaDi(a)) griglia.appendChild(scheda(a, a.titolo, function () { avviaAttivita(a); }));
    });
    contenuto.appendChild(griglia);
  }

  // Pagina di un'area: poche scelte ("Con gli oggetti", "In colonna")
  function mostraArea(area) {
    // Anche qui nessun esercizio è in corso: è il momento giusto per la versione nuova
    if (aggiornamentoPronto) { window.location.reload(); return; }
    pulisci(area.titolo, VERSO_MENU);
    sulMenu = true;
    aggiornaSegnale();
    preparaAttivita(area);
    contenuto.appendChild(consegna('Come vuoi lavorare?'));
    var griglia = el('div', { classe: 'menu menu-area' });
    elencoAttivita.forEach(function (a) {
      if (a.area === area.id) griglia.appendChild(scheda(a, a.etichetta || a.titolo, function () { avviaAttivita(a); }));
    });
    contenuto.appendChild(griglia);
  }

  var erroriSessione = {};

  // Il ragazzo sceglie con quali animali giocare: una scelta sua rende la sessione
  // più motivante e resta prevedibile (gli animali non cambiano fino alla fine)
  function mostraSceltaTema(a) {
    pulisci(a.titolo, precedenteDi(a));
    preparaAttivita(a);
    contenuto.appendChild(consegna(['Con chi vuoi giocare?', 'Tocca gli animali che preferisci.']));
    var griglia = el('div', { classe: 'menu scelta-tema' });
    Impariamo.comune.TEMI_SCELTA.forEach(function (t) {
      griglia.appendChild(el('button', {
        type: 'button', classe: 'scheda-attivita', 'data-tema': t.id,
        onclick: function () { avviaAttivita(a, t.id); }
      }, [
        el('img', { classe: 'scheda-immagine', src: 'img/' + t.animale + '.png', alt: '', draggable: 'false' }),
        el('span', { classe: 'scheda-titolo', testo: t.testo })
      ]));
    });
    contenuto.appendChild(griglia);
  }

  function avviaAttivita(a, temaScelto) {
    var opz = opzioniEffettive(a);
    if (a.usaTemi && opz.tema === 'scelta' && !temaScelto) return mostraSceltaTema(a);
    if (temaScelto) opz.tema = temaScelto;
    erroriSessione = {};
    pulisci(a.titolo, precedenteDi(a));
    preparaAttivita(a);
    var area = el('div', { classe: 'area-attivita' });
    contenuto.appendChild(area);
    if (inPercorso(a)) {
      area.appendChild(el('p', { classe: 'livello-attuale', testo: 'Livello ' + (statoDi(a).livello + 1) + ' di ' + a.livelli.length }));
    }
    a.avvia(area, opz, {
      el: el,
      parla: parla,
      suono: suono,
      consegna: consegna,
      messaggio: messaggio,
      avanzamento: avanzamento,
      esito: esito,
      tastiera: function (gestore) { gestoreTasti = gestore; },
      // Le attività segnalano il tipo di ogni errore: il docente vede dove si inceppa il ragazzo
      errore: function (tipo) { erroriSessione[tipo] = (erroriSessione[tipo] || 0) + 1; },
      fine: function (risultato) { mostraFine(a, risultato); }
    });
  }

  function mostraFine(a, risultato) {
    // Il resoconto è per il docente: si salva e si legge nelle impostazioni,
    // così il ragazzo vede solo "Finito!" e non un eventuale "0 su 5"
    scrivi(CHIAVE_ULTIMA_SESSIONE, {
      attivita: a.titolo,
      totale: risultato.totale,
      alPrimoTentativo: risultato.alPrimoTentativo,
      quando: new Date().toISOString()
    });
    var annuncio = null;
    if (a.livelli) {
      var stErr = statoDi(a);
      stErr.errori = (stErr.errori || []).concat([erroriSessione]).slice(-5);
      scrivi(CHIAVE_LIVELLI, statoLivelli);
    }
    if (inPercorso(a)) {
      var st = statoDi(a);
      st.sessioni.push({ totale: risultato.totale, alPrimoTentativo: risultato.alPrimoTentativo });
      st.sessioni = st.sessioni.slice(-4);
      // In automatico si sale da soli (mai si scende): il ragazzo lo sa già adesso,
      // così il cambiamento della prossima volta non è una sorpresa
      if (valuta(a) === 'su' && impostazioni.generale.avanzamento === 'automatico') {
        cambiaLivello(a, st.livello + 1);
        annuncio = 'Hai imparato bene! La prossima volta passi al livello ' + (statoDi(a).livello + 1) + '.';
      }
      scrivi(CHIAVE_LIVELLI, statoLivelli);
    }
    pulisci(a.titolo, precedenteDi(a));
    preparaAttivita(a);
    aggiornaSegnale();
    var ancora = el('button', { type: 'button', classe: 'bottone', testo: 'Ancora', onclick: function () { avviaAttivita(a); } });
    contenuto.appendChild(el('div', { classe: 'fine' }, [
      mascotte('mascotte-grande'),
      el('p', { classe: 'fine-grande', testo: 'Finito!' }),
      el('p', { testo: 'Hai completato ' + risultato.totale + ' esercizi. Ottimo lavoro.' }),
      annuncio ? el('p', { classe: 'annuncio-livello', testo: annuncio }) : null,
      el('div', { classe: 'riga-bottoni' }, [
        ancora,
        el('button', { type: 'button', classe: 'bottone secondario', testo: 'Torna indietro', onclick: precedenteDi(a).vai })
      ])
    ]));
    ancora.focus();
    parla('Finito! Ottimo lavoro.' + (annuncio ? ' ' + annuncio : ''));
  }

  function testoUltimaSessione() {
    var u = leggi(CHIAVE_ULTIMA_SESSIONE);
    if (!u || !u.attivita) return 'Ultima sessione: nessuna ancora su questo dispositivo.';
    var data = new Date(u.quando);
    var quando = isNaN(data.getTime()) ? '' : ' (' + data.toLocaleDateString('it-IT') + ', ' +
      data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ')';
    return 'Ultima sessione su questo dispositivo' + quando + ': ' + u.attivita + ', ' +
      u.alPrimoTentativo + ' esercizi su ' + u.totale + ' risolti al primo tentativo.';
  }

  function mostraImpostazioni() {
    pulisci('Impostazioni', VERSO_MENU);
    contenuto.appendChild(el('p', { classe: 'riepilogo-docente', testo: testoUltimaSessione() }));
    contenuto.appendChild(el('p', {
      classe: 'nota-docente',
      testo: 'Le impostazioni si salvano da sole, solo su questo dispositivo e in questo browser. Nessun dato viene inviato in rete.'
    }));
    // Proposte di livello in attesa, in cima: è la cosa da guardare per prima
    var daVedere = elencoAttivita.filter(function (a) {
      var v = valuta(a);
      return v === 'giu' || (v === 'su' && impostazioni.generale.avanzamento === 'docente');
    });
    if (daVedere.length) {
      contenuto.appendChild(el('section', { classe: 'sezione-impostazioni proposte' }, [
        el('h2', { testo: 'Proposte di livello' }),
        el('ul', {}, daVedere.map(function (a) {
          return el('li', {}, [el('a', { href: '#livello-' + a.id, testo: nomeAttivita(a) }), ': ' + testoProposta(a)]);
        }))
      ]));
    }
    contenuto.appendChild(sezioneImpostazioni('Esercizi, per tutte le attività', IMPOSTAZIONI_ESERCIZI, impostazioni.generale));
    contenuto.appendChild(sezionePercorso());
    contenuto.appendChild(sezioneImpostazioni('Aspetto e voce', IMPOSTAZIONI_ASPETTO, impostazioni.generale));
    contenuto.appendChild(el('section', { classe: 'sezione-impostazioni' }, [
      el('h2', { testo: 'Schede da stampare' }),
      el('p', { classe: 'nota-docente', testo: 'Esercizi su carta a quadretti, al livello a cui è arrivato il ragazzo, per continuare sul quaderno.' }),
      el('div', { classe: 'riga-bottoni' }, [el('button', { type: 'button', classe: 'bottone secondario', testo: 'Prepara una scheda', onclick: mostraSchede })])
    ]));
    // Le regole di difficoltà di ogni attività: servono solo con "Difficoltà: scelgo io"
    var avanzate = el('details', { classe: 'avanzate' }, [
      el('summary', { testo: 'Opzioni avanzate: difficoltà scelta a mano' }),
      el('p', { classe: 'nota-docente', testo: 'Di solito non servono: il percorso a livelli sceglie la difficoltà. Valgono solo per le attività in cui scegli "Difficoltà: scelgo io".' })
    ]);
    elencoAttivita.forEach(function (a) {
      if (a.impostazioni && a.impostazioni.length) avanzate.appendChild(sezioneImpostazioni(nomeAttivita(a), a.impostazioni, impostazioni[a.id]));
    });
    contenuto.appendChild(avanzate);
    contenuto.appendChild(el('p', { classe: 'nota-docente crediti', testo:
      'Pittogrammi: autore Sergio Palao, origine ARASAAC (arasaac.org), licenza CC BY-NC-SA, proprietà del Governo di Aragona (Spagna). ' +
      'Immagini in pixel art generate con PixelLab.' }));
    contenuto.appendChild(el('div', { classe: 'riga-bottoni' }, [
      el('button', { type: 'button', classe: 'bottone', testo: 'Fatto', onclick: mostraMenu })
    ]));
  }

  /* ---------- Schede da stampare ---------- */

  /*
   * Ogni attività che lo prevede espone scheda(opz, n): n esercizi al suo livello attuale.
   * Esercizio: { tipo: 'riga', testo, soluzione } oppure { tipo: 'colonna', a, b, segno,
   * soluzione, righeVuote } oppure { tipo: 'divisione', a, b, soluzione }.
   */
  function mostraSchede() {
    pulisci('Schede da stampare', { etichetta: 'Impostazioni', vai: mostraImpostazioni });
    var conScheda = elencoAttivita.filter(function (a) { return a.scheda; });
    var scelta = { attivita: conScheda[0], quanti: 9, soluzioni: true };
    var foglio = el('div', { classe: 'foglio' });
    function gruppo(etichetta, opzioni, chiave) {
      var g = el('div', { classe: 'scelte', role: 'group', 'aria-label': etichetta });
      opzioni.forEach(function (o) {
        var b = el('button', { type: 'button', classe: 'scelta', testo: o.testo, 'aria-pressed': String(scelta[chiave] === o.valore),
          onclick: function () {
            scelta[chiave] = o.valore;
            Array.prototype.forEach.call(g.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); });
            prepara();
          } });
        g.appendChild(b);
      });
      return el('div', { classe: 'impostazione' }, [el('span', { classe: 'impostazione-etichetta', testo: etichetta }), g]);
    }
    contenuto.appendChild(el('section', { classe: 'sezione-impostazioni solo-schermo' }, [
      gruppo('Attività', conScheda.map(function (a) { return { valore: a, testo: nomeAttivita(a) }; }), 'attivita'),
      gruppo('Esercizi', [6, 9, 12].map(function (n) { return { valore: n, testo: String(n) }; }), 'quanti'),
      gruppo('Soluzioni in fondo', SI_NO, 'soluzioni'),
      el('div', { classe: 'riga-bottoni' }, [
        el('button', { type: 'button', classe: 'bottone secondario', testo: 'Altri esercizi', onclick: prepara }),
        el('button', { type: 'button', classe: 'bottone', testo: 'Stampa', onclick: function () { window.print(); } })
      ])
    ]));
    contenuto.appendChild(foglio);

    function prepara() {
      var a = scelta.attivita;
      var opz = opzioniEffettive(a);
      var esercizi = a.scheda(opz, scelta.quanti);
      foglio.innerHTML = '';
      foglio.appendChild(el('p', { classe: 'foglio-intestazione', testo: 'Nome ______________________     Data ____________' }));
      foglio.appendChild(el('h2', { classe: 'foglio-titolo', testo: nomeAttivita(a) + (a.livelli && inPercorso(a) ? ' \u00B7 livello ' + (statoDi(a).livello + 1) + ': ' + a.livelli[statoDi(a).livello].nome : '') }));
      var griglia = el('div', { classe: 'foglio-esercizi' });
      esercizi.forEach(function (e, i) { griglia.appendChild(disegnaEsercizio(e, i + 1)); });
      foglio.appendChild(griglia);
      if (scelta.soluzioni) {
        foglio.appendChild(el('div', { classe: 'foglio-soluzioni' }, [
          el('h3', { testo: 'Soluzioni' }),
          el('p', { testo: esercizi.map(function (e, i) { return (i + 1) + ') ' + e.soluzione; }).join('   ') })
        ]));
      }
    }

    function disegnaEsercizio(e, numero) {
      var box = el('div', { classe: 'foglio-esercizio' }, [el('span', { classe: 'foglio-numero', testo: numero + ')' })]);
      if (e.tipo === 'riga') {
        box.appendChild(el('p', { classe: 'foglio-riga', testo: e.testo + ' ______' }));
        return box;
      }
      var Q = Impariamo.quaderno;
      if (e.tipo === 'colonna') {
        var W = Math.max(String(e.a).length, String(e.b).length) + (e.extra || 1);
        var q = Q.crea(el, W);
        var righe = [{ cifre: Q.allinea(e.a, W - 1) }, { cifre: Q.allinea(e.b, W - 1), segno: e.segno, linea: true }];
        for (var r = 0; r < (e.righeVuote || 2); r++) righe.push({ cifre: {} });
        q.disegna(righe, []);
        box.appendChild(q.nodo);
        return box;
      }
      // Divisione: dividendo a sinistra, divisore oltre la riga verticale, spazio sotto
      var n = String(e.a).length;
      var lavagna = el('div', { classe: 'colonna-lavagna quaderno' });
      var g = el('div', { classe: 'colonna-griglia' });
      g.style.gridTemplateColumns = 'repeat(' + (n + 1) + ', var(--cella))';
      for (var riga = 0; riga < n * 2 + 1; riga++) {
        for (var c = 0; c <= n; c++) {
          g.appendChild(el('span', { classe: 'cella', testo: riga === 0 && c > 0 ? String(e.a).charAt(c - 1) : '' }));
        }
      }
      lavagna.appendChild(g);
      lavagna.appendChild(el('div', { classe: 'colonna-destra' }, [
        el('div', { classe: 'colonna-divisore' }, String(e.b).split('').map(function (x) { return el('span', { classe: 'cella', testo: x }); })),
        el('div', { classe: 'colonna-quoziente' })
      ]));
      box.appendChild(lavagna);
      return box;
    }

    prepara();
  }

  // Il percorso di tutte le attività in una sola sezione, raggruppato per area
  function sezionePercorso() {
    var sezione = el('section', { classe: 'sezione-impostazioni' }, [el('h2', { testo: 'Percorso' })]);
    var gruppi = elencoAree.map(function (area) {
      return { titolo: area.titolo, attivita: elencoAttivita.filter(function (a) { return a.area === area.id && a.livelli; }) };
    });
    var senzaArea = elencoAttivita.filter(function (a) { return !areaDi(a) && a.livelli; });
    if (senzaArea.length) gruppi.push({ titolo: 'Altro', attivita: senzaArea });
    gruppi.forEach(function (gr) {
      if (!gr.attivita.length) return;
      sezione.appendChild(el('h3', { classe: 'percorso-area', testo: gr.titolo }));
      gr.attivita.forEach(function (a) { sezione.appendChild(bloccoLivello(a)); });
    });
    return sezione;
  }

  // Gli errori più frequenti nelle ultime sessioni, a parole
  function testoErrori(a) {
    var somma = {};
    (statoDi(a).errori || []).forEach(function (e) {
      Object.keys(e).forEach(function (t) { somma[t] = (somma[t] || 0) + e[t]; });
    });
    var tipi = Object.keys(somma).sort(function (x, y) { return somma[y] - somma[x]; }).slice(0, 3);
    if (!tipi.length) return '';
    return 'Errori più frequenti nelle ultime sessioni: ' + tipi.map(function (t) {
      return (NOMI_ERRORI[t] || t) + ' (' + somma[t] + ')';
    }).join(', ') + '.';
  }

  function nomeAttivita(a) {
    var area = areaDi(a);
    return area && a.etichetta ? area.titolo + ': ' + a.etichetta.toLowerCase() : a.titolo;
  }

  function testoProposta(a) {
    var v = valuta(a);
    var n = statoDi(a).livello;
    if (v === 'su') return 'pronto per il livello ' + (n + 2) + ' (' + a.livelli[n + 1].nome + ')';
    if (v === 'giu') return 'fa fatica: valuta di tornare al livello ' + n + ' (' + a.livelli[n - 1].nome + ')';
    return '';
  }

  // Riquadro del percorso: i livelli, quello attuale, le ultime sessioni, la proposta
  function bloccoLivello(a) {
    var blocco = el('div', { classe: 'blocco-livello', id: 'livello-' + a.id });
    function disegna() {
      var st = statoDi(a);
      blocco.innerHTML = '';
      // Una riga sola: nome, livello e due piccoli pulsanti per cambiarlo
      blocco.appendChild(el('div', { classe: 'livello-riga' }, [
        el('p', { classe: 'livello-titolo' }, [
          el('strong', { testo: (a.etichetta || a.titolo) + ': ' }),
          'livello ' + (st.livello + 1) + ' di ' + a.livelli.length + ' \u00B7 ' + a.livelli[st.livello].nome
        ]),
        el('span', { classe: 'livello-pulsanti' }, [
          el('button', { type: 'button', classe: 'scelta piccola', testo: '\u25C0', 'aria-label': 'Livello precedente', title: 'Livello precedente',
            disabled: st.livello === 0, onclick: function () { cambiaLivello(a, st.livello - 1); disegna(); aggiornaSegnale(); } }),
          el('button', { type: 'button', classe: 'scelta piccola', testo: '\u25B6', 'aria-label': 'Livello successivo', title: 'Livello successivo',
            disabled: st.livello === a.livelli.length - 1, onclick: function () { cambiaLivello(a, st.livello + 1); disegna(); aggiornaSegnale(); } })
        ])
      ]));
      // L'elenco completo dei livelli resta chiuso, per non affollare la pagina
      blocco.appendChild(el('details', { classe: 'dettagli-livelli' }, [
        el('summary', { testo: 'Tutti i livelli' }),
        el('ol', { classe: 'elenco-livelli' }, a.livelli.map(function (l, i) {
          return el('li', { classe: i === st.livello ? 'livello-corrente' : null, testo: l.nome });
        }))
      ]));
      var errori = testoErrori(a);
      if (errori) blocco.appendChild(el('p', { classe: 'nota-docente errori-frequenti', testo: errori }));
      if (st.sessioni.length) blocco.appendChild(el('p', { classe: 'nota-docente', testo:
        'Ultime sessioni a questo livello (risolti al primo tentativo): ' + st.sessioni.map(function (x) { return x.alPrimoTentativo + ' su ' + x.totale; }).join(', ') + '.' }));
      var v = valuta(a);
      if (v) blocco.appendChild(el('p', { classe: 'proposta-livello ' + v, testo: k(testoProposta(a)) }));
      if (!inPercorso(a)) blocco.appendChild(el('p', { classe: 'nota-docente', testo: 'Il percorso vale solo con "Difficoltà: Percorso a livelli".' }));
    }
    function k(t) { return t.charAt(0).toUpperCase() + t.slice(1) + '.'; }
    disegna();
    return blocco;
  }

  function sezioneImpostazioni(nome, descrittori, valori) {
    var sezione = el('section', { classe: 'sezione-impostazioni' }, [el('h2', { testo: nome })]);
    descrittori.forEach(function (d) {
      var gruppo = el('div', { classe: 'scelte', role: 'group', 'aria-label': d.etichetta });
      d.opzioni.forEach(function (o) {
        var bottone = el('button', {
          type: 'button', classe: 'scelta', testo: o.testo,
          'aria-pressed': String(valori[d.chiave] === o.valore),
          onclick: function () {
            valori[d.chiave] = o.valore;
            salva();
            applicaAspetto();
            Array.prototype.forEach.call(gruppo.children, function (c) {
              c.setAttribute('aria-pressed', String(c === bottone));
            });
          }
        });
        gruppo.appendChild(bottone);
      });
      sezione.appendChild(el('div', { classe: 'impostazione' }, [
        el('span', { classe: 'impostazione-etichetta', testo: d.etichetta }),
        gruppo
      ]));
    });
    return sezione;
  }

  /* ---------- Accesso docente ---------- */

  // L'ingranaggio apre una piccola schermata che chiede di scrivere una parola:
  // per un adulto è immediato, per un ragazzo che clicca per curiosità è un ostacolo
  // sufficiente. Non è una protezione di sicurezza (la parola è scritta nel README):
  // serve solo a evitare che le impostazioni cambino per sbaglio.
  function mostraAccessoDocente() {
    pulisci('Area docente', VERSO_MENU);
    var campo = el('input', {
      type: 'text', id: 'parola-docente', classe: 'campo-parola',
      autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      'aria-describedby': 'spiegazione-docente'
    });
    var avviso = messaggio();
    var modulo = el('form', { classe: 'accesso-docente', novalidate: true }, [
      el('p', { id: 'spiegazione-docente', testo: 'Per aprire le impostazioni, scrivi la parola DOCENTE.' }),
      el('label', { classe: 'etichetta-nascosta', 'for': 'parola-docente', testo: 'Parola' }),
      campo,
      avviso,
      el('div', { classe: 'riga-bottoni' }, [
        el('button', { type: 'submit', classe: 'bottone', testo: 'Apri le impostazioni' }),
        el('button', { type: 'button', classe: 'bottone secondario', testo: 'Annulla', onclick: mostraMenu })
      ])
    ]);
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      if (campo.value.trim().toLowerCase() === PAROLA_DOCENTE) {
        mostraImpostazioni();
      } else {
        avviso.textContent = 'La parola non è giusta. Scrivi DOCENTE.';
        campo.select();
      }
    });
    contenuto.appendChild(modulo);
    campo.focus();
  }

  /* ---------- Avvio ---------- */

  function avvia() {
    contenuto = document.getElementById('contenuto');
    titolo = document.getElementById('titolo');
    bottoneMenu = document.getElementById('btn-menu');

    carica();
    applicaAspetto();
    controllaGapFlessibile();
    adattaSfondo();
    window.addEventListener('resize', adattaSfondo);
    document.addEventListener('keydown', alTastoPremuto);
    if ('speechSynthesis' in window) {
      cercaVoceItaliana();
      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', cercaVoceItaliana);
      }
    }
    bottoneMenu.addEventListener('click', function () { if (indietro) indietro(); });
    document.getElementById('btn-impostazioni').addEventListener('click', mostraAccessoDocente);
    mostraMenu();
    registraServiceWorker();
  }

  // Funzionamento senza rete: solo quando l'app è pubblicata su un sito (https).
  // Aprendo index.html con un doppio clic (file://) i service worker non esistono
  // e il programma funziona comunque, leggendo i file dal disco.
  //
  // Aggiornamenti: a ogni apertura il browser controlla se è uscita una versione
  // nuova e, se sì, la scarica in sottofondo. Appena è pronta, l'app si ricarica
  // da sola se si è sul menu; se un ragazzo sta lavorando, aspetta che torni al
  // menu, così un esercizio non viene mai interrotto. Se l'app resta aperta a
  // lungo (per esempio tutta la mattina), il controllo si ripete ogni mezz'ora.
  function registraServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    var avevaGiaUnaVersione = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // Alla prima visita non c'è nulla da aggiornare: la pagina è già quella giusta
      if (!avevaGiaUnaVersione) { avevaGiaUnaVersione = true; return; }
      aggiornamentoPronto = true;
      if (sulMenu) window.location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(function (registrazione) {
      setInterval(function () { registrazione.update().catch(function () { /* offline */ }); }, 30 * 60 * 1000);
    }).catch(function () { /* senza copia offline */ });
  }

  window.Impariamo = {
    registra: function (attivita) {
      if (attivita.livelli) {
        attivita.impostazioni = [{
          chiave: 'difficolta', etichetta: 'Difficoltà', predefinito: 'percorso',
          opzioni: [
            { valore: 'percorso', testo: 'Percorso a livelli (consigliato)' },
            { valore: 'manuale', testo: 'Scelgo io con le impostazioni qui sotto' }
          ]
        }].concat(attivita.impostazioni || []);
      }
      elencoAttivita.push(attivita);
    },
    registraArea: function (area) { elencoAree.push(area); },
    avvia: avvia,
    SI_NO: SI_NO
  };
})();
