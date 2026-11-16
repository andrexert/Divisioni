/*
 * Parti comuni alle attività con gli oggetti (addizioni, sottrazioni,
 * moltiplicazioni, divisioni): temi con animali e cibo, ciotole, risposte
 * numeriche, tastiera fisica e svolgimento della sessione.
 *
 * Uso dentro avvia(area, opz, api) di un'attività:
 *   var kit = Impariamo.kit(area, opz, api);
 *   kit.sessione({ modi: [...], genera: ..., esegui: {...}, scritta: ... });
 */
(function () {
  'use strict';

  function casuale(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function opzioniNumeriche(valori) {
    return valori.map(function (n) { return { valore: n, testo: String(n) }; });
  }

  function maiuscola(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /*
   * Temi: un animale (chi riceve) e il suo cibo (che cosa si conta).
   * I campi grammaticali servono a comporre frasi corrette:
   * "uno scoiattolo", "lo scoiattolo", "agli scoiattoli", "le carote", "Quante carote...".
   */
  var TEMI = {
    gatti: {
      animale: 'gattino', animali: 'gattini', un: 'un', il: 'il', al: 'al', ai: 'ai', tutti: 'tutti i',
      cibo: 'pesce', cibi: 'pesci', unCibo: 'un', iCibi: 'i', femminile: false
    },
    cani: {
      animale: 'cagnolino', animali: 'cagnolini', un: 'un', il: 'il', al: 'al', ai: 'ai', tutti: 'tutti i',
      cibo: 'osso', cibi: 'ossi', unCibo: 'un', iCibi: 'gli', femminile: false
    },
    conigli: {
      animale: 'coniglietto', animali: 'coniglietti', un: 'un', il: 'il', al: 'al', ai: 'ai', tutti: 'tutti i',
      cibo: 'carota', cibi: 'carote', unCibo: 'una', iCibi: 'le', femminile: true
    },
    scoiattoli: {
      animale: 'scoiattolo', animali: 'scoiattoli', un: 'uno', il: 'lo', al: 'allo', ai: 'agli', tutti: 'tutti gli',
      cibo: 'ghianda', cibi: 'ghiande', unCibo: 'una', iCibi: 'le', femminile: true
    },
    pallini: {
      animale: 'scatola', animali: 'scatole', un: 'una', il: 'la', al: 'alla', ai: 'alle', tutti: 'tutte le',
      cibo: 'pallino', cibi: 'pallini', unCibo: 'un', iCibi: 'i', femminile: false, senzaImmagini: true
    }
  };
  var TEMI_ANIMALI = ['gatti', 'cani', 'conigli', 'scoiattoli'];

  // Parole che dipendono dal tema, pronte all'uso nelle frasi delle attività
  function grammatica(t) {
    return {
      // "3 pesci", "1 carota"
      quanti: function (n) { return n + ' ' + (n === 1 ? t.cibo : t.cibi); },
      Quanti: (t.femminile ? 'Quante ' : 'Quanti ') + t.cibi,
      tuttiCibi: (t.femminile ? 'tutte le' : (t.iCibi === 'gli' ? 'tutti gli' : 'tutti i')) + ' ' + t.cibi,
      // accordo del participio con il cibo: "rimasti", "rimaste"
      p: function (radice) { return radice + (t.femminile ? 'e' : 'i'); },
      // "altri 4 pesci", "un'altra carota"
      altri: function (n) {
        if (n === 1) return (t.femminile ? "un'altra " : 'un altro ') + t.cibo;
        return (t.femminile ? 'altre ' : 'altri ') + n + ' ' + t.cibi;
      },
      // "toccalo", "toccale una alla volta"
      toccali: function (n) {
        return n === 1 ? 'toccal' + (t.femminile ? 'a' : 'o')
          : 'toccal' + (t.femminile ? 'e una' : 'i uno') + ' alla volta';
      },
      Il: maiuscola(t.il) + (t.il.slice(-1) === "'" ? '' : ' ') + t.animale
    };
  }

  // Descrittori di impostazioni condivisi dalle attività
  function impostazioneTema(etichetta) {
    return {
      chiave: 'tema', etichetta: etichetta, predefinito: 'animali',
      opzioni: [
        { valore: 'animali', testo: 'Animali (cambiano a ogni sessione)' },
        { valore: 'gatti', testo: 'Gattini e pesci' },
        { valore: 'cani', testo: 'Cagnolini e ossi' },
        { valore: 'conigli', testo: 'Coniglietti e carote' },
        { valore: 'scoiattoli', testo: 'Scoiattoli e ghiande' },
        { valore: 'pallini', testo: 'Pallini e scatole' }
      ]
    };
  }

  function impostazioneAiuto(etichetta) {
    return {
      chiave: 'aiuto', etichetta: etichetta, predefinito: 'richiesta',
      opzioni: [
        { valore: 'sempre', testo: 'Sempre' },
        { valore: 'richiesta', testo: 'Su richiesta' },
        { valore: 'mai', testo: 'Mai' }
      ]
    };
  }

  function impostazioneEsercizi() {
    return { chiave: 'numeroEsercizi', etichetta: 'Esercizi per volta', predefinito: 5, opzioni: opzioniNumeriche([3, 5, 10]) };
  }

  /* ---------- Il kit da usare dentro un'attività ---------- */

  function kit(area, opz, api) {
    var el = api.el;
    var barra = api.avanzamento(opz.numeroEsercizi);
    var scena = el('div', { classe: 'scena' });
    area.appendChild(barra.nodo);
    area.appendChild(scena);

    // Il tema resta lo stesso per tutta la sessione: niente cambi a sorpresa
    var nomeTema = opz.tema === 'animali' || !TEMI[opz.tema]
      ? TEMI_ANIMALI[casuale(0, TEMI_ANIMALI.length - 1)] : opz.tema;
    var tema = TEMI[nomeTema];

    // Un oggetto da contare: un pallino o il cibo del tema
    function oggetto() {
      if (tema.senzaImmagini) return el('span', { classe: 'pallino', 'aria-hidden': 'true' });
      return el('img', { classe: 'cibo', src: 'img/' + tema.cibo + '.png', alt: '', draggable: 'false' });
    }

    // Un animale con la sua ciotola (o una scatola, con il tema "pallini").
    // Restituisce { nodo, dentro }: "dentro" è la griglia dove vanno gli oggetti (righe da 5).
    // Con "tocca" diventa un bottone; quanti indica quanti animali ci sono in tutto
    // (oltre 5 si usano immagini più piccole).
    function ciotola(opzioni) {
      var dentro = el('span', { classe: 'scatola-pallini' });
      var parti = tema.senzaImmagini ? [dentro] : [
        el('img', { classe: 'animale' + (opzioni.quanti > 5 ? ' piccolo' : ''), src: 'img/' + tema.animale + '.png', alt: '', draggable: 'false' }),
        dentro
      ];
      var classe = 'scatola' + (tema.senzaImmagini ? '' : ' con-animale') + (opzioni.tocca ? '' : ' statica');
      var nodo = opzioni.tocca
        ? el('button', { type: 'button', classe: classe, onclick: opzioni.tocca }, parti)
        : el('div', { classe: classe }, parti);
      return { nodo: nodo, dentro: dentro };
    }

    // Un mucchio di n oggetti
    function mucchio(n, classe) {
      var m = el('div', { classe: 'mucchio' + (classe ? ' ' + classe : '') });
      for (var i = 0; i < n; i++) m.appendChild(oggetto());
      return m;
    }

    /*
     * Risposta numerica. Fino a 10 valori possibili: una fila di tasti, e un errore
     * spegne solo quel numero, senza segni rossi. Oltre: un tastierino con cifre e OK
     * (una fila di 21 tasti sarebbe troppo da guardare).
     * alSbagliato(valore) riceve il numero sbagliato, per dare un suggerimento mirato.
     */
    function risposta(da, a, corretto, alGiusto, alSbagliato) {
      return a - da <= 10
        ? rispostaATasti(da, a, corretto, alGiusto, alSbagliato)
        : rispostaATastierino(a, corretto, alGiusto, alSbagliato);
    }

    function rispostaATasti(da, a, corretto, alGiusto, alSbagliato) {
      var griglia = el('div', { classe: 'tastierino risposta' });
      for (var n = da; n <= a; n++) {
        (function (numero) {
          var tasto = el('button', {
            type: 'button', classe: 'tasto', testo: String(numero),
            onclick: function () {
              if (numero === corretto) {
                Array.prototype.forEach.call(griglia.children, function (t) { t.disabled = true; });
                tasto.classList.add('giusto');
                griglia.classList.add('conclusa');
                api.suono('giusto');
                alGiusto();
              } else {
                tasto.disabled = true;
                tasto.classList.add('provato');
                api.suono('riprova');
                alSbagliato(numero);
              }
            }
          });
          griglia.appendChild(tasto);
        })(n);
      }
      // Tastiera fisica: le cifre premono i tasti. Se c'è il 10 tra le risposte,
      // dopo "1" si aspetta un attimo un eventuale "0".
      var digitate = '';
      var attesa = null;
      griglia.gestisciTasto = function (tasto) {
        if (!/^[0-9]$/.test(tasto)) return false;
        var disponibili = Array.prototype.filter.call(griglia.children, function (b) { return !b.disabled; });
        clearTimeout(attesa);
        digitate += tasto;
        var esatto = null;
        var piuLunghi = false;
        disponibili.forEach(function (b) {
          if (b.textContent === digitate) esatto = b;
          else if (b.textContent.indexOf(digitate) === 0) piuLunghi = true;
        });
        if (esatto && !piuLunghi) {
          digitate = '';
          esatto.click();
        } else if (piuLunghi) {
          attesa = setTimeout(function () {
            digitate = '';
            if (esatto && !esatto.disabled) esatto.click();
          }, 800);
        } else {
          digitate = '';
        }
        return true;
      };
      return griglia;
    }

    function rispostaATastierino(massimo, corretto, alGiusto, alSbagliato) {
      var cifreMassime = String(massimo).length;
      var input = '';
      var schermo = el('span', { classe: 'casella casella-risposta', testo: '?' });
      var tasti = el('div', { classe: 'tastiera-numerica' });
      var nodo = el('div', { classe: 'risposta risposta-tastierino' }, [schermo, tasti]);
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'canc', '0', 'ok'].forEach(function (k) {
        tasti.appendChild(el('button', {
          type: 'button',
          classe: 'tasto' + (k === 'ok' ? ' tasto-ok' : k === 'canc' ? ' tasto-canc' : ''),
          'aria-label': k === 'canc' ? 'Cancella' : null,
          testo: k === 'canc' ? '⌫' : k === 'ok' ? 'OK' : k,
          onclick: function () { premi(k); }
        }));
      });
      function premi(k) {
        if (nodo.classList.contains('conclusa')) return;
        if (k === 'ok') {
          if (input === '') return;
          var valore = parseInt(input, 10);
          if (valore === corretto) {
            nodo.classList.add('conclusa');
            schermo.textContent = String(corretto);
            schermo.classList.add('compilata');
            Array.prototype.forEach.call(tasti.children, function (t) { t.disabled = true; });
            api.suono('giusto');
            alGiusto();
          } else {
            input = '';
            schermo.textContent = '?';
            api.suono('riprova');
            alSbagliato(valore);
          }
          return;
        }
        if (k === 'canc') input = input.slice(0, -1);
        else if (input.length < cifreMassime) input += k;
        schermo.textContent = input || '?';
      }
      nodo.gestisciTasto = function (tasto) {
        if (/^[0-9]$/.test(tasto)) premi(tasto);
        else if (tasto === 'Backspace' || tasto === 'Delete') premi('canc');
        else if (tasto === 'Enter') premi('ok');
        else return false;
        return true;
      };
      return nodo;
    }

    // La tastiera fisica va all'ultima risposta ancora aperta
    api.tastiera(function (tasto) {
      var aperte = scena.querySelectorAll('.risposta:not(.conclusa)');
      var attiva = aperte[aperte.length - 1];
      return attiva ? attiva.gestisciTasto(tasto) : false;
    });

    function domanda(testo, nodoRisposta) {
      return el('div', { classe: 'domanda' }, [el('p', { classe: 'domanda-testo', testo: testo }), nodoRisposta]);
    }

    // Bottone "aiuto" (disegno, tabellina...) secondo l'impostazione: sempre, su richiesta, mai.
    // Restituisce { nodo, mostra() }: mostra() si può chiamare anche dopo due errori.
    function aiuto(testoBottone, crea) {
      var contenitore = el('div');
      var mostrato = false;
      var bottone = opz.aiuto === 'richiesta'
        ? el('button', { type: 'button', classe: 'bottone secondario piccolo', testo: testoBottone, onclick: mostra })
        : null;
      var nodo = el('div', {}, [bottone ? el('div', { classe: 'riga-bottoni' }, [bottone]) : null, contenitore]);
      function mostra() {
        if (mostrato || opz.aiuto === 'mai') return false;
        mostrato = true;
        contenitore.appendChild(crea());
        if (bottone) bottone.parentNode.hidden = true;
        return true;
      }
      if (opz.aiuto === 'sempre') mostra();
      return { nodo: nodo, mostra: mostra, mostrato: function () { return mostrato; } };
    }

    /*
     * Svolgimento della sessione, uguale per tutte le attività:
     * "Esercizio 2 di 5", un esercizio alla volta, "Esatto!" e "Avanti", poi "Finito!".
     *   modi:    i nomi delle due modalità; con opz.modalita === 'alterna' si alternano
     *   genera:  function (modo) → esercizio
     *   chiave:  function (es) → testo, per non proporre due esercizi uguali di fila
     *   esegui:  { modo: function (es, finito) }, dove finito(errori) chiude l'esercizio
     *   scritta: function (es) → testo (o righe) mostrato nel riquadro "Esatto!"
     */
    function sessione(cfg) {
      var indice = 0;
      var alPrimoTentativo = 0;
      var ultimaChiave = '';
      function prossimo() {
        if (indice >= opz.numeroEsercizi) {
          api.fine({ totale: opz.numeroEsercizi, alPrimoTentativo: alPrimoTentativo });
          return;
        }
        var modo = opz.modalita === 'alterna' ? cfg.modi[indice % 2] : opz.modalita;
        if (!cfg.esegui[modo]) modo = cfg.modi[0];
        var es, tentativi = 0;
        do { es = cfg.genera(modo); tentativi++; } while (cfg.chiave(es) === ultimaChiave && tentativi < 30);
        ultimaChiave = cfg.chiave(es);
        barra.aggiorna(indice);
        scena.innerHTML = '';
        cfg.esegui[modo](es, function (errori) {
          if (errori === 0) alPrimoTentativo++;
          indice++;
          api.esito(scena, cfg.scritta(es), indice >= opz.numeroEsercizi, prossimo);
        });
      }
      prossimo();
    }

    return {
      el: el,
      scena: scena,
      tema: tema,
      g: grammatica(tema),
      casuale: casuale,
      maiuscola: maiuscola,
      oggetto: oggetto,
      ciotola: ciotola,
      mucchio: mucchio,
      risposta: risposta,
      domanda: domanda,
      aiuto: aiuto,
      sessione: sessione
    };
  }

  Impariamo.comune = {
    casuale: casuale,
    opzioniNumeriche: opzioniNumeriche,
    impostazioneTema: impostazioneTema,
    impostazioneAiuto: impostazioneAiuto,
    impostazioneEsercizi: impostazioneEsercizi
  };
  Impariamo.kit = kit;
})();
