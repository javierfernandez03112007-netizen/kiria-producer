"""Compone «Huelga general 11-N»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(la huelga y lo que no cobras en rojo, las cifras en dorado, la vivienda en celeste, tus derechos en verde) + la voz de Javi (su MP3,
ElevenLabs, Danny, al 112,5 %) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/huelga/compose_huelga.py [--test t1 t2 ...] [--sfx]
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
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, GR, TE, AM, OR, PK = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547", "#FF9A4A", "#FF8FB5"
_K = {1: {"huelga": R, "general": R, "toda": WH, "españa": GO, "sueldos": GO},
      2: {"despedir": R, "final": R},
      3: {"primera": GO, "ccoo": R, "ugt": R, "catorce": GO, "años": GO, "inquilinas": BL, "salarios": GO, "vivienda": WH, "precios": BL},
      4: {"sueldos": GO, "7": GO, "alquileres": GR, "desahucio": R, "alternativa": R},
      5: {"vivienda": BL, "laboral": WH, "sueldo": GO, "alquiler": R},
      6: {"pymes": WH, "1850": GO, "4560": GO, "millones": GO},
      7: {"patronal": WH, "electoral": R, "campaña": GO, "generales": BL, "29": BL, "noviembre": BL},
      8: {"medianoche": R, "servicios": BL, "mínimos": BL, "manifestaciones": GO, "ciudades": GO},
      9: {"despido": R, "despedir": GR, "sancionar": GR, "fundamental": GO, "avisar": GR, "sustituirte": GR, "cobras": R},
      10: {"tú": GO, "haces": R, "trabajar": GO, "mándaselo": GO}}
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

    # 1: las persianas bajan de golpe en cadena por la avenida (empezó justo antes del primer fotograma), la multitud; la cámara sube al mapa
    #    que flota (la onda roja y las chinchetas), las monedas y la casa
    put("robo_banco/persiana", -0.2, 0.9, 0.7, 0.3)
    put("ade/multitud", 0.0, 1.5, 0.32, 0.5)
    put("avion/whoosh_largo", at("toda", 1, 1) - 0.3, 0.9, 0.3, 0.25)
    put("economia/monedas_caen", at("solo", 1, 1) - 0.12, 0.7, 0.4, 0.2)
    put("tapas/pop", at("sueldos", 1, 1) - 0.08, 0.35, 0.45)
    # 2: picado hasta «tú»; la interrogación; «???» en la cabecera
    put("medicina/whoosh_largo", at("si", 1, 2) - 0.35, 0.8, 0.3, 0.25)
    put("avion/pregunta", at("despedir", 1, 2) - 0.25, 0.6, 0.45, 0.2)
    put("lanzamiento/marcador", at("final", 1, 2), 0.35, 0.3)
    # 3: la pantalla gigante (contador 2012 → 2026), vuelo hasta la cabecera, las banderas, la pancarta del lema palabra a palabra
    put("cerradura/whoosh", at("primera", 1, 3) - 0.3, 0.5, 0.25)
    put("lanzamiento/contador", at("catorce", 1, 3) - 0.3, 0.9, 0.4, 0.2)
    put("magisterio/ding", at("años", 1, 3) - 0.05, 0.4, 0.35)
    put("avion/whoosh_largo", at("sindicatos", 1, 3) - 0.5, 0.9, 0.3, 0.25)
    put("ade/marcha", at("sindicatos", 1, 3) - 0.05, 1.6, 0.3, 0.4)
    put("ade/multitud", at("lema", 1, 3) - 0.2, 1.3, 0.28, 0.5)
    for w in ("salarios", "vivienda", "precios"):
        put("lanzamiento/palabra", at(w, 1, 3) - 0.05, 0.3, 0.35)
    # 4: a la plaza: la pila del sueldo sube, la casa con el alquiler que baja, la caja de la mudanza y el «prohibido»
    put("avion/whoosh_largo", at("piden", 1, 4) - 0.4, 0.8, 0.3, 0.25)
    put("economia/monton", at("subir", 1, 4) - 0.1, 0.6, 0.4, 0.2)
    put("economia/precio_sube", at("7", 1, 4) - 0.05, 0.6, 0.35, 0.2)
    put("magisterio/pop", at("bajar", 1, 4) - 0.2, 0.35, 0.4)
    put("economia/caida", at("alquileres", 1, 4), 0.6, 0.35, 0.2)
    put("lanzamiento/caja", at("desahucio", 1, 4) - 0.2, 0.45, 0.4)
    put("cerradura/denegado", at("alternativa", 1, 4) - 0.15, 0.4, 0.35)
    # 5: la balanza se inclina hacia la casa
    put("medicina/pop", at("vivienda", 1, 5) - 0.05, 0.35, 0.4)
    put("cerradura/clunk", at("llega", 1, 5) - 0.05, 0.5, 0.4, 0.2)
    # 6: las torres de billetes crecen (1.850 y 4.560 millones)
    put("economia/torre", at("asociación", 1, 6), 0.9, 0.35, 0.25)
    put("robo_banco/fajos", at("1850", 1, 6) - 0.1, 0.6, 0.45, 0.2)
    put("lanzamiento/contador", at("4560", 1, 6) - 0.1, 0.9, 0.45, 0.2)
    put("economia/impacto", at("millones", 1, 6), 0.45, 0.35, 0.2)
    # 7: «electoral»; el calendario (11, 13 y 29); el sobre entra en la urna
    put("avion/whoosh", at("patronal", 1, 7) - 0.3, 0.45, 0.25)
    put("robo_banco/sello", at("electoral", 1, 7) - 0.05, 0.5, 0.45)
    put("magisterio/calendario", at("dos", 1, 7) - 0.25, 0.6, 0.4, 0.2)
    put("quimica/papel", at("noviembre", 1, 7), 0.5, 0.4, 0.2)
    # 8: el reloj da las 00:00, pasa el autobús de servicios mínimos, gente en muchas ciudades (el mapa sobre la plaza)
    put("avion/whoosh_largo", at("hoy", 1, 8) - 0.4, 0.8, 0.3, 0.25)
    put("robo_banco/reloj", at("medianoche", 1, 8) - 0.2, 0.9, 0.45, 0.25)
    put("robo_banco/camion", at("servicios", 1, 8) - 0.4, 2.0, 0.35, 0.5)
    put("ade/multitud", at("manifestaciones", 1, 8) - 0.1, 1.3, 0.3, 0.5)
    put("avion/sube", at("ciudades", 1, 8) - 0.6, 0.8, 0.3, 0.25)
    # 9: el escudo, la Constitución, los vistos buenos, la nómina con el día a cero
    put("avion/whoosh", at("y", 1, 9) - 0.15, 0.45, 0.25)
    put("robo_banco/sello", at("despedir", 1, 9) - 0.05, 0.5, 0.45)
    put("magisterio/libro", at("fundamental", 1, 9) - 0.3, 0.7, 0.4, 0.2)
    put("cripto/check", at("avisar", 1, 9) - 0.02, 0.35, 0.35)
    put("quimica/ok", at("sustituirte", 1, 9) - 0.02, 0.4, 0.35)
    put("lanzamiento/papel", at("pero", 1, 9) - 0.2, 0.45, 0.4)
    put("avion/tiza_tachar", at("cobras", 1, 9) - 0.02, 0.45, 0.4)
    # 10: el cruce (los dos caminos), te leo, mándaselo; rebobina por la avenida hasta el principio (bucle)
    put("avion/whoosh", at("tú", 1, 10) - 0.3, 0.45, 0.25)
    put("lanzamiento/ping", at("haces", 1, 10) - 0.02, 0.35, 0.3)
    put("lanzamiento/ping", at("trabajar", 1, 10) - 0.02, 0.35, 0.3)
    put("lanzamiento/mensaje", at("leo") - 0.05, 0.4, 0.35)
    put("lanzamiento/enviado", at("mándaselo") + 0.1, 0.45, 0.35)
    put("promo_web/rebobina", END - 1.25, 1.25, 0.4, 0.1)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "huelga.mp4")):
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
