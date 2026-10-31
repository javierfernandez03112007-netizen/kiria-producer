"""Ajusta la voz de una Pregunta del día con los tiempos REALES de cada palabra (asr_original.json, de asr.py):
acorta pausas, mete el silencio de la cuenta atrás, acelera un poco (atempo) y escribe tiempos.json.
Uso: python3 bomberados/plantillas/pregunta/ajustar_voz.py projects/<p>
(assets/voz_original.mp3 + asr_original.json + script.txt → assets/voz.mp3 + tiempos.json)
Parámetros en pregunta.json (o video.json) → "voz": tempo, count_line (frase tras la que va la cuenta atrás, desde 0), count (s; 0 = sin cuenta atrás),
pause ({nº de frase: pausa tras ella}), pause_def."""
import difflib
import json
import os
import re
import subprocess
import sys
import unicodedata

import numpy as np

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, REPO)
ROOT = os.path.join(REPO, sys.argv[1])
CFG = os.path.join(ROOT, "video.json")          # otros formatos (promos…) guardan su configuración en video.json
V = json.load(open(CFG if os.path.exists(CFG) else os.path.join(ROOT, "pregunta.json"))).get("voz", {})
from engine.audio import silences  # noqa: E402

SR = 44100
TEMPO = V.get("tempo", 1.03)
COUNT = V.get("count", 4.2)            # silencio de la cuenta atrás (lo llenan el tic-tac y los números)
COUNT_LINE = V.get("count_line", 2)    # frase tras la que va la cuenta atrás
PAUSE = {int(k): v for k, v in V.get("pause", {}).items()}   # pausa tras la frase i (antes del atempo)
PAUSE_DEF = V.get("pause_def", 0.24)
INNER_MAX = 0.17      # silencios internos (comas, puntos dentro de la frase) como máximo
INNER_LONG = 0.3      # … y el «¿Verdadero o falso?» del gancho: pausa dramática dentro de la frase


NUM = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte".split()


def nrm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))
    return NUM[int(w)] if w.isdigit() and int(w) < len(NUM) else w     # el reconocedor escribe «5» donde el guion dice «cinco»


def syl(w):
    return max(1, len(re.findall(r"[aeiouáéíóúü]+", w.lower())) + len(re.findall(r"\d", w)))


