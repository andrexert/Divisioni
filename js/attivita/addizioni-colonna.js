/*
 * Addizioni in colonna, guidate passo per passo sul quaderno a quadretti.
 *
 * Per ogni colonna, da destra:
 *   1. "Quanto fa 7 + 5?" (con il riporto: "Quanto fa 7 + 5 + 1?")
 *   2. se il risultato non sta in un quadretto (12): "Scrivi sotto solo le unità" → 2,
 *      e l'1 sale in alto, nella colonna dopo: è il riporto.
 * Nell'ultima colonna a sinistra si scrive il risultato intero.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var Q = Impariamo.quaderno;

  Impariamo.registra({
    id: 'addizioni-colonna',
    area: 'addizioni',
    etichetta: 'In colonna',
    titolo: 'Addizioni in colonna',
    descrizione: 'Sul quaderno, con il riporto',
    immagine: 'img/gufo.png',
    sfondo: 'img/sfondo-bosco.png',
    colore: '#8b5cf6',
    esercizi: [2, 3, 5],   // pochi, normali, tanti: le operazioni in colonna sono lunghe
    impostazioni: [
      Q.impostazioneCifre('Cifre dei numeri', [2, 3, 4], 2),
      { chiave: 'riporto', etichetta: 'Con il riporto', predefinito: false, opzioni: Impariamo.SI_NO }
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: '2 cifre, senza riporto', imp: { cifre: 2, riporto: false } },
      { nome: '2 cifre, con il riporto', imp: { cifre: 2, riporto: true } },
      { nome: '3 cifre, senza riporto', imp: { cifre: 3, riporto: false } },
      { nome: '3 cifre, con il riporto', imp: { cifre: 3, riporto: true } },
      { nome: '4 cifre, con il riporto', imp: { cifre: 4, riporto: true } }
    ],
    // Esercizi per le schede da stampare, al livello attuale
    scheda: function (opz, quanti) {
      var lista = [];
      for (var i = 0; i < quanti; i++) {
        var es = genera(opz);
        lista.push({ tipo: 'colonna', a: es.a, b: es.b, segno: '+', extra: 1, righeVuote: 2, soluzione: es.a + ' + ' + es.b + ' = ' + (es.a + es.b) });
      }
      return lista;
    },
    avvia: avvia
  });

  function cifra(n, posizione) { return Math.floor(n / Math.pow(10, posizione)) % 10; }

  function genera(opz) {
    var n = opz.cifre;
    for (var t = 0; t < 500; t++) {
      var a = 0, b = 0, riporti = 0;
      for (var p = 0; p < n; p++) {
        var ultima = p === n - 1;
        var x, y;
        if (opz.riporto) {
          x = C.casuale(ultima ? 1 : 0, 9);
          y = C.casuale(ultima ? 1 : 0, 9);
        } else {
          // senza riporto: ogni colonna fa al massimo 9
          x = C.casuale(ultima ? 1 : 0, ultima ? 8 : 9);
          y = C.casuale(ultima ? 1 : 0, 9 - x);
        }
        a += x * Math.pow(10, p);
        b += y * Math.pow(10, p);
      }
      var c = 0;
      for (var q = 0; q < n; q++) {
        var s = cifra(a, q) + cifra(b, q) + c;
        c = s >= 10 ? 1 : 0;
        if (c && q < n - 1) riporti++;
      }
      if (opz.riporto ? riporti > 0 : riporti === 0) return { a: a, b: b, n: n };
    }
    return { a: 47, b: 35, n: 2 };
  }

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);

    function esercizio(es, finito) {
      var W = es.n + 1;                // una colonna in più per l'ultimo riporto
      var ultimaColonna = W - 1;
      var primaColonna = W - es.n;     // colonna della prima cifra a sinistra dei numeri
      var riporti = {};
      var risultato = {};
      var attesa = null;               // colonna in cui si sta per scrivere
      var colonnaAttiva = null;
      var quad = Q.crea(k.el, W);
      var passo = Q.passi(k, api, quad.nodo);

      var libero = null; // modalità "da solo": cifre scritte, sbagliate, cursore
      function disegna() {
        var rigaRisultato = {};
        Object.keys(risultato).forEach(function (c) { rigaRisultato[c] = risultato[c]; });
        if (attesa !== null) rigaRisultato[attesa] = { testo: '?', classi: ['da-scrivere'] };
        if (libero) {
          Object.keys(libero.valori).forEach(function (c) { rigaRisultato[c] = { testo: libero.valori[c], classi: libero.sbagliate[c] ? ['sbagliata'] : [] }; });
          // Le cifre da rivedere restano colorate anche mentre si riscrivono
          Object.keys(libero.sbagliate).forEach(function (c) { if (libero.valori[c] === undefined) rigaRisultato[c] = { testo: '', classi: ['sbagliata'] }; });
          if (libero.cursore !== null) rigaRisultato[libero.cursore] = { testo: '?', classi: ['da-scrivere'].concat(libero.sbagliate[libero.cursore] ? ['sbagliata'] : []) };
        }
        var cifreRiporti = {};
        Object.keys(riporti).forEach(function (c) { cifreRiporti[c] = { testo: riporti[c], classi: ['riporto'] }; });
        var evid = [];
        if (colonnaAttiva !== null) [1, 2, 3].forEach(function (r) { evid.push([r, colonnaAttiva]); });
        quad.disegna([
          Q.rigaSigle(W),
          { cifre: cifreRiporti },
          { cifre: Q.allinea(es.a, ultimaColonna) },
          { cifre: Q.allinea(es.b, ultimaColonna), segno: '+', linea: true },
          { cifre: rigaRisultato }
        ], evid);
      }

      function colonna(j) {
        var x = cifra(es.a, ultimaColonna - j);
        var y = cifra(es.b, ultimaColonna - j);
        var r = riporti[j] ? 1 : 0;
        var s = x + y + r;
        var nome = Q.COLONNA_DELLE[ultimaColonna - j];
        colonnaAttiva = j;
        attesa = j;
        disegna();
        if (opz.guida === 'semiguidato') {
          // Semiguidato: niente calcolo scritto, solo la colonna evidenziata
          var ultima = j === primaColonna;
          return passo.numero(
            ['Colonna ' + nome + '.', ultima ? 'Scrivi il risultato di questa colonna.' : 'Scrivi la cifra del risultato.'],
            ultima ? s : s % 10,
            function () { return 'Non ancora. Somma ' + x + ' + ' + y + (r ? ' e il riporto 1' : '') + (ultima || s < 10 ? '.' : ': se supera 9, scrivi solo le unità.'); },
            function () {
              var cifre = Q.allinea(ultima ? s : s % 10, j);
              Object.keys(cifre).forEach(function (c) { risultato[c] = cifre[c]; });
              attesa = null;
              if (ultima) return termina();
              if (s >= 10) riporti[j - 1] = '1';
              disegna();
              colonna(j - 1);
              if (s >= 10) {
                passo.avviso.dici('Il riporto 1 va in alto, nella colonna ' + Q.COLONNA_DELLE[ultimaColonna - j + 1] + '.');
                passo.mostraDecine(s);
              }
            },
            'somma');
        }
        passo.numero(
          r ? ['Quanto fa ' + x + ' + ' + y + ' + 1?', 'Il + 1 è il riporto, scritto in alto.'] : ['Quanto fa ' + x + ' + ' + y + '?', 'È la colonna ' + nome + '.'],
          s,
          function (v) {
            return (v < s ? 'Non ancora: è di più.' : 'Non ancora: è di meno.') + (r ? ' Non dimenticare il riporto.' : '');
          },
          function () {
            if (j === primaColonna || s < 10) {
              // ultima colonna a sinistra: si scrive tutto; altrimenti il numero sta in un quadretto
              var cifre = Q.allinea(s, j);
              Object.keys(cifre).forEach(function (c) { risultato[c] = cifre[c]; });
              attesa = null;
              disegna();
              if (j === primaColonna) termina(); else colonna(j - 1);
            } else {
              disegna();
              passo.numero(
                ['Quale cifra scrivi sotto?', s + ' non sta in un quadretto: scrivi solo le unità.'],
                s % 10,
                function () { return 'Non ancora. Le unità di ' + s + ' sono l\'ultima cifra.'; },
                function () {
                  risultato[j] = String(s % 10);
                  riporti[j - 1] = '1';
                  attesa = null;
                  disegna();
                  passo.avviso.dici('L\'1 va in alto, nella colonna ' + Q.COLONNA_DELLE[ultimaColonna - j + 1] + ': è il riporto.');
                  colonna(j - 1);
                },
                'unita'
              );
              passo.mostraDecine(s); // 12 = sacchetto + 2: 1 decina e 2 unità
            }
          },
          'somma'
        );
      }

      // Da solo: il ragazzo scrive tutto il risultato, poi si controlla
      function daSolo() {
        var somma = String(es.a + es.b);
        var colonne = [];
        for (var i = 0; i < somma.length; i++) colonne.push(ultimaColonna - i);
        var giuste = somma.split('').reverse();
        passo.liberi(['Scrivi il risultato.', 'Comincia dalle unità, a destra. Poi premi OK.'], colonne, giuste,
          function (valori, sbagliate, cursore) {
            libero = { valori: valori, sbagliate: sbagliate, cursore: cursore };
            disegna();
          },
          termina);
      }

      function termina() {
        colonnaAttiva = null;
        if (libero) libero.cursore = null;
        disegna();
        passo.fine(['Hai finito!', 'Il risultato è ' + (es.a + es.b) + '.']);
        finito(passo.errori());
      }

      if (opz.guida === 'autonomo') daSolo(); else colonna(ultimaColonna);
    }

    k.sessione({
      modi: ['colonna'],
      genera: function () { return genera(opz); },
      chiave: function (es) { return es.a + '+' + es.b; },
      esegui: { colonna: esercizio },
      scritta: function (es) {
        // Il collegamento con la sottrazione: l'addizione al contrario
        return { operazione: es.a + ' + ' + es.b + ' = ' + (es.a + es.b), dopo: ['Al contrario: ' + (es.a + es.b) + ' \u2212 ' + es.b + ' = ' + es.a] };
      }
    });
  }
})();
