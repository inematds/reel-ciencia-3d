"""Deixa um reel pronto para o HyperFrames: copia o motor, acerta a duração e monta o som final.

Uso:  python3 preparar.py --projeto exemplos/<id>

1. Copia ../../motor para DIR/motor (cada reel fica completo na própria pasta).
2. Lê FIM e ATRASO de DIR/js/tempos.js e grava a duração no index.html (onde houver __FIM__ ou a duração antiga).
3. Som final DIR/audio/<id>/final.wav: a mezcla.wav atrasada ATRASO s, com silêncio até FIM e saída suave.
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess

AQUI = pathlib.Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--projeto", required=True)
    a = ap.parse_args()
    P = pathlib.Path(a.projeto).resolve()
    rid = json.loads((P / "roteiro.json").read_text())["id"]
    shutil.copytree(AQUI.parent / "motor", P / "motor", dirs_exist_ok=True)
    tj = (P / "js" / "tempos.js").read_text()
    fim = float(re.search(r"FIM = ([\d.]+)", tj).group(1))
    atraso = float(re.search(r"ATRASO = ([\d.]+)", tj).group(1))
    html = (P / "index.html").read_text()
    html = re.sub(r'(data-duration=")(__FIM__|[\d.]+)(")', rf"\g<1>{fim}\g<3>", html)
    html = re.sub(r"(duration: )(__FIM__|[\d.]+)( \}, 0\))", rf"\g<1>{fim}\g<3>", html)
    # o som sempre aponta para o reel desta pasta (mesmo num index.html copiado de outro exemplo)
    html = re.sub(r'audio/[^/"]+/(?:mezcla|final)\.wav', f"audio/{rid}/final.wav", html)
    (P / "index.html").write_text(html)
    src, dst = P / "audio" / rid / "mezcla.wav", P / "audio" / rid / "final.wav"
    ms = int(atraso * 1000)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-af",
                    f"adelay={ms}|{ms},apad=whole_dur={fim},afade=t=out:st={fim - 1.2:.2f}:d=1.2,atrim=0:{fim}",
                    "-ar", "48000", str(dst)], check=True)
    print(f"{P.name}: motor copiado, duração {fim}s, som {dst.relative_to(P)}")


if __name__ == "__main__":
    main()
