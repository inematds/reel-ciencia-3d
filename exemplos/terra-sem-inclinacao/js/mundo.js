// "E se a Terra não tivesse inclinação?" — o mundo 3D do reel, desenhado só a partir do tempo do vídeo.
// Fatos usados: fatos.md (F1–F12). Cenas: campo → sombra → Porto Alegre → globo (Manaus) → Antártida (Ferraz)
// → planeta (+7% em janeiro) → polo → Júpiter → volta (o último quadro repete o primeiro).
import {
  THREE, W, H, D2R, clamp, lerp, ramp, io, out3, win, v3, rng, COR,
  criarMundo, mat, solido, aparencia, ceu, globo, noGlobo, rotulo, legenda, cartoes, ligar,
} from '../motor/base.js';
import { FIM, BLOCOS as B, FRASES as F, LEG, palavra } from './tempos.js';

const { renderer, scene, camera } = criarMundo();
const ceuDome = ceu(scene);

// ------------------------------------------------------------- relógio da história
const CORTES = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].map((b, i) => (i ? B[b].ini - 0.12 : 0));
const cena = (t) => { let k = 0; CORTES.forEach((c, i) => { if (t >= c) k = i; }); return k; };
const DESCE = [F.titulo.fim + 0.1, F.titulo.fim + 1.3];
const SOBE = [palavra('volta', 'vinte') - 0.1, palavra('volta', 'graus') + 0.3];
const incl = (t) => 23.4 * (1 - io(ramp(t, ...DESCE))) + 23.4 * io(ramp(t, ...SOBE));
const modo = (t) => io(ramp(t, DESCE[0] + 0.1, DESCE[1] + 0.1)) * (1 - io(ramp(t, SOBE[0] + 0.1, SOBE[1])));

// dia do ano mostrado no aparelho: [tempo, dia, curva]
const DIAS = [
  [0, 172], [F.sombra.ini, 172], [F.doze.fim, 537, 'io'],
  [palavra('poa', 'dezembro') - 0.2, 537], [palavra('poa', 'dezembro') + 0.7, 720, 'io'],
  [palavra('ferraz', 'junho') - 0.2, 720], [palavra('ferraz', 'junho') + 0.8, 902, 'io'],
  [palavra('ferraz', 'dezembro') - 0.2, 902], [palavra('ferraz', 'dezembro') + 0.8, 1085, 'io'],
  [palavra('janeiro', 'janeiro') - 0.2, 1085], [palavra('janeiro', 'janeiro') + 0.6, 1098, 'io'],
  [F.volta.ini, 1098], [F.volta.fim + 0.2, 1632, 'io'],
];
function dia(t) {
  for (let i = 1; i < DIAS.length; i++) {
    const [t0, d0] = DIAS[i - 1], [t1, d1, e] = DIAS[i];
    if (t <= t1) { const k = ramp(t, t0, t1); return lerp(d0, d1, e === 'io' ? io(k) : e ? k : (t >= t1 ? 1 : 0)); }
  }
  return DIAS[DIAS.length - 1][1];
}
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function data(d) {
  let n = ((Math.round(d) - 1) % 365 + 365) % 365, m = 0;
  while (n >= DIAS_MES[m]) { n -= DIAS_MES[m]; m++; }
  return `${String(n + 1).padStart(2, '0')} ${MESES[m]}`;
}
const declinacao = (d, tiltDeg) => tiltDeg * Math.sin((2 * Math.PI * (d - 80)) / 365);
// direção do Sol para latitude φ, ângulo horário h (0 = meio-dia), declinação δ. Leste = +x, cima = +y, norte = -z.
function sol(phi, h, dec) {
  const p = phi * D2R, d = dec * D2R;
  const e = -Math.cos(d) * Math.sin(h), n = Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(h) * Math.sin(p);
  const u = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(h) * Math.cos(p);
  return v3(e, u, -n).normalize();
}

