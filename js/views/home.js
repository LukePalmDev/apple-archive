import { app, esc } from '../utils.js';
import { CATS, DATA, CAT_EMOJI } from '../state.js';
import { ensureAllActive, isAttiva } from '../data.js';
import { loader, errorBox } from '../ui.js';

export function viewHome() {
  loader();
  ensureAllActive().then(() => {
    const totModelli = new Set();
    const totConfig = CATS.reduce((a, c) => a + (DATA[c.slug] ? DATA[c.slug].length : 0), 0);
    CATS.forEach(c => (DATA[c.slug] || []).forEach(r => totModelli.add(c.slug + r.modello)));

    const tiles = CATS.map(c => {
      const attiva = isAttiva(c);
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
        <p class="lead">Sfoglia e confronta in modo rapido le caratteristiche tecniche dei prodotti Apple. Dati liberi, in semplici file CSV.</p>
        <div class="home-stats">
          <div class="stat"><div class="stat-num">${totModelli.size}</div><div class="stat-lbl">modelli</div></div>
          <div class="stat"><div class="stat-num">${totConfig}</div><div class="stat-lbl">configurazioni</div></div>
          <div class="stat"><div class="stat-num">${CATS.filter(isAttiva).length}</div><div class="stat-lbl">categorie</div></div>
        </div>
      </section>
      <div class="tiles">${tiles}</div>`;
  }).catch(errorBox);
}
