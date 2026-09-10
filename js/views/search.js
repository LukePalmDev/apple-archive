import { app, esc, num, fmtEur } from '../utils.js';
import { CATS, DATA, CAT_EMOJI } from '../state.js';
import { ensureAllActive } from '../data.js';
import { loader, errorBox } from '../ui.js';

export function viewSearch(q) {
  q = (q || '').trim();
  loader();
  ensureAllActive().then(() => {
    const ql = q.toLowerCase();

    const groups = CATS.filter(c => DATA[c.slug]).map(c => {
      const matched = DATA[c.slug].filter(r =>
        Object.keys(r).some(k => !k.startsWith('__') && r[k] && String(r[k]).toLowerCase().includes(ql)));
      /* un risultato per modello, non uno per taglio */
      const seen = new Set(), models = [];
      matched.forEach(r => { if (!seen.has(r.modello)) { seen.add(r.modello); models.push(r); } });
      return { cat: c, models };
    }).filter(g => g.models.length);

    if (!q) {
      app().innerHTML = `<div class="empty"><div class="big">🔍</div><h2>Cerca nell'archivio</h2><p class="muted">Scrivi un modello, un chip o una caratteristica.</p></div>`;
      return;
    }
    if (!groups.length) {
      app().innerHTML = `<div class="empty"><div class="big">🔍</div><h2>Nessun risultato per “${esc(q)}”</h2></div>`;
      return;
    }

    app().innerHTML = `<div class="section-head"><div class="eyebrow">🔍 Ricerca</div><h1>Risultati per “${esc(q)}”</h1></div>` +
      groups.map(g => `
        <div class="sr-group">
          <h2>${CAT_EMOJI[g.cat.slug] || '🍎'} ${esc(g.cat.nome)} <span class="result-count">${g.models.length}</span></h2>
          <div class="table-wrap"><table class="grid"><tbody>${g.models.map(r =>
            `<tr data-slug="${esc(g.cat.slug)}" data-modello="${esc(r.modello)}">
              <td class="cell-model">${esc(r.modello)}</td>
              <td>${esc(r.processore || '')}</td><td>${esc(r.schermo || '')}</td>
              <td class="col-num">${fmtEur(num(r.prezzo_reale_eur))}</td>
              <td><span class="badge">${esc(r.software || '')}</span></td></tr>`).join('')}</tbody></table></div>
        </div>`).join('');

    document.querySelectorAll('.sr-group tr').forEach(tr => tr.addEventListener('click', () => {
      location.hash = '#/modello/' + encodeURIComponent(tr.dataset.slug) + '/' + encodeURIComponent(tr.dataset.modello);
    }));
  }).catch(errorBox);
}
