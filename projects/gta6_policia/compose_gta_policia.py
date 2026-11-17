"""Compone «GTA 6: la policía ya no te busca a ti»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(la ropa en rosa, el coche en naranja, las estrellas en dorado, lo que borras en verde) + la voz de Javi (su MP3 de ElevenLabs, a tempo 1,0)
+ efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar.

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/gta6_policia/compose_gta_policia.py [--test t1 t2 ...] [--sfx]
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
GO, R, WH, GR, CY, AM, OR, PK, VI = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547", "#FF9A3D", "#FF5FB8", "#B58CFF"
_K = {1: {"jueves": GO, "policía": CY, "ropa": PK, "coche": OR},
      2: {"despistas": WH, "truco": VI, "jason": OR, "lucía": PK},
      3: {"5": WH, "esconderte": CY, "parpadearan": GO, "estrellas": GO},
      4: {"seis": GO, "estrellas": GO, "policía": CY, "sabe": CY},
      5: {"coche": OR, "ropa": PK, "aspecto": CY, "cámara": R},
      6: {"testigo": AM, "nadie": GR, "alarma": R, "estrellas": GO},
      7: {"pista": CY, "borrar": GR},
      8: {"coche": OR, "menos": GR, "gafas": PK, "gorra": PK},
      9: {"menos": GR, "pistas": CY, "perderlos": GR},
      10: {"truco": VI, "jason": OR, "lucía": PK, "pareja": VI, "sepáralos": GR},
      11: {"huyes": WH, "cambias": PK, "ropa": PK, "mándaselo": GR, "cinco": GO, "estrellas": GO}}
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

    # 1: sirena; la policía alumbra la ropa… y el coche
    put("robo_banco/sirena", 0.0, 1.7, 0.4, 0.6)
    put("avion/pop", at("ropa", 1, 1) - 0.02, 0.4, 0.4, 0.15)
    put("avion/pop", at("coche", 1, 1) - 0.02, 0.4, 0.4, 0.15)
    # 2: el maniquí vuelve a su ropa; llega Lucía; el truco pendiente
    put("avion/whoosh", 5.65, 0.6, 0.3)
    put("lanzamiento/burbuja", 6.68, 0.5, 0.45, 0.2)
    put("avion/pregunta", at("truco", 1, 2) - 0.05, 1.0, 0.3, 0.3)
    # 3: GTA 5: corre al callejón; pasa la patrulla; las estrellas parpadean y se van
    put("avion/whoosh", 10.0, 0.6, 0.35)
    put("avion/motor", 12.5, 1.9, 0.3, 0.6, start=1.0)
    put("lanzamiento/tictac", at("parpadearan") - 0.02, 1.0, 0.35, 0.3)
    # 4: sube la cámara; las seis estrellas (una a una) y, debajo, las pistas
    put("avion/whoosh_largo", 14.7, 1.1, 0.3, 0.4)
    for i in range(6):
        put("avion/tap", at("seis") - 0.02 + i * 0.14, 0.2, 0.4, 0.08)
    put("economia/panel", at("debajo") - 0.02, 0.8, 0.4, 0.3)
    # 5: cada pista se enciende; la cámara de seguridad
    for w, k in (("coche", 1), ("ropa", 1), ("aspecto", 1)):
        put("cerradura/blip", at(w, k, 5) - 0.02, 0.4, 0.4, 0.15)
    put("robo_banco/luces_camara", at("grabado") + 0.1, 0.9, 0.4, 0.3)
    # 6: el testigo llama; nadie te ve; la alarma no salta; no hay estrellas
    put("cripto/llamada", at("testigo") - 0.25, 0.8, 0.45, 0.2)
    put("avion/ding", at("testigo") + 0.42, 0.6, 0.35, 0.3)
    put("avion/sale", at("nadie") + 0.05, 0.5, 0.35, 0.2)
    put("quimica/apagado", at("alarma") - 0.3, 0.9, 0.35, 0.3)
    put("quimica/ok", at("hay") - 0.05, 0.5, 0.45, 0.2)
    # 7: tres estrellas otra vez; se puede borrar
    for i in range(3):
        put("avion/tap", at("pista") - 0.3 + i * 0.08, 0.2, 0.35, 0.08)
    put("magisterio/tiza_tachar", at("borrar") - 0.05, 0.7, 0.35, 0.3)
    # 8: cambia de coche (gira y ¡pop!): una menos; gafas y gorra: otra menos (los neones se apagan)
    put("avion/giro", at("cambia") - 0.03, 0.5, 0.4, 0.15)
    put("lanzamiento/burbuja", at("cambia") + 0.42, 0.5, 0.45, 0.2)
    put("ade/letrero_off", at("una", 1, 8) - 0.05, 0.8, 0.5, 0.3)
    put("avion/clic", at("gafas") + 0.05, 0.4, 0.45, 0.15)
    put("avion/pop", at("gorra") + 0.02, 0.4, 0.45, 0.15)
    put("ade/letrero_off", at("otra") - 0.05, 0.8, 0.5, 0.3)
    # 9: la patrulla pasa de largo; las estrellas se van
    put("avion/motor", at("cuantas") - 0.2, 2.0, 0.32, 0.7, start=1.2)
    put("lanzamiento/tictac", at("fácil") - 0.02, 0.85, 0.3, 0.3)
    # 10: el candado se abre; llega la patrulla que busca a una pareja; se separan
    put("cerradura/clic_abre", at("truco", 1, 10) - 0.05, 0.9, 0.45, 0.3)
    put("robo_banco/sirena", 39.05, 1.5, 0.3, 0.6)
    put("cerradura/blip", at("pareja") - 0.05, 0.4, 0.4, 0.15)
    put("promo_web/frenazo", 40.35, 0.6, 0.3, 0.2)
    put("avion/whoosh", at("sepáralos") + 0.03, 0.6, 0.4)
    put("ade/letrero_off", at("sepáralos") + 0.3, 0.8, 0.45, 0.3)
    # 11: ¿huyes… o te cambias?; vuelven las patrullas; la ropa se queda sola otra vez (bucle con el primer fotograma)
    put("avion/pop", at("huyes") - 0.02, 0.4, 0.4, 0.15)
    put("avion/pop", at("cambias") - 0.02, 0.4, 0.4, 0.15)
    put("robo_banco/sirena", 43.4, 2.3, 0.38, 0.9)
    put("avion/giro", 44.5, 0.5, 0.3, 0.15)
    put("lanzamiento/burbuja", 45.13, 0.5, 0.4, 0.2)
    for i in range(5):
        put("avion/tap", at("cinco") - 0.1 + i * 0.12, 0.2, 0.4, 0.08)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "gta6_policia.mp4")):
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
