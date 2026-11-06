// "E se a Lua sumisse?" — o mundo 3D do reel, desenhado só a partir do tempo do vídeo.
// Fatos: fatos.md (F1, F1b, F2, F3, F3c, F4, F4c, F5, F5b, F6, F8). Escala crescente:
// você na praia → a noite sem Lua → a maré em São Luís → os corais → o planeta (marés) → o eixo → Terra e Lua em escala → a volta.
// Aparência REAL = hoje, com a Lua. Aparência E SE (planta azul) = sem a Lua. Amarelo = só a Lua e os números.
import {
  THREE, W, H, D2R, clamp, lerp, ramp, io, out3, win, v3, rng, COR,
  criarMundo, mat, solido, aparencia, ceu, globo, noGlobo, rotulo, legenda, cartoes, ligar,
} from '../motor/base.js';
import { FIM, BLOCOS as B, FRASES as F, LEG, palavra } from './tempos.js';
import { pessoa, coqueiro, barco, sobrado, igreja, regua, texturaLua, coralGalho, coralCerebro, coralMesa, esponja } from './pecas.js';

const { renderer, scene, camera } = criarMundo();
const ceuDome = ceu(scene, 0x0a1834, 0x2d4d78);

// ------------------------------------------------------------- relógio da história
const IDS = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
const CORTES = IDS.map((b, i) => (i ? B[b].ini - 0.12 : 0));
const cena = (t) => { let k = 0; CORTES.forEach((c, i) => { if (t >= c) k = i; }); return k; };
const fimCena = (k) => (k + 1 < CORTES.length ? CORTES[k + 1] : FIM);
const SOME = palavra('titulo', 'vez') + 0.05;            // a Lua some "de uma vez"
const T_SOBRA = F.sobra.ini;                              // "Sem ela, sobraria a maré do Sol"
const T_SINAL = F.sinal.ini;                              // "Perderiam esse sinal"
const T_MENOR = palavra('barrigas', 'ficariam') - 0.2;    // "ficariam bem menores"
const T_DISC = F.discute.ini;                             // "Sem ela, ele balançaria mais"
const T_VOLTA = CORTES[6] + 0.25;                         // a Lua volta (cena da distância)

// 0 = real (com a Lua) · 1 = e se (sem a Lua)
function modo(t, k) {
  switch (k) {
    case 0: return ramp(t, SOME, SOME + 0.45);
    case 1: return 1;
    case 2: return io(ramp(t, T_SOBRA, T_SOBRA + 1.2));
    case 3: return io(ramp(t, T_SINAL, T_SINAL + 0.9));
    case 4: return io(ramp(t, T_MENOR, T_MENOR + 1.3));
    case 5: return io(ramp(t, T_DISC, T_DISC + 1.0));
    case 6: return 1 - io(ramp(t, T_VOLTA, T_VOLTA + 1.1));
    default: return 0;
  }
}
// a Lua está no céu? (some de uma vez no quadro 0; volta na cena 6)
const luaVis = (t, k) => (k === 0 ? 1 - ramp(t, SOME, SOME + 0.18) : 1 - modo(t, k));

// ------------------------------------------------------------- aparelhos (DOM)
const apNum = document.getElementById('ap-num'), apUn = document.getElementById('ap-un');
const mAgua = document.getElementById('mare-agua'), mHach = document.getElementById('mare-hach');
const mNum = document.getElementById('mare-num'), mSelo = document.getElementById('mare-selo');
// SEM LUA HÁ: a unidade cresce com a escala (noites → ano → mil anos)
function contador(t, k) {
  const r = (a, b, t0) => Math.round(lerp(a, b, io(ramp(t, t0, t0 + 1.0))));
  if (k === 0) return [0, 'NOITES'];
  if (k === 1) return [r(0, 1, CORTES[1] + 0.15), 'NOITE'];
  if (k === 2) return [r(1, 3, CORTES[2] + 0.15), 'NOITES'];
  if (k === 3) return [r(3, 5, CORTES[3] + 0.15), 'NOITES'];
  if (k === 4) return [1, 'ANO'];
  if (k === 5) return [r(1, 100, CORTES[5] + 0.15), 'MIL ANOS'];
  return [0, 'NOITES'];
}
function aparelhos(t, k) {
  const [n, un] = contador(t, k);
  apNum.textContent = String(n);
  apUn.textContent = n === 1 && un === 'NOITES' ? 'NOITE' : (n !== 1 && un === 'NOITE' ? 'NOITES' : un);
  // maré em São Luís: 4,6 m de hoje → "menos da metade" (estimativa) do "Sem ela" até a Lua voltar
  const sem = k >= 2 && k <= 5 ? (k === 2 ? io(ramp(t, T_SOBRA + 0.3, T_SOBRA + 1.5)) : 1) : (k === 6 ? 1 - io(ramp(t, T_VOLTA, T_VOLTA + 1.1)) : 0);
  mAgua.style.height = `${lerp(100, 0, sem)}%`;
  mHach.style.height = `${lerp(0, 46, sem)}%`; mHach.style.opacity = sem;
  mSelo.style.opacity = sem;
  mNum.textContent = sem > 0.5 ? '< ½' : '4,6 m';
}

// ------------------------------------------------------------- luzes
const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 0.9); scene.add(hemi);
const luz = new THREE.DirectionalLight(0xfff1d6, 2.6);
luz.castShadow = true; luz.shadow.mapSize.set(2048, 2048); luz.shadow.bias = -0.0006; scene.add(luz, luz.target);
function sombraCaixa(s, far = 400) { Object.assign(luz.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far }); luz.shadow.camera.updateProjectionMatrix(); }

