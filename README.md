# Impariamo insieme

Un piccolo programma didattico per ragazzi nello spettro autistico. Per ora contiene due attività, le **divisioni con gli oggetti** e le **divisioni in colonna**, ma è pensato per aggiungerne altre nel tempo.

Funziona interamente nel browser, senza installazione e senza connessione a Internet. Non raccoglie dati: le uniche informazioni salvate sono le impostazioni scelte dal docente, e restano nel browser del computer che si sta usando (`localStorage`).

## Come si usa

Basta aprire `index.html` con un doppio clic: si apre in Safari (o in un altro browser) e funziona subito. Per metterlo su più computer del laboratorio si copia l'intera cartella.

In alternativa si può pubblicare con **GitHub Pages** (Settings → Pages del repository) e aprire l'indirizzo che GitHub assegna da qualsiasi computer. Attenzione: con GitHub Pages il sito è pubblico. Non è un problema, perché non contiene dati, ma è bene saperlo.

Il programma è scritto in JavaScript "classico" (ES5), senza librerie né compilazione, così funziona anche con le versioni di Safari degli iMac Late 2013 (macOS Big Sur al massimo).

### Impostazioni per il docente

Le impostazioni si aprono **tenendo premuto** l'ingranaggio in alto a destra per un secondo e mezzo: così un ragazzo che ci clicca per sbaglio non ci entra. Dalla tastiera si aprono anche con Invio.

Sono disponibili:

- **Generali:** lettura vocale delle consegne (usa le voci italiane di macOS), suoni di conferma, colori vivaci o tenui (per i ragazzi con ipersensibilità visiva), caratteri più grandi, alto contrasto.
- **Divisioni:** tipo di esercizio, divisore massimo, risultato massimo, divisioni con il resto, numero di esercizi per sessione e disegno di aiuto.
- **Divisioni in colonna:** cifre del dividendo (2, 3 o 4), cifre del divisore (1 o 2), divisioni con il resto, sottrazioni scritte o metodo breve, tabellina di aiuto, numero di esercizi.

## L'attività "Divisioni"

**Distribuisci.** Il ragazzo divide del cibo tra alcuni animali, per esempio "Dividi 12 pesci tra 3 gattini", toccando un animale alla volta per dargli un pezzo. Il programma non permette di darne di più a uno prima degli altri: le ciotole che aspettano vengono evidenziate. Alla fine il ragazzo risponde a "Quanti pesci ha ogni gattino?" e, se c'è il resto, a "Quanti pesci sono avanzati?". È la divisione come ripartizione in parti uguali, l'approccio più concreto, presentata come una situazione di condivisione equa.

I temi disponibili sono gattini e pesci, cagnolini e ossi, coniglietti e carote, scoiattoli e ghiande, oppure i semplici pallini e scatole. Con l'impostazione "Animali" il tema viene scelto a caso all'inizio della sessione e resta lo stesso fino alla fine, per non introdurre cambiamenti imprevisti durante il lavoro.

**Calcola.** Compare l'operazione scritta, per esempio `12 : 3 = ?`, e si risponde con i bottoni numerici. Il disegno di aiuto (scatole già riempite) si può mostrare sempre, su richiesta o mai. Se è attivo "su richiesta", compare comunque dopo due tentativi sbagliati.

**Alterna.** Un esercizio "Distribuisci" e uno "Calcola", in alternanza.

## L'attività "Divisioni in colonna"

La divisione è disposta come sul quaderno: il dividendo a sinistra, il divisore a destra oltre la linea verticale, il risultato sotto il divisore. Il programma guida il procedimento un passo alla volta, con una sola domanda per volta:

1. "Il 4 sta nell'1?" Si risponde Sì o No. Se la risposta è No, si prende anche la cifra successiva.
2. "Quante volte il 4 sta nel 15?" La cifra va nel risultato.
3. "Quanto fa 3 × 4?" Il prodotto si scrive sotto, con il segno meno e la riga.
4. "Quanto fa 15 − 12?" Si scrive quanto avanza.
5. "Abbassa il 6." Si preme il bottone, la cifra scende accanto al resto e si ricomincia dal punto 2.

Se dopo aver abbassato una cifra il divisore non ci sta, si scrive 0 nel risultato e si abbassa la cifra successiva, come si fa a scuola.

Il numero su cui si sta lavorando è sempre evidenziato. Le cifre abbassate sono colorate e, nel dividendo, una freccina segna quelle già usate. Le risposte si scrivono con una tastiera numerica sullo schermo (cifre, cancella, OK).

