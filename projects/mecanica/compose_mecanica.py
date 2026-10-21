"""Compone «Ingeniería Mecánica desde dentro»: fotogramas 3D (out/frames) + subtítulos palabra a palabra
(palabra clave en coral) + titulares que vibran en los mensajes importantes + cápsula «¿Merece la pena?» que
espera en una esquina hasta el final + marca + voz.

    python3 ajustar_voz.py
    node web/capture.mjs out/frames --range 0 <N> <w> 4     (4 procesos en paralelo)
    python3 projects/informatica/compose_informatica.py [--test t1 t2 ...]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, prog, eo, eio, eback, lerp, rrect, font, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 30, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
ORANGE, CORAL = "#FF5A1F", "#FF6B5E"
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, exact=False):
    c = 0
    for w in WORDS:
        if (w["n"] == norm(word)) if exact else w["n"].startswith(norm(word)):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


KEY = {1: ["diez"], 2: ["año"], 3: ["pena"], 4: ["motores"], 5: ["desmontado"], 6: ["matemáticas"], 7: ["derivadas", "integrales"],
       8: ["matrices"], 9: ["cae"], 10: ["oxida"], 11: ["cad"], 12: ["aproxima"], 13: ["informática"], 14: ["engranaje"],
       15: ["mueve"], 16: ["pena"], 17: ["no"], 18: ["muchísimo"], 19: ["empezarías"]}
# titulares que vibran: (inicio, fin, [(texto, color)…])
HEAD = [
    (at("diez") + 0.05, at("el", exact=True) - 0.1, [("3", ORANGE), (" de cada 10", "#FFFFFF")]),
    (at("año"), at("y", 2, exact=True) - 0.05, [("en un solo ", "#FFFFFF"), ("año", ORANGE)]),
    (at("motores"), at("te", 2, exact=True) - 0.05, [("No", ORANGE), (" va solo de motores", "#FFFFFF")]),
    (at("merece", 2), at("si", 2, exact=True) - 0.05, [("¿Merece la ", "#FFFFFF"), ("pena?", CORAL)]),
    (at("muchísimo"), at("tú", exact=True) - 0.05, [("Muchísimo.", ORANGE)]),
    (at("tú", exact=True), END - 0.4, [("¿Tú la ", "#FFFFFF"), ("empezarías?", CORAL)]),
]
PILL = (at("pena", 1) + 0.2, at("merece", 2))   # la pregunta espera en una esquina hasta que se responde
SUBS = None


def headline(img, t, t0, t1, parts, y=1340, size=118):
    a = eo(prog(t, t0, 0.18)) * (1 - prog(t, t1 - 0.2, 0.2))
    if a < 0.01:
        return
    sprites = [text(s, size, "black", c, shadow=0.75) for s, c in parts]
    widths = [sp[1].shape[1] - int(size * 0.7) for sp in sprites]
    total = sum(widths)
    # vibración: sacudida corta y fuerte al aparecer (como el móvil de la referencia)
    v = max(0.0, 1 - (t - t0) / 0.5)
    jx, jy = 9 * v * np.sin((t - t0) * 95), 5 * v * np.cos((t - t0) * 120)
    s = 0.88 + 0.12 * eback(prog(t, t0, 0.25))
    s *= min(1.0, (W - 100) / total)          # que nunca se salga de la pantalla
    x = W / 2 - total * s / 2 + jx
    for sp, wdt in zip(sprites, widths):
        paste(img, sp, x + wdt * s / 2, y + jy, a, scale=s)
        x += wdt * s
    if v > 0.02:   # ondas de vibración a los lados
        for k in range(3):
            r = int(40 + k * 26 + 20 * (1 - v))
            for side in (-1, 1):
                cx = int(W / 2 + side * (total * s / 2 + 30))
                cv2.ellipse(img, (cx, int(y)), (r // 2, r), 0, -60 if side > 0 else 120, 60 if side > 0 else 240,
                            tuple(c * 0.9 * v * a for c in (1, 1, 1)), 4, cv2.LINE_AA)


def pill(img, t):
    t0, t1 = PILL
    if t < t0 or t > t1 + 0.5:
        return
    k = eio(prog(t, t1 - 0.15, 0.5))            # al final vuelve al centro y se abre
    a = eo(prog(t, t0, 0.3)) * (1 - prog(t, t1 + 0.2, 0.3))
    txt = text("¿Merece la pena?  ·  al final", 38, "semi", "#FFFFFF", shadow=0)
    w = txt[1].shape[1] + 40
    x = lerp(W - 40 - w, W / 2 - w / 2, k)
    y = lerp(470, 1260, k)
    bob = 4 * np.sin(t * 3)
    rrect(img, x, y + bob, w, 76, 38, hex_bgr("#1A1C20"), 0.88 * a)
    rrect(img, x + 16, y + bob + 27, 22, 22, 11, hex_bgr(CORAL), a)
    paste(img, txt, x + w / 2 + 16, y + bob + 38, a)


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    for t0, t1, parts in HEAD:
        headline(img, t, t0, t1, parts)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=250, size=84, style="accent", accent=hex_bgr(CORAL))


def main(dst=os.path.join(ROOT, "out", "mecanica.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-filter_complex", "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,apad[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
        for buf in pool.imap(compose, range(N), chunksize=8):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        init()
        os.makedirs(os.path.join(ROOT, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[2:]]:
            fr = np.frombuffer(compose(int(round(t * FPS))), np.uint8).reshape(H, W, 3)
            cv2.imwrite(os.path.join(ROOT, "out", "ctest", f"c{t:05.2f}.jpg"), fr)
    else:
        main()
