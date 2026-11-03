import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { slides, CLASS_COLOR } from './slides.js';
import { drawChart } from './charts.js';
import { initDemo } from './demo.js';

const VER = 8;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const SLIDE_VH = 1.25; // alto del recorrido de cada diapositiva, en alturas de ventana

// ---------- renderer ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);

const worlds = { interior: new THREE.Group(), exterior: new THREE.Group() };
scene.add(worlds.interior, worlds.exterior);
worlds.exterior.visible = false;

// luces
{
  const hi = new THREE.HemisphereLight(0xfff1d8, 0x4a3320, 1.1);
  const key = new THREE.DirectionalLight(0xfff0dc, 1.4); key.position.set(3, 6, 6);
  const lamp = new THREE.PointLight(0xffd9a0, 28, 14, 2); lamp.position.set(0, 3.0, -0.4);
  worlds.interior.add(hi, key, lamp);
  const hx = new THREE.HemisphereLight(0xd6ecff, 0x7a9a58, 1.25);
  const sun = new THREE.DirectionalLight(0xfff2d6, 2.6); sun.position.set(-30, 50, 30);
  worlds.exterior.add(hx, sun);
}
// cielo del exterior
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5aa6e6'); gr.addColorStop(0.55, '#a9d4f2'); gr.addColorStop(1, '#eaf5fb');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.rotation.y = 0; worlds.exterior.add(sky);
}
const BG = { interior: new THREE.Color(0x24170f), exterior: new THREE.Color(0xa9d4f2) };

// ---------- carga ----------
const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const files = { interior: 'interior.glb', exterior: 'exterior.glb', kh2: 'scrooge_kh2.glb', car: 'scrooge_car.glb', bag: 'money_bag.glb', case: 'briefcase.glb' };
const models = {};
async function loadAll() {
  const keys = Object.keys(files); let done = 0;
  await Promise.all(keys.map(async (k) => {
    models[k] = await loader.loadAsync(`models/${files[k]}?v=${VER}`);
    done++; $('#loader .bar i').style.width = (done / keys.length * 100) + '%';
  }));
}

