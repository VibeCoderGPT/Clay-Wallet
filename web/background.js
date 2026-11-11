// =====================================================================
//  background.js — a field of high-quality 3D clay crypto coins floating
//  behind the app. Orange / beige / mauve. (No other shapes.)
// =====================================================================
import * as THREE from './vendor/three.module.js';

const FALLBACK_COINS = [
  { glyph: '₿', clay: '#e8894e' },
  { glyph: 'Ξ', clay: '#a88fbb' },
  { glyph: '◎', clay: '#e27b6a' },
  { glyph: 'Ð', clay: '#d9a952' },
  { glyph: 'Ł', clay: '#c9a8c0' },
  { glyph: '◆', clay: '#9a6f9c' },
];

/* ---------- colour helpers ---------- */
function hexToRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/* ---------- high-res coin face texture (cached per token) ---------- */
const faceCache = new Map();

function makeCoinFace(token) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const base = token.clay || '#e8894e';
  const light = shade(base, 0.42);
  const deep = shade(base, -0.32);
  const ink = shade(base, -0.5);
  const cx = S / 2, cy = S / 2;

  // clay body lit from the top-left
  const g = ctx.createRadialGradient(S * 0.32, S * 0.26, S * 0.04, cx, cy, S * 0.72);
  g.addColorStop(0, shade(base, 0.5));
  g.addColorStop(0.35, light);
  g.addColorStop(0.7, base);
  g.addColorStop(1, shade(base, -0.18));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // milled outer rim
  ctx.strokeStyle = deep;
  ctx.lineWidth = S * 0.045;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, 0, Math.PI * 2); ctx.stroke();

  // inner bevel highlight + shadow ring
  ctx.strokeStyle = shade(base, 0.28);
  ctx.lineWidth = S * 0.02;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.37, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = shade(base, -0.12);
  ctx.lineWidth = S * 0.018;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.335, 0, Math.PI * 2); ctx.stroke();

  // embossed glyph (soft shadow + highlight + face)
  const font = `700 ${Math.round(S * 0.33)}px "Baloo 2", "Nunito", "Segoe UI Symbol", system-ui, sans-serif`;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = shade(base, -0.26);
  ctx.fillText(token.glyph || '¢', cx + S * 0.013, cy + S * 0.02);
  ctx.fillStyle = shade(base, 0.55);
  ctx.fillText(token.glyph || '¢', cx - S * 0.008, cy - S * 0.008);
  ctx.fillStyle = ink;
  ctx.fillText(token.glyph || '¢', cx, cy + S * 0.008);

  // fine clay grain + speckles
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * S * 0.46;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function getFace(token) {
  const key = token.glyph + '|' + token.clay;
  if (!faceCache.has(key)) faceCache.set(key, makeCoinFace(token));
  return faceCache.get(key);
}

/* ---------- 3D clay coin (higher poly + embossed face) ---------- */
function buildCoin(token, r) {
  const g = new THREE.Group();
  const t = r * 0.3;
  const seg = 64;
  const clay = new THREE.MeshStandardMaterial({ color: token.clay, roughness: 0.76, metalness: 0 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, seg), clay);
  body.rotation.x = Math.PI / 2;
  g.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, t * 0.38, 18, seg), clay);
  g.add(rim);

  const faceMat = new THREE.MeshStandardMaterial({ map: getFace(token), roughness: 0.74, metalness: 0 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, seg), faceMat);
  top.position.z = t / 2 + 0.005;
  g.add(top);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, seg), faceMat);
  bot.position.z = -t / 2 - 0.005;
  bot.rotation.y = Math.PI;
  g.add(bot);

  return g;
}

export function initBackground(canvas, tokens) {
  const coins = (tokens && tokens.length) ? tokens : FALLBACK_COINS;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  // soft 3-point clay lighting
  scene.add(new THREE.HemisphereLight(0xfff2df, 0xd8c4a8, 1.25));
  const key = new THREE.DirectionalLight(0xffe6c9, 1.6);
  key.position.set(6, 8, 10);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf2d7ea, 0.85);
  fill.position.set(-7, -2, 7);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1de, 0.6);
  rim.position.set(0, 3, -6);
  scene.add(rim);

  const rand = (a, b) => a + Math.random() * (b - a);

  const items = [];

  // ---- coins everywhere ----
  const COIN_COUNT = 34;
  for (let i = 0; i < COIN_COUNT; i++) {
    const token = coins[i % coins.length];
    const r = rand(0.55, 1.5);
    const mesh = buildCoin(token, r);
    mesh.position.set(rand(-15, 15), rand(-9, 7), rand(-6, 3));
    mesh.rotation.set(rand(-0.7, 0.7), rand(-0.7, 0.7), rand(0, Math.PI * 2));
    items.push({
      mesh,
      rotSpeed: rand(-0.14, 0.14),
      rotAxis: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
      bobAmp: rand(0.15, 0.55),
      bobSpeed: rand(0.2, 0.7),
      bobPhase: rand(0, Math.PI * 2),
      baseY: mesh.position.y,
      drift: rand(0.03, 0.14),
      spin: rand(-0.5, 0.5) * 0.02,
    });
    scene.add(mesh);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function loop() {
    if (!reduced && visible) {
      const t = clock.getElapsedTime();
      for (const s of items) {
        s.mesh.rotateOnWorldAxis(s.rotAxis, s.rotSpeed * 0.016);
        s.mesh.position.y = s.baseY + Math.sin(t * s.bobSpeed + s.bobPhase) * s.bobAmp;
        s.mesh.position.x += s.drift * 0.004;
        if (s.mesh.position.x > 16) s.mesh.position.x = -16;
        if (s.spin) s.mesh.rotation.z += s.spin;
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  if (reduced) renderer.render(scene, camera);
  loop();

  return { renderer, dispose: () => renderer.dispose() };
}
