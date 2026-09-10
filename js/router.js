/* ============================================================
   Routing client-side su hash: #/sezione/param/param
   ============================================================ */

import { viewHome } from './views/home.js';
import { viewCategory } from './views/category.js';
import { viewModel } from './views/model.js';
import { viewCompare } from './views/compare.js';
import { viewSearch } from './views/search.js';
import { viewStat } from './views/stats.js';

function setActiveNav(parts) {
  document.querySelectorAll('#main-nav a').forEach(a => {
    const isCat = parts[0] === 'cat' && a.dataset.slug === parts[1];
    const isStat = parts[0] === 'stat' && a.dataset.route === 'stat';
    a.classList.toggle('active', isCat || isStat);
  });
}

export function router() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);
  setActiveNav(parts);
  window.scrollTo(0, 0);

  switch (parts[0]) {
    case 'cat':       return viewCategory(parts[1]);
    case 'modello':   return viewModel(parts[1], parts[2]);
    case 'confronto': return viewCompare();
    case 'ricerca':   return viewSearch(parts.slice(1).join('/'));
    case 'stat':      return viewStat(parts[1], parts[2]);
    case 'home':
    default:          return viewHome();
  }
}
