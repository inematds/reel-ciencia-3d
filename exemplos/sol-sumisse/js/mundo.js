// "E se o Sol sumisse agora?" — o mundo 3D do reel, desenhado só a partir do tempo do vídeo.
// Fatos: fatos.md (F1–F13, C1–C5). Cenas (uma por bloco):
// b0 Brasília ao meio-dia (capa) → b1 Brasília / a última luz a caminho → b2 Brasília apaga às 12h08
// → b3 a Lua apaga → b4 a Terra ainda na órbita (gravidade = luz) → b5 Júpiter ainda brilha
// → b6 a Terra sai pela tangente / régua Terra–Lua em escala → b7 o globo congela → b8 fontes hidrotermais → b9 volta.
import {
  THREE, D2R, clamp, lerp, ramp, io, out3, win, v3, rng, COR,
  criarMundo, mat, solido, aparencia, ceu, globo, rotulo, legenda, cartoes, ligar,
} from '../motor/base.js';
import { FIM, BLOCOS as B, FRASES as F, LEG, palavra } from './tempos.js';

const { renderer, scene, camera } = criarMundo();
const ceuDome = ceu(scene, 0x3f8fdc, 0xcfe6f5);

// ------------------------------------------------------------- relógio da história
const IDS = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'];
const CORTES = IDS.map((b, i) => (i ? B[b].ini - 0.12 : 0));
const CORTE_ESPACO = F.caminho.ini - 0.12;      // b1: corta de Brasília para a luz a caminho
const CORTE_ESCALA = F.horas.ini - 0.12;        // b6: corta para a régua Terra–Lua em escala
const CORTE_VOLTA = F.volta.ini - 0.12;         // b9: Brasília volta ao dia
const cena = (t) => { let k = 0; CORTES.forEach((c, i) => { if (t >= c) k = i; }); return k; };
const APAGA = palavra('brasilia', 'apagaria');  // 12h08: o céu apaga
const LUA_APAGA = palavra('lua', 'apaga');

// tempo sem Sol mostrado no aparelho, em segundos: [hora do vídeo, valor, curva]
const RELOGIO = [
  [0, 0], [F.nada.ini, 0], [F.caminho.fim, 360, 'lin'], [APAGA, 500, 'lin'], [F.brasilia.fim, 500],
  [LUA_APAGA, 500], [LUA_APAGA + 1.3, 501, 'lin'], [B.b4.ini, 501], [B.b4.fim, 520, 'lin'],
  [F.jupiter.ini, 520], [palavra('jupiter', 'hora') + 0.5, 4680, 'io'],
  [F.reta.ini, 4680], [palavra('horas', 'quatro') + 0.5, 12900, 'io'],
  [F.esfria.ini, 12900], [palavra('esfria', 'dia') + 0.4, 86400, 'io'],
  [palavra('dias', 'dois') - 0.1, 86400], [palavra('dias', 'três') + 0.5, 3 * 86400, 'io'],
  [F.silencio.fim - 0.7, 3 * 86400], [F.volta.ini, 0, 'io'],
];
function relogio(t) {
  for (let i = 1; i < RELOGIO.length; i++) {
    const [t0, a] = RELOGIO[i - 1], [t1, b, e] = RELOGIO[i];
    if (t <= t1) { const k = ramp(t, t0, t1); return e === 'io' ? lerp(a, b, io(k)) : e ? lerp(a, b, k) : (t >= t1 ? b : a); }
  }
  return 0;
}
const p2 = (n) => String(Math.floor(n)).padStart(2, '0');
function hora(s) {
  if (s < 3600) return `${p2(s / 60)}:${p2(s % 60)}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h${p2((s % 3600) / 60)}`;
  const d = Math.floor(s / 86400 + 1e-6); return d === 1 ? '1 dia' : `${d} dias`;
}
// variação da temperatura média (ESTIMATIVA, F9): 0 → −20 °C por dia, no começo
const QUEDA = [palavra('esfria', 'vinte') - 0.1, palavra('esfria', 'dia') + 0.4];
const dT = (t) => -20 * io(ramp(t, ...QUEDA)) * (1 - io(ramp(t, F.silencio.fim - 0.7, F.volta.ini)));

// aparência: 0 = real (com Sol), 1 = e se (sem Sol, planta técnica)
function modo(t, k) {
  if (k === 0) return 0;
  if (k === 1 || k === 2) return t < CORTE_ESPACO ? 0 : k === 1 ? 0 : io(ramp(t, APAGA - 0.15, APAGA + 1.1));
  if (k === 3) return io(ramp(t, LUA_APAGA - 0.1, LUA_APAGA + 1.0));
  if (k === 9) return t < CORTE_VOLTA ? 1 : 1 - io(ramp(t, CORTE_VOLTA, F.volta.ini + 0.9));
  return 1;
}

// ------------------------------------------------------------- luzes
const hemi = new THREE.HemisphereLight(0xe8f3ff, 0x6a6a52, 1.0); scene.add(hemi);
const luz = new THREE.DirectionalLight(0xfff4e0, 2.8);
luz.castShadow = true; luz.shadow.mapSize.set(4096, 4096);
Object.assign(luz.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 900 });
luz.shadow.bias = -0.0008; luz.shadow.normalBias = 0.4; scene.add(luz, luz.target);
const discoSol = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true }));
scene.add(discoSol);
const brilho = new THREE.PointLight(0xc4e2ff, 0, 60, 1.6); scene.add(brilho);

