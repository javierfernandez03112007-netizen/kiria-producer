"""Compone «Veterinaria por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(los animales en celeste, lo que importa en dorado, lo que enferma en rojo, el brazo en naranja) + la voz de Javi (su MP3, ElevenLabs,
Danny, al 112,5 %) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/veterinaria/compose_vet.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"veterinaria": WH, "perros": BL, "gatos": BL, "brazo": OR, "entero": OR, "vaca": GO},
      2: {"final": R},
      3: {"mascotas": BL, "muchos": GO, "animales": GO},
      4: {"anatomía": WH, "muchos": GO, "perro": BL, "gato": BL, "caballo": BL, "vaca": BL, "cerdo": BL, "gallina": BL},
      5: {"farmacología": WH, "mismo": GO, "dosis": GO},
      6: {"microbiología": GR, "parásitos": AM, "enferma": R, "ti": R},
      7: {"producción": WH, "granjas": WH, "alimentación": GO, "genética": BL},
      8: {"cirugía": WH, "quirófano": GO, "anestesia": BL, "puntos": TE},
      9: {"nadie": GO, "comes": GO, "matadero": WH, "veterinario": GR, "oficial": GR, "antes": GR, "después": GR},
      10: {"brazo": OR, "reproducción": GR, "preñada": PK, "útero": PK, "metido": OR},
      11: {"perros": BL, "gatos": BL, "vaca": GO},
      12: {"perros": BL, "gatos": BL, "vacas": GO, "caballos": GO, "veterinario": GO}}
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

    # 1: la pared revienta (empezó justo antes del primer fotograma), caen los cascotes; el fonendo, el gato, el guante que se estira, la vaca
    put("robo_banco/rotura", -0.14, 1.0, 0.85, 0.3)
    put("robo_banco/hormigon", 0.3, 0.7, 0.5, 0.25)
    put("lanzamiento/cae", 0.62, 0.5, 0.35, 0.2)
    put("medicina/pop", at("curando") - 0.08, 0.35, 0.4)
    put("tapas/pop", at("gatos", 1, 1) - 0.12, 0.3, 0.4)
    put("avion/whoosh", at("y", 2, 1) - 0.1, 0.45, 0.3)
    put("lanzamiento/estira", at("brazo", 1, 1) - 0.02, 0.7, 0.5, 0.2)
    put("medicina/whoosh", at("dentro", 1, 1) - 0.1, 0.45, 0.25)
    # 2: ¿por qué?; aparece «lo del brazo · ???»
    put("avion/pregunta", at("por", 1, 2) - 0.05, 0.6, 0.45, 0.2)
    put("lanzamiento/marcador", at("final", 1, 2), 0.35, 0.3)
    # 3: mascotas; la cámara se aleja y aparecen los animales grandes; zambullida en la mancha blanca
    put("magisterio/pop", at("mascotas") - 0.05, 0.3, 0.35)
    put("medicina/whoosh_largo", at("realidad") - 0.1, 0.9, 0.28, 0.25)
    put("economia/pop", at("muchos", 1, 3) - 0.1, 0.3, 0.45)
    put("tapas/pop", at("animales", 1, 3) - 0.1, 0.3, 0.45)
    put("medicina/pop", at("vez") - 0.45, 0.3, 0.4)
    put("medicina/zambullida", at("anatomía") - 0.5, 0.8, 0.45, 0.25)
    # 4: Anatomía: huesos, la plataforma gira, cada animal pasa por los rayos X
    put("medicina/huesos", at("anatomía") + 0.05, 0.5, 0.45)
    put("avion/giro", at("muchos", 1, 4) - 0.05, 0.6, 0.3, 0.2)
    for w in ("perro", "gato", "caballo", "vaca", "cerdo", "gallina"):
        put("gafas/barrido", at(w, 1, 4) - 0.1, 0.32, 0.32, 0.1)
    # 5: Farmacología: el frasco, las jeringas se llenan
    put("medicina/whoosh", at("farmacología") - 0.25, 0.45, 0.25)
    put("quimica/vidrio", at("farmacología") - 0.1, 0.45, 0.4)
    put("cripto/llenar", at("dosis") - 0.05, 0.75, 0.4, 0.2)
    # 6: Microbiología: la placa, la garrapata, los microbios, saltan a la persona
    put("medicina/whoosh", at("microbiología") - 0.25, 0.45, 0.25)
    put("medicina/petri", at("microbiología") - 0.05, 0.7, 0.45, 0.2)
    put("cerradura/rasca", at("parásitos") - 0.1, 0.55, 0.35, 0.2)
    put("quimica/burbujas", at("enferma") - 0.05, 0.7, 0.35, 0.25)
    put("cripto/salto", at("y", 2, 6) - 0.02, 0.6, 0.45, 0.2)
    put("medicina/fallo", at("ti", 1, 6) - 0.02, 0.45, 0.45)
    # 7: Producción animal: la granja se monta, el pienso cae, el ADN
    put("medicina/whoosh", at("producción") - 0.25, 0.45, 0.25)
    put("lanzamiento/construye", at("granjas") - 0.15, 0.7, 0.45, 0.2)
    put("tapas/vierte", at("alimentación") - 0.02, 0.65, 0.4, 0.2)
    put("quimica/molecula", at("genética") - 0.1, 0.55, 0.45, 0.2)
    # 8: Cirugía: lámpara, monitor de anestesia, instrumental
    put("medicina/whoosh", at("cirugía") - 0.25, 0.45, 0.25)
    put("medicina/lampara", at("quirófano") - 0.08, 0.5, 0.45)
    put("medicina/monitor", at("anestesia") - 0.05, 0.6, 0.4, 0.2)
    put("medicina/instrumental", at("puntos") - 0.08, 0.45, 0.45)
    # 9: lo que comes: la lupa, el matadero en rojo, los pasos del veterinario, verde, los animales, el visto bueno y el sello
    put("medicina/whoosh", at("y", 1, 9) - 0.2, 0.45, 0.25)
    put("avion/brillo", at("vigilas") - 0.1, 0.55, 0.35, 0.2)
    put("cerradura/aviso", at("matadero") - 0.05, 0.45, 0.4)
    put("cerradura/denegado", at("funcionar") - 0.02, 0.4, 0.35)
    put("robot_neuronas/pasos", at("veterinario", 1, 9) - 0.12, 1.0, 0.35, 0.2)
    put("quimica/ok", at("dentro", 1, 9) - 0.02, 0.4, 0.4)
    put("ade/marcha", at("revisando") - 0.05, 1.2, 0.25, 0.3)
    put("cripto/check", at("antes", 1, 9) - 0.02, 0.35, 0.35)
    put("robo_banco/sello", at("después") - 0.05, 0.5, 0.55)
    # 10: ¿y lo del brazo?: rayos X, el latido del ternero, el brazo entra, el útero
    put("medicina/whoosh_largo", at("y", 1, 10) - 0.25, 0.9, 0.28, 0.25)
    put("medicina/negatoscopio", at("reproducción") - 0.05, 0.6, 0.45, 0.2)
    put("medicina/latido", at("preñada") - 0.05, 0.9, 0.5, 0.25)
    put("lanzamiento/desliza", at("palpa") - 0.1, 0.7, 0.4, 0.2)
    put("medicina/hallazgo", at("útero") - 0.03, 0.5, 0.4, 0.2)
    # 11: vuelta a la clínica; perros y gatos; pero antes, la vaca
    put("medicina/whoosh_largo", at("así") - 0.25, 0.8, 0.28, 0.25)
    put("tapas/pop", at("perros", 1, 11) - 0.08, 0.3, 0.35)
    put("avion/impacto", at("vaca", 1, 11) - 0.02, 0.5, 0.4, 0.2)
    # 12: ¿perros y gatos o vacas y caballos?; te leo; mándaselo; la pared se rebobina (bucle)
    put("medicina/whoosh_largo", at("vacas") - 0.2, 0.8, 0.25, 0.25)
    put("lanzamiento/mensaje", at("leo") - 0.05, 0.4, 0.35)
    put("lanzamiento/enviado", at("mándaselo") + 0.1, 0.45, 0.35)
    put("promo_web/rebobina", END - 1.25, 1.25, 0.4, 0.1)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "veterinaria.mp4")):
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
