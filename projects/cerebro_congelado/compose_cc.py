"""Compone «Por qué te duele la cabeza al comer helado» (cerebro congelado): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact (el frío en azul, el dolor en rojo, las cifras en dorado, el truco en verde) + la voz de Javi (su MP3, ElevenLabs,
voz Nico v4, a su velocidad natural) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=4 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/cerebro_congelado/compose_cc.py [--test t1 t2 ...] [--sfx]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402


FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
T_HIT = 0.12
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.environ.get("FRAMES_DIR", os.path.join(ROOT, "out", "frames"))
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


# ---------------------------------------------------------------- subtítulos
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, GR, TE = "#8FD3FF", "#7CF0A9", "#62E3D4"
_K = {1: {"duele": R, "cerebro": BL, "helado": BL},
      2: {"truco": GR},
      3: {"helado": BL, "enfría": BL, "paladar": WH, "nervio": GO, "alarma": R},
      4: {"sangre": R, "caliente": R, "arteria": R, "ensancha": R, "segundos": GO},
      5: {"cráneo": WH, "estira": WH, "presión": R, "capas": R, "duelen": R},
      6: {"nervio": GO, "frente": R, "duele": R},
      7: {"2012": GO, "harvard": WH, "dolor": R, "abre": R, "cierra": GR},
      8: {"rápido": R, "doble": GO, "27": GO, "100": WH, "13": GR},
      9: {"truco": GR, "médicos": WH, "lengua": GR, "paladar": GR, "calentarlo": GO},
      10: {"muerdes": GO, "chupas": BL, "mándaselo": GO, "muerde": R}}
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


# ---------------------------------------------------------------- efectos: SOLO de la biblioteca de ElevenLabs del canal (projects/<vídeo>/assets/sfx),
# cada uno en el instante en que pasa la cosa y cortado cuando termina (con un fundido corto): no queda nada sonando de fondo.
_CACHE = {}


def sample(name, sr):                             # mono 48 kHz, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        proj, n = name.split("/")
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(PROJ, proj, "assets", "sfx", n + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
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
        x = sample(name, sr)
        if t0 < 0:
            start, t0 = start - t0, 0.0
        x = x[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    # 1: muerde el polo (crujido) y se congela en 2 segundos (escarcha y hielo que cruje)
    put("medicina/huesos", T_HIT - 0.01, 0.3, 0.55, 0.12)
    put("gafas/congelar", T_HIT + 0.04, 1.6, 0.42, 0.4)
    put("cripto/hielo", 0.95, 0.8, 0.32, 0.3)
    # 2: gira a su perfil y la cabeza se abre como una lámina
    put("medicina/whoosh", at("truco", 1, 2) - 0.1, 0.6, 0.26, 0.2)
    put("robot_neuronas/despiece", at("truco", 1, 2) + 0.5, 0.9, 0.32, 0.3)
    # 3: el frío llega al paladar; el nervio da la alarma
    put("gafas/aire", at("enfría", 1, 3) - 0.08, 0.8, 0.3, 0.3)
    put("cerradura/aviso", at("nervio", 1, 3) - 0.02, 0.7, 0.34, 0.25)
    # 4: la sangre sube de golpe; la arteria se ensancha
    put("robo_banco/chorro", at("sangre", 1, 4) - 0.12, 1.2, 0.32, 0.35)
    put("lanzamiento/estira", at("ensancha", 1, 4) - 0.05, 0.7, 0.4, 0.25)
    # 5: el cráneo no cede; la presión; las meninges duelen (latido)
    put("medicina/golpe", at("cráneo", 1, 5) - 0.03, 0.5, 0.34, 0.2)
    put("lanzamiento/tension", at("presión", 1, 5) - 0.05, 1.2, 0.28, 0.35)
    put("medicina/latido", at("esas", 1, 5) - 0.05, 1.1, 0.45, 0.3)
    # 6: el impulso sube por el nervio hasta la frente; la frente duele
    put("robot_neuronas/estimulo", at("nervio", 1, 6) + 0.45, 0.7, 0.32, 0.25)
    put("magisterio/latido", at("frente", 1, 6) - 0.05, 0.9, 0.36, 0.3)
    # 7: el Doppler de 2012: el flujo sube (dolor) y baja (se va)
    put("medicina/monitor", at("2012", 1, 7) - 0.05, 0.9, 0.28, 0.3)
    put("economia/subida", at("empieza", 1, 7) - 0.05, 0.8, 0.28, 0.3)
    put("economia/caida", at("cierra", 1, 7) - 0.1, 0.8, 0.3, 0.3)
    # 8: las 100 figuritas; 27 se congelan comiendo rápido, 13 despacio
    put("avion/whoosh", at("comes", 1, 8) - 0.35, 0.6, 0.26, 0.2)
    put("magisterio/munecos", at("comes", 1, 8) - 0.2, 0.9, 0.32, 0.3)
    put("cripto/contador", at("27", 1, 8) - 0.1, 0.8, 0.3, 0.3)
    put("economia/ding", at("13", 1, 8) - 0.02, 0.6, 0.34, 0.2)
    # 9: vuelve dentro; la lengua aprieta el paladar; el calor; se descongela
    put("medicina/whoosh", at("truco", 1, 9) - 0.2, 0.6, 0.26, 0.2)
    put("lanzamiento/absorbe", at("aprieta", 1, 9) + 0.25, 0.7, 0.3, 0.25)
    put("quimica/vapor", at("paladar", 1, 9) - 0.05, 1.0, 0.3, 0.35)
    put("cripto/hielo", at("calentarlo", 1, 9) - 0.15, 0.8, 0.38, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "cerebro_congelado.mp4")):
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
