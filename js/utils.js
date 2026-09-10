/* ============================================================
   Utility generiche: DOM, escaping, formattazione
   ============================================================ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const app = () => $('#app');

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function titlecase(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* Valore mancante: vuoto, "?" (da verificare) o "n.d." (non applicabile) */
export function isNA(v) {
  return v == null || v === '' || v === '?' || /^n\.d\.$/i.test(String(v).trim());
}

export function num(v) {
  if (isNA(v)) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmtEur(n) { return n == null ? '—' : '€' + Math.round(n).toLocaleString('it-IT'); }
export function fmtUsd(n) { return n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'); }
export function fmtPct(n) { return n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(0) + '%'; }
export function fmtPlain(n) { return n == null ? '' : Math.round(n).toLocaleString('it-IT'); }