// ------------------------------------------------------------- luzes
const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 0.9); scene.add(hemi);
const luz = new THREE.DirectionalLight(0xfff1d6, 2.6);
luz.castShadow = true; luz.shadow.mapSize.set(2048, 2048);
Object.assign(luz.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 400 });
luz.shadow.bias = -0.0006; scene.add(luz, luz.target);
const discoSol = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: COR.amarelo }));
scene.add(discoSol);

// ------------------------------------------------------------- peças
const r = rng(7);
function pessoa(cor = 0xc0563b) {
  const g = new THREE.Group();
  const pele = mat(0xc99a74, COR.eseFill2), roupa = mat(cor, COR.eseFill2), calca = mat(0x2c3e5a, COR.eseFill);
  for (const x of [-0.17, 0.17]) { const p = solido(new THREE.CylinderGeometry(0.13, 0.12, 0.95, 8), calca); p.position.set(x, 0.48, 0); g.add(p); }
  const tronco = solido(new THREE.CylinderGeometry(0.32, 0.27, 0.85, 10), roupa); tronco.position.y = 1.38; g.add(tronco);
  for (const x of [-0.42, 0.42]) { const b = solido(new THREE.CylinderGeometry(0.09, 0.08, 0.78, 8), roupa); b.position.set(x, 1.32, 0); b.rotation.z = x > 0 ? 0.12 : -0.12; g.add(b); }
  const cabeca = solido(new THREE.IcosahedronGeometry(0.25, 1), pele); cabeca.position.y = 2.05; g.add(cabeca);
  return g;
}
function arvore(h = 3, s = 1.6) {
  const g = new THREE.Group();
  const tr = solido(new THREE.CylinderGeometry(0.18, 0.26, h, 7), mat(0x6b4a2e, COR.eseFill)); tr.position.y = h / 2; g.add(tr);
  const copa = solido(new THREE.IcosahedronGeometry(s, 0), mat(0x4e8f3a, COR.eseFill2)); copa.position.y = h + s * 0.6; g.add(copa);
  return g;
}

// CAMPO (cenas 0, 1, 8) — um gramado no Sul do Brasil (30°S)
const campo = new THREE.Group(); scene.add(campo);
const chao = solido(new THREE.CircleGeometry(160, 64), mat(0x6fa845, 0x223650), false, false);
chao.rotation.x = -Math.PI / 2; campo.add(chao);
const grade = new THREE.GridHelper(320, 80, COR.eseLinha, COR.eseLinha); grade.material.transparent = true; campo.add(grade);
const gente = pessoa(); campo.add(gente);
const gente2 = pessoa(0x3a6ea5); gente2.position.set(-2.6, 0, -3.5); gente2.scale.setScalar(0.92); campo.add(gente2);
for (let i = 0; i < 26; i++) {
  const a = Math.PI * (1.08 + r() * 0.84), d = 14 + r() * 60, t = arvore(2.4 + r() * 1.6, 1.3 + r() * 0.9);
  t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 6); campo.add(t);
}
const caminho = solido(new THREE.PlaneGeometry(2.2, 140), mat(0xd9c9a3, 0x1d2836), false, false);
caminho.rotation.x = -Math.PI / 2; caminho.position.set(3.2, 0.02, -40); campo.add(caminho);
// marcas da sombra de HOJE (com inclinação): meio-dia de junho e de dezembro em 30°S
const marcas = new THREE.Group(); campo.add(marcas);
function marca(len, txt) {
  const linha = new THREE.Mesh(new THREE.PlaneGeometry(0.08, len), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  linha.rotation.x = -Math.PI / 2; linha.position.set(0.9, 0.03, len / 2); marcas.add(linha);
  const fim = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.08), linha.material); fim.rotation.x = -Math.PI / 2; fim.position.set(0.9, 0.03, len); marcas.add(fim);
  const l = rotulo(txt, { tam: 44, largura: 1.5 }); l.position.set(2.0, 0.3, len); marcas.add(l);
  return { mat: linha.material, l };
}
const altura = 2.3; // altura da pessoa (sombra = altura / tan(elevação))
const somb = (el) => altura / Math.tan(el * D2R);
const mJun = marca(somb(90 - 30 - 23.4), 'JUN · HOJE'), mDez = marca(somb(90 - 30 + 23.4), 'DEZ · HOJE');
const rotSemIncl = rotulo('SEM INCLINAÇÃO · O ANO TODO', { tam: 40, largura: 2.9, cor: '#FACC15' });
campo.add(rotSemIncl);

