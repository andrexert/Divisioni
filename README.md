# Impariamo insieme

Un piccolo programma didattico per ragazzi nello spettro autistico. È un **percorso verso la divisione** organizzato in quattro **aree**, una per operazione, ciascuna con la sua mascotte:

1. **Addizioni** (orsetto)
2. **Sottrazioni** (ranocchia)
3. **Moltiplicazioni** (riccio)
4. **Divisioni** (volpe)

Il menu principale mostra solo le quattro aree, per non affollare lo schermo. Dentro ogni area ci sono due scelte:

- **Con gli oggetti**: animali e cibo da contare, mettere insieme, togliere, raggruppare o dividere, poi l'operazione scritta.
- **In colonna**: il procedimento sul quaderno a quadretti, un passo alla volta, sempre con il gufo, "il maestro del quaderno".

Il pulsante in alto a sinistra risale sempre di un livello: dall'attività all'area, dall'area al menu.

Ogni tappa usa gli strumenti della precedente: le tabelline servono per la divisione in colonna, la sottrazione per i suoi resti. Le attività con gli oggetti usano gli stessi animali e lo stesso cibo, così il ragazzo ritrova sempre un mondo che conosce.

È una **web app installabile** (PWA): si apre da un indirizzo web, si può installare con la sua icona e, dopo la prima apertura, funziona anche senza connessione. Non raccoglie dati: le uniche informazioni salvate sono le impostazioni scelte dal docente, che restano nel browser del dispositivo che si sta usando (`localStorage`), insieme a un piccolo resoconto dell'ultima sessione per il docente (attività e numero di esercizi risolti al primo tentativo, senza nomi).

Funziona su **qualsiasi dispositivo con un browser recente**: Mac (anche gli iMac Late 2013 con Safari su Big Sur), PC Windows, Chromebook, iPad e tablet Android, iPhone e telefoni Android. Si usa con il mouse, con il touch o con la tastiera, e la pagina si adatta allo schermo: sui telefoni il quaderno a quadretti si restringe fino a starci per intero.

## Come si usa

### Online (consigliato)

L'app si pubblica con **GitHub Pages**. Ogni modifica al branch `main` viene pubblicata automaticamente dal workflow `.github/workflows/pubblica.yml`, in un paio di minuti. Ogni dispositivo controlla gli aggiornamenti a ogni apertura e, se l'app resta aperta, ogni mezz'ora. Quando trova una versione nuova la scarica in sottofondo e si ricarica da sola appena si è sul menu: se un ragazzo sta facendo un esercizio, aspetta che torni al menu, così il lavoro non viene mai interrotto.

Configurazione, da fare una volta sola:

1. Il repository deve essere **pubblico**, oppure l'account deve avere GitHub Pro: GitHub Pages sui repository privati è a pagamento. Il codice non contiene dati personali.
2. In *Settings → Pages → Build and deployment → Source* scegliere **GitHub Actions**.
3. Unire il lavoro nel branch `main`: il workflow pubblica e mostra l'indirizzo, del tipo `https://<utente>.github.io/<repository>/`.

Come averla "come un'app", con l'icona della volpe:

- **Mac con Safari**: da macOS Sonoma, *File → Aggiungi al Dock*. Sulle versioni precedenti (iMac Late 2013 con Big Sur) si trascina il link dalla barra degli indirizzi nella parte destra del Dock.
- **Windows, Mac o Chromebook con Chrome o Edge**: dal menu del browser, *Installa Impariamo insieme* (o *Installa questo sito come app*). Si apre in una finestra sua.
- **iPad e iPhone**: in Safari, *Condividi → Aggiungi alla schermata Home*.
- **Tablet e telefoni Android**: in Chrome, menu *⋮ → Installa app* (o *Aggiungi a schermata Home*).

In tutti i casi, dopo la prima apertura l'app funziona anche senza rete.

### Senza Internet e senza pubblicare

Si può ancora aprire `index.html` con un doppio clic, copiando l'intera cartella su ogni computer. In questo modo l'app funziona ma non si aggiorna da sola.

### Come funziona il "senza rete"

