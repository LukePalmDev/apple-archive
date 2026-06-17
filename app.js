/* ============================================================
   Archivio Apple — app
   Vanilla JS · hash routing · dati da CSV (PapaParse)
   ============================================================ */

'use strict';

/* ---------- Stato globale ---------- */
const CATS = [];               // [{slug, nome, file, attiva}]
const DATA = {};               // slug -> [rows]  (ogni row arricchita con __slug, __cat)
const COMPARE = loadCompare(); // Set di chiavi "slug|||modello"
const CAT_EMOJI = { iphone: '📱', ipad: '📲', 'apple-watch': '⌚️', 'apple-tv': '📺', cuffie: '🎧', mac: '💻' };

/* ---------- Etichette colonne note ---------- */
const LABELS = {
  oggetto: 'Oggetto', modello: 'Modello',
  data_presentazione: 'Presentazione', data_commercializzazione: 'Uscita',
  prezzo_lancio_usd: 'Prezzo $', cambio_usd_eur: 'Cambio $→€', prezzo_reale_eur: 'Prezzo reale €',
  processore: 'Processore', ram: 'RAM', archiviazione: 'Archiviazione',
  schermo: 'Schermo', batteria: 'Batteria', periodo_vendita: 'Periodo di vendita', software: 'Software',
  dimensione_cassa: 'Cassa', connettivita: 'Connettività'
};
const KNOWN = Object.keys(LABELS);

/* ---------- Mappe versioni OS -> anno di uscita ---------- */
const IOS_YEAR = {1:2007,2:2008,3:2009,4:2010,5:2011,6:2012,7:2013,8:2014,9:2015,10:2016,11:2017,12:2018,13:2019,14:2020,15:2021,16:2022,17:2023,18:2024,26:2025};
const WATCHOS_YEAR = {1:2015,2:2015,3:2016,4:2017,5:2018,6:2019,7:2020,8:2021,9:2022,10:2023,11:2024,26:2025};

/* ============================================================
   Utility
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const app = () => $('#app');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function titlecase(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function isNA(v) { return v == null || v === '' || v === '?' || /^n\.d\.$/i.test(String(v).trim()); }
function num(v) { if (isNA(v)) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; }

function fmtEur(n) { return n == null ? '—' : '€' + Math.round(n).toLocaleString('it-IT'); }
function fmtUsd(n) { return n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'); }
function fmtPct(n) { return n == null ? '—' : (n >= 0 ? '+' : '') + n.toFixed(0) + '%'; }

/* ---------- Valori derivati ---------- */
function teorico(row) { const u = num(row.prezzo_lancio_usd), c = num(row.cambio_usd_eur); return (u != null && c != null) ? u * c * 1.22 : null; }
function aumento(row) { const t = teorico(row), r = num(row.prezzo_reale_eur); return (t != null && r != null && t > 0) ? (r - t) / t * 100 : null; }

function parseMese(s) { const m = /(\d{1,2})\/(\d{4})/.exec(s || ''); return m ? { m: +m[1], y: +m[2] } : null; }
function parsePeriodo(s) {
  if (isNA(s)) return null;
  const parts = String(s).split(/[-–]/).map(p => p.trim());
  const start = parseMese(parts[0]);
  if (!start) return null;
  let end;
  const rawEnd = (parts[1] || '').toLowerCase();
  if (/presente|oggi|in vendita/.test(rawEnd)) { const d = new Date(); end = { m: d.getMonth() + 1, y: d.getFullYear() }, end.present = true; }
  else end = parseMese(parts[1]);
  return end ? { start, end } : { start, end: null };
}
function anniVendita(s) {
  const p = parsePeriodo(s); if (!p || !p.end) return null;
  const mesi = (p.end.y - p.start.y) * 12 + (p.end.m - p.start.m);
  return Math.max(1, Math.round(mesi / 12));
}
function lastOsYear(s) {
  const m = /([A-Za-z]+)\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(s || '');
  if (!m) return null;
  const plat = m[1].toLowerCase();
  const major = +(m[3] || m[2]);
  const map = plat.indexOf('watch') >= 0 ? WATCHOS_YEAR : IOS_YEAR;
  return map[major] || null;
}
function anniSupporto(row) {
  const comm = parseMese(row.data_commercializzazione);
  const last = lastOsYear(row.software);
  if (!comm || last == null) return null;
  return Math.max(0, last - comm.y);
}