// ------------------------------------------------------------- texturas feitas em código
const r = rng(11);
function texJanelas(cor = '#e9e6dc', vidro = '#41606e', andares = 28, colunas = 10) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = cor; g.fillRect(0, 0, 256, 512);
  const h = 512 / andares;
  for (let i = 0; i < andares; i++) { g.fillStyle = vidro; g.fillRect(0, i * h + h * 0.28, 256, h * 0.52); }
  g.fillStyle = cor; for (let j = 0; j <= colunas; j++) g.fillRect((j * 256) / colunas - 1.5, 0, 3, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function texLua() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#b9b7b1'; g.fillRect(0, 0, 1024, 512);
  const rr = rng(5);
  // mares escuros
  for (const [x, y, w, h] of [[300, 180, 170, 90], [430, 230, 120, 80], [360, 300, 90, 60], [520, 170, 80, 60], [250, 260, 70, 50], [700, 300, 90, 50]]) {
    g.fillStyle = 'rgba(110,108,104,0.85)'; g.beginPath(); g.ellipse(x, y, w, h, rr() * 2, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 260; i++) {
    const x = rr() * 1024, y = 40 + rr() * 432, s = 2 + Math.pow(rr(), 3) * 26;
    g.strokeStyle = 'rgba(80,78,74,0.55)'; g.lineWidth = Math.max(1, s * 0.18); g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(225,223,216,0.35)'; g.beginPath(); g.arc(x + s * 0.2, y - s * 0.2, s * 0.6, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texJupiter() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const cores = ['#d9c3a0', '#b98a5e', '#efe3cc', '#a8744c', '#e8d6b6', '#c49a6c', '#f2e8d5', '#9c6a45', '#e0c9a6', '#c7a27a'];
  for (let y = 0; y < 512; y += 4) { const k = Math.floor((Math.sin(y * 0.045) * 0.5 + 0.5) * 9.99 + (y % 37 === 0 ? 1 : 0)) % 10; g.fillStyle = cores[k]; g.fillRect(0, y, 1024, 4); }
  g.fillStyle = '#b5523b'; g.beginPath(); g.ellipse(700, 340, 60, 28, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------- peças
function pessoa(camisa = 0xc0563b, calcaCor = 0x2c3e5a, pele = 0xc99a74) {
  const g = new THREE.Group();
  const mp = mat(pele, COR.eseFill2), roupa = mat(camisa, COR.eseFill2), calca = mat(calcaCor, COR.eseFill), sapato = mat(0x2a2a2a, COR.eseFill);
  for (const x of [-0.15, 0.15]) {
    const p = solido(new THREE.CylinderGeometry(0.12, 0.1, 0.92, 10), calca); p.position.set(x, 0.52, 0); g.add(p);
    const s = solido(new THREE.BoxGeometry(0.2, 0.1, 0.34), sapato); s.position.set(x, 0.05, 0.06); g.add(s);
  }
  const quadril = solido(new THREE.CylinderGeometry(0.29, 0.27, 0.22, 12), calca); quadril.position.y = 1.02; g.add(quadril);
  const tronco = solido(new THREE.CylinderGeometry(0.33, 0.28, 0.72, 12), roupa); tronco.position.y = 1.47; g.add(tronco);
  const ombro = solido(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), roupa); ombro.position.y = 1.8; ombro.scale.y = 0.45; g.add(ombro);
  for (const x of [-0.41, 0.41]) {
    const b = solido(new THREE.CylinderGeometry(0.09, 0.075, 0.7, 8), roupa); b.position.set(x, 1.45, 0); b.rotation.z = x > 0 ? 0.1 : -0.1; g.add(b);
    const m = solido(new THREE.SphereGeometry(0.075, 8, 6), mp); m.position.set(x * 1.08, 1.06, 0); g.add(m);
  }
  const pesc = solido(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 8), mp); pesc.position.y = 1.92; g.add(pesc);
  const cabeca = solido(new THREE.SphereGeometry(0.22, 16, 12), mp); cabeca.position.y = 2.13; cabeca.scale.set(0.92, 1.08, 0.98); g.add(cabeca);
  const cabelo = solido(new THREE.SphereGeometry(0.23, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x2b1d14, COR.eseFill)); cabelo.position.y = 2.17; g.add(cabelo);
  return g;
}
function arvoreCerrado(h = 4, s = 2.2) {
  const g = new THREE.Group();
  const tr = solido(new THREE.CylinderGeometry(0.16, 0.28, h, 7), mat(0x5e4630, COR.eseFill)); tr.position.y = h / 2; tr.rotation.z = (r() - 0.5) * 0.25; g.add(tr);
  for (let i = 0; i < 3; i++) {
    const c = solido(new THREE.IcosahedronGeometry(s * (0.7 + r() * 0.4), 1), mat(i % 2 ? 0x5f8f3a : 0x6e9c44, COR.eseFill2));
    c.position.set((r() - 0.5) * s, h + s * 0.25 + r() * 0.5, (r() - 0.5) * s); c.scale.y = 0.55; g.add(c);
  }
  return g;
}
function poste(h = 7) {
  const g = new THREE.Group(); const m = mat(0x8c939a, COR.eseFill2);
  const p = solido(new THREE.CylinderGeometry(0.09, 0.13, h, 8), m); p.position.y = h / 2; g.add(p);
  const braco = solido(new THREE.BoxGeometry(1.4, 0.1, 0.12), m); braco.position.set(0.6, h - 0.1, 0); g.add(braco);
  const lamp = solido(new THREE.BoxGeometry(0.6, 0.14, 0.3), mat(0xeeeeee, COR.eseFill2)); lamp.position.set(1.2, h - 0.2, 0); g.add(lamp);
  return g;
}

// ------------------------------------------------------------- BRASÍLIA (b0, b1, b2, b9): Eixo Monumental ao meio-dia
const bsb = new THREE.Group(); scene.add(bsb);
const branco = () => mat(0xeceae3, COR.eseFill2);
const gramado = solido(new THREE.PlaneGeometry(1400, 1400), mat(0x86ad4f, 0x1f3550), false, false);
gramado.rotation.x = -Math.PI / 2; bsb.add(gramado);
const gradeB = new THREE.GridHelper(1400, 140, COR.eseLinha, COR.eseLinha); gradeB.material.transparent = true; gradeB.position.y = 0.05; bsb.add(gradeB);
for (const x of [-70, 70]) { // as duas pistas do eixo
  const pista = solido(new THREE.PlaneGeometry(26, 1200), mat(0x55585e, 0x18263a), false, false); pista.rotation.x = -Math.PI / 2; pista.position.set(x, 0.03, 200); bsb.add(pista);
  for (let z = -100; z < 700; z += 14) { const f = solido(new THREE.PlaneGeometry(0.4, 6), mat(0xf2f2f2, COR.eseLinha), false, false); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.06, z); bsb.add(f); }
}
// calçada da praça em primeiro plano
const calcada = solido(new THREE.PlaneGeometry(5, 220), mat(0xd8cdb6, 0x22344c), false, false); calcada.rotation.x = -Math.PI / 2; calcada.position.set(16, 0.04, 20); bsb.add(calcada);
// Congresso Nacional: plataforma, duas torres com passarela, cúpula do Senado (convexa) e da Câmara (côncava)
const congresso = new THREE.Group(); congresso.position.set(0, 0, -150); bsb.add(congresso);
const plataforma = solido(new THREE.BoxGeometry(220, 6, 70), branco()); plataforma.position.y = 3; congresso.add(plataforma);
const rampa = solido(new THREE.BoxGeometry(14, 0.6, 46), branco()); rampa.position.set(0, 3, 56); rampa.rotation.x = 0.13; congresso.add(rampa);
const janelas = texJanelas();
const matTorre = mat(0xffffff, COR.eseFill2, { map: janelas });
for (const x of [-9.5, 9.5]) { const tw = solido(new THREE.BoxGeometry(15, 100, 10), matTorre); tw.position.set(x, 56, -12); congresso.add(tw); }
for (const y of [62, 70]) { const pass = solido(new THREE.BoxGeometry(4.2, 4, 7), branco()); pass.position.set(0, y, -12); congresso.add(pass); }
const R_SEN = 15.3, TH_SEN = 1.14;
const senado = solido(new THREE.SphereGeometry(R_SEN, 48, 16, 0, Math.PI * 2, 0, TH_SEN), branco(), false);
senado.position.set(-52, 6 - R_SEN * Math.cos(TH_SEN), 6); congresso.add(senado);
const camara = solido(new THREE.LatheGeometry([[4, 0], [12, 2.5], [21, 6.5], [28, 10.5], [31, 12.6], [30, 13], [21, 8.2], [10, 5], [0, 4.4]].map(([x, y]) => new THREE.Vector2(x, y)), 64), mat(0xeceae3, COR.eseFill2, { side: THREE.DoubleSide }), false);
camara.position.set(54, 6, 8); congresso.add(camara);
const espelho = solido(new THREE.PlaneGeometry(150, 26), mat(0x5d8fb3, 0x162a40, { roughness: 0.2 }), false, false);
espelho.rotation.x = -Math.PI / 2; espelho.position.set(0, 0.08, 52); congresso.add(espelho);
// Esplanada dos Ministérios: blocos longos em fila dos dois lados
const janMin = texJanelas('#e6e1d3', '#4d6a5b', 10, 16);
for (const lado of [-1, 1]) for (let i = 0; i < 9; i++) {
  const m = solido(new THREE.BoxGeometry(80, 36, 15), mat(0xffffff, i % 2 ? COR.eseFill : COR.eseFill2, { map: janMin }));
  m.position.set(lado * 140, 18, -40 + i * 62); bsb.add(m);
}
// árvores do cerrado, postes, gente
for (let i = 0; i < 40; i++) {
  const lado = i % 2 ? 1 : -1, z = -60 + (i >> 1) * 22 + r() * 8;
  const a = arvoreCerrado(3 + r() * 2.5, 1.8 + r() * 1.2); a.position.set(lado * (40 + r() * 14), 0, z); bsb.add(a);
}
for (let z = 0; z < 160; z += 30) for (const x of [-52, 52]) { const p = poste(); p.position.set(x, 0, z); p.rotation.y = x > 0 ? Math.PI : 0; bsb.add(p); }
const voce = pessoa(0xd2553a, 0x2c3e5a); voce.position.set(12.5, 0, 102); voce.rotation.y = Math.PI + 0.15; bsb.add(voce);
const gente = [];
for (const [x, z, c, ry] of [[-4, 70, 0x3a6ea5, 0.4], [-2.8, 70.6, 0xe0b23a, 0.2], [14, 58, 0x5a8a5a, -0.8], [-18, 40, 0x7a4a8a, 1.2], [20, 20, 0xb84a4a, 2.4], [-9, 12, 0x3a6ea5, 0.1]]) {
  const p = pessoa(c); p.position.set(x, 0, z); p.rotation.y = ry; bsb.add(p); gente.push(p);
}
const rotBsb = rotulo('BRASÍLIA · CONGRESSO NACIONAL', { tam: 44, largura: 30 }); rotBsb.position.set(22, 16, -92); bsb.add(rotBsb);
const rotApaga = rotulo('12h08 · O CÉU APAGA', { tam: 44, largura: 34, cor: '#FACC15' }); rotApaga.position.set(0, 128, -160); bsb.add(rotApaga);

// estrelas (fixas, sem brilho)
const estrelas = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: 3000 }, () => { const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1); return [Math.sin(b) * Math.cos(a) * 2000, Math.cos(b) * 2000, Math.sin(b) * Math.sin(a) * 2000]; }).flat(), 3)),
  new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false }));