const r = rng(11);
const anel = (cor, op = 1) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false });
const texLua = texturaLua();
const novaLua = (raio) => new THREE.Mesh(new THREE.SphereGeometry(raio, 64, 32), new THREE.MeshBasicMaterial({ map: texLua, transparent: true, fog: false }));
function estrelasNovas(n, dist, tam, seed) {
  const q = rng(seed), pos = [];
  for (let i = 0; i < n; i++) { const a = q() * Math.PI * 2, b = Math.acos(2 * q() - 1); pos.push(Math.sin(b) * Math.cos(a) * dist, Math.abs(Math.cos(b)) * dist * (i % 5 ? 1 : 0.4) + 20, Math.sin(b) * Math.sin(a) * dist); }
  return new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: tam, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }));
}

// ------------------------------------------------------------- câmera
const cam = (p, alvo, fov = 40) => { camera.position.copy(p); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(alvo); camera.updateMatrixWorld(true); };
// ponto do mundo que aparece no pixel (px, py) da tela, a uma distância d da câmera
function naTela(px, py, d) {
  const ndc = v3((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
  return camera.position.clone().add(ndc.multiplyScalar(d));
}

// ======================================================================= PRAIA (cenas 0, 1, 7)
// Uma praia do Nordeste à noite, Lua cheia sobre o mar, duas pessoas de costas olhando para ela.
const praia = new THREE.Group(); scene.add(praia);
const areiaGeo = new THREE.PlaneGeometry(260, 140, 70, 40);
{ const p = areiaGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.18 * Math.sin(x * 0.35) * Math.cos(y * 0.5) + (y < -10 ? (-10 - y) * 0.06 : 0)); } areiaGeo.computeVertexNormals(); }
const areia = solido(areiaGeo, mat(0xb39a70, 0x223650), false, false);
areia.rotation.x = -Math.PI / 2; areia.position.set(0, 0, 58); areia.receiveShadow = true; praia.add(areia);
const marGeo = new THREE.PlaneGeometry(900, 600, 90, 60);
const marPos = marGeo.attributes.position, marBase = Float32Array.from(marPos.array);
const mar = solido(marGeo, mat(0x123a5c, 0x16294a, { roughness: 0.82, metalness: 0 }), false, false);
mar.rotation.x = -Math.PI / 2; mar.position.set(0, -0.15, -11 - 300); praia.add(mar);
const espuma = [];
for (let i = 0; i < 3; i++) {
  const e = new THREE.Mesh(new THREE.PlaneGeometry(220, 0.35 + i * 0.1), anel(0xf2f6fa, 0.75)); e.rotation.x = -Math.PI / 2; praia.add(e); espuma.push(e);
}
// reflexo da Lua no mar (é a Lua, por isso amarelo)
const brilhos = new THREE.Group(); praia.add(brilhos);
const mBrilho = anel(COR.amarelo, 0.8);
for (let i = 0; i < 140; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), mBrilho); b.rotation.x = -Math.PI / 2; b.userData = { u: r(), v: r(), f: 0.6 + r() * 2.4, ph: r() * 6.28 }; brilhos.add(b); }
// morros no horizonte (um cabo à esquerda, ilhas à direita)
for (const [x, z, s, hh] of [[-150, -330, 90, 34], [-95, -360, 60, 22], [160, -420, 50, 16], [120, -440, 30, 10]]) {
  const m = solido(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x16301f, COR.eseFill), true, false);
  m.scale.set(s, hh, s * 0.5); m.position.set(x, -0.3, z); praia.add(m);
}
const coqs = [[-2.3, -3.5, 7.2, -1.8, 1], [2.9, -7.5, 8.0, 1.9, 3], [-4.6, -14, 8.5, -2.2, 5], [5.8, -19, 8.0, 2.0, 6], [-7.5, -24, 9, -1.4, 2]];
for (const [x, z, h, c, s] of coqs) { const q = coqueiro(h, c, s); q.position.set(x, 0, z); q.rotation.y = 0; praia.add(q); }
// barquinho de jangada na areia (detalhe do Nordeste)
const jangada = barco({ L: 4.2, cor: 0xe6e0d0, faixa: 0x2f6fa8, vela: 0xe6e0d0, seed: 9 });
jangada.position.set(-4.6, 0.62, -4.2); jangada.rotation.set(0.05, 0.9, 0.12); praia.add(jangada);
const adulto = pessoa({ h: 1.74, roupa: 0xf0ebe0, calca: 0x2c4a6e, pele: 0x9a6a48, cabelo: 0x16110d });
adulto.position.set(-0.45, 0.02, 0); praia.add(adulto);
const crianca = pessoa({ h: 1.18, roupa: 0xc4553a, calca: 0x2b3a55, pele: 0x8a5a3c, cabelo: 0x16110d, saia: true });
crianca.position.set(0.55, 0.02, -0.15); praia.add(crianca);
crianca.userData.bracoD.rotation.set(2.3, 0, -0.18); // aponta para a Lua
const estrelasPraia = estrelasNovas(1800, 1600, 2.2, 5); praia.add(estrelasPraia);
const luaPraia = novaLua(1); scene.add(luaPraia);
const fantasma = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), anel(COR.eseLinha, 0)); scene.add(fantasma);
const rotSemLua = rotulo('CÉU SEM LUA · TODA NOITE', { tam: 42, largura: 1, cor: '#C4E2FF' }); scene.add(rotSemLua);
// câmera da capa (a mesma no primeiro e no último quadro)
const CAPA_P0 = v3(1.35, 1.4, 9.0), CAPA_P1 = v3(1.25, 1.36, 8.2), CAPA_ALVO = v3(-0.4, 3.3, -16);
let LUA_POS = null, LUA_R = 1;
function poeLuaDaCapa() { // a Lua fica sempre no mesmo lugar do céu da praia: centro (560, 470) da tela da capa, raio ~92 px
  cam(CAPA_P0, CAPA_ALVO, 40);
  const d = 700; LUA_POS = naTela(600, 470, d); LUA_R = d * Math.tan((92 / H) * 40 * D2R);
}
poeLuaDaCapa();