/* ============================================================
   Compare (lista confronto, persistita)
   ============================================================ */
function cmpKey(slug, modello) { return slug + '|||' + modello; }
function loadCompare() {
  try { return new Set(JSON.parse(localStorage.getItem('cmp') || '[]')); } catch (e) { return new Set(); }
}
function saveCompare() {
  localStorage.setItem('cmp', JSON.stringify([...COMPARE]));
  updateComparePill();
}
function isCompared(slug, modello) { return COMPARE.has(cmpKey(slug, modello)); }
function toggleCompare(slug, modello) {
  const k = cmpKey(slug, modello);
  if (COMPARE.has(k)) COMPARE.delete(k);
  else { if (COMPARE.size >= 4) { alert('Puoi confrontare al massimo 4 modelli.'); return false; } COMPARE.add(k); }
  saveCompare();
  return true;
}
function updateComparePill() {
  const pill = $('#compare-pill'), count = $('#compare-count');
  count.textContent = COMPARE.size;
  pill.hidden = COMPARE.size === 0;
}

/* ============================================================
   Caricamento dati
   ============================================================ */
function fetchText(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); });
}
function parseCSV(text) {
  return Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data;
}
let _catsPromise = null;          // promise condivisa (evita doppio caricamento concorrente)
const _catPromise = {};           // promise per categoria
function ensureCats() {
  if (CATS.length) return Promise.resolve(CATS);
  if (_catsPromise) return _catsPromise;
  _catsPromise = fetchText('data/categories.csv').then(t => {
    parseCSV(t).forEach(r => CATS.push(r));
    return CATS;
  });
  return _catsPromise;
}
function catBySlug(slug) { return CATS.find(c => c.slug === slug); }
function ensureCategory(slug) {
  if (DATA[slug]) return Promise.resolve(DATA[slug]);
  if (_catPromise[slug]) return _catPromise[slug];
  _catPromise[slug] = ensureCats().then(() => {
    const cat = catBySlug(slug);
    if (!cat) throw new Error('Categoria sconosciuta: ' + slug);
    return fetchText('data/' + cat.file).then(t => {
      const rows = parseCSV(t).filter(r => r.modello);
      rows.forEach(r => { r.__slug = slug; r.__cat = cat.nome; });
      DATA[slug] = rows;
      return rows;
    });
  });
  return _catPromise[slug];
}
function ensureAllActive() {
  return ensureCats().then(() => Promise.all(
    CATS.filter(c => /^s[iì]$/i.test(c.attiva || '')).map(c => ensureCategory(c.slug))
  ));
}
function rowsForModel(slug, modello) { return (DATA[slug] || []).filter(r => r.modello === modello); }

/* ============================================================
   Colonne tabella
   ============================================================ */
