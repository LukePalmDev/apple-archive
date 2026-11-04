/* ============================================================
   Caricamento dati: manifest categorie + due file per categoria.
   - data/<slug>/modelli.json  specifiche annidate, un oggetto per modello
   - data/<slug>/varianti.csv  una riga per configurazione acquistabile
   Il loader unisce i due file per modello e produce righe "piatte"
   identiche (stessa forma) a quelle usate da derived.js/columns.js/viste,
   così il resto del sito non deve sapere come i dati sono archiviati.
   Le promise sono memoizzate per evitare fetch concorrenti duplicati.
   ============================================================ */

import { CATS, DATA } from './state.js';

export function isAttiva(cat) { return /^s[iì]$/i.test((cat && cat.attiva) || ''); }

function fetchText(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.text();
  });
}

function fetchJSON(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  });
}

function parseCSV(text) {
  if (typeof Papa === 'undefined') {
    throw new Error('Parser CSV non disponibile. Controlla che il CDN di PapaParse sia raggiungibile.');
  }
  return Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data;
}

let _catsPromise = null;
const _catPromise = {};

export function ensureCats() {
  if (CATS.length) return Promise.resolve(CATS);
  if (_catsPromise) return _catsPromise;
  _catsPromise = fetchText('data/categories.csv').then(t => {
    parseCSV(t).forEach(r => CATS.push(r));
    return CATS;
  }).catch(err => {
    CATS.length = 0;
    _catsPromise = null;
    throw err;
  });
  return _catsPromise;
}

export function catBySlug(slug) { return CATS.find(c => c.slug === slug); }

export function ensureCategory(slug) {
  if (DATA[slug]) return Promise.resolve(DATA[slug]);
  if (_catPromise[slug]) return _catPromise[slug];
  _catPromise[slug] = ensureCats().then(() => {
    const cat = catBySlug(slug);
    if (!cat) throw new Error('Categoria sconosciuta: ' + slug);
    const base = 'data/' + slug + '/';
    return Promise.all([
      fetchJSON(base + 'modelli.json'),
      fetchText(base + 'varianti.csv')
    ]).then(([modelli, variantiText]) => {
      const modelliByName = new Map(modelli.map(m => [m.modello, m]));
      const varianti = parseCSV(variantiText).filter(r => r.modello);
      const rows = varianti.map(v => {
        const m = modelliByName.get(v.modello);
        if (!m) throw new Error(`${slug}: variante senza specifiche di modello (${v.modello})`);
        const r = Object.assign({}, m, v);
        r.__slug = slug;
        r.__cat = cat.nome;
        return r;
      });
      DATA[slug] = rows;
      return rows;
    });
  }).catch(err => {
    delete _catPromise[slug];
    throw err;
  });
  return _catPromise[slug];
}

export function ensureAllActive() {
  return ensureCats().then(() => Promise.all(
    CATS.filter(isAttiva).map(c => ensureCategory(c.slug))
  ));
}

export function rowsForModel(slug, modello) {
  return (DATA[slug] || []).filter(r => r.modello === modello);
}

/* Raggruppa le righe (una per taglio) nei modelli che rappresentano */
export function uniqueModels(rows) {
  const map = new Map();
  rows.forEach(r => { if (!map.has(r.modello)) map.set(r.modello, []); map.get(r.modello).push(r); });
  return [...map.entries()].map(([modello, rs]) => ({ modello, rows: rs, r0: rs[0] }));
}
