/* ============================================================
   Caricamento dati: manifest categorie + un CSV per categoria.
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

function parseCSV(text) {
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
    return fetchText('data/' + cat.file).then(t => {
      const rows = parseCSV(t).filter(r => r.modello);
      rows.forEach(r => { r.__slug = slug; r.__cat = cat.nome; });
      DATA[slug] = rows;
      return rows;
    });
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
