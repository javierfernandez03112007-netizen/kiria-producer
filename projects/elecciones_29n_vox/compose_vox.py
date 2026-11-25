"""Compone «29N: Vox» (elecciones generales del 29-11-2026, serie explicativa y neutral; capítulo de un partido):
fotogramas 3D a 60 fps (out/frames; los candidatos son sus FOTOS REALES en pantallas, ver ../elecciones_29n_ep1/retratos.py y FUENTES.md)
+ subtítulos en Impact (arriba; las siglas, en el color del partido; el tema de cada medida en ámbar y las medidas con los mismos dos colores
que en los demás capítulos: dorado y cian) + la voz de Javi (tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal
(projects/*/assets/sfx). Sin música.

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/elecciones_29n_vox/compose_vox.py [--test t1 t2 ...] [--sfx]
    HALF=1 python3 …/compose_vox.py out/previa_30fps.mp4     (vista previa con solo los fotogramas pares)
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
_K = {1: {"pensiones": GO, "constitución": GO, "doscientos": CY, "diez": CY, "diputados": CY},
      2: {"ningún": R, "nunca": R, "récord": GO, "doscientos": CY, "dos": CY},
      3: {"psoe": PSC, "quinientas": GO, "cuatro": CY},
      4: {"vivienda": AM, "uno": GO, "ciento": GO, "pib": GO, "cien": CY, "mil": CY, "pisos": CY, "públicos": CY},
      5: {"trabajo": AM, "treinta": GO, "siete": GO, "horas": GO, "media": GO, "salario": CY, "mínimo": CY, "ley": CY, "sesenta": CY, "ciento": CY},
      6: {"familias": AM, "paga": GO, "crianza": GO, "ocho": CY, "millones": CY, "niños": CY, "cuánto": GO, "no": R, "dice": R},
      7: {"estudiantes": AM, "primer": GO, "curso": GO, "gratis": GO, "doscientos": CY, "euros": CY, "dentista": CY},
      8: {"dinero": AM, "impuestos": GO, "nuevos": GO, "grandes": CY, "patrimonios": CY, "especula": CY},
      9: {"próximo": CY, "capítulo": CY, "vox": VXC, "irpf": GO, "hijos": GO, "cuánto": GO},
      10: {"mándaselo": GR, "jubila": GO, "pronto": GO}}
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
    NOTE_T = (at("ningún") - 0.2, at("programa") - 0.25)      # desde que se ven las cuatro pantallas hasta que la cámara ya está delante de la del partido
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
    # 1: el candado de combinación: las ruedas giran; el hemiciclo cuenta hasta 210 y las tres cifras se paran en 2-1-0
    put("medicina/candado", 0.0, 0.5, 0.34, 0.15)
    put("cerradura/pitones", 0.32, 0.8, 0.26, 0.25)
    put("cripto/contador", at("hacen") - 0.1, 1.04, 0.24, 0.2)
    for i in range(3):
        put("cerradura/blip", at("doscientos", 1, 1) - 0.35 + 0.22 * i, 0.3, 0.2 + 0.03 * i, 0.1)
    # 2: el récord (202): faltan 8 escaños, que parpadean; las cifras pasan a 2-0-2 y el arco baja, choca y no cierra
    put("cerradura/aviso", at("récord") - 0.12, 0.6, 0.28, 0.2)
    put("cerradura/blip", at("doscientos", 1, 2) + 0.29, 0.3, 0.2, 0.1)          # ruedan la segunda y la tercera cifra (la primera ya es un 2)
    put("cerradura/blip", at("doscientos", 1, 2) + 0.43, 0.3, 0.22, 0.1)
    put("cerradura/choca", at("dos", 1, 2) + 0.0, 0.3, 0.4, 0.12)                  # el arco baja y choca en «dos»…
    put("cerradura/denegado", at("dos", 1, 2) + 0.3, 0.4, 0.26, 0.15)              # …y rebota: no cierra
    # 3: la cámara baja al atril del partido; el libro del programa; las cuatro fichas
    put("avion/whoosh", Le[1] + 0.25, 0.6, 0.24, 0.25)
    put("magisterio/libro", at("programa") - 0.12, 0.6, 0.3, 0.2)
    for i in range(4):
        put("avion/tap", at("cuatro", 1, 3) - 0.05 + 0.1 * i, 0.25, 0.2 + 0.03 * i, 0.1)
    # 4 · vivienda: el montón del PIB, la moneda que sale (el 1 %) y los bloques que suben
    put("cripto/monedas", at("uno", 1, 4) - 0.1, 0.75, 0.26, 0.25)
    put("economia/moneda_sola", at("pib") - 0.1, 0.8, 0.28, 0.3)
    put("gta6/edificios", at("cien") - 0.1, 1.3, 0.26, 0.3)
    # 5 · trabajo: las 16 casillas de la jornada; se va una (37,5 h); las dos barras del salario, el sello «LEY» y la raya del 60 %
    put("economia/barras", at("jornada") - 0.08, 0.6, 0.28, 0.2)
    put("lanzamiento/desliza", at("treinta", 1, 5) + 0.1, 0.5, 0.3, 0.15)
    put("avion/pop", at("treinta", 1, 5) + 0.32, 0.4, 0.26, 0.15)
    put("avion/pop", at("salario") - 0.15, 0.4, 0.26, 0.15)
    put("avion/sello", at("ley") - 0.08, 0.5, 0.3, 0.2)
    put("avion/sube", at("sesenta") - 0.25, 0.7, 0.28, 0.25)
    put("avion/ding", at("sesenta") + 0.3, 0.7, 0.28, 0.3)
    # 6 · familias: el biberón, los tres cubos, los 8 millones y «cuánto, no lo dice»
    put("avion/pop", at("paga") - 0.05, 0.4, 0.28, 0.15)
    for i in range(3):
        put("magisterio/madera_toc", at("crianza") - 0.05 + 0.12 * i, 0.25, 0.28, 0.1)
    put("avion/cifra", at("ocho") - 0.05, 0.5, 0.3, 0.2)
    put("avion/pregunta", at("cuánto", 1, 6) - 0.08, 0.95, 0.3, 0.3)
    # 7 · estudiantes: los libros y el birrete, el «0 €»; la muela y los 200 €
    put("magisterio/libro", L[6] - 0.08, 0.6, 0.28, 0.2)
    put("avion/pop", at("primer") - 0.05, 0.4, 0.26, 0.15)
    put("cripto/check", at("gratis") - 0.08, 0.45, 0.32, 0.15)
    put("avion/pop", at("ayuda") - 0.25, 0.4, 0.28, 0.15)
    put("economia/moneda_sola", at("doscientos", 1, 7) - 0.08, 0.8, 0.28, 0.3)
    # 8: ¿y con qué dinero? (la moneda gira); el rótulo cambia; la caja fuerte y la casa con su «%»
    put("economia/giro", L[7] - 0.08, 0.5, 0.3, 0.15)
    put("avion/pregunta", at("dinero") - 0.3, 0.95, 0.26, 0.3)
    put("lanzamiento/voltea", at("impuestos") - 0.1, 0.5, 0.3, 0.15)
    put("cerradura/clunk", at("grandes") - 0.1, 0.5, 0.32, 0.2)
    put("avion/pop", at("especula") - 0.1, 0.4, 0.28, 0.15)
    put("avion/tap", at("especula") + 0.15, 0.3, 0.26, 0.1)
    # 9: abre a las cuatro pantallas; «PRÓXIMO CAPÍTULO»; se enciende la del siguiente y la cámara va a su atril: el rótulo y la tabla
    put("avion/whoosh_largo", Le[7] + 0.05, 1.1, 0.2, 0.4)
    put("robo_banco/titulo", at("próximo") + 0.1, 1.2, 0.28, 0.4)
    put("ade/letrero_on", at("vox") - 0.3, 0.9, 0.22, 0.3)
    put("avion/whoosh", at("vox") + 0.12, 0.6, 0.22, 0.25)
    put("avion/pop", at("promete") - 0.1, 0.4, 0.28, 0.15)
    put("lanzamiento/tarjeta", at("irpf") - 0.15, 0.5, 0.3, 0.15)
    put("avion/pregunta", at("cuánto", 1, 9) - 0.05, 0.95, 0.3, 0.3)
    # 10: mándaselo; la cámara sube otra vez al candado y las ruedas vuelven a girar (enlaza con el principio)
    put("lanzamiento/enviado", at("mándaselo") - 0.05, 0.6, 0.3, 0.25)
    put("avion/whoosh_largo", at("mándaselo") + 0.3, 1.1, 0.2, 0.4)
    put("cerradura/pitones", E - 0.85, 0.8, 0.24, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "elecciones_29n_vox.mp4")):
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