`sw.js` è un *service worker*: uno script che il browser installa alla prima visita e che conserva una copia di tutti i file. Al momento della pubblicazione, `tools/prepara_sito.py` scrive nel service worker l'elenco completo dei file e una versione (l'hash del commit). Quando la versione cambia, il browser scarica i file nuovi e cancella la copia vecchia. Lo script controlla anche che ogni immagine citata nel codice esista davvero, così un file dimenticato blocca la pubblicazione invece di rompere l'app offline.

Il programma è scritto in JavaScript "classico" (ES5), senza librerie né compilazione, e usa solo funzioni disponibili da anni in tutti i browser. Per i Safari meno recenti (iPad con iOS 14.4 o precedente, Mac non aggiornati) c'è un'alternativa per gli spazi tra gli elementi, che quei browser non gestiscono nei layout flessibili.

### Impostazioni per il docente

Le impostazioni si aprono dall'ingranaggio in alto a destra: si apre l'**Area docente**, dove bisogna scrivere la parola **DOCENTE** (maiuscole o minuscole non contano). Non è una protezione di sicurezza, visto che la parola è scritta qui, ma basta perché un ragazzo che clicca per curiosità non cambi le impostazioni per sbaglio. Nella prima pagina delle impostazioni c'è il **resoconto dell'ultima sessione** su quel dispositivo: è lì, e non alla fine degli esercizi, perché un ragazzo che legge "0 su 5" dopo aver finito può viverla male.

Sono disponibili:

- **Generali:** passaggio al livello successivo (lo decide il docente, oppure automatico), lettura vocale delle consegne (usa le voci italiane di macOS), suoni di conferma, colori vivaci o tenui (per i ragazzi con ipersensibilità visiva), sfondi illustrati sì o no, caratteri più grandi, alto contrasto.
- **Addizioni** e **Sottrazioni:** tipo di esercizio (con gli oggetti, calcola, alterna), animali e cibo, numero massimo (5, 10 o 20), numero di esercizi, disegno di aiuto.
- **Moltiplicazioni:** tipo di esercizio (gruppi uguali, tabelline, alterna), animali e cibo, quali tabelline (dal 2 al 5, dal 2 al 10 o una sola), numero di esercizi, aiuto con i salti.
- **Divisioni:** tipo di esercizio, divisore massimo, risultato massimo, divisioni con il resto, numero di esercizi per sessione e disegno di aiuto.
- **Addizioni in colonna** e **Sottrazioni in colonna:** cifre dei numeri (2, 3 o 4), con o senza riporto (o prestito), numero di esercizi.
- **Moltiplicazioni in colonna:** cifre del numero da moltiplicare (2 o 3), moltiplicatore a 1 o 2 cifre, numero di esercizi.
- **Divisioni in colonna:** cifre del dividendo (2, 3 o 4), cifre del divisore (1 o 2), divisioni con il resto, sottrazioni scritte o metodo breve, tabellina di aiuto, numero di esercizi.

## Percorso a livelli

Ogni attività ha una **scala di livelli**: ogni gradino aggiunge una sola difficoltà nuova. Per esempio, le addizioni con gli oggetti vanno da "entro 5" a "entro 10", poi "oltre il 10, con il sacchetto da 10", poi "entro 20, anche scritte". Le divisioni in colonna tengono lontano lo 0 nel risultato fino al livello 5, e le sottrazioni in colonna hanno un livello apposta per il prestito che attraversa uno 0. In ogni attività la voce **Difficoltà** permette di scegliere tra "Percorso a livelli" (predefinito) e "Scelgo io", che usa le impostazioni manuali di sempre.

**Criterio di padronanza.** Dopo ogni sessione il programma registra quanti esercizi sono stati risolti al primo tentativo.
- Due sessioni di fila con almeno l'80% (per esempio 4 su 5): il ragazzo è **pronto per il livello successivo**.
- Due sessioni di fila sotto il 40%: il programma suggerisce di **valutare un passo indietro**.

