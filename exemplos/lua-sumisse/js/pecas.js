// Peças 3D só deste reel (pessoa, coqueiro, barco, sobrado, régua de maré, corais, textura da Lua).
// Todas usam mat()/solido() do motor, então ganham as duas aparências (real / e se).
import { THREE, D2R, rng, COR, mat, solido } from '../motor/base.js';

const DS = { side: THREE.DoubleSide };

// ------------------------------------------------------------- pessoa (vista de costas), com braço que aponta
export function pessoa({ h = 1.75, roupa = 0xd8d2c4, calca = 0x2c4a6e, pele = 0xb98a66, cabelo = 0x1d1712, saia = false } = {}) {
  const g = new THREE.Group();
  const mP = mat(pele, COR.eseFill2), mR = mat(roupa, COR.eseFill2), mC = mat(calca, COR.eseFill), mH = mat(cabelo, COR.eseFill);
  for (const x of [-0.1, 0.1]) { const p = solido(new THREE.CapsuleGeometry(0.068, 0.7, 4, 8), mP, false); p.position.set(x, 0.42, 0); g.add(p); }
  const short = solido(saia ? new THREE.CylinderGeometry(0.19, 0.27, 0.36, 12) : new THREE.CylinderGeometry(0.2, 0.215, 0.3, 12), mC, false);
  short.position.y = saia ? 0.86 : 0.88; g.add(short);
  const tronco = solido(new THREE.CapsuleGeometry(0.165, 0.4, 4, 12), mR, false);
  tronco.scale.set(1.12, 1, 0.72); tronco.position.y = 1.2; g.add(tronco);
  const pesc = solido(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), mP, false); pesc.position.y = 1.5; g.add(pesc);
  const cab = solido(new THREE.SphereGeometry(0.115, 18, 14), mP, false); cab.position.y = 1.63; g.add(cab);
  const cabel = solido(new THREE.SphereGeometry(0.122, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mH, false);
  cabel.position.set(0, 1.645, 0.012); cabel.rotation.x = 0.35; g.add(cabel);
  const bracos = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0.215 * s, 1.43, 0);
    const b = solido(new THREE.CapsuleGeometry(0.05, 0.56, 4, 8), mR, false); b.position.y = -0.31; piv.add(b);
    const mao = solido(new THREE.SphereGeometry(0.05, 10, 8), mP, false); mao.position.y = -0.64; piv.add(mao);
    piv.rotation.z = 0.08 * s; g.add(piv); bracos.push(piv);
  }
  g.scale.setScalar(h / 1.75);
  g.userData.bracoE = bracos[0]; g.userData.bracoD = bracos[1];
  return g;
}

