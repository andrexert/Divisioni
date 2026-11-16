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
  // Se il test fissa le impostazioni di un'attività, vale "Scelgo io" (non il percorso a livelli)
  const imp = JSON.parse(JSON.stringify(impostazioni || {}));
  // Animali, lunghezza, aiuto e guida valgono per tutte le attività: stanno tra le generali.
  // Di base si gioca con i gattini (la schermata di scelta ha un test suo).
  imp.generale = Object.assign({ tema: 'gatti' }, imp.generale || {});
  Object.keys(imp).forEach(k => {
    if (k === 'generale' || k === 'livelli') return;
    const a = imp[k];
    if (a.difficolta === undefined) a.difficolta = 'manuale';
    if (a.tema) imp.generale.tema = a.tema;
    if (a.aiuto) imp.generale.aiuto = a.aiuto;
    if (a.guida) imp.generale.guida = a.guida;
    if (a.numeroEsercizi) imp.generale.lunghezza = a.numeroEsercizi <= 3 ? 'breve' : a.numeroEsercizi <= 5 ? 'media' : 'lunga';
  });
  const livelli = imp.livelli; delete imp.livelli;
  await pagina.addInitScript(([k, v, l]) => {
    if (sessionStorage.getItem('test-pronto')) return;   // solo al primo caricamento
    sessionStorage.setItem('test-pronto', '1');
    localStorage.setItem(k, v);
    if (l) localStorage.setItem('impariamo.livelli.v1', l);
  }, [CHIAVE, JSON.stringify(imp), livelli ? JSON.stringify(livelli) : null]);
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

// Nella ciotola un sacchetto vale 10
async function contaCiotola(p, soloRimasti) {
  return p.evaluate((rimasti) => {
    const c = document.querySelector('.scatola-pallini');
    return 10 * c.querySelectorAll('.sacchetto').length +
      Array.prototype.filter.call(c.children, n => !n.classList.contains('sacchetto') && !(rimasti && n.classList.contains('tolto'))).length;
  }, !!soloRimasti);
}

// Mette nella ciotola tutti i pezzi in arrivo; arrivati a 10 fa il sacchetto
async function mettiTutto(p) {
  for (let i = 0; i < 40; i++) {
    if (await p.locator('button:has-text("Fai il sacchetto")').count()) await p.premi('button:has-text("Fai il sacchetto")');
    else if (await p.locator('.mucchio-tocca .pezzo:not([disabled])').count()) await p.premi('.mucchio-tocca .pezzo:not([disabled])');
    else break;
  }
}

