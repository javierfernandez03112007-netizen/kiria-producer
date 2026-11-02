"""Compone «Gafas de esquí: la luz, por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en
Impact (lo naranja en naranja, el espejo y el polarizado en azul, la ultravioleta en violeta, lo que quema o no pasa en rojo) + la voz de
Javi (ElevenLabs, Danny) + efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina (sin ambiente ni sintetizados).

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/gafas/compose_gafas.py [--test t1 t2 ...] [--sfx]
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
OR, BL, VI, YE, RO = "#FF8A2A", "#8FB8FF", "#C9A6FF", "#FFD31A", "#FF7FA6"
_K = {1: {"sol": GO, "dos": GO, "cielo": WH, "suelo": OR},
      2: {"naranjas": OR, "espejo": BL, "final": WH},
      3: {"colores": GO, "ves": WH, "ultravioleta": VI},
      4: {"80": VI, "quema": R, "ojos": R},
      5: {"desmontar": OR},
      6: {"espejo": GO, "finísima": WH, "rebota": GO},
      7: {"lente": VI, "ultravioleta": VI},
      8: {"polarizada": BL, "horizontal": OR, "rejilla": BL, "vertical": BL, "pasar": R},
      9: {"segunda": BL, "aire": BL, "empañe": WH},
      10: {"color": GO, "gris": WH, "espejo": BL, "3": GO, "18": GO},
      11: {"nublados": WH, "naranja": OR, "amarillo": YE, "rosa": RO, "azul": BL, "relieve": OR},
      12: {"moda": R, "decides": GO, "naranjas": OR, "espejo": BL}}
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

    # 1: tiempo congelado; rayos del cielo y del suelo
    put("congelar", 0.0, 0.9, 0.5, 0.3)
    put("rayo", at("cielo") - 0.35, 0.8, 0.45, 0.25)
    put("rebote", at("suelo") - 0.4, 0.7, 0.45, 0.2)
    # 2: a las gafas: naranja → espejo; la pregunta queda arriba
    put("whoosh", at("por", 1, 2) - 0.2, 0.55, 0.3)
    put("cambio", at("espejo", 1, 2) - 0.15, 0.5, 0.55)
    put("panel", at("final", 1, 2), 0.3, 0.35)
    # 3: al cristal de hielo: el rayo blanco, los colores y la ultravioleta
    put("whoosh_largo", at("luz", 1, 3) - 0.3, 0.9, 0.3, 0.25)
    put("rayo", at("luz", 1, 3) + 0.1, 0.7, 0.35, 0.2)
    put("prisma", at("colores") - 0.35, 1.0, 0.55, 0.3)
    put("ultravioleta", at("ultravioleta", 1, 3) - 0.25, 0.9, 0.4, 0.3)
    # 4: la nieve devuelve la ultravioleta: 80 %; el ojo se quema
    put("whoosh", at("nieve", 1, 4) - 0.3, 0.5, 0.25)
    put("rebote", at("devuelve") - 0.1, 0.7, 0.45, 0.2)
    put("contador", at("80") - 0.1, 0.6, 0.4, 0.1)
    put("quemar", at("quema") - 0.1, 0.7, 0.45, 0.25)
    # 5: llegan las gafas grandes y se desmontan
    put("whoosh_largo", at("vamos") - 0.3, 0.9, 0.35, 0.25)
    put("desmontar", at("desmontar") - 0.05, 0.9, 0.6, 0.2)
    # 6: el espejo rebota parte de la luz
    put("rayo", at("fuera") - 0.3, 0.6, 0.3, 0.2)
    put("clic", at("espejo", 1, 6) - 0.1, 0.3, 0.45)
    put("rebote", at("rebota") - 0.1, 0.7, 0.45, 0.2)
    # 7: la lente frena la ultravioleta
    put("clic", at("lente", 1, 7) - 0.1, 0.3, 0.45)
    put("frenar", at("frena") - 0.1, 0.5, 0.5, 0.15)
    # 8: el polarizado: la onda horizontal y la rejilla vertical que la para
    put("clic", at("polarizada") - 0.1, 0.3, 0.45)
    put("onda", at("reflejo") - 0.3, 0.9, 0.35, 0.3)
    put("rejilla", at("rejilla") - 0.1, 0.45, 0.5)
    put("bloqueo", at("deja") - 0.1, 0.6, 0.55, 0.2)
    # 9: la segunda lente, el aire y el vaho que se va
    put("clic", at("segunda") - 0.1, 0.3, 0.45)
    put("aire", at("aire") - 0.1, 0.6, 0.35, 0.2)
    put("vaho", at("empañe") - 0.3, 0.9, 0.45, 0.3)
    # 10: se cierran y miran al sol; lente gris de categoría 3 y los fotones que no pasan
    put("cierre", at("color", 1, 10) - 0.2, 0.8, 0.5, 0.2)
    put("cambio", at("gris") - 0.2, 0.5, 0.5)
    put("fotones", at("categoría") - 0.2, span(at("categoría") - 0.2, at("días") - 0.1), 0.3, 0.35)
    put("ding", at("18") - 0.05, 0.5, 0.3, 0.2)
    # 11: día nublado; naranja, amarillo, rosa; menos azul; la lente entra y vuelve el relieve
    put("nubes", at("días") - 0.4, 1.2, 0.4, 0.4)
    put("cambio", at("naranja", 1, 11) - 0.2, 0.45, 0.5)
    put("cambio", at("amarillo") - 0.15, 0.45, 0.45)
    put("cambio", at("rosa") - 0.15, 0.45, 0.45)
    put("panel", at("frenan") - 0.2, 0.3, 0.35)
    put("whoosh", at("azul") - 0.6, 0.6, 0.25)
    put("barrido", at("vuelves") - 0.3, 0.7, 0.5, 0.2)
    put("brillo", at("relieve") - 0.05, 0.9, 0.45, 0.3)
    # 12: atrás; «la luz que decides no ver»; el duelo naranja contra espejo; vuelta al esquiador (bucle)
    put("whoosh", at("color", 1, 12) - 0.1, 0.6, 0.3)
    put("panel", at("decides") - 0.1, 0.3, 0.4)
    put("duelo", at("tú") - 0.3, 0.7, 0.5, 0.2)
    put("tecla", at("naranjas", 1, 12) - 0.1, 0.25, 0.4)
    put("tecla", at("espejo", 1, 12) - 0.1, 0.25, 0.4)
    put("whoosh_largo", END - 1.0, 0.9, 0.3, 0.25)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "gafas.mp4")):
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
