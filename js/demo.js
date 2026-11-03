// Demostración en el navegador: best.onnx con onnxruntime-web (wasm), sin subir la imagen a ningún servidor.
const NAMES = ['100_k', '10_k', '20_k', '2_k', '50_k', '5_k'];
const VALUE = { '100_k': 100000, '10_k': 10000, '20_k': 20000, '2_k': 2000, '50_k': 50000, '5_k': 5000 };
const COLOR = { '2_k': '#4f8fdc', '5_k': '#f08a2c', '10_k': '#3f7ae0', '20_k': '#3ec46d', '50_k': '#8b5cf6', '100_k': '#e8b923' };
const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
let sessionPromise = null;

function loadOrt() {
  if (window.ort) return Promise.resolve(window.ort);
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = ORT_URL + 'ort.min.js';
    s.onload = () => { window.ort.env.wasm.wasmPaths = ORT_URL; window.ort.env.wasm.numThreads = 1; res(window.ort); };
    s.onerror = () => rej(new Error('No se pudo cargar onnxruntime-web'));
    document.head.appendChild(s);
  });
}
function getSession() {
  if (!sessionPromise) sessionPromise = loadOrt().then((ort) => ort.InferenceSession.create('models/best.onnx', { executionProviders: ['wasm'] }));
  return sessionPromise;
}
const iou = (a, b) => {
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1), x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return i / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - i);
};
function decode(data, conf, scale, padX, padY) {
  const N = 8400, out = [];
  for (let i = 0; i < N; i++) {
    let best = 0, cls = 0;
    for (let c = 0; c < 6; c++) { const v = data[(4 + c) * N + i]; if (v > best) { best = v; cls = c; } }
    if (best < conf) continue;
    const cx = data[i], cy = data[N + i], w = data[2 * N + i], h = data[3 * N + i];
    out.push({ x1: (cx - w / 2 - padX) / scale, y1: (cy - h / 2 - padY) / scale, x2: (cx + w / 2 - padX) / scale, y2: (cy + h / 2 - padY) / scale, s: best, c: cls });
  }
  out.sort((a, b) => b.s - a.s);
  const keep = [];
  for (const d of out) if (keep.every((k) => k.c !== d.c || iou(k, d) < 0.45)) keep.push(d);
  return keep;
}

export function initDemo(root) {
  root.innerHTML = `<div class="demo">
    <div class="demo-stage"><canvas class="demo-canvas" width="640" height="400" aria-label="Imagen con las detecciones"></canvas>
      <p class="demo-empty">Aún no hay imagen</p></div>
    <div class="demo-side">
      <div class="demo-actions"><label class="btn primary">Subir imagen<input type="file" accept="image/*" hidden></label>
        <button class="btn" type="button" data-sample>Probar con un ejemplo</button></div>
      <label class="demo-conf">Umbral de confianza <output>0,40</output><input type="range" min="0.2" max="0.9" step="0.05" value="0.4"></label>
      <p class="demo-status" role="status">El modelo se carga al elegir una imagen (9,4 MB).</p>
      <ul class="demo-list"></ul><p class="demo-total"></p></div></div>`;
  const $ = (s) => root.querySelector(s);
  const canvas = $('.demo-canvas'), ctx = canvas.getContext('2d'), status = $('.demo-status'), list = $('.demo-list'), total = $('.demo-total');
  let img = null, last = null;

  function paint(dets) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H);
    const fs = Math.max(13, Math.round(W / 46)); ctx.font = `600 ${fs}px Prompt, system-ui, sans-serif`; ctx.lineWidth = Math.max(2, W / 320);
    const sx = W / img.naturalWidth, sy = H / img.naturalHeight;
    dets.forEach((d) => {
      const n = NAMES[d.c], x = d.x1 * sx, y = d.y1 * sy, w = (d.x2 - d.x1) * sx, h = (d.y2 - d.y1) * sy, col = COLOR[n];
      ctx.strokeStyle = col; ctx.strokeRect(x, y, w, h);
      const t = `${n} ${d.s.toFixed(2).replace('.', ',')}`, tw = ctx.measureText(t).width + 12;
      ctx.fillStyle = col; ctx.fillRect(x - 1, Math.max(0, y - fs - 8), tw, fs + 8);
      ctx.fillStyle = '#fff'; ctx.fillText(t, x + 5, Math.max(fs + 1, y - 6));
    });
    list.innerHTML = dets.map((d) => `<li><i style="background:${COLOR[NAMES[d.c]]}"></i>${NAMES[d.c]}<b>${d.s.toFixed(2).replace('.', ',')}</b></li>`).join('') || '<li>Sin detecciones con este umbral</li>';
    const sum = dets.reduce((a, d) => a + VALUE[NAMES[d.c]], 0);
    total.textContent = dets.length ? `Total detectado: $${sum.toLocaleString('es-CO')}` : '';
  }
  async function run() {
    if (!img) return;
    status.textContent = 'Cargando el modelo...';
    try {
      const sess = await getSession(), ort = window.ort;
      status.textContent = 'Detectando...';
      const S = 640, sc = Math.min(S / img.naturalWidth, S / img.naturalHeight), nw = Math.round(img.naturalWidth * sc), nh = Math.round(img.naturalHeight * sc);
      const px = (S - nw) / 2, py = (S - nh) / 2;
      const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
      g.fillStyle = 'rgb(114,114,114)'; g.fillRect(0, 0, S, S); g.drawImage(img, px, py, nw, nh);
      const d = g.getImageData(0, 0, S, S).data, f = new Float32Array(3 * S * S);
      for (let i = 0; i < S * S; i++) { f[i] = d[4 * i] / 255; f[S * S + i] = d[4 * i + 1] / 255; f[2 * S * S + i] = d[4 * i + 2] / 255; }
      const t0 = performance.now();
      const res = await sess.run({ images: new ort.Tensor('float32', f, [1, 3, S, S]) });
      const ms = Math.round(performance.now() - t0);
      last = { data: res.output0.data, sc, px, py };
      redraw(); status.textContent = `Listo en ${ms} ms en tu navegador.`;
    } catch (e) { status.textContent = 'No se pudo ejecutar el modelo: ' + e.message; }
  }
  function redraw() {
    if (!last) return;
    paint(decode(last.data, parseFloat($('input[type=range]').value), last.sc, last.px, last.py));
  }
  function setImage(src) {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      img = im; const r = im.naturalWidth / im.naturalHeight, W = 960; canvas.width = W; canvas.height = Math.round(W / r);
      root.querySelector('.demo-empty').hidden = true; ctx.drawImage(im, 0, 0, canvas.width, canvas.height); run();
    };
    im.src = src;
  }
  $('input[type=file]').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setImage(URL.createObjectURL(f)); });
  $('[data-sample]').addEventListener('click', () => setImage('img/ejemplo-prueba.jpg?v=1'));
  $('input[type=range]').addEventListener('input', (e) => { $('output').textContent = parseFloat(e.target.value).toFixed(2).replace('.', ','); redraw(); });
}
