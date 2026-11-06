"""Transforma a voz (voz/<id>/tiempos.json) no relógio do reel: js/tempos.js.

Uso:  python3 montar.py --projeto DIR [--atraso 0.3] [--cauda 2.4]

Lê DIR/roteiro.json (campos opcionais "tela" e "destaques") e DIR/voz/<id>/tiempos.json.
Escreve DIR/js/tempos.js com:
  ATRASO, FIM, BLOCOS {b0: {ini, fim}}, FRASES {id: {ini, fim}}, LEG [{ini, fim, txt, quente}]
Tudo em segundos do VÍDEO (a voz começa em ATRASO). A legenda vem pronta: grupos de 1 a 3 palavras,
quebra na pontuação, números falados viram algarismos ("doze" → "12") pelo campo "tela" do roteiro.
"""
import argparse
import json
import pathlib
import re
import unicodedata


def norm(w):
    w = unicodedata.normalize("NFC", w.lower())
    return re.sub(r"[^\wà-ú°%,-]", "", w).strip(",")


def estimar(rot, ritmo=2.6):
    """Tempos de mentira, só pelo texto: para reel sem voz (legenda + música)."""
    t, frases, bloques, palavras = 0.0, [], [], []
    pausa, entre = rot.get("pausa", 0.25), rot.get("intervalo_blocos", 0.5)
    for b in rot["blocos"]:
        b0 = t
        for f in b["frases"]:
            f0 = t
            for w in f["texto"].split():
                d = 0.18 + len(re.sub(r"\W", "", w)) * 0.045 + (0.25 if re.search(r"[.,?!]$", w) else 0)
                palavras.append({"texto": w, "inicio": round(t, 3), "fin": round(t + d * 0.9, 3), "frase": f["id"]})
                t += d * (2.6 / ritmo)
            frases.append({"id": f["id"], "bloque": b["id"], "texto": f["texto"], "inicio": round(f0, 3), "fin": round(t, 3)})
            t += pausa
        bloques.append({"id": b["id"], "inicio": round(b0, 3), "fin": round(t - pausa, 3)})
        t += entre
    return {"id": rot["id"], "duracion": round(t - entre - pausa, 3), "bloques": bloques, "frases": frases, "palabras": palavras}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--projeto", default=".")
    ap.add_argument("--atraso", type=float, default=0.3, help="segundos de silêncio antes da 1ª palavra")
    ap.add_argument("--cauda", type=float, default=2.4, help="segundos depois da última palavra (volta ao título)")
    ap.add_argument("--max", type=int, default=3, help="palavras por grupo de legenda")
    ap.add_argument("--sem-voz", action="store_true",
                    help="sem voz local: estima o tempo de cada palavra pelo texto (2,6 palavras/s) e grava voz/<id>/tiempos.json")
    a = ap.parse_args()
    P = pathlib.Path(a.projeto)
    rot = json.loads((P / "roteiro.json").read_text())
    arq = P / "voz" / rot["id"] / "tiempos.json"
    if a.sem_voz:
        arq.parent.mkdir(parents=True, exist_ok=True)
        arq.write_text(json.dumps(estimar(rot), ensure_ascii=False))
    elif not arq.exists():
        raise SystemExit(f"Falta {arq}: rode ferramentas/voz.py antes, ou use --sem-voz (só legenda e música).")
    tm = json.loads(arq.read_text())
    off = a.atraso
    tela = [([norm(x) for x in k.split()], v) for k, v in rot.get("tela", {}).items()]
    tela.sort(key=lambda kv: -len(kv[0]))
    quentes = {norm(x) for x in rot.get("destaques", [])}

    blocos = {b["id"]: {"ini": round(b["inicio"] + off, 3), "fim": round(b["fin"] + off, 3)} for b in tm["bloques"]}
    frases = {f["id"]: {"ini": round(f["inicio"] + off, 3), "fim": round(f["fin"] + off, 3)} for f in tm["frases"]}

    leg = []
    for f in tm["frases"]:
        ws = [w for w in tm["palabras"] if w.get("frase") == f["id"]] if "palabras" in tm else []
        if not ws:
            ws = [w for w in f.get("palabras", [])]
        # 1) junta sequências faladas que viram um token na tela ("vinte e três vírgula quatro graus" → "23,4°")
        toks, i = [], 0
        while i < len(ws):
            for seq, rep in tela:
                if [norm(w["texto"]) for w in ws[i:i + len(seq)]] == seq:
                    fim_pont = re.search(r"[.,!?;:]$", ws[i + len(seq) - 1]["texto"])
                    toks.append({"txt": rep + (fim_pont.group(0) if fim_pont else ""), "ini": ws[i]["inicio"],
                                 "fim": ws[i + len(seq) - 1]["fin"], "q": True})
                    i += len(seq)
                    break
            else:
                w = ws[i]
                toks.append({"txt": w["texto"].strip(), "ini": w["inicio"], "fim": w["fin"],
                             "q": norm(w["texto"]) in quentes or bool(re.search(r"\d", w["texto"]))})
                i += 1
        # 2) grupos de até N palavras, quebrando depois de pontuação
        g = []
        for j, t in enumerate(toks):
            g.append(t)
            prox = toks[j + 1] if j + 1 < len(toks) else None
            fecha = bool(re.search(r"[.,!?;:]$", t["txt"]))
            # não deixa uma palavra sozinha no fim da frase: ela entra no grupo atual (até max+1)
            orfa = prox is not None and re.search(r"[.,!?;:]$", prox["txt"]) and len(g) == a.max
            if fecha or (len(g) >= a.max and not orfa) or len(g) > a.max:
                leg.append(g); g = []
        if g:
            leg.append(g)
    out = []
    for g in leg:
        txt = " ".join(re.sub(r"[.,;:]$", "", t["txt"]) for t in g)
        out.append({"ini": round(g[0]["ini"] + off - 0.06, 3), "fim": round(g[-1]["fim"] + off + 0.2, 3), "txt": txt,
                    "quente": [re.sub(r"[.,;:?!]$", "", t["txt"]) for t in g if t["q"]]})
    for k in range(len(out) - 1):  # nunca dois grupos ao mesmo tempo
        out[k]["fim"] = min(out[k]["fim"], out[k + 1]["ini"])
    pal = [{"f": w["frase"], "w": norm(w["texto"]), "ini": round(w["inicio"] + off, 3), "fim": round(w["fin"] + off, 3)} for w in tm["palabras"]]
    fim = round(tm["duracion"] + off + a.cauda, 2)
    js = P / "js" / "tempos.js"
    js.parent.mkdir(exist_ok=True)
    js.write_text("// Gerado por ferramentas/montar.py a partir da voz. Não editar à mão.\n"
                  f"export const ATRASO = {off};\nexport const FIM = {fim};\n"
                  f"export const BLOCOS = {json.dumps(blocos)};\nexport const FRASES = {json.dumps(frases)};\n"
                  f"export const LEG = {json.dumps(out, ensure_ascii=False)};\n"
                  f"export const PAL = {json.dumps(pal, ensure_ascii=False)};\n"
                  "// hora em que a palavra w (sem acento de pontuação, minúscula) é dita na frase f\n"
                  "export const palavra = (f, w, qual = 'ini') => { const x = PAL.find((p) => p.f === f && p.w.startsWith(w)); if (!x) { console.warn('palavra', f, w); return FRASES[f] ? FRASES[f].ini : 0; } return x[qual]; };\n")
    print(f"tempos.js: {len(out)} grupos de legenda, fim {fim}s")


if __name__ == "__main__":
    main()