scene.add(estrelas);

// ------------------------------------------------------------- ÓRBITA (b1 fim, b4, b6): esquema, FORA DE ESCALA
const orb = new THREE.Group(); scene.add(orb);
const RO = 30;
const tracejado = (pts, cor, op, dash = 1.2, gap = 0.9) => {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: cor, dashSize: dash, gapSize: gap, transparent: true, opacity: op }));
  l.computeLineDistances(); return l;
};
const circ = (R, n = 256) => Array.from({ length: n + 1 }, (_, i) => v3(Math.sin((i / n) * Math.PI * 2) * R, 0, Math.cos((i / n) * Math.PI * 2) * R));
const orbita = tracejado(circ(RO), 0xc4e2ff, 0.9); orb.add(orbita);
const solVazio = tracejado(circ(3.2, 96), 0xc4e2ff, 0.9, 0.5, 0.35); solVazio.rotation.x = Math.PI / 2; orb.add(solVazio);
const rotSolVazio = rotulo('ONDE ESTAVA O SOL', { tam: 40, largura: 17 }); rotSolVazio.position.set(0, 2, 6.5); orb.add(rotSolVazio);
// a última luz do Sol: uma casca que viaja até a Terra
const casca = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 160), new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true, side: THREE.DoubleSide }));
casca.rotation.x = -Math.PI / 2; orb.add(casca);
const casca2 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 160), new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true, opacity: 0, side: THREE.DoubleSide }));
casca2.rotation.x = -Math.PI / 2; orb.add(casca2);
// ondas de gravidade (mesma velocidade da luz)
const ondas = [0, 1, 2].map(() => { const o = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 160), new THREE.MeshBasicMaterial({ color: 0xc4e2ff, transparent: true, side: THREE.DoubleSide })); o.rotation.x = -Math.PI / 2; orb.add(o); return o; });
const RT = 3.4;
const terraO = globo(RT); orb.add(terraO);
const PHI0 = -0.42, PHI1 = -0.16; // ângulo da Terra na órbita
const posOrb = (f) => v3(Math.sin(f) * RO, 0, Math.cos(f) * RO);
const dirTan = (f) => v3(Math.cos(f), 0, -Math.sin(f)).normalize();
const tangente = tracejado([posOrb(PHI1).add(dirTan(PHI1).multiplyScalar(-14)), posOrb(PHI1).add(dirTan(PHI1).multiplyScalar(120))], 0xffffff, 1, 1.6, 0.8); orb.add(tangente);
const rotTerra = rotulo('TERRA', { tam: 40, largura: 7 }); orb.add(rotTerra);
const rotRota = rotulo('LINHA RETA · PELA TANGENTE', { tam: 40, largura: 22 }); orb.add(rotRota);
const rotOrb = rotulo('ÓRBITA', { tam: 40, largura: 8 }); rotOrb.position.copy(posOrb(-0.95)).add(v3(-2, 2, 0)); orb.add(rotOrb);
const rotFora = rotulo('FORA DE ESCALA', { tam: 36, largura: 14, cor: '#c4e2ff' }); orb.add(rotFora);
const rot150 = rotulo('150 MILHÕES DE KM', { tam: 40, largura: 17 }); orb.add(rot150);