// ======================================================================= SÃO LUÍS (cena 2)
// Cais na baía de São Marcos: régua de maré, barcos de pesca na lama, casario colonial e a igreja da Sé ao fundo.
const sl = new THREE.Group(); scene.add(sl);
const lamaZ = (z) => clamp(5.6 + (z - 4) * 0.19, -2.5, 5.6);
const lamaGeo = new THREE.PlaneGeometry(260, 90, 80, 45);
{ const p = lamaGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const z = -y - 41; p.setZ(i, lamaZ(z) + 0.15 * Math.sin(x * 0.4 + y * 0.7)); } lamaGeo.computeVertexNormals(); }
const lama = solido(lamaGeo, mat(0x6e5d47, 0x1c2c42), false, false); lama.rotation.x = -Math.PI / 2; lama.position.z = -41; lama.receiveShadow = true; sl.add(lama);
const aguaSL = solido(new THREE.PlaneGeometry(900, 700, 1, 1), mat(0x4a6f63, 0x19304d, { roughness: 0.7, metalness: 0, transparent: true, opacity: 0.95 }), false, false);
aguaSL.rotation.x = -Math.PI / 2; aguaSL.position.z = -300; sl.add(aguaSL);
const muro = solido(new THREE.BoxGeometry(260, 8, 3), mat(0x8d8676, COR.eseFill)); muro.position.set(0, 2, 5.5); sl.add(muro);
const rua = solido(new THREE.BoxGeometry(260, 1, 60), mat(0xa39886, COR.eseFill), false); rua.position.set(0, 5.5, 37); sl.add(rua);
const corSob = ['#3b6ea5', '#e9e1cf', '#c9705a', '#5f9b7d', '#e9e1cf', '#7d9fc4', '#d9a38a', '#4f7fb0', '#efe8d8', '#b9544a', '#6aa08a', '#e9e1cf'];
for (let i = 0; i < 12; i++) {
  const w = 6.5 + r() * 2.5, h = 7 + (i % 3) * 2.2 + r() * 1.5, s = sobrado(w, h, corSob[i], i % 4 === 0, 20 + i);
  s.position.set(-62 + i * 8.6, 6, 14 + (i % 2) * 0.8); sl.add(s);
}
const se = igreja(); se.position.set(38, 6, 22); se.rotation.y = -0.15; sl.add(se);
// cais de madeira sobre estacas
const cais = new THREE.Group(); sl.add(cais);
const mMad = mat(0x7a5c3e, COR.eseFill), mEst = mat(0x4a3a2c, COR.eseFill);
const deck = solido(new THREE.BoxGeometry(3.4, 0.35, 34), mMad); deck.position.set(4, 7.2, -12); cais.add(deck);
for (let z = 4; z >= -28; z -= 3.2) for (const x of [2.5, 5.5]) { const e = solido(new THREE.CylinderGeometry(0.18, 0.2, 11, 7), mEst, false); e.position.set(x, 1.8, z); cais.add(e); }
for (let z = 4; z >= -28; z -= 1.6) { const g = solido(new THREE.BoxGeometry(0.12, 1.0, 0.12), mMad, false); g.position.set(2.4, 7.85, z); cais.add(g); }
const corrim = solido(new THREE.BoxGeometry(0.14, 0.14, 34), mMad, false); corrim.position.set(2.4, 8.35, -12); cais.add(corrim);
const reguaSL = regua(); reguaSL.position.set(6.3, 0, -28.6); sl.add(reguaSL);
const pessoaCais = pessoa({ h: 1.72, roupa: 0x3a6ea5, calca: 0x2b2b2b, pele: 0x7a4e32 }); pessoaCais.position.set(4.4, 7.38, -24); pessoaCais.rotation.y = 2.2; sl.add(pessoaCais);
// marcas na régua: maré alta, maré baixa e a faixa sem Lua (estimativa)
const linhaMarca = (cor, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.12), anel(cor, op)); m.position.set(6.3, 0, -28.5); sl.add(m); return m; };
const lAlta = linhaMarca(0xffffff, 0), lBaixa = linhaMarca(0xffffff, 0), lMeia = linhaMarca(COR.eseLinha, 0);
const hachTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = 'rgba(43,68,98,0.55)'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(196,226,255,0.95)'; g.lineWidth = 7; for (let k = -64; k < 128; k += 22) { g.beginPath(); g.moveTo(k, 64); g.lineTo(k + 64, 0); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t; })();
const faixaSem = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.2), new THREE.MeshBasicMaterial({ map: hachTex, transparent: true, opacity: 0, depthWrite: false }));
faixaSem.position.set(5.0, 1.1, -28.45); sl.add(faixaSem);
const rAlta = rotulo('MARÉ ALTA', { tam: 44, largura: 3.0 }), rBaixa = rotulo('MARÉ BAIXA', { tam: 44, largura: 3.0 });
const rSem = rotulo('SEM LUA: < METADE · ESTIMATIVA', { tam: 44, largura: 7.6, cor: '#C4E2FF' });
const rSL = rotulo('SÃO LUÍS · MARANHÃO', { tam: 46, largura: 9 });
sl.add(rAlta, rBaixa, rSem, rSL);
const barcos = [
  { b: barco({ L: 7, cor: 0x2f6fa8, faixa: 0xe9e4d8, vela: 0xb5452f }), x: -5, z: -20, ry: 0.5, rola: 0.2 },
  { b: barco({ L: 6, cor: 0xb5452f, faixa: 0xe9e4d8, vela: 0xe9e4d8 }), x: -13, z: -15, ry: -0.3, rola: -0.17 },
  { b: barco({ L: 6.5, cor: 0x2e8a6a, faixa: 0xf0e6d0, vela: 0x2f6fa8 }), x: -3, z: -31, ry: 1.2, rola: 0.14 },
  { b: barco({ L: 5, cor: 0xe9e4d8, faixa: 0x2f6fa8, vela: 0xb5452f }), x: -19, z: -26, ry: 0.2, rola: -0.2 },
];
for (const o of barcos) sl.add(o.b);
const luaDia = novaLua(1); scene.add(luaDia);
// nível da água (m sobre o zero da régua): baixa → alta (4,6 m) → só a maré do Sol (menos da metade)
function nivel(t) {
  const sobe = io(ramp(t, CORTES[2] + 0.3, palavra('sluis', 'metros') + 0.4));
  const cai = io(ramp(t, T_SOBRA + 0.4, T_SOBRA + 2.6));
  return lerp(lerp(0.05, 4.6, sobe), 1.55, cai) + 0.06 * Math.sin(t * 1.3);
}

