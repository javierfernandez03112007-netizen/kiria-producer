"""Compone «29N: el debate a cuatro» (jueves 26-11-2026; vídeo del viernes 27, serie explicativa y neutral):
fotogramas 3D a 60 fps (out/frames; los candidatos son sus FOTOS REALES en pantallas, ver ../elecciones_29n_ep1/retratos.py y FUENTES.md)
+ subtítulos en Impact (arriba; los nombres, en el color de su partido; las frases de los ataques en dorado y las cifras en cian, igual para los
cuatro) + la voz de Javi (tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx). Sin música.

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/elecciones_29n_debate/compose_debate.py [--test t1 t2 ...] [--sfx]
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


# ---------------------------------------------------------------- subtítulos: mismo trato en los cuatro capítulos (siglas en el color del partido; tema en ámbar; medidas en dorado y cian)
GO, R, WH, GR, CY, AM = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547"
PPC, PSC, VXC, FAC = "#4FA8F0", "#FF4A55", "#7ADB45", "#FF7A45"          # los colores de cada partido, algo aclarados para que se lean
_K = {1: {"anoche": CY, "cuatro": CY, "árbitros": GO, "baloncesto": GO},
      2: {"diez": CY, "millones": CY, "cinco": CY, "bloques": CY, "veinte": CY, "minutos": CY},
      3: {"colau": FAC, "condenar": GO, "cuarenta": CY, "nueve": CY, "asesinatos": CY, "machistas": CY, "sánchez": PSC, "feijóo": PPC, "sumaron": GO, "abascal": VXC},
      4: {"ataques": GO, "dos": CY, "cada": CY},
      5: {"feijóo": PPC, "sánchez": PSC, "pizza": GO, "cojonuda": GO, "dos": CY, "mil": CY, "diez": CY, "precios": CY},
      6: {"colau": FAC, "feijóo": PPC, "buena": GO, "gestión": GO, "pp": PPC, "aforado": CY, "mazón": CY},
      7: {"feijóo": PPC, "colau": FAC, "usted": GO, "calladita": GO, "sánchez": PSC, "machista": CY, "paiporta": CY},
      8: {"abascal": VXC, "buitre": GO, "sánchez": PSC, "fondos": CY, "banda": GO, "guarros": GO, "primarias": CY},
      9: {"sánchez": PSC, "pp": PPC, "vox": VXC, "motosierra": GO, "ciento": CY, "doce": CY, "mil": CY, "millones": CY},
      10: {"feijóo": PPC, "abascal": VXC, "único": GO, "mili": GO, "juró": GO, "bandera": GO, "servicio": CY, "militar": CY},
      11: {"colau": FAC, "abascal": VXC, "vergüenza": GO, "insultos": CY},
      12: {"dato": CY, "sánchez": PSC, "colau": FAC, "tutearon": GO, "feijóo": PPC, "abascal": VXC, "apenas": CY},
      13: {"ganó": GO, "ley": CY, "encuestas": CY, "domingo": GO, "decides": GO, "tú": GO},
      14: {"mándaselo": GR, "debate": GO}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    src = os.path.join(FRAMES, f"f{fi:05d}.jpg")
    if HALF and not os.path.exists(src):               # vista previa a 30 fps: si falta un fotograma impar, se repite el par anterior
        src = os.path.join(FRAMES, f"f{fi - fi % 2:05d}.jpg")
    img = cv2.imread(src).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    k = prog(t, NOTE_T[0], 0.3) * (1 - prog(t, NOTE_T[1], 0.3))       # aviso discreto cuando aparecen las fotos: es un plató virtual, no una imagen de un acto real
    if k > 0.01:
        rgb, a = NOTE
        paste(img, (rgb, a * k), W / 2, 196)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS, NOTE, NOTE_T
    NOTE = chip("Plató virtual · fotos reales de archivo", 30, "#DCE3EE", "#10141C", "bold")
    NOTE_T = (at("siguieron") - 0.2, at("ataques") + 0.6)      # mientras se ven las cuatro pantallas por primera vez: es un plató virtual, no una imagen del debate
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
    # 1: bocina del marcador y el reloj que corre; aparecen los cuatro relojes de posesión; «baloncesto»: dos botes
    put("lanzamiento/marcador", 0.0, 0.5, 0.34, 0.15)
    put("lanzamiento/tictac", 0.4, max(0.5, at("candidatos") - 0.5), 0.2, 0.3)
    for i in range(4):
        put("avion/tap", at("cuatro", 1, 1) - 0.1 + 0.12 * i, 0.25, 0.22, 0.1)
    put("gafas/rebote", at("baloncesto") - 0.05, 0.5, 0.3, 0.15)
    put("gafas/rebote", at("baloncesto") + 0.4, 0.4, 0.22, 0.15)
    # 2: el marcador enseña la audiencia (cuenta hasta 10,2 M) y los cinco bloques
    put("avion/whoosh", Le[0] + 0.05, 0.6, 0.22, 0.25)
    put("economia/panel", at("siguieron") - 0.1, 0.6, 0.26, 0.2)
    put("cripto/contador", at("diez", 1, 2) - 0.15, 0.9, 0.24, 0.25)
    for i in range(5):
        put("avion/tap", at("cinco") + (at("inmigración") + 0.1 - at("cinco")) * i / 5, 0.25, 0.2, 0.1)
    # 3: el arranque: la petición de Colau (49) y quién se sumó
    put("economia/panel", L[2] - 0.1, 0.6, 0.24, 0.2)
    put("avion/cifra", at("cuarenta") - 0.05, 0.5, 0.26, 0.2)
    put("cripto/check", at("sánchez", 1, 3) - 0.1, 0.45, 0.26, 0.15)
    put("avion/pop", at("abascal", 1, 3) - 0.1, 0.4, 0.24, 0.15)
    # 4: «ocho ataques, dos de cada uno»
    put("lanzamiento/marcador", L[3] - 0.1, 0.5, 0.3, 0.15)
    put("avion/cifra", at("ataques") - 0.05, 0.5, 0.26, 0.2)
    # 5-11: cada ataque: el reloj del que habla empieza a correr, el haz va de su pantalla a la del atacado y el marcador cambia
    def ataque(tb, tq, n=1):
        put("lanzamiento/laser", tb - 0.05, 0.7, 0.24, 0.2)
        for k in range(n):
            put("avion/impacto", tb + 0.42 + 0.1 * k, 0.5, 0.24, 0.2)
        put("economia/panel", tq - 0.12, 0.6, 0.24, 0.2)
    for li in range(5, 12):
        put("cripto/reloj", L[li - 1] - 0.05, 1.2, 0.14, 0.4)
    ataque(at("pizza") - 0.35, at("pizza") - 0.2)
    put("avion/pop", at("tuiteó") - 0.12, 0.4, 0.22, 0.15)
    ataque(at("gestión") - 0.35, at("gestión") - 0.35)
    put("avion/pop", at("mantiene") - 0.12, 0.4, 0.22, 0.15)
    ataque(at("usted") - 0.25, at("usted"))
    put("lanzamiento/voltea", at("sánchez", 1, 7) - 0.12, 0.5, 0.26, 0.15)
    put("avion/pop", at("feijóo", 2, 7) - 0.12, 0.4, 0.24, 0.15)
    ataque(at("buitre") - 0.25, at("buitre"))
    put("avion/pop", at("fondos") - 0.12, 0.4, 0.22, 0.15)
    ataque(at("banda") - 0.2, at("banda"))
    ataque(at("gobernar") - 0.1, at("motosierra") - 0.3, 2)
    ataque(at("feijóo", 1, 10) - 0.1, at("único"), 2)
    put("lanzamiento/voltea", at("abascal", 2, 10) - 0.12, 0.5, 0.24, 0.15)
    ataque(at("abascal", 1, 11) - 0.1, at("vergüenza"))
    # 12: el dato: el arco Sánchez–Colau («TÚ») y el gris Feijóo–Abascal («…»)
    put("avion/whoosh", at("tutearon") - 0.35, 0.6, 0.22, 0.25)
    put("cripto/check", at("tutearon") + 0.1, 0.45, 0.28, 0.15)
    put("avion/whoosh", at("feijóo", 1, 12) - 0.05, 0.6, 0.16, 0.25)
    put("avion/pop", at("apenas") - 0.05, 0.4, 0.22, 0.15)
    # 13: ¿quién ganó?: interrogaciones en los relojes; encuestas prohibidas; lo decides tú
    put("avion/pregunta", at("ganó") - 0.2, 0.95, 0.3, 0.3)
    put("avion/sello", at("ley") - 0.12, 0.5, 0.32, 0.2)
    put("avion/ding", at("decides") - 0.1, 0.7, 0.28, 0.3)
    # 14: mándaselo; vuelve el reloj del marcador a 20:00 y la bocina (enlaza con el principio)
    put("lanzamiento/enviado", at("mándaselo") - 0.05, 0.6, 0.3, 0.25)
    put("avion/whoosh_largo", at("mándaselo") + 0.3, 1.1, 0.2, 0.4)
    put("lanzamiento/marcador", E - 0.55, 0.5, 0.26, 0.15)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "elecciones_29n_debate.mp4")):
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