// ------------------------------------------------------------- LUA (b3)
const luaG = new THREE.Group(); scene.add(luaG);
const texL = texLua(); const matLua = new THREE.MeshStandardMaterial({ map: texL, emissiveMap: texL, roughness: 1, color: 0xffffff });
const lua = new THREE.Mesh(new THREE.SphereGeometry(4, 128, 64), matLua); luaG.add(lua);
const contornoLua = new THREE.Mesh(new THREE.RingGeometry(4.02, 4.1, 160), new THREE.MeshBasicMaterial({ color: COR.eseLinha, transparent: true, side: THREE.DoubleSide }));
luaG.add(contornoLua);
const rotLua = rotulo('LUA · SÓ REFLETE A LUZ DO SOL', { tam: 40, largura: 10.5 }); rotLua.position.set(0, 5.3, 0); luaG.add(rotLua);
const rotEstrelas = rotulo('AS ESTRELAS CONTINUAM', { tam: 40, largura: 8.4 }); rotEstrelas.position.set(0, 5.3, 0); luaG.add(rotEstrelas);

// ------------------------------------------------------------- JÚPITER (b5): o único ponto ainda iluminado
const jup = new THREE.Group(); scene.add(jup);
const jupiter = new THREE.Mesh(new THREE.SphereGeometry(4, 128, 64), new THREE.MeshStandardMaterial({ map: texJupiter(), roughness: 0.95 })); jup.add(jupiter);
const rotJ = rotulo('JÚPITER · AINDA ILUMINADO', { tam: 44, largura: 9.5 }); rotJ.position.set(0, 5.4, 0); jup.add(rotJ);
const raio = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true })); jup.add(raio);

