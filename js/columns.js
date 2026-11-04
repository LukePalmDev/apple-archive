/* ============================================================
   Definizione delle colonne della tabella di categoria.
   Le colonne extra presenti nel CSV ma non previste dallo schema
   vengono aggiunte automaticamente, senza toccare il codice.
   ============================================================ */

import { esc, titlecase, isNA, num, fmtEur, fmtUsd, fmtPct } from './utils.js';
import { LABELS, KNOWN } from './state.js';
import { teorico, aumento, anniVendita, anniSupporto, parsePeriodo, lastOsYear } from './derived.js';
import { isCompared } from './compare.js';

export function textCol(key, cls) {
  return {
    key, label: LABELS[key] || titlecase(key), sortable: true, cls: cls || '',
    html: r => isNA(r[key]) ? '<span class="cell-na">—</span>' : esc(r[key]),
    sortVal: r => (r[key] || '').toLowerCase()
  };
}

export function numCol(key, html, sortVal) {
  return { key, label: LABELS[key] || titlecase(key), sortable: true, cls: 'col-num', html, sortVal };
}

export function columnsFor(rows) {
  /* Unione delle chiavi: un campo presente solo sui modelli più nuovi
     deve comparire comunque, non solo se sta sulla prima riga. */
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(h => !h.startsWith('__'));
  const cols = [];

  cols.push({
    key: '__cmp', label: '', sortable: false, cls: '',
    html: r => `<input type="checkbox" class="cmp-check" data-modello="${esc(r.modello)}" data-slug="${esc(r.__slug)}" ${isCompared(r.__slug, r.modello) ? 'checked' : ''} aria-label="Aggiungi ${esc(r.modello)} al confronto">`
  });

  cols.push(textCol('modello', 'cell-model'));
  cols.push(textCol('archiviazione'));
  cols.push(textCol('processore'));
  cols.push(textCol('ram'));
  cols.push(textCol('schermo'));
  cols.push(textCol('batteria'));
  ['dimensione_cassa', 'connettivita'].forEach(k => { if (headers.includes(k)) cols.push(textCol(k)); });
  headers.filter(k => !KNOWN.includes(k)).forEach(k => cols.push(textCol(k)));

  cols.push(numCol('prezzo_lancio_usd', r => fmtUsd(num(r.prezzo_lancio_usd)), r => num(r.prezzo_lancio_usd)));
  cols.push(numCol('cambio_usd_eur', r => isNA(r.cambio_usd_eur) ? '—' : r.cambio_usd_eur, r => num(r.cambio_usd_eur)));
  cols.push({
    key: '__teorico', label: 'Teorico €', sortable: true, cls: 'col-num',
    html: r => fmtEur(teorico(r)), sortVal: r => teorico(r)
  });
  cols.push(numCol('prezzo_reale_eur', r => fmtEur(num(r.prezzo_reale_eur)), r => num(r.prezzo_reale_eur)));
  cols.push({
    key: '__aumento', label: 'Aumento %', sortable: true, cls: 'col-num',
    html: r => {
      const a = aumento(r);
      if (a == null) return '<span class="cell-na">—</span>';
      return `<span class="pct ${a >= 0 ? 'up' : 'down'}">${fmtPct(a)}</span>`;
    },
    sortVal: r => aumento(r)
  });
  cols.push({
    key: 'periodo_vendita', label: LABELS.periodo_vendita, sortable: true, cls: '',
    html: r => {
      const a = anniVendita(r.periodo_vendita);
      return `${esc(r.periodo_vendita || '—')}${a ? ` <span class="badge soft">~${a} ${a === 1 ? 'anno' : 'anni'}</span>` : ''}`;
    },
    sortVal: r => { const p = parsePeriodo(r.periodo_vendita); return p ? p.start.y * 12 + p.start.m : null; }
  });
  cols.push({
    key: 'software', label: LABELS.software, sortable: true, cls: '',
    html: r => {
      const s = anniSupporto(r);
      return `<span class="badge">${esc(r.software || '—')}</span>${s != null ? ` <span class="badge soft">${s} ${s === 1 ? 'anno' : 'anni'} sw</span>` : ''}`;
    },
    sortVal: r => lastOsYear(r.software)
  });
  cols.push(textCol('data_commercializzazione'));
  return cols;
}
