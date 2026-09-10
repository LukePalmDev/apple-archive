/* ============================================================
   Stati comuni delle viste: caricamento ed errore
   ============================================================ */

import { app, esc } from './utils.js';

export function loader(msg) {
  app().innerHTML = `<div class="loader"><div class="spinner"></div>${esc(msg || 'Caricamento…')}</div>`;
}

export function errorBox(e) {
  app().innerHTML = `<div class="empty"><div class="big">⚠️</div><h2>Impossibile caricare i dati</h2>
    <p class="muted">${esc(e && e.message ? e.message : e)}</p>
    <p class="muted">Se stai aprendo il file con doppio clic, avvia un piccolo server locale:<br>
    <code>python3 -m http.server</code> e apri <code>http://localhost:8000</code>.</p></div>`;
}