// ------------------------------------------------------------- RÉGUA TERRA–LUA (b6, 2ª frase): EM ESCALA
const regua = new THREE.Group(); scene.add(regua);
const RE = 6.371, DL = 384.4; // 1 unidade = 1.000 km
const terraE = globo(RE); terraE.position.set(0, 0, 0); regua.add(terraE);
const luaE = new THREE.Mesh(new THREE.SphereGeometry(1.737, 48, 24), new THREE.MeshStandardMaterial({ color: 0x9aa7b8, emissive: 0x2a3a50, roughness: 1 })); luaE.position.set(DL, 0, 0); regua.add(luaE);
const orbLua = tracejado(circ(DL, 512), 0xc4e2ff, 0.6, 6, 5); regua.add(orbLua);
const trilha = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff })); regua.add(trilha);
for (let i = 0; i <= 4; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), new THREE.MeshBasicMaterial({ color: 0xc4e2ff, transparent: true, opacity: 0.8 })); tk.position.set((DL * i) / 4, -16, 0); regua.add(tk); }
const linhaRegua = new THREE.Mesh(new THREE.BoxGeometry(DL, 1, 1), new THREE.MeshBasicMaterial({ color: 0xc4e2ff, transparent: true, opacity: 0.8 })); linhaRegua.position.set(DL / 2, -16, 0); regua.add(linhaRegua);
for (const x of [0, DL]) { const mk = new THREE.Mesh(new THREE.RingGeometry(13, 15, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); mk.position.set(x, 0, 0); mk.userData.mk = true; regua.add(mk); }
const marcaT = regua.children[regua.children.length - 2];
const rotR = rotulo('384.400 KM · EM ESCALA', { tam: 44, largura: 210 }); rotR.position.set(DL / 2, -50, 0); regua.add(rotR);
const rotRT = rotulo('TERRA', { tam: 40, largura: 70 }); rotRT.position.set(0, 36, 0); regua.add(rotRT);
const rotRL = rotulo('LUA', { tam: 40, largura: 50 }); rotRL.position.set(DL, 36, 0); regua.add(rotRL);

// ------------------------------------------------------------- GLOBO CONGELANDO (b7): Brasil à frente
const giro = new THREE.Group(); scene.add(giro);
const RG = 3;
const terraG = globo(RG); giro.add(terraG);
const geloU = { lim: { value: 1.2 }, op: { value: 0 } };
const geloG = new THREE.Mesh(new THREE.SphereGeometry(RG * 1.006, 128, 64), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: geloU,
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  // o gelo desce dos polos para o equador; borda irregular (só função da posição, nada aleatório)
  fragmentShader: 'uniform float lim, op; varying vec3 p; void main(){ float n = 0.025*sin(p.x*11.0+p.z*7.0)+0.015*sin(p.z*19.0-p.y*9.0); float a = smoothstep(lim-0.06, lim+0.06, abs(p.y)+n); gl_FragColor = vec4(mix(vec3(0.80,0.90,1.0), vec3(0.95,0.98,1.0), abs(p.y)), a*op); }',
}));
giro.add(geloG);
const rotGelo = rotulo('ABAIXO DE 0 °C', { tam: 44, largura: 4.4 }); scene.add(rotGelo);
const rotBr = rotulo('BRASIL', { tam: 40, largura: 2.0 }); scene.add(rotBr);

// ------------------------------------------------------------- FUNDO DO MAR (b8): fontes hidrotermais
const mar = new THREE.Group(); scene.add(mar);
const leito = solido(new THREE.PlaneGeometry(300, 300, 60, 60), mat(0x3b4656, 0x20344c), false, false);
leito.rotation.x = -Math.PI / 2;
{ const p = leito.geometry.attributes.position; const rr = rng(3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.9 * Math.sin(x * 0.21) * Math.cos(y * 0.17) + rr() * 0.35 + Math.max(0, -y - 30) * 0.12); } leito.geometry.computeVertexNormals(); }
mar.add(leito);
const gradeM = new THREE.GridHelper(300, 75, COR.eseLinha, COR.eseLinha); gradeM.material.transparent = true; gradeM.material.opacity = 0.18; gradeM.position.y = 0.6; mar.add(gradeM);
const bocas = [];
const matRocha = () => mat(0x4a4038, COR.eseFill2);
function chamine(x, z, h, rb, seed) {
  const g = new THREE.Group(); const rr = rng(seed); let y = 0, rad = rb;
  const n = 4 + Math.floor(rr() * 2);
  for (let i = 0; i < n; i++) {
    const hh = h / n * (0.8 + rr() * 0.4), r2 = rad * (0.68 + rr() * 0.12);
    const seg = solido(new THREE.CylinderGeometry(r2, rad, hh, 9, 1), matRocha()); seg.position.set((rr() - 0.5) * 0.3, y + hh / 2, (rr() - 0.5) * 0.3); seg.rotation.y = rr() * 3; g.add(seg);
    if (i < n - 1 && rr() > 0.35) { const lob = solido(new THREE.DodecahedronGeometry(rad * 0.55, 0), matRocha()); lob.position.set((rr() - 0.5) * rad * 1.6, y + hh * 0.5, (rr() - 0.5) * rad * 1.6); g.add(lob); }
    y += hh; rad = r2;
  }
  const boca = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.7, rad * 0.7, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xdff2ff }));
  boca.position.y = y + 0.05; g.add(boca);
  // a coluna de água quente (sem partículas): cone translúcido parado
  g.position.set(x, 0, z); mar.add(g); bocas.push({ g, topo: y, rb });
  return g;
}
chamine(0, 0, 16, 2.6, 21); chamine(-9, -7, 11, 2.0, 22); chamine(8, -12, 20, 2.8, 23); chamine(-18, -22, 14, 2.3, 24); chamine(16, 4, 8, 1.6, 25);
// micróbios: tapetes e colônias claras perto das bocas (bactérias e arqueias)
const matMicro = new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x6fd6e8, emissiveIntensity: 0.9, roughness: 0.6 });
const microbios = new THREE.Group(); mar.add(microbios);
{
  // tapetes de micróbios: manchas densas no pé de cada chaminé e no flanco perto da boca
  const rr = rng(9); const geo = new THREE.CapsuleGeometry(0.11, 0.22, 4, 8);
  for (const { g, topo, rb } of bocas) {
    for (let mancha = 0; mancha < 5; mancha++) {
      const a0 = rr() * Math.PI * 2, noFlanco = mancha >= 3;
      const hy0 = noFlanco ? topo * (0.75 + rr() * 0.2) : 0.15;
      for (let i = 0; i < 70; i++) {
        const a = a0 + (rr() - 0.5) * 0.9, hy = noFlanco ? hy0 + (rr() - 0.5) * 1.2 : 0.12 + rr() * 0.1;
        const rad = noFlanco ? rb * 0.42 + 0.05 : rb + 0.3 + rr() * 1.4;
        const m = new THREE.Mesh(geo, matMicro);
        m.position.set(g.position.x + Math.cos(a) * rad, hy, g.position.z + Math.sin(a) * rad);
        m.rotation.set(rr() * 3, rr() * 3, rr() * 3); microbios.add(m);
      }
    }
  }
}
const luzVent = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xbfe6ff, 0, 40, 1.5); mar.add(l); return l; });
const rotMicro = rotulo('BACTÉRIAS E ARQUEIAS · QUIMIOSSÍNTESE', { tam: 40, largura: 15 }); rotMicro.position.set(3, 4.5, 6); mar.add(rotMicro);
const rotVent = rotulo('FONTE HIDROTERMAL', { tam: 40, largura: 9 }); rotVent.position.set(3, 4.5, 6); mar.add(rotVent);
const superficie = solido(new THREE.PlaneGeometry(600, 600), mat(0xdfeaf2, 0x3a5a80), false, false); superficie.rotation.x = Math.PI / 2; superficie.position.y = 120; mar.add(superficie);

