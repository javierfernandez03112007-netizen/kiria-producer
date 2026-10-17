"""Alineación voz ↔ guion sin Whisper: detección de silencios por RMS + programación dinámica.

Cada línea del guion es una frase. Se buscan los silencios del audio y se eligen los que mejor
separan las frases según su longitud (caracteres sin espacios), premiando las pausas largas.

Uso:  python -m engine.audio voz.mp3 guion.txt [salida.json]
"""
import json
import subprocess
import sys

import numpy as np

SR = 16000


def load(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def silences(x, sr=SR, rel_db=38, min_dur=0.12, hop_s=0.01):
    """Silencios internos (inicio, fin) en segundos, y extremos de la voz."""
    hop = int(sr * hop_s)
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    sil = db < db.max() - rel_db
    gaps, i = [], 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * hop_s >= min_dur and i > 0 and j < n:
                gaps.append((i * hop_s, j * hop_s))
            i = j
        else:
            i += 1
    start = float(np.argmax(~sil)) * hop_s
    end = (n - float(np.argmax(~sil[::-1]))) * hop_s
    return gaps, start, end


def align(lines, gaps, start, end, pause_bonus=3.0):
    """Devuelve [(ini, fin)] por línea eligiendo len(lines)-1 silencios como cortes."""
    w = np.array([len(l.replace(" ", "")) for l in lines], float)
    K, G = len(lines), len(gaps)
    pts = [start] + [(a + b) / 2 for a, b in gaps] + [end]
    glen = [0.0] + [b - a for a, b in gaps] + [0.0]
    cum = np.concatenate([[0.0], np.cumsum(glen[1:-1])])  # pausa acumulada hasta el punto g

    def speech(p, g):
        inner = cum[g - 1] - cum[p] if g - 1 > p else 0.0
        return pts[g] - pts[p] - inner - glen[p] / 2 - glen[g] / 2

    rate = (end - start - sum(glen)) / w.sum()
    INF = 1e18
    dp = np.full((K + 1, G + 2), INF)
    bk = np.zeros((K + 1, G + 2), int)
    dp[0][0] = 0
    for k in range(1, K + 1):
        for g in range(1, G + 2):
            if k == K and g != G + 1:
                continue
            for p in range(g):
                if dp[k - 1][p] >= INF:
                    continue
                e = w[k - 1] * rate
                c = dp[k - 1][p] + ((speech(p, g) - e) / e) ** 2 - (pause_bonus * glen[g] if g <= G else 0)
                if c < dp[k][g]:
                    dp[k][g], bk[k][g] = c, p
    ends, g = [], G + 1
    for k in range(K, 0, -1):
        ends.append(g)
        g = bk[k][g]
    ends = ends[::-1]
    out, prev = [], 0
    for e in ends:
        s = start if prev == 0 else gaps[prev - 1][1]
        t = end if e == G + 1 else gaps[e - 1][0]
        inner = [gaps[q - 1] for q in range(prev + 1, e)]
        out.append(dict(start=round(s, 2), end=round(t, 2), pauses=[(round(a, 2), round(b, 2)) for a, b in inner]))
        prev = e
    return out


def main(audio, script, out_json=None):
    lines = [l.strip() for l in open(script, encoding="utf-8") if l.strip()]
    x = load(audio)
    gaps, st, en = silences(x)
    res = align(lines, gaps, st, en)
    print(f"voz {st:.2f}–{en:.2f} s · {len(gaps)} silencios · duración archivo {duration(audio):.2f} s")
    for i, (l, r) in enumerate(zip(lines, res), 1):
        nxt = res[i]["start"] - r["end"] if i < len(res) else 0
        pz = " ".join(f"{a:.2f}-{b:.2f}" for a, b in r["pauses"])
        print(f"{i:2d} {r['start']:6.2f}–{r['end']:6.2f} ({r['end'] - r['start']:4.2f}s) "
              f"pausa→{nxt:4.2f}s  internas[{pz}]  {l[:58]}")
    if out_json:
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump([dict(text=l, **r) for l, r in zip(lines, res)], f, ensure_ascii=False, indent=1)
    return res


if __name__ == "__main__":
    main(*sys.argv[1:])