// ------------------------------------------------------------- coqueiro (tronco curvo + folhas caídas)
function folha(L = 2.8, larg = 0.42, cai = 1.3) {
  const pos = [], idx = [], n = 12;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = u * L, y = -cai * u * u + 0.25 * u, w = larg * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08));
    pos.push(x, y, w, x, y + 0.06, 0, x, y, -w);
  }
  for (let i = 0; i < n; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
export function coqueiro(h = 7, curva = 1.6, seed = 1) {
  const r = rng(seed), g = new THREE.Group();
  const pts = [[0, 0, 0], [curva * 0.25, h * 0.35, 0], [curva * 0.7, h * 0.72, 0], [curva, h, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const tronco = solido(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.17, 7), mat(0x8c6c4a, COR.eseFill), false);
  g.add(tronco);
  const copa = new THREE.Group(); copa.position.set(curva, h, 0); g.add(copa);
  const mF = mat(0x3d7a3a, COR.eseFill2, DS);
  for (let k = 0; k < 11; k++) {
    const f = solido(folha(2.4 + r() * 0.9, 0.38, 1.0 + r() * 0.8), mF, true);
    f.rotation.y = (k / 11) * Math.PI * 2 + r() * 0.3; f.rotation.z = 0.15 + r() * 0.35; copa.add(f);
  }
  const mCo = mat(0x5a4128, COR.eseFill);
  for (let k = 0; k < 4; k++) { const c = solido(new THREE.SphereGeometry(0.15, 10, 8), mCo, false); c.position.set(Math.cos(k * 1.7) * 0.2, -0.22, Math.sin(k * 1.7) * 0.2); copa.add(c); }
  return g;
}

// ------------------------------------------------------------- barco de pesca de madeira (casco de verdade, não caixa)
function casco(L = 6, B = 1.9, D = 1.0) {
  // seções ao longo do comprimento; cada seção é um "U" que afina na proa e na popa
  const pos = [], idx = [], nL = 16, nU = 8;
  for (let i = 0; i <= nL; i++) {
    const u = i / nL, x = (u - 0.5) * L;
    const lar = B * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(0.98, 0.1 + u * 0.95)), 0.7);
    const sobe = 0.35 * Math.pow(Math.abs(u - 0.45) * 2, 2.2); // a proa e a popa sobem
    for (let j = 0; j <= nU; j++) {
      const a = Math.PI * (j / nU); // 0 → borda esquerda, π → borda direita
      pos.push(x, -D * Math.sin(a) * (1 - 0.25 * Math.abs(u - 0.5)) + sobe, lar * Math.cos(a));
    }
  }
  for (let i = 0; i < nL; i++) for (let j = 0; j < nU; j++) { const a = i * (nU + 1) + j, b = a + nU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
export function barco({ L = 6, cor = 0x2f6fa8, faixa = 0xe9e4d8, vela = 0xb5452f, seed = 1 } = {}) {
  const g = new THREE.Group();
  const c = solido(casco(L, L * 0.32, L * 0.17), mat(cor, COR.eseFill2, DS)); g.add(c);
  const f = solido(casco(L * 1.005, L * 0.325, L * 0.05), mat(faixa, COR.eseFill, DS), false); f.position.y = 0.02; g.add(f);
  const conves = solido(new THREE.BoxGeometry(L * 0.55, 0.06, L * 0.26), mat(0x8a6a48, COR.eseFill), false); conves.position.y = -0.05; g.add(conves);
  const cab = solido(new THREE.BoxGeometry(L * 0.18, L * 0.12, L * 0.2), mat(0xe9e4d8, COR.eseFill2)); cab.position.set(-L * 0.15, L * 0.06, 0); g.add(cab);
  const mastro = solido(new THREE.CylinderGeometry(0.05, 0.07, L * 0.75, 6), mat(0x6b4f33, COR.eseFill), false); mastro.position.set(L * 0.12, L * 0.37, 0); g.add(mastro);
  const vg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, L * 0.08, 0, 0, L * 0.7, 0, L * 0.42, L * 0.1, 0], 3)); vg.computeVertexNormals();
  const v = solido(vg, mat(vela, COR.eseFill2, DS)); v.position.set(L * 0.14, 0, 0); g.add(v);
  return g;
}