function columnsFor(rows) {
  const headers = Object.keys(rows[0]).filter(h => !h.startsWith('__'));
  const cols = [];
  cols.push({ key: '__cmp', label: '', sortable: false, cls: '',
    html: r => `<input type="checkbox" class="cmp-check" data-modello="${esc(r.modello)}" data-slug="${esc(r.__slug)}" ${isCompared(r.__slug, r.modello) ? 'checked' : ''} aria-label="Aggiungi al confronto">` });
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
  cols.push({ key: '__teorico', label: 'Teorico €', sortable: true, cls: 'col-num',
    html: r => fmtEur(teorico(r)), sortVal: r => teorico(r) });
  cols.push(numCol('prezzo_reale_eur', r => fmtEur(num(r.prezzo_reale_eur)), r => num(r.prezzo_reale_eur)));
  cols.push({ key: '__aumento', label: 'Aumento %', sortable: true, cls: 'col-num',
    html: r => { const a = aumento(r); if (a == null) return '<span class="cell-na">—</span>'; return `<span class="pct ${a >= 0 ? 'up' : 'down'}">${fmtPct(a)}</span>`; },
    sortVal: r => aumento(r) });
  cols.push({ key: 'periodo_vendita', label: LABELS.periodo_vendita, sortable: true, cls: '',
    html: r => { const a = anniVendita(r.periodo_vendita); return `${esc(r.periodo_vendita || '—')}${a ? ` <span class="badge soft">~${a} ${a === 1 ? 'anno' : 'anni'}</span>` : ''}`; },
    sortVal: r => { const p = parsePeriodo(r.periodo_vendita); return p ? p.start.y * 12 + p.start.m : null; } });
  cols.push({ key: 'software', label: LABELS.software, sortable: true, cls: '',
    html: r => { const s = anniSupporto(r); return `<span class="badge">${esc(r.software || '—')}</span>${s != null ? ` <span class="badge soft">${s} ${s === 1 ? 'anno' : 'anni'} sw</span>` : ''}`; },
    sortVal: r => lastOsYear(r.software) });
  cols.push(textCol('data_commercializzazione'));
  return cols;
}
function textCol(key, cls) {
  return { key, label: LABELS[key] || titlecase(key), sortable: true, cls: cls || '',
    html: r => isNA(r[key]) ? '<span class="cell-na">—</span>' : esc(r[key]),
    sortVal: r => (r[key] || '').toLowerCase() };
}
function numCol(key, html, sortVal) {
  return { key, label: LABELS[key] || titlecase(key), sortable: true, cls: 'col-num', html, sortVal };
}

/* ============================================================
   Router
   ============================================================ */
function router() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);
  setActiveNav(parts);
  window.scrollTo(0, 0);
  switch (parts[0]) {
    case 'cat': return viewCategory(parts[1]);
    case 'modello': return viewModel(parts[1], parts[2]);
    case 'confronto': return viewCompare();
    case 'ricerca': return viewSearch(parts.slice(1).join('/'));
    case 'stat': return viewStat(parts[1], parts[2]);
    case 'home':
    default: return viewHome();
  }
}
function setActiveNav(parts) {
  document.querySelectorAll('#main-nav a').forEach(a => {
    const isCat = parts[0] === 'cat' && a.dataset.slug === parts[1];
    const isStat = parts[0] === 'stat' && a.dataset.route === 'stat';
    a.classList.toggle('active', isCat || isStat);
  });
}

/* ============================================================
   Viste
   ============================================================ */
function loader(msg) { app().innerHTML = `<div class="loader"><div class="spinner"></div>${esc(msg || 'Caricamento…')}</div>`; }
function errorBox(e) {
  app().innerHTML = `<div class="empty"><div class="big">⚠️</div><h2>Impossibile caricare i dati</h2>
    <p class="muted">${esc(e.message || e)}</p>
    <p class="muted">Se stai aprendo il file con doppio clic, avvia un piccolo server locale:<br>
    <code>python3 -m http.server</code> e apri <code>http://localhost:8000</code>.</p></div>`;
}

