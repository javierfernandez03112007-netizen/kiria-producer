"""Compone «Odontología por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que no existe y lo rechazado en rojo, las cifras y el máster en dorado, lo que sí puedes hacer en verde) + la voz de Javi (su MP3,
ElevenLabs, Danny, a su velocidad natural) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/odontologia/compose_odo.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"ortodoncista": WH, "especialista": R, "ortodoncia": GO, "españa": WH, "especialidad": R, "existe": R},
      2: {"final": R},
      3: {"odontología": WH, "cinco": GO, "años": GO, "anatomía": BL, "materiales": BL, "prótesis": BL, "cirugía": BL, "pacientes": GR},
      4: {"empastar": GR, "muelas": GR, "brackets": GR, "todo": GO},
      5: {"1700": GO, "dentistas": WH, "43000": GO},
      6: {"consejo": WH, "único": R, "europea": BL, "especialidades": R, "oficiales": R, "julio": WH, "rechazó": R, "seis": R, "ortodoncia": GO},
      7: {"ortodoncista": WH, "máster": GO, "buenísimo": GO, "especialista": R, "oficial": R, "serlo": R},
      8: {"brackets": WH, "invisibles": BL, "mándaselo": GO, "aparato": GO}}
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

    # 1: la dentadura gigante se cierra de golpe; la cámara gira hacia el cartel; «ESPECIALISTA» se suelta y cae
    put("cerradura/clunk", -0.04, 0.5, 0.6, 0.2)
    put("avion/whoosh_largo", at("especialista", 1, 1) - 0.4, 0.9, 0.28, 0.25)
    put("lanzamiento/cae", at("existe", 1, 1) - 0.02, 0.6, 0.45, 0.2)
    put("cerradura/choca", at("existe", 1, 1) + 0.5, 0.45, 0.45)
    # 2: la interrogación; «???» en la cabecera
    put("avion/pregunta", at("entonces", 1, 2) - 0.25, 0.6, 0.45, 0.2)
    put("lanzamiento/marcador", at("final", 1, 2), 0.35, 0.3)
    # 3: vuelo a la facultad; cada piso se enciende con lo suyo
    put("medicina/whoosh_largo", at("odontología", 1, 3) - 0.35, 0.9, 0.3, 0.25)
    put("medicina/huesos", at("anatomía", 1, 3) - 0.1, 0.5, 0.4)
    put("quimica/vidrio", at("materiales", 1, 3) - 0.1, 0.45, 0.35)
    put("tapas/pop", at("prótesis", 1, 3) - 0.1, 0.3, 0.4)
    put("medicina/instrumental", at("cirugía", 1, 3) - 0.08, 0.45, 0.4)
    put("medicina/lampara", at("pacientes", 1, 3) - 0.1, 0.5, 0.4)
    # 4: la boca se abre; empaste; la muela sale; brackets; todo
    put("robot_neuronas/servo", at("acabar", 1, 4) - 0.25, 0.6, 0.35, 0.2)
    put("cripto/llenar", at("empastar", 1, 4) - 0.05, 0.6, 0.4, 0.2)
    put("lanzamiento/sale", at("muelas", 1, 4) - 0.05, 0.5, 0.45, 0.2)
    put("cerradura/pitones", at("brackets", 1, 4) - 0.2, 0.7, 0.45, 0.2)
    put("quimica/ok", at("todo", 1, 4) - 0.02, 0.4, 0.35)
    # 5: salen los dentistas de la facultad; el contador; la grúa sube y se ve la plaza llena
    put("ade/multitud", at("salen", 1, 5) - 0.1, 1.5, 0.3, 0.5)
    put("lanzamiento/contador", at("1700", 1, 5) - 0.1, 0.8, 0.4, 0.2)
    put("avion/sube", at("país", 1, 5) - 0.3, 0.8, 0.3, 0.25)
    put("economia/impacto", at("43000", 1, 5) - 0.02, 0.5, 0.4, 0.2)
    # 6: el mapa de Europa; los ✓ de la UE; España en rojo; las seis solicitudes y sus sellos
    put("gafas/onda", at("según", 1, 6) - 0.4, 0.7, 0.3, 0.25)
    put("cripto/check", at("único", 1, 6) - 0.1, 0.4, 0.35)
    put("cerradura/denegado", at("sin", 1, 6) - 0.05, 0.45, 0.45)
    put("magisterio/papel", at("julio", 1, 6) - 0.25, 0.5, 0.35, 0.2)
    for j in range(5):
        put("robo_banco/sello", at("rechazó", 1, 6) - 0.05 + j * 0.16, 0.25, 0.32, 0.08)
    put("robo_banco/sello", at("ortodoncia", 1, 6) + 0.05, 0.45, 0.5, 0.15)
    # 7: vuelta a la clínica; el máster; las estrellas; «especialista oficial» tachado
    put("avion/whoosh_largo", at("así", 1, 7) - 0.35, 0.8, 0.28, 0.25)
    put("medicina/diploma", at("máster", 1, 7) - 0.15, 0.6, 0.45, 0.2)
    put("medicina/dorado", at("buenísimo", 1, 7) - 0.2, 0.7, 0.4, 0.2)
    put("magisterio/tarjeta", at("especialista", 1, 7) - 0.15, 0.4, 0.35)
    put("avion/tiza_tachar", at("serlo", 1, 7) - 0.25, 0.5, 0.45, 0.2)
    # 8: brackets o invisibles; mándaselo; la boca se abre y se cierra otra vez (bucle)
    put("medicina/whoosh", at("brackets", 1, 8) - 0.3, 0.45, 0.25)
    put("gafas/brillo", at("invisibles", 1, 8) - 0.1, 0.6, 0.35, 0.2)
    put("lanzamiento/enviado", at("mándaselo") + 0.1, 0.45, 0.35)
    put("promo_web/rebobina", END - 1.2, 1.15, 0.35, 0.1)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "odontologia.mp4")):
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
