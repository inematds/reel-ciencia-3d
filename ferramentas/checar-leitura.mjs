#!/usr/bin/env node
// Verificador de tempo de leitura: todo texto que aparece na tela precisa ficar o tempo de ser lido.
// Ideia do readcheck do lemo-opuscar (MIT); código nosso, lendo o próprio DOM — a composição não precisa declarar nada.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';

const HELP = `Verifica se cada texto da composição fica na tela o tempo de ser lido.

Uso: node scripts/checar-leitura.mjs --project P [--width 1080 --height 1920] [opções]

Regra INEMA (padrão): precisa = máx(--min, --pad + palavras × --por-palavra, --pad + letras ÷ --cps)
  --por-palavra 0.3  --pad 1.0  --min 1.5  --cps 15   (o lemo-opuscar usa só letras: 15/s + 1,5 s)
Conta a partir do 1º quadro em que o bloco está inteiro na tela (opacidade ≥ --opacidade, padrão 0.6)
até ele sumir. Só a 1ª aparição conta. Texto que cresce (máquina de escrever) é o mesmo bloco; a conta usa o texto inteiro.

De onde vêm os textos:
  1. o DOM: cada bloco com texto visível (spans e <b> dentro de um título contam como o título);
  2. window.TEXTOS(t), se a página tiver (texto desenhado em canvas/WebGL): [{id, texto, x0, y0, x1, y1}].
Página HyperFrames (data-composition-id + evento hf-seek, como no reel-ciencia-3d) também vale: o script adapta.
Contador (número que muda a cada quadro): valores que passam em < 0,5 s e só mudam nos algarismos viram UMA peça; para outros (data, mês) marque o bloco
com data-leitura="contador".
Fica de fora: #subs e #leg (legenda presa à voz) e tudo dentro de [data-leitura="ignorar"] ou de --ignorar "seletor,…".

Outras opções:
  --entry index.html   --step 0.05 (s)   --json relatorio.json
  --salvar-cortes F    grava os inícios de cena (window.CORTES, que o engine.mjs expõe) para o mezcla.py
  --avisar             só avisa: sai 0 mesmo com texto curto
Saída: 0 tudo certo · 1 algum texto curto · 2 não deu para verificar (sem seek, sem texto) — 2 nunca é aprovação.`;

function parse(args) {
  const o = {}, flags = new Set(['help', 'avisar']);
  const vals = new Set(['project', 'entry', 'width', 'height', 'step', 'por-palavra', 'pad', 'min', 'cps', 'opacidade', 'ignorar', 'json', 'salvar-cortes']);
  for (let i = 0; i < args.length; i++) {
    const k = args[i].replace(/^--/, '');
    if (flags.has(k)) o[k] = true;
    else if (vals.has(k) && args[i + 1] !== undefined) o[k] = args[++i];
    else { console.error('Opção inválida: ' + args[i]); process.exit(2); }
  }
  return o;
}
const o = parse(process.argv.slice(2));
if (o.help) { console.log(HELP); process.exit(0); }
if (!o.project) { console.error('Falta --project. Use --help.'); process.exit(2); }
const num = (k, d) => (o[k] === undefined ? d : Number(o[k]));
const STEP = num('step', 0.05), SPW = num('por-palavra', 0.3), PAD = num('pad', 1.0), MIN = num('min', 1.5), CPS = num('cps', 15), OPA = num('opacidade', 0.6);
if (![STEP, SPW, PAD, MIN, CPS, OPA].every(Number.isFinite) || STEP <= 0 || CPS <= 0) { console.error('Valor de opção inválido.'); process.exit(2); }

function playwright() {
  const local = createRequire(import.meta.url);
  try { return local('playwright'); } catch {}
  const prepared = path.join(os.homedir(), '.cache', 'crear-videos-con-codigo', 'node_modules');
  for (const dir of [process.env.VIDEO_NODE_MODULES, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, prepared].filter(Boolean)) {
    try { return createRequire(path.join(dir, 'package.json'))('playwright'); } catch {}
  }
  console.error('Playwright não está disponível (rode scripts/preparar-entorno.sh).'); process.exit(2);
}
const inside = (root, f) => { const r = path.relative(root, f); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.wav': 'audio/wav'};

const root = await fs.realpath(path.resolve(o.project));
const entry = o.entry || 'index.html';
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const real = await fs.realpath(path.resolve(root, '.' + decodeURIComponent(u.pathname)));
    if (!inside(root, real)) { res.writeHead(403); res.end(); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(real)] || 'application/octet-stream'});
    res.end(await fs.readFile(real));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok, ko) => { server.once('error', ko); server.listen(0, '127.0.0.1', ok); });
