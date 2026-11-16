/*
 * Le macro aree del menu: una per operazione, nell'ordine del percorso verso la divisione.
 * Ogni area raccoglie le sue attività ("Con gli oggetti", "In colonna"), così il menu
 * principale resta corto. Le attività dichiarano la loro area con area: 'addizioni'.
 */
(function () {
  'use strict';
  [
    { id: 'addizioni', passo: 1, titolo: 'Addizioni', descrizione: 'Mettere insieme',
      immagine: 'img/orsetto.png', sfondo: 'img/sfondo-spiaggia.png', colore: '#0891b2' },
    { id: 'sottrazioni', passo: 2, titolo: 'Sottrazioni', descrizione: 'Togliere',
      immagine: 'img/ranocchia.png', sfondo: 'img/sfondo-stagno.png', colore: '#16a34a' },
    { id: 'moltiplicazioni', passo: 3, titolo: 'Moltiplicazioni', descrizione: 'Gruppi uguali e tabelline',
      immagine: 'img/riccio.png', sfondo: 'img/sfondo-orto.png', colore: '#db2777' },
    { id: 'divisioni', passo: 4, titolo: 'Divisioni', descrizione: 'Dividere in parti uguali',
      immagine: 'img/volpe.png', sfondo: 'img/sfondo-prato.png', colore: '#ff7417' }
  ].forEach(Impariamo.registraArea);
})();
