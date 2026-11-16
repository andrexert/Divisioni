/*
 * Test automatici di "Impariamo insieme".
 *
 *   node tests/esegui.js
 *
 * Un "alunno automatico" usa l'app su più dispositivi simulati: computer con
 * Chrome e con Safari (WebKit), iPhone, iPad e telefono Android. Gioca tutti i temi
 * delle divisioni con gli oggetti e le divisioni in colonna con impostazioni
 * diverse, sbaglia apposta per provare i suggerimenti, usa anche solo la tastiera,
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

const consegna = (p) => p.locator('.consegna').first().textContent().then(t => t.replace(/\s+/g, ' ').trim());

/* ---------- Divisioni con gli oggetti ---------- */

async function divisioni(browser, profilo, tema) {
  const p = await apri(browser, profilo, {
    divisioni: { tema, modalita: 'alterna', conResto: true, numeroEsercizi: 3, divisoreMax: 5, quozienteMax: 10 }
  });
  await p.premi('.scheda-attivita >> nth=0');
  for (let es = 0; es < 3; es++) {
    if (await p.locator('.scatola:not(.statica)').count()) {
      // Distribuisci: prima un tocco "sbagliato" (due volte la stessa scatola), poi a turno
      const d = await p.locator('.scatola').count();
      await p.premi('.scatola >> nth=0');
      await p.premi('.scatola >> nth=0');
      verifica((await p.textContent('.messaggio')).startsWith('Prima '), tema + ': manca l\'avviso sulle scatole con meno oggetti');
      for (let k = 1; !(await p.locator('.domanda').count()); k++) await p.premi('.scatola >> nth=' + (k % d));
      await controllaBordi(p, tema + ', dopo la distribuzione');
      // Righe da 5 nelle ciotole
      const colonne = await p.evaluate(() => getComputedStyle(document.querySelector('.scatola-pallini')).gridTemplateColumns.split(' ').length);
      verifica(colonne === 5, tema + ': il contenuto delle scatole non è in righe da 5 (' + colonne + ')');
      const q = await p.locator('.scatola-pallini >> nth=0').locator('> *').count();
      const r = await p.locator('.mucchio > *').count();
      await rispondi(p, 0, q, profilo);
      if (r > 0) await rispondi(p, 1, r, profilo);
    } else {
      // Calcola: due errori fanno comparire il disegno
      const [a, d] = (await p.textContent('.operazione')).match(/\d+/g).map(Number);
      const q = Math.floor(a / d), r = a % d;
      for (const x of [0, 1, 2, 3].filter(x => x !== q).slice(0, 2)) await p.premi(`.tastierino .tasto:text-is("${x}")`);
      verifica(await p.locator('.figura').count() === 1, tema + ': dopo due errori non compare il disegno');
      await p.premi(`.tastierino .tasto:text-is("${q}")`);
      if (r) await p.premi(`.tastierino .tasto:text-is("${r}")`);
    }
    const scritta = await p.textContent('.esito .operazione');
    const [a, d] = scritta.match(/\d+/g).map(Number);
    verifica(scritta === `${a} : ${d} = ${Math.floor(a / d)}` + (a % d ? ` resto ${a % d}` : ''), tema + ': esito sbagliato ' + scritta);
    await p.premi('.esito button');
  }
  verifica(await p.locator('.fine').count() === 1, tema + ': la sessione non arriva a "Finito!"');
  verifica(!(await p.textContent('.fine')).includes('primo tentativo'), tema + ': il resoconto per il docente è visibile al ragazzo');
  await controllaBordi(p, tema + ', fine');
  await chiudi(p, 'Divisioni ' + tema);
}

// Risponde alla domanda numero "quale": con la tastiera fisica, se il profilo ce l'ha
async function rispondi(p, quale, valore, profilo) {
  const domanda = p.locator('.domanda').nth(quale);
  if (profilo.tastiera) {
    for (const c of String(valore)) await p.keyboard.press(c);
    await p.waitForTimeout(900); // dopo "1" l'app aspetta un attimo un eventuale "0" (per il 10)
  } else {
    await domanda.locator('.tasto').filter({ hasText: new RegExp('^' + valore + '$') }).first()[profilo.contesto.hasTouch ? 'tap' : 'click']();
  }
  verifica(await domanda.locator('.tasto.giusto').count() === 1, 'risposta ' + valore + ' non accettata');
}

/* ---------- Divisioni in colonna ---------- */

async function colonna(browser, profilo, imp, usaTastiera) {
  const p = await apri(browser, profilo, { colonna: Object.assign({ numeroEsercizi: 2, tabellina: 'errore' }, imp) });
  await p.premi('.scheda-attivita >> nth=1');
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

/* ---------- Menu, impostazioni, aspetto ---------- */

async function menuEImpostazioni(browser, profilo) {
  const p = await apri(browser, profilo, {});
  await controllaBordi(p, 'menu');
  verifica(await p.locator('.scheda-attivita').count() === 2, 'nel menu non ci sono due attività');
  const sfondo = await p.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage);
  verifica(/sfondo-menu\.png/.test(sfondo), 'manca lo sfondo del menu');
  // Pressione lunga sull'ingranaggio
  const ingranaggio = await p.locator('#btn-impostazioni').boundingBox();
  await p.mouse.move(ingranaggio.x + 10, ingranaggio.y + 10);
  await p.mouse.down();
  await p.waitForTimeout(1700);
  await p.mouse.up();
  verifica((await p.textContent('#titolo')) === 'Impostazioni', 'la pressione lunga non apre le impostazioni');
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
    for (const tema of ['gatti', 'cani', 'conigli', 'scoiattoli', 'pallini']) await divisioni(browser, profilo, tema);
    const combinazioni = [
      { cifreDividendo: 2, cifreDivisore: 1, conResto: false, sottrazioni: true },
      { cifreDividendo: 3, cifreDivisore: 1, conResto: true, sottrazioni: true },
      { cifreDividendo: 4, cifreDivisore: 1, conResto: true, sottrazioni: false },
      { cifreDividendo: 4, cifreDivisore: 2, conResto: true, sottrazioni: true }
    ];
    for (const imp of combinazioni) await colonna(browser, profilo, imp, false);
    if (profilo.tastiera) await colonna(browser, profilo, combinazioni[3], true);
    console.log('    ' + (errori === prima ? 'tutto a posto' : (errori - prima) + ' errori'));
  }
  for (const b of motori.values()) if (b) await b.close();
  console.log(errori ? '\nRISULTATO: ' + errori + ' errori' : '\nRISULTATO: tutto a posto');
  process.exit(errori ? 1 : 0);
})();
