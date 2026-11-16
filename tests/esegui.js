/*
 * Test automatici di "Impariamo insieme".
 *
 *   node tests/esegui.js
 *
 * Un "alunno automatico" usa l'app su più dispositivi simulati: computer con
 * Chrome e con Safari (WebKit), iPhone, iPad e telefono Android. Fa addizioni,
 * sottrazioni, moltiplicazioni, divisioni (tutti i temi) e divisioni in colonna
 * con impostazioni diverse, sbaglia apposta per provare i suggerimenti, usa anche solo la tastiera,
 * e controlla che la pagina non esca mai dai bordi dello schermo.
 *
 * Richiede Playwright (npm install playwright). Se un browser non è installato,
 * i suoi profili vengono saltati; con RICHIEDI_TUTTI=1 (su GitHub) è un errore.
 */
'use strict';
const path = require('path');
const { chromium, webkit, devices } = require('playwright');

const PAGINA = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHIAVE = 'impariamo.impostazioni.v1';

const PROFILI = [
  { nome: 'Computer, Chrome', motore: chromium, contesto: { viewport: { width: 1280, height: 800 } }, tastiera: true },
  { nome: 'Computer, Safari (WebKit)', motore: webkit, contesto: { viewport: { width: 1280, height: 800 } }, tastiera: true },
  { nome: 'iPhone', motore: webkit, contesto: devices['iPhone 13'] },
  { nome: 'iPad', motore: webkit, contesto: devices['iPad (gen 7)'] },
  { nome: 'Telefono Android', motore: chromium, contesto: devices['Pixel 7'] }
];

let errori = 0;
function verifica(condizione, descrizione) {
  if (!condizione) { errori++; console.log('    ERRORE: ' + descrizione); }
}

/* ---------- Strumenti ---------- */

async function apri(browser, profilo, impostazioni) {
  const contesto = await browser.newContext(profilo.contesto);
  const pagina = await contesto.newPage();
  pagina.erroriJs = [];
  pagina.on('pageerror', e => pagina.erroriJs.push(e.message));
  pagina.on('requestfailed', r => {
    // Aperta da file (file://), Safari/WebKit non carica il manifest della web app:
    // è previsto e innocuo, perché il manifest serve solo quando l'app è pubblicata
    // su un sito, e lì lo controlla tests/pwa.js. Ogni altro file mancante è un errore.
    if (r.url().startsWith('file:') && r.url().endsWith('/manifest.webmanifest')) return;
    pagina.erroriJs.push('file non caricato: ' + r.url());
  });
  await pagina.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [CHIAVE, JSON.stringify(impostazioni || {})]);
  await pagina.goto(PAGINA);
  // Sui dispositivi touch si tocca, sugli altri si clicca
  pagina.premi = profilo.contesto.hasTouch ? (sel) => pagina.locator(sel).first().tap() : (sel) => pagina.locator(sel).first().click();
  return pagina;
}

async function chiudi(pagina, cosa) {
  verifica(pagina.erroriJs.length === 0, cosa + ': errori nella pagina: ' + pagina.erroriJs.join(' | '));
  await pagina.context().close();
}

async function controllaBordi(pagina, momento) {
  const misure = await pagina.evaluate(() => ({ pagina: document.documentElement.scrollWidth, schermo: window.innerWidth }));
  verifica(misure.pagina <= misure.schermo + 1,
    momento + ': la pagina esce dallo schermo (' + misure.pagina + ' px su ' + misure.schermo + ')');
}

// Dal menu: tocca l'area (0 addizioni, 1 sottrazioni, 2 moltiplicazioni, 3 divisioni),
// poi l'attività ("Con gli oggetti" o "In colonna")
async function entra(p, area, attivita) {
  await p.premi('.scheda-attivita >> nth=' + area);
  await p.premi('.scheda-attivita:has-text("' + attivita + '")');
}

const consegna = (p) => p.locator('.consegna').first().textContent().then(t => t.replace(/\s+/g, ' ').trim());

/* ---------- Risposte ---------- */