// texturas de billetes y sombras
const texLoader = new THREE.TextureLoader();
const billTex = {};
['2k', '5k', '10k', '20k', '50k', '100k'].forEach((d) => { const t = texLoader.load(`img/billetes/${d}.png?v=${VER}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; billTex[d] = t; });
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const paperTex = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ebe4cf'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#cfc6ac'; for (let y = 0; y < 64; y += 4) g.fillRect(0, y, 64, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();

// ---------- actores ----------
const actors = []; // { def, idx, root, obj, mixer, actions, update(dt, t, active) }
const WHEEL_R = 0.205;           // radio de rueda del modelo (sin escala)
const DRIVE_RPS = 4;             // vueltas por segundo del clip drive

function measure(obj, precise = true) {
  obj.updateMatrixWorld(true);
  obj.traverse((m) => { if (m.isSkinnedMesh) { m.frustumCulled = false; m.skeleton.update(); m.computeBoundingBox?.(); } });
  return new THREE.Box3().setFromObject(obj, precise);
}
function buildActor(def, idx) {
  const root = new THREE.Group(); const pivot = new THREE.Group(); root.add(pivot);
  const a = { def, idx, root, pivot, update() {} };
  const targetWorld = def.world === 'interior' ? worlds.interior : worlds.exterior;
  let obj;
  if (def.m === 'kh2' || def.m === 'car') {
    const src = models[def.m === 'kh2' ? 'kh2' : 'car'];
    obj = SkeletonUtils.clone(src.scene); a.mixer = new THREE.AnimationMixer(obj); a.actions = {};
    src.animations.forEach((c) => { a.actions[c.name] = a.mixer.clipAction(c); });
    const first = a.actions[def.anim] || a.actions.idle;
    first.play(); a.mixer.update(0); // primera animación sin fundido: nunca se ve la T-pose
    a.current = first;
    pivot.add(obj);
    const box = measure(obj); const size = box.getSize(new THREE.Vector3());
    const s = def.m === 'kh2' ? def.h / size.y : def.len / size.z;
    obj.scale.setScalar(s); obj.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
    a.scale = s;
    if (def.m === 'car') {
      a.drive = a.actions.drive; a.idle = a.actions.idle;
      a.drive.play(); a.drive.paused = true; a.idle.play(); a.drive.setEffectiveWeight(0); a.idle.setEffectiveWeight(1);
      a.vClip = DRIVE_RPS * 2 * Math.PI * WHEEL_R * s; a.travel = 0; a.lastZ = null;
      if (def.carry) {
        const bag = models.bag.scene.clone(true); const bb = new THREE.Box3().setFromObject(bag); const bs = bb.getSize(new THREE.Vector3());
        const k = def.carry.h * s / 2.2 / bs.y; bag.scale.setScalar(k);
        bag.position.set(0.05 * s, 0.5 * s * 0.9, -0.6 * s);
        pivot.add(bag);
      }
    }
    if (RM && a.mixer) a.mixer.timeScale = 0;
  } else if (def.m === 'bag' || def.m === 'case') {
    obj = models[def.m].scene.clone(true); pivot.add(obj);
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3());
    const s = def.h / size.y; obj.scale.setScalar(s);
    obj.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  } else if (def.m === 'bill') {
    const w = def.w; const geo = new THREE.BoxGeometry(w, w / 2.25, 0.012);
    const face = new THREE.MeshStandardMaterial({ map: billTex[def.d], roughness: 0.6 }), edge = new THREE.MeshStandardMaterial({ color: 0xf1ead6, roughness: 0.8 });
    obj = new THREE.Mesh(geo, [edge, edge, edge, edge, face, face]); pivot.add(obj);
  } else if (def.m === 'stack') {
    const w = def.w, h = w * 0.2, d = w / 2.25;
    const side = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 }), top = new THREE.MeshStandardMaterial({ map: billTex[def.d], roughness: 0.6 });
    const band = new THREE.MeshStandardMaterial({ color: 0xd9c7a0, roughness: 0.9 });
    obj = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side]); m.position.y = h / 2; obj.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 1.03, d * 1.03), band); b.position.y = h / 2; obj.add(b);
    pivot.add(obj);
  }
  a.obj = obj;
  root.position.set(def.p[0], def.p[1] || 0, def.p[2]); pivot.rotation.y = THREE.MathUtils.degToRad(def.ry || 0);
  if (def.m === 'bill') {
    const lift = def.p[1] || 0; root.position.y = lift;
    if (def.anim === 'float') a.update = (dt, t, act, time) => { root.position.y = lift + (RM ? 0 : Math.sin(time * 1.4) * 0.05); };
    obj.rotation.x = def.anim === 'float' ? -0.25 : 0;
  }
  if (def.anim === 'spin' && !RM) a.update = (dt) => { pivot.rotation.y += dt * 0.22; };
  // sombra de contacto
  if (def.m !== 'bill') {
    const box = new THREE.Box3().setFromObject(root); const sz = box.getSize(new THREE.Vector3());
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; const r = Math.max(sz.x, sz.z) * 1.15 + 0.2; sh.scale.set(r, r, 1);
    if (def.m === 'stack') sh.position.y = 0.02 - (def.p[1] || 0);
    root.add(sh); a.shadow = sh;
  }
  targetWorld.add(root); root.visible = false;
  return a;
}

const ILLU_NOTE = 'ilustración';
function setupActors() {
  slides.forEach((s, idx) => {
    s.cast.forEach((c) => {
      const def = { ...c, world: s.world };
      if (def.ground) def.p = [def.p[0], 0, def.p[2]];
      const a = buildActor(def, idx);
      if (def.enter) {
        const to = new THREE.Vector3(def.p[0], 0, def.p[2]); const from = new THREE.Vector3(def.enter.from[0], 0, def.enter.from[1]);
        a.update = (dt, t) => {
          const k = easeOut(clamp(t / 0.72, 0, 1)); // frena con suavidad
          const pos = from.clone().lerp(to, k); a.root.position.x = pos.x; a.root.position.z = pos.z;
          const dist = from.distanceTo(pos); const moving = clamp(Math.abs(dist - (a.lastDist ?? dist)) / Math.max(dt, 1e-3) / 3, 0, 1);
          a.lastDist = dist;
          const m = RM ? 0 : smooth(clamp(Math.abs(1 - k) * 6, 0, 1)) * (t < 0.99 ? 1 : 0);
          a.drive.time = (dist / a.vClip) % 1; a.drive.setEffectiveWeight(m); a.idle.setEffectiveWeight(1 - m);
          a.root.position.y = RM ? 0 : (m > 0.2 ? Math.sin(dist * 5) * 0.012 * a.scale : 0);
        };
      }
      def.label = def.det ? `${def.det.c} ${String(def.det.p.toFixed(2)).replace('.', ',')}` : '';
      actors.push(a);
    });
  });
}

// ---------- capa de detección ----------
const fx = $('#fx'); const fctx = fx.getContext('2d');
const tmpBox = new THREE.Box3(), tmpV = new THREE.Vector3();
function projectBox(box) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const W = innerWidth, H = innerHeight;
  const xs = [box.min.x, box.max.x], ys = [box.min.y, box.max.y], zs = [box.min.z, box.max.z];
  for (const x of xs) for (const y of ys) for (const z of zs) {
    tmpV.set(x, y, z).project(camera);
    if (tmpV.z > 1) return null;
    const sx = (tmpV.x * 0.5 + 0.5) * W, sy = (-tmpV.y * 0.5 + 0.5) * H;
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  return [x0, y0, x1, y1];
}
let frameNo = 0;
function drawDetections(active, world) {
  const W = innerWidth, H = innerHeight, dpr = fx.width / W;
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
  if (introOpen) return;
  fctx.font = '600 12px "Fredoka", system-ui, sans-serif'; fctx.textBaseline = 'middle';
  for (const a of actors) {
    if (!a.def.det || !a.root.visible || a.idx < active - 0 || a.idx > active) continue;
    const skinned = a.def.m === 'kh2' || a.def.m === 'car';
    if (skinned && (frameNo + a.idx) % 2 === 0 && a.lastBox) tmpBox.copy(a.lastBox);
    else { tmpBox.copy(measure(a.root.children[0], skinned).applyMatrix4(new THREE.Matrix4())); if (skinned) { a.lastBox = a.lastBox || new THREE.Box3(); a.lastBox.copy(tmpBox); } }
    const r = projectBox(tmpBox); if (!r) continue;
    let [x0, y0, x1, y1] = r; const pad = 3; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) continue;
    const col = CLASS_COLOR[a.def.det.c] || '#ff7a2f';
    fctx.lineWidth = 2.5; fctx.strokeStyle = col; fctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    const t1 = `${a.def.det.c} ${a.def.det.p.toFixed(2).replace('.', ',')}`, t2 = ILLU_NOTE;
    const w1 = fctx.measureText(t1).width, w2 = fctx.measureText(t2).width, ch = 20, cy = Math.max(0, y0 - ch);
    fctx.fillStyle = col; fctx.fillRect(x0 - 1, cy, w1 + 14, ch); fctx.fillStyle = '#fff'; fctx.fillText(t1, x0 + 6, cy + ch / 2 + 1);
    fctx.fillStyle = 'rgba(20,22,30,.78)'; fctx.fillRect(x0 - 1 + w1 + 14, cy, w2 + 12, ch); fctx.fillStyle = '#f4efe8'; fctx.fillText(t2, x0 + w1 + 20, cy + ch / 2 + 1);
  }
}

// ---------- paneles ----------
const panel = $('#panel'), figure = $('#figure');
let shownIdx = -1;
function tableHTML(t) { return `<div class="card"><table><thead><tr>${t.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
async function showSlide(i) {
  if (i === shownIdx) return; shownIdx = i; const s = slides[i];
  document.body.dataset.layout = s.layout; document.body.dataset.slide = s.id;
  panel.innerHTML = `<h2>${s.title}</h2><div class="rule"></div>${s.body ? `<div class="copy">${s.body}</div>` : ''}${s.table ? tableHTML(s.table) : ''}`;
  panel.classList.toggle('final', !!s.final);
  panel.querySelectorAll('h2').forEach((h) => { h.innerHTML = h.textContent.split(' ').map((w, k) => `<span class="w" style="--i:${k}">${w}</span>`).join(' '); });
  figure.innerHTML = ''; figure.hidden = !s.figure && !s.demo;
  if (s.figure?.type === 'img') figure.innerHTML = `<img src="${s.figure.src}?v=${VER}" alt="${s.figure.alt}" decoding="async">`;
  else if (s.figure?.type === 'chart') { figure.innerHTML = '<div class="chart"></div>'; figure.querySelector('.chart').innerHTML = await drawChart(s.figure.chart); }
  else if (s.demo) { figure.innerHTML = '<div class="demo-root"></div>'; initDemo(figure.querySelector('.demo-root')); }
  if (!RM && window.gsap) {
    gsap.from(panel.querySelectorAll('h2 .w'), { y: 40, rotate: -8, opacity: 0, scale: 0.7, duration: 0.7, stagger: 0.07, ease: 'back.out(2.2)' });
    gsap.from(panel.querySelectorAll('.copy > *, .card'), { y: 22, opacity: 0, duration: 0.6, stagger: 0.12, delay: 0.25, ease: 'power2.out' });
    if (!figure.hidden) gsap.fromTo(figure, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, delay: 0.08, ease: 'power2.out' });
  }
  $('#prev').disabled = i === 0; $('#next').disabled = i === slides.length - 1;
  $('#progress i').style.width = ((i + 1) / slides.length * 100) + '%';
}

// ---------- cámara ----------
const camState = { pos: new THREE.Vector3(0, 2, 8), look: new THREE.Vector3(), sx: 0, sy: 0, init: false };
const LAYOUT_SHIFT = { text: [0.19, 0.0], textR: [-0.19, 0.0], chart: [-0.34, 0.08], wide: [0.0, 0.2] };
function camTarget(s, t) {
  const k = smooth(clamp(t, 0, 1)), f = s.cam.from, o = s.cam.to, L = (a, b) => a + (b - a) * k;
  const az = THREE.MathUtils.degToRad(L(f.az, o.az)), d = L(f.d, o.d), h = L(f.h, o.h);
  const look = new THREE.Vector3(L(f.look[0], o.look[0]), L(f.look[1], o.look[1]), L(f.look[2], o.look[2]));
  return { pos: new THREE.Vector3(look.x + Math.sin(az) * d, h, look.z + Math.cos(az) * d), look };
}

// ---------- tamaño y scroll ----------
let slideScroll = innerHeight * SLIDE_VH, introOpen = true, currentWorld = 'interior';
function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  const dpr = Math.min(devicePixelRatio, 2); fx.width = W * dpr; fx.height = H * dpr;
  slideScroll = H * SLIDE_VH; $('#scroller').style.height = (slideScroll * (slides.length - 1 + 0.8) + H) + 'px';
}
addEventListener('resize', resize);
function progress() { return scrollY / slideScroll; }
function goTo(i) { const y = clamp(i, 0, slides.length - 1) * slideScroll + 2; scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }); }
function currentIndex() { return clamp(Math.floor(progress() + 0.0001), 0, slides.length - 1); }

