/*
 * Sottrazioni in colonna, guidate passo per passo sul quaderno a quadretti.
 *
 * Per ogni colonna, da destra:
 *   1. (con il prestito) "Puoi fare 3 − 7?" Sì/No: decidere è proprio ciò che si impara.
 *   2. se no: "Chiedi il prestito". La cifra a sinistra viene barrata e scende di 1
 *      (il nuovo valore è scritto sopra); quella della colonna diventa 13, con l'1 piccolo.
 *      Se a sinistra c'è uno 0, il prestito arriva da più lontano e gli 0 diventano 9.
 *   3. "Quanto fa 13 − 7?"
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var Q = Impariamo.quaderno;

  Impariamo.registra({
    id: 'sottrazioni-colonna',
    area: 'sottrazioni',
    etichetta: 'In colonna',
    titolo: 'Sottrazioni in colonna',
    descrizione: 'Sul quaderno, con il prestito',
    immagine: 'img/gufo.png',
    sfondo: 'img/sfondo-bosco.png',
    colore: '#8b5cf6',
    esercizi: [2, 3, 5],   // pochi, normali, tanti: le operazioni in colonna sono lunghe
    impostazioni: [
      Q.impostazioneCifre('Cifre dei numeri', [2, 3, 4], 2),
      { chiave: 'prestito', etichetta: 'Con il prestito', predefinito: false, opzioni: Impariamo.SI_NO }
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: '2 cifre, senza prestito', imp: { cifre: 2, prestito: false, zeri: false } },
      { nome: '2 cifre, con il prestito', imp: { cifre: 2, prestito: true, zeri: false } },
      { nome: '3 cifre, senza prestito', imp: { cifre: 3, prestito: false, zeri: false } },
      { nome: '3 cifre, con il prestito', imp: { cifre: 3, prestito: true, zeri: false } },
      { nome: '4 cifre, con il prestito', imp: { cifre: 4, prestito: true, zeri: false } },
      { nome: 'Con gli zeri: il prestito arriva da lontano', imp: { cifre: 4, prestito: true, zeri: true } }
    ],
    scheda: function (opz, quanti) {
      var lista = [];
      for (var i = 0; i < quanti; i++) {
        var es = genera(opz);
        lista.push({ tipo: 'colonna', a: es.a, b: es.b, segno: '−', extra: 0, righeVuote: 2, soluzione: es.a + ' − ' + es.b + ' = ' + (es.a - es.b) });
      }
      return lista;
    },
    avvia: avvia
  });

  function cifra(n, posizione) { return Math.floor(n / Math.pow(10, posizione)) % 10; }
  function Il(n) { var s = Q.il(n); return s.charAt(0).toUpperCase() + s.slice(1); }

  // Simula i prestiti da destra: c'è un prestito che deve attraversare uno 0?
  function prestitoDaLontano(a, b, n) {
    var v = [];
    for (var p = 0; p < n; p++) v[p] = cifra(a, p);
    for (var q = 0; q < n; q++) {
      if (v[q] >= cifra(b, q)) continue;
      var da = q + 1;
      if (v[da] === 0) return true;
      v[da]--;
      v[q] += 10;
    }
    return false;
  }

  function genera(opz) {
    var n = opz.cifre;
    var min = Math.pow(10, n - 1), max = Math.pow(10, n) - 1;
    for (var t = 0; t < 1000; t++) {
      var a = C.casuale(min + 1, max);
      var b = C.casuale(min, a - 1);
      var prestiti = 0;
      for (var p = 0; p < n; p++) if (cifra(a, p) < cifra(b, p)) prestiti++;
      if (!(opz.prestito ? prestiti > 0 : prestiti === 0)) continue;
      // zeri: true = serve un prestito "da lontano" (attraverso uno 0); false = mai
      if (opz.zeri === true && !prestitoDaLontano(a, b, n)) continue;
      if (opz.zeri === false && prestitoDaLontano(a, b, n)) continue;
      return { a: a, b: b, n: n };
    }
    return opz.prestito ? { a: 52, b: 27, n: 2 } : { a: 58, b: 23, n: 2 };
  }

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);

    function esercizio(es, finito) {
      var W = es.n;
      var ultima = W - 1;
      var sopra = [];      // cifre del primo numero com'erano all'inizio
      var valore = [];     // cifre del primo numero dopo i prestiti
      for (var c = 0; c < W; c++) { sopra[c] = cifra(es.a, ultima - c); valore[c] = sopra[c]; }
      var barrata = {};    // colonne che hanno prestato: la cifra vecchia è barrata, la nuova sta sopra
      var conPrestito = {}; // colonne che hanno ricevuto il prestito: 1 piccolo davanti
      var risultato = {};
      var attesa = null;
      var colonnaAttiva = null;
      var quad = Q.crea(k.el, W);
      var passo = Q.passi(k, api, quad.nodo);

      function disegna() {
        var rigaNuovi = {}, rigaA = {};
        for (var c = 0; c < W; c++) {
          if (barrata[c]) {
            rigaA[c] = { testo: sopra[c], classi: ['barrata'] };
            rigaNuovi[c] = { testo: valore[c] >= 10 ? valore[c] - 10 : valore[c], classi: ['nuova'], piccolo: conPrestito[c] ? '1' : null };
          } else {
            rigaA[c] = { testo: sopra[c], piccolo: conPrestito[c] ? '1' : null };
          }
        }
        var rigaR = {};
        Object.keys(risultato).forEach(function (c) { rigaR[c] = risultato[c]; });
        if (attesa !== null) rigaR[attesa] = { testo: '?', classi: ['da-scrivere'] };
        if (libero) {
          Object.keys(libero.valori).forEach(function (c) { rigaR[c] = { testo: libero.valori[c], classi: libero.sbagliate[c] ? ['sbagliata'] : [] }; });
          // Le cifre da rivedere restano colorate anche mentre si riscrivono
          Object.keys(libero.sbagliate).forEach(function (c) { if (libero.valori[c] === undefined) rigaR[c] = { testo: '', classi: ['sbagliata'] }; });
          if (libero.cursore !== null) rigaR[libero.cursore] = { testo: '?', classi: ['da-scrivere'].concat(libero.sbagliate[libero.cursore] ? ['sbagliata'] : []) };
        }
        var evid = colonnaAttiva === null ? [] : [[1, colonnaAttiva], [2, colonnaAttiva], [3, colonnaAttiva]];
        quad.disegna([
          Q.rigaSigle(W),
          { cifre: rigaNuovi, classe: 'riga-nuovi' },
          { cifre: rigaA },
          { cifre: Q.allinea(es.b, ultima), segno: '−', linea: true },
          { cifre: rigaR }
        ], evid);
      }

      var libero = null;

      function colonna(j) {
        var y = cifra(es.b, ultima - j);
        colonnaAttiva = j;
        attesa = j;
        disegna();
        var x = valore[j];
        if (opz.guida === 'semiguidato') return semiguidato(j);
        if (!opz.prestito) return calcola(j);
        passo.siNo(
          ['Puoi fare ' + x + ' − ' + y + '?', 'Guarda la colonna ' + Q.COLONNA_DELLE[ultima - j] + '.'],
          x >= y,
          x >= y
            ? 'Guarda bene: ' + x + (x === y ? ' è uguale a ' : ' è più grande di ') + y + ', quindi si può fare.'
            : 'Guarda bene: ' + x + ' è più piccolo di ' + y + ', quindi non si può togliere.',
          function () { if (x >= y) calcola(j); else prestito(j); }
        );
      }

      function prestito(j) {
        var y = cifra(es.b, ultima - j);
        passo.azione(
          [Il(valore[j]) + ' è più piccolo ' + Q.del(y) + '.', 'Chiedi un prestito alla colonna ' + Q.COLONNA_DELLE[ultima - j + 1] + '.'],
          'Chiedi il prestito',
          function () {
            var spiegazione = faiPrestito(j);
            calcola(j);
            passo.avviso.dici(spiegazione);
            passo.mostraPrestito(); // 1 decina aperta = 10 unità
          }
        );
      }

      // Il prestito: si cerca a sinistra la prima cifra che non è 0
      function faiPrestito(j) {
        var da = j - 1;
        while (valore[da] === 0) da--;
        var prima = valore[da];
        var zeri = j - 1 - da;
        for (var c = da; c < j; c++) {
          valore[c] = c === da ? valore[c] - 1 : 9;
          barrata[c] = true;
        }
        var vecchio = valore[j];
        valore[j] += 10;
        conPrestito[j] = true;
        disegna();
        return zeri
          ? 'Qui c\'è uno 0: il prestito arriva da più lontano. ' + Il(prima) + ' diventa ' + (prima - 1) +
            ', ' + (zeri === 1 ? 'lo 0 diventa 9' : 'gli 0 diventano 9') + ' e ' + Q.il(vecchio) + ' diventa ' + valore[j] + '.'
          : Il(prima) + ' diventa ' + (prima - 1) + ' e ' + Q.il(vecchio) + ' diventa ' + valore[j] + '.';
      }

      // Semiguidato: si vede solo la colonna; il ragazzo decide da solo se serve il prestito
      function semiguidato(j) {
        var x = valore[j], y = cifra(es.b, ultima - j);
        var nome = Q.COLONNA_DELLE[ultima - j];
        function scritta() {
          risultato[j] = String(valore[j] - y);
          attesa = null;
          disegna();
          if (j === 0) termina(); else colonna(j - 1);
        }
        if (!opz.prestito) {
          return passo.numero(['Colonna ' + nome + '.', 'Scrivi la cifra del risultato.'], x - y,
            function () { return 'Non ancora. Fai ' + x + ' − ' + y + '.'; }, scritta, 'differenza');
        }
        passo.numeroOAzione(
          ['Colonna ' + nome + '.', 'Scrivi la cifra del risultato. Se serve, chiedi il prestito.'],
          x - y, x < y, 'Chiedi il prestito',
          {
            serveAzione: 'Qui ' + x + ' è più piccolo di ' + y + ': prima chiedi il prestito.',
            nonServe: 'Qui il prestito non serve: ' + x + ' basta per togliere ' + y + '.',
            cifra: function () { return 'Non ancora. Fai ' + x + ' − ' + y + '.'; }
          },
          scritta,
          function () {
            var spiegazione = faiPrestito(j);
            semiguidato(j);
            passo.avviso.dici(spiegazione);
            passo.mostraPrestito();
          },
          'differenza');
      }

      // Da solo: il ragazzo scrive tutto il risultato (i prestiti li fa a mente o sul quaderno)
      function daSolo() {
        var diff = String(es.a - es.b);
        var colonne = [];
        for (var i = 0; i < diff.length; i++) colonne.push(ultima - i);
        passo.liberi(['Scrivi il risultato.', 'Comincia dalle unità, a destra. Poi premi OK.'], colonne, diff.split('').reverse(),
          function (valori, sbagliate, cursore) {
            libero = { valori: valori, sbagliate: sbagliate, cursore: cursore };
            disegna();
          },
          termina);
      }

      function calcola(j) {
        var x = valore[j];
        var y = cifra(es.b, ultima - j);
        var d = x - y;
        passo.numero(
          conPrestito[j] ? ['Quanto fa ' + x + ' − ' + y + '?', 'Con il prestito ' + Q.il(x - 10) + ' è diventato ' + x + '.'] : 'Quanto fa ' + x + ' − ' + y + '?',
          d,
          function (v) { return v < d ? 'Non ancora: è di più. Conta da ' + y + ' fino a ' + x + '.' : 'Non ancora: è di meno. Conta da ' + y + ' fino a ' + x + '.'; },
          function () {
            risultato[j] = String(d);
            attesa = null;
            disegna();
            if (j === 0) termina(); else colonna(j - 1);
          },
          'differenza'
        );
      }

      function termina() {
        // Gli 0 all'inizio del risultato non contano: si mostrano più chiari
        for (var c = 0; c < W - 1 && risultato[c] === '0'; c++) risultato[c] = { testo: '0', classi: ['zero-iniziale'] };
        colonnaAttiva = null;
        if (libero) libero.cursore = null;
        disegna();
        passo.fine(['Hai finito!', 'Il risultato è ' + (es.a - es.b) + '.']);
        finito(passo.errori());
      }

      if (opz.guida === 'autonomo') daSolo(); else colonna(ultima);
    }

    k.sessione({
      modi: ['colonna'],
      genera: function () { return genera(opz); },
      chiave: function (es) { return es.a + '-' + es.b; },
      esegui: { colonna: esercizio },
      scritta: function (es) {
        // Il collegamento con l'addizione: la sottrazione al contrario
        return { operazione: es.a + ' − ' + es.b + ' = ' + (es.a - es.b), dopo: ['Al contrario: ' + (es.a - es.b) + ' + ' + es.b + ' = ' + es.a] };
      }
    });
  }
})();
