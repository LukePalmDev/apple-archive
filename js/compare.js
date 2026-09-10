/* ============================================================
   Lista di confronto, persistita in localStorage
   ============================================================ */

import { $ } from './utils.js';

const MAX = 4;

export function cmpKey(slug, modello) { return slug + '|||' + modello; }

function load() {
  try { return new Set(JSON.parse(localStorage.getItem('cmp') || '[]')); }
  catch (e) { return new Set(); }
}

export const COMPARE = load();

export function saveCompare() {
  try { localStorage.setItem('cmp', JSON.stringify([...COMPARE])); } catch (e) { /* quota / modalità privata */ }
  updateComparePill();
}

export function isCompared(slug, modello) { return COMPARE.has(cmpKey(slug, modello)); }

export function toggleCompare(slug, modello) {
  const k = cmpKey(slug, modello);
  if (COMPARE.has(k)) {
    COMPARE.delete(k);
  } else {
    if (COMPARE.size >= MAX) { alert(`Puoi confrontare al massimo ${MAX} modelli.`); return false; }
    COMPARE.add(k);
  }
  saveCompare();
  return true;
}

export function updateComparePill() {
  const pill = $('#compare-pill'), count = $('#compare-count');
  if (!pill || !count) return;
  count.textContent = COMPARE.size;
  pill.hidden = COMPARE.size === 0;
}
