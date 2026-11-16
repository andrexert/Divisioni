/*
 * Attività 3: Moltiplicazioni.
 *
 *  - "Gruppi uguali": ci sono alcuni animali e a ognuno va dato lo stesso numero di
 *    pezzi di cibo. Il ragazzo riempie le ciotole (una ciotola piena non accetta
 *    altro), poi conta il totale. Nel riquadro finale compare anche l'addizione
 *    ripetuta: 3 + 3 + 3 + 3 = 12, poi 3 × 4 = 12.
 *  - "Tabelline": l'operazione scritta (es. 3 × 4 = ?). Come aiuto non si mostra la
 *    tabellina già risolta (si copierebbe e basta), ma la fila dei salti
 *    "3 · 6 · 9 · 12 · ..." da contare: è una strategia, non la soluzione.
 *
 * Convenzione: 3 × 4 è "3 preso 4 volte" (3 + 3 + 3 + 3), cioè 4 gruppi da 3.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var MAX_OGGETTI = 30;

  Impariamo.registra({
    id: 'moltiplicazioni',
    area: 'moltiplicazioni',
    etichetta: 'Con gli oggetti',
    titolo: 'Moltiplicazioni',
    icona: '×',
    immagine: 'img/riccio.png',
    sfondo: 'img/sfondo-orto.png',
    colore: '#db2777',
    descrizione: 'Gruppi uguali e tabelline',
    impostazioni: [
      {
        chiave: 'modalita', etichetta: 'Tipo di esercizio', predefinito: 'gruppi',
        opzioni: [
          { valore: 'gruppi', testo: 'Gruppi uguali' },
          { valore: 'tabelline', testo: 'Tabelline' },
          { valore: 'alterna', testo: 'Alterna' }
        ]
      },
      C.impostazioneTema('Animali e cibo'),
      {
        chiave: 'tabellina', etichetta: 'Tabelline', predefinito: 'fino5',
        opzioni: [
          { valore: 'fino5', testo: 'Dal 2 al 5' },
          { valore: 'fino10', testo: 'Dal 2 al 10' }
        ].concat([2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valore: n, testo: 'Del ' + n }; }))
      },
      C.impostazioneEsercizi(),
      C.impostazioneAiuto('Aiuto in "Tabelline" (conta a salti)')
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: 'Gruppi uguali, dal 2 al 5', imp: { modalita: 'gruppi', tabellina: 'fino5' } },
      { nome: 'Gruppi e tabelline, dal 2 al 5', imp: { modalita: 'alterna', tabellina: 'fino5' } },
      { nome: 'Tabelline dal 2 al 5', imp: { modalita: 'tabelline', tabellina: 'fino5' } },
      { nome: 'Gruppi e tabelline, fino al 10', imp: { modalita: 'alterna', tabellina: 'fino10' } },
      { nome: 'Tabelline fino al 10', imp: { modalita: 'tabelline', tabellina: 'fino10' } }
    ],
    avvia: avvia
  });

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);
    var el = k.el, t = k.tema, g = k.g, scena = k.scena;

    function saltiDi(n, quanti) {
      var s = [];
      for (var i = 1; i <= quanti; i++) s.push(n * i);
      return s.join(', ');
    }

    /* ---------- Gruppi uguali ---------- */

    function gruppi(es, finito) {
      var errori = 0;
      var piene = 0;
      scena.appendChild(api.consegna(t.senzaImmagini
        ? ['Ci sono ' + es.volte + ' scatole.', 'Metti ' + g.quanti(es.n) + ' in ogni scatola.']
        : ['Ci sono ' + es.volte + ' ' + t.animali + '.', 'Dai ' + g.quanti(es.n) + ' a ogni ' + t.animale + '.']));

      var mucchio = k.mucchio(es.prodotto);
      var zonaCiotole = el('div', { classe: 'scatole' });
      var avviso = api.messaggio();
      var zonaDomande = el('div');
      [mucchio, zonaCiotole, avviso, zonaDomande].forEach(function (n) { scena.appendChild(n); });

      for (var i = 0; i < es.volte; i++) {
        (function () {
          var dentro = 0;
          var c = k.ciotola({
            quanti: es.volte,
            tocca: function () {
              if (dentro >= es.n) return;
              dentro++;
              mucchio.removeChild(mucchio.lastChild);
              c.dentro.appendChild(k.oggetto());
              if (dentro === es.n) {
                c.nodo.disabled = true;   // ciotola piena: non accetta altro
                piene++;
                if (piene === es.volte) tuttePiene();
              }
            }
          });
          zonaCiotole.appendChild(c.nodo);
        })();
      }

      function tuttePiene() {
        mucchio.hidden = true;
        zonaDomande.appendChild(k.domanda(g.Quanti + ' ci sono in tutto?', k.risposta(
          0, MAX_OGGETTI, es.prodotto,
          function () { avviso.dici(''); finito(errori); },
          function () { errori++; avviso.dici('Non ancora. Conta a salti di ' + es.n + ': ' + saltiDi(es.n, 3) + '...'); }
        )));
      }
    }

    /* ---------- Tabelline ---------- */

    function tabelline(es, finito) {
      var errori = 0;
      scena.appendChild(api.consegna('Quanto fa ' + es.n + ' per ' + es.volte + '?'));
      var casella = el('span', { classe: 'casella', testo: '?' });
      var aiuto = k.aiuto('Aiutami a contare', function () {
        var salti = el('div', { classe: 'salti' });
        for (var i = 1; i <= 10; i++) salti.appendChild(el('span', { classe: 'salto', testo: String(es.n * i) }));
        return el('div', { classe: 'tabellina' }, [
          el('p', { classe: 'tabellina-titolo', testo: 'Conta ' + es.volte + (es.volte === 1 ? ' salto' : ' salti') + ' di ' + es.n + ':' }),
          salti
        ]);
      });
      var avviso = api.messaggio();
      [el('p', { classe: 'operazione' }, [es.n + ' × ' + es.volte + ' = ', casella]), aiuto.nodo].forEach(function (n) { scena.appendChild(n); });
      scena.appendChild(k.risposta(0, es.n * 10, es.prodotto,
        function () {
          casella.textContent = String(es.prodotto);
          casella.classList.add('compilata');
          avviso.dici('');
          finito(errori);
        },
        function (valore) {
          errori++;
          if (errori >= 2 && aiuto.mostra()) avviso.dici('Non ancora. Guarda i salti e contane ' + es.volte + '.');
          else avviso.dici(valore < es.prodotto ? 'Non ancora: è di più.' : 'Non ancora: è di meno.');
        }));
      scena.appendChild(avviso);
    }

    k.sessione({
      modi: ['gruppi', 'tabelline'],
      genera: function (modo) {
        var n = typeof opz.tabellina === 'number' ? opz.tabellina : k.casuale(2, opz.tabellina === 'fino10' ? 10 : 5);
        var volte;
        if (modo === 'gruppi') volte = Math.min(k.casuale(2, 5), Math.floor(MAX_OGGETTI / n));
        else volte = k.casuale(1, 10);
        return { modo: modo, n: n, volte: volte, prodotto: n * volte };
      },
      chiave: function (es) { return es.n + 'x' + es.volte; },
      esegui: { gruppi: gruppi, tabelline: tabelline },
      scritta: function (es) {
        var finale = es.n + ' × ' + es.volte + ' = ' + es.prodotto;
        if (es.modo !== 'gruppi') return finale;
        var somma = [];
        for (var i = 0; i < es.volte; i++) somma.push(es.n);
        return [somma.join(' + ') + ' = ' + es.prodotto, finale];
      }
    });
  }
})();
