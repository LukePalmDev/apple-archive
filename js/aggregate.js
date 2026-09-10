/* ============================================================
   Aggregatori per le statistiche.
   Tutto viene ricalcolato dai CSV a ogni caricamento: nessun
   valore precalcolato, così i grafici seguono sempre i dati.
   ============================================================ */

import { esc, num } from './utils.js';
import { uniqueModels } from './data.js';
import { parseMese, anniVendita, anniSupporto } from './derived.js';

/* Segmenti di gamma iPhone, dal 2017 in poi */
export const SEGMENTS = [
  { key: 'Base',       name: 'Base',            color: '#0a84ff' },
  { key: 'Plus / Air', name: 'Plus / Air',      color: '#30c8c0' },
  { key: 'mini',       name: 'mini',            color: '#34c759' },
  { key: 'Pro',        name: 'Pro',             color: '#bf5af2' },
  { key: 'Pro Max',    name: 'Pro Max',         color: '#ff375f' },
  { key: 'Budget',     name: 'Budget (SE / e)', color: '#ff9f0a' }
];

export function iphoneSegment(m) {
  const s = String(m).toLowerCase().trim();
  if (/pro\s*max/.test(s) || /xs\s*max/.test(s)) return 'Pro Max';
  if (/pro/.test(s) || s === 'xs' || s === 'x') return 'Pro';
  if (/plus/.test(s) || /\bair\b/.test(s) || s === 'air') return 'Plus / Air';
  if (/mini/.test(s)) return 'mini';
  if (/\bse\b/.test(s) || /\d+e$/.test(s) || s === '5c') return 'Budget';
  return 'Base'; // numerati base + XR
}

/* Chiave di ordinamento cronologico sulla data di commercializzazione */
export function commKey(r) {
  const m = parseMese(r.data_commercializzazione);
  return m ? m.y * 12 + m.m : 0;
}

/* "512 GB" -> 512, "2 TB" -> 2048 */
export function capGB(s) {
  const m = /([\d.]+)\s*(GB|TB)/i.exec(s || '');
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (/tb/i.test(m[2])) v *= 1024;
  return v;
}

export function capLabel(gb) {
  return gb >= 1024
    ? (gb % 1024 === 0 ? gb / 1024 : (gb / 1024).toFixed(1)) + ' TB'
    : gb + ' GB';
}

export function statAnni(rows) {
  const m = uniqueModels(rows)
    .map(u => ({
      modello: u.modello, r0: u.r0,
      anni: anniVendita(u.r0.periodo_vendita),
      present: /presente|oggi|in vendita/i.test(u.r0.periodo_vendita || '')
    }))
    .filter(u => u.anni != null)
    .sort((a, b) => commKey(a.r0) - commKey(b.r0));
  if (!m.length) return [];
  const max = Math.max(...m.map(x => x.anni));
  return m.map(x => ({
    label: x.modello, frac: x.anni / max, live: x.present,
    valHtml: `${x.anni} ${x.anni === 1 ? 'anno' : 'anni'}${x.present ? ' <small>· in vendita</small>' : ''}`
  }));
}

export function statSoftware(rows) {
  const m = uniqueModels(rows)
    .map(u => ({ modello: u.modello, r0: u.r0, anni: anniSupporto(u.r0) }))
    .filter(u => u.anni != null)
    .sort((a, b) => commKey(a.r0) - commKey(b.r0));
  if (!m.length) return [];
  const max = Math.max(...m.map(x => x.anni), 1);
  return m.map(x => ({
    label: x.modello, frac: x.anni / max,
    valHtml: `${x.anni} ${x.anni === 1 ? 'anno' : 'anni'} <small>· ${esc(x.r0.software || '')}</small>`
  }));
}

/* ---- Matrice prezzi: una riga per modello, una colonna per capacità ---- */
const GEN_PALETTE = [
  'rgba(255,204,0,.22)', 'rgba(52,199,89,.18)', 'rgba(255,149,0,.20)',
  'rgba(48,199,190,.20)', 'rgba(10,132,255,.16)', 'rgba(255,69,58,.16)'
];
const GEN_GREY = 'rgba(142,142,147,.16)';

function rowTint(model, year) {
  if (/\bse\b/i.test(model) || /\d+e$/i.test(model)) return GEN_GREY; // SE / modelli "e"
  if (!year || year <= 2012) return GEN_GREY;
  return GEN_PALETTE[(year - 2013) % GEN_PALETTE.length];
}

export function priceMatrix(rows, cur) {
  const field = cur === 'eur' ? 'prezzo_reale_eur' : 'prezzo_lancio_usd';
  const caps = new Set();
  const models = uniqueModels(rows).map(u => {
    const m = parseMese(u.r0.data_commercializzazione), year = m ? m.y : null;
    const byCap = {};
    u.rows.forEach(r => {
      const gb = capGB(r.archiviazione);
      if (gb != null) {
        caps.add(gb);
        const v = num(r[field]);
        if (v != null) byCap[gb] = v;
      }
    });
    return { modello: u.modello, year, sortK: commKey(u.r0), byCap, tint: rowTint(u.modello, year) };
  }).sort((a, b) => a.sortK - b.sortK);
  return { caps: [...caps].sort((a, b) => a - b), models };
}

/* ---- Serie storiche dei prezzi iPhone ---- */
export function statGrafici(rows) {
  const models = uniqueModels(rows).map(u => {
    const mm = parseMese(u.r0.data_commercializzazione);
    const prices = u.rows.map(r => num(r.prezzo_lancio_usd)).filter(v => v != null);
    return {
      modello: u.modello,
      year: mm ? mm.y : null,
      seg: iphoneSegment(u.modello),
      minUsd: prices.length ? Math.min(...prices) : null
    };
  }).filter(u => u.year != null && u.minUsd != null);

  /* Fino al 2016 c'era un solo iPhone "principale" all'anno */
  const primePts = models
    .filter(u => u.seg === 'Base' && u.year <= 2016)
    .map(u => ({ x: u.year, y: u.minUsd }))
    .sort((a, b) => a.x - b.x);
  const prime = [{ name: 'iPhone (modello base)', color: '#0a84ff', points: primePts }];

  /* Dal 2017 la gamma si divide: una serie per segmento */
  const seconde = SEGMENTS.map(s => {
    const byYear = new Map();
    models.filter(u => u.seg === s.key && u.year >= 2017).forEach(u => {
      const c = byYear.get(u.year);
      if (c == null || u.minUsd < c) byYear.set(u.year, u.minUsd);
    });
    return {
      name: s.name, color: s.color,
      points: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y }))
    };
  }).filter(s => s.points.length);

  return { prime, seconde };
}
