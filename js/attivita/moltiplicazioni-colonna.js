/*
 * Moltiplicazioni in colonna, guidate passo per passo sul quaderno a quadretti.
 *
 * Per ogni cifra del moltiplicatore (da destra) e ogni cifra del moltiplicando (da destra):
 *   1. "Quanto fa 7 × 4?" (con il riporto: "Quanto fa 7 × 4 + 2?")
 *   2. se il risultato non sta in un quadretto (30): "Scrivi sotto solo le unità" → 0,
 *      e il 3 sale in alto, sopra la cifra dopo: è il riporto.
 * Con il moltiplicatore a due cifre la seconda riga parte con un trattino nelle unità,
 * e alla fine si sommano le due righe, colonna per colonna.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var Q = Impariamo.quaderno;

  Impariamo.registra({
    id: 'moltiplicazioni-colonna',
    area: 'moltiplicazioni',
    etichetta: 'In colonna',
    titolo: 'Moltiplicazioni in colonna',
    descrizione: 'Sul quaderno, con i riporti',
    immagine: 'img/gufo.png',
    sfondo: 'img/sfondo-bosco.png',
    colore: '#8b5cf6',
    esercizi: [2, 3, 5],   // pochi, normali, tanti: le operazioni in colonna sono lunghe
    impostazioni: [
      Q.impostazioneCifre('Cifre del numero da moltiplicare', [2, 3], 2),
      {
        chiave: 'moltiplicatore', etichetta: 'Si moltiplica per un numero di', predefinito: 1,
        opzioni: [{ valore: 1, testo: '1 cifra' }, { valore: 2, testo: '2 cifre' }]
      }
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: '2 cifre per 1 cifra, senza riporto', imp: { cifre: 2, moltiplicatore: 1, senzaRiporto: true } },
      { nome: '2 cifre per 1 cifra, con il riporto', imp: { cifre: 2, moltiplicatore: 1, senzaRiporto: false } },
      { nome: '3 cifre per 1 cifra', imp: { cifre: 3, moltiplicatore: 1, senzaRiporto: false } },
      { nome: '2 cifre per 2 cifre', imp: { cifre: 2, moltiplicatore: 2, senzaRiporto: false } },
      { nome: '3 cifre per 2 cifre', imp: { cifre: 3, moltiplicatore: 2, senzaRiporto: false } }
    ],
    scheda: function (opz, quanti) {
      var lista = [];
      for (var i = 0; i < quanti; i++) {
        var es = genera(opz);
        lista.push({ tipo: 'colonna', a: es.a, b: es.b, segno: '×', extra: es.m, righeVuote: es.m === 2 ? 4 : 2,
          soluzione: es.a + ' × ' + es.b + ' = ' + es.a * es.b });
      }
      return lista;
    },
    avvia: avvia
  });

  function cifra(n, posizione) { return Math.floor(n / Math.pow(10, posizione)) % 10; }
  function Il(n) { var s = Q.il(n); return s.charAt(0).toUpperCase() + s.slice(1); }

  function genera(opz) {
    var n = opz.cifre, m = opz.moltiplicatore;
    if (opz.senzaRiporto && m === 1) {
      // Ogni cifra per il moltiplicatore fa al massimo 9: nessun riporto
      var y = C.casuale(2, 4), x = 0;
      for (var q = 0; q < n; q++) x += C.casuale(q === n - 1 ? 1 : 0, Math.floor(9 / y)) * Math.pow(10, q);
      return { a: x, b: y, n: n, m: m };
    }
    var a = C.casuale(Math.pow(10, n - 1), Math.pow(10, n) - 1);
    var b = 0;
    // le cifre del moltiplicatore vanno da 2 a 9: per 0 e 1 il procedimento non si vede
    for (var p = 0; p < m; p++) b += C.casuale(2, 9) * Math.pow(10, p);
    return { a: a, b: b, n: n, m: m };
  }

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);

    function esercizio(es, finito) {
      var W = es.n + es.m;          // cifre massime del risultato
      var ultima = W - 1;
      var riporti = {};             // riporti della moltiplicazione, sopra il primo numero
      var parz = [{}, {}];          // righe dei prodotti parziali
      var somma = {};               // riga della somma finale (con due cifre nel moltiplicatore)
      var riportiSomma = {};        // riporti della somma: 1 piccolo sulla riga di sopra
      var attesa = null;            // { riga, col } dove si sta per scrivere
      var evidenzia = [];
      var RIGA_P = [4, 5];
      var RIGA_SOMMA = 6;
      var quad = Q.crea(k.el, W);
      var passo = Q.passi(k, api, quad.nodo);

      function copia(m) { var o = {}; Object.keys(m).forEach(function (c) { o[c] = m[c]; }); return o; }

      function disegna() {
        var cr = {};
        Object.keys(riporti).forEach(function (c) { cr[c] = { testo: riporti[c], classi: ['riporto'] }; });
        var righe = [
          Q.rigaSigle(W),
          { cifre: cr },
          { cifre: Q.allinea(es.a, ultima) },
          { cifre: Q.allinea(es.b, ultima), segno: '×', linea: true },
          { cifre: copia(parz[0]) }
        ];
        Object.keys(riportiSomma).forEach(function (c) {
          var v = righe[4].cifre[c];
          righe[4].cifre[c] = { testo: typeof v === 'object' ? v.testo : (v || ''), piccolo: '1' };
        });
        if (es.m === 2) {
          righe.push({ cifre: copia(parz[1]), segno: '+', linea: true });
          righe.push({ cifre: copia(somma) });
        }
        if (attesa) {
          var prima = righe[attesa.riga].cifre[attesa.col];
          var daRivedere = prima && typeof prima === 'object' && prima.classi && prima.classi.indexOf('sbagliata') >= 0;
          righe[attesa.riga].cifre[attesa.col] = { testo: '?', classi: ['da-scrivere'].concat(daRivedere ? ['sbagliata'] : []) };
        }
        quad.disegna(righe, evidenzia);
      }

      function scrivi(mappa, numero, fine) {
        var cifre = Q.allinea(numero, fine);
        Object.keys(cifre).forEach(function (c) { mappa[c] = cifre[c]; });
      }

      /* --- Moltiplicazione: riga r (cifra r del moltiplicatore), cifra i del moltiplicando --- */

      function moltiplica(r, i, riporto) {
        var x = cifra(es.a, i), y = cifra(es.b, r);
        var ca = ultima - i, cb = ultima - r, col = ca - r;
        var v = x * y + riporto;
        evidenzia = [[2, ca], [3, cb], [RIGA_P[r], col]];
        if (riporto) evidenzia.push([1, ca]);
        attesa = { riga: RIGA_P[r], col: col };
        disegna();
        if (semi) {
          // Semiguidato: si vedono le cifre da moltiplicare, il ragazzo scrive la cifra
          var ultimaCifra = i === es.n - 1;
          return passo.numero(
            ['Moltiplica le cifre evidenziate.', ultimaCifra ? 'Scrivi tutto il risultato.' : 'Scrivi la cifra del risultato.'],
            ultimaCifra ? v : v % 10,
            function () { return 'Non ancora. Fai ' + x + ' × ' + y + (riporto ? ' e aggiungi il riporto ' + riporto : '') + (ultimaCifra || v < 10 ? '.' : ': scrivi solo le unità.'); },
            function () {
              if (ultimaCifra) { scrivi(parz[r], v, col); attesa = null; return rigaFinita(r); }
              parz[r][col] = String(v % 10);
              attesa = null;
              var rip = Math.floor(v / 10);
              if (rip) riporti[ca - 1] = String(rip);
              disegna();
              moltiplica(r, i + 1, rip);
              if (rip) { passo.avviso.dici(Il(rip) + ' va in alto, sopra la cifra dopo: è il riporto.'); passo.mostraDecine(v); }
            },
            'prodotto');
        }
        passo.numero(
          riporto ? ['Quanto fa ' + x + ' × ' + y + ' + ' + riporto + '?', 'Moltiplica, poi aggiungi il riporto ' + riporto + '.']
            : 'Quanto fa ' + x + ' × ' + y + '?',
          v,
          function () { return 'Non ancora. Ripassa la tabellina ' + Q.del(y) + (riporto ? ', poi aggiungi ' + riporto + '.' : '.'); },
          function () {
            if (i === es.n - 1) {
              scrivi(parz[r], v, col);   // ultima cifra a sinistra: si scrive tutto
              attesa = null;
              rigaFinita(r);
            } else if (v < 10) {
              parz[r][col] = String(v);
              attesa = null;
              moltiplica(r, i + 1, 0);
            } else {
              disegna();
              passo.numero(
                ['Quale cifra scrivi sotto?', v + ' non sta in un quadretto: scrivi solo le unità.'],
                v % 10,
                function () { return 'Non ancora. Le unità di ' + v + ' sono l\'ultima cifra.'; },
                function () {
                  var rip = Math.floor(v / 10);
                  parz[r][col] = String(v % 10);
                  riporti[ca - 1] = String(rip);
                  attesa = null;
                  disegna();
                  passo.avviso.dici(Il(rip) + ' va in alto, sopra la cifra dopo: è il riporto.');
                  moltiplica(r, i + 1, rip);
                },
                'unita'
              );
              passo.mostraDecine(v);
            }
          },
          'prodotto'
        );
      }

      function rigaFinita(r) {
        if (r < es.m - 1) {
          // Seconda riga: i riporti di prima non servono più, nelle unità va un trattino
          riporti = {};
          parz[r + 1][ultima] = { testo: '−', classi: ['trattino'] };
          disegna();
          passo.avviso.dici('Ora moltiplica per ' + Q.il(cifra(es.b, r + 1)) + ', la cifra delle decine. ' +
            'Nella nuova riga si comincia dalle decine: nelle unità c\'è un trattino.');
          moltiplica(r + 1, 0, 0);
        } else if (es.m === 1) {
          termina();
        } else {
          riporti = {};
          sommaColonna(ultima, 0);
        }
      }

      /* --- Somma delle due righe (moltiplicatore a due cifre) --- */

      function cifraDi(mappa, c) {
        var v = mappa[c];
        if (v === undefined || (typeof v === 'object' && v.classi && v.classi.indexOf('trattino') >= 0)) return null;
        return Number(typeof v === 'object' ? v.testo : v);
      }

      function primaColonnaOccupata() {
        var cols = Object.keys(parz[0]).concat(Object.keys(parz[1])).map(Number)
          .filter(function (c) { return cifraDi(parz[0], c) !== null || cifraDi(parz[1], c) !== null; });
        return Math.min.apply(null, cols);
      }

      function sommaColonna(j, riporto) {
        var x = cifraDi(parz[0], j), y = cifraDi(parz[1], j);
        var sinistra = primaColonnaOccupata();
        evidenzia = [[4, j], [5, j], [RIGA_SOMMA, j]];
        attesa = { riga: RIGA_SOMMA, col: j };
        disegna();
        if (j === ultima) {
          // Nelle unità c'è solo la cifra della prima riga (sotto c'è il trattino)
          passo.azione(['Nella colonna delle unità c\'è solo ' + Q.il(x) + '.', 'Scrivilo sotto.'], 'Scrivi ' + x + ' ↓', function () {
            somma[j] = String(x);
            attesa = null;
            sommaColonna(j - 1, 0);
          });
          return;
        }
        var addendi = [x, y].filter(function (v) { return v !== null; });
        if (riporto) addendi.push(1);
        var s = addendi.reduce(function (t, v) { return t + v; }, 0);
        var testo = addendi.length === 1 ? 'Quanto fa ' + addendi[0] + '?' : 'Quanto fa ' + addendi.join(' + ') + '?';
        passo.numero(
          [testo, riporto ? 'Il + 1 è il riporto.' : 'Ora somma le due righe.'],
          s,
          function (v) { return (v < s ? 'Non ancora: è di più.' : 'Non ancora: è di meno.') + (riporto ? ' Non dimenticare il riporto.' : ''); },
          function () {
            if (j === sinistra || s < 10) {
              if (j === sinistra) scrivi(somma, s, j); else somma[j] = String(s);
              attesa = null;
              if (j === sinistra) termina(); else sommaColonna(j - 1, 0);
            } else {
              disegna();
              passo.numero(
                ['Quale cifra scrivi sotto?', s + ' non sta in un quadretto: scrivi solo le unità.'],
                s % 10,
                function () { return 'Non ancora. Le unità di ' + s + ' sono l\'ultima cifra.'; },
                function () {
                  somma[j] = String(s % 10);
                  riportiSomma[j - 1] = true;
                  attesa = null;
                  disegna();
                  passo.avviso.dici('L\'1 va in alto, nella colonna dopo: è il riporto.');
                  sommaColonna(j - 1, 1);
                },
                'unita'
              );
              passo.mostraDecine(s);
            }
          },
          'somma'
        );
      }

      function termina() {
        evidenzia = [];
        attesa = null;
        disegna();
        passo.fine(['Hai finito!', 'Il risultato è ' + es.a * es.b + '.']);
        finito(passo.errori());
      }

      // Guida: semiguidato, oppure "da solo" (con il moltiplicatore a due cifre il quaderno
      // serve per le due righe, quindi "da solo" diventa semiguidato)
      var semi = opz.guida === 'semiguidato' || (opz.guida === 'autonomo' && es.m === 2);
      if (opz.guida === 'autonomo' && es.m === 1) daSolo(); else moltiplica(0, 0, 0);

      function daSolo() {
        var p = String(es.a * es.b);
        var colonne = [];
        for (var i = 0; i < p.length; i++) colonne.push(ultima - i);
        passo.liberi(['Scrivi il risultato.', 'Comincia dalle unità, a destra. Poi premi OK.'], colonne, p.split('').reverse(),
          function (valori, sbagliate, cursore) {
            parz[0] = {};
            Object.keys(sbagliate).forEach(function (c) { parz[0][c] = { testo: '', classi: ['sbagliata'] }; });
            Object.keys(valori).forEach(function (c) { parz[0][c] = { testo: valori[c], classi: sbagliate[c] ? ['sbagliata'] : [] }; });
            attesa = cursore === null ? null : { riga: RIGA_P[0], col: cursore };
            disegna();
          },
          termina);
      }
    }

    k.sessione({
      modi: ['colonna'],
      genera: function () { return genera(opz); },
      chiave: function (es) { return es.a + 'x' + es.b; },
      esegui: { colonna: esercizio },
      scritta: function (es) {
        // Il collegamento con la divisione: la moltiplicazione al contrario
        return { operazione: es.a + ' × ' + es.b + ' = ' + es.a * es.b, dopo: ['Al contrario: ' + es.a * es.b + ' : ' + es.b + ' = ' + es.a] };
      }
    });
  }
})();
