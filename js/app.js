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
  var SFONDO_MENU = 'img/sfondo-menu.png';
  var SFONDO_LARGHEZZA = 320, SFONDO_ALTEZZA = 192; // dimensioni originali degli sfondi
  var PAROLA_DOCENTE = 'docente'; // da scrivere per aprire le impostazioni

  var SI_NO = [
    { valore: true, testo: 'Sì' },
    { valore: false, testo: 'No' }
  ];

  var IMPOSTAZIONI_GENERALI = [
    { chiave: 'voce', etichetta: 'Lettura vocale delle consegne', predefinito: false, opzioni: SI_NO },
    { chiave: 'suoni', etichetta: 'Suoni di conferma (leggeri)', predefinito: false, opzioni: SI_NO },
    {
      chiave: 'colori', etichetta: 'Colori', predefinito: 'vivaci',
      opzioni: [{ valore: 'vivaci', testo: 'Vivaci' }, { valore: 'tenui', testo: 'Tenui (più calmi)' }]
    },
    { chiave: 'sfondi', etichetta: 'Sfondi illustrati', predefinito: true, opzioni: SI_NO },
    { chiave: 'caratteriGrandi', etichetta: 'Caratteri più grandi', predefinito: false, opzioni: SI_NO },
    { chiave: 'altoContrasto', etichetta: 'Alto contrasto', predefinito: false, opzioni: SI_NO }
  ];

  var elencoAttivita = [];
  var impostazioni = { generale: {} };
  var contenuto, titolo, bottoneMenu;
  var audioCtx = null;
  var voceItaliana = null;
  var attivitaCorrente = null;  // serve per mostrare la sua mascotte
  var gestoreTasti = null;      // l'attività in corso può ricevere i tasti premuti

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
    impostazioni.generale = conValoriValidi(IMPOSTAZIONI_GENERALI, salvate.generale);
    elencoAttivita.forEach(function (a) {
      impostazioni[a.id] = conValoriValidi(a.impostazioni || [], salvate[a.id]);
    });
  }

  function salva() { scrivi(CHIAVE_ARCHIVIO, impostazioni); }

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
      aggiorna: function (indice) {
        nodo.innerHTML = '';
        nodo.appendChild(el('span', { testo: 'Esercizio ' + (indice + 1) + ' di ' + totale }));
        var puntini = el('span', { classe: 'puntini', 'aria-hidden': 'true' });
        for (var i = 0; i < totale; i++) {
          puntini.appendChild(el('span', { classe: 'puntino' + (i < indice ? ' fatto' : i === indice ? ' attuale' : '') }));
        }
        nodo.appendChild(puntini);
      }
    };
  }

  // Riquadro verde di fine esercizio, sempre uguale: "Esatto!", l'operazione, "Avanti"
  function esito(contenitore, scritta, ultimo, alAvanti) {
    var avanti = el('button', {
      type: 'button', classe: 'bottone',
      testo: ultimo ? 'Fine' : 'Avanti \u2192',
      onclick: alAvanti
    });
    var riquadro = el('div', { classe: 'esito' }, [
      el('div', { classe: 'esito-testa' }, [
        mascotte('mascotte'),
        el('p', { classe: 'esito-lode', testo: 'Esatto!' })
      ]),
      el('p', { classe: 'operazione', testo: scritta }),
      avanti
    ]);
    contenitore.appendChild(riquadro);
    if (riquadro.scrollIntoView) riquadro.scrollIntoView({ block: 'nearest' });
    avanti.focus();
    parla('Esatto! ' + scritta);
  }

  /* ---------- Tastiera fisica ---------- */

  // Un solo ascoltatore per tutta l'app: inoltra i tasti all'attività in corso.
  // Il gestore restituisce true se ha usato il tasto (che allora non fa altro).
  function alTastoPremuto(e) {
    if (!gestoreTasti || e.ctrlKey || e.metaKey || e.altKey) return;
    if (gestoreTasti(e.key)) e.preventDefault();
  }

  /* ---------- Schermate ---------- */

  function pulisci(nuovoTitolo, mostraBottoneMenu) {
    zittisci();
    gestoreTasti = null;
    contenuto.innerHTML = '';
    contenuto.style.removeProperty('--colore-attivita');
    impostaSfondo(SFONDO_MENU);
    titolo.textContent = nuovoTitolo;
    bottoneMenu.hidden = !mostraBottoneMenu;
    window.scrollTo(0, 0);
  }

  function preparaAttivita(a) {
    attivitaCorrente = a;
    if (a.colore) contenuto.style.setProperty('--colore-attivita', a.colore);
    if (a.sfondo) impostaSfondo(a.sfondo);
  }

  function mostraMenu() {
    pulisci('Impariamo insieme', false);
    attivitaCorrente = null;
    contenuto.appendChild(el('div', { classe: 'consegna' }, [el('p', { testo: 'Scegli che cosa vuoi fare.' })]));
    var griglia = el('div', { classe: 'menu' });
    elencoAttivita.forEach(function (a) {
      var icona = a.immagine
        ? el('img', { classe: 'scheda-immagine', src: a.immagine, alt: '', draggable: 'false' })
        : el('span', { classe: 'scheda-icona', 'aria-hidden': 'true', testo: a.icona });
      griglia.appendChild(el('button', {
        type: 'button', classe: 'scheda-attivita',
        style: a.colore ? '--colore-attivita: ' + a.colore : null,
        onclick: function () { avviaAttivita(a); }
      }, [
        icona,
        el('span', { classe: 'scheda-titolo', testo: a.titolo }),
        el('span', { classe: 'scheda-descrizione', testo: a.descrizione })
      ]));
    });
    contenuto.appendChild(griglia);
  }

  function avviaAttivita(a) {
    pulisci(a.titolo, true);
    preparaAttivita(a);
    var area = el('div', { classe: 'area-attivita' });
    contenuto.appendChild(area);
    a.avvia(area, impostazioni[a.id], {
      el: el,
      parla: parla,
      suono: suono,
      consegna: consegna,
      messaggio: messaggio,
      avanzamento: avanzamento,
      esito: esito,
      tastiera: function (gestore) { gestoreTasti = gestore; },
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
    pulisci(a.titolo, true);
    preparaAttivita(a);
    var ancora = el('button', { type: 'button', classe: 'bottone', testo: 'Ancora', onclick: function () { avviaAttivita(a); } });
    contenuto.appendChild(el('div', { classe: 'fine' }, [
      mascotte('mascotte-grande'),
      el('p', { classe: 'fine-grande', testo: 'Finito!' }),
      el('p', { testo: 'Hai completato ' + risultato.totale + ' esercizi. Ottimo lavoro.' }),
      el('div', { classe: 'riga-bottoni' }, [
        ancora,
        el('button', { type: 'button', classe: 'bottone secondario', testo: 'Torna al menu', onclick: mostraMenu })
      ])
    ]));
    ancora.focus();
    parla('Finito! Ottimo lavoro.');
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
    pulisci('Impostazioni', true);
    contenuto.appendChild(el('p', { classe: 'riepilogo-docente', testo: testoUltimaSessione() }));
    contenuto.appendChild(el('p', {
      classe: 'nota-docente',
      testo: 'Le impostazioni si salvano da sole, solo su questo dispositivo e in questo browser. Nessun dato viene inviato in rete.'
    }));
    contenuto.appendChild(sezioneImpostazioni('Generali', IMPOSTAZIONI_GENERALI, impostazioni.generale));
    elencoAttivita.forEach(function (a) {
      if (a.impostazioni && a.impostazioni.length) {
        contenuto.appendChild(sezioneImpostazioni(a.titolo, a.impostazioni, impostazioni[a.id]));
      }
    });
    contenuto.appendChild(el('div', { classe: 'riga-bottoni' }, [
      el('button', { type: 'button', classe: 'bottone', testo: 'Fatto', onclick: mostraMenu })
    ]));
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
    pulisci('Area docente', true);
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
    bottoneMenu.addEventListener('click', mostraMenu);
    document.getElementById('btn-impostazioni').addEventListener('click', mostraAccessoDocente);
    mostraMenu();
    registraServiceWorker();
  }

  // Funzionamento senza rete: solo quando l'app è pubblicata su un sito (https).
  // Aprendo index.html con un doppio clic (file://) i service worker non esistono
  // e il programma funziona comunque, leggendo i file dal disco.
  function registraServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* senza copia offline */ });
  }

  window.Impariamo = {
    registra: function (attivita) { elencoAttivita.push(attivita); },
    avvia: avvia,
    SI_NO: SI_NO
  };
})();
