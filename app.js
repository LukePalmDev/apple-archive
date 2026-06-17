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

/* ---- Statistiche ---- */
function viewStat(slug, metric) {
  slug = slug || 'iphone';
  metric = metric || 'anni';
  loader();
  ensureAllActive().then(() => {
    const activeCats = CATS.filter(c => /^s[iì]$/i.test(c.attiva || '') && DATA[c.slug]);
    const cat = catBySlug(slug) || activeCats[0];
    if (!cat) { errorBox({ message: 'Nessuna categoria attiva.' }); return; }
    slug = cat.slug;

    const metrics = {
      anni: { label: 'Supporto software', unit: 'anni', value: rows => anniSupporto(rows[0]) },
      vendita: { label: 'Anni di vendita', unit: 'anni', value: rows => anniVendita(rows[0].periodo_vendita) },
      prezzo: { label: 'Prezzo minimo reale', unit: '€', value: rows => {
        const vals = rows.map(r => num(r.prezzo_reale_eur)).filter(v => v != null);
        return vals.length ? Math.min(...vals) : null;
      } },
      aumento: { label: 'Aumento medio sul teorico', unit: '%', value: rows => {
        const vals = rows.map(aumento).filter(v => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      } }
    };
    const m = metrics[metric] ? metric : 'anni';
    const meta = metrics[m];

    const grouped = new Map();
    DATA[slug].forEach(r => {
      if (!grouped.has(r.modello)) grouped.set(r.modello, []);
      grouped.get(r.modello).push(r);
    });
    const rows = [...grouped.entries()].map(([modello, modelRows]) => ({
      modello,
      value: meta.value(modelRows),
      date: parseMese(modelRows[0].data_commercializzazione)
    })).filter(r => r.value != null);
    rows.sort((a, b) => b.value - a.value || (a.date ? a.date.y * 12 + a.date.m : 0) - (b.date ? b.date.y * 12 + b.date.m : 0));

    const top = rows.slice(0, 18);
    const max = top.length ? Math.max(...top.map(r => Math.abs(r.value))) : 0;
    const fmtVal = v => {
      if (m === 'prezzo') return fmtEur(v);
      if (m === 'aumento') return fmtPct(v);
      return Math.round(v) + ' ' + (Math.round(v) === 1 ? 'anno' : 'anni');
    };
    const bars = top.length ? top.map(r => {
      const pct = max ? Math.max(2, Math.abs(r.value) / max * 100) : 0;
      return `<div class="bar-row">
        <div class="bar-label" title="${esc(r.modello)}">${esc(r.modello)}</div>
        <div class="bar-track"><div class="bar-fill ${m === 'prezzo' ? 'c-blue' : ''}" style="width:${pct.toFixed(2)}%"></div></div>
        <div class="bar-val">${esc(fmtVal(r.value))}</div>
      </div>`;
    }).join('') : '<div class="stat-empty">Nessun dato disponibile.</div>';

    const catControls = activeCats.map(c =>
      `<a class="seg-item ${c.slug === slug ? 'on' : ''}" href="#/stat/${encodeURIComponent(c.slug)}/${encodeURIComponent(m)}">${esc(c.nome)}</a>`).join('');
    const metricControls = Object.keys(metrics).map(k =>
      `<a class="seg-item ${k === m ? 'on' : ''}" href="#/stat/${encodeURIComponent(slug)}/${encodeURIComponent(k)}">${esc(metrics[k].label)}</a>`).join('');

    app().innerHTML = `
      <div class="section-head">
        <div class="eyebrow">Statistiche</div>
        <h1>${esc(cat.nome)}</h1>
      </div>
      <div class="stat-controls">
        <div class="seg">${catControls}</div>
        <span class="stat-spacer"></span>
        <div class="seg">${metricControls}</div>
      </div>
      <section class="chart-card">
        <h2 class="chart-title">${esc(meta.label)}</h2>
        <p class="chart-sub">Classifica per modello, usando i dati aggregati dalle configurazioni disponibili.</p>
        <div class="bars">${bars}</div>
        <div class="chart-note">I modelli senza valore numerico per questa metrica sono esclusi dal grafico.</div>
      </section>`;
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