**Chi decide.** Per impostazione predefinita decide il docente: il programma propone, un pallino arancione sull'ingranaggio segnala le proposte in attesa, e nell'area docente si cambia livello con due pulsanti. Con "Passaggio al livello successivo: automatico" si sale da soli, e il ragazzo lo sa già alla fine della sessione ("La prossima volta passi al livello 3"), così il cambiamento non arriva a sorpresa. Il passo indietro non è mai automatico, perché non deve sembrare una punizione.

I livelli e le sessioni sono salvati solo sul dispositivo, senza nomi. Se più ragazzi usano lo stesso dispositivo, condividono lo stesso percorso: per percorsi separati servirebbero profili per ragazzo, da valutare anche con il responsabile della protezione dei dati della scuola.

## Il sacchetto da 10: il valore posizionale

Le operazioni in colonna si reggono su un'idea sola: **10 unità fanno 1 decina**. Il programma la rende visibile con un sacchetto, lo stesso in tutte le attività:

- **Addizioni con gli oggetti:** quando la ciotola arriva a 10 pezzi, il ragazzo preme "Fai il sacchetto da 10" e i 10 pezzi diventano un sacchetto. Alla fine si conta "sacchetto (10) e altri 3". È il riporto, fatto con le mani.
- **Sottrazioni con gli oggetti:** da 10 in su la ciotola contiene un sacchetto chiuso e i pezzi sciolti. Se quelli sciolti non bastano, bisogna "aprire il sacchetto" e si ottengono 10 pezzi. È il prestito, fatto con le mani.
- **In colonna:** al momento del riporto compare "12 = [sacchetto] ●● · 1 decina e 2 unità"; al momento del prestito, "[sacchetto] = 10 unità · 1 decina aperta".

## Le attività "Addizioni", "Sottrazioni" e "Moltiplicazioni"

Hanno la stessa struttura delle divisioni: prima **con gli oggetti**, poi **calcola** con l'operazione scritta, oppure le due modalità **alternate**. Nelle ciotole il cibo è sempre in righe da 5. Per i risultati fino a 10 si risponde con una fila di tasti; oltre, con un tastierino (cifre, cancella, OK), perché una fila di 21 tasti sarebbe troppo da guardare.

**Addizioni.** "Il gattino ha 7 pesci. Dagli altri 2 pesci: toccali uno alla volta." Il ragazzo tocca i pesci in arrivo, che vanno nella ciotola, poi dice quanti sono in tutto. In "Calcola" il disegno di aiuto mostra i due gruppi separati da "+".

**Sottrazioni.** "Il coniglietto ha 5 carote. Ne mangia 4: tocca 4 carote." Le carote toccate diventano trasparenti ma restano al loro posto, come quando si cancella sul quaderno: si vede quanto c'era e quanto resta. Il risultato non è mai 0, un caso che conviene introdurre più avanti.

**Moltiplicazioni.** In "Gruppi uguali": "Ci sono 4 scoiattoli. Dai 3 ghiande a ogni scoiattolo." Una ciotola piena non accetta altro. Se il ragazzo sbaglia il totale, il suggerimento propone di contare a salti ("3, 6, 9..."), e nel riquadro finale compare l'addizione ripetuta sopra la moltiplicazione: `3 + 3 + 3 + 3 = 12`, poi `3 × 4 = 12`. In "Tabelline" l'aiuto non è la tabellina già risolta, che si copierebbe e basta, ma la fila dei salti da contare: "Conta 4 salti di 3: 3 · 6 · 9 · 12 · ...".

Convenzione di scrittura: `3 × 4` è "3 preso 4 volte" (`3 + 3 + 3 + 3`), cioè 4 gruppi da 3. Conviene verificare che sia la stessa usata dalle insegnanti.

## Addizioni, sottrazioni e moltiplicazioni in colonna

Funzionano come la divisione in colonna: quaderno a quadretti, la colonna su cui si lavora evidenziata in giallo, una domanda alla volta, risposta con il tastierino (o con la tastiera del computer). Sopra le colonne ci sono le sigle usate a scuola: **u** (unità), **da** (decine), **h** (centinaia), **k** (migliaia).

**Addizione.** Per ogni colonna, da destra: "Quanto fa 7 + 5?". Se il risultato non sta in un quadretto (12), "Scrivi sotto solo le unità" → 2, e l'1 sale in alto nella colonna dopo: è il riporto, e alla colonna successiva la domanda diventa "Quanto fa 8 + 5 + 1?".