// PORTO ALEGRE (cena 2) — orla do Guaíba ao fim da tarde, chaminé da Usina do Gasômetro
const cidade = new THREE.Group(); scene.add(cidade);
const agua = solido(new THREE.PlaneGeometry(600, 300), mat(0x3f6f8f, 0x101823, { roughness: 0.35 }), false, false);
agua.rotation.x = -Math.PI / 2; agua.position.set(0, 0, -150); cidade.add(agua);
const cais = solido(new THREE.BoxGeometry(600, 1, 400), mat(0x8c8a80, COR.eseFill), false); cais.position.set(0, -0.5, 200); cidade.add(cais);
for (let i = 0; i < 70; i++) {
  const w = 3 + r() * 5, h = 6 + r() * (i % 9 === 0 ? 40 : 18), d = 3 + r() * 5;
  const p = solido(new THREE.BoxGeometry(w, h, d), mat([0xd8cfc0, 0xb9a98f, 0xe6e0d4, 0x9aa4ad][i % 4], i % 2 ? COR.eseFill : COR.eseFill2));
  p.position.set(-110 + (i % 35) * 6.4 + r() * 2, h / 2, 10 + Math.floor(i / 35) * 9 + r() * 4); cidade.add(p);
}
const usina = solido(new THREE.BoxGeometry(16, 9, 10), mat(0xa0522d, COR.eseFill2)); usina.position.set(18, 4.5, 2); cidade.add(usina);
const chamine = solido(new THREE.CylinderGeometry(1.1, 1.8, 42, 12), mat(0xa0522d, COR.eseFill2)); chamine.position.set(26, 21, 2); cidade.add(chamine);
const rotPoa = rotulo('PORTO ALEGRE · 30°S', { tam: 44, largura: 26 }); rotPoa.position.set(-30, 52, 0); cidade.add(rotPoa);

// GLOBO (cenas 3 e 5) — continentes reais (Natural Earth)
const R = 3;
const giro = new THREE.Group(), globoG = new THREE.Group(); scene.add(giro); giro.add(globoG);
const terra = globo(R); globoG.add(terra);
const anelMat = (cor, op = 0.9) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op });
function paralelo(lat, cor, op) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R * 1.004, 0.012, 6, 160), anelMat(cor, op));
  m.rotation.x = Math.PI / 2; m.userData.lat = lat; globoG.add(m); return m;
}
const equador = paralelo(0, 0xffffff, 0.9);
const tropN = paralelo(23.4, COR.amarelo, 0.9), tropS = paralelo(-23.4, COR.amarelo, 0.9);
const polN = paralelo(66.6, 0x9cc3e6, 0.8), polS = paralelo(-66.6, 0x9cc3e6, 0.8);
function poeLat(m, lat) { m.position.y = R * Math.sin(lat * D2R); const s = Math.max(1e-3, Math.cos(lat * D2R)); m.scale.set(s, s, 1); }
const pinos = {};
for (const [id, lat, lon, txt] of [['poa', -30.03, -51.23, 'PORTO ALEGRE'], ['manaus', -3.12, -60.02, 'MANAUS'], ['ferraz', -62.08, -58.4, 'EST. FERRAZ']]) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 8), new THREE.MeshBasicMaterial({ color: id === 'manaus' ? COR.amarelo : 0xffffff }));
  p.position.copy(noGlobo(lat, lon, R * 1.01)); globoG.add(p);
  const l = rotulo(txt, { tam: 40, largura: 1.9 }); l.position.copy(noGlobo(lat, lon, R * 1.01)).add(v3(1.1, 0.16, 0.3)); globoG.add(l);
  pinos[id] = { p, l };
}
const rotEq = rotulo('EQUADOR', { tam: 36, largura: 1.3 }); rotEq.position.copy(noGlobo(2.5, -38, R * 1.02)); globoG.add(rotEq);
const rotTrop = rotulo('TRÓPICOS → EQUADOR', { tam: 40, largura: 3.2, cor: '#FACC15' }); scene.add(rotTrop);
// estrelas (fixas, sem brilho)
const estrelas = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: 2400 }, () => { const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1); return [Math.sin(b) * Math.cos(a) * 1800, Math.cos(b) * 1800, Math.sin(b) * Math.sin(a) * 1800]; }).flat(), 3)),
  new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.75 }));
