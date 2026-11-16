/*
 * Attività: Divisioni in colonna.
 *
 * Il programma guida il procedimento un passo alla volta, con la disposizione
 * usata nelle scuole italiane (dividendo a sinistra, divisore a destra oltre
 * la linea verticale, risultato sotto il divisore):
 *
 *   1. "Il 4 sta nell'1?"            -> se no, si prende anche la cifra dopo
 *   2. "Quante volte il 4 sta nel 15?" -> la cifra va nel risultato
 *   3. "Quanto fa 3 × 4?"             -> si scrive sotto (se le sottrazioni sono visibili)
 *   4. "Quanto fa 15 − 12?"           -> si scrive il resto parziale
 *   5. "Abbassa il 6"                 -> e si ricomincia dal punto 2
 *
 * In ogni momento è evidenziato il numero su cui si sta lavorando.
 */
(function () {
  'use strict';

  function casuale(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function opzioniNumeriche(valori) {
    return valori.map(function (n) { return { valore: n, testo: String(n) }; });
  }

  // Articoli e preposizioni davanti ai numeri, come si leggono:
  // "l'8", "nell'11", ma "il 4", "nel 15"
  function iniziaConVocale(n) {
    return String(n).charAt(0) === '8' || n === 1 || n === 11 || (n >= 11000 && n <= 11999);
  }
  function Il(n) { return (iniziaConVocale(n) ? "L'" : 'Il ') + n; }
  function il(n) { return (iniziaConVocale(n) ? "l'" : 'il ') + n; }
  function nel(n) { return (iniziaConVocale(n) ? "nell'" : 'nel ') + n; }
  function del(n) { return (iniziaConVocale(n) ? "dell'" : 'del ') + n; }

  Impariamo.registra({
    id: 'colonna',
    titolo: 'Divisioni in colonna',
    icona: '÷',
    immagine: 'img/gufo.png',
    colore: '#8b5cf6',
    descrizione: 'Un passo alla volta',
    impostazioni: [
      { chiave: 'cifreDividendo', etichetta: 'Cifre del numero da dividere', predefinito: 2, opzioni: opzioniNumeriche([2, 3, 4]) },
      {
        chiave: 'cifreDivisore', etichetta: 'Cifre del divisore', predefinito: 1,
        opzioni: [{ valore: 1, testo: '1 (da 2 a 9)' }, { valore: 2, testo: '2 (da 11 a 25)' }]
      },
      { chiave: 'conResto', etichetta: 'Divisioni con il resto', predefinito: false, opzioni: Impariamo.SI_NO },
      {
        chiave: 'sottrazioni', etichetta: 'Scrivere le sottrazioni', predefinito: true,
        opzioni: [{ valore: true, testo: 'Sì (per imparare)' }, { valore: false, testo: 'No (metodo breve)' }]
      },
      {
        chiave: 'tabellina', etichetta: 'Tabellina di aiuto', predefinito: 'errore',
        opzioni: [
          { valore: 'sempre', testo: 'Sempre' },
          { valore: 'errore', testo: 'Dopo un errore' },
          { valore: 'mai', testo: 'Mai' }
        ]
      },
      { chiave: 'numeroEsercizi', etichetta: 'Esercizi per volta', predefinito: 3, opzioni: opzioniNumeriche([2, 3, 5]) }
    ],
    avvia: avvia
  });

  function avvia(area, opz, api) {
    var el = api.el;
    var indice = 0;
    var alPrimoTentativo = 0;
    var ultimaOperazione = '';

    var barra = api.avanzamento(opz.numeroEsercizi);
    var scena = el('div', { classe: 'scena' });
    area.appendChild(barra.nodo);
    area.appendChild(scena);

    function genera() {
      var minDiv = opz.cifreDivisore === 1 ? 2 : 11;
      var maxDiv = opz.cifreDivisore === 1 ? 9 : 25;
      var minN = Math.pow(10, opz.cifreDividendo - 1);
      var maxN = Math.pow(10, opz.cifreDividendo) - 1;
      for (var t = 0; t < 500; t++) {
        var d = casuale(minDiv, maxDiv);
        var n = casuale(minN, maxN);
        if (opz.conResto) {
          if (n % d === 0) continue;   // con il resto: il resto deve esserci davvero
        } else {
          n -= n % d;                  // senza resto: si scende al multiplo più vicino
        }
        if (n < minN || n < d * 2) continue; // il risultato deve essere almeno 2
        if (n + ':' + d === ultimaOperazione) continue;
        ultimaOperazione = n + ':' + d;
        return { dividendo: n, divisore: d };
      }
      return { dividendo: 84, divisore: 3 }; // riserva: in pratica non serve mai
    }

    function prossimo() {
      if (indice >= opz.numeroEsercizi) {
        api.fine({ totale: opz.numeroEsercizi, alPrimoTentativo: alPrimoTentativo });
        return;
      }
      barra.aggiorna(indice);
      scena.innerHTML = '';
      var es = genera();
      esercizio(es, function (errori, resto) {
        if (errori === 0) alPrimoTentativo++;
        indice++;
        var scritta = es.dividendo + ' : ' + es.divisore + ' = ' + Math.floor(es.dividendo / es.divisore) +
          (resto ? ' resto ' + resto : '');
        api.esito(scena, scritta, indice >= opz.numeroEsercizi, prossimo);
      });
    }

    /* ---------- Un esercizio ---------- */

    function esercizio(es, finito) {
      var d = es.divisore;
      var cifre = String(es.dividendo);
      var n = cifre.length;
      var errori = 0;

      // Ogni riga del calcolo: testo, colonna dell'ultima cifra, tipo
      var righe = [{ testo: cifre, fine: n - 1, tipo: 'dividendo' }];
      var abbassate = {};            // colonne del dividendo già abbassate
      var quoziente = '';
      var corrente = { riga: 0, da: 0, a: 0 }; // il numero su cui si lavora (evidenziato)
      var valore = Number(cifre.charAt(0));
      var evidenziaDivisore = false;

      // Cosa si aspetta il programma: null quando non serve scrivere numeri
      var attesa = null;
      var input = '';

      var zonaConsegna = el('div');
      var lavagna = el('div', { classe: 'colonna-lavagna', 'aria-hidden': 'true' });
      var comandi = el('div', { classe: 'colonna-comandi' });
      var avviso = api.messaggio();
      var tabellina = el('div', { classe: 'tabellina', hidden: true });

      scena.appendChild(zonaConsegna);
      scena.appendChild(el('div', { classe: 'colonna-area' }, [lavagna, comandi]));
      scena.appendChild(avviso);
      scena.appendChild(tabellina);

      if (opz.tabellina === 'sempre') mostraTabellina();

      /* --- Tastiera numerica (stessa disposizione del telefono) --- */

      var tastiera = el('div', { classe: 'tastiera-numerica' });
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'canc', '0', 'ok'].forEach(function (k) {
        tastiera.appendChild(el('button', {
          type: 'button',
          classe: 'tasto' + (k === 'ok' ? ' tasto-ok' : k === 'canc' ? ' tasto-canc' : ''),
          'aria-label': k === 'canc' ? 'Cancella' : null,
          testo: k === 'canc' ? '⌫' : k === 'ok' ? 'OK' : k,
          onclick: function () { premi(k); }
        }));
      });

      function premi(k) {
        if (!attesa) return;
        if (k === 'ok') {
          if (input !== '') verifica();
          return;
        }
        if (k === 'canc') input = input.slice(0, -1);
        else if (attesa.max === 1) input = k;          // una sola cifra: la nuova sostituisce
        else if (input.length < attesa.max) input += k;
        disegna();
      }

      function verifica() {
        var risposta = parseInt(input, 10);
        var a = attesa;
        input = '';
        if (risposta === a.corretto) {
          attesa = null;
          api.suono('giusto');
          avviso.dici('');
          a.alGiusto();
        } else {
          errori++;
          api.suono('riprova');
          avviso.dici(a.suggerimento(risposta));
          if (opz.tabellina === 'errore') mostraTabellina();
          disegna();
        }
      }

      function mostraTabellina() {
        if (opz.tabellina === 'mai' || !tabellina.hidden) return;
        tabellina.hidden = false;
        tabellina.appendChild(el('p', { classe: 'tabellina-titolo', testo: 'Tabellina ' + del(d) }));
        var elenco = el('div', { classe: 'tabellina-elenco' });
        for (var i = 1; i <= 9; i++) {
          elenco.appendChild(el('span', { testo: i + ' × ' + d + ' = ' + i * d }));
        }
        tabellina.appendChild(elenco);
      }

      function consegna(testo) {
        zonaConsegna.innerHTML = '';
        zonaConsegna.appendChild(api.consegna(testo));
      }

      function mostraComandi(nodo) {
        comandi.innerHTML = '';
        if (nodo) comandi.appendChild(nodo);
      }

      // Chiede un numero da scrivere nel quoziente o in una nuova riga
      function chiediNumero(testo, impostazioni) {
        attesa = impostazioni;
        input = '';
        consegna(testo);
        mostraComandi(tastiera);
        disegna();
      }

      /* --- I passi del procedimento --- */

      // Passo 1: il divisore sta nel numero preso finora?
      function chiediSeSta() {
        evidenziaDivisore = true;
        var giusto = valore >= d;
        consegna(Il(d) + ' sta ' + nel(valore) + '?');
        function rispondi(si) {
          if (si === giusto) {
            api.suono('giusto');
            if (si) {
              avviso.dici('');
              chiediQuanteVolte();
            } else {
              corrente.a++;
              valore = Number(cifre.slice(0, corrente.a + 1));
              avviso.dici('Allora prendo anche la cifra dopo.');
              chiediSeSta();
            }
          } else {
            errori++;
            api.suono('riprova');
            avviso.dici(giusto
              ? 'Guarda bene: ' + valore + ' è più grande di ' + d + ', quindi ' + il(d) + ' ci sta.'
              : 'Guarda bene: ' + valore + ' è più piccolo di ' + d + ', quindi ' + il(d) + ' non ci sta.');
          }
        }
        mostraComandi(el('div', { classe: 'riga-bottoni' }, [
          el('button', { type: 'button', classe: 'bottone grande', testo: 'Sì', onclick: function () { rispondi(true); } }),
          el('button', { type: 'button', classe: 'bottone grande', testo: 'No', onclick: function () { rispondi(false); } })
        ]));
        disegna();
      }

      // Passo 2: quante volte ci sta? La cifra va nel risultato
      function chiediQuanteVolte() {
        evidenziaDivisore = true;
        var q = Math.floor(valore / d);
        chiediNumero('Quante volte ' + il(d) + ' sta ' + nel(valore) + '?', {
          dove: 'quoziente', max: 1, corretto: q,
          suggerimento: function (x) {
            var p = x * d;
            if (p > valore) return 'Troppo: ' + x + ' × ' + d + ' = ' + p + ', che è più di ' + valore + '.';
            return 'Ci sta ancora: ' + x + ' × ' + d + ' = ' + p + ', e avanza ' + (valore - p) +
              ', che basta per un altro ' + d + '.';
          },
          alGiusto: function () {
            quoziente += String(q);
            evidenziaDivisore = false;
            if (q === 0) {
              // Succede dopo aver abbassato una cifra: si scrive 0 e si abbassa la successiva
              avviso.dici(Il(d) + ' non ci sta: nel risultato scrivo 0.');
              if (corrente.a < n - 1) chiediAbbassa();
              else termina(valore);
            } else if (opz.sottrazioni) {
              chiediProdotto(q);
            } else {
              chiediDifferenza(q);
            }
          }
        });
      }

      // Passo 3: quanto fa la cifra trovata per il divisore? Si scrive sotto
      function chiediProdotto(q) {
        var p = q * d;
        chiediNumero('Quanto fa ' + q + ' × ' + d + '? Scrivilo sotto ' + il(valore) + '.', {
          dove: 'riga', tipo: 'prodotto', fine: corrente.a, max: Math.min(corrente.a + 1, 4), corretto: p,
          suggerimento: function () { return 'Non ancora. Ripassa la tabellina ' + del(d) + '.'; },
          alGiusto: function () {
            righe.push({ testo: String(p), fine: corrente.a, tipo: 'prodotto' });
            chiediDifferenza(q);
          }
        });
      }

      // Passo 4: quanto avanza? È il resto di questo passaggio
      function chiediDifferenza(q) {
        var p = q * d;
        var r = valore - p;
        var testo = opz.sottrazioni
          ? 'Quanto fa ' + valore + ' − ' + p + '?'
          : 'Quanto avanza? Fai ' + valore + ' − ' + q + ' × ' + d + '.';
        chiediNumero(testo, {
          dove: 'riga', tipo: 'resto', fine: corrente.a, max: Math.min(corrente.a + 1, 4), corretto: r,
          suggerimento: function () {
            return opz.sottrazioni
              ? 'Non ancora. Conta da ' + p + ' fino a ' + valore + '.'
              : 'Non ancora. Prima fai ' + q + ' × ' + d + ' = ' + p + ', poi ' + valore + ' − ' + p + '.';
          },
          alGiusto: function () {
            righe.push({ testo: String(r), fine: corrente.a, tipo: 'resto' });
            corrente = { riga: righe.length - 1, da: corrente.a, a: corrente.a };
            valore = r;
            if (corrente.a < n - 1) chiediAbbassa();
            else termina(r);
          }
        });
      }

      // Passo 5: si abbassa la cifra successiva accanto al resto
      function chiediAbbassa() {
        var colonna = corrente.a + 1;
        var cifra = cifre.charAt(colonna);
        attesa = null;
        evidenziaDivisore = false;
        consegna('Abbassa ' + il(Number(cifra)) + '.');
        mostraComandi(el('button', {
          type: 'button', classe: 'bottone grande',
          testo: 'Abbassa ' + il(Number(cifra)) + ' ↓',
          onclick: function () {
            var riga = righe[corrente.riga];
            riga.testo += cifra;
            riga.fine = colonna;
            riga.scesa = colonna;
            abbassate[colonna] = true;
            corrente = { riga: corrente.riga, da: colonna - riga.testo.length + 1, a: colonna };
            valore = Number(riga.testo);
            avviso.dici('');
            chiediQuanteVolte();
          }
        }));
        disegna();
      }

      function termina(resto) {
        attesa = null;
        evidenziaDivisore = false;
        corrente = { riga: -1, da: 0, a: -1 };
        consegna(resto === 0
          ? 'Hai finito! Non avanza niente: il resto è 0.'
          : 'Hai finito! Avanza ' + resto + ': è il resto.');
        mostraComandi(null);
        disegna();
        finito(errori, resto);
      }

      /* --- Disegno della divisione --- */

      function disegna() {
        lavagna.innerHTML = '';
        var griglia = el('div', { classe: 'colonna-griglia' });
        // Una colonna in più a sinistra per il segno meno
        griglia.style.gridTemplateColumns = 'repeat(' + (n + 1) + ', var(--cella))';

        var tutte = righe.slice();
        if (attesa && attesa.dove === 'riga') {
          tutte.push({ testo: input || '?', fine: attesa.fine, tipo: attesa.tipo, inAttesa: true });
        }

        tutte.forEach(function (riga, r) {
          var celle = [];
          for (var c = 0; c <= n; c++) celle.push(el('span', { classe: 'cella' }));
          var inizio = riga.fine - riga.testo.length + 1; // colonna della prima cifra
          for (var j = 0; j < riga.testo.length; j++) {
            var cella = celle[inizio + j + 1];
            cella.textContent = riga.testo.charAt(j);
            if (riga.inAttesa) cella.classList.add('da-scrivere');
          }
          if (riga.tipo === 'prodotto' && opz.sottrazioni) {
            celle[inizio].textContent = '−';
            celle[inizio].classList.add('segno');
            for (var u = inizio; u <= riga.fine + 1; u++) celle[u].classList.add('linea');
          }
          if (riga.tipo === 'dividendo') {
            Object.keys(abbassate).forEach(function (col) { celle[Number(col) + 1].classList.add('abbassata'); });
          }
          if (riga.scesa !== undefined) celle[riga.scesa + 1].classList.add('scesa');
          if (r === corrente.riga && !riga.inAttesa) {
            for (var a = corrente.da; a <= corrente.a; a++) celle[a + 1].classList.add('attiva');
          }
          celle.forEach(function (x) { griglia.appendChild(x); });
        });

        var quoz = el('div', { classe: 'colonna-quoziente' });
        for (var q = 0; q < quoziente.length; q++) quoz.appendChild(el('span', { classe: 'cella', testo: quoziente.charAt(q) }));
        if (attesa && attesa.dove === 'quoziente') quoz.appendChild(el('span', { classe: 'cella da-scrivere', testo: input || '?' }));

        lavagna.appendChild(griglia);
        lavagna.appendChild(el('div', { classe: 'colonna-destra' }, [
          el('div', { classe: 'colonna-divisore' + (evidenziaDivisore ? ' attiva' : ''), testo: String(d) }),
          quoz
        ]));
      }

      chiediSeSta();
    }

    prossimo();
  }
})();