/* ---- Home ---- */
function viewHome() {
  loader();
  ensureAllActive().then(() => {
    const totModelli = new Set(), totConfig = CATS.reduce((a, c) => a + (DATA[c.slug] ? DATA[c.slug].length : 0), 0);
    CATS.forEach(c => (DATA[c.slug] || []).forEach(r => totModelli.add(c.slug + r.modello)));
    const tiles = CATS.map(c => {
      const attiva = /^s[iì]$/i.test(c.attiva || '');
      const n = DATA[c.slug] ? new Set(DATA[c.slug].map(r => r.modello)).size : 0;
      const inner = `
        <span class="tile-emoji">${CAT_EMOJI[c.slug] || '🍎'}</span>
        <span class="tile-name">${esc(c.nome)}</span>
        <span class="tile-meta">${attiva ? n + ' modelli · ' + (DATA[c.slug] ? DATA[c.slug].length : 0) + ' configurazioni' : 'In arrivo'}</span>
        ${attiva ? '' : '<span class="tile-soon">presto</span>'}`;
      return attiva
        ? `<a class="tile" href="#/cat/${encodeURIComponent(c.slug)}">${inner}</a>`
        : `<div class="tile" aria-disabled="true">${inner}</div>`;
    }).join('');
    app().innerHTML = `
      <section class="hero">
        <div class="eyebrow">Archivio aperto</div>
        <h1>Ogni prodotto Apple,<br>specifiche e prezzi a confronto.</h1>
        <p class="lead">Sfoglia e confronta in modo rapido le caratteristiche tecniche di iPhone, iPad e Apple Watch. Dati liberi, in semplici file CSV.</p>
        <div class="home-stats">
          <div class="stat"><div class="stat-num">${totModelli.size}</div><div class="stat-lbl">modelli</div></div>
          <div class="stat"><div class="stat-num">${totConfig}</div><div class="stat-lbl">configurazioni</div></div>
          <div class="stat"><div class="stat-num">${CATS.filter(c => /^s[iì]$/i.test(c.attiva)).length}</div><div class="stat-lbl">categorie</div></div>
        </div>
      </section>
      <div class="tiles">${tiles}</div>`;
  }).catch(errorBox);
}

