import { app, esc, isNA, num, fmtEur, fmtUsd, fmtPct } from '../utils.js';

import { ensureAllActive, rowsForModel } from '../data.js';
import { aumento, anniVendita, anniSupporto } from '../derived.js';
import { COMPARE, cmpKey, saveCompare } from '../compare.js';
import { loader, errorBox } from '../ui.js';

/* Righe del confronto, nell'ordine in cui vengono mostrate */
const ROW_KEYS = [
  'Categoria', 'Processore', 'RAM', 'Schermo', 'Batteria', 'Cassa', 'Connettività', 'Archiviazione',
  'Presentazione', 'Periodo di vendita', 'Software', 'Prezzo $', 'Prezzo reale €', 'Aumento medio %'
];

/* Un modello ha più righe (una per taglio): qui si condensa in una scheda sola,
   con i prezzi espressi come intervallo min–max fra i tagli. */
function aggregateModel(slug, modello) {
  const rows = rowsForModel(slug, modello);
  if (!rows.length) return null;
  const r0 = rows[0];
  const realPrices = rows.map(r => num(r.prezzo_reale_eur)).filter(v => v != null);
  const usdPrices = rows.map(r => num(r.prezzo_lancio_usd)).filter(v => v != null);
  const aums = rows.map(aumento).filter(v => v != null);
  const range = (arr, fmt) => !arr.length ? '—'
    : (Math.min(...arr) === Math.max(...arr) ? fmt(arr[0]) : fmt(Math.min(...arr)) + ' – ' + fmt(Math.max(...arr)));
  const annoV = anniVendita(r0.periodo_vendita), annoS = anniSupporto(r0);

  return {
    slug, modello, cat: r0.__cat,
    fields: {
      'Categoria': r0.__cat,
      'Processore': r0.processore,
      'RAM': r0.ram,
      'Schermo': r0.schermo,
      'Batteria': r0.batteria,
      'Cassa': r0.dimensione_cassa,
      'Connettività': r0.connettivita,
      'Archiviazione': rows.map(r => r.archiviazione).filter(Boolean).join(', '),
      'Presentazione': r0.data_presentazione,
      'Prezzo reale €': range(realPrices, fmtEur),
      'Prezzo $': range(usdPrices, fmtUsd),
      'Aumento medio %': aums.length ? fmtPct(aums.reduce((a, b) => a + b, 0) / aums.length) : '—',
      'Periodo di vendita': r0.periodo_vendita + (annoV ? ` (~${annoV} ${annoV === 1 ? 'anno' : 'anni'})` : ''),
      'Software': r0.software + (annoS != null ? ` (${annoS} ${annoS === 1 ? 'anno' : 'anni'} sw)` : '')
    }
  };
}

export function viewCompare() {
  loader();
  ensureAllActive().then(() => {
    const items = [...COMPARE]
      .map(k => { const [slug, modello] = k.split('|||'); return aggregateModel(slug, modello); })
      .filter(Boolean);

    if (!items.length) {
      app().innerHTML = `<div class="empty"><div class="big">⚖️</div><h2>Nessun modello da confrontare</h2>
        <p class="muted">Apri una categoria e usa la casella ✓ (o il pulsante “Aggiungi al confronto”) per selezionare fino a 4 modelli.</p></div>`;
      return;
    }

    const rowKeys = ROW_KEYS.filter(k => items.some(it => !isNA(it.fields[k])));

    app().innerHTML = `
      <div class="section-head"><div class="eyebrow">⚖️ Confronto</div><h1>${items.length} modelli a confronto</h1></div>
      <div class="cmp-table-wrap"><table class="cmp">
        <thead><tr><th>Caratteristica</th>${items.map(it =>
          `<th>${esc(it.modello)}<button class="cmp-remove" data-key="${esc(cmpKey(it.slug, it.modello))}" title="Rimuovi">✕</button><div class="muted" style="font-size:12px;font-weight:400">${esc(it.cat)}</div></th>`).join('')}</tr></thead>
        <tbody>${rowKeys.map(k =>
          `<tr><th>${esc(k)}</th>${items.map(it => `<td>${isNA(it.fields[k]) ? '<span class="cell-na">—</span>' : esc(it.fields[k])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;

    document.querySelectorAll('.cmp-remove').forEach(b => b.addEventListener('click', () => {
      COMPARE.delete(b.dataset.key);
      saveCompare();
      viewCompare();
    }));
  }).catch(errorBox);
}
