/* ============================================================
   Valori derivati: prezzi teorici, date, anni di vendita e supporto.
   Nulla di tutto questo sta nei CSV: si calcola sempre dai dati grezzi.
   ============================================================ */

import { isNA, num } from './utils.js';
import { IOS_YEAR, WATCHOS_YEAR, ATV_SW_YEAR } from './state.js';

/* Prezzo teorico € = prezzo $ × cambio × 1.22 (IVA italiana) */
export function teorico(row) {
  const u = num(row.prezzo_lancio_usd), c = num(row.cambio_usd_eur);
  return (u != null && c != null) ? u * c * 1.22 : null;
}

/* Scarto % fra il prezzo realmente praticato in Italia e quello teorico */
export function aumento(row) {
  const t = teorico(row), r = num(row.prezzo_reale_eur);
  return (t != null && r != null && t > 0) ? (r - t) / t * 100 : null;
}

export function parseMese(s) {
  const m = /(\d{1,2})\/(\d{4})/.exec(s || '');
  return m ? { m: +m[1], y: +m[2] } : null;
}

export function parsePeriodo(s) {
  if (isNA(s)) return null;
  const parts = String(s).split(/[-–]/).map(p => p.trim());
  const start = parseMese(parts[0]);
  if (!start) return null;
  let end;
  const rawEnd = (parts[1] || '').toLowerCase();
  if (/presente|oggi|in vendita/.test(rawEnd)) {
    const d = new Date();
    end = { m: d.getMonth() + 1, y: d.getFullYear(), present: true };
  } else {
    end = parseMese(parts[1]);
  }
  return end ? { start, end } : { start, end: null };
}

export function anniVendita(s) {
  const p = parsePeriodo(s);
  if (!p || !p.end) return null;
  const mesi = (p.end.y - p.start.y) * 12 + (p.end.m - p.start.m);
  return Math.max(1, Math.round(mesi / 12));
}

/* Anno dell'ultima versione major indicata nel campo "software".
   Accetta "iOS 5–9", "iPadOS 26", "watchOS 1–4", "tvOS 17–27". */
export function lastOsYear(s) {
  const m = /([A-Za-z][A-Za-z\s]*?)\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*$/.exec(String(s || '').trim());
  if (!m) return null;
  const plat = m[1].toLowerCase();
  const major = +(m[3] || m[2]);
  let map = IOS_YEAR;
  if (plat.indexOf('watch') >= 0) map = WATCHOS_YEAR;
  else if (plat.indexOf('apple tv software') >= 0) map = ATV_SW_YEAR;
  return map[major] || null;
}

export function anniSupporto(row) {
  const comm = parseMese(row.data_commercializzazione);
  const last = lastOsYear(row.software);
  if (!comm || last == null) return null;
  return Math.max(0, last - comm.y);
}