// Scrive un numero nella risposta aperta: fila di tasti o tastierino (risultati oltre il 10),
// con la tastiera fisica se il profilo ce l'ha. Restituisce true se è stato accettato.
async function scrivi(p, valore, profilo) {
  const h = await p.locator('.risposta:not(.conclusa)').last().elementHandle();
  const tastierino = await h.evaluate(n => n.classList.contains('risposta-tastierino'));
  const tocca = (b) => profilo.contesto.hasTouch ? b.tap() : b.click();
  if (profilo.tastiera) {
    for (const c of String(valore)) await p.keyboard.press(c);
    if (tastierino) await p.keyboard.press('Enter');
    else await p.waitForTimeout(900); // dopo "1" l'app aspetta un attimo un eventuale "0" (per il 10)
  } else if (tastierino) {
    for (const c of String(valore)) await tocca(await tastoConTesto(h, c));
    await tocca(await h.$('.tasto-ok'));
  } else {
    await tocca(await tastoConTesto(h, String(valore)));
  }
  return h.evaluate(n => n.classList.contains('conclusa'));
}

async function tastoConTesto(h, testo) {
  for (const b of await h.$$('.tasto')) if ((await b.textContent()) === testo) return b;
  throw new Error('tasto ' + testo + ' non trovato');
}

// Dà una risposta sbagliata (vicina a quella giusta, tra i tasti ancora disponibili)
async function sbaglia(p, giusto, profilo) {
  const h = await p.locator('.risposta:not(.conclusa)').last().elementHandle();
  const disponibili = await h.evaluate(n => n.classList.contains('risposta-tastierino') ? null :
    Array.prototype.filter.call(n.querySelectorAll('.tasto'), b => !b.disabled).map(b => Number(b.textContent)));
  // Il numero sbagliato più vicino a quello giusto tra i tasti ancora disponibili
  // (con il tastierino qualsiasi numero va bene)
  const sbagliato = disponibili
    ? disponibili.filter(v => v !== giusto).sort((x, y) => Math.abs(x - giusto) - Math.abs(y - giusto))[0]
    : giusto + 1;
  verifica(!(await scrivi(p, sbagliato, profilo)), 'la risposta sbagliata ' + sbagliato + ' è stata accettata');
}

async function rispondi(p, valore, profilo, cosa) {
  verifica(await scrivi(p, valore, profilo), cosa + ': risposta giusta ' + valore + ' non accettata');
}

async function righeDa5(p, cosa) {
  const colonne = await p.evaluate(() => getComputedStyle(document.querySelector('.scatola-pallini')).gridTemplateColumns.split(' ').length);
  verifica(colonne === 5, cosa + ': il contenuto delle ciotole non è in righe da 5 (' + colonne + ')');
}

async function fineSessione(p, cosa) {
  verifica(await p.locator('.fine').count() === 1, cosa + ': la sessione non arriva a "Finito!"');
  verifica(!(await p.textContent('.fine')).includes('primo tentativo'), cosa + ': il resoconto per il docente è visibile al ragazzo');
  await controllaBordi(p, cosa + ', fine');
  await chiudi(p, cosa);
}

/* ---------- Addizioni ---------- */

async function addizioni(browser, profilo, tema, sommaMax) {
  const cosa = 'Addizioni ' + tema + ' fino a ' + sommaMax;
  const p = await apri(browser, profilo, { addizioni: { tema, sommaMax, modalita: 'alterna', numeroEsercizi: 3, aiuto: 'richiesta' } });
  await entra(p, 0, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.mucchio-tocca').count()) {
      while (await p.locator('.mucchio-tocca .pezzo').count()) await p.premi('.mucchio-tocca .pezzo');
      await righeDa5(p, cosa);
      await controllaBordi(p, cosa);
      const somma = await p.locator('.scatola-pallini > *').count();
      await sbaglia(p, somma, profilo);
      verifica((await p.textContent('.messaggio')).includes('Conta'), cosa + ': manca il suggerimento');
      await rispondi(p, somma, profilo, cosa);
    } else {
      const [a, b] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      await sbaglia(p, a + b, profilo);
      await sbaglia(p, a + b, profilo);
      verifica(await p.locator('.figura').count() === 1, cosa + ': dopo due errori non compare il disegno');
      await rispondi(p, a + b, profilo, cosa);
    }
    const [a, b, r] = (await p.textContent('.esito .operazione')).match(/\d+/g).map(Number);
    verifica(a + b === r, cosa + ': esito sbagliato');
    await p.premi('.esito button');
  }
  await fineSessione(p, cosa);
}

/* ---------- Sottrazioni ---------- */

