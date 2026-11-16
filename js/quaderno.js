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
    k.scena.appendChild(zonaConsegna);
    k.scena.appendChild(el('div', { classe: 'colonna-area' }, [lavagna, comandi]));
    k.scena.appendChild(avviso);

    function consegna(testo) {
      zonaConsegna.innerHTML = '';
      zonaConsegna.appendChild(api.consegna(testo));
    }

    function mostra(nodo) {
      comandi.innerHTML = '';
      if (nodo) comandi.appendChild(nodo);
    }

    // Una domanda con risposta numerica (tastierino con cifre, cancella e OK)
    function numero(testo, corretto, suggerimento, poi) {
      consegna(testo);
      mostra(k.risposta(0, 99, corretto,
        function () { avviso.dici(''); poi(); },
        function (valore) { errori++; avviso.dici(suggerimento(valore)); }));
    }

    // Una domanda Sì/No (anche con i tasti S e N)
    function siNo(testo, giusto, spiegazione, poi) {
      consegna(testo);
      var nodo = el('div', { classe: 'riga-bottoni risposta' });
      function rispondi(si) {
        if (nodo.classList.contains('conclusa')) return;
        if (si === giusto) {
          nodo.classList.add('conclusa');
          api.suono('giusto');
          avviso.dici('');
          poi();
        } else {
          errori++;
          api.suono('riprova');
          avviso.dici(spiegazione);
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
      consegna(testo);
      mostra(null);
    }

    return {
      numero: numero,
      siNo: siNo,
      azione: azione,
      fine: fine,
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
