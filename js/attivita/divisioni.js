/*
 * Attività 4: Divisioni.
 *
 * Due modalità:
 *  - "Distribuisci": il ragazzo distribuisce il cibo agli animali (o i pallini nelle
 *    scatole), uno alla volta, e poi dice quanti ne ha ciascuno (ed eventualmente
 *    quanti avanzano). È la divisione come "ripartizione in parti uguali", la più concreta.
 *  - "Calcola": l'operazione scritta (es. 12 : 3 = ?) con un disegno di aiuto che
 *    compare su richiesta o dopo due tentativi.
 */
(function () {
  'use strict';

  var C = Impariamo.comune;
  var MAX_OGGETTI = 40; // oltre diventa faticoso e poco leggibile

  Impariamo.registra({
    id: 'divisioni',
    area: 'divisioni',
    etichetta: 'Con gli oggetti',
    titolo: 'Divisioni',
    icona: ':',
    immagine: 'img/volpe.png',
    sfondo: 'img/sfondo-prato.png',
    colore: '#ff7417',
    descrizione: 'Animali e cibo da dividere',
    usaTemi: true,
    impostazioni: [
      {
        chiave: 'modalita', etichetta: 'Tipo di esercizio', predefinito: 'distribuisci',
        opzioni: [
          { valore: 'distribuisci', testo: 'Distribuisci' },
          { valore: 'gruppi', testo: 'Fare gruppi' },
          { valore: 'calcola', testo: 'Calcola' },
          { valore: 'alterna', testo: 'Alterna' }
        ]
      },
      { chiave: 'divisoreMax', etichetta: 'Dividere al massimo per', predefinito: 3, opzioni: C.opzioniNumeriche([2, 3, 5, 10]) },
      { chiave: 'quozienteMax', etichetta: 'Risultato al massimo', predefinito: 5, opzioni: C.opzioniNumeriche([3, 5, 10]) },
      { chiave: 'conResto', etichetta: 'Divisioni con il resto', predefinito: false, opzioni: Impariamo.SI_NO }
    ],
    // Percorso a livelli: ogni gradino aggiunge una sola difficoltà
    livelli: [
      { nome: 'Distribuire tra 2 o 3', imp: { modalita: 'distribuisci', divisoreMax: 3, quozienteMax: 5, conResto: false } },
      { nome: 'Distribuire tra 2, 3, 4 o 5', imp: { modalita: 'distribuisci', divisoreMax: 5, quozienteMax: 5, conResto: false } },
      { nome: 'Fare gruppi uguali: quanti ne sfami?', imp: { modalita: 'gruppi', divisoreMax: 5, quozienteMax: 5, conResto: false } },
      { nome: 'Distribuire, fare gruppi e calcolare', imp: { modalita: 'alterna', divisoreMax: 5, quozienteMax: 5, conResto: false } },
      { nome: 'Con il resto, distribuendo', imp: { modalita: 'distribuisci', divisoreMax: 5, quozienteMax: 5, conResto: true } },
      { nome: 'Con il resto, anche scritte, fino a 10', imp: { modalita: 'alterna', divisoreMax: 5, quozienteMax: 10, conResto: true } }
    ],
    scheda: function (opz, quanti) {
      var lista = [];
      for (var i = 0; i < quanti; i++) {
        var es = generaEs(opz, 'calcola');
        lista.push({ tipo: 'riga', testo: es.dividendo + ' : ' + es.divisore + ' =' + (opz.conResto ? ' ______ resto' : ''),
          soluzione: es.dividendo + ' : ' + es.divisore + ' = ' + es.quoziente + (es.resto ? ' resto ' + es.resto : '') });
      }
      return lista;
    },
    avvia: avvia
  });

  // Un esercizio adatto alle impostazioni (serve anche per le schede da stampare)
  function generaEs(opz, modo) {
        var d = C.casuale(2, opz.divisoreMax);
        var q = C.casuale(1, opz.quozienteMax);
        var r = opz.conResto ? C.casuale(0, d - 1) : 0;
        if (modo !== 'calcola' && d * q + r > MAX_OGGETTI) q = Math.max(1, Math.floor((MAX_OGGETTI - r) / d));
        return { modo: modo, divisore: d, quoziente: q, resto: r, dividendo: d * q + r };
      }

  // "nel 12", "nell'8"
  function nel(n) { var c = String(n).charAt(0); return (c === '8' || n === 1 || n === 11 ? "nell'" : 'nel ') + n; }

  function avvia(area, opz, api) {
    var k = Impariamo.kit(area, opz, api);
    var el = k.el, t = k.tema, g = k.g, scena = k.scena;

    // Frasi che dipendono dal tema
    var testi = {
      consegna: function (n, d) {
        return t.senzaImmagini
          ? ['Dividi ' + n + ' pallini in ' + d + ' scatole.', 'Tocca una scatola per metterci un pallino.']
          : ['Dividi ' + n + ' ' + t.cibi + ' tra ' + d + ' ' + t.animali + '.',
            'Tocca ' + t.un + ' ' + t.animale + ' per dargli ' + t.unCibo + ' ' + t.cibo + '.'];
      },
      prima: t.senzaImmagini
        ? 'Prima metti un pallino nelle scatole che ne hanno di meno.'
        : 'Prima dai ' + t.unCibo + ' ' + t.cibo + ' ' + t.ai + ' ' + t.animali + ' che ne hanno di meno.',
      finitoResto: 'Hai finito di distribuire. ' + k.maiuscola(t.iCibi) + ' ' + t.cibi + ' ' + g.p('rimast') +
        ' non bastano per ' + t.tutti + ' ' + t.animali + ': sono il resto.',
      quantiOgnuno: t.senzaImmagini ? 'Quanti pallini ci sono in ogni scatola?' : g.Quanti + ' ha ogni ' + t.animale + '?',
      quantiAvanzati: g.Quanti + ' sono ' + g.p('avanzat') + '?',
      contaOgnuno: 'Conta ' + t.iCibi + ' ' + t.cibi + ' di ' + t.un + ' ' + t.animale + '.',
      contaAvanzati: 'Conta ' + t.iCibi + ' ' + t.cibi + ' ' + g.p('rimast') + ' fuori.'
    };

    // Disegno di aiuto: le ciotole già riempite e gli eventuali avanzi
    function figura(es) {
      var contenitore = el('div', { classe: 'figura' });
      var ciotole = el('div', { classe: 'scatole' });
      for (var i = 0; i < es.divisore; i++) {
        var c = k.ciotola({ quanti: es.divisore });
        for (var j = 0; j < es.quoziente; j++) c.dentro.appendChild(k.oggetto());
        ciotole.appendChild(c.nodo);
      }
      contenitore.appendChild(ciotole);
      if (es.resto > 0) contenitore.appendChild(el('div', { classe: 'etichetta-avanzo' }, ['Avanzano:', k.mucchio(es.resto, 'avanzo')]));
      return contenitore;
    }

    /* ---------- "Distribuisci" ---------- */

    function distribuisci(es, finito) {
      var errori = 0;
      var rimasti, conteggi, ciotole, bloccato;

      scena.appendChild(api.consegna(testi.consegna(es.dividendo, es.divisore)));
      var mucchio = el('div', { classe: 'mucchio' });
      var zonaCiotole = el('div', { classe: 'scatole' });
      var avviso = api.messaggio();
      var ricomincia = el('button', { type: 'button', classe: 'bottone secondario piccolo', testo: 'Ricomincia', onclick: prepara });
      var zonaDomande = el('div');
      [mucchio, zonaCiotole, avviso, el('div', { classe: 'riga-bottoni' }, [ricomincia]), zonaDomande]
        .forEach(function (n) { scena.appendChild(n); });

      function prepara() {
        rimasti = es.dividendo;
        conteggi = [];
        ciotole = [];
        bloccato = false;
        mucchio.innerHTML = '';
        zonaCiotole.innerHTML = '';
        avviso.dici('');
        for (var i = 0; i < es.dividendo; i++) mucchio.appendChild(k.oggetto());
        for (var s = 0; s < es.divisore; s++) {
          (function (n) {
            var c = k.ciotola({ quanti: es.divisore, tocca: function () { metti(n); } });
            conteggi.push(0);
            ciotole.push(c);
            zonaCiotole.appendChild(c.nodo);
          })(s);
        }
        aggiornaEtichette();
      }

      function tutteUguali() {
        return conteggi.every(function (c) { return c === conteggi[0]; });
      }

      function aggiornaEtichette() {
        var minimo = Math.min.apply(null, conteggi);
        var uguali = tutteUguali();
        mucchio.setAttribute('aria-label', k.maiuscola(t.cibi) + ' da distribuire: ' + rimasti);
        ciotole.forEach(function (c, i) {
          c.nodo.setAttribute('aria-label', k.maiuscola(t.animale) + ' ' + (i + 1) + ', ' + g.quanti(conteggi[i]));
          // Guida discreta: evidenzia le ciotole che aspettano ancora un pezzo
          c.nodo.classList.toggle('suggerita', !bloccato && !uguali && conteggi[i] === minimo);
        });
      }

      function metti(i) {
        if (bloccato) return;
        if (conteggi[i] > Math.min.apply(null, conteggi)) {
          avviso.dici(testi.prima);
          return;
        }
        rimasti--;
        conteggi[i]++;
        mucchio.removeChild(mucchio.lastChild);
        ciotole[i].dentro.appendChild(k.oggetto());
        avviso.dici('');
        if (tutteUguali() && rimasti < es.divisore) {
          bloccato = true;
          ciotole.forEach(function (c) { c.nodo.disabled = true; });
          aggiornaEtichette();
          faiDomande();
        } else {
          aggiornaEtichette();
        }
      }

      function faiDomande() {
        ricomincia.hidden = true;
        if (es.resto > 0) {
          mucchio.classList.add('avanzo');
          avviso.dici(testi.finitoResto);
        } else {
          mucchio.hidden = true; // vuoto: non serve più e distrarrebbe
          avviso.dici('Hai finito di distribuire!');
        }
        zonaDomande.appendChild(k.domanda(testi.quantiOgnuno, k.risposta(
          0, opz.quozienteMax, es.quoziente,
          function () {
            if (es.resto > 0) chiediResto();
            else finito(errori);
          },
          function () { errori++; avviso.dici('Non ancora. ' + testi.contaOgnuno); }
        )));
      }

      function chiediResto() {
        avviso.dici('');
        zonaDomande.appendChild(k.domanda(testi.quantiAvanzati, k.risposta(
          0, es.divisore - 1, es.resto,
          function () { finito(errori); },
          function () { errori++; avviso.dici('Non ancora. ' + testi.contaAvanzati); },
          { tipo: 'resto' }
        )));
      }

      prepara();
    }

    /* ---------- "Fare gruppi" ---------- */

    // La divisione come contenenza: "Ogni gattino mangia 3 pesci: quanti gattini sfami con 12?"
    // È lo stesso significato del "quante volte ci sta?" della divisione in colonna.
    function gruppi(es, finito) {
      var errori = 0;
      var d = es.divisore;
      var rimasti = es.dividendo;
      scena.appendChild(api.consegna(t.senzaImmagini
        ? ['In ogni scatola stanno ' + g.quanti(d) + '.', 'Riempi più scatole che puoi: tocca i pallini.']
        : ['Ogni ' + t.animale + ' mangia ' + g.quanti(d) + '.', 'Dai da mangiare a più ' + t.animali + ' che puoi: tocca ' + t.iCibi + ' ' + t.cibi + '.']));
      var mucchio = el('div', { classe: 'mucchio mucchio-tocca' });
      for (var i = 0; i < es.dividendo; i++) {
        mucchio.appendChild(el('button', { type: 'button', classe: 'pezzo', 'aria-label': k.maiuscola(t.cibo),
          onclick: function (e) { metti(e.currentTarget); } }, [k.oggetto()]));
      }
      var zonaCiotole = el('div', { classe: 'scatole' });
      var avviso = api.messaggio();
      var zonaDomande = el('div');
      [mucchio, zonaCiotole, avviso, zonaDomande].forEach(function (n) { scena.appendChild(n); });
      var attuale = null, dentro = 0, sfamati = 0;
      function nuovaCiotola() {
        attuale = k.ciotola({ quanti: 1 });
        dentro = 0;
        zonaCiotole.appendChild(attuale.nodo);
      }
      nuovaCiotola();
      function metti(pezzo) {
        mucchio.removeChild(pezzo);
        rimasti--;
        attuale.dentro.appendChild(k.oggetto());
        dentro++;
        if (dentro < d) return;
        sfamati++;
        attuale.nodo.classList.add('piena');
        if (rimasti >= d) {
          nuovaCiotola();
          avviso.dici(t.senzaImmagini ? 'Scatola piena! Eccone un\'altra.' : k.maiuscola(t.il) + (t.il.slice(-1) === "'" ? '' : ' ') + t.animale + ' è sazio! Ne arriva un altro.');
          return;
        }
        // Non ne restano abbastanza per un altro gruppo: sono il resto
        Array.prototype.forEach.call(mucchio.children, function (p) { p.disabled = true; });
        if (!rimasti) mucchio.hidden = true; else mucchio.classList.add('avanzo');
        avviso.dici(rimasti
          ? 'Ne restano ' + rimasti + ': non bastano per ' + (t.senzaImmagini ? 'un\'altra scatola' : 'un altro ' + t.animale) + '.'
          : 'Hai finito!');
        zonaDomande.appendChild(k.domanda(t.senzaImmagini ? 'Quante scatole hai riempito?' : 'Quanti ' + t.animali + ' hai sfamato?',
          k.risposta(0, opz.quozienteMax, sfamati,
            function () {
              if (!es.resto) return finito(errori);
              zonaDomande.appendChild(k.domanda(g.Quanti + ' sono ' + g.p('avanzat') + '?', k.risposta(0, d - 1, es.resto,
                function () { finito(errori); },
                function () { errori++; avviso.dici('Non ancora. ' + testi.contaAvanzati); },
                { tipo: 'resto' })));
            },
            function () { errori++; avviso.dici('Non ancora. Conta ' + (t.senzaImmagini ? 'le scatole piene.' : t.tutti + ' ' + t.animali + '.')); })));
      }
    }

    /* ---------- "Calcola" ---------- */

    function calcola(es, finito) {
      var errori = 0;
      scena.appendChild(api.consegna('Quanto fa ' + es.dividendo + ' diviso ' + es.divisore + '?'));
      var casella = el('span', { classe: 'casella', testo: '?' });
      var operazione = el('p', { classe: 'operazione' }, [es.dividendo + ' : ' + es.divisore + ' = ', casella]);
      var aiuto = k.aiuto('Mostrami il disegno', function () { return figura(es); });
      var zonaDomande = el('div');
      var avviso = api.messaggio();
      [operazione, aiuto.nodo, zonaDomande, avviso].forEach(function (n) { scena.appendChild(n); });

      function sbagliato(testo) {
        errori++;
        if (errori >= 2 && aiuto.mostra()) avviso.dici('Non ancora. Guarda il disegno. ' + testi.contaOgnuno);
        else avviso.dici(testo);
      }

      zonaDomande.appendChild(k.risposta(
        0, opz.quozienteMax, es.quoziente,
        function () {
          casella.textContent = String(es.quoziente);
          casella.classList.add('compilata');
          avviso.dici('');
          if (es.resto > 0) chiediResto();
          else finito(errori);
        },
        function () { sbagliato('Non ancora. Prova un altro numero.'); }
      ));

      function chiediResto() {
        var casellaResto = el('span', { classe: 'casella', testo: '?' });
        operazione.appendChild(document.createTextNode(' resto '));
        operazione.appendChild(casellaResto);
        zonaDomande.innerHTML = '';
        zonaDomande.appendChild(k.domanda('Quanto è il resto?', k.risposta(
          0, es.divisore - 1, es.resto,
          function () {
            casellaResto.textContent = String(es.resto);
            casellaResto.classList.add('compilata');
            avviso.dici('');
            finito(errori);
          },
          function () { sbagliato('Non ancora. Il resto è quello che avanza: è sempre più piccolo di ' + es.divisore + '.'); }
        )));
      }
    }

    k.sessione({
      modi: ['distribuisci', 'gruppi', 'calcola'],
      genera: function (modo) { return generaEs(opz, modo); },
      tipoErrore: function (modo) { return modo === 'calcola' ? 'calcolo' : 'conteggio'; },
      chiave: function (es) { return es.dividendo + ':' + es.divisore; },
      esegui: { distribuisci: distribuisci, gruppi: gruppi, calcola: calcola },
      scritta: function (es) {
        var operazione = es.dividendo + ' : ' + es.divisore + ' = ' + es.quoziente + (es.resto ? ' resto ' + es.resto : '');
        var contrario = 'Al contrario: ' + es.quoziente + ' × ' + es.divisore + (es.resto ? ' + ' + es.resto : '') + ' = ' + es.dividendo;
        // Dopo i gruppi: lo stesso fatto detto come nella divisione in colonna ("quante volte ci sta")
        var volte = Impariamo.quaderno.il(es.divisore) + ' sta ' + es.quoziente + (es.quoziente === 1 ? ' volta ' : ' volte ') + nel(es.dividendo) +
          (es.resto ? ' e avanza ' + es.resto : '') + '.';
        return { operazione: operazione, dopo: es.modo === 'gruppi' ? [volte.charAt(0).toUpperCase() + volte.slice(1), contrario] : [contrario] };
      }
    });
  }
})();