async function sottrazioni(browser, profilo, tema, numeroMax) {
  const cosa = 'Sottrazioni ' + tema + ' da ' + numeroMax;
  const p = await apri(browser, profilo, { sottrazioni: { tema, numeroMax, modalita: 'alterna', numeroEsercizi: 3, aiuto: 'richiesta' } });
  await entra(p, 1, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.pezzo').count()) {
      const a = await p.locator('.pezzo').count();
      const b = Number((await consegna(p)).match(/tocca (\d+)/)[1]);
      for (let i = 0; i < b; i++) await p.premi('.pezzo:not(.tolto)');
      verifica(await p.locator('.pezzo:not([disabled])').count() === 0, cosa + ': dopo aver tolto si possono togliere altri pezzi');
      await righeDa5(p, cosa);
      await controllaBordi(p, cosa);
      await sbaglia(p, a - b, profilo);
      verifica((await p.textContent('.messaggio')).includes('Conta solo'), cosa + ': manca il suggerimento');
      await rispondi(p, a - b, profilo, cosa);
    } else {
      const [a, b] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      await sbaglia(p, a - b, profilo);
      await sbaglia(p, a - b, profilo);
      verifica(await p.locator('.figura .tolto').count() === b, cosa + ': il disegno non mostra ' + b + ' oggetti tolti');
      await rispondi(p, a - b, profilo, cosa);
    }
    const [a, b, r] = (await p.textContent('.esito .operazione')).match(/\d+/g).map(Number);
    verifica(a - b === r, cosa + ': esito sbagliato');
    await p.premi('.esito button');
  }
  await fineSessione(p, cosa);
}

/* ---------- Moltiplicazioni ---------- */

async function moltiplicazioni(browser, profilo, tema, tabellina) {
  const cosa = 'Moltiplicazioni ' + tema + ' tabellina ' + tabellina;
  const p = await apri(browser, profilo, { moltiplicazioni: { tema, tabellina, modalita: 'alterna', numeroEsercizi: 3, aiuto: 'richiesta' } });
  await entra(p, 2, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.scatola:not(.statica)').count()) {
      const n = Number((await consegna(p)).match(/(?:Dai|Metti) (\d+)/)[1]);
      const volte = await p.locator('.scatola').count();
      for (let c = 0; c < volte; c++) for (let i = 0; i < n; i++) await p.premi('.scatola >> nth=' + c);
      verifica(await p.locator('.scatola:not([disabled])').count() === 0, cosa + ': una ciotola piena accetta ancora cibo');
      await righeDa5(p, cosa);
      await controllaBordi(p, cosa);
      await sbaglia(p, n * volte, profilo);
      verifica((await p.textContent('.messaggio')).includes('salti'), cosa + ': manca il suggerimento');
      await rispondi(p, n * volte, profilo, cosa);
      const ponte = await p.textContent('.esito .operazione-ponte');
      verifica(ponte === Array(volte).fill(n).join(' + ') + ' = ' + n * volte, cosa + ': addizione ripetuta sbagliata ' + ponte);
    } else {
      const [n, volte] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      await sbaglia(p, n * volte, profilo);
      await sbaglia(p, n * volte, profilo);
      verifica(await p.locator('.salti .salto').count() === 10, cosa + ': dopo due errori non compaiono i salti');
      await rispondi(p, n * volte, profilo, cosa);
    }
    const [a, b, r] = (await p.textContent('.esito .operazione')).match(/\d+/g).map(Number);
    verifica(a * b === r, cosa + ': esito sbagliato');
    await p.premi('.esito button');
  }
  await fineSessione(p, cosa);
}

/* ---------- Divisioni con gli oggetti ---------- */

async function divisioni(browser, profilo, tema) {
  const cosa = 'Divisioni ' + tema;
  const p = await apri(browser, profilo, {
    divisioni: { tema, modalita: 'alterna', conResto: true, numeroEsercizi: 3, divisoreMax: 5, quozienteMax: 10 }
  });
  await entra(p, 3, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.scatola:not(.statica)').count()) {
      // Distribuisci: prima un tocco "sbagliato" (due volte la stessa ciotola), poi a turno
      const d = await p.locator('.scatola').count();
      await p.premi('.scatola >> nth=0');
      await p.premi('.scatola >> nth=0');
      verifica((await p.textContent('.messaggio')).startsWith('Prima '), cosa + ': manca l\'avviso sulle ciotole con meno oggetti');
      for (let k = 1; !(await p.locator('.domanda').count()); k++) await p.premi('.scatola >> nth=' + (k % d));
      await controllaBordi(p, cosa + ', dopo la distribuzione');
      await righeDa5(p, cosa);
      const q = await p.locator('.scatola-pallini >> nth=0').locator('> *').count();
      const r = await p.locator('.mucchio > *').count();
      await rispondi(p, q, profilo, cosa);
      if (r > 0) await rispondi(p, r, profilo, cosa);
    } else {
      // Calcola: due errori fanno comparire il disegno
      const [a, d] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      const q = Math.floor(a / d), r = a % d;
      await sbaglia(p, q, profilo);
      await sbaglia(p, q, profilo);
      verifica(await p.locator('.figura').count() === 1, cosa + ': dopo due errori non compare il disegno');
      await rispondi(p, q, profilo, cosa);
      if (r) await rispondi(p, r, profilo, cosa);
    }
    const scritta = await p.textContent('.esito .operazione');
    const [a, d] = scritta.match(/\d+/g).map(Number);
    verifica(scritta === `${a} : ${d} = ${Math.floor(a / d)}` + (a % d ? ` resto ${a % d}` : ''), cosa + ': esito sbagliato ' + scritta);
    await p.premi('.esito button');
  }
  await fineSessione(p, cosa);
}

