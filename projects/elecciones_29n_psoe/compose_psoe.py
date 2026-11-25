"""Compone «29N, capítulo 0: los cuatro en sus atriles» (elecciones generales del 29-11-2026, serie explicativa y neutral):
fotogramas 3D a 60 fps (out/frames; los candidatos son sus FOTOS REALES en pantallas, ver retratos.py y FUENTES.md)
+ subtítulos en Impact (arriba; el apellido y las siglas de cada uno, en el color de su partido; las medidas, todas con los mismos dos colores)
+ la voz de Javi (tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx). Sin música.

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/elecciones_29n_psoe/compose_psoe.py [--test t1 t2 ...] [--sfx]
    HALF=1 python3 …/compose_psoe.py out/previa_30fps.mp4     (vista previa con solo los fotogramas pares)
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
from engine.fin_draw import prog, hex_bgr, chip, paste  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.environ.get("FRAMES_DIR", os.path.join(ROOT, "out", "frames"))
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
HALF = bool(os.environ.get("HALF"))                    # HALF=1: vista previa con solo los fotogramas pares (30 fps reales)
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


# ---------------------------------------------------------------- subtítulos: mismo trato para los cuatro (nombre y siglas en el color del partido; medidas en dorado y cian)
GO, R, WH, GR, CY, AM = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547"
PPC, PSC, VXC, FAC = "#4FA8F0", "#FF4A55", "#7ADB45", "#FF7A45"          # los colores de cada partido, algo aclarados para que se lean
_K = {1: {"domingo": GO, "no": R, "presidente": GO},
      2: {"trescientos": CY, "cincuenta": CY, "diputados": CY, "ellos": GO},
      3: {"más": AM, "cuatro": GO, "jueves": GO, "dos": CY, "medidas": CY},
      4: {"feijóo": PPC, "pp": PPC, "millón": GO, "viviendas": GO, "iva": CY, "cuarenta": CY},
      5: {"sánchez": PSC, "psoe": PSC, "uno": GO, "ciento": GO, "pib": GO, "pensiones": CY, "constitución": CY},
      6: {"abascal": VXC, "vox": VXC, "prohibir": GO, "regularizaciones": GO, "prioridad": CY, "nacional": CY},
      7: {"colau": FAC, "frente": FAC, "amplio": FAC, "treinta": GO, "dos": GO, "horas": GO, "millón": CY, "medio": CY, "públicas": CY},
      8: {"uno": GO, "cuatro": GO, "dieciocho": CY, "treinta": CY, "cinco": CY, "cero": GR, "irpf": GR},
      9: {"quién": GO, "letra": R, "pequeña": R, "mañana": CY, "capítulo": CY, "uno": CY},
      10: {"mándaselo": GR, "votar": GO}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    src = os.path.join(FRAMES, f"f{fi:05d}.jpg")
    if HALF and not os.path.exists(src):               # vista previa a 30 fps: si falta un fotograma impar, se repite el par anterior
        src = os.path.join(FRAMES, f"f{fi - fi % 2:05d}.jpg")
    img = cv2.imread(src).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    k = prog(t, NOTE_T[0], 0.3) * (1 - prog(t, NOTE_T[1], 0.3))       # aviso discreto mientras se ve el plató entero: no es una imagen del debate
    if k > 0.01:
        rgb, a = NOTE
        paste(img, (rgb, a * k), W / 2, 196)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS, NOTE, NOTE_T
    NOTE = chip("Plató virtual · fotos reales de archivo", 30, "#DCE3EE", "#10141C", "bold")
    NOTE_T = (at("estos") + 0.3, LINES[3]["start"] - 0.5)
    SUBS = Subs(LINES, KEY, {}, y=305, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")   # algo más arriba de lo habitual (330): debajo empieza la pantalla de cada candidato


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

    E = LINES[-1]["end"] + 1.2
    L = [l["start"] for l in LINES]; Le = [l["end"] for l in LINES]
    # 1-2: el sobre cae dentro de la urna; la cámara sale; el hemiciclo cuenta 350 y ellos señalan al presidente
    put("lanzamiento/papel", 0.05, 0.84, 0.3, 0.3)
    put("avion/tap", 0.98, 0.4, 0.26, 0.15)
    put("avion/whoosh", Le[0] + 0.05, 0.6, 0.24, 0.25)
    put("cripto/contador", at("trescientos") - 0.02, 1.04, 0.26, 0.2)
    put("avion/cifra", at("diputados") + 0.22, 0.5, 0.3, 0.2)
    put("avion/ding", at("ellos") + 0.05, 0.8, 0.3, 0.3)
    # 3: los otros atriles se encienden un momento; los cuatro y la cita del jueves en la pantalla
    put("ade/letrero_on", at("hay") + 0.02, 0.9, 0.2, 0.3)
    put("avion/whoosh_largo", at("estos") - 0.2, 1.1, 0.2, 0.4)
    put("economia/pantalla", at("debaten") - 0.3, 0.5, 0.3, 0.2)
    put("cerradura/blip", at("dos") - 0.05, 0.5, 0.22, 0.15)
    put("cerradura/blip", at("dos") + 0.3, 0.5, 0.2, 0.15)
    # 4: Feijóo (PP): casitas que brotan; la casa y el IVA que cambia
    put("avion/whoosh", L[3] - 0.36, 0.6, 0.26, 0.25)
    put("avion/construye", at("construir") - 0.05, 1.35, 0.26, 0.3)
    put("avion/pop", at("bajar") - 0.1, 0.5, 0.3, 0.15)
    put("lanzamiento/voltea", at("menores") - 0.12, 0.5, 0.3, 0.15)
    # 5: Sánchez (PSOE): las monedas del PIB, una se vuelve casa; el libro y el candado
    put("avion/whoosh", Le[3] + 0.05, 0.6, 0.26, 0.25)
    put("cripto/monedas", at("uno", 1, 5) - 0.1, 0.75, 0.26, 0.25)
    put("economia/moneda_sola", at("pib") - 0.08, 0.8, 0.28, 0.3)
    put("avion/pop", at("vivienda", 1, 5) - 0.08, 0.5, 0.3, 0.15)
    put("magisterio/libro", at("blindar") - 0.08, 0.6, 0.3, 0.2)
    put("medicina/candado", at("constitución") + 0.24, 0.5, 0.34, 0.15)
    # 6: Abascal (Vox): el papel y el sello; el «1.º», la casa y la ayuda
    put("avion/whoosh", Le[4] + 0.05, 0.6, 0.26, 0.25)
    put("avion/pop", at("prohibir") - 0.1, 0.5, 0.28, 0.15)
    put("lanzamiento/papel", at("regularizaciones") - 0.1, 0.6, 0.26, 0.2)
    put("avion/sello", at("masivas") + 0.25, 0.5, 0.36, 0.15)
    put("cripto/check", at("prioridad") - 0.08, 0.5, 0.3, 0.15)
    put("avion/pop", at("vivienda", 1, 6) - 0.1, 0.5, 0.26, 0.15)
    put("avion/pop", at("ayudas") - 0.1, 0.5, 0.26, 0.15)
    # 7: Colau (Frente Amplio): la barra de 40 horas se queda en 32; los bloques suben
    put("avion/whoosh", Le[5] + 0.05, 0.6, 0.26, 0.25)
    put("economia/barras", at("jornada") - 0.1, 0.6, 0.28, 0.2)
    put("lanzamiento/desliza", at("treinta", 1, 7) - 0.05, 0.5, 0.3, 0.15)
    put("gta6/edificios", at("millón", 1, 7) - 0.2, 1.3, 0.26, 0.3)
    # 8: abre; la nómina; 18–35 años; IRPF a cero
    put("avion/whoosh_largo", Le[6] + 0.08, 1.1, 0.2, 0.4)
    put("lanzamiento/tarjeta", at("lleva") - 0.14, 0.5, 0.3, 0.15)
    put("avion/pop", at("dieciocho") - 0.1, 0.5, 0.26, 0.15)
    put("economia/cajero", at("cero") - 0.02, 1.0, 0.32, 0.3)
    # 9: ¿quién?; la lupa en la letra pequeña; mañana, capítulo 1
    put("avion/pregunta", at("quién", 1, 9) - 0.05, 0.95, 0.3, 0.3)
    put("medicina/busca", at("letra") - 0.2, 0.6, 0.28, 0.2)
    put("robo_banco/titulo", at("mañana") - 0.08, 1.3, 0.28, 0.4)
    # 10: mándaselo; la cámara baja a la urna y el sobre cae otra vez (enlaza con el principio)
    put("lanzamiento/enviado", at("mándaselo") - 0.05, 0.6, 0.3, 0.25)
    put("avion/whoosh_largo", at("mándaselo") + 0.55, 1.1, 0.2, 0.4)
    put("lanzamiento/papel", E - 0.5, 0.5, 0.26, 0.2)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "elecciones_29n_psoe.mp4")):
    missing = [i for i in range(N) if (i % 2 == 0 or not HALF) and not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
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
    elif len(sys.argv) > 1:
        main(os.path.join(ROOT, sys.argv[1]))
    else:
        main()