const GRUPOS = [bsb, orb, luaG, jup, regua, giro, mar];
const so = (...gs) => GRUPOS.forEach((g) => (g.visible = gs.includes(g)));
const alvoX = (t, k) => (k === 6 ? lerp(-4, 10, io(ramp(t, CORTES[6], CORTE_ESCALA))) : -4);
const ROTS_ORB = [rotTerra, rotRota, rotOrb, rotFora, rot150, rotSolVazio];

// ------------------------------------------------------------- aparelho (DOM)
const apNum = document.getElementById('ap-num'), apTemp = document.getElementById('ap-temp'), apCol = document.getElementById('ap-coluna');
const apDisco = document.getElementById('ap-disco'), apCont = document.getElementById('ap-contorno');
function aparelho(t) {
  const s = relogio(t), txt = hora(s);
  apNum.textContent = txt; apNum.style.fontSize = txt.length > 5 ? '68px' : '88px';
  const d = dT(t);
  apTemp.textContent = d > -0.05 ? '0 °C' : `−${Math.abs(d).toFixed(0)} °C/dia`;
  const h = 56 * (1 - Math.abs(d) / 20 * 0.7); apCol.setAttribute('y', (76 - h).toFixed(1)); apCol.setAttribute('height', h.toFixed(1));
  // o ícone do Sol: cheio enquanto ele existe; contorno tracejado depois que some (o sumiço é no fim da pergunta)
  const sem = ramp(t, F.titulo.fim, F.titulo.fim + 0.6) * (1 - ramp(t, F.volta.ini, F.volta.ini + 0.6));
  apDisco.setAttribute('opacity', (1 - sem).toFixed(3)); apCont.setAttribute('opacity', sem.toFixed(3));
}

// ------------------------------------------------------------- câmera
// oy = quantos pixels o alvo fica ABAIXO do centro do quadro (o topo é do aparelho e dos cartões)
const cam = (p, alvo, fov = 38, oy = 0) => { camera.position.copy(p); camera.fov = fov; if (oy) camera.setViewOffset(1080, 1920, 0, -oy, 1080, 1920); else camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.lookAt(alvo); };
// câmera da capa = câmera do último quadro
const CAPA_P0 = v3(14, 2.1, 110), CAPA_A0 = v3(-4, 28, -150), CAPA_P1 = v3(13.4, 2.2, 107.5);
const SOL_DIR = v3(-0.12, 0.62, -1).normalize();

