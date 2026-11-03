// Gráficas redibujadas con los mismos datos del cuaderno (log de entrenamiento y tabla de prueba).
const W = 800, H = 480, M = { l: 70, r: 26, t: 28, b: 62 };
const fmt = (v, d = 2) => v.toFixed(d).replace('.', ',');

function axes(xt, yt, xl, yl) {
  let s = '';
  yt.forEach(([v, y]) => { s += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"/><text class="tick" x="${M.l - 10}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; });
  xt.forEach(([v, x]) => { s += `<line class="grid v" x1="${x}" x2="${x}" y1="${M.t}" y2="${H - M.b}"/><text class="tick" x="${x}" y="${H - M.b + 22}" text-anchor="middle">${v}</text>`; });
  s += `<line class="axis" x1="${M.l}" x2="${W - M.r}" y1="${H - M.b}" y2="${H - M.b}"/><line class="axis" x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${H - M.b}"/>`;
  s += `<text class="label" x="${(M.l + W - M.r) / 2}" y="${H - 14}" text-anchor="middle">${xl}</text>`;
  s += `<text class="label" transform="translate(18 ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle">${yl}</text>`;
  return s;
}

export async function drawChart(name) {
  if (name === 'map') {
    const rows = await (await fetch('js/train_log.json?v=1')).json();
    const y0 = 0.6, y1 = 1.0, ex = (e) => M.l + ((e - 1) / 141) * (W - M.l - M.r), ey = (v) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
    const pts = rows.map((r) => `${ex(r.e).toFixed(1)},${ey(r.m5095).toFixed(1)}`).join(' ');
    const best = rows.find((r) => r.e === 129);
    const yt = [0.6, 0.7, 0.8, 0.9, 1.0].map((v) => [v, ey(v)]), xt = [1, 25, 50, 75, 100, 129, 142].map((e) => [e, ex(e)]);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de mAP50-95 por época">${axes(xt, yt, 'Época', 'mAP50-95 (validación)')}
      <polyline class="line" points="${pts}"/>
      <circle class="best" cx="${ex(best.e)}" cy="${ey(best.m5095)}" r="7"/>
      <text class="note" x="${ex(best.e) - 10}" y="${ey(best.m5095) - 16}" text-anchor="end">mejor: época 129, ${fmt(best.m5095, 3)}</text>
      <text class="note" x="${ex(1) + 12}" y="${ey(0.625)}">época 1: 0,650</text></svg>`;
  }
  if (name === 'clases') {
    const data = [['100_k', 0.895], ['10_k', 0.984], ['20_k', 0.959], ['2_k', 0.934], ['50_k', 0.949], ['5_k', 0.965]];
    const y0 = 0.8, y1 = 1.0, ey = (v) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
    const bw = (W - M.l - M.r) / data.length;
    let s = axes([], [0.8, 0.85, 0.9, 0.95, 1.0].map((v) => [v, ey(v)]), 'Clase', 'mAP50-95 (prueba), eje desde 0,80');
    data.forEach(([c, v], i) => {
      const x = M.l + i * bw + bw * 0.18, w = bw * 0.64, weak = c === '100_k';
      s += `<rect class="bar${weak ? ' weak' : ''}" x="${x}" y="${ey(v)}" width="${w}" height="${H - M.b - ey(v)}" rx="6"/>
            <text class="val" x="${x + w / 2}" y="${ey(v) - 8}" text-anchor="middle">${fmt(v, 3)}</text>
            <text class="tick" x="${x + w / 2}" y="${H - M.b + 22}" text-anchor="middle">${c}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="mAP50-95 por clase en prueba">${s}</svg>`;
  }
  return '';
}
