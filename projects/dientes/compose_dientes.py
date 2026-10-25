"""Compone «No te enjuagues»: fotogramas 3D a 60 fps (out/frames) + subtítulos palabra a palabra
(palabra clave en cian) + titulares que vibran en los mensajes importantes + voz + efectos de sonido suaves.

    python3 ajustar_voz.py
    FPS=60 node web/capture.mjs out/frames --range 0 <N> <w> 4     (4 procesos en paralelo)
    python3 projects/dientes/compose_dientes.py [--test t1 t2 ...]
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
from engine.fin_draw import text, paste, prog, eo, eback, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
CYAN = "#5FE6FF"
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, exact=False):
    c = 0
    for w in WORDS:
        if (w["n"] == norm(word)) if exact else w["n"].startswith(norm(word)):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


KEY = {1: ["estropeas"], 2: ["noche"], 3: ["flúor"], 4: ["trabajando"], 5: ["repara"], 6: ["resistente"], 7: ["reservas"], 8: ["frena"],
       9: ["enjuagas"], 10: ["protección"], 11: ["escupe", "enjuagues"], 12: ["colutorio"], 13: ["media", "hora"], 14: ["dormir"], 15: ["enjuagas"]}
# titulares que vibran: (inicio, fin, [(texto, color)…])
HEAD = [
    (at("escupe"), at("colutorio") - 0.05, [("Escupe, ", "#FFFFFF"), ("no te enjuagues", CYAN)]),
    (at("cuéntame"), END - 0.4, [("¿Tú te ", "#FFFFFF"), ("enjuagas", CYAN), ("?", "#FFFFFF")]),
]
SUBS = None


def headline(img, t, t0, t1, parts, y=1540, size=108):
    a = eo(prog(t, t0, 0.18)) * (1 - prog(t, t1 - 0.2, 0.2))
    if a < 0.01:
        return
    sprites = [text(s, size, "black", c, shadow=0.75) for s, c in parts]
    widths = [sp[1].shape[1] - int(size * 0.7) for sp in sprites]
    total = sum(widths)
    # vibración: sacudida corta y fuerte al aparecer
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


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    for t0, t1, parts in HEAD:
        headline(img, t, t0, t1, parts)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=250, size=84, style="accent", accent=hex_bgr(CYAN))


def sfx_track(path):
    """Efectos suaves: zumbido al meterse en el diente y en el esmalte y al salir, chapoteo del agua, destello y «pop»."""
    from engine import sfx
    out = np.zeros(int((END + 1) * sfx.SR))
    dive1, dive2, out3 = at("trabajando") + 0.62, at("caries") + 0.32, at("pero") - 0.05
    for t0 in (dive1, dive2, out3):
        sfx.mix(out, sfx.whoosh(0.7), t0 - 0.45, 0.9)
    sfx.mix(out, sfx.whoosh(1.1), at("agua") - 0.15, 1.1)
    sfx.mix(out, sfx.ding(1567.98, 1.2), at("perfecto") + 0.05, 0.8)
    sfx.mix(out, sfx.ding(2093.0, 0.8), at("perfecto") + 0.2, 0.5)
    for t0 in (at("sabes") - 0.05, at("comentarios") - 0.1):
        sfx.mix(out, sfx.clack(3), t0, 0.7)
    sfx.mix(out, sfx.ding(1318.5, 0.9), at("intenta"), 0.5)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "dientes.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    # 60 fps reales con el peso controlado (≈50 MB como mucho) para que se pueda descargar
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
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