/* ---------- Divisioni in colonna ---------- */

async function colonna(browser, profilo, imp, usaTastiera) {
  const p = await apri(browser, profilo, { colonna: Object.assign({ numeroEsercizi: 2, tabellina: 'errore' }, imp) });
  await entra(p, 3, 'In colonna');
  const nome = 'colonna ' + JSON.stringify(imp) + (usaTastiera ? ' (tastiera)' : '');
  const scrivi = async (v) => {
    if (usaTastiera) { for (const c of String(v)) await p.keyboard.press(c); await p.keyboard.press('Enter'); }
    else { for (const c of String(v)) await p.premi(`.tastiera-numerica .tasto:text-is("${c}")`); await p.premi('.tasto-ok'); }
  };
  let sbaglia = true, controllatoBordo = false;
  for (let passi = 0; passi < 300; passi++) {
    if (await p.locator('.fine').count()) break;
    const t = await consegna(p);
    let m;
    if (t.startsWith('Hai finito')) {
      const scritta = await p.textContent('.esito .operazione');
      const [a, d] = scritta.match(/\d+/g).map(Number);
      verifica(scritta === `${a} : ${d} = ${Math.floor(a / d)}` + (a % d ? ` resto ${a % d}` : ''), nome + ': esito sbagliato ' + scritta);
      if (usaTastiera) await p.keyboard.press('Enter'); else await p.premi('.esito button');
    } else if ((m = t.match(/^Quante volte (?:il |l')(\d+) sta (?:nel |nell')(\d+)\?/))) {
      const q = Math.floor(m[2] / m[1]);
      if (sbaglia) {
        await scrivi(q === 9 ? 8 : q + 1);
        verifica(/^(Troppo|Ci sta ancora)/.test(await p.textContent('.messaggio')), nome + ': manca il suggerimento');
        sbaglia = false;
      }
      await scrivi(q);
      if (!controllatoBordo) {
        // Il quaderno deve stare tutto nello schermo
        const fuori = await p.evaluate(() => document.querySelector('.colonna-lavagna').getBoundingClientRect().right - window.innerWidth);
        verifica(fuori <= 1, nome + ': il quaderno esce dallo schermo di ' + Math.round(fuori) + ' px');
        await controllaBordi(p, nome);
        controllatoBordo = true;
      }
    } else if ((m = t.match(/^(?:Il |L')(\d+) sta (?:nel |nell')(\d+)\?/))) {
      const si = +m[2] >= +m[1];
      if (usaTastiera) await p.keyboard.press(si ? 's' : 'n');
      else await p.premi(`.colonna-comandi button:text-is("${si ? 'Sì' : 'No'}")`);
    } else if ((m = t.match(/^Quanto fa (\d+) × (\d+)\?/))) await scrivi(m[1] * m[2]);
    else if ((m = t.match(/^Quanto fa (\d+) − (\d+)\?/))) await scrivi(m[1] - m[2]);
    else if ((m = t.match(/^Quanto avanza\? Fai (\d+) − (\d+) × (\d+)/))) await scrivi(m[1] - m[2] * m[3]);
    else if (t.startsWith('Abbassa')) {
      if (usaTastiera) await p.keyboard.press('Enter'); else await p.premi('.colonna-comandi button');
    } else { verifica(false, nome + ': consegna sconosciuta "' + t + '"'); break; }
  }
  verifica(await p.locator('.fine').count() === 1, nome + ': la sessione non arriva a "Finito!"');
  await chiudi(p, nome);
}

/* ---------- Addizioni, sottrazioni e moltiplicazioni in colonna ---------- */