// cambio de mundo con fundido
function setWorld(name, snap) {
  if (name === currentWorld) return;
  const fade = $('#fade'); const apply = () => {
    currentWorld = name; worlds.interior.visible = name === 'interior'; worlds.exterior.visible = name === 'exterior';
    scene.background = BG[name]; scene.fog = name === 'exterior' ? new THREE.Fog(0xcfe6f5, 70, 250) : null;
    camState.init = false;
  };
  if (RM || !window.gsap || snap) { apply(); return; }
  gsap.to(fade, { opacity: 1, duration: 0.2, onComplete: () => { apply(); gsap.to(fade, { opacity: 0, duration: 0.35, delay: 0.05 }); } });
}

// ---------- bucle ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1), time = clock.elapsedTime; frameNo++;
  const P = introOpen ? 0 : progress(); const idx = clamp(Math.floor(P + 1e-4), 0, slides.length - 1); const t = idx === slides.length - 1 ? clamp((P - idx) / 0.8, 0, 1) : P - idx;
  const s = slides[idx];
  if (!introOpen) { setWorld(s.world); showSlide(idx); }
  const tg = camTarget(s, t); const [shx, shy] = LAYOUT_SHIFT[s.layout];
  if (!camState.init) { camState.pos.copy(tg.pos); camState.look.copy(tg.look); camState.sx = shx; camState.sy = shy; camState.init = true; }
  const k = RM ? 1 : 1 - Math.exp(-dt * 4.2);
  camState.pos.lerp(tg.pos, k); camState.look.lerp(tg.look, k); camState.sx += (shx - camState.sx) * k; camState.sy += (shy - camState.sy) * k;
  camera.position.copy(camState.pos); camera.lookAt(camState.look);
  const W = innerWidth, H = innerHeight;
  camera.setViewOffset(W, H, -camState.sx * W, -camState.sy * H, W, H);
  for (const a of actors) {
    const near = a.idx === idx && slides[a.idx].world === currentWorld;
    a.root.visible = near; if (!near) continue;
    const tt = a.idx === idx ? t : (a.idx < idx ? 1 : 0);
    if (a.mixer && !RM) a.mixer.update(dt);
    a.update(dt, tt, a.idx === idx, time);
  }
  renderer.render(scene, camera);
  drawDetections(idx, currentWorld);
}