/* ---- Categoria (tabella densa, ordinabile, filtrabile) ---- */
function viewCategory(slug) {
  loader();
  ensureCategory(slug).then(rows => {
    const cat = catBySlug(slug);
    const cols = columnsFor(rows);
    const state = { filter: '', sortKey: null, sortDir: 1 };

    app().innerHTML = `
      <div class="section-head">
        <div class="eyebrow">${CAT_EMOJI[slug] || '🍎'} Archivio</div>
        <h1>${esc(cat.nome)}</h1>
      </div>
      <div class="notice">Dati storici monetari (cambio e prezzi €) best-effort: il simbolo <code>?</code> indica un valore da verificare. Specifiche, date e software sono affidabili.</div>
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
        const v = r[c.key]; return v && String(v).toLowerCase().includes(q);
      }) || r.modello.toLowerCase().includes(q));
      if (state.sortKey) {
        const col = cols.find(c => c.key === state.sortKey);
        view = view.slice().sort((a, b) => {
          let va = col.sortVal(a), vb = col.sortVal(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1; if (vb == null) return -1;
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
      const th = e.target.closest('th'); if (!th || th.classList.contains('nosort')) return;
      const k = th.dataset.key;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = 1; }
      apply();
    });
    body.addEventListener('click', e => {
      const cb = e.target.closest('.cmp-check');
      if (cb) { toggleCompare(cb.dataset.slug, cb.dataset.modello); cb.checked = isCompared(cb.dataset.slug, cb.dataset.modello); e.stopPropagation(); return; }
      const tr = e.target.closest('tr'); if (!tr) return;
      location.hash = '#/modello/' + encodeURIComponent(slug) + '/' + encodeURIComponent(tr.dataset.modello);
    });
    apply();
  }).catch(errorBox);
}

/* ---- Dettaglio modello ---- */
function viewModel(slug, modello) {
  loader();
  ensureCategory(slug).then(() => {
    const rows = rowsForModel(slug, modello);
    if (!rows.length) { errorBox({ message: 'Modello non trovato.' }); return; }
    const cat = catBySlug(slug), r0 = rows[0];
    const headers = Object.keys(r0).filter(h => !h.startsWith('__'));
    const annoV = anniVendita(r0.periodo_vendita), annoS = anniSupporto(r0);

    const specKeys = ['processore', 'ram', 'schermo', 'batteria', 'dimensione_cassa', 'connettivita']
      .filter(k => headers.includes(k) && !isNA(r0[k]));
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

/* ---- Confronto ---- */
function aggregateModel(slug, modello) {
  const rows = rowsForModel(slug, modello);
  if (!rows.length) return null;
  const r0 = rows[0];
  const realPrices = rows.map(r => num(r.prezzo_reale_eur)).filter(v => v != null);
  const usdPrices = rows.map(r => num(r.prezzo_lancio_usd)).filter(v => v != null);
  const aums = rows.map(aumento).filter(v => v != null);
  const range = (arr, fmt) => !arr.length ? '—' : (Math.min(...arr) === Math.max(...arr) ? fmt(arr[0]) : fmt(Math.min(...arr)) + ' – ' + fmt(Math.max(...arr)));
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
function viewCompare() {
  loader();
  ensureAllActive().then(() => {
    const items = [...COMPARE].map(k => { const [slug, modello] = k.split('|||'); return aggregateModel(slug, modello); }).filter(Boolean);
    if (!items.length) {
      app().innerHTML = `<div class="empty"><div class="big">⚖️</div><h2>Nessun modello da confrontare</h2>
        <p class="muted">Apri una categoria e usa la casella ✓ (o il pulsante “Aggiungi al confronto”) per selezionare fino a 4 modelli.</p></div>`;
      return;
    }
    const rowKeys = ['Categoria', 'Processore', 'RAM', 'Schermo', 'Batteria', 'Cassa', 'Connettività', 'Archiviazione',
      'Presentazione', 'Periodo di vendita', 'Software', 'Prezzo $', 'Prezzo reale €', 'Aumento medio %']
      .filter(k => items.some(it => !isNA(it.fields[k])));
    app().innerHTML = `
      <div class="section-head"><div class="eyebrow">⚖️ Confronto</div><h1>${items.length} modelli a confronto</h1></div>
      <div class="cmp-table-wrap"><table class="cmp">
        <thead><tr><th>Caratteristica</th>${items.map(it =>
          `<th>${esc(it.modello)}<button class="cmp-remove" data-key="${esc(cmpKey(it.slug, it.modello))}" title="Rimuovi">✕</button><div class="muted" style="font-size:12px;font-weight:400">${esc(it.cat)}</div></th>`).join('')}</tr></thead>
        <tbody>${rowKeys.map(k =>
          `<tr><th>${esc(k)}</th>${items.map(it => `<td>${isNA(it.fields[k]) ? '<span class="cell-na">—</span>' : esc(it.fields[k])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    document.querySelectorAll('.cmp-remove').forEach(b => b.addEventListener('click', () => {
      COMPARE.delete(b.dataset.key); saveCompare(); viewCompare();
    }));
  }).catch(errorBox);
}

/* ---- Ricerca globale ---- */
function viewSearch(q) {
  q = (q || '').trim();
  loader();
  ensureAllActive().then(() => {
    const ql = q.toLowerCase();
    const groups = CATS.filter(c => DATA[c.slug]).map(c => {
      const matched = DATA[c.slug].filter(r => Object.keys(r).some(k => !k.startsWith('__') && r[k] && String(r[k]).toLowerCase().includes(ql)));
      // raggruppa per modello (mostra un risultato per modello)
      const seen = new Set(), models = [];
      matched.forEach(r => { if (!seen.has(r.modello)) { seen.add(r.modello); models.push(r); } });
      return { cat: c, models };
    }).filter(g => g.models.length);
    if (!q) { app().innerHTML = `<div class="empty"><div class="big">🔍</div><h2>Cerca nell'archivio</h2><p class="muted">Scrivi un modello, un chip o una caratteristica.</p></div>`; return; }
    if (!groups.length) { app().innerHTML = `<div class="empty"><div class="big">🔍</div><h2>Nessun risultato per “${esc(q)}”</h2></div>`; return; }
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

/* ============================================================
   Statistiche
   ============================================================ */
const SEGMENTS = [
  { key: 'Base',        name: 'Base',            color: '#0a84ff' },
  { key: 'Plus / Air',  name: 'Plus / Air',      color: '#30c8c0' },
  { key: 'mini',        name: 'mini',            color: '#34c759' },
  { key: 'Pro',         name: 'Pro',             color: '#bf5af2' },
  { key: 'Pro Max',     name: 'Pro Max',         color: '#ff375f' },
  { key: 'Budget',      name: 'Budget (SE / e)', color: '#ff9f0a' }
];
function iphoneSegment(m) {
  const s = String(m).toLowerCase().trim();
  if (/pro\s*max/.test(s) || /xs\s*max/.test(s)) return 'Pro Max';
  if (/pro/.test(s) || s === 'xs' || s === 'x') return 'Pro';
  if (/plus/.test(s) || /\bair\b/.test(s) || s === 'air') return 'Plus / Air';
  if (/mini/.test(s)) return 'mini';
  if (/\bse\b/.test(s) || /\d+e$/.test(s) || s === '5c') return 'Budget';
  return 'Base'; // numerati base + XR
}
function uniqueModels(rows) {
  const map = new Map();
  rows.forEach(r => { if (!map.has(r.modello)) map.set(r.modello, []); map.get(r.modello).push(r); });
  return [...map.entries()].map(([modello, rs]) => ({ modello, rows: rs, r0: rs[0] }));
}
function commKey(r) { const m = parseMese(r.data_commercializzazione); return m ? m.y * 12 + m.m : 0; }
function capGB(s) { const m = /([\d.]+)\s*(GB|TB)/i.exec(s || ''); if (!m) return null; let v = parseFloat(m[1]); if (/tb/i.test(m[2])) v *= 1024; return v; }
function capLabel(gb) { return gb >= 1024 ? (gb % 1024 === 0 ? gb / 1024 : (gb / 1024).toFixed(1)) + ' TB' : gb + ' GB'; }

/* ---- componenti grafici (HTML/SVG, theme-aware) ---- */
function barsHTML(items) {
  if (!items.length) return '<div class="stat-empty">Dati non disponibili.</div>';
  return '<div class="bars">' + items.map(it => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(it.label)}">${esc(it.label)}</div>
      <div class="bar-track"><div class="bar-fill ${it.live ? 'live' : ''}" style="width:${(Math.max(it.frac, 0) * 100).toFixed(1)}%"></div></div>
      <div class="bar-val">${it.valHtml}</div>
    </div>`).join('') + '</div>';
}
function legendHTML(series) {
  return '<div class="legend">' + series.filter(s => s.points.length).map(s =>
    `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${esc(s.name)}</span>`).join('') + '</div>';
}
function lineChartSVG(series, prefix) {
  prefix = prefix || '$';
  const pts = series.flatMap(s => s.points);
  if (!pts.length) return '<div class="stat-empty">Dati non disponibili.</div>';
  const years = [...new Set(pts.map(p => p.x))].sort((a, b) => a - b);
  const minX = years[0], maxX = years[years.length - 1];
  const maxVal = Math.max(...pts.map(p => p.y));
  const niceMax = Math.max(200, Math.ceil(maxVal / 200) * 200);
  const W = 820, H = 380, P = { l: 56, r: 20, t: 16, b: 36 };
  const innerW = W - P.l - P.r, innerH = H - P.t - P.b;
  const X = x => P.l + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * innerW;
  const Y = v => P.t + innerH - (v / niceMax) * innerH;
  let grid = '';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = niceMax / steps * i, y = Y(v);
    grid += `<line class="grid" x1="${P.l}" y1="${y.toFixed(1)}" x2="${W - P.r}" y2="${y.toFixed(1)}"/>` +
      `<text class="axis-label" x="${P.l - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${prefix}${Math.round(v)}</text>`;
  }
  let xlab = '';
  const skip = years.length > 12 ? 2 : 1;
  years.forEach((yr, i) => {
    if (i % skip !== 0 && i !== years.length - 1) return;
    xlab += `<text class="axis-label" x="${X(yr).toFixed(1)}" y="${H - 12}" text-anchor="middle">${yr}</text>`;
  });
  let lines = '';
  series.forEach(s => {
    const ord = s.points.slice().sort((a, b) => a.x - b.x);
    if (ord.length > 1) lines += `<polyline class="lc-line" points="${ord.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" stroke="${s.color}"/>`;
    lines += ord.map(p => `<circle class="lc-dot" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${ord.length > 1 ? 3.2 : 4.5}" fill="${s.color}"><title>${esc(s.name)} · ${p.x}: ${prefix}${p.y}</title></circle>`).join('');
  });
  return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafico a linee">${grid}${xlab}${lines}</svg>`;
}

/* ---- aggregatori (tutto calcolato live dai CSV) ---- */
function statAnni(rows) {
  const m = uniqueModels(rows).map(u => ({ modello: u.modello, r0: u.r0, anni: anniVendita(u.r0.periodo_vendita), present: /presente|oggi|in vendita/i.test(u.r0.periodo_vendita || '') }))
    .filter(u => u.anni != null).sort((a, b) => commKey(a.r0) - commKey(b.r0));
  if (!m.length) return [];
  const max = Math.max(...m.map(x => x.anni));
  return m.map(x => ({ label: x.modello, frac: x.anni / max, live: x.present, valHtml: `${x.anni} ${x.anni === 1 ? 'anno' : 'anni'}${x.present ? ' <small>· in vendita</small>' : ''}` }));
}
function statSoftware(rows) {
  const m = uniqueModels(rows).map(u => ({ modello: u.modello, r0: u.r0, anni: anniSupporto(u.r0) }))
    .filter(u => u.anni != null).sort((a, b) => commKey(a.r0) - commKey(b.r0));
  if (!m.length) return [];
  const max = Math.max(...m.map(x => x.anni), 1);
  return m.map(x => ({ label: x.modello, frac: x.anni / max, valHtml: `${x.anni} ${x.anni === 1 ? 'anno' : 'anni'} <small>· ${esc(x.r0.software || '')}</small>` }));
}
function statPrezzi(rows, cur) {
  const field = cur === 'eur' ? 'prezzo_reale_eur' : 'prezzo_lancio_usd';
  const g = new Map();
  rows.forEach(r => { const gb = capGB(r.archiviazione), v = num(r[field]); if (gb != null && v != null) { const o = g.get(gb) || { s: 0, n: 0 }; o.s += v; o.n++; g.set(gb, o); } });
  const arr = [...g.entries()].map(([gb, o]) => ({ gb, avg: o.s / o.n })).sort((a, b) => a.gb - b.gb);
  if (!arr.length) return [];
  const max = Math.max(...arr.map(a => a.avg)), fmt = cur === 'eur' ? fmtEur : fmtUsd;
  return arr.map(a => ({ label: capLabel(a.gb), frac: a.avg / max, valHtml: fmt(a.avg) }));
}
function statGrafici(rows) {
  const models = uniqueModels(rows).map(u => {
    const mm = parseMese(u.r0.data_commercializzazione);
    const prices = u.rows.map(r => num(r.prezzo_lancio_usd)).filter(v => v != null);
    return { modello: u.modello, year: mm ? mm.y : null, seg: iphoneSegment(u.modello), minUsd: prices.length ? Math.min(...prices) : null };
  }).filter(u => u.year != null && u.minUsd != null);
  const primePts = models.filter(u => u.seg === 'Base' && u.year <= 2016).map(u => ({ x: u.year, y: u.minUsd })).sort((a, b) => a.x - b.x);
  const prime = [{ name: 'iPhone (modello base)', color: '#0a84ff', points: primePts }];
  const seconde = SEGMENTS.map(s => {
    const byYear = new Map();
    models.filter(u => u.seg === s.key && u.year >= 2017).forEach(u => {
      const c = byYear.get(u.year); if (c == null || u.minUsd < c) byYear.set(u.year, u.minUsd);
    });
    return { name: s.name, color: s.color, points: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([x, y]) => ({ x, y })) };
  }).filter(s => s.points.length);
  return { prime, seconde };
}

/* ---- vista ---- */
function statCard(title, sub, inner) {
  return `<div class="chart-card"><h2 class="chart-title">${esc(title)}</h2><p class="chart-sub">${esc(sub)}</p>${inner}</div>`;
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
function renderPrezzi(rows) {
  const body = $('#stat-body');
  let cur = 'usd';
  function draw() {
    const items = statPrezzi(rows, cur);
    body.innerHTML = `<div class="chart-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div><h2 class="chart-title">Prezzo medio per taglio</h2>
        <p class="chart-sub">Prezzo medio di lancio per ogni capacità di archiviazione nella categoria.</p></div>
        <div class="seg" id="prezzi-cur">
          <button class="seg-item ${cur === 'usd' ? 'on' : ''}" data-cur="usd">USD $</button>
          <button class="seg-item ${cur === 'eur' ? 'on' : ''}" data-cur="eur">EUR €</button>
        </div>
      </div>
      ${barsHTML(items)}
    </div>`;
    $('#prezzi-cur').addEventListener('click', e => { const b = e.target.closest('[data-cur]'); if (!b) return; cur = b.dataset.cur; draw(); });
  }
  draw();
}
function viewStat(slug, tab) {
  slug = slug || 'iphone';
  loader();
  ensureCats().then(() => {
    let cat = catBySlug(slug);
    if (!cat || !/^s[iì]$/i.test(cat.attiva || '')) { slug = 'iphone'; cat = catBySlug('iphone'); }
    return ensureCategory(slug).then(rows => {
      const tabs = [{ k: 'anni', n: 'Anni' }, { k: 'software', n: 'Software' }, { k: 'prezzi', n: 'Prezzi' }];
      if (slug === 'iphone') tabs.push({ k: 'grafici', n: 'Grafici' });
      if (!tabs.some(t => t.k === tab)) tab = 'anni';
      const activeCats = CATS.filter(c => /^s[iì]$/i.test(c.attiva || ''));
      const catSeg = activeCats.map(c => `<button class="seg-item ${c.slug === slug ? 'on' : ''}" data-slug="${esc(c.slug)}">${CAT_EMOJI[c.slug] || ''} ${esc(c.nome)}</button>`).join('');
      const tabSeg = tabs.map(t => `<button class="seg-item ${t.k === tab ? 'on' : ''}" data-tab="${t.k}">${esc(t.n)}</button>`).join('');
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
        const b = e.target.closest('[data-slug]'); if (!b) return;
        let nt = tab; if (b.dataset.slug !== 'iphone' && tab === 'grafici') nt = 'anni';
        location.hash = `#/stat/${encodeURIComponent(b.dataset.slug)}/${nt}`;
      });
      $('#stat-tab').addEventListener('click', e => {
        const b = e.target.closest('[data-tab]'); if (!b) return;
        location.hash = `#/stat/${encodeURIComponent(slug)}/${b.dataset.tab}`;
      });
    });
  }).catch(errorBox);
}

/* ============================================================
   Navbar, tema, init
   ============================================================ */
function buildNav() {
  const cats = CATS.filter(c => /^s[iì]$/i.test(c.attiva || ''))
    .map(c => `<a href="#/cat/${encodeURIComponent(c.slug)}" data-slug="${esc(c.slug)}">${esc(c.nome)}</a>`).join('');
  $('#main-nav').innerHTML = cats + `<a href="#/stat/iphone/anni" data-route="stat">Statistiche</a>`;
}
function initTheme() {
  const saved = localStorage.getItem('theme');
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark', dark);
  $('#theme-toggle').addEventListener('click', () => {
    const d = document.body.classList.toggle('dark');
    localStorage.setItem('theme', d ? 'dark' : 'light');
  });
}
function initSearch() {
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    location.hash = q ? '#/ricerca/' + encodeURIComponent(q) : '#/home';
  });
}
function start() {
  initTheme();
  initSearch();
  updateComparePill();
  ensureCats().then(buildNav).catch(() => {});
  window.addEventListener('hashchange', router);
  router();
}

document.addEventListener('DOMContentLoaded', start);
