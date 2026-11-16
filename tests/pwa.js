/*
 * Test della web app installabile e del funzionamento senza rete.
 *
 *   node tests/pwa.js
 *
 * Prepara il sito come per la pubblicazione (tools/prepara_sito.py), lo serve
 * su localhost e controlla con Chrome che:
 *  - l'app sia installabile (manifest e icone validi),
 *  - il service worker conservi tutti i file,
 *  - a rete staccata l'app si apra e funzioni, immagini comprese,
 *  - una nuova pubblicazione sostituisca la copia vecchia.
 */
'use strict';
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { chromium } = require('playwright');

const RADICE = path.resolve(__dirname, '..');
const PORTA = 8765;
const INDIRIZZO = 'http://localhost:' + PORTA + '/';

let errori = 0;
function verifica(condizione, descrizione) {
  if (!condizione) { errori++; console.log('  ERRORE: ' + descrizione); } else console.log('  ok: ' + descrizione);
}

(async () => {
  execFileSync('python3', ['tools/prepara_sito.py', 'prova-1'], { cwd: RADICE, stdio: 'inherit' });
  const server = spawn('python3', ['-m', 'http.server', String(PORTA), '--directory', '_site'], { cwd: RADICE, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1000));
  const browser = await chromium.launch();
  try {
    const contesto = await browser.newContext();
    const p = await contesto.newPage();
    const erroriPagina = [];
    p.on('pageerror', e => erroriPagina.push(e.message));

    await p.goto(INDIRIZZO);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload();

    const cdp = await contesto.newCDPSession(p);
    const inst = await cdp.send('Page.getInstallabilityErrors');
    verifica(inst.installabilityErrors.length === 0, 'installabile ' + JSON.stringify(inst.installabilityErrors));

    const copia = await p.evaluate(async () => {
      const nomi = await caches.keys();
      return { nomi, file: (await (await caches.open(nomi[0])).keys()).length };
    });
    verifica(copia.nomi.length === 1 && copia.nomi[0] === 'impariamo-prova-1', 'copia offline con la versione giusta ' + JSON.stringify(copia.nomi));
    verifica(copia.file > 20, 'tutti i file conservati (' + copia.file + ')');

    await contesto.setOffline(true);
    await p.reload();
    verifica((await p.textContent('#titolo')) === 'Impariamo insieme', 'senza rete: l\'app si apre');
    await p.click('.scheda-attivita >> nth=3');                  // area "Divisioni"
    await p.click('.scheda-attivita:has-text("In colonna")');  // un esercizio in corso
    const immagini = await p.evaluate(() => Promise.all(
      [document.querySelector('img.mascotte').src, getComputedStyle(document.body, '::before').backgroundImage.replace(/^url\("(.*)"\)$/, '$1')]
        .map(src => new Promise(ok => { const i = new Image(); i.onload = () => ok(true); i.onerror = () => ok(false); i.src = src; }))
    ));
    verifica(immagini.every(Boolean), 'senza rete: mascotte e sfondo si caricano');

    // Nuova pubblicazione mentre un ragazzo sta facendo un esercizio:
    // l'app non deve ricaricarsi finché non si torna al menu
    await contesto.setOffline(false);
    await p.evaluate(() => { window.segnaposto = 'pagina vecchia'; });
    execFileSync('python3', ['tools/prepara_sito.py', 'prova-2'], { cwd: RADICE });
    await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await p.waitForTimeout(2000);
    const dopo = await p.evaluate(() => caches.keys());
    verifica(dopo.length === 1 && dopo[0] === 'impariamo-prova-2', 'nuova pubblicazione: copia aggiornata ' + JSON.stringify(dopo));
    verifica(await p.evaluate(() => window.segnaposto) === 'pagina vecchia', 'durante un esercizio l\'app non si ricarica');
    await Promise.all([p.waitForEvent('load'), p.click('#btn-menu')]);
    verifica(await p.evaluate(() => window.segnaposto) === undefined, 'uscendo dall\'esercizio l\'app passa alla versione nuova');
    verifica((await p.textContent('#titolo')) === 'Impariamo insieme', 'dopo l\'aggiornamento si riparte dal menu');

    // Nuova pubblicazione mentre si è sul menu: l'app si ricarica da sola
    await p.evaluate(() => { window.segnaposto = 'pagina vecchia'; });
    execFileSync('python3', ['tools/prepara_sito.py', 'prova-3'], { cwd: RADICE });
    await Promise.all([
      p.waitForEvent('load', { timeout: 10000 }).catch(() => null),
      p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()))
    ]);
    await p.waitForTimeout(500);
    verifica(await p.evaluate(() => window.segnaposto) === undefined, 'sul menu l\'app si aggiorna da sola');
    verifica(JSON.stringify(await p.evaluate(() => caches.keys())) === '["impariamo-prova-3"]', 'resta solo la copia più recente');
    verifica(erroriPagina.length === 0, 'nessun errore nella pagina ' + erroriPagina.join(' | '));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(errori ? 'RISULTATO: ' + errori + ' errori' : 'RISULTATO: tutto a posto');
  process.exit(errori ? 1 : 0);
})();
