"""Música original sintetizada, efectos en los instantes de la animación y mezcla final. Sin muestras de terceros.

Dos modos:
  CON VOZ    python3 mezcla.py --proyecto DIR --id venta --musica energica
             Lee DIR/voz/<id>/voz.wav y tiempos.json. La música va bajo la voz (24 dB por defecto) y se agacha sola
             mientras se habla: con la música más alta, la voz se pierde.
  SOLO SONIDO python3 mezcla.py --proyecto DIR --id teaser --duracion 30 --musica energica
             Sin voz: la música manda y los efectos marcan las acciones.

Efectos: DIR/audio/<id>/eventos.json, una lista de {"t": …, "tipo": "whoosh|pop|click|ding|impacto", "nota": 84}.
«t» puede ser segundos o, con voz, «frase», «frase@palabra», «frase@palabra+.2» (como data-in en declarativo.mjs).
Músicas: energica (120 BPM, La menor) · tranquila (84 BPM, Do mayor) · ninguna. --pista FICHERO usa una pista propia.
Salida: DIR/audio/<id>/mezcla.wav (estéreo, 48 kHz, normalizada a --lufs).
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import unicodedata

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def leer(f):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(f), "-f", "f64le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float64).copy()


def escribir(f, x, canales=1, extra=()):
    if canales == 2: x = np.repeat(x[:, None], 2, axis=1)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f64le", "-ar", str(SR), "-ac", str(canales), "-i", "-", *extra, str(f)],
                   input=x.astype(np.float64).tobytes(), check=True)


# ── Tiempos ──
def norm(s): return re.sub(r"[^a-z0-9/]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())


def cuando(spec, tiempos):
    if isinstance(spec, (int, float)): return float(spec)
    if re.fullmatch(r"-?[\d.]+", spec): return float(spec)
    m = re.fullmatch(r"([\w-]+)(?:@([^#+\-]+)(?:#(\d+))?)?(:fin)?([+-][\d.]+)?", spec)
    if not m or not tiempos: sys.exit(f"Tiempo mal escrito o sin voz: {spec}")
    fid, w, n, es_fin, off = m.groups()
    fr = next(f for f in tiempos["frases"] if f["id"] == fid)
    if w:
        ps = [p for p in tiempos["palabras"] if p["frase"] == fid and norm(p["texto"]).startswith(norm(w))]
        t = ps[int(n) - 1 if n else 0]["inicio"]
    else:
        t = fr["fin"] if es_fin else fr["inicio"]
    return t + (float(off) if off else 0)


# ── Síntesis ──
def t_(d): return np.arange(int(d * SR)) / SR
def nota(m): return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def hp(x, fc): return x - lp(x, fc)


def env(n, a=.01, r=.2):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, d, det=0.0): tt = t_(d); return 2 * ((tt * f * (1 + det)) % 1) - 1


def poner(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    j = max(0, -i); i = max(0, i); n = min(len(x) - j, len(buf) - i)
    buf[i:i + n] += g * x[j:j + n]


def kick(): tt = t_(.32); return np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-tt * 28)) / SR) * np.exp(-tt * 9)
def clap(): tt = t_(.22); return hp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 22) * .5
def hat(): tt = t_(.12); return hp(rng.standard_normal(len(tt)), 6500) * np.exp(-tt * 55) * .22


def pad(chord, d, brillo=1400):
    x = sum(saw(nota(m), d, dd) for m in chord for dd in (-.004, .004)) / (2 * len(chord))
    return lp(x, brillo) * env(len(x), .35, .6)


def bajo(m, d):
    tt = t_(d); x = np.sin(2 * np.pi * nota(m) * tt) + .35 * np.sin(4 * np.pi * nota(m) * tt)
    return x * env(len(x), .005, .08) * np.exp(-tt * 3) * .7


def pluck(m, d=.5):
    tt = t_(d); f = nota(m)
    x = np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt) + .12 * np.sin(6 * np.pi * f * tt)
    return x * np.exp(-tt * 7) * env(len(x), .003, .05) * .35


def whoosh(d=.55):
    tt = t_(d); n = rng.standard_normal(len(tt)); out = np.zeros(len(tt)); sweep = np.linspace(400, 5000, len(tt))
    for k in range(8):
        a, b = k * len(tt) // 8, (k + 1) * len(tt) // 8
        out[a:b] = lp(n, sweep[(a + b) // 2])[a:b]
    return out * np.sin(np.pi * np.linspace(0, 1, len(tt))) ** 2 * .5


def pop_(): tt = t_(.12); return np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 18) + 300) / SR) * np.exp(-tt * 30) * .35
def click(): tt = t_(.05); return (np.sin(2 * np.pi * 2200 * tt) * .6 + hp(rng.standard_normal(len(tt)), 3000) * .4) * np.exp(-tt * 90) * .45


def ding(m=84):
    tt = t_(1.2); f = nota(m)
    return (np.sin(2 * np.pi * f * tt) + .4 * np.sin(4 * np.pi * f * tt) + .2 * np.sin(2 * np.pi * nota(m + 19) * tt)) * np.exp(-tt * 4) * .22


def impacto():
    tt = t_(1.1)
    return np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 3.2) * .9 + lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 9) * .25


EFECTOS = {"whoosh": whoosh, "pop": pop_, "click": click, "ding": ding, "impacto": impacto}


def musica(estilo, dur):
    buf = np.zeros(int(dur * SR))
    if estilo == "ninguna": return buf
    if estilo == "energica":
        beat, prog, raiz = .5, [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], [45, 41, 48, 43]
        for i in range(int(dur / beat) + 1):
            t, bar = i * beat, i // 4
            acorde = prog[bar % 4]
            if i % 4 == 0: poner(buf, pad(acorde, 4 * beat + .6, 1600), t, .32)
            poner(buf, kick(), t, .55)
            if bar >= 2 and i % 4 in (1, 3): poner(buf, clap(), t, .35)
            if bar >= 1: poner(buf, hat(), t + beat / 2, .5)
            for k in (0, .5): poner(buf, bajo(raiz[bar % 4], beat / 2), t + k * beat, .32)
            if i % 2 == 0 and bar >= 4: poner(buf, pluck(acorde[(i // 2) % 3] + 12), t, .22)
        poner(buf, pad([57, 60, 64, 69], 3.5, 2200), max(0, dur - 3.2), .35)
    else:  # tranquila
        beat, prog = 60 / 84, [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
        for i in range(int(dur / beat) + 1):
            t, acorde = i * beat, prog[(i // 4) % 4]
            if i % 4 == 0:
                poner(buf, pad([m - 12 for m in acorde], 4 * beat + .8, 1100), t, .26)
                poner(buf, bajo(acorde[0] - 24, beat * 1.5), t, .18)
            for k in (0, .5): poner(buf, pluck(acorde[(i * 2 + int(k * 2)) % 3] + 12, .7), t + k * beat, .11)
            if i % 4 == 2: poner(buf, kick(), t, .12)
    return buf


# ── La voz manda ──
def envolvente(voz, ataque=.04, suelta=.45, umbral_db=-38):
    paso = int(.01 * SR); n = len(voz) // paso
    rms = np.sqrt(np.mean(voz[:n * paso].reshape(n, paso) ** 2, axis=1) + 1e-12)
    ref = np.percentile(rms[rms > 1e-6], 95)
    activo = (20 * np.log10(rms / ref) > umbral_db).astype(float)
    sube, baja = 1 - np.exp(-.01 / ataque), 1 - np.exp(-.01 / suelta)
    e, acc = np.empty(n), 0.0
    for i, x in enumerate(activo):
        acc += (x - acc) * (sube if x > acc else baja); e[i] = acc
    return np.interp(np.arange(len(voz)) / paso, np.arange(n), e)


def comprimir_voz(voz):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af",
                          "highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=120:makeup=2", "-f", "f64le", "-"],
                         input=voz.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float64).copy()[:len(voz)]


def rms_db(x, m=None):
    x = x[m] if m is not None else x
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--proyecto", "--projeto", dest="proyecto", default=".")
    ap.add_argument("--id", required=True)
    ap.add_argument("--musica", default="energica", choices=["energica", "tranquila", "ninguna"])
    ap.add_argument("--pista", help="pista de música propia (con licencia) en vez de la sintetizada")
    ap.add_argument("--duracion", "--duracao", dest="duracion", type=float, help="solo sin voz: duración del vídeo en segundos")
    ap.add_argument("--bajo-voz", type=float, default=24, help="dB que queda la música bajo la voz al hablar")
    ap.add_argument("--agache", type=float, default=10, help="dB que sube la música en los huecos de la voz")
    ap.add_argument("--lufs", type=float, default=-14)
    a = ap.parse_args()
    P = pathlib.Path(a.proyecto).resolve()
    dvoz = P / "voz" / a.id
    tiempos = json.loads((dvoz / "tiempos.json").read_text()) if (dvoz / "tiempos.json").exists() else None
    voz = comprimir_voz(leer(dvoz / "voz.wav")) if (dvoz / "voz.wav").exists() else None
    cola = 1.2
    if voz is not None:
        voz = np.concatenate([voz, np.zeros(int(cola * SR))]); dur = len(voz) / SR
    elif a.duracion:
        dur = a.duracion
    else:
        sys.exit("Sin voz hace falta --duracion.")
    n = len(voz) if voz is not None else int(round(dur * SR))  # len(voz): int(dur*SR) pode perder 1 amostra
    mus = leer(a.pista)[:n] if a.pista else musica(a.musica, dur)
    mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    sfx = np.zeros(n)
    fe = P / "audio" / a.id / "eventos.json"
    for ev in (json.loads(fe.read_text()) if fe.exists() else []):
        x = EFECTOS[ev["tipo"]](ev["nota"]) if ev["tipo"] == "ding" and "nota" in ev else EFECTOS[ev["tipo"]]()
        poner(sfx, x, cuando(ev["t"], tiempos), ev.get("g", 1.0))
    fi, fo = int(.25 * SR), int(1.0 * SR)
    if voz is not None:
        e = envolvente(voz); habla = e > .5
        mus = mus * 10 ** ((rms_db(voz, habla) - (a.bajo_voz - a.agache) - rms_db(mus)) / 20) * 10 ** (-a.agache * e / 20)
        sfx = sfx / (np.max(np.abs(sfx)) + 1e-9) * np.max(np.abs(voz)) * .33
        mus[:fi] *= np.linspace(0, 1, fi); mus[-fo:] *= np.linspace(1, 0, fo)
        mezcla = voz + mus + sfx
        print(f"{a.id}: música {rms_db(voz, habla) - rms_db(mus, habla):.1f} dB bajo la voz al hablar")
    else:
        mus = mus / (np.max(np.abs(mus)) + 1e-9) * .7
        mus[:fi] *= np.linspace(0, 1, fi); mus[-fo:] *= np.linspace(1, 0, fo)
        sfx = sfx / (np.max(np.abs(sfx)) + 1e-9) * .6
        mezcla = mus + sfx
    out = P / "audio" / a.id
    out.mkdir(parents=True, exist_ok=True)
    crudo = out / "mezcla-cruda.wav"
    escribir(crudo, mezcla, 2)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(crudo), "-af", f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11",
                    "-ar", str(SR), str(out / "mezcla.wav")], check=True)
    crudo.unlink()
    print(f"{a.id}: {dur:.2f} s → {out / 'mezcla.wav'}")


if __name__ == "__main__":
    main()
