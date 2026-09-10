import { $, app, esc, fmtPlain } from '../utils.js';
import { CATS, CAT_EMOJI } from '../state.js';
import { ensureCats, ensureCategory, catBySlug, isAttiva } from '../data.js';
import { barsHTML, legendHTML, lineChartSVG } from '../charts.js';
import { statAnni, statSoftware, statGrafici, priceMatrix, capLabel } from '../aggregate.js';
import { loader, errorBox } from '../ui.js';

function statCard(title, sub, inner) {
  return `<div class="chart-card"><h2 class="chart-title">${esc(title)}</h2><p class="chart-sub">${esc(sub)}</p>${inner}</div>`;
}

function renderPrezzi(rows) {
  const body = $('#stat-body');
  let cur = 'eur';

  function draw() {
    const { caps, models } = priceMatrix(rows, cur);
    const sym = cur === 'eur' ? '€' : '$';
    const head = `<tr><th class="sticky-col">Modello</th><th class="yr">Anno</th>` +
      caps.map(c => `<th class="col-num">${esc(capLabel(c))}</th>`).join('') + `</tr>`;
    const bodyRows = models.map(m =>
      `<tr style="--rt:${m.tint}"><th class="sticky-col">${esc(m.modello)}</th><td class="yr">${m.year || ''}</td>` +
      caps.map(c => `<td class="col-num">${m.byCap[c] != null ? fmtPlain(m.byCap[c]) : ''}</td>`).join('') + `</tr>`).join('');

    body.innerHTML = `<div class="chart-card">
      <div class="chart-head">
        <div><h2 class="chart-title">Prezzi per taglio di archiviazione</h2>
        <p class="chart-sub">Una riga per modello, una colonna per capacità. Valori in ${sym}; bande di colore per generazione. Celle vuote = taglio non offerto o prezzo non disponibile.</p></div>
        <div class="seg" id="prezzi-cur">
          <button class="seg-item ${cur === 'eur' ? 'on' : ''}" data-cur="eur">EUR €</button>
          <button class="seg-item ${cur === 'usd' ? 'on' : ''}" data-cur="usd">USD $</button>
        </div>
      </div>
      ${caps.length
        ? `<div class="table-wrap"><table class="matrix"><thead>${head}</thead><tbody>${bodyRows}</tbody></table></div>`
        : '<div class="stat-empty">Dati non disponibili.</div>'}
    </div>`;

    $('#prezzi-cur').addEventListener('click', e => {
      const b = e.target.closest('[data-cur]');
      if (!b) return;
      cur = b.dataset.cur;
      draw();
    });
  }

  draw();
}

function renderStatBody(slug, tab, rows) {
  const body = $('#stat-body');
  if (tab === 'anni') {
    body.innerHTML = statCard('Anni di commercializzazione',
      'Per quanti anni Apple ha tenuto a listino ogni modello (dal campo “periodo di vendita”). In rosso i modelli ancora in vendita.',
      barsHTML(statAnni(rows)));

  } else if (tab === 'software') {
    body.innerHTML = statCard('Anni di supporto software',
      'Anni tra l’uscita e l’ultima versione major del sistema operativo supportata.',
      barsHTML(statSoftware(rows)));

  } else if (tab === 'prezzi') {
    renderPrezzi(rows);

  } else if (tab === 'grafici') {
    const { prime, seconde } = statGrafici(rows);
    body.innerHTML =
      statCard('Prime generazioni · 2007–2016',
        'Prezzo di lancio in USD del taglio minimo del modello base, anno per anno: un solo iPhone “principale” all’anno.',
        lineChartSVG(prime, '$')) +
      statCard('Seconde generazioni · 2017–oggi',
        'Dal 2017 la gamma si divide in più segmenti. Prezzo USD del taglio minimo per ciascun segmento, anno per anno.',
        legendHTML(seconde) + lineChartSVG(seconde, '$'));
  }
}

export function viewStat(slug, tab) {
  slug = slug || 'iphone';
  loader();
  ensureCats().then(() => {
    let cat = catBySlug(slug);
    if (!isAttiva(cat)) { slug = 'iphone'; cat = catBySlug('iphone'); }

    return ensureCategory(slug).then(rows => {
      const tabs = [{ k: 'anni', n: 'Anni' }, { k: 'software', n: 'Software' }, { k: 'prezzi', n: 'Prezzi' }];
      if (slug === 'iphone') tabs.push({ k: 'grafici', n: 'Grafici' });
      if (!tabs.some(t => t.k === tab)) tab = 'anni';

      const activeCats = CATS.filter(isAttiva);
      const catSeg = activeCats.map(c =>
        `<button class="seg-item ${c.slug === slug ? 'on' : ''}" data-slug="${esc(c.slug)}">${CAT_EMOJI[c.slug] || ''} ${esc(c.nome)}</button>`).join('');
      const tabSeg = tabs.map(t =>
        `<button class="seg-item ${t.k === tab ? 'on' : ''}" data-tab="${t.k}">${esc(t.n)}</button>`).join('');

      app().innerHTML = `
        <div class="section-head"><div class="eyebrow">📊 Statistiche</div><h1>${esc(cat.nome)}</h1></div>
        <div class="stat-controls">
          <div class="seg" id="stat-cat">${catSeg}</div>
          <span class="stat-spacer"></span>
          <div class="seg" id="stat-tab">${tabSeg}</div>
        </div>
        <div id="stat-body"></div>`;

      renderStatBody(slug, tab, rows);

      $('#stat-cat').addEventListener('click', e => {
        const b = e.target.closest('[data-slug]');
        if (!b) return;
        let nt = tab;
        if (b.dataset.slug !== 'iphone' && tab === 'grafici') nt = 'anni';
        location.hash = `#/stat/${encodeURIComponent(b.dataset.slug)}/${nt}`;
      });
      $('#stat-tab').addEventListener('click', e => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        location.hash = `#/stat/${encodeURIComponent(slug)}/${b.dataset.tab}`;
      });
    });
  }).catch(errorBox);
}