const origin = `http://127.0.0.1:${server.address().port}`;
const {chromium} = playwright();
const exe = process.env.VIDEO_CHROMIUM_PATH || undefined;
// WebGL por software (SwiftShader): sem isto, página com Three.js quebra no Chromium sem tela e nenhum texto aparece
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(exe ? {executablePath: exe} : {})});
let res;
try {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1, serviceWorkers: 'block'});
  // rede de fora bloqueada; áudio e vídeo também (não têm texto e seguram o "networkidle")
  await ctx.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(origin + '/') || /^(data|blob):/.test(u)) && !/\.(wav|mp3|m4a|ogg|mp4|webm|mov)(\?|$)/i.test(u) ? r.continue() : r.abort(); });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  try { await page.goto(origin + '/' + entry, {waitUntil: 'networkidle', timeout: 60000}); }
  catch (e) { console.error('NÃO VERIFICADO — a página não carregou: ' + e.message.split('\n')[0]); process.exit(2); }
  // Página HyperFrames (data-composition-id + evento hf-seek, ex.: reel-ciencia-3d): adapta para o mesmo contrato.
  const hf = await page.evaluate(() => {
    if (typeof window.seek === 'function') return false;
    const r = document.querySelector('[data-composition-id][data-duration]');
    if (!r) return false;
    window.videoSpec = {width: +r.dataset.width || innerWidth, height: +r.dataset.height || innerHeight, duration: +r.dataset.duration};
    window.seek = async t => {
      window.__hfThreeTime = t;
      for (const tl of Object.values(window.__timelines || {})) try { tl.seek(t, false); } catch {}
      window.dispatchEvent(new CustomEvent('hf-seek', {detail: {time: t}}));
    };
    window.renderReady = Promise.all(Object.values((window.__hf || {}).buildReady || {}));
    return true;
  });
  if (erros.length) {   // no HyperFrames, script externo bloqueado (ex.: gsap do CDN) não impede ler o texto
    if (!hf) { console.error('Erro na página:\n' + erros.join('\n')); process.exit(2); }
    console.error('Aviso (página HyperFrames): ' + erros.join(' | ').slice(0, 300));
  }
  const spec = await page.evaluate(() => window.videoSpec || {});
  const W = Number(o.width ?? spec.width), H = Number(o.height ?? spec.height), DUR = Number(spec.duration);
  if (!(W > 0 && H > 0 && DUR > 0)) { console.error('NÃO VERIFICADO — falta window.videoSpec com width/height/duration.'); process.exit(2); }
  await page.setViewportSize({width: W, height: H});
  res = await page.evaluate(async ({STEP, OPA, W, H, DUR, ignorar}) => {
    if (typeof window.seek !== 'function') return {erro: 'a página não tem window.seek(t)'};
    Object.assign(window.videoSpec, {width: W, height: H});
    if (window.renderReady) await window.renderReady;
    await document.fonts.ready;
    const fora = ['#subs', '#leg', '[data-leitura="ignorar"]', ...(ignorar ? ignorar.split(',') : [])].join(',');
    const ids = new WeakMap(); let nid = 0;
    const nome = el => { const c = el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + c; };
    const bloco = el => { while (el.parentElement && getComputedStyle(el).display === 'inline') el = el.parentElement; return el; };
    const opac = (el, cache) => {   // opacidade efetiva (produto até a raiz); display:none / visibility → 0
      if (!el || el === document.documentElement) return 1;
      if (cache.has(el)) return cache.get(el);
      const cs = getComputedStyle(el);
      const v = cs.display === 'none' || cs.visibility === 'hidden' ? 0 : Number(cs.opacity) * opac(el.parentElement, cache);
      cache.set(el, v); return v;
    };
    const pecas = {}, parcial = {};
    for (let i = 0, t = 0; t < DUR; t = ++i * STEP) {
      await window.seek(t);
      const cache = new Map(), agora = new Map();
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        const s = n.nodeValue.replace(/\s+/g, ' ');
        if (!n.parentElement || n.parentElement.closest('script,style,' + fora)) continue;
        const b = bloco(n.parentElement);
        if (!s.trim()) { if (ids.has(b) && agora.has(ids.get(b))) agora.get(ids.get(b)).txt.push(' '); continue; }   // espaço entre <b>s
        if (opac(n.parentElement, cache) < OPA) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const r = rg.getBoundingClientRect();
        if (r.width < 1 || r.height < 6) continue;
        if (!ids.has(b)) ids.set(b, 'b' + (++nid) + ' ' + nome(b));
        const k = ids.get(b), a = agora.get(k) || {txt: [], x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, contador: !!b.closest('[data-leitura="contador"]')};
        if (a.txt.length && n.previousSibling && n.previousSibling.nodeName === 'BR') a.txt.push(' ');   // <br> separa palavras
        a.txt.push(s); a.x0 = Math.min(a.x0, r.left); a.y0 = Math.min(a.y0, r.top); a.x1 = Math.max(a.x1, r.right); a.y1 = Math.max(a.y1, r.bottom);
        agora.set(k, a);
      }
      if (typeof window.TEXTOS === 'function')
        for (const x of window.TEXTOS(t) || []) agora.set('canvas ' + x.id, {txt: [String(x.texto)], x0: x.x0, y0: x.y0, x1: x.x1, y1: x.y1});
      const vis = new Set();
      for (const [k, a] of agora) {
        const txt = a.txt.join('').replace(/\s+/g, ' ').trim();
        const dentro = a.x0 >= -1 && a.y0 >= -1 && a.x1 <= W + 1 && a.y1 <= H + 1;
        const lista = pecas[k] ??= [];
        // mesmo bloco e texto igual ou crescendo (máquina de escrever) = a mesma peça; texto trocado = peça nova
        // contador (só os algarismos mudam, ou o bloco está em [data-leitura="contador"]) = a mesma peça
        // [data-leitura="contador"] = a mesma peça mesmo com o texto mudando (contador automático: ver o fim)
        let p = lista.find(x => txt.startsWith(x.texto) || x.texto.startsWith(txt) || (x.contador ??= a.contador));
        if (!dentro) { if (!p) parcial[k + txt] ??= {id: k, texto: txt, t0: t}; continue; }
        if (!p) { p = {id: k, texto: txt, t0: t, run: 0, feito: false}; lista.push(p); }
        vis.add(p);
        if (!p.feito) { p.run = Math.min(t + STEP, DUR) - p.t0; if (txt.length > p.texto.length) p.texto = txt; }
      }
      for (const k in pecas) for (const p of pecas[k]) if (!vis.has(p)) p.feito = true;   // só a 1ª aparição conta
    }
    // contador automático: valores que passam rápido (< 0,5 s cada) e só mudam nos algarismos viram UMA peça com o
    // valor seguinte. "16:9" parado 4 s que vira "9:16" por 0,5 s continua sendo duas peças (a 2ª é curta de verdade).
    const forma = x => x.replace(/\d+([.,]\d+)?/g, '#');
    for (const k in pecas) {
      const l = pecas[k].sort((a, b) => a.t0 - b.t0), out = [];
      for (const p of l) {
        const q = out[out.length - 1];
        if (q && (q.ult ?? q.run) < 0.5 && forma(q.texto) === forma(p.texto) && p.t0 - (q.t0 + q.run) <= STEP * 1.5) {
          q.run = p.t0 + p.run - q.t0; q.ult = p.run;   // q.ult: quanto durou o último valor absorvido if (p.texto.length > q.texto.length) q.texto = p.texto;
        } else out.push(p);
      }
      pecas[k] = out;
    }
    const todas = Object.values(pecas).flat();
    for (const k in parcial) if (todas.some(p => p.id === parcial[k].id && (p.texto.startsWith(parcial[k].texto) || parcial[k].texto.startsWith(p.texto)))) delete parcial[k];
    return {seen: todas, parcial: Object.values(parcial), cortes: Array.isArray(window.CORTES) ? window.CORTES : null};
  }, {STEP, OPA, W, H, DUR, ignorar: o.ignorar || ''});
} finally { await browser.close(); server.close(); }

