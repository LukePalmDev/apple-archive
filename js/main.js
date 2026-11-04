/* ============================================================
   Archivio Apple — punto di ingresso
   Vanilla JS a moduli · hash routing · dati da CSV (PapaParse)
   ============================================================ */

import { $, esc } from './utils.js';
import { CATS } from './state.js';
import { ensureCats, isAttiva } from './data.js';
import { updateComparePill } from './compare.js';
import { router } from './router.js';

function buildNav() {
  const cats = CATS.filter(isAttiva)
    .map(c => `<a href="#/cat/${encodeURIComponent(c.slug)}" data-slug="${esc(c.slug)}">${esc(c.nome)}</a>`).join('');
  $('#main-nav').innerHTML = cats + `<a href="#/stat/iphone/anni" data-route="stat">Statistiche</a>`;
}

function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  const btn = $('#theme-toggle');
  if (btn) btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.removeAttribute('media');
    m.setAttribute('content', dark ? '#000000' : '#f5f5f7');
  });
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* modalità privata */ }
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(dark);
  $('#theme-toggle').addEventListener('click', () => {
    const d = document.body.classList.toggle('dark');
    applyTheme(d);
    try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch (e) { /* ignora */ }
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
  ensureCats().then(buildNav).catch(() => { /* la vista mostrerà l'errore */ });
  window.addEventListener('hashchange', router);
  router();
}

/* I moduli sono deferred: il DOM può essere già pronto quando arriviamo qui */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
