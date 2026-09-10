import { $, app, esc, titlecase, isNA, num, fmtEur, fmtUsd, fmtPct } from '../utils.js';
import { CAT_EMOJI, LABELS } from '../state.js';
import { ensureCategory, catBySlug, rowsForModel } from '../data.js';
import { teorico, aumento, anniVendita, anniSupporto } from '../derived.js';
import { toggleCompare, isCompared } from '../compare.js';
import { loader, errorBox } from '../ui.js';

/* Campi che non sono "specifiche": identità, date e prezzi hanno un posto loro */
const NON_SPEC = new Set([
  'oggetto', 'modello', 'data_presentazione', 'data_commercializzazione',
  'prezzo_lancio_usd', 'cambio_usd_eur', 'prezzo_reale_eur',
  'archiviazione', 'periodo_vendita', 'software'
]);

export function viewModel(slug, modello) {
  loader();
  ensureCategory(slug).then(() => {
    const rows = rowsForModel(slug, modello);
    if (!rows.length) { errorBox({ message: 'Modello non trovato.' }); return; }

    const cat = catBySlug(slug), r0 = rows[0];
    const headers = Object.keys(r0).filter(h => !h.startsWith('__'));
    const annoV = anniVendita(r0.periodo_vendita), annoS = anniSupporto(r0);

    /* Tutte le specifiche valorizzate, incluse le colonne extra della categoria */
    const specKeys = headers.filter(k => !NON_SPEC.has(k) && !isNA(r0[k]));
    const specCards = specKeys.map(k =>
      `<div class="spec-card"><div class="k">${esc(LABELS[k] || titlecase(k))}</div><div class="v">${esc(r0[k])}</div></div>`).join('') + `
      <div class="spec-card"><div class="k">Presentazione</div><div class="v">${esc(r0.data_presentazione || '—')}</div></div>
      <div class="spec-card"><div class="k">Periodo di vendita</div><div class="v">${esc(r0.periodo_vendita || '—')} ${annoV ? `<small>· ~${annoV} ${annoV === 1 ? 'anno' : 'anni'}</small>` : ''}</div></div>
      <div class="spec-card"><div class="k">Software</div><div class="v">${esc(r0.software || '—')} ${annoS != null ? `<small>· ${annoS} ${annoS === 1 ? 'anno' : 'anni'} di supporto</small>` : ''}</div></div>`;

    const prices = rows.map(r => {
      const a = aumento(r), t = teorico(r);
      return `<div class="price-card">
        <div class="cap">${esc(r.archiviazione || '')}</div>
        <div class="eur">${fmtEur(num(r.prezzo_reale_eur))}</div>
        <div class="usd">${fmtUsd(num(r.prezzo_lancio_usd))} · teorico ${fmtEur(t)} ${a != null ? `· <span class="pct ${a >= 0 ? 'up' : 'down'}">${fmtPct(a)}</span>` : ''}</div>
      </div>`;
    }).join('');

    app().innerHTML = `
      <a class="back-link" href="#/cat/${encodeURIComponent(slug)}">← ${esc(cat.nome)}</a>
      <div class="detail-head">
        <div><div class="eyebrow">${CAT_EMOJI[slug] || '🍎'} ${esc(cat.nome)}</div><h1>${esc(modello)}</h1></div>
        <button class="chip-btn ${isCompared(slug, modello) ? 'on' : ''}" id="detail-cmp">${isCompared(slug, modello) ? '✓ Nel confronto' : '+ Aggiungi al confronto'}</button>
      </div>
      <h2>Specifiche</h2>
      <div class="spec-grid">${specCards}</div>
      <h2>Prezzi di lancio per taglio</h2>
      <div class="price-strip">${prices}</div>`;

    $('#detail-cmp').addEventListener('click', e => {
      toggleCompare(slug, modello);
      const on = isCompared(slug, modello);
      e.target.classList.toggle('on', on);
      e.target.textContent = on ? '✓ Nel confronto' : '+ Aggiungi al confronto';
    });
  }).catch(errorBox);
}