if (res.erro || (!res.seen.length && !res.parcial.length)) {
  console.error('NÃO VERIFICADO — ' + (res.erro || 'nenhum texto visível no filme inteiro') + '. Isto não é aprovação.'); process.exit(2);
}
const precisa = txt => {
  const pal = txt.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length, letras = [...txt].filter(c => !/\s/.test(c)).length;
  return {pal, need: Math.max(MIN, PAD + pal * SPW, PAD + letras / CPS)};
};
const linhas = [];
let ruins = 0;
for (const s of res.seen.sort((a, b) => a.t0 - b.t0)) {
  const {pal, need} = precisa(s.texto), ok = s.run >= need - 1e-6; if (!ok) ruins++;
  linhas.push({ok, id: s.id, t0: +s.t0.toFixed(2), palavras: pal, precisa: +need.toFixed(2), ficou: +s.run.toFixed(2), texto: s.texto});
  console.log(`${ok ? 'OK  ' : 'RUIM'} ${s.t0.toFixed(2).padStart(6)}s  ${String(pal).padStart(2)} pal  precisa ${need.toFixed(2)}s  ficou ${s.run.toFixed(2)}s  ${JSON.stringify(s.texto.slice(0, 48))}  [${s.id}]`);
}
for (const s of res.parcial) {
  ruins++; linhas.push({ok: false, id: s.id, t0: +s.t0.toFixed(2), texto: s.texto, motivo: 'nunca inteiro na tela'});
  console.log(`RUIM ${s.t0.toFixed(2).padStart(6)}s  nunca fica inteiro na tela (corta na borda)  ${JSON.stringify(s.texto.slice(0, 48))}  [${s.id}]`);
}
console.log(`\n${linhas.length} textos · ${ruins} curtos ou cortados · regra: máx(${MIN}, ${PAD} + ${SPW}×palavras, ${PAD} + letras/${CPS})`);
if (o.json) await fs.writeFile(path.resolve(o.json), JSON.stringify({regra: {por_palavra: SPW, pad: PAD, min: MIN, cps: CPS}, textos: linhas}, null, 1));
if (o['salvar-cortes']) {
  if (!res.cortes) console.error('Aviso: a página não expõe window.CORTES; nenhum corte gravado.');
  else { await fs.mkdir(path.dirname(path.resolve(o['salvar-cortes'])), {recursive: true}); await fs.writeFile(path.resolve(o['salvar-cortes']), JSON.stringify(res.cortes)); console.log(`cortes: ${res.cortes.length} → ${o['salvar-cortes']}`); }
}
process.exit(ruins && !o.avisar ? 1 : 0);
