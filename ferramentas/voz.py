"""Voz LOCAL de um vídeo com o tempo de cada palavra, para atar a imagem ao que é dito. Sem API, sem custo.

Uso:
  python3 voz.py --projeto DIR DIR/roteiro.json                 # gera o que falta (com cache por frase)
  python3 voz.py --projeto DIR DIR/roteiro.json --simular       # só mostra o que seria gerado
  python3 voz.py --projeto DIR DIR/roteiro.json --frase hook --refazer

roteiro.json (as chaves em espanhol do formato antigo também valem: bloques, hueco_bloques, diccionario):
  {"id": "lancamento", "pausa": 0.2, "intervalo_blocos": 0.6,
   "voz": "nei",                                   (opcional: nome em VC_VOZES ou caminho .wav)
   "dicionario": [["INEMA", "inema"]],             (opcional: tela → fala)
   "blocos": [{"id": "abertura", "frases": [{"id": "hook", "texto": "..."}]}]}

Como funciona:
  1. Cada frase vira uma fala no Chatterbox (inemavox, GPU) com a voz clonada (padrão: nei).
  2. O Whisper large-v3 local ouve cada frase, mede a semelhança com o texto e dá o tempo de cada palavra.
     Frase abaixo de VC_SIM_MIN (0,80) é gerada de novo (até 2 vezes).
  3. Junta tudo com `pausa` entre frases e `intervalo_blocos` entre blocos.
Saída em DIR/voz/<id>/: voz.wav (mono, 48 kHz), tiempos.json e tiempos.js (window.TIEMPOS) com bloques, frases e
palabras — o formato que assets/voz-sync/engine.mjs lê.
Variáveis: VC_VOZ · VC_VOZES (pasta das vozes) · VC_IDIOMA (pt) · VC_SIM_MIN · CHATTERBOX_PYTHON · INEMAVOX_DIR.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

HOME = pathlib.Path.home()
AQUI = pathlib.Path(__file__).resolve().parent
VOX = pathlib.Path(os.environ.get("INEMAVOX_DIR", HOME / "projetos/inemavox"))
CB_PY = os.environ.get("CHATTERBOX_PYTHON", str(HOME / "miniconda3/envs/chatterbox/bin/python3"))
VOX_PY = str(VOX / "venv/bin/python")
VOZES = pathlib.Path(os.environ.get("VC_VOZES", HOME / "projetos/timesmkt3/media/voice-refs"))
IDIOMA = os.environ.get("VC_IDIOMA", "pt")
SIM_MIN = float(os.environ.get("VC_SIM_MIN", "0.80"))
SR = 48000

# O que aparece na tela → o que a voz lê. O mais longo primeiro.
DICIONARIO = [
    (r"\bINEMA\.CLUB\b", "Inema Club"), (r"\bLLM\b", "éle éle ême"), (r"\bIA\b", "i a"), (r"\bAPI\b", "a pê i"), (r"\bMP4\b", "ême pê quatro"),
    (r"\bHTML\b", "agá tê ême éle"), (r"\bSVG\b", "ésse vê gê"), (r"\bCRM\b", "cê érre ême"),
    (r"\bClaude Code\b", "Clód Côud"), (r"\bClaude\b", "Clód"), (r"\bGitHub\b", "guit rãb"),
    (r"/([a-z][\w-]*)", lambda m: "barra " + m.group(1).replace("-", " ")),
]


def falado(texto, extra):
    for a, b in list(extra) + DICIONARIO:
        texto = re.sub(a, b, texto)
    return re.sub(r"\s+", " ", texto).strip()


def caminho_voz(nome):
    p = pathlib.Path(nome).expanduser()
    if p.suffix == ".wav":
        return p
    return VOZES / f"{nome}.wav"


def sintetizar(itens, pasta, ref):
    """itens = [(chave, texto)] → {chave: wav}. Um carregamento do modelo por chamada."""
    pasta.mkdir(parents=True, exist_ok=True)
    sj, oj = pasta / "segs.json", pasta / "out.json"
    sj.write_text(json.dumps([{"text_trad": t, "start": 0.0, "end": 1.0} for _, t in itens], ensure_ascii=False))
    cmd = [CB_PY, str(VOX / "chatterbox_tts_worker.py"), "--segments-json", str(sj), "--workdir", str(pasta),
           "--lang", IDIOMA, "--output-json", str(oj), "--ref", str(ref), "--cfg-weight", os.environ.get("VC_CFG", "0.6"),
           "--exaggeration", os.environ.get("VC_EXAG", "0.6"), "--temperature", "0.75"]
    r = subprocess.run(cmd, cwd=VOX, capture_output=True, text=True, timeout=3600)
    if r.returncode != 0:
        sys.exit("Chatterbox falhou:\n" + (r.stdout + r.stderr)[-1500:])
    d = json.loads(oj.read_text())
    return {k: s["file"] for (k, _), s in zip(itens, d["segments"])}


def alinhar(wavs, textos, pasta):
    """wavs/textos = {chave: …} → {chave: {wav, dur, sim, heard, words}}"""
    chaves = sorted(wavs)
    rq, rs = pasta / "al_in.json", pasta / "al_out.json"
    rq.write_text(json.dumps({"lang": IDIOMA, "segs": [{"wav": wavs[k], "text": textos[k]} for k in chaves]}, ensure_ascii=False))
    r = subprocess.run([VOX_PY, "-I", str(AQUI / "_alinhar.py"), str(rq), str(rs)], capture_output=True, text=True, timeout=3600)
    if r.returncode != 0:
        sys.exit("Whisper falhou:\n" + (r.stdout + r.stderr)[-1500:])
    return dict(zip(chaves, json.loads(rs.read_text())["segs"]))


def repartir(texto, ouvidas):
    """Palavras da TELA com os tempos das palavras FALADAS (quando o dicionário muda a contagem, reparte por tamanho)."""
    vistas = texto.split()
    if len(vistas) == len(ouvidas):
        return [{"texto": v, "inicio": o[1], "fin": o[2]} for v, o in zip(vistas, ouvidas)]
    a, b = ouvidas[0][1], ouvidas[-1][2]
    pesos = [max(2, len(re.sub(r"\W", "", v)) + 1) for v in vistas]
    total, t, out = sum(pesos), a, []
    for v, w in zip(vistas, pesos):
        d = (b - a) * w / total
        out.append({"texto": v, "inicio": t, "fin": t + d})
        t += d
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro")
    ap.add_argument("--projeto", "--proyecto", dest="projeto", default=".")
    ap.add_argument("--frase", help="com --refazer: gera de novo só esta frase")
    ap.add_argument("--refazer", "--rehacer", dest="refazer", action="store_true")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()

    projeto = pathlib.Path(a.projeto).resolve()
    rot = json.loads(pathlib.Path(a.roteiro).read_text())
    blocos = rot.get("blocos") or rot.get("bloques")
    pausa = rot.get("pausa", 0.2)
    intervalo = rot.get("intervalo_blocos", rot.get("hueco_bloques", 0.6))
    extra = [tuple(x) for x in rot.get("dicionario", rot.get("diccionario", []))]
    voz = os.environ.get("VC_VOZ") or (rot.get("voz") if isinstance(rot.get("voz"), str) else None) or "nei"
    ref = caminho_voz(voz)
    for need in (CB_PY, VOX_PY, ref):
        if not os.path.exists(need):
            sys.exit(f"Falta: {need}" + (" — defina VC_VOZ=/caminho/sua-voz.wav" if str(need) == str(ref) else " (ver README › Instalação)"))

    saida = projeto / "voz" / rot["id"]
    cache = saida / "cache"
    cache.mkdir(parents=True, exist_ok=True)
    frases = [(b["id"], f) for b in blocos for f in b["frases"]]
    ids = [f["id"] for _, f in frases]
    if len(set(ids)) != len(ids):
        sys.exit("Há id de frase repetido no roteiro: cada frase precisa de um id único.")

    def chave(f):
        return hashlib.sha1(json.dumps([str(ref), IDIOMA, falado(f["texto"], extra)]).encode()).hexdigest()[:12]

    def arq(f):
        return cache / f"{f['id']}-{chave(f)}.json"

    falta = [f for _, f in frases if not arq(f).exists() or (a.refazer and a.frase in (None, f["id"]))]
    print(f"{rot['id']}: {len(frases)} frases · {len(falta)} por gerar · voz {voz}")
    if a.simular:
        for f in falta:
            print(f"  · {f['id']}: «{falado(f['texto'], extra)[:90]}»")
        return

    if falta:
        tmp = cache / "_trabalho"
        textos = {f["id"]: falado(f["texto"], extra) for f in falta}
        melhor, todo = {}, list(textos)
        for tentativa in range(3):
            wavs = sintetizar([(k, textos[k]) for k in todo], tmp / f"t{tentativa}", ref)
            res = alinhar(wavs, {k: textos[k] for k in todo}, tmp / f"t{tentativa}")
            for k, r in res.items():
                if k not in melhor or r["sim"] > melhor[k]["sim"]:
                    melhor[k] = r
            todo = [k for k in todo if melhor[k]["sim"] < SIM_MIN]
            print(f"  tentativa {tentativa + 1}: {len(textos) - len(todo)}/{len(textos)} frases ok", flush=True)
            if not todo:
                break
        for f in falta:
            r = melhor[f["id"]]
            wav = arq(f).with_suffix(".wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", r["wav"], "-ac", "1", "-ar", str(SR), str(wav)], check=True)
            arq(f).write_text(json.dumps({**r, "wav": wav.name, "texto": textos[f["id"]]}, ensure_ascii=False))
        shutil.rmtree(tmp, ignore_errors=True)
        ruins = [(k, melhor[k]["sim"], melhor[k]["heard"]) for k in todo]
        for k, s, h in ruins:
            print(f"  ⚠ {k}: semelhança {s} — ouvido «{h}» (reescreva a frase ou rode com --refazer --frase {k})")

    # monta a pista e os tempos
    lista, t, ib, ifr, ip = [], 0.0, [], [], []
    trab = saida / "_montagem"
    trab.mkdir(exist_ok=True)

    def silencio(d):
        p = trab / f"sil{d:.3f}.wav"
        if not p.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{d:.3f}", str(p)], check=True)
        return p

    anterior = None
    for b in blocos:
        if anterior is not None:
            lista.append(silencio(intervalo)); t += intervalo
        b0 = t
        for j, f in enumerate(b["frases"]):
            if j:
                lista.append(silencio(pausa)); t += pausa
            d = json.loads(arq(f).read_text())
            # corta a frase entre a 1ª e a última palavra ouvida: o Chatterbox às vezes deixa respiração ou
            # ruído de 1–3 s no fim, que viraria buraco entre as frases
            a0 = max(0.0, d["words"][0][1] - 0.06)
            a1 = min(d["dur"], d["words"][-1][2] + 0.18)
            corte = trab / f"{f['id']}.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(cache / d["wav"]), "-af",
                            f"atrim={a0:.3f}:{a1:.3f},afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse",
                            "-ac", "1", "-ar", str(SR), str(corte)], check=True)
            lista.append(corte)
            ws = [[w, t + x - a0, t + y - a0] for w, x, y in d["words"]]
            ifr.append({"id": f["id"], "bloque": b["id"], "texto": f["texto"], "inicio": round(ws[0][1], 3), "fin": round(ws[-1][2], 3)})
            ip += [{"texto": v["texto"], "inicio": round(v["inicio"], 3), "fin": round(v["fin"], 3), "frase": f["id"]}
                   for v in repartir(f["texto"], ws)]
            t += a1 - a0
        ib.append({"id": b["id"], "inicio": round(b0, 3), "fin": round(t, 3)})
        anterior = b

    lst = trab / "lista.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in lista))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-ac", "1", "-ar", str(SR),
                    "-af", "loudnorm=I=-18:TP=-2", str(saida / "voz.wav")], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(saida / "voz.wav")],
                               capture_output=True, text=True).stdout)
    dados = {"id": rot["id"], "duracion": round(dur, 3), "voz": voz, "pausa": pausa, "bloques": ib, "frases": ifr, "palabras": ip}
    (saida / "tiempos.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1))
    (saida / "tiempos.js").write_text("window.TIEMPOS=" + json.dumps(dados, ensure_ascii=False) + ";\n")
    shutil.rmtree(trab, ignore_errors=True)
    print(f"{rot['id']}: {dados['duracion']} s · {len(ifr)} frases · {len(ip)} palavras → {saida}")


if __name__ == "__main__":
    main()
