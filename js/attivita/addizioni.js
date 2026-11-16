/*
 * Attività 1: Addizioni.
 *
 *  - "Con gli oggetti": l'animale ha già un po' di cibo nella ciotola e ne arriva
 *    dell'altro. Il ragazzo lo mette nella ciotola toccandolo un pezzo alla volta,
 *    poi conta quanto ce n'è in tutto. È l'addizione come "aggiungere".
 *    Nella ciotola il cibo sta in righe da 5: 3 + 4 si vede come "5 e 2".
 *  - "Calcola": l'operazione scritta (es. 3 + 4 = ?), con il disegno dei due gruppi
 *    come aiuto su richiesta o dopo due tentativi.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;

  Impariamo.registra({
    id: 'addizioni',
    passo: 1,
    titolo: 'Addizioni',
    icona: '+',
    immagine: 'img/orsetto.png',
    sfondo: 'img/sfondo-spiaggia.png',
    colore: '#0891b2',
    descrizione: 'Mettere insieme',
    impostazioni: [
      {
        chiave: 'modalita', etichetta: 'Tipo di esercizio', predefinito: 'oggetti',
        opzioni: [
          { valore: 'oggetti', testo: 'Con gli oggetti' },
          { valore: 'calcola', testo: 'Calcola' },
          { valore: 'alterna', testo: 'Alterna' }
        ]
      },
      C.impostazioneTema('Animali e cibo'),
      { chiave: 'sommaMax', etichetta: 'Risultato al massimo', predefinito: 10, opzioni: C.opzioniNumeriche([5, 10, 20]) },
      C.impostazioneEsercizi(),
      C.impostazioneAiuto('Disegno di aiuto in "Calcola"')
    ],
    avvia: avvia
  });

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);
    var el = k.el, t = k.tema, g = k.g, scena = k.scena;

    var quantiAdesso = t.senzaImmagini
      ? 'Quanti pallini ci sono adesso nella scatola?'
      : g.Quanti + ' ha adesso ' + t.il + ' ' + t.animale + '?';
    var contaTutti = 'Conta ' + g.tuttiCibi + (t.senzaImmagini ? ' nella scatola.' : ' nella ciotola.');

    // Disegno di aiuto: i due gruppi, separati da "+"
    function figura(es) {
      return el('div', { classe: 'figura figura-operazione' }, [
        k.mucchio(es.a), el('span', { classe: 'segno-figura', testo: '+' }), k.mucchio(es.b)
      ]);
    }

    function conOggetti(es, finito) {
      var errori = 0;
      var daMettere = es.b;
      scena.appendChild(api.consegna(t.senzaImmagini
        ? ['Nella scatola ci sono ' + g.quanti(es.a) + '.', 'Mettici ' + g.altri(es.b) + ': ' + g.toccali(es.b) + '.']
        : [g.Il + ' ha ' + g.quanti(es.a) + '.', 'Dagli ' + g.altri(es.b) + ': ' + g.toccali(es.b) + '.']));

      var c = k.ciotola({ quanti: 1 });
      for (var i = 0; i < es.a; i++) c.dentro.appendChild(k.oggetto());
      // Il cibo che arriva: ogni pezzo è un bottone che, toccato, va nella ciotola
      var arrivo = el('div', { classe: 'mucchio mucchio-tocca', 'aria-label': 'Da mettere: ' + es.b });
      for (var j = 0; j < es.b; j++) {
        arrivo.appendChild(el('button', {
          type: 'button', classe: 'pezzo', 'aria-label': 'Metti ' + t.unCibo + ' ' + t.cibo,
          onclick: function (e) { metti(e.currentTarget); }
        }, [k.oggetto()]));
      }
      var avviso = api.messaggio();
      var zonaDomande = el('div');
      [arrivo, el('div', { classe: 'scatole' }, [c.nodo]), avviso, zonaDomande].forEach(function (n) { scena.appendChild(n); });

      function metti(pezzo) {
        arrivo.removeChild(pezzo);
        c.dentro.appendChild(k.oggetto());
        daMettere--;
        arrivo.setAttribute('aria-label', 'Da mettere: ' + daMettere);
        if (daMettere > 0) return;
        arrivo.hidden = true;
        zonaDomande.appendChild(k.domanda(quantiAdesso, k.risposta(
          0, opz.sommaMax, es.somma,
          function () { finito(errori); },
          function () { errori++; avviso.dici('Non ancora. ' + contaTutti); }
        )));
      }
    }

    function calcola(es, finito) {
      var errori = 0;
      scena.appendChild(api.consegna('Quanto fa ' + es.a + ' più ' + es.b + '?'));
      var casella = el('span', { classe: 'casella', testo: '?' });
      var aiuto = k.aiuto('Mostrami il disegno', function () { return figura(es); });
      var avviso = api.messaggio();
      [el('p', { classe: 'operazione' }, [es.a + ' + ' + es.b + ' = ', casella]), aiuto.nodo].forEach(function (n) { scena.appendChild(n); });
      scena.appendChild(k.risposta(0, opz.sommaMax, es.somma,
        function () {
          casella.textContent = String(es.somma);
          casella.classList.add('compilata');
          avviso.dici('');
          finito(errori);
        },
        function (valore) {
          errori++;
          if (errori >= 2 && aiuto.mostra()) avviso.dici('Non ancora. Guarda il disegno e conta tutto.');
          else avviso.dici(valore < es.somma ? 'Non ancora: è di più.' : 'Non ancora: è di meno.');
        }));
      scena.appendChild(avviso);
    }

    k.sessione({
      modi: ['oggetti', 'calcola'],
      genera: function () {
        var a = k.casuale(1, opz.sommaMax - 1);
        var b = k.casuale(1, opz.sommaMax - a);
        return { a: a, b: b, somma: a + b };
      },
      chiave: function (es) { return es.a + '+' + es.b; },
      esegui: { oggetti: conOggetti, calcola: calcola },
      scritta: function (es) { return es.a + ' + ' + es.b + ' = ' + es.somma; }
    });
  }
})();
