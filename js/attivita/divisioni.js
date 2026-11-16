/*
 * Attività: Divisioni.
 *
 * Due modalità:
 *  - "Distribuisci": il ragazzo distribuisce dei pallini in scatole, uno alla volta,
 *    e poi dice quanti ce ne sono in ogni scatola (ed eventualmente quanti avanzano).
 *    È la divisione come "ripartizione in parti uguali", la più concreta.
 *  - "Calcola": l'operazione scritta (es. 12 : 3 = ?) con risposta a bottoni
 *    e un disegno di aiuto che compare su richiesta o dopo due tentativi.
 */
(function () {
  'use strict';

  var MAX_PALLINI_DA_DISTRIBUIRE = 40; // oltre diventa faticoso e poco leggibile

  function opzioniNumeriche(valori) {
    return valori.map(function (n) { return { valore: n, testo: String(n) }; });
  }

  function casuale(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  Impariamo.registra({
    id: 'divisioni',
    titolo: 'Divisioni',
    icona: ':',
    descrizione: 'Dividere in parti uguali',
    impostazioni: [
      {
        chiave: 'modalita', etichetta: 'Tipo di esercizio', predefinito: 'distribuisci',
        opzioni: [
          { valore: 'distribuisci', testo: 'Distribuisci' },
          { valore: 'calcola', testo: 'Calcola' },
          { valore: 'alterna', testo: 'Alterna' }
        ]
      },
      { chiave: 'divisoreMax', etichetta: 'Dividere al massimo per', predefinito: 3, opzioni: opzioniNumeriche([2, 3, 5, 10]) },
      { chiave: 'quozienteMax', etichetta: 'Risultato al massimo', predefinito: 5, opzioni: opzioniNumeriche([3, 5, 10]) },
      { chiave: 'conResto', etichetta: 'Divisioni con il resto', predefinito: false, opzioni: Impariamo.SI_NO },
      { chiave: 'numeroEsercizi', etichetta: 'Esercizi per volta', predefinito: 5, opzioni: opzioniNumeriche([3, 5, 10]) },
      {
        chiave: 'aiuto', etichetta: 'Disegno di aiuto in "Calcola"', predefinito: 'richiesta',
        opzioni: [
          { valore: 'sempre', testo: 'Sempre' },
          { valore: 'richiesta', testo: 'Su richiesta' },
          { valore: 'mai', testo: 'Mai' }
        ]
      }
    ],
    avvia: avvia
  });

  function avvia(area, opz, api) {
    var el = api.el;
    var indice = 0;
    var alPrimoTentativo = 0;
    var ultimaOperazione = '';

    var avanzamento = el('div', { classe: 'avanzamento' });
    var scena = el('div', { classe: 'scena' });
    area.appendChild(avanzamento);
    area.appendChild(scena);

    /* ---------- Elementi comuni ---------- */

    function pallino() {
      return el('span', { classe: 'pallino', 'aria-hidden': 'true' });
    }

    function aggiornaAvanzamento() {
      avanzamento.innerHTML = '';
      avanzamento.appendChild(el('span', { testo: 'Esercizio ' + (indice + 1) + ' di ' + opz.numeroEsercizi }));
      var puntini = el('span', { classe: 'puntini', 'aria-hidden': 'true' });
      for (var i = 0; i < opz.numeroEsercizi; i++) {
        puntini.appendChild(el('span', { classe: 'puntino' + (i < indice ? ' fatto' : i === indice ? ' attuale' : '') }));
      }
      avanzamento.appendChild(puntini);
    }

    // Bottoni con i numeri: un errore spegne solo quel numero, senza segni rossi
    function tastierino(da, a, corretto, alGiusto, alSbagliato) {
      var griglia = el('div', { classe: 'tastierino' });
      for (var n = da; n <= a; n++) {
        (function (numero) {
          var tasto = el('button', {
            type: 'button', classe: 'tasto', testo: String(numero),
            onclick: function () {
              if (numero === corretto) {
                Array.prototype.forEach.call(griglia.children, function (t) { t.disabled = true; });
                tasto.classList.add('giusto');
                api.suono('giusto');
                alGiusto();
              } else {
                tasto.disabled = true;
                tasto.classList.add('provato');
                api.suono('riprova');
                alSbagliato();
              }
            }
          });
          griglia.appendChild(tasto);
        })(n);
      }
      return griglia;
    }

    function domanda(testo, tastiera) {
      return el('div', { classe: 'domanda' }, [el('p', { classe: 'domanda-testo', testo: testo }), tastiera]);
    }

    function messaggio() {
      var p = el('p', { classe: 'messaggio', 'aria-live': 'polite' });
      p.dici = function (testo) { p.textContent = testo; if (testo) api.parla(testo); };
      return p;
    }

    // Disegno statico: le scatole già riempite e gli eventuali pallini avanzati
    function figura(es) {
      var contenitore = el('div', { classe: 'figura' });
      var scatole = el('div', { classe: 'scatole' });
      for (var i = 0; i < es.divisore; i++) {
        var dentro = el('span', { classe: 'scatola-pallini' });
        for (var j = 0; j < es.quoziente; j++) dentro.appendChild(pallino());
        scatole.appendChild(el('div', { classe: 'scatola statica' }, [dentro]));
      }
      contenitore.appendChild(scatole);
      if (es.resto > 0) {
        var avanzo = el('div', { classe: 'mucchio avanzo' });
        for (var k = 0; k < es.resto; k++) avanzo.appendChild(pallino());
        contenitore.appendChild(el('div', { classe: 'etichetta-avanzo' }, ['Avanzano:', avanzo]));
      }
      return contenitore;
    }

    /* ---------- Generazione degli esercizi ---------- */

    function genera(modo) {
      var es, chiave, tentativi = 0;
      do {
        var d = casuale(2, opz.divisoreMax);
        var q = casuale(1, opz.quozienteMax);
        var r = opz.conResto ? casuale(0, d - 1) : 0;
        if (modo === 'distribuisci' && d * q + r > MAX_PALLINI_DA_DISTRIBUIRE) {
          q = Math.max(1, Math.floor((MAX_PALLINI_DA_DISTRIBUIRE - r) / d));
        }
        es = { divisore: d, quoziente: q, resto: r, dividendo: d * q + r };
        chiave = es.dividendo + ':' + d;
        tentativi++;
      } while (chiave === ultimaOperazione && tentativi < 20); // evita due esercizi uguali di fila
      ultimaOperazione = chiave;
      return es;
    }

    /* ---------- Flusso ---------- */

    function prossimo() {
      if (indice >= opz.numeroEsercizi) {
        api.fine({ totale: opz.numeroEsercizi, alPrimoTentativo: alPrimoTentativo });
        return;
      }
      var modo = opz.modalita === 'alterna' ? (indice % 2 === 0 ? 'distribuisci' : 'calcola') : opz.modalita;
      var es = genera(modo);
      aggiornaAvanzamento();
      scena.innerHTML = '';
      var concludi = function (errori) { conclusione(es, errori); };
      if (modo === 'calcola') calcola(es, concludi);
      else distribuisci(es, concludi);
    }

    function conclusione(es, errori) {
      if (errori === 0) alPrimoTentativo++;
      indice++;
      var scritta = es.dividendo + ' : ' + es.divisore + ' = ' + es.quoziente + (es.resto ? ' resto ' + es.resto : '');
      var parlata = es.dividendo + ' diviso ' + es.divisore + ' fa ' + es.quoziente + (es.resto ? ', resto ' + es.resto : '');
      var avanti = el('button', {
        type: 'button', classe: 'bottone',
        testo: indice >= opz.numeroEsercizi ? 'Fine' : 'Avanti →',
        onclick: prossimo
      });
      var riquadro = el('div', { classe: 'esito' }, [
        el('p', { classe: 'esito-lode', testo: 'Esatto!' }),
        el('p', { classe: 'operazione', testo: scritta }),
        avanti
      ]);
      scena.appendChild(riquadro);
      if (riquadro.scrollIntoView) riquadro.scrollIntoView({ block: 'nearest' });
      avanti.focus();
      api.parla('Esatto! ' + parlata);
    }

    /* ---------- Modalità "Distribuisci" ---------- */

    function distribuisci(es, finito) {
      var errori = 0;
      var rimasti = es.dividendo;
      var conteggi = [];
      var scatole = [];
      var bloccato = false;

      scena.appendChild(api.consegna(
        'Dividi ' + es.dividendo + ' pallini in ' + es.divisore + ' scatole. ' +
        'Tocca una scatola per metterci un pallino.'
      ));

      var mucchio = el('div', { classe: 'mucchio' });
      var zonaScatole = el('div', { classe: 'scatole' });
      var avviso = messaggio();
      var ricomincia = el('button', { type: 'button', classe: 'bottone secondario piccolo', testo: 'Ricomincia', onclick: prepara });
      var zonaDomande = el('div');

      scena.appendChild(mucchio);
      scena.appendChild(zonaScatole);
      scena.appendChild(avviso);
      scena.appendChild(el('div', { classe: 'riga-bottoni' }, [ricomincia]));
      scena.appendChild(zonaDomande);

      function prepara() {
        rimasti = es.dividendo;
        conteggi = [];
        scatole = [];
        mucchio.innerHTML = '';
        zonaScatole.innerHTML = '';
        avviso.dici('');
        for (var i = 0; i < es.dividendo; i++) mucchio.appendChild(pallino());
        for (var s = 0; s < es.divisore; s++) {
          (function (n) {
            var scatola = el('button', {
              type: 'button', classe: 'scatola',
              onclick: function () { metti(n); }
            }, [el('span', { classe: 'scatola-pallini' })]);
            conteggi.push(0);
            scatole.push(scatola);
            zonaScatole.appendChild(scatola);
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
        mucchio.setAttribute('aria-label', 'Pallini da distribuire: ' + rimasti);
        scatole.forEach(function (s, i) {
          s.setAttribute('aria-label', 'Scatola ' + (i + 1) + ', ' + conteggi[i] + ' pallini');
          // Guida discreta: evidenzia le scatole che aspettano ancora un pallino
          s.classList.toggle('suggerita', !bloccato && !uguali && conteggi[i] === minimo);
        });
      }

      function metti(i) {
        if (bloccato) return;
        var minimo = Math.min.apply(null, conteggi);
        if (conteggi[i] > minimo) {
          avviso.dici('Prima metti un pallino nelle scatole che ne hanno di meno.');
          return;
        }
        rimasti--;
        conteggi[i]++;
        mucchio.removeChild(mucchio.lastChild);
        scatole[i].firstChild.appendChild(pallino());
        avviso.dici('');
        if (tutteUguali() && rimasti < es.divisore) {
          bloccato = true;
          scatole.forEach(function (s) { s.disabled = true; });
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
          avviso.dici('Hai finito di distribuire. I pallini rimasti non bastano per tutte le scatole: sono il resto.');
        } else {
          mucchio.hidden = true; // vuoto: non serve più e distrarrebbe
          avviso.dici('Hai finito di distribuire!');
        }
        var primaDomanda = domanda('Quanti pallini ci sono in ogni scatola?', tastierino(
          0, opz.quozienteMax, es.quoziente,
          function () {
            if (es.resto > 0) chiediResto();
            else finito(errori);
          },
          function () { errori++; avviso.dici('Non ancora. Conta i pallini dentro una scatola.'); }
        ));
        zonaDomande.appendChild(primaDomanda);
      }

      function chiediResto() {
        avviso.dici('');
        zonaDomande.appendChild(domanda('Quanti pallini sono avanzati?', tastierino(
          0, es.divisore - 1, es.resto,
          function () { finito(errori); },
          function () { errori++; avviso.dici('Non ancora. Conta i pallini rimasti fuori dalle scatole.'); }
        )));
      }

      prepara();
    }

    /* ---------- Modalità "Calcola" ---------- */

    function calcola(es, finito) {
      var errori = 0;
      var disegnoMostrato = false;

      scena.appendChild(api.consegna('Quanto fa ' + es.dividendo + ' diviso ' + es.divisore + '?'));

      var casellaQuoziente = el('span', { classe: 'casella', testo: '?' });
      var operazione = el('p', { classe: 'operazione' }, [es.dividendo + ' : ' + es.divisore + ' = ', casellaQuoziente]);
      var disegno = el('div');
      var avviso = messaggio();
      var bottoneAiuto = opz.aiuto === 'richiesta'
        ? el('button', { type: 'button', classe: 'bottone secondario piccolo', testo: 'Mostrami il disegno', onclick: mostraDisegno })
        : null;
      var zonaDomande = el('div');

      scena.appendChild(operazione);
      if (bottoneAiuto) scena.appendChild(el('div', { classe: 'riga-bottoni' }, [bottoneAiuto]));
      scena.appendChild(disegno);
      scena.appendChild(zonaDomande);
      scena.appendChild(avviso);

      function mostraDisegno() {
        if (disegnoMostrato) return;
        disegnoMostrato = true;
        disegno.appendChild(figura(es));
        if (bottoneAiuto) bottoneAiuto.hidden = true;
      }

      function sbagliato(testo) {
        errori++;
        if (errori >= 2 && opz.aiuto !== 'mai' && !disegnoMostrato) {
          mostraDisegno();
          avviso.dici('Non ancora. Guarda il disegno: conta i pallini in una scatola.');
        } else {
          avviso.dici(testo);
        }
      }

      if (opz.aiuto === 'sempre') mostraDisegno();

      zonaDomande.appendChild(tastierino(
        0, opz.quozienteMax, es.quoziente,
        function () {
          casellaQuoziente.textContent = String(es.quoziente);
          casellaQuoziente.classList.add('compilata');
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
        zonaDomande.appendChild(domanda('Quanto è il resto?', tastierino(
          0, es.divisore - 1, es.resto,
          function () {
            casellaResto.textContent = String(es.resto);
            casellaResto.classList.add('compilata');
            avviso.dici('');
            finito(errori);
          },
          function () {
            sbagliato('Non ancora. Il resto è quello che avanza: è sempre più piccolo di ' + es.divisore + '.');
          }
        )));
      }
    }

    prossimo();
  }
})();