**Sottrazione.** Con il prestito attivo, per ogni colonna il ragazzo decide prima "Puoi fare 3 − 7?": decidere è proprio ciò che si impara. Se non si può, preme "Chiedi il prestito": la cifra a sinistra viene barrata e il nuovo valore compare sopra, mentre quella della colonna riceve un 1 piccolo davanti (13). Se a sinistra c'è uno 0, il prestito arriva da più lontano e gli 0 diventano 9, come in 1003 − 7. Gli 0 all'inizio del risultato sono mostrati più chiari, perché non contano.

**Moltiplicazione.** "Quanto fa 7 × 4?", poi "+ il riporto" quando c'è, con il riporto scritto in alto sopra la cifra successiva. Con il moltiplicatore a due cifre la seconda riga comincia con un trattino nelle unità (convenzione da verificare con le insegnanti: alcune scuole scrivono 0 o lasciano vuoto) e alla fine si sommano le due righe, colonna per colonna.

## L'attività "Divisioni"

**Distribuisci.** Il ragazzo divide del cibo tra alcuni animali, per esempio "Dividi 12 pesci tra 3 gattini", toccando un animale alla volta per dargli un pezzo. Il programma non permette di darne di più a uno prima degli altri: le ciotole che aspettano vengono evidenziate. Alla fine il ragazzo risponde a "Quanti pesci ha ogni gattino?" e, se c'è il resto, a "Quanti pesci sono avanzati?". È la divisione come ripartizione in parti uguali, l'approccio più concreto, presentata come una situazione di condivisione equa.

I temi disponibili sono gattini e pesci, cagnolini e ossi, coniglietti e carote, scoiattoli e ghiande, oppure i semplici pallini e scatole. Con l'impostazione "Animali" il tema viene scelto a caso all'inizio della sessione e resta lo stesso fino alla fine, per non introdurre cambiamenti imprevisti durante il lavoro.

**Calcola.** Compare l'operazione scritta, per esempio `12 : 3 = ?`, e si risponde con i bottoni numerici. Il disegno di aiuto (scatole già riempite) si può mostrare sempre, su richiesta o mai. Se è attivo "su richiesta", compare comunque dopo due tentativi sbagliati.

**Alterna.** Un esercizio "Distribuisci" e uno "Calcola", in alternanza.

## L'attività "Divisioni in colonna"

La divisione è scritta su un foglio a quadretti, con ogni cifra nel suo quadretto, ed è disposta come sul quaderno: il dividendo a sinistra, il divisore a destra oltre la linea verticale, il risultato sotto il divisore. Il programma guida il procedimento un passo alla volta, con una sola domanda per volta:

1. "Il 4 sta nell'1?" Si risponde Sì o No. Se la risposta è No, si prende anche la cifra successiva.
2. "Quante volte il 4 sta nel 15?" La cifra va nel risultato.
3. "Quanto fa 3 × 4?" Il prodotto si scrive sotto, con il segno meno e la riga.
4. "Quanto fa 15 − 12?" Si scrive quanto avanza.
5. "Abbassa il 6." Si preme il bottone, la cifra scende accanto al resto e si ricomincia dal punto 2.

Se dopo aver abbassato una cifra il divisore non ci sta, si scrive 0 nel risultato e si abbassa la cifra successiva, come si fa a scuola.

Il numero su cui si sta lavorando è sempre evidenziato. Le cifre abbassate sono colorate e, nel dividendo, una freccina segna quelle già usate. Le risposte si scrivono con una tastiera numerica sullo schermo (cifre, cancella, OK) oppure con la tastiera del computer: cifre, Backspace e Invio; S e N per rispondere Sì o No; Invio per abbassare la cifra e per andare avanti.

Gli errori ricevono un suggerimento mirato. Se la risposta a "quante volte" è troppo grande compare "Troppo: 9 × 3 = 27, che è più di 26"; se è troppo piccola, compare quanto avanza e che basta per un altro divisore. La tabellina del divisore può essere sempre visibile, comparire dopo il primo errore oppure mai.

