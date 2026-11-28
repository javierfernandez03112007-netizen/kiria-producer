"""Tiempos PROVISIONALES (sin la voz de Javi): ritmo de ≈ 6,3 sílabas por segundo y pausas de 0,45 s entre frases.
Sirve para construir la escena y la cámara mientras llega el MP3; luego se sustituye con ajustar_voz.py (tiempos reales)."""
import json, os, re
ROOT = os.path.dirname(os.path.abspath(__file__))
SPOKEN = {"psoe.": "pe so e", "psoe": "pe so e", "psoe:": "pe so e", "pib": "pib", "irpf": "i e rre pe e fe", "vox:": "vox", "pp.": "pe pe", "pp": "pe pe", "ipc.": "i pe ce", "ipc": "i pe ce"}
def syl(w):
    w = SPOKEN.get(w.lower().strip(".,:;…¿?"), w)
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())))
lines = [l.strip() for l in open(os.path.join(ROOT, "script.txt"), encoding="utf-8") if l.strip()]
t, out = 0.0, []
for li, l in enumerate(lines):
    ws, t0 = [], t
    for w in l.split():
        d = syl(w) / 6.3 + 0.03
        ws.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)}); t += d
        if w.endswith("…"): t += 0.35
        elif w.endswith((",", ":")): t += 0.15
    out.append({"text": l, "start": round(t0, 3), "end": round(ws[-1]["end"], 3), "words": ws}); t += 0.45
json.dump(out, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=0)
N = int((out[-1]["end"] + 1.2) * 100)
json.dump([0.0] * N, open(os.path.join(ROOT, "voz_env.json"), "w"))
print("líneas", len(out), "fin", out[-1]["end"], "s")
for o in out: print(f'{o["start"]:6.2f}–{o["end"]:6.2f}  {o["text"][:70]}')