// ---------- intro y controles ----------
function startDeck() {
  if (!introOpen) return; introOpen = false;
  const intro = $('#intro'); document.body.classList.remove('locked');
  if (!RM && window.gsap) gsap.to(intro, { yPercent: -100, duration: 0.9, ease: 'power3.inOut', onComplete: () => { intro.hidden = true; } });
  else intro.hidden = true;
  $('#hud').hidden = false; scrollTo(0, 0);
}
function initControls() {
  const go = (e) => { if (introOpen) return; };
  $('#next').addEventListener('click', () => goTo(currentIndex() + 1));
  $('#prev').addEventListener('click', () => goTo(currentIndex() - 1));
  $('#intro-next').addEventListener('click', (e) => { e.stopPropagation(); startDeck(); });
  $('#intro').addEventListener('click', startDeck);
  addEventListener('wheel', (e) => { if (introOpen && e.deltaY > 8) startDeck(); }, { passive: true });
  let ty = null; addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (introOpen && ty !== null && ty - e.touches[0].clientY > 30) startDeck(); }, { passive: true });
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    const next = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key), prev = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
    if (introOpen) { if (next) { e.preventDefault(); startDeck(); } return; }
    if (next) { e.preventDefault(); goTo(currentIndex() + 1); } else if (prev) { e.preventDefault(); goTo(currentIndex() - 1); }
  });
}

(async function main() {
  document.body.classList.add('locked');
  await loadAll();
  worlds.interior.add(models.interior.scene); worlds.exterior.add(models.exterior.scene);
  scene.background = BG.interior;
  setupActors(); resize(); initControls();
  $('#loader').classList.add('done'); setTimeout(() => $('#loader').remove(), 600);
  window.__deck = { goTo, slides, actors, camera, scene, get idx() { return currentIndex(); } };
  frame();
})();
