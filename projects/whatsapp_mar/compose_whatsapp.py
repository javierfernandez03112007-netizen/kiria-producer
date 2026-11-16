"""Compone «Así funciona: el viaje del mensaje de tu madre»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra
en Impact (el mensaje en verde, el mar y la luz en cian, los datos en dorado, lo que se rompe en rojo) + la voz de Javi (su MP3 de ElevenLabs,
a tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar.

    python3 ajustar_voz.py && python3 env_voz.py
    (render con las máquinas de ayuda → out/frames)
    python3 projects/whatsapp_mar/compose_whatsapp.py [--test t1 t2 ...] [--sfx]
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
GO, R, WH, GR, CY, AM, OR = "#FFC24A", "#FF5A4E", "#EEF2F6", "#5BE38A", "#5CF2E6", "#FFB547", "#FF9A4A"
_K = {1: {"hijo": GR, "dónde": GR, "estás": GR, "brasil": AM},
      2: {"mensaje": GR, "fondo": CY, "mar": CY},
      3: {"99": GO, "100": GO, "continentes": WH, "cables": CY},
      4: {"rompe": R, "país": WH, "entero": WH, "apagar": R},
      5: {"móvil": GR, "ondas": CY, "antena": CY},
      6: {"cable": CY, "fibra": CY, "luz": CY},
      7: {"luz": CY, "cristal": CY, "pelo": AM, "200.000": GO, "kilómetros": GO, "segundo": GO},
      8: {"portugal": AM, "hunde": CY, "mar": CY, "6.000": GO, "kilómetros": GO, "brasil": AM, "tres": GO, "centésimas": GO, "segundo": GO},
      9: {"600": GO, "cables": CY, "rompen": R, "150": R, "200": R},
      10: {"tiburones": WH, "tres": R, "cuatro": R, "ancla": R, "red": R, "pesca": R},
      11: {"2022": GO, "volcán": OR, "partió": R, "único": R, "tonga": R, "cinco": R, "semanas": R, "internet": CY},
      12: {"contéstale": GR, "océano": CY, "encontrarte": GR},
      13: {"satélite": WH, "cable": CY, "mándaselo": GR, "madre": GR}}
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

    # 1: llega el mensaje de mamá (el móvil vibra en la toalla); la cámara se aleja
    put("lanzamiento/mensaje", 0.0, 0.6, 0.55, 0.2)
    put("robot_neuronas/zumbido", 0.12, 0.45, 0.35, 0.1)
    put("robot_neuronas/zumbido", 0.95, 0.42, 0.3, 0.1)
    # 2: vuela sobre la orilla y se mete en el mar; burbujas; la luz pasa por el cable
    put("avion/whoosh", 3.85, 0.6, 0.35)
    put("cerradura/zambullida", 4.48, 0.8, 0.55, 0.25)
    put("quimica/burbujas", 4.75, 0.9, 0.3, 0.3)
    put("lanzamiento/laser", 5.05, 0.6, 0.3, 0.2)
    # 3: sube a toda prisa y sale de la maqueta; se encienden los cables del mundo; el satélite
    put("avion/whoosh_largo", 6.05, 1.2, 0.4, 0.4)
    put("gafas/barrido", at("99") - 0.02, 0.8, 0.4, 0.25)
    put("avion/brillo", at("viajan") - 0.1, 0.8, 0.25, 0.3)
    put("cripto/internet", at("cables", 1, 3) - 0.05, 0.9, 0.4, 0.3)
    # 4: un cable se rompe; Mauritania se queda sin internet
    put("gta6/raja", at("rompe", 1, 4) - 0.02, 0.8, 0.5, 0.25)
    put("quimica/apagado", at("entero", 1, 4) - 0.25, 1.0, 0.45, 0.3)
    # 5: baja al pueblo de España; la madre escribe y envía; las ondas a la antena
    put("avion/whoosh_largo", 13.25, 1.2, 0.35, 0.4)
    put("cripto/teclea", 13.7, 0.75, 0.35, 0.15)
    put("lanzamiento/enviado", at("enviarlo") + 0.15, 0.6, 0.5, 0.2)
    put("avion/onda", at("lanza") - 0.05, 0.8, 0.4, 0.25)
    put("avion/llegada", at("antena", 1, 5) + 0.3, 0.8, 0.35, 0.25)
    # 6: baja por la torre; la onda se vuelve luz en la fibra
    put("avion/whoosh", at("entra", 1, 6) - 0.05, 0.6, 0.3)
    put("gta6/fibra", at("convierte") - 0.1, 1.4, 0.5, 0.3)
    # 7: dentro de la fibra: el destello de entrada, el pelo, la velocidad
    put("gafas/fotones", 20.9, 1.6, 0.45, 0.4)
    put("avion/brillo", at("pelo") - 0.15, 0.8, 0.3, 0.3)
    put("gta6/whoosh_ciudad", at("200.000") - 0.1, 1.2, 0.45, 0.4)
    # 8: sale en Portugal; el cable se hunde en el mar; la luz cruza el océano (cronómetro) y llega
    put("economia/brillo", 26.88, 0.8, 0.35, 0.3)
    put("medicina/zambullida", at("hunde") + 0.4, 0.8, 0.5, 0.25)
    put("avion/cronometro", at("6.000") - 0.1, 0.5, 0.35, 0.1)
    put("avion/cronometro", at("tres", 1, 8) - 0.1, 0.5, 0.35, 0.1)
    put("avion/ding", at("segundo", 1, 8) + 0.15, 0.8, 0.45, 0.3)
    # 9: el mapa entero; chispas rojas donde se rompen
    put("economia/barras", at("600") - 0.05, 0.6, 0.4, 0.2)
    put("magisterio/chispa", at("rompen") - 0.02, 0.9, 0.35, 0.3)
    put("magisterio/chispa", at("150") + 0.1, 0.9, 0.3, 0.3)
    # 10: al agua; el tiburón huele y se va; el ancla engancha y parte el cable; la red
    put("cerradura/zambullida", 38.42, 0.8, 0.45, 0.25)
    put("lanzamiento/asoma", at("tiburones") + 0.1, 0.6, 0.35, 0.2)
    put("cerradura/acero", at("tres", 1, 10) + 0.3, 0.7, 0.4, 0.2)
    put("robo_banco/rotura", at("ancla") + 0.2, 1.1, 0.55, 0.3)
    put("magisterio/red", at("red") - 0.1, 0.9, 0.3, 0.3)
    # 11: vuela a Tonga; el volcán estalla y parte el cable; la isla se queda sin internet
    put("avion/whoosh_largo", 42.9, 1.2, 0.4, 0.4)
    put("lanzamiento/estallido", at("volcán") + 0.02, 1.3, 0.6, 0.4)
    put("gta6/raja", at("partió") + 0.05, 0.8, 0.45, 0.25)
    put("quimica/apagado", at("país", 1, 11) - 0.05, 1.0, 0.45, 0.3)
    # 12: vuelve a Brasil; la burbuja sale del mar
    put("avion/whoosh_largo", 49.85, 1.2, 0.35, 0.4)
    put("lanzamiento/burbuja", 51.25, 0.5, 0.4, 0.15)
    # 13: ¿satélite o cable?; el mensaje llega al móvil (igual que al principio: bucle)
    put("avion/pregunta", at("satélite") - 0.05, 1.0, 0.35, 0.3)
    put("lanzamiento/mensaje", 56.3, 0.6, 0.55, 0.2)
    put("robot_neuronas/zumbido", 56.35, 0.45, 0.35, 0.1)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "whatsapp_mar.mp4")):
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
