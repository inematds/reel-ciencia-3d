// Motor comum dos reels "E se…?" — tudo é função do tempo (evento hf-seek do HyperFrames).
// Duas aparências dos mesmos objetos 3D: REAL (o mundo de hoje) e E-SE (planta técnica escura),
// misturadas por um único número m (0 = real, 1 = e-se). Uma só cor quente: o amarelo INEMA, na coisa principal.
import * as THREE from 'three';
import { TERRA } from './terra.js';

export { THREE };
export const W = 1080, H = 1920, D2R = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ramp = (t, a, b) => clamp((t - a) / (b - a));
export const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const out3 = (k) => 1 - Math.pow(1 - k, 3);
export const win = (t, a, b, fin = 0.35, fout = 0.3) => Math.min(out3(ramp(t, a, a + fin)), 1 - ramp(t, b - fout, b));
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const COR = {
  amarelo: 0xfacc15, fundo: 0x0c0c10,
  eseFill: 0x2b4462, eseFill2: 0x35557a, eseLinha: 0xc4e2ff, eseCeuTopo: 0x0d1828, eseCeuBase: 0x2a4a6c,
};

// ------------------------------------------------------------- renderizador
export function criarMundo(canvasId = 'world') {
  const canvas = document.getElementById(canvasId);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 6000);
  return { renderer, scene, camera };
}

// ------------------------------------------------------------- as duas aparências
const morfos = [];
export const ARESTA = new THREE.LineBasicMaterial({ color: COR.eseLinha, transparent: true, opacity: 0 });
export function mat(real, ese = COR.eseFill, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color: real, flatShading: true, roughness: 0.9, metalness: 0, ...extra });
  morfos.push({ m, a: new THREE.Color(real), b: new THREE.Color(ese) });
  return m;
}
export function solido(geo, m, arestas = true, sombra = true) {
  const me = new THREE.Mesh(geo, m);
  me.castShadow = sombra; me.receiveShadow = true;
  if (arestas) me.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), ARESTA));
  return me;
}
export function aparencia(m) {
  for (const o of morfos) { o.m.color.copy(o.a).lerp(o.b, m); o.m.emissive.copy(o.b).multiplyScalar(0.55 * m); }
  ARESTA.opacity = 0.85 * m;
}

// céu em degradê (uma esfera grande por dentro), também com as duas aparências
export function ceu(scene, realTopo = 0x5fa8e6, realBase = 0xd8ecf7) {
  const u = {
    a1: { value: new THREE.Color(realTopo) }, a2: { value: new THREE.Color(realBase) },
    b1: { value: new THREE.Color(COR.eseCeuTopo) }, b2: { value: new THREE.Color(COR.eseCeuBase) }, m: { value: 0 },
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: u,
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 a1,a2,b1,b2; uniform float m; varying vec3 p; void main(){ float k = clamp(p.y*1.6+0.15,0.0,1.0); vec3 r = mix(a2,a1,k); vec3 e = mix(b2,b1,k); gl_FragColor = vec4(mix(r,e,m),1.0); }',
  }));
  scene.add(mesh);
  return { mesh, set: (m, topo, base) => { u.m.value = m; if (topo !== undefined) { u.a1.value.set(topo); u.a2.value.set(base); } } };
}

// ------------------------------------------------------------- globo com os continentes reais (Natural Earth)
function texturaTerra(oceano, terra, linha, grade) {
  const c = document.createElement('canvas'); c.width = 4096; c.height = 2048;
  const g = c.getContext('2d');
  g.fillStyle = oceano; g.fillRect(0, 0, c.width, c.height);
  const X = (lon) => ((lon + 180) / 360) * c.width, Y = (lat) => ((90 - lat) / 180) * c.height;
  if (grade) {
    g.strokeStyle = grade; g.lineWidth = 2;
    for (let lo = -180; lo <= 180; lo += 15) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), c.height); g.stroke(); }
    for (let la = -75; la <= 75; la += 15) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(c.width, Y(la)); g.stroke(); }
  }
  g.fillStyle = terra; g.strokeStyle = linha; g.lineWidth = 3; g.lineJoin = 'round';
  for (const anel of TERRA) {
    g.beginPath();
    anel.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la))));
    g.closePath(); g.fill(); if (linha) g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// Devolve um grupo com dois globos sobrepostos (real e e-se) e set(m) para misturar.
export function globo(R = 3) {
  const grupo = new THREE.Group();
  const geo = new THREE.SphereGeometry(R, 128, 64);
  const real = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texturaTerra('#1f5a8a', '#6f9a52', '#9fbf7f', null), roughness: 0.85, transparent: true }));
  const ese = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texturaTerra('#13243a', '#3a5a80', '#cfe6ff', 'rgba(196,226,255,0.25)'), roughness: 1, transparent: true, emissive: 0x0d1a2a }));
  ese.scale.setScalar(1.001);
  grupo.add(real, ese);
  grupo.userData.set = (m) => { real.material.opacity = 1; ese.material.opacity = m; ese.visible = m > 0.001; };
  return grupo;
}
// posição de (lat, lon) na superfície de uma esfera de raio R (mesma convenção da textura: lon 0 em +z)
export function noGlobo(lat, lon, R) {
  const la = lat * D2R, lo = lon * D2R;
  return v3(R * Math.cos(la) * Math.sin(lo), R * Math.sin(la), R * Math.cos(la) * Math.cos(lo));
}

