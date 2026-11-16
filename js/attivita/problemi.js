/*
 * Attività 5: Problemi.
 *
 * Un problema a parole, con gli animali e il cibo scelti dal ragazzo:
 *   1. "Quale operazione serve?" — quattro grandi pulsanti: + − × :
 *      Scegliere l'operazione è una competenza diversa dal saperla eseguire.
 *      Un errore riceve un suggerimento che rimanda al testo; dopo due errori
 *      il pulsante giusto viene evidenziato.
 *   2. Il calcolo.
 *   3. La risposta a parole: "Restano 5 pesci."
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var MENO = '−', PER = '×';

  var OPERAZIONI = [
    { segno: '+', parola: 'più' },
    { segno: MENO, parola: 'meno' },
    { segno: PER, parola: 'per' },
    { segno: ':', parola: 'diviso' }
  ];

  Impariamo.registra({
    id: 'problemi',
    passo: 5,
    titolo: 'Problemi',
    icona: '?',
    immagine: 'img/tartaruga.png',
    sfondo: 'img/sfondo-menu.png',
    colore: '#0d9488',
    descrizione: 'Quale operazione serve?',
    usaTemi: true,
    impostazioni: [
      {
        chiave: 'operazioni', etichetta: 'Operazioni nei problemi', predefinito: 'piu-meno',
        opzioni: [
          { valore: 'piu-meno', testo: 'Più e meno' },
          { valore: 'piu-meno-per', testo: 'Più, meno e per' },
          { valore: 'tutte', testo: 'Tutte e quattro' }
        ]
      },
      { chiave: 'numeroMax', etichetta: 'Numeri al massimo', predefinito: 10, opzioni: C.opzioniNumeriche([10, 20, 50]) }
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: 'Più e meno, entro 10', imp: { operazioni: 'piu-meno', numeroMax: 10 } },
      { nome: 'Più e meno, entro 20', imp: { operazioni: 'piu-meno', numeroMax: 20 } },
      { nome: 'Più, meno e per', imp: { operazioni: 'piu-meno-per', numeroMax: 20 } },
      { nome: 'Tutte e quattro le operazioni', imp: { operazioni: 'tutte', numeroMax: 20 } },
      { nome: 'Tutte e quattro, numeri più grandi', imp: { operazioni: 'tutte', numeroMax: 50 } }
    ],
    avvia: avvia
  });

  // Numeri del problema per l'operazione scelta
  function numeri(op, max) {
    var a, b;
    if (op === '+') { a = C.casuale(1, max - 1); b = C.casuale(1, max - a); return { a: a, b: b, r: a + b }; }
    if (op === MENO) { a = C.casuale(3, max); b = C.casuale(1, a - 1); return { a: a, b: b, r: a - b }; }
    if (op === PER) {
      var n = C.casuale(2, max >= 50 ? 10 : 5), volte = C.casuale(2, 5);
      return { a: volte, b: n, r: volte * n };   // a = quanti animali, b = quanti a testa
    }
    var d = C.casuale(2, 5), q = C.casuale(1, max >= 50 ? 10 : 5);
    return { a: d * q, b: d, r: q };
  }

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);
    var el = k.el, t = k.tema, g = k.g, scena = k.scena;
    var pallini = !!t.senzaImmagini;

    // Il testo del problema, la domanda, la risposta a parole e l'aiuto se si sbaglia operazione
    function problema(op, x) {
      if (op === '+') return {
        testo: pallini
          ? ['Nella scatola ci sono ' + g.quanti(x.a) + '.', 'Ne metti ' + g.altri(x.b) + '.', 'Quanti pallini ci sono adesso?']
          : [g.Il + ' ha ' + g.quanti(x.a) + '.', 'Gliene porti ' + g.altri(x.b) + '.', g.Quanti + ' ha adesso?'],
        risposta: pallini ? 'Adesso ce ne sono ' + x.r + '.' : 'Adesso ne ha ' + g.quanti(x.r) + '.',
        indizio: 'Leggi bene: ne arrivano ' + (t.femminile ? 'altre' : 'altri') + '. Il numero diventa più grande o più piccolo?'
      };
      if (op === MENO) return {
        testo: pallini
          ? ['Nella scatola ci sono ' + g.quanti(x.a) + '.', 'Ne togli ' + x.b + '.', 'Quanti pallini restano?']
          : [g.Il + ' ha ' + g.quanti(x.a) + '.', 'Ne mangia ' + x.b + '.', g.Quanti + ' restano?'],
        risposta: (x.r === 1 ? 'Resta ' : 'Restano ') + g.quanti(x.r) + '.',
        indizio: 'Leggi bene: una parte se ne va. Il numero diventa più grande o più piccolo?'
      };
      if (op === PER) return {
        testo: pallini
          ? ['Ci sono ' + x.a + ' scatole.', 'In ogni scatola ci sono ' + g.quanti(x.b) + '.', 'Quanti pallini ci sono in tutto?']
          : ['Ci sono ' + x.a + ' ' + t.animali + '.', 'Ognuno ha ' + g.quanti(x.b) + '.', g.Quanti + ' ci sono in tutto?'],
        risposta: 'In tutto ci sono ' + g.quanti(x.r) + '.',
        indizio: 'Leggi bene: ci sono gruppi tutti uguali, e vuoi sapere quanti in tutto.'
      };
      return {
        testo: pallini
          ? ['Ci sono ' + g.quanti(x.a) + ' da mettere in ' + x.b + ' scatole.', 'In ogni scatola lo stesso numero.', 'Quanti pallini vanno in ogni scatola?']
          : ['Ci sono ' + g.quanti(x.a) + ' da dividere tra ' + x.b + ' ' + t.animali + '.', 'Ognuno ne riceve lo stesso numero.', g.Quanti + ' ha ogni ' + t.animale + '?'],
        risposta: pallini ? 'In ogni scatola ne vanno ' + x.r + '.' : 'Ogni ' + t.animale + ' ne ha ' + x.r + '.',
        indizio: 'Leggi bene: si divide in parti uguali.'
      };
    }

    function esercizio(es, finito) {
      var errori = 0;
      var p = problema(es.op, es);
      scena.appendChild(api.consegna(p.testo));
      var zona = el('div');
      var avviso = api.messaggio();
      scena.appendChild(zona);
      scena.appendChild(avviso);

      // 1. Scegliere l'operazione
      var sbagli = 0;
      var bottoni = el('div', { classe: 'scelta-operazione risposta' });
      OPERAZIONI.forEach(function (o) {
        bottoni.appendChild(el('button', {
          type: 'button', classe: 'bottone grande bottone-operazione', 'data-segno': o.segno,
          onclick: function () { scegli(o); }
        }, [el('span', { classe: 'segno-grande', testo: o.segno }), el('span', { testo: o.parola })]));
      });
      bottoni.gestisciTasto = function (tasto) {
        var mappa = { '+': '+', '-': MENO, '*': PER, 'x': PER, ':': ':', '/': ':' };
        var o = OPERAZIONI.filter(function (x) { return x.segno === mappa[tasto]; })[0];
        if (!o) return false;
        scegli(o);
        return true;
      };
      zona.appendChild(k.domanda('Quale operazione serve?', bottoni));

      function scegli(o) {
        if (bottoni.classList.contains('conclusa')) return;
        if (o.segno !== es.op) {
          errori++;
          sbagli++;
          if (api.errore) api.errore('operazione');
          api.suono('riprova');
          avviso.dici('Non ancora. ' + p.indizio);
          if (sbagli >= 2) bottoni.querySelector('[data-segno="' + es.op + '"]').classList.add('suggerito');
          return;
        }
        bottoni.classList.add('conclusa');
        Array.prototype.forEach.call(bottoni.children, function (b) {
          b.disabled = true;
          if (b.getAttribute('data-segno') === o.segno) b.classList.add('giusto');
        });
        api.suono('giusto');
        avviso.dici('');
        calcola();
      }

      // 2. Il calcolo
      function calcola() {
        var casella = el('span', { classe: 'casella', testo: '?' });
        zona.appendChild(el('p', { classe: 'operazione' }, [es.a + ' ' + es.op + ' ' + es.b + ' = ', casella]));
        var massimo = es.op === PER ? 50 : es.op === ':' ? 10 : opz.numeroMax;
        zona.appendChild(k.risposta(0, massimo, es.r,
          function () {
            casella.textContent = String(es.r);
            casella.classList.add('compilata');
            avviso.dici('');
            finito(errori);
          },
          function (v) { errori++; avviso.dici(v < es.r ? 'Non ancora: è di più.' : 'Non ancora: è di meno.'); },
          { tipo: 'calcolo' }));
      }
    }

    var ammesse = { 'piu-meno': ['+', MENO], 'piu-meno-per': ['+', MENO, PER], tutte: ['+', MENO, PER, ':'] }[opz.operazioni] || ['+', MENO];
    var ultimaOp = null;
    k.sessione({
      modi: ['problema'],
      genera: function () {
        // Si cambia operazione da un problema all'altro: altrimenti si indovina senza leggere
        var scelte = ammesse.filter(function (o) { return o !== ultimaOp; });
        var op = scelte[C.casuale(0, scelte.length - 1)];
        ultimaOp = op;
        var x = numeri(op, opz.numeroMax);
        x.op = op;
        return x;
      },
      chiave: function (es) { return es.op + es.a + '-' + es.b; },
      esegui: { problema: esercizio },
      scritta: function (es) {
        return { operazione: es.a + ' ' + es.op + ' ' + es.b + ' = ' + es.r, dopo: [problema(es.op, es).risposta] };
      }
    });
  }
})();