Con il **metodo breve** il prodotto non viene scritto: si chiede direttamente quanto avanza, come si fa negli anni successivi.

## Scelte di progettazione

Il programma segue alcuni principi pensati per i ragazzi nello spettro autistico:

- Struttura sempre uguale: consegna in alto, materiale al centro, risposta in basso, e "Esercizio 2 di 5" per sapere quanto manca.
- Niente timer, niente animazioni lampeggianti e nessun passaggio automatico: si va avanti solo premendo "Avanti".
- Colori vivaci ma con un ruolo fisso: blu per ciò che si tocca, arancione per gli oggetti da contare, giallo evidenziatore per il numero su cui si lavora, verde per la risposta giusta. Per chi è sensibile agli stimoli visivi c'è la tavolozza "tenui". I suoni sono disattivati di default.
- Gli errori non vengono segnalati con il rosso o con una X. Il numero sbagliato si spegne e compare un suggerimento concreto ("Conta i pallini dentro una scatola"), così il ragazzo non ripete lo stesso tentativo.
- Il feedback positivo è sempre lo stesso ("Esatto!") e ripete l'operazione completa, per renderlo prevedibile.
- Le consegne hanno una frase per idea: prima *che cosa* fare (in evidenza), poi *come*.
- Nelle ciotole il cibo è sempre disposto in righe da 5, come nelle griglie da dieci usate a scuola: 7 si legge "5 e 2" a colpo d'occhio. Tutte le ciotole hanno la stessa larghezza, piene o vuote.
- Le risposte si danno con bottoni grandi; chi preferisce può usare la tastiera del computer.

## Immagini