scene.add(estrelas);

// ANTÁRTIDA (cena 4) — Estação Comandante Ferraz, baía do Almirantado
const anta = new THREE.Group(); scene.add(anta);
const gelo = solido(new THREE.PlaneGeometry(500, 500, 40, 40), mat(0xeef3f7, 0x2b4462), false, false);
gelo.rotation.x = -Math.PI / 2; { const p = gelo.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (y > 30) p.setZ(i, (y - 30) * 0.25 * (0.6 + r() * 0.8)); } gelo.geometry.computeVertexNormals(); }
anta.add(gelo);
const mar = solido(new THREE.PlaneGeometry(500, 200), mat(0x2b4a63, 0x1b2c44, { roughness: 0.3 }), false, false);
mar.rotation.x = -Math.PI / 2; mar.position.set(0, 0.05, 140); anta.add(mar);
for (let i = 0; i < 9; i++) { const m = solido(new THREE.ConeGeometry(18 + r() * 22, 24 + r() * 30, 6), mat(0xdfe7ee, COR.eseFill2)); m.position.set(-160 + i * 40 + r() * 10, 10, -120 - r() * 60); anta.add(m); }
for (let i = 0; i < 6; i++) {
  const mod = solido(new THREE.BoxGeometry(6, 3.2, 4), mat(i % 2 ? 0xd9622b : 0x2f6f4f, COR.eseFill2));
  mod.position.set(-14 + i * 6.3, 2.6, 8 + (i % 2) * 0.6); anta.add(mod);
  const pe = solido(new THREE.BoxGeometry(5.6, 1, 0.4), mat(0x555a60, COR.eseFill)); pe.position.set(-14 + i * 6.3, 0.5, 8); anta.add(pe);
}
const rotFerraz = rotulo('ESTAÇÃO FERRAZ · 62°S', { tam: 44, largura: 9 }); rotFerraz.position.set(4, 13, 8); anta.add(rotFerraz);

// POLO (cena 6)
const polo = new THREE.Group(); scene.add(polo);
const plano = solido(new THREE.CircleGeometry(400, 64), mat(0xeef3f7, 0x2b4462), false, false); plano.rotation.x = -Math.PI / 2; polo.add(plano);
const gradeP = new THREE.PolarGridHelper(60, 16, 6, 64, COR.eseLinha, COR.eseLinha); gradeP.material.transparent = true; gradeP.material.opacity = 0.35; polo.add(gradeP);
const estaca = solido(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), mat(0xbbbbbb, COR.eseFill2)); estaca.position.y = 1.5; polo.add(estaca);
const bola = solido(new THREE.SphereGeometry(0.35, 16, 8), mat(0xc8c8c8, COR.eseFill2)); bola.position.y = 3.2; polo.add(bola);
for (let i = 0; i < 40; i++) { const b = solido(new THREE.DodecahedronGeometry(0.6 + r() * 1.6, 0), mat(0xe2eaf1, COR.eseFill2)); const a = r() * 6.28, d = 8 + r() * 50; b.position.set(Math.cos(a) * d, 0.2, Math.sin(a) * d); b.scale.y = 0.4; polo.add(b); }
const trilhaSol = new THREE.Mesh(new THREE.TorusGeometry(180, 0.35, 6, 200), anelMat(COR.amarelo, 0.7)); trilhaSol.rotation.x = Math.PI / 2; trilhaSol.position.y = 2; polo.add(trilhaSol);
const rotPolo = rotulo('O SOL RODA NO HORIZONTE', { tam: 44, largura: 6.4, cor: '#FACC15' }); polo.add(rotPolo);

