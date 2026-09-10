import { $, app, esc } from '../utils.js';
import { CAT_EMOJI } from '../state.js';
import { ensureCategory, catBySlug } from '../data.js';
import { columnsFor } from '../columns.js';
import { toggleCompare, isCompared } from '../compare.js';
import { loader, errorBox } from '../ui.js';

/* Tabella densa: filtro testuale, ordinamento per colonna, selezione confronto */
export function viewCategory(slug) {
  loader();
  ensureCategory(slug).then(rows => {
    const cat = catBySlug(slug);
    if (!rows.length) {
      app().innerHTML = `<div class="empty"><div class="big">${CAT_EMOJI[slug] || '🍎'}</div>
        <h2>${esc(cat.nome)}</h2><p class="muted">Nessun dato in archivio per questa categoria.</p></div>`;
      return;
    }
    const cols = columnsFor(rows);
    const state = { filter: '', sortKey: null, sortDir: 1 };

    /* Il promemoria sul "?" compare solo se in questa categoria ce n'è almeno uno */
    const daVerificare = rows.some(r => Object.keys(r).some(k => !k.startsWith('__') && r[k] === '?'));
    const notice = daVerificare
      ? `<div class="notice">Alcuni valori sono ancora <code>?</code>: dato non verificato su una fonte attendibile. <code>n.d.</code> indica invece un dato non applicabile a questo prodotto.</div>`
      : '';

    app().innerHTML = `
      <div class="section-head">
        <div class="eyebrow">${CAT_EMOJI[slug] || '🍎'} Archivio</div>
        <h1>${esc(cat.nome)}</h1>
      </div>
      ${notice}
      <div class="toolbar">
        <input type="text" class="filter" id="cat-filter" placeholder="Filtra (modello, chip, taglio…)" />
        <span class="grow"></span>
        <button class="chip-btn" id="cat-compare">Vai al confronto →</button>
        <span class="result-count" id="cat-count"></span>
      </div>
      <div class="table-wrap">
        <table class="grid"><thead><tr>${cols.map(c =>
          `<th data-key="${c.key}" class="${c.cls}${c.sortable ? '' : ' nosort'}">${esc(c.label)}${c.sortable ? ' <span class="arrow">↕</span>' : ''}</th>`).join('')}</tr></thead>
          <tbody id="cat-body"></tbody></table>
      </div>`;

    const body = $('#cat-body'), countEl = $('#cat-count');

    function apply() {
      const q = state.filter.toLowerCase();
      let view = rows.filter(r => !q || cols.some(c => {
        if (c.key.startsWith('__cmp')) return false;
        const v = r[c.key];
        return v && String(v).toLowerCase().includes(q);
      }) || r.modello.toLowerCase().includes(q));

      if (state.sortKey) {
        const col = cols.find(c => c.key === state.sortKey);
        view = view.slice().sort((a, b) => {
          const va = col.sortVal(a), vb = col.sortVal(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (typeof va === 'string') return va.localeCompare(vb) * state.sortDir;
          return (va - vb) * state.sortDir;
        });
      }

      body.innerHTML = view.map(r =>
        `<tr data-modello="${esc(r.modello)}">${cols.map(c => `<td class="${c.cls}">${c.html(r)}</td>`).join('')}</tr>`).join('');
      countEl.textContent = view.length + ' di ' + rows.length;

      document.querySelectorAll('#app thead th').forEach(th => {
        const k = th.dataset.key, a = th.querySelector('.arrow');
        th.classList.toggle('sorted', k === state.sortKey);
        if (a) a.textContent = k === state.sortKey ? (state.sortDir === 1 ? '↑' : '↓') : '↕';
      });
    }

    $('#cat-filter').addEventListener('input', e => { state.filter = e.target.value; apply(); });
    $('#cat-compare').addEventListener('click', () => { location.hash = '#/confronto'; });

    $('#app thead').addEventListener('click', e => {
      const th = e.target.closest('th');
      if (!th || th.classList.contains('nosort')) return;
      const k = th.dataset.key;
      if (state.sortKey === k) state.sortDir *= -1;
      else { state.sortKey = k; state.sortDir = 1; }
      apply();
    });

    body.addEventListener('click', e => {
      const cb = e.target.closest('.cmp-check');
      if (cb) {
        toggleCompare(cb.dataset.slug, cb.dataset.modello);
        cb.checked = isCompared(cb.dataset.slug, cb.dataset.modello);
        e.stopPropagation();
        return;
      }
      const tr = e.target.closest('tr');
      if (!tr) return;
      location.hash = '#/modello/' + encodeURIComponent(slug) + '/' + encodeURIComponent(tr.dataset.modello);
    });

    apply();
  }).catch(errorBox);
}
