"""Mide una toma de voz frase a frase y comprueba la regla de Javi: los momentos de venta («¡Bomberados!», «¡Pruébala
gratis!» y «compártelo con tu compañero de oposición») tienen que ser lo más destacado del vídeo: más volumen y energía que
el resto, gancho incluido.

    python3 bomberados/plantillas/pregunta/medir_voz.py projects/<p> [--toma <dir con voz_original.mp3 y asr_original.json>]

Las frases de venta son las que contienen los cues de pregunta.json → "realce" (por defecto: compartir, marca, prueba).
Si la regla no se cumple, repetir la toma (más ímpetu en esas frases: [excited], [emphatic], mayúsculas en la palabra
clave) o generarlas aparte; después, "realce" en pregunta.json también las sube en la mezcla (compose.py)."""
import json
import os
import subprocess
import sys

import numpy as np

proj = sys.argv[1]
toma = sys.argv[sys.argv.index("--toma") + 1] if "--toma" in sys.argv else None
mp3 = os.path.join(toma, "voz_original.mp3") if toma else os.path.join(proj, "assets", "voz_original.mp3")
words = json.load(open(os.path.join(toma, "asr_original.json") if toma else os.path.join(proj, "asr_original.json")))
lines = [l.strip() for l in open(os.path.join(proj, "script.txt"), encoding="utf-8") if l.strip()]
cfg = json.load(open(os.path.join(proj, "pregunta.json") if os.path.exists(os.path.join(proj, "pregunta.json")) else os.path.join(proj, "video.json")))
venta = {}                                  # frase → palabra desde la que se mide (la del cue)
for c in cfg.get("realce", ["compartir", "marca", "prueba"]):
    if c in cfg["cues"]:
        w, k, L = cfg["cues"][c]
        venta[L] = min(venta.get(L, (w, k)), (w, k), key=lambda wk: 0)
norm = lambda w: "".join(ch for ch in w.lower() if ch.isalnum())  # noqa: E731

sr = 16000
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", mp3, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                 capture_output=True, check=True).stdout, np.float32)


def f0(seg):                               # tono por autocorrelación, cada 10 ms
    out = []
    for i in range(0, len(seg) - 640, 160):
        fr = seg[i:i + 640] * np.hanning(640)
        if np.sqrt(np.mean(fr ** 2)) < 0.01:
            continue
        ac = np.correlate(fr, fr, "full")[639:]
        k = sr // 350 + np.argmax(ac[sr // 350:sr // 70])
        if ac[k] > 0.35 * ac[0]:
            out.append(sr / k)
    return np.array(out)


rows, i = [], 0
for L, line in enumerate(lines, 1):
    n = len(line.split())
    ws = words[i:i + n]
    i += n
    t0, t1 = ws[0]["start"], ws[-1]["end"]
    if L in venta:                          # en la frase de venta se mide desde la palabra del cue (p. ej. «mándaselo»)
        w, k = venta[L]
        hits = [x_ for x_ in ws if norm(x_["w"]) == norm(w)]
        if len(hits) >= k:
            t0 = hits[k - 1]["start"]
    seg = x[int(t0 * sr):int(t1 * sr)]
    loud = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    p = f0(seg)
    st = 12 * np.log2(p / np.median(p)) if len(p) > 5 else np.zeros(1)
    syl = sum(c in "aeiouáéíóú" for w_ in ws if w_["start"] >= t0 - 0.01 for c in w_["w"].lower())
    rows.append((L, t0, t1, syl / max(0.1, t1 - t0), np.median(p) if len(p) else 0, np.std(st), loud, line))
    print(f"{'★' if L in venta else ' '} F{L} {t0:5.2f}-{t1:5.2f}  {syl / max(0.1, t1 - t0):4.1f} síl/s  tono {np.median(p) if len(p) else 0:4.0f} Hz"
          f"  variación {np.std(st):3.1f} st  volumen {loud:5.1f} dB | {line[:50]}")
v = [r for r in rows if r[0] in venta]
resto = [r for r in rows if r[0] not in venta]
if v and resto:
    peor_v, mejor_r = min(r[6] for r in v), max(r[6] for r in resto)
    ok = peor_v >= mejor_r - 0.5
    print(("OK" if ok else "OJO") + f": la frase de venta más floja suena a {peor_v:.1f} dB y la más fuerte del resto a {mejor_r:.1f} dB"
          + ("" if ok else " → repetir la toma con más ímpetu en las frases ★ (o generarlas aparte)"))
