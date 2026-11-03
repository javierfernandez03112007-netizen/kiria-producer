"""Compone «La cerradura por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que importa en dorado, el peligro en rojo, el cerrojo y la radiografía en celeste, la solución en verde)
+ la voz de Javi (su MP3, ElevenLabs, Danny) + efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/cerradura/compose_cer.py [--test t1 t2 ...] [--sfx]
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
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402


FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


def first(line):
    return LINES[line - 1]["words"][0]["start"] - 0.03


# ---------------------------------------------------------------- subtítulos
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, GR, TE, AM = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547"
_K = {1: {"portazo": R, "radiografía": BL, "abrirla": R},
      2: {"cerradura": GO, "evitarlo": GR},
      3: {"cilindro": GO, "pitones": WH, "muelles": BL},
      4: {"llave": WH, "bloquean": R, "giro": WH},
      5: {"diente": WH, "altura": GO, "justa": GO, "alinean": GO},
      6: {"gira": GO, "cerrojo": BL, "barra": WH, "acero": BL},
      7: {"resbalón": GO, "portazo": R},
      8: {"inclinada": GO, "débil": R},
      9: {"lámina": WH, "radiografía": BL, "rendija": WH, "mete": R},
      10: {"200": R, "robos": R, "día": GO},
      11: {"cerrojo": BL, "recto": BL, "mueve": GR},
      12: {"echa": GR, "llave": GR, "minuto": GO},
      13: {"portazo": R, "llave": GR, "nunca": R}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos: SOLO de ElevenLabs (assets/sfx, ver sfx_eleven.py), cada uno en el
# instante en que pasa la cosa y cortado cuando termina (con un fundido corto): no queda nada sonando de fondo.
_CACHE = {}


def sample(name, sr):                             # mono 48 kHz, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "sfx", name + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def times():                                       # los mismos cortes y giros que web/src/20_anim.js (buildTimes)
    r60 = lambda x: round(x * 60) / 60
    T = {"cut1": r60(at("dentro", 1, 2) + 0.1), "cut2": r60(at("pero") - 0.05), "cut3": r60(at("y", 1, 10) - 0.04),
         "cut4": r60(at("el", 1, 11) - 0.04), "cut5": r60(at("así") - 0.04)}
    T["l7in"] = at("resbalón", 1, 7) + 0.32; T["l7open"] = T["l7in"] + 0.12; T["l7rel"] = T["l7open"] + 0.55
    T["slam7"] = at("portazo", 1, 7); T["turn6"] = [at("gira"), at("gira") + 1.85]; T["turn12"] = [at("echa", 1, 12), at("minuto") + 0.12]
    T["unturn"] = [at("mándaselo") + 0.05, at("mándaselo") + 0.95]; T["endOpen"] = END - 1.7
    return T


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    def span(t0, t1):
        return max(0.15, t1 - t0)

    T = times()
    # 1: la puerta vuela y da el portazo (rayos X); la radiografía entra por la rendija y la abre
    put("puerta_vuela", 0.0, at("portazo") - 0.02, 0.45, 0.06)
    put("portazo", at("portazo") - 0.02, 1.0, 0.85, 0.35)
    put("lamina", at("radiografía", 1, 1) - 0.15, 0.6, 0.45, 0.2)
    put("rasca", at("radiografía", 1, 1) + 0.45, span(at("radiografía", 1, 1) + 0.45, at("abrirla") - 0.05), 0.5, 0.15)
    put("clic_abre", at("abrirla") - 0.08, 0.9, 0.6, 0.3)
    # 2: a la bocallave (negro) y dentro: el mecanismo; «cómo evitarlo»
    put("zambullida", at("vamos") - 0.05, 0.6, 0.5, 0.2)
    put("metal", T["cut1"] + 0.02, 1.2, 0.5, 0.4)
    put("blip", at("final") - 0.02, 0.4, 0.35)
    # 3: los pitones y los muelles
    put("pitones", at("fila") - 0.02, 0.8, 0.5, 0.2)
    put("muelles", at("muelles") - 0.03, 0.55, 0.5, 0.2)
    # 4: sin llave, bloquean el giro
    put("bloqueo", at("bloquean") - 0.05, 0.7, 0.6, 0.2)
    put("denegado", at("giro") - 0.02, 0.45, 0.4)
    # 5: entra la llave, los pitones suben y se alinean
    put("llave_entra", at("diente") - 0.15, span(at("diente") - 0.15, at("altura") + 0.05), 0.6, 0.2)
    put("alineado", at("alinean") - 0.03, 0.7, 0.55, 0.25)
    # 6: gira dos vueltas y saca el cerrojo
    put("giro_llave", T["turn6"][0] - 0.05, span(T["turn6"][0] - 0.05, T["turn6"][1] + 0.15), 0.65, 0.2)
    put("acero", at("barra") - 0.03, 0.6, 0.4, 0.25)
    # 7: corte a la planta; el resbalón; se abre y portazo
    put("whoosh", T["cut2"] - 0.2, 0.5, 0.3)
    put("resbalon", at("resbalón", 1, 7) - 0.02, 0.5, 0.5)
    put("abre_puerta", T["l7in"] - 0.05, span(T["l7in"] - 0.05, T["l7rel"] + 0.2), 0.5, 0.2)
    put("portazo2", T["slam7"] - 0.02, 0.9, 0.7, 0.3)
    # 8: la cara inclinada, el punto débil
    put("blip", at("inclinada") - 0.02, 0.4, 0.35)
    put("aviso", at("punto") - 0.03, 0.8, 0.5, 0.3)
    # 9: la lámina flexible (radiografía) entra y empuja el resbalón
    put("flex", at("flexible") - 0.1, span(at("flexible") - 0.1, at("como", 1, 9)), 0.5, 0.2)
    put("lamina", at("radiografía", 1, 9) - 0.05, 0.6, 0.45, 0.2)
    put("rasca_larga", at("entra") - 0.02, span(at("entra") - 0.02, at("mete") + 0.05), 0.55, 0.15)
    put("clic_abre", at("mete") - 0.02, 0.9, 0.6, 0.3)
    # 10: las 200 casas
    put("whoosh_largo", T["cut3"] - 0.15, 1.0, 0.35, 0.25)
    put("alarmas", at("200") - 0.05, span(at("200") - 0.05, T["cut4"] + 0.1), 0.4, 0.3)
    # 11: el cerrojo, recto; la lámina se dobla y no lo mueve
    put("whoosh", T["cut4"] - 0.15, 0.5, 0.3)
    put("clunk", at("cerrojo", 1, 11) - 0.02, 0.5, 0.55)
    put("choca", at("lámina", 1, 11) + 0.02, 0.9, 0.5, 0.25)
    put("denegado", at("mueve") - 0.02, 0.45, 0.4)
    # 12: echa la llave, dos vueltas
    put("whoosh", T["cut5"] - 0.15, 0.5, 0.3)
    put("dos_vueltas", T["turn12"][0] - 0.05, span(T["turn12"][0] - 0.05, T["turn12"][1] + 0.2), 0.7, 0.2)
    # 13: ¿portazo o llave?; se quita la llave, se abre la puerta y vuelve al principio (bucle)
    put("whoosh_largo", at("tú") - 0.2, 1.0, 0.3, 0.25)
    put("abre_llave", T["unturn"][0] - 0.03, span(T["unturn"][0] - 0.03, T["unturn"][1] + 0.1), 0.5, 0.2)
    put("puerta_abre", T["endOpen"] - 0.05, 0.9, 0.45, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "cerradura.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.8[s];[v][s]amix=inputs=2:duration=first:normalize=0,volume=1.6dB,alimiter=limit=0.89:level=false[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "7M", "-bufsize", "14M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(int(os.environ.get("PROCS", 4)), initializer=init) as pool:
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
    elif len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav"))
    else:
        main()
