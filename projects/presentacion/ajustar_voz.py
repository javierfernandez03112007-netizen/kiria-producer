"""Voz de la presentación: añade una entrada en silencio y alarga algunas pausas; calcula los tiempos de cada palabra
(tiempos.json), las marcas de la escena (tiempos_k.json) y el nivel de la voz por fotograma (env.json).
Uso: python3 ajustar_voz.py   (assets/voz_original.mp3 + tiempos_original.json)"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.audio import silences  # noqa: E402

spec = importlib.util.spec_from_file_location("av", os.path.join(ROOT, "..", "cobertura", "ajustar_voz.py"))
av = importlib.util.module_from_spec(spec); spec.loader.exec_module(av)   # reparto de palabras por sílabas

SR, FPS = 44100, 30
LEAD = 0.7                                    # la figura se abre antes de hablar
EXTRA = {1: 0.35, 3: 0.15, 4: 0.25, 5: 0.15, 6: 0.25, 7: 0.15}   # silencio extra tras la frase i
TAIL = 1.6                                    # final: botón «Seguir» y vuelta al encuadre inicial
# marca de la escena → (nº de frase, palabra)
MARKS = {"hola": (1, "Hola."), "soy": (1, "Soy"), "leo": (2, "leo"), "informes": (2, "informes,"), "datos": (2, "datos"),
         "noticias": (2, "noticias"), "bce": (2, "Central"), "bde": (2, "España,"), "ine": (2, "INE."), "busco": (3, "Busco"),
         "hipoteca": (3, "hipoteca,"), "ahorros": (3, "ahorros,"), "super": (3, "súper."), "explico": (4, "explico"),
         "minuto": (4, "minuto,"), "fuentes": (4, "fuentes."), "humo": (5, "humo,"), "rico": (5, "rico,"), "comprar": (5, "comprar."),
         "solo": (6, "Solo"), "pasando": (6, "pasando."), "interesa": (7, "interesa"), "tiempo": (7, "tiempo"),
         "quedate": (7, "quédate."), "sigueme": (8, "Sígueme."), "leopor": (8, "Yo")}


def main():
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz_original.mp3"), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    lines = json.load(open(os.path.join(ROOT, "tiempos_original.json")))
    gaps, _, _ = silences(x, SR)
    words = av.word_times(lines, gaps)
    # cortes en la mitad de cada pausa entre frases
    parts, pos, shift = [np.zeros(int(LEAD * SR), np.float32)], 0, []
    cuts = []
    for i, ln in enumerate(lines[:-1], 1):
        cut = (ln["end"] + lines[i]["start"]) / 2
        cuts.append((cut, EXTRA.get(i, 0.0)))
    acc = LEAD
    for cut, ex in cuts:
        parts.append(x[pos:int(cut * SR)]); pos = int(cut * SR)
        if ex:
            parts.append(np.zeros(int(ex * SR), np.float32))
        shift.append((cut, acc)); acc += ex
    parts.append(x[pos:])
    parts.append(np.zeros(int(TAIL * SR), np.float32))
    y = np.concatenate(parts)

    def remap(t):
        off = LEAD
        for c, a in shift:
            if t >= c:
                off = a + dict(cuts)[c]
        return t + off

    out = []
    for ln, ws in zip(lines, words):
        out.append(dict(text=ln["text"], start=remap(ln["start"]), end=remap(ln["end"]),
                        words=[dict(w=w, start=remap(a), end=remap(b)) for w, a, b in ws]))
    json.dump(out, open(os.path.join(ROOT, "tiempos.json"), "w"), ensure_ascii=False, indent=1)
    K = {}
    for k, (li, w) in MARKS.items():
        K[k] = next(d["start"] for d in out[li - 1]["words"] if d["w"] == w)
    end = len(y) / SR
    K["end"] = out[-1]["end"]
    json.dump(dict(K=K, END=end), open(os.path.join(ROOT, "tiempos_k.json"), "w"), indent=1)
    # nivel de la voz por fotograma
    hop = SR // FPS
    n = int(end * FPS)
    r = np.array([np.sqrt(np.mean(y[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(r + 1e-9)
    o = np.clip((db - (db.max() - 30)) / 22, 0, 1)
    o = np.convolve(o, [0.25, 0.5, 0.25], mode="same")
    json.dump([round(float(v), 3) for v in o], open(os.path.join(ROOT, "env.json"), "w"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame",
                    "-b:a", "192k", os.path.join(ROOT, "assets", "voz.mp3")], input=y.tobytes(), check=True)
    print(f"voz → {end:.2f} s · {n} fotogramas")
    print({k: round(v, 2) for k, v in K.items()})


if __name__ == "__main__":
    main()
