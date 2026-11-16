/*
 * Impariamo insieme — nucleo dell'applicazione.
 *
 * Gestisce il menu, le impostazioni (salvate nel browser), la voce e i suoni.
 * Ogni attività (divisioni, e in futuro altre) è un file separato in js/attivita/
 * che si registra con Impariamo.registra({...}). Vedi il README per i dettagli.
 *
 * Il codice è scritto in JavaScript "classico" (ES5) per funzionare anche
 * sulle versioni di Safari degli iMac più vecchi.
 */
(function () {
  'use strict';

  var CHIAVE_ARCHIVIO = 'impariamo.impostazioni.v1';
  var SFONDO_MENU = 'img/sfondo-menu.png';
  var DURATA_PRESSIONE_LUNGA = 1500; // millisecondi

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
  var contenuto, titolo, bottoneMenu, suggerimento;
  var audioCtx = null;
  var attivitaCorrente = null; // serve per mostrare la sua mascotte

  function mascotte(classe) {
    if (!attivitaCorrente || !attivitaCorrente.immagine) return null;
    return el('img', { classe: classe, src: attivitaCorrente.immagine, alt: '', draggable: 'false' });
  }

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

  /* ---------- Impostazioni ---------- */

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
    var salvate = {};
    try {
      salvate = JSON.parse(window.localStorage.getItem(CHIAVE_ARCHIVIO)) || {};
    } catch (e) {
      salvate = {}; // navigazione privata o archiviazione bloccata: si usano i predefiniti
    }
    impostazioni.generale = conValoriValidi(IMPOSTAZIONI_GENERALI, salvate.generale);
    elencoAttivita.forEach(function (a) {
      impostazioni[a.id] = conValoriValidi(a.impostazioni || [], salvate[a.id]);
    });
  }

  function salva() {
    try {
      window.localStorage.setItem(CHIAVE_ARCHIVIO, JSON.stringify(impostazioni));
    } catch (e) { /* se non si può salvare, il programma funziona comunque */ }
  }

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
    document.body.style.setProperty('--sfondo-immagine', 'url("' + assoluto + '")');
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

  function parla(testo) {
    if (!impostazioni.generale.voce || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var frase = new window.SpeechSynthesisUtterance(aVoce(testo));
      frase.lang = 'it-IT';
      frase.rate = 0.9;
      var voci = window.speechSynthesis.getVoices().filter(function (v) { return /^it/i.test(v.lang); });
      if (voci.length) frase.voice = voci[0];
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

  // Riga con la consegna, detta dalla mascotte in un fumetto se l'attività ne ha una,
  // e, se la voce è attiva, un bottone per riascoltarla
  function consegna(testo) {
    var figura = mascotte('mascotte');
    var riga = el('div', { classe: 'consegna' + (figura ? ' con-mascotte' : '') }, [
      figura,
      el('p', { classe: figura ? 'fumetto' : null, testo: testo })
    ]);
    if (impostazioni.generale.voce && 'speechSynthesis' in window) {
      riga.appendChild(el('button', {
        type: 'button', classe: 'bottone-ascolta', 'aria-label': 'Ascolta la consegna',
        onclick: function () { parla(testo); }
      }, ['🔊']));
      parla(testo);
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
      testo: ultimo ? 'Fine' : 'Avanti →',
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

  /* ---------- Schermate ---------- */

  function pulisci(nuovoTitolo, mostraBottoneMenu) {
    zittisci();
    contenuto.innerHTML = '';
    contenuto.style.removeProperty('--colore-attivita');
    impostaSfondo(SFONDO_MENU);
    titolo.textContent = nuovoTitolo;
    bottoneMenu.hidden = !mostraBottoneMenu;
    window.scrollTo(0, 0);
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
    attivitaCorrente = a;
    if (a.colore) contenuto.style.setProperty('--colore-attivita', a.colore);
    if (a.sfondo) impostaSfondo(a.sfondo);
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
      fine: function (esito) { mostraFine(a, esito); }
    });
  }

  function mostraFine(a, esito) {
    pulisci(a.titolo, true);
    var ancora = el('button', { type: 'button', classe: 'bottone', testo: 'Ancora', onclick: function () { avviaAttivita(a); } });
    attivitaCorrente = a;
    if (a.colore) contenuto.style.setProperty('--colore-attivita', a.colore);
    if (a.sfondo) impostaSfondo(a.sfondo);
    contenuto.appendChild(el('div', { classe: 'fine' }, [
      mascotte('mascotte-grande'),
      el('p', { classe: 'fine-grande', testo: 'Finito!' }),
      el('p', { testo: 'Hai completato ' + esito.totale + ' esercizi. Ottimo lavoro.' }),
      el('div', { classe: 'riga-bottoni' }, [
        ancora,
        el('button', { type: 'button', classe: 'bottone secondario', testo: 'Torna al menu', onclick: mostraMenu })
      ]),
      el('p', {
        classe: 'nota-docente',
        testo: 'Per il docente: ' + esito.alPrimoTentativo + ' su ' + esito.totale + ' risolti al primo tentativo.'
      })
    ]));
    ancora.focus();
    parla('Finito! Ottimo lavoro.');
  }

  function mostraImpostazioni() {
    pulisci('Impostazioni', true);
    contenuto.appendChild(el('p', {
      classe: 'nota-docente',
      testo: 'Le impostazioni si salvano da sole, solo su questo computer e in questo browser. Nessun dato viene inviato in rete.'
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

  /* ---------- Accesso docente: pressione lunga sull'ingranaggio ---------- */

  function collegaPressioneLunga(bottone, azione) {
    var timer = null;

    function inizia(e) {
      if (e.button !== undefined && e.button !== 0) return;
      bottone.classList.add('in-pressione');
      timer = setTimeout(function () {
        timer = null;
        bottone.classList.remove('in-pressione');
        azione();
      }, DURATA_PRESSIONE_LUNGA);
    }

    function annulla() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      bottone.classList.remove('in-pressione');
      suggerimento.textContent = 'Tieni premuto per le impostazioni';
      setTimeout(function () { suggerimento.textContent = ''; }, 2500);
    }

    bottone.addEventListener('pointerdown', inizia);
    bottone.addEventListener('pointerup', annulla);
    bottone.addEventListener('pointerleave', annulla);
    bottone.addEventListener('pointercancel', annulla);
    bottone.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Da tastiera (Invio o Spazio) si apre subito: serve al docente e all'accessibilità
    bottone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); azione(); }
    });
  }

  /* ---------- Avvio ---------- */

  function avvia() {
    contenuto = document.getElementById('contenuto');
    titolo = document.getElementById('titolo');
    bottoneMenu = document.getElementById('btn-menu');
    suggerimento = document.getElementById('suggerimento');

    carica();
    applicaAspetto();
    bottoneMenu.addEventListener('click', mostraMenu);
    collegaPressioneLunga(document.getElementById('btn-impostazioni'), mostraImpostazioni);
    mostraMenu();
  }

  window.Impariamo = {
    registra: function (attivita) { elencoAttivita.push(attivita); },
    avvia: avvia,
    SI_NO: SI_NO
  };
})();