// ======================================================================= RECIFE (cena 3)
const recife = new THREE.Group(); scene.add(recife);
const fundoGeo = new THREE.PlaneGeometry(200, 200, 60, 60);
{ const p = fundoGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.6 * Math.sin(x * 0.25) * Math.cos(y * 0.3) + 0.25 * Math.sin(x * 1.1 + y)); } fundoGeo.computeVertexNormals(); }
const fundo = solido(fundoGeo, mat(0xcdbb8f, 0x1c2c42), false, false); fundo.rotation.x = -Math.PI / 2; fundo.receiveShadow = true; recife.add(fundo);
const corC = [0xe07a7a, 0xe08a4a, 0x4fa58a, 0xa58fc9, 0xe8dcc0, 0xd9667a, 0x5fb3a8];
const origens = [];
for (let i = 0; i < 46; i++) {
  const a = r() * Math.PI * 2, d = 1.5 + Math.pow(r(), 0.7) * 22, x = Math.cos(a) * d, z = Math.sin(a) * d - 4, tipo = i % 4, cor = corC[i % corC.length];
  const esc = 0.8 + r() * 0.9;
  const c = tipo === 0 ? coralGalho(cor, 100 + i, esc * 1.3) : tipo === 1 ? coralCerebro(cor, 100 + i, esc * 0.9) : tipo === 2 ? coralMesa(cor, 100 + i, esc) : esponja(cor, 100 + i, esc);
  c.position.set(x, tipo === 1 ? 0.1 : 0, z); c.rotation.y = r() * 6.28; recife.add(c);
  if (tipo !== 3) origens.push([x, tipo === 2 ? 1.0 * esc : tipo === 1 ? 0.7 * esc : 1.6 * esc, z]);
}
// desova: pacotes de ovos sobem dos corais (o assunto da cena, não decoração)
const NOV = 900, ovosPos = new Float32Array(NOV * 3), ovosDados = [];
for (let i = 0; i < NOV; i++) { const o = origens[i % origens.length]; ovosDados.push({ o, t0: r() * 3.2, v: 0.55 + r() * 0.7, dx: (r() - 0.5) * 0.6, dz: (r() - 0.5) * 0.6, ph: r() * 6.28 }); }
const ovosGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ovosPos, 3));
const ovos = new THREE.Points(ovosGeo, new THREE.PointsMaterial({ color: 0xffb7a6, size: 0.14, transparent: true, opacity: 0.95, depthWrite: false }));
recife.add(ovos);
const superficie = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x6fd3e0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false }));
superficie.rotation.x = Math.PI / 2; superficie.position.y = 16; recife.add(superficie);
const peixes = new THREE.Group(); recife.add(peixes);
for (let i = 0; i < 9; i++) {
  const p = solido(new THREE.ConeGeometry(0.18, 0.7, 6), mat(i % 2 ? 0x2f6fa8 : 0xe9e4d8, COR.eseFill2), false); p.rotation.z = Math.PI / 2;
  const cauda = solido(new THREE.ConeGeometry(0.16, 0.25, 4), p.material, false); cauda.position.y = -0.42; cauda.rotation.z = Math.PI; p.add(cauda);
  p.userData = { y: 3 + r() * 5, raio: 6 + r() * 8, v: 0.12 + r() * 0.1, ph: r() * 6.28 }; peixes.add(p);
}
const luaMar = novaLua(1); scene.add(luaMar);
const rRecife = rotulo('GRANDE BARREIRA DE CORAIS · AUSTRÁLIA', { tam: 42, largura: 1 });
const rOvos = rotulo('OVOS SUBINDO', { tam: 44, largura: 1 }); recife.add(rOvos); scene.add(rRecife);

// ======================================================================= PLANETA: marés (cena 4) e eixo (cena 5)
const R = 3;
const planeta = new THREE.Group(); scene.add(planeta);
const terra = globo(R); planeta.add(terra);
const estrelas = estrelasNovas(2400, 1800, 2.2, 7); estrelas.geometry.attributes.position.array.forEach((v, i, a) => { if (i % 3 === 1) a[i] = (v - 20) * (i % 2 ? 1 : -1); }); scene.add(estrelas);
// as duas barrigas de maré (exageradas para dar para ver), apontando para a Lua
const bojo = new THREE.Group(); scene.add(bojo);
const casca = new THREE.Mesh(new THREE.SphereGeometry(R * 1.0, 96, 48), new THREE.MeshStandardMaterial({ color: 0x6fc3ff, transparent: true, opacity: 0.45, roughness: 0.3, depthWrite: false }));
bojo.add(casca);
const cascaLinha = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(R, 32, 16), 1), anel(COR.eseLinha, 0)); bojo.add(cascaLinha);
const setaLua = new THREE.Group(); scene.add(setaLua);
{ const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 10), anel(COR.amarelo, 1)); haste.position.y = 1.1; setaLua.add(haste);
  const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 14), haste.material); ponta.position.y = 2.5; setaLua.add(ponta); }
