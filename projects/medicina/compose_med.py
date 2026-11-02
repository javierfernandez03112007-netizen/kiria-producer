"""Compone «Medicina por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(cifras y lo que importa en dorado, lo que falla o no se puede en rojo, Dermatología en celeste, residencia y quirófano en verde)
+ la voz de Javi (su MP3, ElevenLabs, Danny) + efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/medicina/compose_med.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"4": GO, "100": GO, "dermatólogos": BL},
      2: {"ninguno": R, "especialista": WH, "carrera": WH, "falta": R},
      3: {"memorizar": WH, "huesos": WH, "encontrar": GO, "falla": R, "dentro": GO},
      4: {"sano": GR, "anatomía": WH, "fisiología": R, "bioquímica": GO},
      5: {"falla": R, "patología": WH, "microbiología": GR, "farmacología": BL},
      6: {"tercero": GO, "clínicas": WH, "corazón": R, "cerebro": WH, "niños": GO},
      7: {"sexto": GO, "hospital": WH},
      8: {"falta": R, "mir": GO, "200": GO, "media": WH, "fallo": R, "resta": R},
      9: {"15.000": WH, "9.000": GO, "plazas": GO, "número": GO, "especialidad": WH, "ciudad": WH},
      10: {"dermatología": BL, "agotó": R, "500": BL},
      11: {"residencia": GO, "cobrando": GR, "guardias": AM},
      12: {"seis": WH, "cinco": TE, "once": GO, "cirujano": TE},
      13: {"guárdalo": GO, "quirófano": TE, "consulta": GO}}
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

    # 1: el martillo golpea, caen 97 figuritas, brillan las 3 que quedan
    put("golpe", 0.27, 0.8, 0.75, 0.25)
    put("caen", 0.42, 1.1, 0.55, 0.3)
    put("brillo", at("4") - 0.05, 0.8, 0.4, 0.3)
    # 2: la vitrina sube y se cierra; el diploma; «¿qué te falta?»
    put("vitrina", at("y", 1, 2) - 0.1, 0.8, 0.5, 0.2)
    put("candado", at("ninguno") + 0.05, 0.4, 0.45)
    put("diploma", at("carrera") - 0.1, 0.6, 0.5, 0.2)
    put("whoosh", at("final") - 0.2, 0.5, 0.25)
    # 3: libros, hojas que pasan, huesos; vuelan los libros y se enciende el negatoscopio; «aquí falla»; a la lámina
    put("whoosh", at("crees") - 0.1, 0.5, 0.25)
    put("paginas", at("memorizar") - 0.05, 0.9, 0.5, 0.25)
    put("huesos", at("huesos") - 0.1, 0.5, 0.55)
    put("vuelan", at("realidad") - 0.15, 0.7, 0.45, 0.2)
    put("negatoscopio", at("realidad") + 0.05, 0.7, 0.45, 0.2)
    put("hallazgo", at("falla", 1, 3) - 0.03, 0.5, 0.5, 0.2)
    put("zambullida", at("dentro", 1, 3), 0.8, 0.45, 0.25)
    # 4: cráneo, latido, glucosa
    put("pop", at("cuerpo") - 0.1, 0.35, 0.45)
    put("huesos", at("anatomía") - 0.05, 0.4, 0.4)
    put("latido", at("fisiología"), 0.8, 0.6, 0.2)
    put("pop", at("bioquímica") - 0.1, 0.35, 0.45)
    # 5: microscopio, placa de Petri, fármacos
    put("whoosh", at("luego") - 0.05, 0.5, 0.25)
    put("microscopio", at("patología") - 0.1, 0.5, 0.5)
    put("petri", at("microbiología") - 0.05, 0.7, 0.45, 0.2)
    put("pastillas", at("farmacología") - 0.1, 0.6, 0.5, 0.2)
    # 6: clínicas: monitor, cerebro, osito
    put("whoosh", at("desde") - 0.05, 0.5, 0.25)
    put("pop", at("clínicas") - 0.1, 0.35, 0.4)
    put("monitor", at("corazón") - 0.1, 0.7, 0.45, 0.2)
    put("pop", at("cerebro") - 0.1, 0.35, 0.45)
    put("peluche", at("niños") - 0.05, 0.4, 0.45)
    # 7: el hospital
    put("whoosh", at("sexto") - 0.25, 0.5, 0.25)
    put("busca", at("hospital") - 0.1, 0.5, 0.4)
    # 8: el MIR: el lápiz rellena, el reloj corre, el fallo resta
    put("whoosh", at("falta", 1, 8) - 0.05, 0.5, 0.25)
    put("lapiz", at("200") - 0.05, span(at("200") - 0.05, at("media") + 0.2), 0.45, 0.2)
    put("reloj", at("cuatro", 1, 8) - 0.1, span(at("cuatro", 1, 8) - 0.1, at("media") + 0.35), 0.4, 0.15)
    put("fallo", at("fallo") - 0.05, 0.45, 0.55)
    # 9: el campo de los 15.000, las plazas en dorado, tu número
    put("whoosh_largo", at("más") - 0.15, 0.9, 0.3, 0.25)
    put("campo", at("15.000") - 0.1, 1.2, 0.5, 0.3)
    put("dorado", at("9.000") - 0.05, 0.8, 0.45, 0.25)
    put("numero", at("número", 1, 9), 0.5, 0.45)
    # 10: Dermatología, agotada antes del 500
    put("whoosh", at("este") - 0.1, 0.5, 0.25)
    put("brillo", at("dermatología"), 0.7, 0.35, 0.25)
    put("sello", at("agotó") - 0.05, 0.45, 0.6)
    # 11: residencia: escalones, nómina, guardias
    put("whoosh_largo", at("y", 1, 11) - 0.15, 0.8, 0.3, 0.25)
    put("escalones", at("cuatro", 1, 11) - 0.1, span(at("cuatro", 1, 11) - 0.1, at("residencia", 1, 11) + 0.6), 0.45, 0.2)
    put("monedas", at("cobrando") - 0.05, 0.7, 0.5, 0.2)
    put("guardia", at("guardias") - 0.1, 0.6, 0.45, 0.2)
    # 12: los once libros y el cirujano
    put("whoosh", at("seis") - 0.3, 0.5, 0.25)
    put("libros", at("seis") - 0.1, 0.6, 0.5, 0.15)
    put("libros", at("cinco", 1, 12) - 0.1, 0.5, 0.5, 0.15, 0.6)
    put("brillo", at("once"), 0.9, 0.45, 0.3)
    put("instrumental", at("cirujano") - 0.1, 0.5, 0.45)
    # 13: guárdalo; quirófano o consulta; vuelta al martillo (bucle)
    put("whoosh", at("si", 1, 13) - 0.1, 0.5, 0.25)
    put("marcador", at("guárdalo") - 0.05, 0.4, 0.45)
    put("lampara", at("quirófano") - 0.1, 0.5, 0.45)
    put("teclado", at("consulta") - 0.1, 0.5, 0.4)
    put("whoosh_largo", END - 1.1, 1.0, 0.3, 0.25)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "medicina.mp4")):
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