// ------------------------------------------------------------- rótulo 3D (sprite com texto)
const rotulos = [];
export function rotulo(texto, { cor = '#ffffff', tam = 40, fundo = 'rgba(12,12,16,0.72)', largura = 3 } = {}) {
  const c = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false }));
  s.renderOrder = 10;
  const desenha = () => {
    const g = c.getContext('2d'); const fonte = `700 ${tam}px "JetBrains Mono", monospace`;
    g.font = fonte; const w = Math.ceil(g.measureText(texto).width) + tam * 1.2, h = Math.ceil(tam * 1.9);
    c.width = w; c.height = h; g.font = fonte;
    g.fillStyle = fundo; g.beginPath(); g.roundRect(0, 0, w, h, h * 0.24); g.fill();
    g.fillStyle = cor; g.textBaseline = 'middle'; g.fillText(texto, tam * 0.6, h / 2 + 2);
    tex.needsUpdate = true; s.scale.set(largura, (largura * h) / w, 1);
  };
  desenha(); rotulos.push(desenha);
  return s;
}

// ------------------------------------------------------------- legenda palavra a palavra (DOM)
export function legenda(t, LEG, el = document.getElementById('leg')) {
  let g = null;
  for (const x of LEG) if (t >= x.ini && t < x.fim) { g = x; break; }
  if (!g) { el.style.opacity = 0; return; }
  const k = out3(ramp(t, g.ini, g.ini + 0.14)), sai = 1 - ramp(t, g.fim - 0.1, g.fim);
  if (el.dataset.txt !== g.txt) {
    el.dataset.txt = g.txt;
    el.innerHTML = g.txt.split(' ').map((p) => {
      const limpo = p.replace(/[?!]$/, '');
      return g.quente.includes(limpo) || g.quente.includes(p) ? `<b>${p}</b>` : p;
    }).join(' ');
  }
  el.style.opacity = Math.min(k, sai);
  el.style.transform = `translate(-50%, ${(1 - k) * 14}px) scale(${0.94 + 0.06 * k})`;
}

// ------------------------------------------------------------- cartões e passos (DOM com data-de / data-ate)
// data-de="poa" (início da frase), "poa.fim", "poa+1.2", "b2.fim-0.3"; data-ate idem. Opacidade + subida suave.
// data-larg="0>0.4167@poa+1.5; 0.4167>0.5@poa2+0.3" anima a largura (scaleX) de barras.
function quando(spec, F, B) {
  if (/^[\d.]+$/.test(spec.trim())) return Number(spec);
  const m = /^([\w-]+)(?:\.(ini|fim))?([+-][\d.]+)?$/.exec(spec.trim());
  if (!m) return Number(spec);
  const base = F[m[1]] || B[m[1]]; if (!base) { console.warn('tempo desconhecido', spec); return 0; }
  return base[m[2] || 'ini'] + (m[3] ? Number(m[3]) : 0);
}
let cacheDOM = null;
export function cartoes(t, F, B) {
  if (!cacheDOM) {
    cacheDOM = [...document.querySelectorAll('[data-de]')].map((el) => ({ el, de: quando(el.dataset.de, F, B), ate: el.dataset.ate ? quando(el.dataset.ate, F, B) : 1e9, sobe: el.dataset.sobe !== 'nao' }))
      .concat([...document.querySelectorAll('[data-larg]')].map((el) => ({ el, larg: el.dataset.larg.split(';').map((p) => { const [v, q] = p.split('@'); const [a, b] = v.split('>').map(Number); return { a, b, t: quando(q, F, B) }; }) })));
  }
  for (const c of cacheDOM) {
    if (c.larg) {
      let s = c.larg[0].a;
      for (const p of c.larg) { if (t >= p.t) s = lerp(p.a, p.b, io(ramp(t, p.t, p.t + 0.9))); }
      c.el.style.transform = `scaleX(${s})`; continue;
    }
    const k = c.de <= 0 ? 1 - ramp(t, c.ate - 0.25, c.ate) : win(t, c.de, c.ate, 0.35, 0.25);
    c.el.style.opacity = k;
    if (c.sobe) c.el.style.transform = `translateY(${(1 - out3(ramp(t, c.de, c.de + 0.35))) * 22}px)`;
  }
}

// ------------------------------------------------------------- ligação com o HyperFrames
export function ligar(nome, renderAt, fontes = ['800 40px Sora', '700 40px "JetBrains Mono"', '900 40px Montserrat']) {
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady[nome] = Promise.all(fontes.map((f) => document.fonts.load(f))).catch(() => {}).then(() => { rotulos.forEach((d) => d()); renderAt(window.__hfThreeTime || 0); });
  renderAt(window.__hfThreeTime || 0);
}
