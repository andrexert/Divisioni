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
    area: 'sottrazioni',
    etichetta: 'Con gli oggetti',
    titolo: 'Sottrazioni',
    icona: '−',
    immagine: 'img/ranocchia.png',
    sfondo: 'img/sfondo-stagno.png',
    colore: '#16a34a',
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
      { chiave: 'numeroMax', etichetta: 'Si parte al massimo da', predefinito: 10, opzioni: C.opzioniNumeriche([5, 10, 20]) },
      C.impostazioneEsercizi(),
      C.impostazioneAiuto('Disegno di aiuto in "Calcola"')
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: 'Da 5, con gli oggetti', imp: { modalita: 'oggetti', numeroMax: 5, apriSacchetto: false } },
      { nome: 'Da 10, con gli oggetti', imp: { modalita: 'oggetti', numeroMax: 10, apriSacchetto: false } },
      { nome: 'Da 10, anche scritte', imp: { modalita: 'alterna', numeroMax: 10, apriSacchetto: false } },
      { nome: 'Da più di 10, aprendo il sacchetto', imp: { modalita: 'oggetti', numeroMax: 20, apriSacchetto: true } },
      { nome: 'Da 20, anche scritte', imp: { modalita: 'alterna', numeroMax: 20, apriSacchetto: false } }
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
      function nuovoPezzo() {
        var pezzo = el('button', {
          type: 'button', classe: 'pezzo', 'aria-label': k.maiuscola(t.cibo),
          onclick: function (e) { togli(e.currentTarget); }
        }, [k.oggetto()]);
        pezzi.push(pezzo);
        return pezzo;
      }
      // Da 10 in su, 10 pezzi stanno chiusi in un sacchetto (una decina)
      var sacco = es.a >= 10 ? k.sacchetto() : null;
      if (sacco) c.dentro.appendChild(sacco);
      var fuori = sacco ? es.a - 10 : es.a;
      for (var i = 0; i < fuori; i++) c.dentro.appendChild(nuovoPezzo());
      var avviso = api.messaggio();
      var zonaSacchetto = el('div');
      var zonaDomande = el('div');
      [el('div', { classe: 'scatole' }, [c.nodo]), avviso, zonaSacchetto, zonaDomande].forEach(function (n) { scena.appendChild(n); });
      controllaSacchetto();

      function sciolti() { return pezzi.filter(function (p) { return !p.classList.contains('tolto'); }).length; }

      // Se i pezzi sciolti sono finiti ma ne servono ancora, si apre il sacchetto:
      // è il prestito delle sottrazioni in colonna, fatto con le mani
      function controllaSacchetto() {
        if (!sacco || daTogliere === 0 || sciolti() > 0) return;
        avviso.dici(es.a % 10 === 0 && daTogliere === es.b
          ? 'Sono tutti nel sacchetto: aprilo!'
          : 'Fuori dal sacchetto non ne restano. Ne servono ancora ' + daTogliere + ': apri il sacchetto!');
        zonaSacchetto.appendChild(k.azione('Apri il sacchetto', function () {
          for (var n = 0; n < 10; n++) c.dentro.insertBefore(nuovoPezzo(), sacco);
          c.dentro.removeChild(sacco);
          sacco = null;
          avviso.dici('Il sacchetto è aperto: dentro c\'erano 10 ' + t.cibi + '.');
        }));
      }

      function togli(pezzo) {
        pezzo.classList.add('tolto');
        pezzo.disabled = true;
        daTogliere--;
        if (daTogliere > 0) return controllaSacchetto();
        pezzi.forEach(function (p) { p.disabled = true; });
        avviso.dici(t.senzaImmagini
          ? 'Hai tolto ' + g.quanti(es.b) + '.'
          : g.Il + ' ha mangiato ' + g.quanti(es.b) + '.');
        zonaDomande.appendChild(k.domanda(quantiRestano, k.risposta(
          0, opz.numeroMax, es.differenza,
          function () { avviso.dici(''); finito(errori); },
          function () {
            errori++;
            avviso.dici('Non ancora. ' + (sacco
              ? 'Il sacchetto vale 10: parti da 10 e conta ' + (t.femminile ? 'quelle' : 'quelli') + ' ' + g.p('rimast') + ' fuori.'
              : contaRimasti));
          }
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
        var a, b;
        if (opz.apriSacchetto) {
          // Si parte da 10-18 e se ne tolgono più di quelli sciolti: bisogna aprire il sacchetto
          a = k.casuale(10, 18);
          b = k.casuale(a - 10 + 1, 9);
          return { a: a, b: b, differenza: a - b };
        }
        a = k.casuale(2, Math.min(opz.numeroMax, 19)); // fino a 19: al massimo un sacchetto
        b = k.casuale(1, a - 1); // resta sempre almeno 1: il caso "0" si introduce più avanti
        return { a: a, b: b, differenza: a - b };
      },
      chiave: function (es) { return es.a + '-' + es.b; },
      esegui: { oggetti: conOggetti, calcola: calcola },
      scritta: function (es) { return es.a + ' − ' + es.b + ' = ' + es.differenza; }
    });
  }
})();
