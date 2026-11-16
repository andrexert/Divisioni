/*
 * Quaderno a quadretti per le operazioni in colonna (addizioni, sottrazioni,
 * moltiplicazioni) e i passi guidati comuni: una domanda alla volta, risposta con
 * il tastierino, Sì/No, bottoni d'azione come "Chiedi il prestito".
 *
 * Il quaderno è una griglia: una colonna a sinistra per il segno (+, −, ×) e una
 * colonna per ogni cifra. Ogni riga ha l'altezza di un quadretto, così la
 * quadrettatura del foglio combacia sempre con le cifre.
 */
(function () {
  'use strict';

  // Nomi delle colonne, da destra: u = unità, da = decine, h = centinaia, k = migliaia
  var SIGLE = ['u', 'da', 'h', 'k', 'dak', 'hk'];
  var NOMI = ['unità', 'decine', 'centinaia', 'migliaia', 'decine di migliaia', 'centinaia di migliaia'];
  var COLONNA_DELLE = ['delle unità', 'delle decine', 'delle centinaia', 'delle migliaia', 'delle decine di migliaia', 'delle centinaia di migliaia'];

  /*
   * Crea il quaderno con "colonne" colonne di cifre.
   * disegna(righe, evidenzia):
   *   righe: [{ cifre: { colonna: testo o { testo, classi, piccolo } }, segno, linea, classe }]
   *     (colonna 0 = la più a sinistra; "piccolo" è una cifra piccola in alto a sinistra,
   *      come l'1 del prestito)
   *   evidenzia: [[riga, colonna], ...] quadretti da evidenziare in giallo
   */
  function quaderno(el, colonne) {
    var lavagna = el('div', { classe: 'colonna-lavagna quaderno', 'aria-hidden': 'true' });
    lavagna.style.setProperty('--colonne', colonne + 1 + 2); // segno + cifre + margini
    lavagna.style.setProperty('--destra', 0);

    function disegna(righe, evidenzia) {
      lavagna.innerHTML = '';
      var griglia = el('div', { classe: 'colonna-griglia' });
      griglia.style.gridTemplateColumns = 'repeat(' + (colonne + 1) + ', var(--cella))';
      righe.forEach(function (riga, r) {
        var celle = [];
        for (var c = 0; c <= colonne; c++) celle.push(el('span', { classe: 'cella' + (riga.classe ? ' ' + riga.classe : '') }));
        Object.keys(riga.cifre || {}).forEach(function (col) {
          var v = riga.cifre[col];
          var cella = celle[Number(col) + 1];
          if (!cella) return;
          if (typeof v === 'object') {
            cella.textContent = v.testo === undefined ? '' : String(v.testo);
            (v.classi || []).forEach(function (cl) { cella.classList.add(cl); });
            if (v.piccolo) cella.setAttribute('data-piccolo', v.piccolo);
          } else {
            cella.textContent = String(v);
          }
        });
        if (riga.segno) {
          celle[0].textContent = riga.segno;
          celle[0].classList.add('segno');
        }
        if (riga.linea) celle.forEach(function (c) { c.classList.add('linea'); });
        (evidenzia || []).forEach(function (e) {
          if (e[0] === r && celle[e[1] + 1]) celle[e[1] + 1].classList.add('attiva');
        });
        celle.forEach(function (c) { griglia.appendChild(c); });
      });
      lavagna.appendChild(griglia);
    }

    return { nodo: lavagna, disegna: disegna };
  }

  // Le cifre di un numero, allineate a destra con l'ultima cifra nella colonna "fine"
  function allinea(numero, fine, extra) {
    var s = String(numero);
    var cifre = {};
    for (var i = 0; i < s.length; i++) {
      var col = fine - (s.length - 1 - i);
      cifre[col] = extra ? { testo: s.charAt(i), classi: extra.slice() } : s.charAt(i);
    }
    return cifre;
  }

  // Riga con le sigle delle colonne (u, da, h, k) sopra le cifre
  function rigaSigle(colonne) {
    var cifre = {};
    for (var c = 0; c < colonne; c++) cifre[c] = { testo: SIGLE[colonne - 1 - c] || '', classi: ['sigla'] };
    return { cifre: cifre };
  }

  /*
   * Passi guidati: la consegna in alto, il quaderno e i comandi affiancati,
   * l'avviso sotto. Ogni passo mette nei comandi un tastierino, un Sì/No o un bottone.
   */
  function passi(k, api, lavagna) {
    var el = k.el;
    var errori = 0;
    var zonaConsegna = el('div');
    var comandi = el('div', { classe: 'colonna-comandi' });
    var avviso = api.messaggio();
    var spiegazione = el('div', { classe: 'spiegazione-decine', 'aria-live': 'polite' });
    k.scena.appendChild(zonaConsegna);
    k.scena.appendChild(el('div', { classe: 'colonna-area' }, [lavagna, comandi]));
    k.scena.appendChild(spiegazione);
    k.scena.appendChild(avviso);

    /*
     * Il valore posizionale reso visibile, con lo stesso sacchetto da 10 delle attività
     * con gli oggetti: 12 = [sacchetto] ●● = 1 decina e 2 unità. Compare al momento del
     * riporto o del prestito e sparisce alla domanda successiva.
     */
    function unita(n) {
      var riga = el('span', { classe: 'unita-visive' });
      for (var i = 0; i < n; i++) riga.appendChild(el('span', { classe: 'unita-punto' }));
      return riga;
    }

    function mostraDecine(n) {
      var d = Math.floor(n / 10), u = n % 10;
      spiegazione.innerHTML = '';
      var figura = el('div', { classe: 'decine-figura' });
      for (var i = 0; i < d; i++) figura.appendChild(k.sacchetto());
      if (u) figura.appendChild(unita(u));
      spiegazione.appendChild(el('span', { classe: 'decine-numero', testo: n + ' =' }));
      spiegazione.appendChild(figura);
      spiegazione.appendChild(el('span', { classe: 'decine-testo', testo:
        d + (d === 1 ? ' decina' : ' decine') + ' e ' + u + (u === 1 ? ' unità' : ' unità') }));
    }

    function mostraPrestito() {
      spiegazione.innerHTML = '';
      spiegazione.appendChild(k.sacchetto());
      spiegazione.appendChild(el('span', { classe: 'decine-numero', testo: '=' }));
      spiegazione.appendChild(unita(10));
      spiegazione.appendChild(el('span', { classe: 'decine-testo', testo: '1 decina aperta = 10 unità' }));
    }

    function nascondi() { spiegazione.innerHTML = ''; }

    function consegna(testo) {
      zonaConsegna.innerHTML = '';
      zonaConsegna.appendChild(api.consegna(testo));
    }

    function mostra(nodo) {
      comandi.innerHTML = '';
      if (nodo) comandi.appendChild(nodo);
    }

    // Una domanda con risposta numerica (tastierino con cifre, cancella e OK).
    // tipo: tipo di errore per il docente. Dopo due errori si mostra la risposta giusta.
    function numero(testo, corretto, suggerimento, poi, tipo) {
      nascondi();
      consegna(testo);
      mostra(k.risposta(0, 99, corretto,
        function () { avviso.dici(''); poi(); },
        function (valore) { errori++; avviso.dici(suggerimento(valore)); },
        { tipo: tipo, correzioneDopo: 2 }));
    }

    // Semiguidato: il tastierino e, accanto, un bottone d'azione ("Chiedi il prestito").
    // Se serve l'azione, ogni cifra scritta prima è un errore; se non serve, lo è l'azione.
    function numeroOAzione(testo, corretto, serveAzione, etichetta, suggerimenti, poi, dopoAzione, tipo) {
      nascondi();
      consegna(testo);
      var sbagliAzione = 0;
      var tastierino = k.risposta(0, 99, serveAzione ? null : corretto,
        function () { avviso.dici(''); poi(); },
        function (valore) {
          errori++;
          avviso.dici(serveAzione ? suggerimenti.serveAzione : suggerimenti.cifra(valore));
          if (serveAzione && ++sbagliAzione >= 2) bottone.classList.add('suggerito');
        },
        { tipo: serveAzione ? 'decisione' : tipo, correzioneDopo: 2 });
      var bottone = el('button', { type: 'button', classe: 'bottone grande', testo: etichetta });
      bottone.addEventListener('click', function () {
        if (!serveAzione) {
          errori++;
          if (api.errore) api.errore('decisione');
          api.suono('riprova');
          avviso.dici(suggerimenti.nonServe);
          return;
        }
        dopoAzione();
      });
      mostra(el('div', { classe: 'tastierino-e-azione' }, [tastierino, el('div', { classe: 'riga-bottoni' }, [bottone])]));
    }

    /*
     * Da solo: il ragazzo scrive tutte le cifre del risultato, da destra, senza domande.
     * Con OK si controlla: le cifre giuste restano, quelle sbagliate si riscrivono.
     * Dopo due controlli sbagliati il programma mostra le cifre giuste.
     *   colonne: le colonne del risultato da destra a sinistra; giuste: le cifre attese
     *   aggiorna(valori, sbagliate, cursore): ridisegna il quaderno
     */
    function liberi(testo, colonne, giuste, aggiorna, poi) {
      nascondi();
      consegna(testo);
      var valori = {};
      var daScrivere = colonne.slice();
      var sbagliate = {};
      var controlli = 0;
      function cursore() {
        for (var i = 0; i < daScrivere.length; i++) if (valori[daScrivere[i]] === undefined) return daScrivere[i];
        return null;
      }
      function premi(t) {
        if (nodo.classList.contains('conclusa')) return;
        if (/^[0-9]$/.test(t)) {
          var c = cursore();
          if (c !== null) { valori[c] = t; delete sbagliate[c]; }
        } else if (t === 'canc') {
          for (var i = daScrivere.length - 1; i >= 0; i--) {
            if (valori[daScrivere[i]] !== undefined) { delete valori[daScrivere[i]]; break; }
          }
        } else if (t === 'ok') {
          if (cursore() !== null) { avviso.dici('Scrivi tutte le cifre, poi premi OK.'); return; }
          var errate = colonne.filter(function (c) { return valori[c] !== giuste[colonne.indexOf(c)]; });
          if (!errate.length) {
            nodo.classList.add('conclusa');
            api.suono('giusto');
            avviso.dici('');
            aggiorna(valori, {}, null);
            return poi();
          }
          errori++;
          controlli++;
          if (api.errore) api.errore('cifra');
          api.suono('riprova');
          if (controlli >= 2) {
            // Correzione: si mostrano le cifre giuste, poi si va avanti
            colonne.forEach(function (c, i) { valori[c] = giuste[i]; });
            errate.forEach(function (c) { sbagliate[c] = true; });
            nodo.classList.add('conclusa');
            aggiorna(valori, sbagliate, null);
            avviso.dici('Guarda: le cifre colorate sono state corrette. Ecco il risultato giusto.');
            mostra(k.azione('Ho capito', poi));
            return;
          }
          errate.forEach(function (c) { sbagliate[c] = true; delete valori[c]; });
          daScrivere = errate;
          avviso.dici(errate.length === 1 ? 'Una cifra non è giusta: è quella colorata. Riscrivila.' : 'Le cifre colorate non sono giuste: riscrivile.');
        }
        aggiorna(valori, sbagliate, cursore());
      }
      var tasti = el('div', { classe: 'tastiera-numerica' });
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'canc', '0', 'ok'].forEach(function (t) {
        tasti.appendChild(el('button', {
          type: 'button', classe: 'tasto' + (t === 'ok' ? ' tasto-ok' : t === 'canc' ? ' tasto-canc' : ''),
          'aria-label': t === 'canc' ? 'Cancella' : null,
          testo: t === 'canc' ? '\u232B' : t === 'ok' ? 'OK' : t,
          onclick: function () { premi(t); }
        }));
      });
      var nodo = el('div', { classe: 'risposta' }, [tasti]);
      nodo.gestisciTasto = function (t) {
        if (/^[0-9]$/.test(t)) premi(t);
        else if (t === 'Backspace' || t === 'Delete') premi('canc');
        else if (t === 'Enter') premi('ok');
        else return false;
        return true;
      };
      mostra(nodo);
      aggiorna(valori, sbagliate, cursore());
    }

    // Una domanda Sì/No (anche con i tasti S e N). Dopo due errori si indica quella giusta.
    function siNo(testo, giusto, spiegazione, poi, tipo) {
      nascondi();
      consegna(testo);
      var nodo = el('div', { classe: 'riga-bottoni risposta' });
      var sbagli = 0;
      function rispondi(si) {
        if (nodo.classList.contains('conclusa')) return;
        if (si === giusto) {
          nodo.classList.add('conclusa');
          api.suono('giusto');
          avviso.dici('');
          poi();
        } else {
          errori++;
          if (api.errore) api.errore(tipo || 'decisione');
          api.suono('riprova');
          avviso.dici(spiegazione);
          if (++sbagli >= 2) nodo.children[giusto ? 0 : 1].classList.add('suggerito');
        }
      }
      nodo.appendChild(el('button', { type: 'button', classe: 'bottone grande', testo: 'Sì', onclick: function () { rispondi(true); } }));
      nodo.appendChild(el('button', { type: 'button', classe: 'bottone grande', testo: 'No', onclick: function () { rispondi(false); } }));
      nodo.gestisciTasto = function (tasto) {
        var t = tasto.toLowerCase();
        if (t === 's') rispondi(true);
        else if (t === 'n') rispondi(false);
        else return false;
        return true;
      };
      mostra(nodo);
    }

    // Un bottone che fa un passo (anche con Invio o Spazio)
    function azione(testo, etichetta, fai) {
      nascondi();
      consegna(testo);
      var bottone = el('button', { type: 'button', classe: 'bottone grande', testo: etichetta });
      var nodo = el('div', { classe: 'risposta' }, [bottone]);
      function premi() {
        if (nodo.classList.contains('conclusa')) return;
        nodo.classList.add('conclusa');
        fai();
      }
      bottone.addEventListener('click', premi);
      nodo.gestisciTasto = function (tasto) {
        if (tasto !== 'Enter' && tasto !== ' ') return false;
        premi();
        return true;
      };
      mostra(nodo);
    }

    function fine(testo) {
      nascondi();
      consegna(testo);
      mostra(null);
    }

    return {
      numero: numero,
      numeroOAzione: numeroOAzione,
      liberi: liberi,
      siNo: siNo,
      azione: azione,
      fine: fine,
      mostraDecine: mostraDecine,
      mostraPrestito: mostraPrestito,
      avviso: avviso,
      errori: function () { return errori; }
    };
  }

  // "del 3", "dell'8"
  function del(n) { return (String(n).charAt(0) === '8' ? "dell'" : 'del ') + n; }
  // "il 3", "l'8", "l'1", "l'11"
  function il(n) {
    var s = String(n);
    return (s.charAt(0) === '8' || n === 1 || n === 11 ? "l'" : 'il ') + n;
  }

  // Impostazione comune: quante cifre
  function impostazioneCifre(etichetta, valori, predefinito) {
    return { chiave: 'cifre', etichetta: etichetta, predefinito: predefinito, opzioni: Impariamo.comune.opzioniNumeriche(valori) };
  }

  Impariamo.quaderno = {
    crea: quaderno,
    allinea: allinea,
    rigaSigle: rigaSigle,
    passi: passi,
    NOMI: NOMI,
    COLONNA_DELLE: COLONNA_DELLE,
    del: del,
    il: il,
    impostazioneCifre: impostazioneCifre
  };
})();
