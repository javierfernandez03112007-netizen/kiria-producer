"""Compone «Economía por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que llega en dorado, el bulo y los suspensos en rojo) + la voz de Javi (ElevenLabs, Danny) + efectos SOLO de ElevenLabs, uno por
suceso y cortados cuando el suceso termina (sin ambiente ni sonidos sintetizados).

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/economia/compose_eco.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"58": GO, "96": R, "100": R, "profesionales": WH, "peor": R},
      2: {"sirve": WH, "economía": GO, "final": WH},
      3: {"rico": GO, "realidad": WH, "nadie": R, "consigue": WH},
      4: {"microeconomía": GO, "alquiler": WH},
      5: {"macroeconomía": GO, "inflación": WH, "paro": WH, "crisis": R},
      6: {"matemáticas": GO, "estadística": GO, "esperas": WH},
      7: {"econometría": GO, "datos": WH, "funciona": WH},
      8: {"finanzas": GO, "vale": WH, "empresa": WH},
      9: {"2013": GO, "nobel": GO, "contrario": R},
      10: {"precio": WH, "todo": GO, "burbujas": R},
      11: {"razón": WH, "primero": GO, "comisiones": R, "nunca": R},
      12: {"copian": GO, "menos": GO, "delante": GO, "todos": WH},
      13: {"economía": GO, "humo": R},
      14: {"financiero": WH, "gestor": WH, "indexado": GO}}
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

    # 1: la bolsa sube (+58 %); 96 de cada 100 resbalan montaña abajo y se amontonan
    put("subida", at("subió"), span(at("subió"), at("58") + 0.55), 0.6, 0.2)
    put("impacto", at("96"), 0.6, 0.55, 0.2)
    put("resbalan", at("96") + 0.1, 1.6, 0.7, 0.25)
    put("monton", at("96") + 1.25, 0.6, 0.5, 0.15)
    put("whoosh", at("profesionales") - 0.1, 0.55, 0.25)
    # 2: al panel: la «?»
    put("whoosh_largo", at("entonces"), 0.8, 0.3, 0.2)
    put("panel", at("para", 1, 2), 0.5, 0.55)
    # 3: monedas: el montón («rico»), el embudo («casi nadie») y la única que sale («consigue»)
    put("whoosh", at("crees") - 0.1, 0.6, 0.3)
    put("monedas_caen", at("rico") - 0.15, 0.7, 0.7)
    put("embudo", at("casi", 1, 3) - 0.05, 1.1, 0.7, 0.15)
    put("moneda_sola", at("consigue") - 0.05, 0.6, 0.7, 0.15)
    # 4: el alquiler sube
    put("whoosh", at("microeconomía") - 0.35, 0.5, 0.3)
    put("precio_sube", at("sube"), 0.65, 0.7)
    # 5: inflación, paro, crisis
    put("whoosh", at("macroeconomía") - 0.35, 0.5, 0.3)
    put("linea", at("inflación") - 0.05, 0.6, 0.5)
    put("barras", at("paro") - 0.05, 0.5, 0.5)
    put("caida", at("crisis") - 0.05, 0.6, 0.55)
    # 6: el panel: ecuaciones y la campana
    put("whoosh_largo", at("matemáticas") - 0.35, 0.7, 0.3, 0.2)
    put("rotulador", at("matemáticas"), 0.45, 0.45)
    put("rotulador", at("estadística"), 0.45, 0.45, 0.08, 0.4)
    put("linea", at("muchas"), 0.6, 0.45)
    # 7: los puntos, la recta que se ajusta, los que quedan por encima
    put("puntos", at("datos") - 0.1, 0.6, 0.5)
    put("linea", at("separar"), 0.6, 0.5)
    put("ding", at("funciona"), 0.4, 0.35)
    # 8: la torre crece planta a planta
    put("whoosh_largo", at("finanzas") - 0.2, 0.8, 0.3, 0.2)
    put("torre", at("finanzas") - 0.1, 0.85, 0.6)
    # 9: «2013» y el Nobel en el panel; las dos medallas; se dan la espalda
    put("whoosh", at("loco") - 0.1, 0.6, 0.3)
    put("panel", at("2013") - 0.03, 0.4, 0.5)
    put("panel", at("nobel"), 0.4, 0.4, 0.08, 0.2)
    put("whoosh", at("dos") - 0.25, 0.5, 0.3)
    put("giro", at("contrario"), 0.45, 0.5)
    # 10: el precio tranquilo; la burbuja se infla y explota
    put("whoosh", at("uno") - 0.15, 0.5, 0.3)
    put("linea", at("uno"), 0.9, 0.4, 0.2)
    put("whoosh", at("infla") - 0.05, 0.5, 0.3)
    put("burbuja", at("infla"), span(at("infla"), at("quién") - 0.15), 0.6, 0.1)
    put("pop", at("quién") - 0.15, 0.4, 0.75)
    # 11: «FAMA»; las comisiones se llevan las monedas; −5,5 puntos
    put("whoosh", at("quién") + 0.1, 0.5, 0.3)
    put("ding", at("primero"), 0.45, 0.45)
    put("whoosh", at("cuesta") - 0.3, 0.5, 0.3)
    put("cajero", at("comisiones") - 0.35, 1.0, 0.7, 0.15)
    put("impacto", at("nunca") - 0.1, 0.5, 0.4, 0.15)
    # 12: la copia de la bolsa se dibuja y adelanta a casi todos
    put("whoosh", at("fondos", 1, 12), 0.5, 0.3)
    put("whoosh_largo", at("copian") + 0.05, 0.7, 0.3, 0.2)
    put("linea", at("copian") - 0.05, 0.7, 0.55)
    put("brillo", at("acaban"), 0.9, 0.5, 0.25)
    # 13: el «producto» brillante y el humo
    put("whoosh", at("para", 1, 13), 0.5, 0.3)
    put("tecla", at("vendan") - 0.15, 0.2, 0.4)
    put("humo", at("humo"), 1.0, 0.7, 0.3)
    # 14: al panel: ¿gestor o indexado?; vuelta a la montaña (bucle)
    put("whoosh_largo", at("asesoramiento") - 0.1, 0.8, 0.3, 0.2)
    put("panel", at("gestor") - 0.1, 0.35, 0.5)
    put("panel", at("indexado") - 0.1, 0.35, 0.5, 0.08, 0.3)
    put("whoosh_largo", END - 1.0, 0.9, 0.3, 0.25)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "economia.mp4")):
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
