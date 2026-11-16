#!/usr/bin/env python3
"""
Prepara la cartella _site da pubblicare come web app.

  python3 tools/prepara_sito.py [versione]

1. Copia in _site i file dell'app (index.html, manifest, sw.js, css/, js/, img/).
2. Scrive in sw.js l'elenco di tutti i file e la versione, così il service worker
   li conserva tutti per il funzionamento senza rete.
3. Controlla che ogni file citato in HTML, CSS e JavaScript esista davvero:
   un'immagine mancante fermerebbe l'installazione offline.

La versione predefinita è l'hash del commit git corrente.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
SITO = RADICE / '_site'
DA_COPIARE = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'img']


def versione_predefinita():
    try:
        return subprocess.check_output(['git', 'rev-parse', '--short=8', 'HEAD'], cwd=RADICE, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        return 'locale'


def main():
    versione = sys.argv[1] if len(sys.argv) > 1 else versione_predefinita()

    if SITO.exists():
        shutil.rmtree(SITO)
    SITO.mkdir()
    for nome in DA_COPIARE:
        sorgente = RADICE / nome
        if sorgente.is_dir():
            shutil.copytree(sorgente, SITO / nome)
        else:
            shutil.copy2(sorgente, SITO / nome)

    file = sorted(p.relative_to(SITO).as_posix() for p in SITO.rglob('*') if p.is_file() and p.name != 'sw.js')

    # Ogni riferimento a un file locale deve esistere
    riferimenti = set()
    for p in SITO.rglob('*'):
        if p.suffix in ('.html', '.js', '.css', '.webmanifest'):
            testo = p.read_text(encoding='utf-8')
            riferimenti.update(re.findall(r"""['"(]((?:img|css|js)/[\w./-]+\.\w+)""", testo))
    mancanti = sorted(r for r in riferimenti if not (SITO / r).is_file())
    if mancanti:
        sys.exit('File citati ma inesistenti: ' + ', '.join(mancanti))

    sw = SITO / 'sw.js'
    testo = sw.read_text(encoding='utf-8')
    testo, n1 = re.subn(r"var VERSIONE = '[^']*';", "var VERSIONE = %s;" % json.dumps(versione), testo)
    testo, n2 = re.subn(r"var FILE = \[[^\]]*\];", "var FILE = %s;" % json.dumps(['./'] + file), testo)
    if n1 != 1 or n2 != 1:
        sys.exit('sw.js: non trovo le righe VERSIONE e FILE da aggiornare')
    sw.write_text(testo, encoding='utf-8')

    print('Sito pronto in %s: %d file, versione %s' % (SITO, len(file), versione))


if __name__ == '__main__':
    main()