// ------------------------------------------------------------- sobrado colonial de São Luís (fachada pintada em textura)
export function sobrado(w = 7, h = 9, base = '#3b6ea5', azulejo = false, seed = 1) {
  const r = rng(seed), c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  if (azulejo) { for (let y = 0; y < c.height; y += 16) for (let x = 0; x < c.width; x += 16) { g.fillStyle = (x + y) % 32 ? 'rgba(255,255,255,.22)' : 'rgba(20,40,90,.25)'; g.fillRect(x + 2, y + 2, 12, 12); } }
  g.fillStyle = '#efe9dc'; g.fillRect(0, 0, c.width, 22); g.fillRect(0, c.height * 0.48, c.width, 14);
  const andares = h > 8 ? 2 : 1, cols = Math.max(3, Math.round(w / 1.8));
  for (let a = 0; a <= andares; a++) {
    const y0 = c.height - (a + 1) * (c.height / (andares + 1)) + 30, hh = c.height / (andares + 1) - 70;
    for (let k = 0; k < cols; k++) {
      const x0 = (k + 0.5) * (c.width / cols) - 28;
      g.fillStyle = '#efe9dc'; g.fillRect(x0 - 8, y0 - 8, 72, hh + 16);
      g.fillStyle = a === 0 && k === Math.floor(cols / 2) ? '#5a3a22' : (r() > 0.5 ? '#2c5d4a' : '#5a3a22'); g.fillRect(x0, y0, 56, hh);
      if (a > 0) { g.fillStyle = '#1d1d1d'; g.fillRect(x0 - 10, y0 + hh - 6, 76, 6); }
    }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group();
  const corpo = solido(new THREE.BoxGeometry(w, h, 6), mat(0xffffff, COR.eseFill2, { map: tex })); corpo.position.y = h / 2; grp.add(corpo);
  const tri = new THREE.Shape(); tri.moveTo(-w / 2 - 0.3, 0); tri.lineTo(0, 2.2); tri.lineTo(w / 2 + 0.3, 0); tri.closePath();
  const tel = solido(new THREE.ExtrudeGeometry(tri, { depth: 6.6, bevelEnabled: false }), mat(0xb4552f, COR.eseFill));
  tel.position.set(0, h, -3.3); grp.add(tel);
  return grp;
}
export function igreja(seed = 3) {
  const g = new THREE.Group(), m = mat(0xf1ede4, COR.eseFill2), mt = mat(0x9a9a92, COR.eseFill);
  const nave = solido(new THREE.BoxGeometry(10, 11, 14), m); nave.position.y = 5.5; g.add(nave);
  const fr = new THREE.Shape(); fr.moveTo(-5, 0); fr.lineTo(0, 3.4); fr.lineTo(5, 0); fr.closePath();
  const front = solido(new THREE.ExtrudeGeometry(fr, { depth: 0.6, bevelEnabled: false }), m); front.position.set(0, 11, 6.4); g.add(front);
  for (const s of [-1, 1]) {
    const t = solido(new THREE.BoxGeometry(3.2, 17, 3.2), m); t.position.set(s * 6.4, 8.5, 5.4); g.add(t);
    const p = solido(new THREE.ConeGeometry(2.4, 3.6, 4), mt); p.position.set(s * 6.4, 18.8, 5.4); p.rotation.y = Math.PI / 4; g.add(p);
  }
  const porta = solido(new THREE.BoxGeometry(2.4, 4, 0.3), mat(0x5a3a22, COR.eseFill), false); porta.position.set(0, 2, 7.05); g.add(porta);
  return g;
}

// ------------------------------------------------------------- régua de maré (0 a 8 m, números grandes)
export function regua() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 2560; // 9 m (−0,5 a 8,5) → 284 px por metro
  const g = c.getContext('2d'), Y = (m) => c.height - (m + 0.5) * (c.height / 9);
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#16181c';
  for (let m = 0; m < 8.5; m += 0.1) { const y = Y(m); const big = Math.abs(m - Math.round(m)) < 0.01; g.fillRect(0, y - 4, big ? 150 : (Math.round(m * 10) % 5 === 0 ? 100 : 60), big ? 10 : 6); }
  g.font = '700 170px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
  for (let m = 0; m <= 8; m++) { g.fillStyle = m % 2 ? '#16181c' : '#b3261e'; g.fillText(String(m), 170, Y(m) - 90); }
  g.strokeStyle = '#16181c'; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const grp = new THREE.Group();
  const placa = solido(new THREE.BoxGeometry(1.25, 9, 0.12), mat(0xffffff, 0x8fb3d6, { map: tex })); placa.position.y = 4; grp.add(placa);
  const poste = solido(new THREE.BoxGeometry(0.3, 10.5, 0.3), mat(0x5a4a3a, COR.eseFill), false); poste.position.set(0, 3.75, -0.22); grp.add(poste);
  return grp;
}