Gli errori ricevono un suggerimento mirato. Se la risposta a "quante volte" è troppo grande compare "Troppo: 9 × 3 = 27, che è più di 26"; se è troppo piccola, compare quanto avanza e che basta per un altro divisore. La tabellina del divisore può essere sempre visibile, comparire dopo il primo errore oppure mai.

Con il **metodo breve** il prodotto non viene scritto: si chiede direttamente quanto avanza, come si fa negli anni successivi.

## Scelte di progettazione

Il programma segue alcuni principi pensati per i ragazzi nello spettro autistico:

- Struttura sempre uguale: consegna in alto, materiale al centro, risposta in basso, e "Esercizio 2 di 5" per sapere quanto manca.
- Niente timer, niente animazioni lampeggianti e nessun passaggio automatico: si va avanti solo premendo "Avanti".
- Colori vivaci ma con un ruolo fisso: blu per ciò che si tocca, arancione per gli oggetti da contare, giallo evidenziatore per il numero su cui si lavora, verde per la risposta giusta. Per chi è sensibile agli stimoli visivi c'è la tavolozza "tenui". I suoni sono disattivati di default.
- Gli errori non vengono segnalati con il rosso o con una X. Il numero sbagliato si spegne e compare un suggerimento concreto ("Conta i pallini dentro una scatola"), così il ragazzo non ripete lo stesso tentativo.
- Il feedback positivo è sempre lo stesso ("Esatto!") e ripete l'operazione completa, per renderlo prevedibile.
- Le risposte si danno con bottoni grandi, senza tastiera.

Alla fine della sessione compare una piccola nota per il docente con il numero di esercizi risolti al primo tentativo.

## Immagini

Gli animali e le mascotte (la volpe per le divisioni, il gufo per le divisioni in colonna) sono in pixel art, generati con [PixelLab](https://www.pixellab.ai/) e salvati come PNG nella cartella `img/`. Il programma non contatta PixelLab né altri servizi: le immagini sono file normali, quindi tutto continua a funzionare offline e non serve alcuna chiave API. Le immagini del cibo sono state ritagliate a 25×25 pixel e vengono mostrate al doppio della dimensione. Gli animali (64×64) sono mostrati a 128 o 64 pixel. Si usano sempre multipli esatti con `image-rendering: pixelated`, così i pixel restano nitidi.

Per aggiungere nuovi temi basta mettere in `img/` un animale e un cibo con lo stesso nome usato in `TEMI` dentro `js/attivita/divisioni.js`.

## Struttura dei file

```
index.html                  pagina principale
img/                        immagini in pixel art (animali, cibo, mascotte)
css/stile.css               aspetto grafico (colori, dimensioni, alto contrasto)
js/app.js                   nucleo: menu, impostazioni, voce, suoni
js/attivita/divisioni.js    attività "Divisioni" (con gli oggetti)
js/attivita/colonna.js      attività "Divisioni in colonna"
```

## Aggiungere una nuova attività

1. Creare un file in `js/attivita/`, per esempio `moltiplicazioni.js`.
2. Registrare l'attività:

```js
Impariamo.registra({
  id: 'moltiplicazioni',          // identificativo unico (usato anche per salvare le impostazioni)
  titolo: 'Moltiplicazioni',
  icona: '×',                     // oppure immagine: 'img/...png' (diventa anche la mascotte)
  colore: '#13814a',              // colore della scheda nel menu e del fumetto
  descrizione: 'Gruppi uguali',
  impostazioni: [                 // compaiono da sole nella schermata Impostazioni
    { chiave: 'max', etichetta: 'Numero massimo', predefinito: 5,
      opzioni: [{ valore: 5, testo: '5' }, { valore: 10, testo: '10' }] }
  ],
  avvia: function (area, opz, api) {
    // area: elemento in cui disegnare l'attività
    // opz:  impostazioni correnti, per esempio opz.max
    // api:  el(), consegna(testo), messaggio(), avanzamento(totale),
    //       esito(contenitore, scritta, ultimo, alAvanti), parla(testo),
    //       suono('giusto'|'riprova'), fine({ totale, alPrimoTentativo })
  }
});
```

3. Aggiungere in `index.html`, prima di `Impariamo.avvia()`:

```html
<script src="js/attivita/moltiplicazioni.js"></script>
```

L'attività comparirà automaticamente nel menu.