// JÚPITER (cena 7) — sozinho, sem comparação de tamanho falsa
const jup = new THREE.Group(); scene.add(jup);
const faixas = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const cores = ['#d9c3a0', '#b98a5e', '#efe3cc', '#a8744c', '#e8d6b6', '#c49a6c', '#f2e8d5', '#9c6a45', '#e0c9a6', '#c7a27a'];
  for (let y = 0; y < 512; y += 4) { const k = Math.floor((Math.sin(y * 0.045) * 0.5 + 0.5) * 9.99 + (y % 37 === 0 ? 1 : 0)) % 10; g.fillStyle = cores[k]; g.fillRect(0, y, 1024, 4); }
  g.fillStyle = '#b5523b'; g.beginPath(); g.ellipse(700, 340, 60, 28, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const jupiter = new THREE.Mesh(new THREE.SphereGeometry(3, 96, 48), new THREE.MeshStandardMaterial({ map: faixas, roughness: 0.95 })); jup.add(jupiter);
const eixoJ = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 9, 8), anelMat(COR.amarelo, 1)); jup.add(eixoJ);
const vertJ = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 9, 6), anelMat(0xffffff, 0.5)); jup.add(vertJ);
const rotJ = rotulo('JÚPITER · 3°', { tam: 48, largura: 3.4, cor: '#FACC15' }); rotJ.position.set(2.0, 4.8, 0); jup.add(rotJ);

const GRUPOS = [campo, cidade, giro, anta, polo, jup];
const so = (...gs) => GRUPOS.forEach((g) => (g.visible = gs.includes(g)));

// ------------------------------------------------------------- aparelho (DOM)
const apNum = document.getElementById('ap-num'), apEixo = document.getElementById('ap-eixo');
const apDia = document.getElementById('ap-dia'), apData = document.getElementById('ap-data');
function aparelho(t) {
  const i = incl(t), d = dia(t);
  apNum.textContent = `${i.toFixed(1).replace('.', ',')}°`;
  apEixo.setAttribute('transform', `rotate(${i.toFixed(2)} 50 50)`);
  apDia.textContent = `DIA ${((Math.round(d) - 1) % 365) + 1}`;
  apData.textContent = data(d);
}

// ------------------------------------------------------------- câmera
const cam = (p, alvo, fov = 38) => { camera.position.copy(p); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(alvo); };

