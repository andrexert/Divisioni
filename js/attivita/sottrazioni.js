/*
 * Attività 2: Sottrazioni.
 *
 *  - "Con gli oggetti": l'animale ha del cibo nella ciotola e ne mangia una parte.
 *    Il ragazzo tocca i pezzi mangiati, che diventano trasparenti ma restano al
 *    loro posto (come quando si cancella sul quaderno), poi conta quelli rimasti.
 *    È la sottrazione come "togliere".
 *  - "Calcola": l'operazione scritta (es. 7 − 3 = ?), con il disegno come aiuto.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;

  Impariamo.registra({
    id: 'sottrazioni',
    passo: 2,
    titolo: 'Sottrazioni',
    icona: '−',
    immagine: 'img/ranocchia.png',
    sfondo: 'img/sfondo-stagno.png',
    colore: '#16a34a',
    descrizione: 'Togliere',
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
      { chiave: 'numeroMax', etichetta: 'Si parte al massimo da', predefinito: 10, opzioni: C.opzioniNumeriche([5, 10, 20]) },
      C.impostazioneEsercizi(),
      C.impostazioneAiuto('Disegno di aiuto in "Calcola"')
    ],
    avvia: avvia
  });

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);
    var el = k.el, t = k.tema, g = k.g, scena = k.scena;

    var tolti = t.senzaImmagini ? 'tolti' : g.p('mangiat');
    var quantiRestano = g.Quanti + (t.senzaImmagini ? ' restano nella scatola?' : ' restano?');
    var contaRimasti = 'Conta solo ' + t.iCibi + ' ' + t.cibi + ' ' + g.p('rimast') + ', non quelli ' + tolti + '.';
    if (t.femminile) contaRimasti = contaRimasti.replace('non quelli', 'non quelle');

    // Disegno di aiuto: tutto il cibo, con quello tolto trasparente
    function figura(es) {
      var c = k.ciotola({ quanti: 1 });
      for (var i = 0; i < es.a; i++) {
        var o = k.oggetto();
        if (i >= es.a - es.b) o.classList.add('tolto');
        c.dentro.appendChild(o);
      }
      return el('div', { classe: 'figura' }, [el('div', { classe: 'scatole' }, [c.nodo])]);
    }

    function conOggetti(es, finito) {
      var errori = 0;
      var daTogliere = es.b;
      scena.appendChild(api.consegna(t.senzaImmagini
        ? ['Nella scatola ci sono ' + g.quanti(es.a) + '.', 'Togline ' + es.b + ': tocca ' + g.quanti(es.b) + '.']
        : [g.Il + ' ha ' + g.quanti(es.a) + '.', 'Ne mangia ' + es.b + ': tocca ' + g.quanti(es.b) + '.']));

      var c = k.ciotola({ quanti: 1 });
      var pezzi = [];
      for (var i = 0; i < es.a; i++) {
        var pezzo = el('button', {
          type: 'button', classe: 'pezzo', 'aria-label': k.maiuscola(t.cibo) + ' ' + (i + 1),
          onclick: function (e) { togli(e.currentTarget); }
        }, [k.oggetto()]);
        pezzi.push(pezzo);
        c.dentro.appendChild(pezzo);
      }
      var avviso = api.messaggio();
      var zonaDomande = el('div');
      [el('div', { classe: 'scatole' }, [c.nodo]), avviso, zonaDomande].forEach(function (n) { scena.appendChild(n); });

      function togli(pezzo) {
        pezzo.classList.add('tolto');
        pezzo.disabled = true;
        daTogliere--;
        if (daTogliere > 0) return;
        pezzi.forEach(function (p) { p.disabled = true; });
        avviso.dici(t.senzaImmagini
          ? 'Hai tolto ' + g.quanti(es.b) + '.'
          : g.Il + ' ha mangiato ' + g.quanti(es.b) + '.');
        zonaDomande.appendChild(k.domanda(quantiRestano, k.risposta(
          0, opz.numeroMax, es.differenza,
          function () { avviso.dici(''); finito(errori); },
          function () { errori++; avviso.dici('Non ancora. ' + contaRimasti); }
        )));
      }
    }

    function calcola(es, finito) {
      var errori = 0;
      scena.appendChild(api.consegna('Quanto fa ' + es.a + ' meno ' + es.b + '?'));
      var casella = el('span', { classe: 'casella', testo: '?' });
      var aiuto = k.aiuto('Mostrami il disegno', function () { return figura(es); });
      var avviso = api.messaggio();
      [el('p', { classe: 'operazione' }, [es.a + ' − ' + es.b + ' = ', casella]), aiuto.nodo].forEach(function (n) { scena.appendChild(n); });
      scena.appendChild(k.risposta(0, opz.numeroMax, es.differenza,
        function () {
          casella.textContent = String(es.differenza);
          casella.classList.add('compilata');
          avviso.dici('');
          finito(errori);
        },
        function (valore) {
          errori++;
          if (errori >= 2 && aiuto.mostra()) avviso.dici('Non ancora. Guarda il disegno. ' + contaRimasti);
          else avviso.dici(valore < es.differenza ? 'Non ancora: è di più.' : 'Non ancora: è di meno.');
        }));
      scena.appendChild(avviso);
    }

    k.sessione({
      modi: ['oggetti', 'calcola'],
      genera: function () {
        var a = k.casuale(2, opz.numeroMax);
        var b = k.casuale(1, a - 1); // resta sempre almeno 1: il caso "0" si introduce più avanti
        return { a: a, b: b, differenza: a - b };
      },
      chiave: function (es) { return es.a + '-' + es.b; },
      esegui: { oggetti: conOggetti, calcola: calcola },
      scritta: function (es) { return es.a + ' − ' + es.b + ' = ' + es.differenza; }
    });
  }
})();