const rLuaSeta = rotulo('PARA A LUA', { tam: 46, largura: 2.6, cor: '#FACC15' }); scene.add(rLuaSeta);
const rExag = rotulo('MARÉ EXAGERADA PARA SE VER', { tam: 40, largura: 4.6 }); scene.add(rExag);
const rSoSol = rotulo('SOBRA SÓ A MARÉ DO SOL', { tam: 44, largura: 4.4, cor: '#C4E2FF' }); scene.add(rSoSol);
const pinoSL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8), anel(0xffffff, 1)); pinoSL.position.copy(noGlobo(-2.53, -44.3, R * 1.01)); terra.add(pinoSL);
const rPinoSL = rotulo('SÃO LUÍS', { tam: 40, largura: 1.6 }); rPinoSL.position.copy(noGlobo(-2.53, -44.3, R * 1.01)).add(v3(0.95, 0.25, 0.3)); terra.add(rPinoSL);
// eixo (cena 5)
const eixoG = new THREE.Group(); scene.add(eixoG);
const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, R * 2.9, 12), anel(0xffffff, 1)); eixoG.add(eixo);
const prumo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(0, -R * 1.5, 0), v3(0, R * 1.55, 0)]), new THREE.LineDashedMaterial({ color: 0xc4e2ff, dashSize: 0.2, gapSize: 0.14, transparent: true, opacity: 0.8 }));
prumo.computeLineDistances(); scene.add(prumo);
const orbita = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(-R * 2.2, 0, 0), v3(R * 2.2, 0, 0)]), prumo.material); orbita.computeLineDistances(); scene.add(orbita);
const leque = new THREE.Mesh(new THREE.CircleGeometry(R * 1.45, 48, 0, 1), new THREE.MeshBasicMaterial({ color: COR.eseLinha, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); scene.add(leque);
const rGrau = rotulo('23°', { tam: 56, largura: 1.25, cor: '#FACC15' }); scene.add(rGrau);
const rDebate = rotulo('QUANTO? AINDA SE DISCUTE', { tam: 44, largura: 5.0, cor: '#C4E2FF' }); scene.add(rDebate);
const rIlus = rotulo('ILUSTRATIVO', { tam: 36, largura: 2.0 }); scene.add(rIlus);

// ======================================================================= TERRA E LUA EM ESCALA (cena 6)
// Raio da Terra = 1; a Lua tem 0,273 de raio e fica a 60,3 raios (384.400 km). Nada fora de escala.
const espaco = new THREE.Group(); scene.add(espaco);
const terraE = globo(1); espaco.add(terraE);
const ANG = Math.atan2(560, 560), DIST = 60.27;
const LUA_E = v3(Math.cos(ANG) * DIST, Math.sin(ANG) * DIST, 0);
const luaE = novaLua(0.2727); luaE.position.copy(LUA_E); espaco.add(luaE);
const marcaLua = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 64), anel(COR.amarelo, 1)); marcaLua.position.copy(LUA_E); espaco.add(marcaLua);
const marcaTerra = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.5, 64), anel(0xffffff, 0.9)); espaco.add(marcaTerra);
const orbLua = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 721 }, (_, i) => v3(Math.cos(i / 720 * Math.PI * 2) * DIST, Math.sin(i / 720 * Math.PI * 2) * DIST, 0))),
  new THREE.LineDashedMaterial({ color: 0xc4e2ff, dashSize: 1.2, gapSize: 0.9, transparent: true, opacity: 0.55 }));
orbLua.computeLineDistances(); espaco.add(orbLua);
const ligaTL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(Math.cos(ANG) * 1.6, Math.sin(ANG) * 1.6, 0), LUA_E.clone().multiplyScalar(1 - 1.6 / DIST)]),
  new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.9 }));
ligaTL.computeLineDistances(); espaco.add(ligaTL);
const setaAfasta = new THREE.Group(); espaco.add(setaAfasta);
{ const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 8), anel(COR.amarelo, 1)); h.position.y = 1.6; setaAfasta.add(h);
  const p = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 12), h.material); p.position.y = 3.6; setaAfasta.add(p); }
setaAfasta.position.copy(LUA_E.clone().multiplyScalar(1 + 1.9 / DIST)); setaAfasta.rotation.z = ANG - Math.PI / 2;
const rTerraE = rotulo('TERRA', { tam: 46, largura: 1 }), rLuaE = rotulo('LUA', { tam: 46, largura: 1, cor: '#FACC15' });
const rDist = rotulo('384.400 km', { tam: 50, largura: 1, cor: '#FACC15' }), rAfasta = rotulo('+3,8 cm/ano', { tam: 46, largura: 1, cor: '#FACC15' });
const rEscala = rotulo('TAMANHOS E DISTÂNCIA EM ESCALA', { tam: 40, largura: 1 });
espaco.add(rTerraE, rLuaE, rDist, rAfasta, rEscala);
// câmera final da cena: Terra perto do canto de baixo à esquerda, Lua à direita, abaixo dos aparelhos
const ESP_C = v3(25.4, 46.3, 0), ESP_D = 182;

const GRUPOS = [praia, sl, recife, planeta, bojo, setaLua, eixoG, prumo, orbita, leque, espaco, estrelas];
const so = (...gs) => GRUPOS.forEach((g) => (g.visible = gs.includes(g)));
const ROTS = [rotSemLua, rAlta, rBaixa, rSem, rSL, rRecife, rOvos, rLuaSeta, rExag, rSoSol, rPinoSL, rGrau, rDebate, rIlus, rTerraE, rLuaE, rDist, rAfasta, rEscala];
// rótulo com tamanho fixo na tela: altura em px a uma distância d
function tamTela(s, px) { const d = camera.position.distanceTo(s.getWorldPosition(v3(0, 0, 0))); const hh = 2 * d * Math.tan((camera.fov / 2) * D2R) * (px / H); const ratio = s.scale.x / s.scale.y; s.scale.set(hh * ratio, hh, 1); }