// ------------------------------------------------------------- textura da Lua cheia (amarela, com mares e crateras)
export function texturaLua() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'), r = rng(42);
  g.fillStyle = '#FACC15'; g.fillRect(0, 0, 1024, 512);
  // "mares" lunares (lado visível em u = 0,25, que fica para +z na esfera do three)
  const mares = [[760, 190, 70, 50], [700, 230, 60, 45], [810, 260, 55, 40], [730, 300, 80, 45], [650, 200, 40, 70], [840, 200, 45, 35], [770, 340, 40, 30]];
  g.fillStyle = 'rgba(176,128,8,.42)';
  for (const [x, y, a, b] of mares) { g.beginPath(); g.ellipse(x - 500, y, a, b, r() * 3, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 70; i++) { const x = r() * 1024, y = 60 + r() * 400, s = 3 + r() * 12; g.strokeStyle = 'rgba(150,100,0,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = 'rgba(255,240,170,.55)'; g.beginPath(); g.arc(290, 420, 14, 0, Math.PI * 2); g.fill(); // Tycho
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------- corais
export function coralGalho(cor, seed = 1, esc = 1) {
  const r = rng(seed), g = new THREE.Group(), m = mat(cor, COR.eseFill2);
  const galho = (pai, comp, raio, nivel) => {
    const geo = new THREE.CylinderGeometry(raio * 0.7, raio, comp, 6); geo.translate(0, comp / 2, 0);
    const me = solido(geo, m, nivel === 0); pai.add(me);
    const ponta = new THREE.Group(); ponta.position.y = comp; me.add(ponta);
    if (nivel >= 3) { const b = solido(new THREE.SphereGeometry(raio * 0.9, 6, 5), m, false); ponta.add(b); return; }
    const n = nivel === 0 ? 4 : 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Group(); s.rotation.set(0, (i / n) * Math.PI * 2 + r(), 0.35 + r() * 0.45); ponta.add(s);
      galho(s, comp * (0.62 + r() * 0.2), raio * 0.7, nivel + 1);
    }
  };
  galho(g, 0.9, 0.16, 0); g.scale.setScalar(esc); return g;
}
export function coralCerebro(cor, seed = 1, esc = 1) {
  const r = rng(seed), geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + 0.06 * Math.sin(x * 9 + z * 7) * Math.cos(y * 8 + x * 3); p.setXYZ(i, x * k, Math.max(-0.2, y) * k * 0.72, z * k); }
  geo.computeVertexNormals(); const me = solido(geo, mat(cor, COR.eseFill2), false); me.scale.setScalar(esc); return me;
}
export function coralMesa(cor, seed = 1, esc = 1) {
  const g = new THREE.Group(), m = mat(cor, COR.eseFill2);
  const pe = solido(new THREE.CylinderGeometry(0.16, 0.26, 0.9, 7), m, false); pe.position.y = 0.45; g.add(pe);
  const tampo = solido(new THREE.CylinderGeometry(1.5, 1.25, 0.16, 14), m); tampo.position.y = 0.95; g.add(tampo);
  g.scale.setScalar(esc); g.rotation.z = (rng(seed)() - 0.5) * 0.2; return g;
}
export function esponja(cor, seed = 1, esc = 1) {
  const r = rng(seed), g = new THREE.Group(), m = mat(cor, COR.eseFill2, DS);
  for (let i = 0; i < 4; i++) { const h = 0.8 + r() * 1.1; const t = solido(new THREE.CylinderGeometry(0.2, 0.15, h, 9, 1, true), m, false); t.position.set((r() - 0.5) * 0.6, h / 2, (r() - 0.5) * 0.6); t.rotation.z = (r() - 0.5) * 0.3; g.add(t); }
  g.scale.setScalar(esc); return g;
}
export { D2R };