def main():
    lines = [l.strip() for l in open(os.path.join(ROOT, "script.txt"), encoding="utf-8") if l.strip()]
    asr = json.load(open(os.path.join(ROOT, "asr_original.json")))
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz_original.mp3"), "-ac", "1",
                          "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    gaps, sp0, sp1 = silences(x, SR)
    # palabras del guion ↔ palabras reconocidas (las que no casan se reparten por sílabas entre sus vecinas)
    sw = [(li, w) for li, l in enumerate(lines) for w in l.split()]
    A, B = [nrm(w) for _, w in sw], [nrm(a["w"]) for a in asr]
    st = [None] * len(sw)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                st[i1 + k] = asr[j1 + k]["start"]
        elif tag == "replace" and i2 - i1 >= 1:
            t0, t1 = asr[j1]["start"], (asr[j2]["start"] if j2 < len(asr) else asr[j2 - 1]["end"])
            ws = np.array([syl(sw[i][1]) for i in range(i1, i2)], float)
            c = np.concatenate([[0], np.cumsum(ws)]) / ws.sum()
            for k in range(i2 - i1):
                st[i1 + k] = t0 + c[k] * (t1 - t0) * 0.9
            print("  repartidas:", " ".join(sw[i][1] for i in range(i1, i2)), "≈", " ".join(asr[j]["w"] for j in range(j1, j2)))
    for i in range(len(st)):          # huecos sueltos (palabras que el reconocedor no oyó): entre sus vecinas
        if st[i] is None:
            a = next(st[k] for k in range(i - 1, -1, -1) if st[k] is not None)
            b = next((st[k] for k in range(i + 1, len(st)) if st[k] is not None), a + 0.3)
            st[i] = a + 0.5 * (b - a)
            print("  sin oír:", sw[i][1])

    # el reconocedor da tiempos de 80 ms: si una palabra «empieza» dentro de un silencio, empieza al acabar ese silencio
    for i in range(len(st)):
        g = next(((a, b) for a, b in gaps if a - 0.02 <= st[i] < b), None)
        if g:
            st[i] = g[1]

    # palabras que han quedado pegadas (mismo silencio): se reparten por sílabas hasta la siguiente
    i = 0
    while i < len(st) - 1:
        j = i
        while j + 1 < len(st) and st[j + 1] - st[i] < 0.07 * (j + 1 - i):
            j += 1
        if j > i:
            nxt = st[j + 1] if j + 1 < len(st) else st[j] + 0.25 * (j - i + 1)
            ws = np.array([syl(sw[k][1]) for k in range(i, j + 1)], float)
            c = np.concatenate([[0], np.cumsum(ws)]) / ws.sum()
            for k in range(i, j + 1):
                st[k] = st[i] + c[k - i] * (nxt - st[i]) * 0.9
        i = j + 1

    def speech_end(t):                # dónde acaba de verdad la voz después de t (inicio del siguiente silencio)
        g = next((a for a, b in gaps if a > t + 0.08), sp1)
        return g
    first = [next(i for i, (li, _) in enumerate(sw) if li == L) for L in range(len(lines))]
    last = [max(i for i, (li, _) in enumerate(sw) if li == L) for L in range(len(lines))]
    lstart = [st[first[L]] for L in range(len(lines))]
    lend = [min(speech_end(st[last[L]]), lstart[L + 1] if L + 1 < len(lines) else sp1) for L in range(len(lines))]
    # cortes: silencios más largos de lo deseado
    cuts = []
    for a, b in gaps:
        m = (a + b) / 2
        L = next((L for L in range(len(lines) - 1) if lend[L] - 0.06 <= m <= lstart[L + 1] + 0.06), None)
        want = PAUSE.get(L + 1, PAUSE_DEF) if L is not None else INNER_MAX
        if L is None:
            k = max((i for i in range(len(st)) if st[i] < a), default=None)
            if k is not None and sw[k][1].endswith("…"):
                want = INNER_LONG
        if b - a > want:
            cuts.append((a, b, want))
    s0 = max(0, int(lstart[0] * SR) - int(0.06 * SR))
    s1 = int(sp1 * SR)
    parts, pos, kp = [], s0, [(s0 / SR, 0.0)]
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
    # hueco de la cuenta atrás: después de la frase COUNT_LINE (con un punto de anclaje a cada lado del hueco, para que
    # la interpolación no reparta el desplazamiento entre las palabras de antes)
    tc = lend[COUNT_LINE] + 0.05
    ko, kn = np.array(kp).T
    nc = float(np.interp(tc, ko, kn))
    ic = int(nc * SR)
    y = np.concatenate([y[:ic], np.zeros(int(COUNT * TEMPO * SR), np.float32), y[ic:]])
    keep = ko < tc
    ko = np.concatenate([ko[keep], [tc, tc + 1e-6], ko[~keep]])
    kn = np.concatenate([kn[keep], [nc, nc + COUNT * TEMPO], kn[~keep] + COUNT * TEMPO])

    def remap(t):
        return float(np.interp(t, ko, kn)) / TEMPO

    out = []
    for L, l in enumerate(lines):
        idx = list(range(first[L], last[L] + 1))
        ws = []
        for n, i in enumerate(idx):
            e = st[idx[n + 1]] if n + 1 < len(idx) else lend[L]
            ws.append(dict(w=sw[i][1], start=round(remap(st[i]), 3), end=round(remap(e), 3)))
        out.append(dict(text=l, start=round(remap(lstart[L]), 3), end=round(remap(lend[L]), 3), words=ws))
    json.dump(out, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=1)
    print(f"voz original {sp1 - lstart[0]:.2f}s → sin pausas largas {len(y) / SR:.2f}s → atempo {TEMPO} → {len(y) / SR / TEMPO:.2f}s")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", f"atempo={TEMPO:.4f}", "-c:a", "libmp3lame", "-b:a", "192k",
                    os.path.join(ROOT, "assets", "voz.mp3")], input=y.tobytes(), check=True)


if __name__ == "__main__":
    main()
