"""Tiempos PROVISIONALES (sin voz) para ir haciendo la escena mientras Javi graba: reparte cada frase de script.txt por
sílabas (≈ 6,3 sílabas/s; las frases de venta, las de "realce", a ≈ 5) con pausas en «…», «:» y «,» y entre frases.
Escribe tiempos.json con el mismo formato que ajustar_voz.py (que lo sustituye cuando llega la voz de verdad).

    python3 bomberados/plantillas/pregunta/tiempos_prov.py projects/<p> [--sps 6.3]
"""
import json
import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
ROOT = os.path.join(REPO, sys.argv[1])
SPS = float(sys.argv[sys.argv.index("--sps") + 1]) if "--sps" in sys.argv else 6.3
CFG = os.path.join(ROOT, "video.json")
Q = json.load(open(CFG if os.path.exists(CFG) else os.path.join(ROOT, "pregunta.json")))
V = Q.get("voz", {})


def syl(w):
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())) + len(re.findall(r"\d", w)))


lines = [l.strip() for l in open(os.path.join(ROOT, "script.txt"), encoding="utf-8") if l.strip()]
venta = {Q["cues"][k][2] - 1 for k in Q.get("realce", []) if k in Q.get("cues", {})}
pause = {int(k): v for k, v in V.get("pause", {}).items()}
out, t = [], 0.0
for i, l in enumerate(lines):
    sps = 5.0 if i in venta else SPS
    ws, t0 = [], t
    for w in l.split():
        d = syl(w) / sps + 0.04
        ws.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
        if w.endswith("…"):
            t += 0.3
        elif w[-1] in ":;":
            t += 0.18
        elif w[-1] in ",.?!":
            t += 0.1
    out.append({"text": l, "start": round(t0, 3), "end": ws[-1]["end"], "words": ws})
    t = ws[-1]["end"] + pause.get(i, V.get("pause_def", 0.24))
    if V.get("count") and i == V.get("count_line", -1):
        t += V["count"]
    t += float(V.get("counts", {}).get(str(i), 0))
json.dump(out, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=1)
print(f"tiempos provisionales → {os.path.join(ROOT, 'tiempos.json')} ({out[-1]['end']:.2f} s)")