function renderAt(t) {
  t = clamp(t, 0, FIM);
  const k = cena(t), m = modo(t, k);
  aparencia(m); ceuDome.set(m);
  scene.background = null; ceuDome.mesh.visible = true; estrelas.visible = false; estrelas.material.opacity = 0.8;
  discoSol.visible = false; brilho.intensity = 0; luz.castShadow = true;
  hemi.color.set(0xe8f3ff); hemi.groundColor.set(0x6a6a52);
  for (const l of ROTS_ORB) l.material.opacity = 0;
  rotApaga.material.opacity = 0;
  const espaco = () => { ceuDome.mesh.visible = false; estrelas.visible = true; scene.background = new THREE.Color(0x05070c); };

  const emBsb = k === 0 || k === 2 || (k === 1 && t < CORTE_ESPACO) || k === 9;
  if (emBsb) {
    so(bsb);
    gradeB.material.opacity = 0.32 * m;
    const sol = 1 - m;
    hemi.intensity = lerp(1.0, 1.25, m); luz.intensity = 2.9 * sol; luz.castShadow = sol > 0.05;
    luz.position.copy(SOL_DIR.clone().multiplyScalar(400)).add(v3(0, 0, -60)); luz.target.position.set(0, 0, -20);
    discoSol.visible = sol > 0.01; discoSol.material.opacity = sol;
    discoSol.position.copy(SOL_DIR.clone().multiplyScalar(1800)); discoSol.scale.setScalar(42);
    if (m > 0.5) { estrelas.visible = true; estrelas.material.opacity = 0.55 * ramp(m, 0.5, 1); }
    rotBsb.material.opacity = k === 2 ? win(t, CORTES[2] + 0.3, APAGA - 0.3) : 0;
    if (k === 0 || (k === 9 && t >= CORTE_VOLTA)) {
      // capa e volta: a MESMA câmera no começo e no fim (o reel volta ao começo)
      const z = k === 0 ? out3(ramp(t, 0, CORTES[1])) : 1 - io(ramp(t, F.volta.ini, FIM - 0.4));
      cam(CAPA_P0.clone().lerp(CAPA_P1, z), CAPA_A0, 40);
    } else if (k === 9) { // "oito minutos de silêncio": a praça sem Sol, câmera alta
      const f = ramp(t, CORTES[9], CORTE_VOLTA);
      cam(v3(lerp(-46, -38, io(f)), lerp(30, 26, f), lerp(150, 128, io(f))), v3(0, 34, -150), 40, 260);
    } else if (k === 1) { // você, na praça, olhando o Congresso: nada mudou
      const f = ramp(t, CORTES[1], CORTE_ESPACO);
      cam(v3(lerp(13.6, 13.2, io(f)), 2.3, lerp(108.5, 107.2, io(f))), v3(lerp(-2, -3, f), 14, -60), 40, 160);
    } else {
      const f = ramp(t, CORTES[2], CORTES[3]);
      cam(v3(lerp(62, 48, io(f)), lerp(16, 20, io(f)), lerp(40, 20, io(f))), v3(-6, 36, -150), 42, 300);
    }
  } else if (k === 1 || k === 4 || (k === 6 && t < CORTE_ESCALA)) {
    so(orb); espaco();
    const tCasca = k === 1 ? ramp(t, CORTE_ESPACO, B.b1.fim + 0.2) : 1;
    const raioCasca = lerp(3.4, RO + 8, tCasca);
    casca.visible = casca2.visible = k === 1; casca.scale.setScalar(raioCasca); casca2.scale.setScalar(Math.max(0.01, raioCasca - 1.2));
    casca.material.opacity = 1;
    const iluminada = k === 1 && raioCasca < RO ? 1 : 0;
    terraO.userData.set(k === 1 ? 0 : 1);
    luz.castShadow = false; hemi.intensity = 0.35;
    luz.intensity = 3.0 * iluminada; luz.position.set(0, 0, 0); luz.target.position.copy(posOrb(PHI0));
    if (!iluminada) { hemi.intensity = 1.3; hemi.color.set(0xc4e2ff); hemi.groundColor.set(0x2b4462); }
    ondas.forEach((o, i) => {
      const t0 = F.gravidade.ini + i * 0.8, kk = ramp(t, t0, t0 + 3.0);
      o.visible = k === 4 && kk > 0 && kk < 1; o.scale.setScalar(lerp(3.4, RO + 10, kk)); o.material.opacity = 0.95 * (1 - kk * 0.7);
    });
    let pos;
    if (k === 6) pos = posOrb(PHI1).add(dirTan(PHI1).multiplyScalar(io(ramp(t, palavra('reta', 'linha') - 0.5, CORTE_ESCALA)) * 24));
    else pos = posOrb(k === 1 ? PHI0 : lerp(PHI0, PHI1, ramp(t, CORTES[4], CORTES[5])));
    terraO.position.copy(pos); terraO.rotation.set(0.3, 0.9 + t * 0.05, 0);
    tangente.visible = k === 6; tangente.material.opacity = k === 6 ? out3(ramp(t, CORTES[6], CORTES[6] + 0.8)) : 0;
    rotTerra.material.opacity = 1; rotTerra.position.copy(pos).add(v3(-(RT + 5), 0, 0));
    rotOrb.material.opacity = k === 4 ? win(t, F.orbita.ini, CORTES[5]) : 0;
    rotSolVazio.material.opacity = 1;
    rotFora.material.opacity = k === 1 ? 1 - rot150.material.opacity : 1;
    rot150.material.opacity = k === 1 ? win(t, CORTE_ESPACO + 0.4, CORTES[2]) : 0;
    rot150.position.set(7, 0, 33);
    rotRota.material.opacity = k === 6 ? win(t, palavra('reta', 'linha'), CORTE_ESCALA) : 0;
    rotRota.position.copy(posOrb(PHI1).add(dirTan(PHI1).multiplyScalar(14))).add(v3(0, 0, -4.5));
    // câmera alta, inclinada 60°: o Sol vazio em cima, a Terra embaixo
    const D = 105, alvo = v3(-4, 0, 15);
    let g = 0;
    if (k === 1) g = ramp(t, CORTE_ESPACO, CORTES[2]);
    else if (k === 4) g = ramp(t, CORTES[4], CORTES[5]);
    else { g = ramp(t, CORTES[6], CORTE_ESCALA); alvo.x = lerp(-4, 10, io(g)); alvo.z = lerp(15, 18, io(g)); }
    const d = D * lerp(1.04, 0.97, io(g));
    cam(alvo.clone().add(v3(0, d * Math.sin(60 * D2R), d * Math.cos(60 * D2R))), alvo, 40, 330);
    rotFora.position.set(alvo.x + 11, 0, 33);
  } else if (k === 3) {
    so(luaG); espaco();
    luz.castShadow = false;
    luz.intensity = 3.2 * (1 - m); luz.position.set(-40, 10, 30); luz.target.position.set(0, 0, 0);
    hemi.intensity = 0.12; hemi.color.set(0xc4e2ff);
    matLua.color.setRGB(1, 1, 1).lerp(new THREE.Color(COR.eseFill2), m);
    matLua.emissive.set(0x5a86b8).multiplyScalar(0.9 * m);
    contornoLua.material.opacity = m;
    rotLua.material.opacity = win(t, CORTES[3] + 0.3, F.estrelas.ini - 0.1);
    rotEstrelas.material.opacity = win(t, F.estrelas.ini, CORTES[4]);
    const g = ramp(t, CORTES[3], CORTES[4]);
    lua.rotation.y = 0.4 + g * 0.15;
    cam(v3(0, 0, lerp(37, 33, io(g))), v3(0, 0, 0), 40, 520);
    contornoLua.lookAt(camera.position);
  } else if (k === 5) {
    so(jup); espaco();
    luz.castShadow = false; hemi.intensity = 0.2; luz.intensity = 3.2;
    luz.position.set(-60, 6, 30); luz.target.position.set(0, 0, 0);
    jupiter.rotation.y = t * 0.3; jup.rotation.z = -3.1 * D2R;
    const g = ramp(t, CORTES[5], CORTES[6]);
    rotJ.material.opacity = win(t, CORTES[5] + 0.3, CORTES[6]);
    const L = 26; raio.scale.set(1, L, 1); raio.rotation.set(0, 0, Math.PI / 2); raio.position.set(-4.1 - L / 2, 0, 0);
    raio.material.opacity = 0.9 * win(t, CORTES[5] + 0.2, CORTES[6]);
    cam(v3(0, 0, lerp(34, 30, io(g))), v3(0, 0, 0), 40, 520);
  } else if (k === 6) { // régua Terra–Lua EM ESCALA (1 unidade = 1.000 km)
    so(regua); espaco();
    luz.castShadow = false; hemi.intensity = 1.4; hemi.color.set(0xc4e2ff); hemi.groundColor.set(0x2b4462);
    terraE.userData.set(1);
    const g = ramp(t, CORTE_ESCALA, CORTES[7]);
    const px = DL * io(ramp(t, palavra('horas', 'quatro') - 0.5, palavra('horas', 'horas') + 1.4)) * 0.985;
    trilha.scale.set(Math.max(0.01, px), 1.4, 1.4); trilha.position.set(px / 2, 0, 0);
    terraE.position.set(px, 0, 0); marcaT.position.set(px, 0, 0); rotRT.position.set(px, 36, 0);
    rotR.material.opacity = win(t, CORTE_ESCALA + 0.3, CORTES[7]);
    rotRT.material.opacity = 1 - ramp(px / DL, 0.55, 0.75); rotRL.material.opacity = 1;
    cam(v3(DL / 2, 0, lerp(1420, 1360, io(g))), v3(DL / 2, 0, 0), 36, 430);
  } else if (k === 7) {
    so(giro); espaco();
    luz.castShadow = false; luz.intensity = 0; hemi.intensity = 1.6; hemi.color.set(0xd8ecff); hemi.groundColor.set(0x2b4462);
    terraG.userData.set(1);
    const g = ramp(t, CORTES[7], CORTES[8]);
    giro.rotation.y = lerp(44, 56, g) * D2R; giro.rotation.x = 12 * D2R;
    const gk = io(ramp(t, palavra('esfria', 'vinte') - 0.3, palavra('dias', 'três') + 1.2));
    geloU.lim.value = lerp(0.96, 0.12, gk); geloU.op.value = 0.78 * out3(ramp(t, CORTES[7], CORTES[7] + 0.8));
    rotGelo.material.opacity = win(t, palavra('dias', 'abaixo') - 0.2, CORTES[8]);
    rotGelo.position.set(0, 3.7, 0);
    rotBr.material.opacity = win(t, CORTES[7] + 0.4, palavra('dias', 'abaixo') - 0.3);
    rotBr.position.set(0.3, -0.5, 3.4);
    cam(v3(0, 0, lerp(29, 26, io(g))), v3(0, 0, 0), 36, 520);
  } else if (k === 8) {
    so(mar); ceuDome.mesh.visible = false; scene.background = new THREE.Color(0x0b1828);
    scene.fog = new THREE.FogExp2(0x0e2036, 0.010);
    luz.castShadow = false; luz.intensity = 0.0; hemi.intensity = 1.05; hemi.color.set(0x9cc3e6); hemi.groundColor.set(0x101a28);
    bocas.slice(0, 3).forEach(({ g, topo }, i) => { luzVent[i].position.set(g.position.x, topo + 1.5, g.position.z); luzVent[i].intensity = 160; });
    const g = ramp(t, CORTES[8], CORTES[9]);
    const desce = io(ramp(t, CORTES[8], F.fontes.ini + 1.0));
    cam(v3(lerp(16, 24, io(g)), lerp(46, 15, desce), lerp(56, 40, io(g))), v3(lerp(0, -1, g), lerp(30, 9, desce), lerp(-20, -6, desce)), 42, 300);
    rotVent.material.opacity = win(t, F.fontes.ini + 0.6, palavra('fontes', 'micróbios') - 0.1);
    rotMicro.material.opacity = win(t, palavra('fontes', 'micróbios') - 0.1, CORTES[9]);
  }
  if (k !== 8) scene.fog = null;

  aparelho(t);
  cartoes(t, F, B);
  legenda(t, LEG);
  renderer.render(scene, camera);
}

ligar('sol-sumisse', renderAt);
