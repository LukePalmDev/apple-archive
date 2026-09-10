/* ============================================================
   Componenti grafici, in HTML/SVG inline: nessuna libreria,
   i colori seguono il tema tramite le classi CSS.
   ============================================================ */

import { esc } from './utils.js';

export function barsHTML(items) {
  if (!items.length) return '<div class="stat-empty">Dati non disponibili.</div>';
  return '<div class="bars">' + items.map(it => `
    <div class="bar-row">
      <div class="bar-label" title="${esc(it.label)}">${esc(it.label)}</div>
      <div class="bar-track"><div class="bar-fill ${it.live ? 'live' : ''}" style="width:${(Math.max(it.frac, 0) * 100).toFixed(1)}%"></div></div>
      <div class="bar-val">${it.valHtml}</div>
    </div>`).join('') + '</div>';
}

export function legendHTML(series) {
  return '<div class="legend">' + series.filter(s => s.points.length).map(s =>
    `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${esc(s.name)}</span>`).join('') + '</div>';
}

export function lineChartSVG(series, prefix) {
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
    if (ord.length > 1) {
      lines += `<polyline class="lc-line" points="${ord.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" stroke="${s.color}"/>`;
    }
    lines += ord.map(p =>
      `<circle class="lc-dot" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${ord.length > 1 ? 3.2 : 4.5}" fill="${s.color}"><title>${esc(s.name)} · ${p.x}: ${prefix}${p.y}</title></circle>`).join('');
  });

  return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafico a linee">${grid}${xlab}${lines}</svg>`;
}
