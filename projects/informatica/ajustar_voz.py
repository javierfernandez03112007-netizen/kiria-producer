"""Ajusta la voz: acorta pausas entre frases y silencios internos y, si TARGET tiene valor, acelera (atempo).
Uso: python3 ajustar_voz.py   (assets/voz_original.mp3 + tiempos_original.json → assets/voz.mp3)"""
import json
import re
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.audio import silences  # noqa: E402

SR = 44100
TARGET = None          # duración de la voz final (s); None = velocidad natural (la v1 usaba 59,4 s)
PAUSE = {3: 0.42, 5: 0.4, 15: 0.45, 16: 0.4, 18: 0.4}  # pausa tras la frase i
PAUSE_DEF = 0.3
INNER_MAX = 0.2       # silencios internos (comas) como máximo


def syl(w):
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())))


def word_times(lines, gaps):
    """Reparte las palabras de cada frase por el tiempo de habla (sin silencios), en proporción a sus
    sílabas, y encaja los cortes de puntuación en los silencios internos."""
    res = []
    for ln in lines:
        a0, a1 = ln["start"], ln["end"]
        inner = [(a, b) for a, b in gaps if a > a0 + 0.05 and b < a1 - 0.05]
        ws = ln["text"].split()
        wt = np.array([syl(w) + 0.3 for w in ws], float)
        segs, t = [], a0          # tramos de habla
        for a, b in inner:
            segs.append((t, a)); t = b
        segs.append((t, a1))
        lens = np.array([b - a for a, b in segs])
        # cortes de puntuación → silencios: asigna grupos de palabras a tramos por DP sencillo
        brk = [i + 1 for i, w in enumerate(ws[:-1]) if re.search(r"[,:;.?!]$", w)]
        K = len(segs)
        groups = None
        if K > 1:
            from itertools import combinations
            best = None
            tot = wt.sum()
            for comb in combinations(range(1, len(ws)), K - 1):
                idx = [0, *comb, len(ws)]
                share = np.array([wt[idx[k]:idx[k + 1]].sum() / tot for k in range(K)])
                c = ((share - lens / lens.sum()) ** 2).sum() + 0.004 * sum(i not in brk for i in comb)
                if best is None or c < best[0]:
                    best = (c, idx)
            groups = best[1]
        if groups is None:          # sin encaje: reparto continuo por tiempo de habla
            cum = np.concatenate([[0], np.cumsum(lens)]) / lens.sum()
            cw = np.concatenate([[0], np.cumsum(wt)]) / wt.sum()

            def at(f):
                k = min(np.searchsorted(cum, f, "right") - 1, K - 1)
                return segs[k][0] + (f - cum[k]) * lens.sum()
            res.append([(w, at(cw[i]), at(cw[i + 1])) for i, w in enumerate(ws)])
            continue
        out = []
        for k in range(K):
            g = ws[groups[k]:groups[k + 1]]
            gw = wt[groups[k]:groups[k + 1]]
            c = np.concatenate([[0], np.cumsum(gw)]) / gw.sum()
            a, b = segs[k]
            out += [(w, a + c[i] * (b - a), a + c[i + 1] * (b - a)) for i, w in enumerate(g)]
        res.append(out)
    return res


def main():
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz_original.mp3"), "-ac", "1",
                          "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    lines = json.load(open(os.path.join(ROOT, "tiempos_original.json")))
    gaps, _, _ = silences(x, SR)
    # cortes: (ini, fin, duración deseada)
    cuts = []
    for a, b in gaps:
        ln = next((i for i, l in enumerate(lines[:-1], 1) if l["end"] <= (a + b) / 2 <= lines[i]["start"]), None)
        want = PAUSE.get(ln, PAUSE_DEF) if ln else INNER_MAX
        if b - a > want:
            cuts.append((a, b, want))
    parts, pos = [], 0
    s0 = max(0, int(lines[0]["start"] * SR) - int(0.05 * SR))
    s1 = int(lines[-1]["end"] * SR)
    pos = s0
    kp = [(s0 / SR, 0.0)]          # mapa de tiempos original → nuevo (antes del atempo)
    for a, b, want in cuts:
        m = (a + b) / 2
        e = int((m - want / 2) * SR)
        parts.append(x[pos:e])
        nt = sum(len(p) for p in parts) / SR
        kp += [(e / SR, nt)]
        pos = int((m + want / 2) * SR)
        kp += [(pos / SR, nt)]
    parts.append(x[pos:s1 + int(0.25 * SR)])
    y = np.concatenate(parts)
    kp += [((s1 + int(0.25 * SR)) / SR, len(y) / SR)]
    tempo = len(y) / SR / TARGET if TARGET else 1.0
    ko, kn = np.array(kp).T

    def remap(t):
        return float(np.interp(t, ko, kn)) / tempo

    words = word_times(lines, gaps)
    out = []
    for ln, ws in zip(lines, words):
        out.append(dict(text=ln["text"], start=remap(ln["start"]), end=remap(ln["end"]),
                        words=[dict(w=w, start=remap(a), end=remap(b)) for w, a, b in ws]))
    json.dump(out, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=1)
    print(f"tras recortes {len(y) / SR:.2f}s → atempo {tempo:.3f}")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    *(["-af", f"atempo={tempo:.4f}"] if tempo != 1.0 else []), "-c:a", "libmp3lame", "-b:a", "192k",
                    os.path.join(ROOT, "assets", "voz.mp3")], input=y.tobytes(), check=True)


if __name__ == "__main__":
    main()