// ------------------------------------------------------------- quadro no tempo t
function renderAt(t) {
  t = clamp(t, 0, FIM);
  const k = cena(t), m = modo(t), i = incl(t), d = dia(t);
  aparencia(m); ceuDome.set(m); terra.userData.set(m);
  grade.material.opacity = 0.28 * m; scene.fog = null;
  estrelas.visible = false; ceuDome.mesh.visible = true;
  hemi.intensity = lerp(0.95, 0.85, m); luz.intensity = lerp(2.6, 2.1, m); luz.color.set(0xfff1d6);
  discoSol.visible = true;

  // sol do campo: 30°S; ao meio-dia, com a declinação do dia
  const dirCampo = (h) => sol(-30, h, declinacao(d, i));

  if (k === 0 || k === 1 || k === 8) {
    so(campo);
    const h = k === 1 ? 0 : -0.35; // cena 1 = meio-dia; capa = começo da tarde
    const s = dirCampo(h);
    luz.position.copy(s.clone().multiplyScalar(120)); luz.target.position.set(0, 0, 0);
    discoSol.position.copy(s.clone().multiplyScalar(900)); discoSol.scale.setScalar(26);
    gente.rotation.y = 0.35; gente2.visible = k !== 1;
    const vel = k === 1 ? ramp(t, CORTES[1], CORTES[2]) : k === 8 ? ramp(t, CORTES[8], FIM) : ramp(t, 0, CORTES[1]);
    if (k === 1) cam(v3(lerp(10.5, 9.6, io(vel)), lerp(9.5, 8.6, vel), lerp(2.4, 2.0, io(vel))), v3(0.4, -1.3, 1.7), 40);
    else {
      // capa e volta usam a MESMA câmera no começo e no fim (o reel volta ao começo)
      const z = k === 0 ? out3(vel) * 0.06 : 0.06 * (1 - io(ramp(t, SOBE[1], FIM - 0.3)));
      cam(v3(lerp(5.0, 4.6, z / 0.06), lerp(2.6, 2.5, z / 0.06), lerp(10.5, 9.6, z / 0.06)), v3(-0.6, 2.2, -2), 40);
    }
    const marc = k === 1 ? win(t, F.sombra.ini + 0.4, CORTES[2], 0.5, 0.3) : 0;
    mJun.mat.opacity = marc; mJun.l.material.opacity = marc; mDez.l.material.opacity = marc;
    rotSemIncl.material.opacity = k === 1 ? win(t, palavra('sombra', 'nunca') - 0.1, F.doze.ini, 0.4, 0.3) : 0;
    rotSemIncl.position.set(-1.2, 0.3, somb(60) + 0.55);
  } else if (k === 2) {
    so(cidade);
    const fase = ramp(t, CORTES[2], CORTES[3]);
    const s = sol(-30, lerp(1.05, 1.25, fase), declinacao(d, i)); // fim de tarde
    luz.position.copy(s.clone().multiplyScalar(300)); luz.target.position.set(0, 0, 0);
    discoSol.position.copy(s.clone().multiplyScalar(1500)); discoSol.scale.setScalar(40);
    cam(v3(lerp(-40, -20, io(fase)), lerp(28, 22, fase), lerp(160, 135, io(fase))), v3(0, 18, 0), 42);
    rotPoa.material.opacity = win(t, CORTES[2] + 0.2, F.poa.ini + 1.4);
  } else if (k === 3 || k === 5) {
    so(giro); estrelas.visible = true; ceuDome.mesh.visible = false; scene.background = new THREE.Color(0x05070c);
    hemi.intensity = 1.1; luz.intensity = 2.4;
    const fase = ramp(t, CORTES[k], CORTES[k + 1]);
    const sDir = v3(-1, 0.0, 0.55).normalize(); // a luz vem do Sol, à esquerda
    luz.position.copy(sDir.clone().multiplyScalar(50)); luz.target.position.set(0, 0, 0);
    discoSol.position.copy(sDir.clone().multiplyScalar(420)); discoSol.scale.setScalar(k === 5 ? 9 : 0.001);
    // gira a América do Sul para a frente da câmera
    globoG.rotation.y = (lerp(48, 62, fase) + (k === 5 ? 20 : 0)) * D2R;
    giro.rotation.x = (k === 3 ? lerp(-12, -22, io(fase)) : -8) * D2R;
    // eixo da Terra: inclinado pela variável incl (zero aqui)
    giro.rotation.z = -i * D2R;
    // trópicos e círculos polares: fecham no equador e nos polos (sem inclinação)
    const fecha = k === 5 ? io(ramp(t, palavra('planeta', 'verão') - 0.3, palavra('planeta', 'inverno') + 0.6)) : 0;
    const lt = 23.4 * (1 - fecha), lp = 66.6 + 23.4 * fecha;
    poeLat(equador, 0); poeLat(tropN, lt); poeLat(tropS, -lt); poeLat(polN, lp); poeLat(polS, -lp);
    for (const m2 of [tropN, tropS, polN, polS]) m2.visible = k === 5;
    rotTrop.material.opacity = k === 5 ? win(t, palavra('planeta', 'verão'), F.janeiro.ini, 0.4, 0.3) : 0;
    rotTrop.position.set(0, R * 1.02 * Math.sin(lt * D2R) + 0.45, R * 0.9);
    rotEq.material.opacity = k === 3 ? win(t, palavra('manaus', 'equador') - 0.2, CORTES[4]) : 0;
    for (const [id, pn] of Object.entries(pinos)) {
      const on = k === 3 ? (id === 'manaus' ? 1 : 0.55) * win(t, CORTES[3] + 0.3, CORTES[4]) : 0;
      pn.p.visible = on > 0.01; pn.l.material.opacity = on;
    }
    // janeiro: o lado iluminado ganha um pouco mais de luz (+7%), sem pintar o globo
    const pulso = k === 5 ? Math.sin(clamp((t - palavra('janeiro', 'janeiro')) / 1.6) * Math.PI) : 0;
    luz.intensity = 2.4 * (1 + 0.25 * pulso);
    const dist = k === 3 ? lerp(19.5, 16.5, io(fase)) : lerp(22, 19.5, io(fase));
    cam(v3(k === 3 ? 0.3 : -0.8, k === 3 ? -1.4 : -1.6, dist), v3(k === 3 ? 0.3 : -0.2, k === 3 ? -1.4 : -2.4, 0), 36);
  } else if (k === 4) {
    so(anta); hemi.intensity = 1.25;
    const fase = ramp(t, CORTES[4], CORTES[5]);
    const s = sol(-62, lerp(-1.0, -0.8, fase), -23.4 * (1 - m)); // junho: Sol baixo
    luz.position.copy(s.clone().multiplyScalar(300)); luz.target.position.set(0, 0, 0);
    discoSol.position.copy(s.clone().multiplyScalar(1500)); discoSol.scale.setScalar(36);
    cam(v3(lerp(30, 18, io(fase)), lerp(10, 8, fase), lerp(70, 54, io(fase))), v3(0, 5, 0), 42);
    rotFerraz.material.opacity = win(t, CORTES[4] + 0.2, F.ferraz.ini + 1.8);
  } else if (k === 6) {
    so(polo);
    const fase = ramp(t, CORTES[6], CORTES[7]);
    const ca = lerp(0.6, 1.3, io(fase));
    const az = -ca + lerp(-0.32, 0.32, fase); // o Sol desliza rente ao horizonte, na frente da câmera
    const s = v3(Math.sin(az), 0.012, -Math.cos(az)).normalize();
    luz.position.copy(s.clone().multiplyScalar(300).add(v3(0, 6, 0))); luz.target.position.set(0, 0, 0);
    luz.intensity = 1.6; hemi.intensity = 0.6;
    discoSol.position.copy(s.clone().multiplyScalar(170)).setY(5); discoSol.scale.setScalar(7);
    cam(v3(Math.sin(ca) * 22, lerp(6, 4.5, fase), Math.cos(ca) * 22), v3(0, 3.2, 0), 44);
    rotPolo.material.opacity = win(t, palavra('polos', 'rolando') - 0.5, CORTES[7]);
    rotPolo.position.copy(s.clone().multiplyScalar(60)).setY(9);
  } else if (k === 7) {
    so(jup); estrelas.visible = true; ceuDome.mesh.visible = false; scene.background = new THREE.Color(0x05070c);
    const fase = ramp(t, CORTES[7], CORTES[8]);
    hemi.intensity = 0.3; luz.intensity = 2.8;
    const sDir = v3(-1, 0.1, 0.6).normalize(); luz.position.copy(sDir.clone().multiplyScalar(60)); luz.target.position.set(0, 0, 0);
    discoSol.visible = false;
    jupiter.rotation.y = t * 0.35; jup.rotation.z = -3.1 * D2R; vertJ.rotation.z = 3.1 * D2R;
    eixoJ.material.opacity = out3(ramp(t, palavra('jupiter', 'inclinado') - 0.2, palavra('jupiter', 'inclinado') + 0.4));
    vertJ.material.opacity = 0.5 * eixoJ.material.opacity;
    rotJ.material.opacity = win(t, palavra('jupiter', 'três') - 0.1, CORTES[8]);
    cam(v3(0, -0.6, lerp(21, 18.5, io(fase))), v3(0, -0.8, 0), 38);
  }
  if (!estrelas.visible) scene.background = null;

  aparelho(t);
  cartoes(t, F, B);
  legenda(t < F.titulo.fim + 0.4 ? -1 : t, LEG); // na capa o título já está escrito
  renderer.render(scene, camera);
}

ligar('terra-sem-inclinacao', renderAt);