// ------------------------------------------------------------- quadro no tempo t
function renderAt(t) {
  t = clamp(t, 0, FIM);
  const k = cena(t), m = modo(t, k), lv = luaVis(t, k), f = ramp(t, CORTES[k], fimCena(k));
  aparencia(m); ceuDome.set(m); terra.userData.set(m); terraE.userData.set(m);
  scene.fog = null; scene.background = null; ceuDome.mesh.visible = true;
  renderer.toneMappingExposure = 1.0;
  for (const s of ROTS) s.material.opacity = 0;
  luaPraia.visible = luaDia.visible = luaMar.visible = false; fantasma.material.opacity = 0;
  hemi.color.set(0xdfefff); hemi.groundColor.set(0x4a5a3a);

  if (k === 0 || k === 1 || k === 7) {
    // ------------------------------------------------ PRAIA À NOITE
    so(praia); ceuDome.set(m, 0x0a1834, 0x35598a); sombraCaixa(18);
    hemi.color.set(0x9bb8e6); hemi.groundColor.set(0x3a3428); hemi.intensity = lerp(1.0, 1.0, m);
    luz.color.set(0xd6e4ff); luz.intensity = lerp(1.6, 0.8, m);
    poeLuaDaCapa(); // reposiciona a câmera da capa para achar a Lua no céu
    luz.position.copy(LUA_POS.clone().sub(CAPA_P0).normalize().multiplyScalar(60)); luz.target.position.set(0, 0, 0);
    // ondas e espuma
    for (let i = 0; i < marPos.count; i++) { const x = marBase[i * 3], y = marBase[i * 3 + 1]; marPos.setZ(i, 0.22 * Math.sin(x * 0.11 + t * 1.1) * Math.cos(y * 0.07 - t * 0.8) + 0.12 * Math.sin((y + x * 0.3) * 0.25 + t * 1.9)); }
    marPos.needsUpdate = true; marGeo.computeVertexNormals();
    espuma.forEach((e, i) => { const ph = (t * 0.32 + i / 3) % 1; e.position.set(0, -0.08 + 0.01 * i, -11 + 3.2 * ph); e.material.opacity = 0.75 * Math.sin(Math.PI * ph) * (1 - 0.5 * m); });
    // a Lua e o reflexo dela
    luaPraia.visible = lv > 0.01; luaPraia.position.copy(LUA_POS); luaPraia.scale.setScalar(LUA_R); luaPraia.lookAt(CAPA_P0); luaPraia.material.opacity = lv;
    const dirLua = LUA_POS.clone().sub(CAPA_P0); dirLua.y = 0; dirLua.normalize();
    brilhos.children.forEach((b) => {
      const u = b.userData, d = 26 + Math.pow(u.u, 1.4) * 300, lat = (u.v - 0.5) * (0.5 + d * 0.05);
      b.position.copy(CAPA_P0).add(dirLua.clone().multiplyScalar(d)).add(v3(-dirLua.z, 0, dirLua.x).multiplyScalar(lat)); b.position.y = 0.12;
      b.scale.set(0.5 + d * 0.025, 0.8 + d * 0.015, 1);
    });
    mBrilho.opacity = 0.7 * lv * (0.75 + 0.25 * Math.sin(t * 3.1)); brilhos.visible = lv > 0.01;
    estrelasPraia.material.opacity = lerp(0.55, 1, m); estrelasPraia.material.size = lerp(2.0, 2.8, m);
    if (k === 1) {
      // a noite sem Lua: câmera mais aberta, um contorno tracejado onde a Lua estava
      renderer.toneMappingExposure = lerp(1.0, 0.85, io(ramp(t, F.escura.ini, F.escura.ini + 1.5)));
      cam(v3(lerp(2.3, 1.9, io(f)), lerp(1.75, 1.6, f), lerp(13.5, 12.0, io(f))), CAPA_ALVO, 40); // mesma direção da capa: o contorno fica onde a Lua estava
      fantasma.position.copy(LUA_POS); fantasma.scale.setScalar(LUA_R); fantasma.lookAt(camera.position);
      fantasma.material.opacity = 0.9 * win(t, CORTES[1] + 0.2, CORTES[2], 0.5, 0.2);
          } else {
      // capa e volta: a MESMA câmera no primeiro e no último quadro
      const z = k === 0 ? out3(ramp(t, 0, CORTES[1])) : 1 - io(ramp(t, CORTES[7] + 0.2, FIM - 0.35));
      cam(CAPA_P0.clone().lerp(CAPA_P1, z), CAPA_ALVO, 40);
      crianca.userData.bracoD.rotation.x = 2.3;
    }
  } else if (k === 2) {
    // ------------------------------------------------ SÃO LUÍS, fim de tarde
    so(sl); ceuDome.set(m, 0x6aa6da, 0xf2d7b4); sombraCaixa(70); hemi.intensity = lerp(1.0, 0.9, m); hemi.groundColor.set(0x6b5a40);
    luz.color.set(0xffe2b8); luz.intensity = lerp(2.6, 2.0, m);
    luz.position.set(-70, 45, 40); luz.target.position.set(0, 0, -15);
    const h = nivel(t); aguaSL.position.y = h;
    for (const o of barcos) {
      const fundoB = lamaZ(o.z) + 0.75, boia = h + 0.25, flut = clamp((boia - fundoB) / 0.6);
      o.b.position.set(o.x, Math.max(fundoB, boia), o.z); o.b.rotation.set(0, o.ry, lerp(o.rola, 0.02 * Math.sin(t * 1.4 + o.x), flut));
    }
    cam(v3(lerp(19, 17, io(f)), lerp(15, 14, f), lerp(-60, -56, io(f))), v3(lerp(0.5, 1.5, f), lerp(8.0, 7.6, f), -25), 42);
    lAlta.position.y = 4.6; lBaixa.position.y = 0.0; lMeia.position.y = 2.3;
    const marcas = win(t, palavra('sluis', 'metros') - 0.2, CORTES[3]);
    lAlta.material.opacity = 0.95 * marcas; lBaixa.material.opacity = 0.95 * marcas;
    rAlta.position.set(3.6, 4.6, -28.5); rBaixa.position.set(3.6, 0.0, -28.5); tamTela(rAlta, 58); tamTela(rBaixa, 58);
    rAlta.material.opacity = marcas; rBaixa.material.opacity = marcas * (1 - ramp(t, T_SOBRA, T_SOBRA + 0.5));
    const sem = win(t, T_SOBRA + 0.6, CORTES[3]);
    faixaSem.material.opacity = sem; lMeia.material.opacity = sem;
    rSem.position.copy(naTela(330, 1520, 22)); tamTela(rSem, 58); rSem.material.opacity = sem;
    rSL.position.copy(naTela(540, 760, 30)); tamTela(rSL, 64); rSL.material.opacity = win(t, CORTES[2] + 0.1, F.sluis.ini + 1.1, 0.3, 0.25);
    // a Lua de dia, pálida, sobre a baía — some no "Sem ela"
    luaDia.visible = lv > 0.01; luaDia.position.copy(naTela(633, 262, 900)); luaDia.scale.setScalar(900 * Math.tan((56 / H) * 42 * D2R)); luaDia.lookAt(camera.position);
    luaDia.material.opacity = lv * (0.75 + 0.25 * win(t, F.puxa.ini, F.sobra.ini + 0.4));
  } else if (k === 3) {
    // ------------------------------------------------ RECIFE À NOITE, debaixo d'água
    so(recife); ceuDome.mesh.visible = false;
    const agua = new THREE.Color(0x0f5566).lerp(new THREE.Color(0x0d1828), m);
    scene.background = agua; scene.fog = new THREE.FogExp2(agua, lerp(0.022, 0.02, m));
    hemi.color.set(0x9fe3ef); hemi.groundColor.set(0x1d3a3a); hemi.intensity = lerp(1.9, 1.1, m);
    luz.color.set(0xe2f2ff); luz.intensity = lerp(1.8, 0.8, m); sombraCaixa(30);
    luz.position.set(4, 40, -10); luz.target.position.set(0, 0, -4);
    cam(v3(lerp(1.5, 0.6, io(f)), lerp(2.6, 3.0, f), lerp(11.0, 9.0, io(f))), v3(0, lerp(4.4, 4.9, f), -6), 46);
    // desova: começa com a fala; no "perderiam esse sinal" não sai mais nada e o que subiu se apaga
    const t0 = F.corais.ini - 0.4, corte = T_SINAL + 0.2;
    for (let i = 0; i < NOV; i++) {
      const d = ovosDados[i], ts = t0 + d.t0, idade = t - ts;
      if (idade < 0 || ts > corte) { ovosPos[i * 3 + 1] = -99; continue; }
      ovosPos[i * 3] = d.o[0] + d.dx * idade + 0.25 * Math.sin(idade * 1.7 + d.ph);
      ovosPos[i * 3 + 1] = d.o[1] + d.v * idade; ovosPos[i * 3 + 2] = d.o[2] + d.dz * idade;
    }
    ovosGeo.attributes.position.needsUpdate = true;
    ovos.material.opacity = 0.95 * (1 - ramp(t, T_SINAL + 0.2, T_SINAL + 1.4));
    ovos.material.color.set(0xffb7a6);
    peixes.children.forEach((p) => { const u = p.userData, a = u.ph + t * u.v; p.position.set(Math.cos(a) * u.raio, u.y + 0.3 * Math.sin(t + u.ph), Math.sin(a) * u.raio - 6); p.rotation.y = -a; });
    luaMar.visible = lv > 0.01; luaMar.position.copy(naTela(540, 330, 400)); luaMar.scale.setScalar(400 * Math.tan((78 / H) * 46 * D2R)); luaMar.lookAt(camera.position);
    luaMar.material.opacity = lv;
    superficie.material.color.set(new THREE.Color(0x6fd3e0).lerp(new THREE.Color(0x35557a), m));
    rRecife.position.copy(naTela(540, 760, 14)); tamTela(rRecife, 52); rRecife.material.opacity = win(t, CORTES[3] + 0.1, F.corais.ini + 0.8, 0.3, 0.25);
    rOvos.position.copy(naTela(760, 1130, 10)); tamTela(rOvos, 54); rOvos.material.opacity = win(t, F.corais.ini + 2.6, T_SINAL + 0.4);
  } else if (k === 4 || k === 5) {
    // ------------------------------------------------ O PLANETA
    ceuDome.mesh.visible = false; scene.background = new THREE.Color(0x05070c);
    hemi.intensity = lerp(0.9, 1.1, m); hemi.color.set(0xdfefff); hemi.groundColor.set(0x223040); luz.color.set(0xfff4e0); luz.intensity = 2.5;
    luz.position.set(-40, 10, 35); luz.target.position.set(0, 0, 0);
    if (k === 4) {
      so(planeta, bojo, setaLua, estrelas); cam(v3(0, 3.0, lerp(31, 28.5, io(f))), v3(0, 3.0, 0), 36);
      planeta.rotation.set(-10 * D2R, 0, 0); terra.rotation.set(0, (48 + 10 * f) * D2R, 0);
      // a direção da Lua: diagonal para cima à direita (no plano da tela)
      const a = 35 * D2R; bojo.rotation.set(0, 0, a - Math.PI / 2);
      const alon = lerp(1.24, 1.08, m), lat = 1 / Math.sqrt(alon);
      casca.scale.set(lat * 1.012, alon * 1.012, lat * 1.012);
      casca.material.color.set(new THREE.Color(0x6fc3ff).lerp(new THREE.Color(0xc4e2ff), m)); casca.material.opacity = lerp(0.42, 0.3, m);
      cascaLinha.material.opacity = 0;
      setaLua.position.set(Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, 0); setaLua.scale.setScalar(0.7); setaLua.rotation.z = a - Math.PI / 2;
      setaLua.children.forEach((c) => (c.material.opacity = 1 - m));
      rLuaSeta.position.set(Math.cos(a) * R * 1.55 - 0.4, Math.sin(a) * R * 1.55 - 1.3, 0.5); tamTela(rLuaSeta, 64); rLuaSeta.material.opacity = win(t, CORTES[4] + 0.3, T_MENOR + 0.4);
      rExag.position.set(0, -R * 1.45, 1.5); tamTela(rExag, 52); rExag.material.opacity = win(t, CORTES[4] + 0.6, T_MENOR + 0.9);
      rSoSol.position.set(0, -R * 1.62, 1.0); tamTela(rSoSol, 58); rSoSol.material.opacity = win(t, T_MENOR + 1.2, fimCena(4));
      rPinoSL.material.opacity = win(t, CORTES[4] + 0.6, fimCena(4)); pinoSL.visible = true;

    } else {
      so(planeta, eixoG, prumo, orbita, leque, estrelas); cam(v3(0, 2.4, lerp(34, 31, io(f))), v3(0, 2.4, 0), 36);
      pinoSL.visible = false;
      // hoje: 23,3° ± 1,3° (oscilação lenta pequena). Sem Lua: balança mais — ilustrativo, o quanto é debatido.
      const amp = lerp(1.3, 9, m), obl = 23.3 + amp * Math.sin((t - CORTES[5]) * lerp(1.1, 2.2, m));
      planeta.rotation.set(0, 0, -obl * D2R); terra.rotation.set(0, (44 + (t - CORTES[5]) * 2.5) * D2R, 0);
      eixoG.rotation.set(0, 0, -obl * D2R);
      leque.rotation.set(0, 0, -Math.PI / 2 + (-23.3 - 9) * D2R); leque.geometry.dispose();
      leque.geometry = new THREE.CircleGeometry(R * 1.48, 48, 0, 18 * D2R); leque.material.opacity = 0.28 * m;
      rGrau.position.set(-R * 0.75, -R * 1.25, 0.5); tamTela(rGrau, 72); rGrau.material.opacity = win(t, palavra('eixo', 'vinte') - 0.3, T_DISC + 0.3);
      rDebate.position.set(R * 0.2, -R * 1.75, 0.5); tamTela(rDebate, 58); rDebate.material.opacity = win(t, palavra('discute', 'quanto') - 0.2, fimCena(5));
      rIlus.position.set(R * 0.2, -R * 2.1, 0.5); tamTela(rIlus, 46); rIlus.material.opacity = win(t, T_DISC + 0.6, fimCena(5));

    }
  } else if (k === 6) {
    // ------------------------------------------------ TERRA E LUA EM ESCALA
    so(espaco, estrelas); ceuDome.mesh.visible = false; scene.background = new THREE.Color(0x05070c);
    hemi.intensity = 0.7; luz.intensity = 2.8; luz.color.set(0xfff4e0); luz.position.set(-60, 20, 50); luz.target.position.set(0, 0, 0);
    terraE.rotation.set(-12 * D2R, (52 + 8 * f) * D2R, 0);
    // a câmera parte de perto da Terra e se afasta até caber a Lua (zoom exponencial, a Terra continua no quadro)
    const kz = io(ramp(t, CORTES[6] + 0.4, palavra('longe', 'quilômetros') + 0.6));
    const d = 3.8 * Math.pow(ESP_D / 3.8, kz), q = (d - 3.8) / (ESP_D - 3.8);
    const alvo = ESP_C.clone().multiplyScalar(q).add(v3(0, -0.9 * (1 - q), 0));
    cam(alvo.clone().add(v3(0, 0, d)), alvo, 36);
    luaE.material.opacity = 1 - m; marcaLua.material.opacity = (1 - m) * q;
    marcaTerra.material.opacity = 0.9 * q; orbLua.material.opacity = 0.55 * q; ligaTL.material.opacity = 0.9 * ramp(q, 0.55, 0.9);
    const aj = (s, px) => tamTela(s, px);
    rTerraE.position.set(9, -3, 0); rLuaE.position.copy(LUA_E).add(v3(5.5, 1.0, 0));
    rDist.position.copy(LUA_E).multiplyScalar(0.5).add(v3(13, -6, 0)); rEscala.position.copy(LUA_E).multiplyScalar(0.3).add(v3(26, -14, 0));
    rAfasta.position.copy(LUA_E).add(v3(4.5, -4.8, 0));
    [[rTerraE, 54], [rLuaE, 58], [rDist, 64], [rAfasta, 58], [rEscala, 46]].forEach(([s, px]) => aj(s, px));
    rTerraE.material.opacity = ramp(q, 0.6, 0.9); rLuaE.material.opacity = ramp(q, 0.6, 0.9);
    rDist.material.opacity = ramp(q, 0.75, 0.95); rEscala.material.opacity = ramp(q, 0.85, 1);
    const af = win(t, palavra('longe', 'afasta') - 0.1, fimCena(6));
    rAfasta.material.opacity = af; setaAfasta.children.forEach((c) => (c.material.opacity = af));
    setaAfasta.scale.setScalar(lerp(0.7, 1, out3(ramp(t, palavra('longe', 'afasta'), palavra('longe', 'afasta') + 1))));
  }

  aparelhos(t, k);
  cartoes(t, F, B);
  legenda(t, LEG);
  renderer.render(scene, camera);
}

ligar('lua-sumisse', renderAt);
