"""Compone «Magisterio por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que llega en dorado, el bulo y los suspensos en rojo) + la voz de Javi (ElevenLabs, Danny) + efectos SOLO de ElevenLabs, uno por
suceso y cortados cuando el suceso termina (sin ambiente ni sonidos sintetizados).

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/magisterio/compose_mag.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"magisterio": GO, "collares": WH, "macarrones": GO, "verdad": GO},
      2: {"sirven": R, "final": WH},
      3: {"jugar": R, "niños": WH, "realidad": WH, "aprende": GO, "cerebro": GO},
      4: {"psicología": GO, "edad": WH},
      5: {"matemáticas": GO, "sumar": WH, "contar": WH},
      6: {"lengua": GO, "leer": WH, "letra": WH},
      7: {"dislexia": WH, "tdah": WH, "autismo": GO, "misma": GO, "clase": GO},
      8: {"meses": GO, "prácticas": WH, "colegio": WH},
      9: {"fácil": R, "cataluña": WH, "mitad": R, "suspendió": R, "examen": WH},
      10: {"oposición": GO, "canarias": WH, "diecinueve": R, "plaza": GO, "infantil": WH},
      11: {"veinticinco": GO, "niños": WH, "tres": WH, "tú": GO},
      12: {"macarrones": GO, "ensartarlos": WH, "pinza": GO, "dedos": WH, "escribir": GO},
      13: {"blanco": WH, "negro": WH, "serie": GO, "estudio": WH, "cuatro": WH, "matemáticas": GO, "once": GO},
      14: {"cerebro": WH, "millón": GO, "conexiones": GO, "segundo": WH},
      15: {"sí": GO, "magisterio": WH, "collares": WH, "macarrones": WH, "sabiendo": GO, "qué": GO},
      16: {"mándaselo": GO, "fácil": R, "infantil": WH, "primaria": GO}}
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

    # 1: la chispa del collar; la cámara se aleja; el sello «ES VERDAD»
    put("chispa", 0.0, 0.6, 0.35, 0.2)
    put("whoosh", at("collares") - 0.05, 0.6, 0.25)
    put("sello", at("verdad") - 0.02, 0.45, 0.8)
    # 2: los macarrones forman la «?»
    put("macarrones_q", at("para") + 0.3, 0.6, 0.7)
    # 3: la clase; a la pizarra; la tiza dibuja el cerebro
    put("whoosh_largo", at("crees") - 0.05, 0.9, 0.3, 0.2)
    put("whoosh", at("realidad") + 0.1, 0.7, 0.3)
    put("tiza_dibujo", at("aprender", 1, 3) - 0.05, span(at("aprender", 1, 3) - 0.05, at("cerebro", 1, 3) + 0.25), 0.7, 0.1)
    # 4: tallímetro: los niños de 1, 3 y 6 años
    put("whoosh", at("psicología") - 0.25, 0.55, 0.3)
    for w in ("aprender", "niño", "edad"):
        put("madera_toc", at(w, 1, 4) - 0.1, 0.35, 0.6)
    # 5: el ábaco suma 2 + 3; se cuentan 1…5
    put("whoosh", at("matemáticas", 1, 5) - 0.4, 0.55, 0.3)
    put("abaco", at("sumar") - 0.05, 0.62, 0.8)
    for i in range(5):
        put("cuenta", at("contar") - 0.1 + i * 0.07, 0.15, 0.5)
    # 6: se abre el cuento; caen las letras de pasta
    put("whoosh", at("lengua") - 0.4, 0.55, 0.3)
    put("libro", at("enseñar", 1, 6), 0.5, 0.6)
    for t0 in (at("letra", 1, 6) - 0.08, at("letra", 1, 6) + 0.12, at("letra", 1, 6) + 0.32, at("letra", 2, 6) - 0.04):
        put("letra", t0, 0.25, 0.6)
    # 7: b/d se dan la vuelta; la peonza gira hasta que nos vamos; el ∞ brilla; «en la misma clase»
    put("whoosh", at("dislexia") - 0.35, 0.5, 0.3)
    put("giro", at("dislexia") + 0.05, 0.45, 0.45)
    put("peonza", at("tdah") - 0.05, span(at("tdah") - 0.05, at("meses") - 0.3), 0.35, 0.25)
    put("brillo", at("autismo") - 0.05, 0.8, 0.45, 0.2)
    put("whoosh_largo", at("misma") - 0.05, 0.8, 0.3, 0.2)
    # 8: pasan los meses; la tarjeta de prácticas; el timbre del colegio
    put("whoosh", at("meses") - 0.45, 0.5, 0.3)
    put("calendario", at("meses"), 0.95, 0.7)
    put("tarjeta", at("prácticas") - 0.05, 0.4, 0.5)
    put("timbre", at("colegio"), 0.7, 0.3, 0.2)
    # 9: la tiza escribe «¿FÁCIL?» y «CATALUÑA · 2026», dibuja los 100 y tacha 45; el 45,5 %
    put("whoosh", at("fácil", 1, 9) - 0.45, 0.55, 0.3)
    put("tiza_escribir", at("fácil", 1, 9) - 0.05, 0.45, 0.6)
    put("tiza_escribir", at("cataluña"), 0.5, 0.5, 0.08, 0.3)
    put("tiza_palitos", at("este") - 0.05, span(at("este") - 0.05, at("casi", 1, 9) + 0.15), 0.55)
    put("tiza_tachar", at("mitad"), span(at("mitad"), at("examen") + 0.1), 0.7)
    put("impacto", at("mitad") - 0.05, 0.6, 0.45, 0.2)
    # 10: el temario; entran los 19 muñecos; brilla la sillita dorada
    put("whoosh", at("oposición") - 0.45, 0.5, 0.3)
    put("carpeta", at("oposición") - 0.05, 0.35, 0.6)
    put("munecos", at("diecinueve") - 0.12, 0.6, 0.6)
    put("brillo", at("plaza") - 0.05, 0.8, 0.5, 0.2)
    # 11: la clase desde la mesa de la maestra; aparecen los 25 niños; «y tú» (latido)
    put("whoosh_largo", at("infantil", 1, 10) + 0.3, 0.7, 0.3, 0.2)
    put("munecos", at("veinticinco") - 0.1, 0.5, 0.6, 0.08, 0.1)
    put("latido", at("y", 2, 11), 0.55, 0.8, 0.15)
    # 12: los macarrones vuelven al cuenco; ensartar; la pinza; el lápiz escribe
    put("whoosh_largo", at("y", 1, 12) - 0.05, 0.8, 0.3, 0.2)
    put("cuenco", at("macarrones", 1, 12) + 0.15, 0.55, 0.6)
    put("ensartar", at("ensartarlos") + 0.05, 0.4, 0.6)
    put("clic", at("pinza") + 0.05, 0.2, 0.45)
    put("lapiz", at("escribir") - 0.05, 0.9, 0.75)
    # 13: cada macarrón que entra en la serie; «primera serie»; el estudio; a la pizarra: matemáticas de 11 años
    for ts in [at("negro") - 0.12] + [at("negro") + 0.12 + k * 0.1 for k in range(6)]:
        put("ensarte_clic", ts + 0.3, 0.15, 0.45)
    put("ding", at("serie") - 0.05, 0.45, 0.4)
    put("papel", at("según") - 0.05, 0.3, 0.4)
    put("whoosh_largo", at("predice") - 0.05, 0.75, 0.35, 0.2)
    put("tiza_escribir", at("predice"), span(at("predice"), at("matemáticas", 1, 13) + 0.55), 0.55)
    put("tiza_escribir", at("once") - 0.05, 0.4, 0.5, 0.08, 0.4)
    # 14: la red de conexiones crece; el millón
    put("whoosh", at("primeros") - 0.45, 0.55, 0.3)
    put("red", at("crea") - 0.25, span(at("crea") - 0.25, at("segundo") + 0.4), 0.5, 0.3)
    put("brillo", at("millón") + 0.15, 0.8, 0.5, 0.2)
    # 15: vuelta al collar; «SÍ»; «sabiendo por qué»
    put("whoosh_largo", at("así") - 0.1, 1.0, 0.35, 0.25)
    put("sello", at("sí", 1, 15) - 0.03, 0.4, 0.7)
    put("brillo", at("sabiendo") + 0.05, 0.9, 0.55, 0.25)
    # 16: el avión de papel; ¿Infantil o Primaria?; la chispa del bucle
    put("avion", at("mándaselo") - 0.05, 0.6, 0.5, 0.15)
    put("pop", at("infantil", 1, 16) - 0.1, 0.2, 0.45)
    put("pop", at("primaria") - 0.1, 0.2, 0.45)
    put("chispa", END - 0.7, 0.6, 0.3, 0.2)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "magisterio.mp4")):
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
