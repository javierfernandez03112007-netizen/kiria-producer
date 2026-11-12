"""Compone «GTA 6: el dinero»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(estilo del vídeo de Derecho; el dinero en verde, las fechas y los récords en dorado, el precio y lo que se niega en rojo) + la voz de Javi (su MP3,
ElevenLabs, Danny, a su velocidad natural) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/gta6_dinero/compose_gtd.py [--test t1 t2 ...] [--sfx]
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
T_HIT = 0.3
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
BL, GR, TE, AM, OR, PK = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547", "#FF9A4A", "#FF8FB5"
_K = {1: {"película": WH, "historia": GO, "ganado": GO, "dinero": GR, "videojuego": GO},
      2: {"gta": GO, "5": GR, "19": GO, "noviembre": GO, "6": GO, "cuánto": R, "ganar": R, "final": R},
      3: {"primer": WH, "día": WH, "800": GR, "millones": GR, "dólares": GR, "3": GO, "días": GO, "1000": GR, "récord": GO, "guinness": GO},
      4: {"230": GR, "millones": GR, "copias": WH, "habitantes": GO, "brasil": GO},
      5: {"gta": GO, "6": GO, "rockstar": WH, "negar": R, "edificio": BL, "alto": BL, "mundo": BL},
      6: {"analistas": WH, "1000": GO, "1500": GO, "millones": GO, "película": R},
      7: {"ti": WH, "80": R, "euros": R},
      8: {"respuesta": WH, "analistas": WH, "3200": GR, "millones": GR, "primer": GO, "año": GO, "película": GO, "taquillera": GO},
      9: {"pagarías": WH, "80": R, "euros": R, "videojuego": GO, "mándaselo": GO, "jugar": WH, "dinero": GR}}
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

    # 1: la caja de GTA 5 cae como un mazo sobre las cien bobinas (golpe, onda) y caen todas; la n.º 1, la última
    put("lanzamiento/mazo", T_HIT - 0.04, 0.9, 0.6, 0.25)
    put("medicina/caen", T_HIT + 0.05, 1.1, 0.4, 0.4)
    put("cerradura/clunk", T_HIT + 0.85, 0.45, 0.3, 0.2)
    put("lanzamiento/marcador", at("historia", 1, 1) - 0.05, 0.4, 0.28)
    # 2: la portada de GTA 5; sube la vitrina de GTA 6; el calendario del 19; la luz roja y la interrogación; «???» en la cabecera
    put("lanzamiento/tarjeta", at("gta", 1, 2) - 0.05, 0.45, 0.3)
    put("medicina/vitrina", at("y", 1, 2) - 0.15, 0.9, 0.42, 0.25)
    put("magisterio/calendario", at("19", 1, 2) - 0.2, 0.8, 0.38, 0.2)
    put("avion/pregunta", at("cuánto", 1, 2) - 0.1, 0.8, 0.4, 0.25)
    put("lanzamiento/marcador", at("final", 1, 2), 0.35, 0.25)
    # 3: vuelo al primer pedestal; el calendario de taco; los fajos suben a 800 M$; pasa al día 3; 1.000 M$; la medalla del récord
    put("avion/whoosh_largo", at("el", 1, 3) - 0.1, 1.1, 0.3, 0.3)
    put("lanzamiento/dias", at("primer", 1, 3) - 0.2, 0.6, 0.32, 0.2)
    put("robo_banco/fajos", at("800", 1, 3) - 0.25, 0.8, 0.45, 0.2)
    put("lanzamiento/voltea", at("en", 1, 3) - 0.02, 0.45, 0.32)
    put("economia/monton", at("1000", 1, 3) - 0.1, 0.7, 0.42, 0.2)
    put("economia/medalla", at("récord", 1, 3) - 0.12, 0.6, 0.45, 0.2)
    # 4: vuelo; aparecen las 230 cajas; las figuritas de Brasil se colocan encima; sobran 17 (brillo dorado)
    put("medicina/whoosh_largo", at("lleva", 1, 4) - 0.3, 1.0, 0.28, 0.3)
    put("lanzamiento/construye", at("230", 1, 4) - 0.25, 1.2, 0.35, 0.3)
    put("ade/fichas", at("más", 2, 4) - 0.2, 1.0, 0.4, 0.3)
    put("medicina/dorado", at("brasil", 1, 4) - 0.12, 0.8, 0.42, 0.25)
    # 5: vuelo al coste; el documento; el sello «NO»; sube la maqueta del rascacielos
    put("avion/whoosh", at("y", 1, 5) - 0.2, 0.6, 0.28, 0.2)
    put("magisterio/papel", at("rockstar", 1, 5) - 0.15, 0.5, 0.35, 0.2)
    put("robo_banco/sello", at("negar", 1, 5) + 0.02, 0.45, 0.6, 0.15)
    put("gta6/edificios", at("edificio", 1, 5) - 0.35, 1.3, 0.35, 0.3)
    # 6: la columna de los analistas sube; la bobina de la película más cara, al lado
    put("robo_banco/fajos", at("1000", 1, 6) - 0.3, 0.8, 0.4, 0.2)
    put("tapas/pop", at("cualquier", 1, 6) - 0.18, 0.45, 0.4)
    # 7: vuelo al precio; la etiqueta de 79,99 €; el tique
    put("medicina/whoosh", at("y", 1, 7) - 0.2, 0.55, 0.25, 0.2)
    put("tapas/etiqueta", at("costará", 1, 7) - 0.3, 0.6, 0.4, 0.2)
    put("economia/cajero", at("80", 1, 7) - 0.1, 0.9, 0.32, 0.3)
    # 8: vuelo a la balanza; caen los fajos de GTA 6 en su platillo y, con «más que la película», ese lado baja
    put("avion/whoosh_largo", at("respuesta", 1, 8) - 0.3, 1.0, 0.28, 0.3)
    put("robo_banco/fajos", at("3200", 1, 8) - 0.1, 0.8, 0.42, 0.2)
    put("cripto/contador", at("millones", 1, 8) - 0.2, 1.0, 0.25, 0.3)
    put("medicina/golpe", at("más", 1, 8) + 0.05, 0.7, 0.5, 0.2)
    # 9: la etiqueta vuelve con «¿80 €?»; mándaselo; vuelo al centro: las bobinas se levantan y la caja sube (bucle)
    put("tapas/etiqueta", at("pagarías", 1, 9) - 0.25, 0.6, 0.35, 0.2)
    put("lanzamiento/enviado", at("mándaselo") + 0.1, 0.5, 0.35)
    put("promo_web/rebobina", at("mándaselo") + 0.5, 1.1, 0.3, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "gta6_dinero.mp4")):
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
