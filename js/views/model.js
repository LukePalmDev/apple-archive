import { $, app, esc, titlecase, isNA, num, fmtEur, fmtUsd, fmtPct } from '../utils.js';
import { CAT_EMOJI, LABELS } from '../state.js';
import { ensureCategory, catBySlug, rowsForModel } from '../data.js';
import { teorico, aumento, anniVendita, anniSupporto } from '../derived.js';
import { toggleCompare, isCompared } from '../compare.js';
import { loader, errorBox } from '../ui.js';

const PRICE_KEYS = new Set(['prezzo_lancio_usd', 'cambio_usd_eur', 'prezzo_reale_eur']);
const SKIP = new Set(['oggetto', 'modello', 'fonti']);
/* Valori che distinguono una configurazione, in quest'ordine nel titolo della card */
const LABEL_KEYS = ['archiviazione', 'dimensione_cassa', 'connettivita', 'custodia', 'ram', 'schermo'];
const TAIL_KEYS = ['data_presentazione', 'data_commercializzazione', 'periodo_vendita', 'software'];

function same(rows, key) {
  const a = rows[0][key];
  return rows.every(r => r[key] === a);
}

function specCard(label, html) {
  return `<div class="spec-card"><div class="k">${esc(label)}</div><div class="v">${html}</div></div>`;
}

export function viewModel(slug, modello) {
  loader();
  ensureCategory(slug).then(() => {
    const rows = rowsForModel(slug, modello);
    if (!rows.length) { errorBox({ message: 'Modello non trovato.' }); return; }

    const cat = catBySlug(slug), r0 = rows[0];
    const headers = Object.keys(r0).filter(h => !h.startsWith('__') && !SKIP.has(h));
    const varying = headers.filter(k => !same(rows, k));
    const labelKey = k => LABELS[k] || titlecase(k);

    /* Specifiche uguali su tutte le configurazioni. Quelle che cambiano
       (RAM per taglio, cassa, custodia, date diverse…) stanno sulle card. */
    const specKeys = headers
      .filter(k => !PRICE_KEYS.has(k) && !varying.includes(k) && !isNA(r0[k]))
      .sort((a, b) => (TAIL_KEYS.includes(a) ? 1 : 0) - (TAIL_KEYS.includes(b) ? 1 : 0) || TAIL_KEYS.indexOf(a) - TAIL_KEYS.indexOf(b));

    const specCards = specKeys.map(k => {
      if (k === 'periodo_vendita') {
        const annoV = anniVendita(r0.periodo_vendita);
        return specCard(labelKey(k), `${esc(r0.periodo_vendita)}${annoV ? ` <small>· ~${annoV} ${annoV === 1 ? 'anno' : 'anni'}</small>` : ''}`);
      }
      if (k === 'software') {
        const annoS = anniSupporto(r0);
        return specCard(labelKey(k), `${esc(r0.software)}${annoS != null ? ` <small>· ${annoS} ${annoS === 1 ? 'anno' : 'anni'} di supporto</small>` : ''}`);
      }
      return specCard(labelKey(k), esc(r0[k]));
    }).join('');

    const multiAxis = varying.some(k => !PRICE_KEYS.has(k) && k !== 'archiviazione');
    const prices = rows.map(r => {
      const a = aumento(r), t = teorico(r);
      const titleParts = [];
      LABEL_KEYS.forEach(k => {
        if (!varying.includes(k) || isNA(r[k])) return;
        const v = String(r[k]);
        titleParts.push(k === 'ram' ? 'RAM ' + v : v);
      });
      if (!titleParts.length && !isNA(r.archiviazione)) titleParts.push(String(r.archiviazione));
      const extra = varying
        .filter(k => !PRICE_KEYS.has(k) && !LABEL_KEYS.includes(k) && !isNA(r[k]))
        .map(k => labelKey(k) + ': ' + r[k]);
      return `<div class="price-card">
        <div class="cap">${esc(titleParts.join(' · ') || 'Configurazione')}</div>
        <div class="eur">${fmtEur(num(r.prezzo_reale_eur))}</div>
        <div class="usd">${fmtUsd(num(r.prezzo_lancio_usd))} · teorico ${fmtEur(t)} ${a != null ? `· <span class="pct ${a >= 0 ? 'up' : 'down'}">${fmtPct(a)}</span>` : ''}</div>
        ${extra.length ? `<div class="extra">${esc(extra.join(' · '))}</div>` : ''}
      </div>`;
    }).join('');

    const fonti = Array.isArray(r0.fonti) ? r0.fonti.filter(Boolean) : [];
    const fontiHTML = fonti.length ? `
      <h2>Fonti</h2>
      <ul class="fonti-list">${fonti.map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></li>`).join('')}</ul>` : '';

    app().innerHTML = `
      <a class="back-link" href="#/cat/${encodeURIComponent(slug)}">← ${esc(cat.nome)}</a>
      <div class="detail-head">
        <div><div class="eyebrow">${CAT_EMOJI[slug] || '🍎'} ${esc(cat.nome)}</div><h1>${esc(modello)}</h1></div>
        <button class="chip-btn ${isCompared(slug, modello) ? 'on' : ''}" id="detail-cmp" type="button">${isCompared(slug, modello) ? '✓ Nel confronto' : '+ Aggiungi al confronto'}</button>
      </div>
      <h2>Specifiche</h2>
      <div class="spec-grid">${specCards}</div>
      <h2>${multiAxis ? 'Prezzi di lancio per configurazione' : 'Prezzi di lancio per taglio'}</h2>
      <div class="price-strip">${prices}</div>
      ${fontiHTML}`;

    $('#detail-cmp').addEventListener('click', e => {
      toggleCompare(slug, modello);
      const on = isCompared(slug, modello);
      e.currentTarget.classList.toggle('on', on);
      e.currentTarget.textContent = on ? '✓ Nel confronto' : '+ Aggiungi al confronto';
    });
  }).catch(errorBox);
}