async function addizioni(browser, profilo, tema, sommaMax) {
  const cosa = 'Addizioni ' + tema + ' fino a ' + sommaMax;
  const p = await apri(browser, profilo, { addizioni: { tema, sommaMax, modalita: 'alterna', numeroEsercizi: 3, aiuto: 'richiesta' } });
  await entra(p, 0, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.mucchio-tocca').count()) {
      await mettiTutto(p);
      await righeDa5(p, cosa);
      await controllaBordi(p, cosa);
      const somma = await contaCiotola(p);
      await sbaglia(p, somma, profilo);
      verifica(/conta/i.test(await p.textContent('.messaggio')), cosa + ': manca il suggerimento');
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
    if (await p.locator('.scatola .pezzo, .scatola .sacchetto').count()) {
      const a = Number((await consegna(p)).match(/(?:ha|ci sono) (\d+)/)[1]);
      const b = Number((await consegna(p)).match(/tocca (\d+)/)[1]);
      for (let i = 0; i < b; i++) {
        // Se i pezzi sciolti sono finiti si apre il sacchetto
        if (!(await p.locator('.pezzo:not(.tolto):not([disabled])').count())) await p.premi('button:has-text("Apri il sacchetto")');
        await p.premi('.pezzo:not(.tolto):not([disabled])');
      }
      verifica(await contaCiotola(p, true) === a - b, cosa + ': nella ciotola non restano ' + (a - b) + ' pezzi');
      verifica(await p.locator('.pezzo:not([disabled])').count() === 0, cosa + ': dopo aver tolto si possono togliere altri pezzi');
      await righeDa5(p, cosa);
      await controllaBordi(p, cosa);
      await sbaglia(p, a - b, profilo);
      verifica(/conta/i.test(await p.textContent('.messaggio')), cosa + ': manca il suggerimento');
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
    } else if (await p.locator('.mucchio-tocca').count()) {
      // Fare gruppi: si tocca il cibo finché le ciotole si riempiono
      while (await p.locator('.mucchio-tocca .pezzo:not([disabled])').count()) await p.premi('.mucchio-tocca .pezzo:not([disabled])');
      await righeDa5(p, cosa);
      const piene = await p.locator('.scatola.piena').count();
      const r = await p.locator('.mucchio-tocca .pezzo').count();
      await rispondi(p, piene, profilo, cosa);
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

// I due numeri scritti sul quaderno (righe 3 e 4: dopo le sigle e i riporti)
async function numeriQuaderno(p) {
  return p.evaluate(() => {
    const g = document.querySelector('.quaderno .colonna-griglia');
    const colonne = g.style.gridTemplateColumns.match(/repeat\((\d+)/)[1] * 1;
    const celle = Array.prototype.slice.call(g.children);
    const riga = (r) => Number(celle.slice(r * colonne + 1, (r + 1) * colonne).map(c => (c.classList.contains('barrata') ? c.textContent : c.textContent)).join('').replace(/\D/g, ''));
    return { a: riga(2), b: riga(3), colonne: colonne - 1 };
  });
}

// La cifra che il semiguidato si aspetta nel quadretto da scrivere
async function cifraAttesa(p, id, tutto) {
  const { a, b, colonne: W } = await numeriQuaderno(p);
  const pos = await p.evaluate(() => {
    const g = document.querySelector('.quaderno .colonna-griglia');
    const n = g.style.gridTemplateColumns.match(/repeat\((\d+)/)[1] * 1;
    const i = Array.prototype.indexOf.call(g.children, g.querySelector('.da-scrivere'));
    return { riga: Math.floor(i / n), col: i % n - 1 };
  });
  let numero, fine;
  if (id.startsWith('moltiplicazioni')) {
    const r = pos.riga - 4;
    numero = a * Math.floor(b / Math.pow(10, r) % 10);
    fine = W - 1 - r;
  } else {
    numero = id.startsWith('addizioni') ? a + b : a - b;
    fine = W - 1;
  }
  const quante = fine - pos.col;               // cifre a destra del quadretto
  const v = Math.floor(numero / Math.pow(10, quante));
  return tutto ? v : v % 10;
}

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
    if (/^Colonna (delle|dei) .*Scrivi (la cifra del risultato|il risultato di questa colonna)/.test(t) || /^Moltiplica le cifre evidenziate/.test(t)) {
      // Semiguidato: la cifra giusta si ricava dai numeri sul quaderno
      const v = await cifraAttesa(p, id, /risultato di questa colonna|tutto il risultato/.test(t));
      const accettata = await scrivi(p, v, tastiera);
      if (!accettata) {
        verifica(/prestito/.test(await p.textContent('.messaggio')), nome + ': manca l\'avviso "prima chiedi il prestito"');
        await bottone('Chiedi il prestito');
      }
    } else if (t.startsWith('Scrivi il risultato.')) {
      // Da solo: prima una cifra sbagliata (deve restare segnata), poi giusto
      const { a, b } = await numeriQuaderno(p);
      const ris = String(id.startsWith('addizioni') ? a + b : id.startsWith('sottrazioni') ? a - b : a * b);
      const cifre = ris.split('').reverse();
      cifre[cifre.length - 1] = String((Number(cifre[cifre.length - 1]) + 1) % 10);
      for (const c of cifre) await p.keyboard.press(c);
      await p.keyboard.press('Enter');
      verifica(await p.locator('.cella.sbagliata').count() === 1, nome + ': la cifra sbagliata non è segnata');
      await p.keyboard.press(ris.charAt(0));
      await p.keyboard.press('Enter');
    } else if (t.startsWith('Hai finito')) {
      const scritta = await p.textContent('.esito .operazione');
      const [a, b, r] = scritta.match(/\d+/g).map(Number);
      verifica((await p.textContent('.esito')).includes('Al contrario'), nome + ': manca la riga "Al contrario"');
      const giusto = id.startsWith('addizioni') ? a + b : id.startsWith('sottrazioni') ? a - b : a * b;
      verifica(r === giusto, nome + ': esito sbagliato ' + scritta);
      if (usaTastiera) await p.keyboard.press('Enter'); else await p.premi('.esito button');
      sbaglia1 = true;
    } else if ((m = t.match(/^Quale cifra scrivi sotto\? (\d+) non sta/))) {
      const testo = await p.textContent('.spiegazione-decine');
      const n = Number(m[1]);
      verifica(testo.includes(Math.floor(n / 10) + (n >= 20 ? ' decine' : ' decina')), nome + ': manca il disegno delle decine per ' + n);
      verifica(await p.locator('.spiegazione-decine .sacchetto').count() === Math.floor(n / 10), nome + ': i sacchetti non sono ' + Math.floor(n / 10));
      await numero(n % 10);
    }
    else if ((m = t.match(/^Puoi fare (\d+) − (\d+)\?/))) await bottone(+m[1] >= +m[2] ? 'Sì' : 'No');
    else if (/Chiedi un prestito/.test(t)) {
      const prima = await p.locator('.cella.barrata').count();
      await bottone('Chiedi il prestito');
      verifica(await p.locator('.cella.barrata').count() > prima, nome + ': il prestito non barra nessuna cifra');
      verifica((await p.textContent('.spiegazione-decine')).includes('10 unità'), nome + ': manca il disegno del sacchetto aperto');
    } else if (/^Nella colonna delle unità c'è solo/.test(t)) await bottone(null);
    else if ((m = t.match(/^Quanto fa ([\d +×−]+)\?/))) {
      const espr = m[1].replace(/×/g, '*').replace(/−/g, '-');
      await numero(Function('return ' + espr)()); // es. "7 × 4 + 2"
    } else { verifica(false, nome + ': consegna sconosciuta "' + t + '"'); break; }
  }
  verifica(await p.locator('.fine').count() === 1, nome + ': la sessione non arriva a "Finito!"');
  await chiudi(p, nome);
}

/* ---------- Percorso a livelli e sacchetti ---------- */

// Gioca una sessione intera di addizioni con gli oggetti, sempre giusto al primo tentativo
async function sessionePerfettaAddizioni(p) {
  for (let es = 0; es < 10 && !(await p.locator('.fine').count()); es++) {
    if (await p.locator('.mucchio-tocca').count()) {
      await mettiTutto(p);
      await scrivi(p, await contaCiotola(p), { contesto: {} });
    } else {
      const [a, b] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      await scrivi(p, a + b, { contesto: {} });
    }
    await p.click('.esito button');
  }
}

async function percorso(browser, profilo) {
  // 1. Senza impostazioni si parte dal livello 1: somme entro 5
  let p = await apri(browser, profilo, {});
  await entra(p, 0, 'Con gli oggetti');
  verifica((await p.textContent('.livello-attuale')) === 'Livello 1 di 5', 'percorso: non parte dal livello 1');
  verifica(/ha [1-4] /.test(await consegna(p)), 'percorso: al livello 1 si superano le somme entro 5');
  await chiudi(p, 'Percorso, livello 1');

  // 2. Livello 4 delle addizioni: si supera il 10 e si fa il sacchetto
  p = await apri(browser, profilo, { livelli: { addizioni: { livello: 3, sessioni: [] } } });
  await entra(p, 0, 'Con gli oggetti');
  verifica((await p.textContent('.livello-attuale')) === 'Livello 4 di 5', 'percorso: livello 4 non applicato');
  await mettiTutto(p);
  verifica(await p.locator('.scatola-pallini .sacchetto').count() === 1, 'sacchetto: oltre il 10 non si è fatto il sacchetto');
  await controllaBordi(p, 'sacchetto nella ciotola');
  await sbaglia(p, await contaCiotola(p), profilo);
  verifica((await p.textContent('.messaggio')).includes('sacchetto vale 10'), 'sacchetto: manca il suggerimento "vale 10"');
  await chiudi(p, 'Addizioni con il sacchetto');

  // 3. Livello 4 delle sottrazioni: bisogna aprire il sacchetto
  p = await apri(browser, profilo, { livelli: { sottrazioni: { livello: 3, sessioni: [] } } });
  await entra(p, 1, 'Con gli oggetti');
  const b = Number((await consegna(p)).match(/tocca (\d+)/)[1]);
  let aperto = false;
  for (let i = 0; i < b; i++) {
    if (!(await p.locator('.pezzo:not(.tolto):not([disabled])').count())) { await p.premi('button:has-text("Apri il sacchetto")'); aperto = true; }
    await p.premi('.pezzo:not(.tolto):not([disabled])');
  }
  verifica(aperto, 'sacchetto: nelle sottrazioni oltre il 10 non serviva aprirlo');
  await chiudi(p, 'Sottrazioni aprendo il sacchetto');

  // 4. Passaggio automatico: due sessioni perfette → annuncio e livello 2
  p = await apri(browser, profilo, { generale: { avanzamento: 'automatico' } });
  await entra(p, 0, 'Con gli oggetti');
  await sessionePerfettaAddizioni(p);
  verifica(!(await p.locator('.annuncio-livello').count()), 'percorso: si sale dopo una sola sessione');
  await p.click('button:has-text("Ancora")');
  await sessionePerfettaAddizioni(p);
  verifica((await p.textContent('.annuncio-livello')).includes('livello 2'), 'percorso: manca l\'annuncio del livello 2');
  await p.click('button:has-text("Ancora")');
  verifica((await p.textContent('.livello-attuale')) === 'Livello 2 di 5', 'percorso: il livello 2 non è applicato');
  await chiudi(p, 'Percorso automatico');

  // 5. Decide il docente: pallino sull'ingranaggio, proposta, cambio di livello a mano
  p = await apri(browser, profilo, {});
  await entra(p, 0, 'Con gli oggetti');
  await sessionePerfettaAddizioni(p);
  await p.click('button:has-text("Ancora")');
  await sessionePerfettaAddizioni(p);
  verifica(!(await p.locator('.annuncio-livello').count()), 'percorso: con "decide il docente" si è saliti da soli');
  verifica(await p.locator('#btn-impostazioni.con-proposta').count() === 1, 'percorso: manca il pallino della proposta');
  await p.click('#btn-impostazioni');
  await p.fill('#parola-docente', 'docente');
  await p.press('#parola-docente', 'Enter');
  verifica((await p.textContent('.proposte')).includes('pronto per il livello 2'), 'percorso: manca la proposta per il docente');
  await controllaBordi(p, 'impostazioni con i livelli');
  await p.click('#livello-addizioni button[aria-label="Livello successivo"]');
  verifica((await p.textContent('#livello-addizioni .livello-titolo')).includes('livello 2'), 'percorso: il docente non riesce a cambiare livello');
  verifica(await p.locator('#btn-impostazioni.con-proposta').count() === 0, 'percorso: il pallino resta dopo il cambio');
  await chiudi(p, 'Percorso deciso dal docente');
}

/* ---------- Le novità del lato didattico ---------- */

async function novita(browser, profilo) {
  // 1. Il ragazzo sceglie gli animali; agenda visiva; pittogrammi CAA
  let p = await apri(browser, profilo, { generale: { tema: 'scelta', pittogrammi: true } });
  await entra(p, 0, 'Con gli oggetti');
  verifica(await p.locator('[data-tema]').count() === 4, 'scelta: non ci sono i quattro animali');
  await controllaBordi(p, 'scelta degli animali');
  await p.premi('[data-tema="conigli"]');
  verifica((await consegna(p)).includes('coniglietto'), 'scelta: gli animali scelti non sono usati');
  verifica(await p.locator('.agenda-passo').count() === 6, 'agenda: non ci sono 5 passi più "Finito"');
  await p.waitForFunction(() => document.querySelectorAll('.pittogramma img').length > 0 &&
    Array.prototype.every.call(document.querySelectorAll('.pittogramma img'), i => i.complete), null, { timeout: 5000 }).catch(() => null);
  const picto = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.pittogramma img'), i => i.complete && i.naturalWidth > 0));
  verifica(picto.length >= 1 && picto.every(Boolean), 'pittogrammi: mancano o non si caricano');
  await chiudi(p, 'Scelta, agenda e pittogrammi');

  // 2. Correzione al terzo errore e riga "Al contrario" (addizioni, calcola)
  p = await apri(browser, profilo, { addizioni: { modalita: 'calcola', sommaMax: 10, numeroEsercizi: 3, aiuto: 'mai' } });
  await entra(p, 0, 'Con gli oggetti');
  const [a, b] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
  for (let i = 0; i < 3; i++) await sbaglia(p, a + b, profilo);
  verifica(await p.locator('.tasto.suggerito').count() === 1, 'correzione: al terzo errore la risposta giusta non è indicata');
  verifica((await p.textContent('.correzione')).includes(String(a + b)), 'correzione: manca la frase con la risposta giusta');
  await rispondi(p, a + b, profilo, 'correzione');
  verifica((await p.textContent('.esito')).includes('Al contrario: ' + (a + b)), 'ponti: manca "Al contrario" nelle addizioni');
  await chiudi(p, 'Correzione');

  // 3. Divisioni: "Fare gruppi" (quanti animali si sfamano)
  p = await apri(browser, profilo, { divisioni: { modalita: 'gruppi', conResto: true, numeroEsercizi: 3, divisoreMax: 5, quozienteMax: 5 } });
  await entra(p, 3, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    const d = Number((await consegna(p)).match(/(?:mangia|stanno) (\d+)/)[1]);
    while (await p.locator('.mucchio-tocca .pezzo:not([disabled])').count()) await p.premi('.mucchio-tocca .pezzo:not([disabled])');
    const piene = await p.locator('.scatola.piena').count();
    const resto = await p.locator('.mucchio-tocca .pezzo').count();
    verifica(resto < d, 'gruppi: avanzano abbastanza pezzi per un altro gruppo');
    await rispondi(p, piene, profilo, 'gruppi');
    if (resto) await rispondi(p, resto, profilo, 'gruppi, resto');
    const esito = await p.textContent('.esito');
    verifica(/sta \d+ volt[ae] nel/.test(esito), 'gruppi: manca "il 3 sta 4 volte nel 12"');
    await p.premi('.esito button');
  }
  await fineSessione(p, 'Divisioni a gruppi');

  // 4. Problemi: scegliere l'operazione, poi calcolare
  p = await apri(browser, profilo, { problemi: { operazioni: 'tutte', numeroMax: 20, numeroEsercizi: 3 } });
  await p.premi('.scheda-attivita:has-text("Problemi")');
  for (let es = 0; es < 3; es++) {
    let giusta = null;
    for (const segno of ['+', '−', '×', ':']) {
      await p.premi(`.bottone-operazione[data-segno="${segno}"]`);
      if (await p.locator('.scelta-operazione.conclusa').count()) { giusta = segno; break; }
      verifica((await p.textContent('.messaggio')).includes('Leggi bene'), 'problemi: manca l\'indizio sull\'operazione');
    }
    verifica(giusta !== null, 'problemi: nessuna operazione accettata');
    const [x, y] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
    const r = giusta === '+' ? x + y : giusta === '−' ? x - y : giusta === '×' ? x * y : x / y;
    await rispondi(p, r, profilo, 'problemi');
    verifica((await p.locator('.esito .operazione-dopo').count()) === 1, 'problemi: manca la risposta a parole');
    await p.premi('.esito button');
  }
  await fineSessione(p, 'Problemi');

  // 5. Il docente vede gli errori; schede da stampare
  p = await apri(browser, profilo, { addizioni: { modalita: 'calcola', sommaMax: 10, numeroEsercizi: 3, aiuto: 'mai' } });
  await entra(p, 0, 'Con gli oggetti');
  for (let es = 0; es < 3; es++) {
    const [x, y] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
    await sbaglia(p, x + y, profilo);
    await rispondi(p, x + y, profilo, 'errori');
    await p.premi('.esito button');
  }
  await p.premi('#btn-impostazioni');
  await p.fill('#parola-docente', 'docente');
  await p.press('#parola-docente', 'Enter');
  verifica((await p.textContent('#livello-addizioni')).includes('il calcolo (3)'), 'errori: il docente non vede "il calcolo (3)"');
  await p.premi('button:has-text("Prepara una scheda")');
  verifica(await p.locator('.foglio-esercizio').count() === 9, 'schede: non ci sono 9 esercizi');
  await p.premi('.scelta:has-text("Divisioni: in colonna")');
  verifica(await p.locator('.foglio-esercizio .colonna-divisore').count() === 9, 'schede: le divisioni non sono in colonna');
  verifica((await p.textContent('.foglio-soluzioni')).includes(':'), 'schede: mancano le soluzioni');
  await controllaBordi(p, 'schede da stampare');
  await chiudi(p, 'Errori e schede');
}

/* ---------- Menu, impostazioni, aspetto ---------- */

async function menuEImpostazioni(browser, profilo) {
  const p = await apri(browser, profilo, {});
  await controllaBordi(p, 'menu');
  const titoli = await p.locator('.scheda-titolo').allTextContents();
  verifica(titoli.join('|') === 'Addizioni|Sottrazioni|Moltiplicazioni|Divisioni|Problemi',
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
    await percorso(browser, profilo);
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
    // L'aiuto che si riduce: semiguidato e da solo
    await operazioneInColonna(browser, profilo, 0, 'addizioni-colonna', { cifre: 3, riporto: true, guida: 'semiguidato' }, false);
    await operazioneInColonna(browser, profilo, 1, 'sottrazioni-colonna', { cifre: 4, prestito: true, guida: 'semiguidato' }, false);
    await operazioneInColonna(browser, profilo, 2, 'moltiplicazioni-colonna', { cifre: 3, moltiplicatore: 2, guida: 'semiguidato' }, false);
    await operazioneInColonna(browser, profilo, 0, 'addizioni-colonna', { cifre: 3, riporto: true, guida: 'autonomo' }, true);
    await operazioneInColonna(browser, profilo, 1, 'sottrazioni-colonna', { cifre: 3, prestito: true, guida: 'autonomo' }, true);
    await operazioneInColonna(browser, profilo, 2, 'moltiplicazioni-colonna', { cifre: 2, moltiplicatore: 1, guida: 'autonomo' }, true);
    await novita(browser, profilo);
    if (profilo.tastiera) await colonna(browser, profilo, combinazioni[3], true);
    console.log('    ' + (errori === prima ? 'tutto a posto' : (errori - prima) + ' errori'));
  }
  for (const b of motori.values()) if (b) await b.close();
  console.log(errori ? '\nRISULTATO: ' + errori + ' errori' : '\nRISULTATO: tutto a posto');
  process.exit(errori ? 1 : 0);
})();