async function operazioneInColonna(browser, profilo, area, id, imp, usaTastiera) {
  const nome = id + ' ' + JSON.stringify(imp) + (usaTastiera ? ' (tastiera)' : '');
  const conf = {}; conf[id] = Object.assign({ numeroEsercizi: 2 }, imp);
  const p = await apri(browser, profilo, conf);
  await entra(p, area, 'In colonna');
  const tastiera = Object.assign({}, profilo, { tastiera: usaTastiera });
  const bottone = async (testo) => {
    if (usaTastiera) await p.keyboard.press(testo === 'Sì' ? 's' : testo === 'No' ? 'n' : 'Enter');
    else await p.premi(testo ? `.colonna-comandi button:text-is("${testo}")` : '.colonna-comandi button');
  };
  let sbaglia1 = true, controllato = false;
  const numero = async (v) => {
    if (sbaglia1) { await sbaglia(p, v, tastiera); sbaglia1 = false; }
    await rispondi(p, v, tastiera, nome);
  };
  for (let passi = 0; passi < 400; passi++) {
    if (await p.locator('.fine').count()) break;
    const t = await consegna(p);
    let m;
    if (!controllato && await p.locator('.quaderno').count()) {
      const fuori = await p.evaluate(() => document.querySelector('.quaderno').getBoundingClientRect().right - window.innerWidth);
      verifica(fuori <= 1, nome + ': il quaderno esce dallo schermo di ' + Math.round(fuori) + ' px');
      await controllaBordi(p, nome);
      controllato = true;
    }
    if (t.startsWith('Hai finito')) {
      const scritta = await p.textContent('.esito .operazione');
      const [a, b, r] = scritta.match(/\d+/g).map(Number);
      const giusto = id.startsWith('addizioni') ? a + b : id.startsWith('sottrazioni') ? a - b : a * b;
      verifica(r === giusto, nome + ': esito sbagliato ' + scritta);
      if (usaTastiera) await p.keyboard.press('Enter'); else await p.premi('.esito button');
      sbaglia1 = true;
    } else if ((m = t.match(/^Quale cifra scrivi sotto\? (\d+) non sta/))) await numero(Number(m[1]) % 10);
    else if ((m = t.match(/^Puoi fare (\d+) − (\d+)\?/))) await bottone(+m[1] >= +m[2] ? 'Sì' : 'No');
    else if (/Chiedi un prestito/.test(t)) {
      const prima = await p.locator('.cella.barrata').count();
      await bottone('Chiedi il prestito');
      verifica(await p.locator('.cella.barrata').count() > prima, nome + ': il prestito non barra nessuna cifra');
    } else if (/^Nella colonna delle unità c'è solo/.test(t)) await bottone(null);
    else if ((m = t.match(/^Quanto fa ([\d +×−]+)\?/))) {
      const espr = m[1].replace(/×/g, '*').replace(/−/g, '-');
      await numero(Function('return ' + espr)()); // es. "7 × 4 + 2"
    } else { verifica(false, nome + ': consegna sconosciuta "' + t + '"'); break; }
  }
  verifica(await p.locator('.fine').count() === 1, nome + ': la sessione non arriva a "Finito!"');
  await chiudi(p, nome);
}

/* ---------- Menu, impostazioni, aspetto ---------- */

async function menuEImpostazioni(browser, profilo) {
  const p = await apri(browser, profilo, {});
  await controllaBordi(p, 'menu');
  const titoli = await p.locator('.scheda-titolo').allTextContents();
  verifica(titoli.join('|') === 'Addizioni|Sottrazioni|Moltiplicazioni|Divisioni',
    'il menu non mostra le quattro aree del percorso: ' + titoli.join(', '));
  // Dentro ogni area: "Con gli oggetti" e "In colonna"; il pulsante in alto risale di un livello
  for (let a = 0; a < 4; a++) {
    await p.premi('.scheda-attivita >> nth=' + a);
    const dentro = await p.locator('.scheda-titolo').allTextContents();
    verifica(dentro.join('|') === 'Con gli oggetti|In colonna', 'area ' + titoli[a] + ': ' + dentro.join(', '));
    await controllaBordi(p, 'area ' + titoli[a]);
    await p.premi('#btn-menu');
  }
  verifica((await p.textContent('#titolo')) === 'Impariamo insieme', 'il pulsante in alto non riporta al menu');
  const sfondo = await p.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
  verifica(/sfondo-menu\.png/.test(sfondo), 'manca lo sfondo del menu');
  // Ingranaggio: un clic apre l'area docente, che chiede la parola DOCENTE
  await p.premi('#btn-impostazioni');
  verifica((await p.textContent('#titolo')) === 'Area docente', 'il clic sull\'ingranaggio non apre l\'area docente');
  await controllaBordi(p, 'area docente');
  await p.fill('#parola-docente', 'ciao');
  await p.press('#parola-docente', 'Enter');
  verifica((await p.textContent('#titolo')) === 'Area docente', 'una parola sbagliata apre le impostazioni');
  verifica((await p.textContent('.accesso-docente .messaggio')).includes('non è giusta'), 'manca l\'avviso per la parola sbagliata');
  await p.fill('#parola-docente', ' Docente ');
  await p.premi('.accesso-docente button[type=submit]');
  verifica((await p.textContent('#titolo')) === 'Impostazioni', 'la parola DOCENTE non apre le impostazioni');
  verifica((await p.textContent('.riepilogo-docente')).includes('Ultima sessione'), 'manca il resoconto per il docente');
  await controllaBordi(p, 'impostazioni');
  // Colori tenui: niente sfondo
  await p.locator('.scelta', { hasText: 'Tenui' }).click();
  const conSfondo = await p.evaluate(() => document.documentElement.classList.contains('con-sfondo'));
  verifica(!conSfondo, 'con i colori tenui lo sfondo resta acceso');
  await chiudi(p, 'Menu e impostazioni');
}

/* ---------- Esecuzione ---------- */

(async () => {
  const motori = new Map();
  for (const profilo of PROFILI) {
    let browser = motori.get(profilo.motore);
    if (browser === undefined) {
      try { browser = await profilo.motore.launch(); } catch (e) { browser = null; }
      motori.set(profilo.motore, browser);
    }
    if (!browser) {
      console.log('\n' + profilo.nome + ': SALTATO (browser non installato)');
      if (process.env.RICHIEDI_TUTTI) { errori++; console.log('    ERRORE: browser richiesto ma non disponibile'); }
      continue;
    }
    const prima = errori;
    console.log('\n' + profilo.nome);
    await menuEImpostazioni(browser, profilo);
    await addizioni(browser, profilo, 'conigli', 10);
    await addizioni(browser, profilo, 'pallini', 20);
    await sottrazioni(browser, profilo, 'scoiattoli', 10);
    await sottrazioni(browser, profilo, 'gatti', 20);
    await moltiplicazioni(browser, profilo, 'cani', 'fino5');
    await moltiplicazioni(browser, profilo, 'pallini', 7);
    for (const tema of ['gatti', 'cani', 'conigli', 'scoiattoli', 'pallini']) await divisioni(browser, profilo, tema);
    const combinazioni = [
      { cifreDividendo: 2, cifreDivisore: 1, conResto: false, sottrazioni: true },
      { cifreDividendo: 3, cifreDivisore: 1, conResto: true, sottrazioni: true },
      { cifreDividendo: 4, cifreDivisore: 1, conResto: true, sottrazioni: false },
      { cifreDividendo: 4, cifreDivisore: 2, conResto: true, sottrazioni: true }
    ];
    for (const imp of combinazioni) await colonna(browser, profilo, imp, false);
    await operazioneInColonna(browser, profilo, 0, 'addizioni-colonna', { cifre: 2, riporto: false }, false);
    await operazioneInColonna(browser, profilo, 0, 'addizioni-colonna', { cifre: 4, riporto: true }, !!profilo.tastiera);
    await operazioneInColonna(browser, profilo, 1, 'sottrazioni-colonna', { cifre: 2, prestito: false }, false);
    await operazioneInColonna(browser, profilo, 1, 'sottrazioni-colonna', { cifre: 4, prestito: true }, !!profilo.tastiera);
    await operazioneInColonna(browser, profilo, 2, 'moltiplicazioni-colonna', { cifre: 2, moltiplicatore: 1 }, false);
    await operazioneInColonna(browser, profilo, 2, 'moltiplicazioni-colonna', { cifre: 3, moltiplicatore: 2 }, !!profilo.tastiera);
    if (profilo.tastiera) await colonna(browser, profilo, combinazioni[3], true);
    console.log('    ' + (errori === prima ? 'tutto a posto' : (errori - prima) + ' errori'));
  }
  for (const b of motori.values()) if (b) await b.close();
  console.log(errori ? '\nRISULTATO: ' + errori + ' errori' : '\nRISULTATO: tutto a posto');
  process.exit(errori ? 1 : 0);
})();
