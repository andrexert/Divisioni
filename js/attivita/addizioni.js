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
    area: 'addizioni',
    etichetta: 'Con gli oggetti',
    titolo: 'Addizioni',
    icona: '+',
    immagine: 'img/orsetto.png',
    sfondo: 'img/sfondo-spiaggia.png',
    colore: '#0891b2',
    descrizione: 'Animali e cibo da contare',
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
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: 'Entro 5, con gli oggetti', imp: { modalita: 'oggetti', sommaMax: 5, oltreDieci: false } },
      { nome: 'Entro 10, con gli oggetti', imp: { modalita: 'oggetti', sommaMax: 10, oltreDieci: false } },
      { nome: 'Entro 10, anche scritte', imp: { modalita: 'alterna', sommaMax: 10, oltreDieci: false } },
      { nome: 'Oltre il 10, con il sacchetto da 10', imp: { modalita: 'oggetti', sommaMax: 20, oltreDieci: true } },
      { nome: 'Entro 20, anche scritte', imp: { modalita: 'alterna', sommaMax: 20, oltreDieci: false } }
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
      // 10 pezzi fanno un sacchetto (una decina): se si parte da 10 o più, c'è già
      var sciolti = es.a % 10;
      if (es.a >= 10) c.dentro.appendChild(k.sacchetto());
      for (var i = 0; i < sciolti; i++) c.dentro.appendChild(k.oggetto());
      var zonaSacchetto = el('div');
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
      [arrivo, el('div', { classe: 'scatole' }, [c.nodo]), avviso, zonaSacchetto, zonaDomande].forEach(function (n) { scena.appendChild(n); });

      function metti(pezzo) {
        arrivo.removeChild(pezzo);
        c.dentro.appendChild(k.oggetto());
        daMettere--;
        sciolti++;
        arrivo.setAttribute('aria-label', 'Da mettere: ' + daMettere);
        if (sciolti === 10) return proponiSacchetto();
        if (daMettere === 0) chiedi();
      }

      // Arrivati a 10 si fa il sacchetto: è il riporto delle addizioni in colonna
      function proponiSacchetto() {
        Array.prototype.forEach.call(arrivo.children, function (p) { p.disabled = true; });
        avviso.dici('Ci sono 10 ' + t.cibi + ': fanno una decina. ' + (t.femminile ? 'Mettile' : 'Mettili') + ' nel sacchetto!');
        zonaSacchetto.appendChild(k.azione('Fai il sacchetto da 10', function () {
          var pezzi = Array.prototype.filter.call(c.dentro.children, function (n) { return !n.classList.contains('sacchetto'); });
          pezzi.slice(0, 10).forEach(function (n) { c.dentro.removeChild(n); });
          var primoSciolto = Array.prototype.filter.call(c.dentro.children, function (n) { return !n.classList.contains('sacchetto'); })[0];
          c.dentro.insertBefore(k.sacchetto(), primoSciolto || null);
          sciolti = 0;
          avviso.dici('Ecco il sacchetto: dentro ci sono 10 ' + t.cibi + '.');
          Array.prototype.forEach.call(arrivo.children, function (p) { p.disabled = false; });
          if (daMettere === 0) chiedi();
        }));
      }

      function chiedi() {
        arrivo.hidden = true;
        var conSacchetto = !!c.dentro.querySelector('.sacchetto');
        zonaDomande.appendChild(k.domanda(quantiAdesso, k.risposta(
          0, opz.sommaMax, es.somma,
          function () { avviso.dici(''); finito(errori); },
          function () {
            errori++;
            avviso.dici('Non ancora. ' + (conSacchetto ? 'Il sacchetto vale 10: parti da 10 e conta gli altri.' : contaTutti));
          }
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
        var a, b;
        if (opz.oltreDieci) {
          // Si supera il 10: serve il sacchetto
          a = k.casuale(2, 9);
          b = k.casuale(11 - a, 9);
        } else {
          a = k.casuale(1, opz.sommaMax - 1);
          b = k.casuale(1, opz.sommaMax - a);
        }
        return { a: a, b: b, somma: a + b };
      },
      chiave: function (es) { return es.a + '+' + es.b; },
      esegui: { oggetti: conOggetti, calcola: calcola },
      scritta: function (es) { return es.a + ' + ' + es.b + ' = ' + es.somma; }
    });
  }
})();
