"""Coloca cada frase de la voz de Javi (assets/voz_original.mp3, todas seguidas) en su segundo del guion técnico (40 s):
corta por frases con los tiempos del reconocimiento (asr_original.json), las pone en AT y escribe assets/voz.mp3 y tiempos.json.
Uso: python3 build_voz.py"""
import difflib, json, os, re, subprocess, unicodedata
import numpy as np
ROOT = os.path.dirname(os.path.abspath(__file__)); SR = 44100; END = 40.0
AT = [4.7, 6.75, 10.0, 19.3, 26.2, 33.6]            # dónde empieza cada frase en el spot
def nrm(w):
    w = unicodedata.normalize("NFD", w.lower()); return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))
lines = [l.strip() for l in open(os.path.join(ROOT, "script.txt"), encoding="utf-8") if l.strip()]
asr = json.load(open(os.path.join(ROOT, "asr_original.json")))
sw = [(li, w) for li, l in enumerate(lines) for w in l.split()]
A, B = [nrm(w) for _, w in sw], [nrm(a["w"]) for a in asr]
st, en = [None] * len(sw), [None] * len(sw)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1): st[i1 + k], en[i1 + k] = asr[j1 + k]["start"], asr[j1 + k]["end"]
for i in range(len(sw)):                           # palabras que el reconocedor no separó: pegadas a la anterior
    if st[i] is None: st[i] = en[i] = (en[i - 1] if i else 0.0)
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz_original.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)
out = np.zeros(int(END * SR), np.float32); T = []
for li, l in enumerate(lines):
    idx = [i for i, (a, _) in enumerate(sw) if a == li]; t0, t1 = st[idx[0]], en[idx[-1]]
    a, b = max(0, int((t0 - 0.06) * SR)), min(len(x), int((t1 + 0.22) * SR)); seg = x[a:b].copy()
    f = int(0.02 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f * 4:] *= np.linspace(1, 0, f * 4)
    o = int((AT[li] - 0.06) * SR); out[o:o + len(seg)] += seg; sh = AT[li] - t0
    T.append({"start": round(t0 + sh, 3), "end": round(t1 + sh, 3), "text": l, "words": [{"w": sw[i][1], "start": round(st[i] + sh, 3), "end": round(en[i] + sh, 3)} for i in idx]})
subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "192k", os.path.join(ROOT, "assets", "voz.mp3")], input=out.tobytes(), check=True)
json.dump(T, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=1)
for l in T: print(f"{l['start']:6.2f}–{l['end']:5.2f}  {l['text']}")