Gli animali e le mascotte (orsetto, ranocchia, riccio, volpe e gufo) sono in pixel art, generati con [PixelLab](https://www.pixellab.ai/) e salvati come PNG nella cartella `img/`. Il programma non contatta PixelLab né altri servizi: le immagini sono file normali, quindi tutto continua a funzionare offline e non serve alcuna chiave API. Le immagini del cibo sono state ritagliate a 25×25 pixel e vengono mostrate al doppio della dimensione (a grandezza naturale sui telefoni, dove gli schermi sono più densi). Gli animali (64×64) sono mostrati a 128 o 64 pixel, e anche gli sfondi (320×192) vengono ingranditi di un numero intero di volte. Si usano sempre multipli esatti con `image-rendering: pixelated`, così i pixel restano nitidi.

Ogni schermata ha uno sfondo in pixel art: colline per il menu, una spiaggia per le addizioni, uno stagno per le sottrazioni, un orto per le moltiplicazioni, un prato per le divisioni, un bosco al tramonto per le divisioni in colonna. Il lavoro sta sempre su un pannello chiaro al centro, così lo sfondo resta ai margini e non disturba. Gli sfondi si possono spegnere dalle impostazioni e si spengono da soli con i colori tenui o con l'alto contrasto, perché in quei casi l'obiettivo è ridurre gli stimoli visivi.

Per aggiungere nuovi temi basta mettere in `img/` un animale e un cibo con lo stesso nome usato in `TEMI` dentro `js/comune.js`: compaiono in tutte le attività.

## Test automatici

`tests/esegui.js` è un "alunno automatico" che usa l'app su cinque dispositivi simulati: computer con Chrome, computer con Safari (WebKit, lo stesso motore), iPhone, iPad e telefono Android. Naviga tra le aree del menu, fa addizioni, sottrazioni e moltiplicazioni con gli oggetti e in colonna (con riporto, prestito anche a cascata, moltiplicatore a due cifre), tutti i temi delle divisioni con gli oggetti e le divisioni in colonna con impostazioni diverse, sbaglia apposta per provare i suggerimenti, usa anche solo la tastiera e controlla che la pagina non esca mai dai bordi dello schermo. `tests/pwa.js` controlla che la web app sia installabile e funzioni senza rete.

I test girano da soli su GitHub a ogni pull request (`.github/workflows/verifica.yml`): se qualcosa non va, si vede prima che la modifica vada online. Per lanciarli sul proprio computer servono Node.js e Python 3:

```
npm install
npx playwright install chromium webkit
npm test
```

### Prova su un dispositivo vero (5 minuti)

I test automatici simulano i dispositivi ma non li sostituiscono del tutto. Quando si cambia qualcosa di importante, conviene provare su almeno un iMac e un tablet:

1. Aprire l'indirizzo: compaiono il menu, la volpe, il gufo e lo sfondo con le colline.
2. Divisioni: distribuire il cibo toccando gli animali, rispondere una volta sbagliato e una giusto.
3. Divisioni in colonna: fare un esercizio intero; sul computer provare anche a scrivere con la tastiera.
4. Impostazioni (ingranaggio, poi scrivere DOCENTE): attivare la lettura vocale e controllare che la voce sia italiana.
5. Staccare il Wi-Fi e ricaricare: l'app deve funzionare lo stesso.

## Struttura dei file

```
index.html                  pagina principale
manifest.webmanifest        nome, icona e colori della web app installabile
sw.js                       service worker: funzionamento senza rete
tools/prepara_sito.py       prepara la cartella da pubblicare (_site)
tests/                      test automatici (alunno automatico, web app offline)
.github/workflows/          pubblicazione su GitHub Pages e test a ogni pull request
img/                        immagini in pixel art (animali, cibo, mascotte)
css/stile.css               aspetto grafico (colori, dimensioni, alto contrasto)
js/app.js                   nucleo: menu, impostazioni, voce, suoni, tastiera, sfondi
js/comune.js                parti comuni: temi, ciotole, risposte, svolgimento della sessione
js/quaderno.js              quaderno a quadretti e passi guidati delle operazioni in colonna
js/aree.js                  le quattro aree del menu (una per operazione)
js/attivita/addizioni.js                 area 1, con gli oggetti
js/attivita/addizioni-colonna.js         area 1, in colonna
js/attivita/sottrazioni.js               area 2, con gli oggetti
js/attivita/sottrazioni-colonna.js       area 2, in colonna
js/attivita/moltiplicazioni.js           area 3, con gli oggetti
js/attivita/moltiplicazioni-colonna.js   area 3, in colonna
js/attivita/divisioni.js                 area 4, con gli oggetti
js/attivita/colonna.js                   area 4, in colonna
```

## Aggiungere una nuova attività

1. Creare un file in `js/attivita/`, per esempio `frazioni.js`. Il modello più semplice da copiare è `addizioni.js`, che usa le parti comuni di `js/comune.js` (temi, ciotole, risposte, sessione).
2. Registrare l'attività:

```js
Impariamo.registra({
  id: 'frazioni',                 // identificativo unico (usato anche per salvare le impostazioni)
  area: 'divisioni',              // area del menu in cui compare (vedi js/aree.js);
  etichetta: 'Con le frazioni',   // nome della scheda dentro l'area
                                  // senza area, l'attività compare direttamente nel menu
  titolo: 'Frazioni',
  icona: '½',                     // oppure immagine: 'img/...png' (diventa anche la mascotte)
  colore: '#13814a',              // colore della scheda nel menu e del fumetto
  sfondo: 'img/sfondo-....png',   // sfondo illustrato durante l'attività (facoltativo)
  descrizione: 'Parti di un intero',
  impostazioni: [                 // compaiono da sole nella schermata Impostazioni
    { chiave: 'max', etichetta: 'Numero massimo', predefinito: 5,
      opzioni: [{ valore: 5, testo: '5' }, { valore: 10, testo: '10' }] }
  ],
  avvia: function (area, opz, api) {
    // area: elemento in cui disegnare l'attività
    // opz:  impostazioni correnti, per esempio opz.max
    // api:  el(), consegna(testo o [cosa, come]), messaggio(), avanzamento(totale),
    //       esito(contenitore, scritta, ultimo, alAvanti), parla(testo),
    //       suono('giusto'|'riprova'), tastiera(function (tasto) { ... return true se usato }),
    //       fine({ totale, alPrimoTentativo })
  }
});
```

3. Aggiungere in `index.html`, prima di `Impariamo.avvia()`:

```html
<script src="js/attivita/frazioni.js"></script>
```

L'attività comparirà automaticamente nel menu.
