"""Compone «Derecho por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que llega en dorado, los «ninguno»/«menos» en rojo, la prueba en turquesa) + voz + efectos (el mazo que cae y golpea, las figuritas
que caen, el candado, el diploma, la ola del campo y el contador, las páginas, la balanza, la zambullida en el libro, la piedra, el
bolígrafo, el lacre, las esposas, la huella, la arena, el sello, las monedas, los mazazos de la sentencia, las estrellas, los pasos de la
escalera, el lápiz del test, la toga y la vuelta al centro).

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N      (y trozos en otras máquinas) → ./fetch_compose.sh
    python3 projects/derecho/compose_der.py [--test t1 t2 ...] [--sfx]
"""
import importlib.util
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

_spec = importlib.util.spec_from_file_location("compose_bi", os.path.join(ROOT, "..", "bomberados_ia", "compose_bi.py"))
CB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(CB)

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]
T_HIT = 0.3


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
GO, R, WH, TE = "#FFC24A", "#FF5A4E", "#EEF2F6", "#62E3D4"
_K = {1: {"menos": R, "3": GO, "100": GO, "jueces": GO, "fiscales": GO},
      2: {"ninguno": R, "abogado": GO, "carrera": WH, "falta": R},
      3: {"veintiséis": WH, "mil": WH, "plazas": GO, "menos": R, "seiscientas": GO},
      4: {"memorizar": R, "leyes": WH, "ganar": GO, "discusiones": GO, "dentro": WH},
      5: {"romano": WH, "constitucional": WH, "teoría": WH},
      6: {"civil": GO, "contratos": WH, "herencias": WH, "familia": WH, "leer": R},
      7: {"penal": GO, "delito": TE, "pena": WH, "prueba": TE},
      8: {"administrativo": GO, "ciudadano": GO, "administración": WH},
      9: {"mercantil": GO, "laboral": GO, "despidos": R, "nóminas": WH},
      10: {"procesal": GO, "juicio": WH, "demanda": WH, "sentencia": GO},
      11: {"internacional": GO, "europeo": GO, "españa": GO},
      12: {"abogados": WH, "jueces": WH, "fiscales": WH, "notarios": WH, "ninguno": R, "carrera": R},
      13: {"abogado": GO, "máster": GO, "prácticas": WH, "examen": GO, "colegiarte": GO},
      14: {"juez": GO, "oposición": GO, "test": WH, "dos": WH, "orales": WH, "tribunal": WH, "escuela": GO, "judicial": GO, "barcelona": WH},
      15: {"cuatro": WH, "toga": GO},
      16: {"guárdalo": GO, "abogado": WH, "juez": GO}}
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


# ---------------------------------------------------------------- efectos
_t, _lp = CB._t, CB._lp


def knock(sr, f=170.0, d=0.4, seed=1):            # mazo / sello sobre madera
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    body = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.06 / m)) for m, a in [(1, 1), (2.3, 0.5), (3.9, 0.25)])
    return (body * 0.8 + (_lp(w, 3) - _lp(w, 20)) * np.exp(-t / 0.012) * 0.9) * np.minimum(1, t / 0.0008)


def metal(sr, f=2200.0, d=0.5, seed=2):           # clic metálico (esposas, balanza, candado)
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.09 / m ** 0.7)) for m, a in [(1, 1), (1.47, 0.6), (2.09, 0.4), (2.76, 0.25)])
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (y * 0.35 + (w - _lp(w, 2)) * np.exp(-t / 0.004) * 0.5) * np.minimum(1, t / 0.0005)


def sand(d, sr, seed=3):                          # arena que cae
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (_lp(w, 2) - _lp(w, 12)) * 0.22 * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)


def rumble(d, sr, seed=4):                        # piedra que sube / edificio
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return _lp(w, 60) * 4.0 * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.6


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.45)
    # 1: el mazo cae y golpea; caen las figuritas; quedan 3 (acorde); togas
    mix(sfx.whoosh(0.35), 0.0, 0.8)
    mix(knock(sr, 120, 0.7, 1), T_HIT, 1.0); mix(CB.boom(sr, 1.6, 42), T_HIT, 1.0); mix(metal(sr, 900, 0.5, 9), T_HIT + 0.005, 0.25)
    rng = np.random.default_rng(5)
    for i in range(24):
        mix(sfx.clack(100 + i), T_HIT + 0.08 + rng.uniform(0, 0.55), 0.18)
    mix(CB.chord(sr, (523.25, 659.25, 783.99), 1.2), at("3", 1, 1) + 0.02, 0.3)
    for i in range(3):
        mix(sfx.whoosh(0.25), at("jueces", 1, 1) + i * 0.1, 0.25)
    # 2: se levantan con birrete; la vitrina sube y se cierra; el diploma; la «?»
    for i in range(10):
        mix(sfx.clack(130 + i), at("y", 1, 2) + 0.05 + i * 0.05, 0.15)
    mix(rumble(0.5, sr), at("y", 1, 2) - 0.1, 0.5); mix(metal(sr, 1800, 0.5, 3), at("ninguno") + 0.05, 0.7); mix(CB.buzz(0.25, sr, 110), at("ninguno") + 0.08, 0.3)
    mix(CB.paper(sr, 0.25, 4, 1.2), at("carrera", 1, 2) - 0.05, 0.8); mix(CB.blip(700, 400, 0.18, sr), at("falta", 1, 2), 0.45)
    # 3: la grúa sube; el campo aparece en ola; el contador; el bloque dorado; «menos de seiscientas»
    mix(sfx.whoosh(1.6), at("cada") - 0.1, 0.8)
    for i in range(18):
        mix(sfx.tick(2 + i % 8), at("cada") + 0.05 + i * 0.1, 0.15)
    for i in range(9):
        mix(sfx.tick(i), at("veintiséis") + i * 0.1, 0.22)
    mix(CB.shimmer(1.4, sr, 3), at("plazas") - 0.1, 0.5); mix(CB.chord(sr, (440.0, 554.37, 659.25, 880.0), 1.4), at("plazas") + 0.05, 0.3)
    mix(CB.buzz(0.3, sr, 95), at("menos", 1, 3) + 0.05, 0.35)
    # 4: los códigos suben; las hojas pasan solas; vuelan a la balanza; gana un lado; la zambullida
    mix(sfx.whoosh(1.0), first(4) - 0.4, 0.8)
    for i in range(6):
        mix(knock(sr, 210 + 15 * i, 0.25, 20 + i), at("crees") + 0.05 + i * 0.07, 0.35)
    mix(CB.riffle(1.3, sr, 12, 5), at("memorizar") - 0.05, 0.7)
    for i in range(6):
        mix(sfx.whoosh(0.3), at("realidad") + i * 0.06, 0.25)
    mix(metal(sr, 1400, 0.8, 6), at("ganar") + 0.15, 0.6); mix(knock(sr, 180, 0.35, 7), at("ganar") + 0.3, 0.5)
    mix(sfx.whoosh(1.2), at("así", 1, 4) - 0.1, 1.0); mix(CB.boom(sr, 1.2, 55), 22.28, 0.7); mix(CB.paper(sr, 0.3, 8, 1.3), 22.2, 0.6)
    # 5: columna, Constitución, pirámide
    mix(rumble(0.7, sr, 5), at("derecho", 1, 5) - 0.1, 0.8); mix(knock(sr, 110, 0.4, 8), at("derecho", 1, 5) + 0.25, 0.5)
    mix(knock(sr, 140, 0.35, 9), at("constitucional") + 0.1, 0.7); mix(CB.paper(sr, 0.15, 10, 1.0), at("constitucional") + 0.12, 0.5)
    for i in range(3):
        mix(knock(sr, 200 + 40 * i, 0.3, 30 + i), at("teoría") - 0.05 + i * 0.12, 0.45)
    # transiciones entre estaciones (la cámara vuela)
    for li in (6, 7, 8, 9, 10, 11, 12, 13, 14, 15):
        mix(sfx.whoosh(0.7), first(li) - 0.45, 0.75)
    # 6: contrato y firma; testamento y llave; familia; letra pequeña
    mix(CB.paper(sr, 0.2, 11, 1.0), at("contratos") - 0.1, 0.6)
    for i in range(6):
        mix(CB.marker(sr, 0.12, 40 + i), at("contratos") + 0.12 + i * 0.12, 0.5)
    mix(knock(sr, 150, 0.3, 12), at("herencias") - 0.05, 0.6); mix(metal(sr, 3100, 0.4, 13), at("herencias") + 0.08, 0.4); mix(metal(sr, 3500, 0.4, 14), at("herencias") + 0.2, 0.3)
    for i in range(3):
        mix(CB.blip(500 + 150 * i, 800 + 200 * i, 0.12, sr), at("familia") - 0.05 + i * 0.09, 0.35)
    mix(sfx.whoosh(0.5), at("todo", 1, 6) - 0.1, 0.5)
    # 7: esposas; huella (escáner); marcadores; arena; lupa
    mix(metal(sr, 2400, 0.5, 15), at("penal") - 0.05, 0.8); mix(metal(sr, 2700, 0.5, 16), at("penal") + 0.12, 0.6)
    mix(CB.shimmer(0.8, sr, 17), at("delito") - 0.05, 0.45)
    for i in range(3):
        mix(sfx.clack(150 + i), at("delito") + 0.05 + i * 0.1, 0.4)
    mix(sand(2.4, sr), at("pena", 1, 7), 0.8); mix(sfx.whoosh(0.4), at("prueba") - 0.3, 0.5); mix(CB.blip(900, 1500, 0.14, sr), at("prueba") + 0.05, 0.35)
    # 8: el edificio sube; el sello; el ciudadano
    mix(rumble(0.9, sr, 18), at("administrativo") - 0.25, 0.7)
    mix(knock(sr, 160, 0.45, 19), at("defiende") + 0.07, 1.0); mix(CB.blip(600, 900, 0.12, sr), at("ciudadano") - 0.05, 0.35)
    # 9: torres; la caja del despido; nómina y monedas
    for i in range(3):
        mix(sfx.whoosh(0.4), at("empresas") - 0.4 + i * 0.08, 0.35)
    mix(CB.paper(sr, 0.5, 20, 0.8), at("despidos") + 0.15, 0.6); mix(knock(sr, 130, 0.3, 21), at("despidos") - 0.05, 0.5)
    mix(CB.paper(sr, 0.15, 22, 1.0), at("nóminas") - 0.1, 0.5)
    for i in range(7):
        mix(metal(sr, 3600 + 120 * i, 0.3, 50 + i), at("nóminas") + 0.12 + i * 0.05, 0.25)
    # 10: la sala; la demanda viaja; mazazos de la sentencia
    mix(CB.boom(sr, 0.6, 80), at("procesal") - 0.05, 0.5); mix(sfx.whoosh(0.7), at("demanda"), 0.6)
    mix(knock(sr, 170, 0.45, 23), at("sentencia"), 1.0); mix(knock(sr, 175, 0.45, 24), at("sentencia") + 0.22, 0.8)
    # 11: el globo; las doce estrellas; los arcos
    mix(CB.shimmer(1.2, sr, 25), at("internacional") - 0.2, 0.45)
    for i in range(12):
        mix(CB.blip(1200 + 40 * i, 1800 + 40 * i, 0.06, sr), at("europeo") - 0.05 + i * 0.03, 0.2)
    for i in range(4):
        mix(sfx.whoosh(0.5), at("leyes", 1, 11) + i * 0.12, 0.3)
    # 12: abogado, juez, fiscal, notario; «no basta»
    for i, w in enumerate(("abogados", "jueces", "fiscales", "notarios")):
        mix(CB.blip(450 + 110 * i, 700 + 160 * i, 0.12, sr), at(w, 1, 12) - 0.05, 0.4)
    mix(CB.paper(sr, 0.2, 26, 1.2), at("pero") - 0.02, 0.5); mix(knock(sr, 150, 0.45, 27), at("ninguno", 1, 12) + 0.05, 1.0); mix(CB.buzz(0.3, sr, 100), at("ninguno", 1, 12) + 0.08, 0.35)
    # 13: los escalones (pasos + campanita por cada requisito); la toga cae
    for i, w in enumerate(("máster", "prácticas", "examen", "colegiarte")):
        mix(knock(sr, 230, 0.2, 60 + i), at(w) - 0.2, 0.45); mix(sfx.ding(1046.5 * 2 ** (i / 6), 0.6), at(w) + 0.05, 0.3)
    mix(sfx.whoosh(0.6), at("colegiarte") + 0.25, 0.6); mix(CB.chord(sr, (523.25, 659.25, 783.99, 1046.5), 1.3), at("colegiarte") + 0.6, 0.3)
    # 14: la mesa del tribunal; el lápiz del test; los cinco del tribunal; el mazo; la Escuela y la chincheta
    mix(rumble(0.5, sr, 28), at("juez", 1, 14) - 0.25, 0.5)
    for i in range(10):
        mix(CB.marker(sr, 0.08, 70 + i), at("test") + i * 0.09, 0.4)
    for i in range(5):
        mix(CB.blip(500 + 80 * i, 700 + 80 * i, 0.1, sr), at("orales") - 0.15 + i * 0.07, 0.3)
    mix(knock(sr, 190, 0.3, 29), at("tribunal") + 0.1, 0.6)
    mix(rumble(0.6, sr, 30), at("escuela") - 0.15, 0.5); mix(CB.blip(1500, 700, 0.18, sr), at("barcelona") - 0.05, 0.45)
    # 15: cuatro libros; la toga (la respuesta)
    for i in range(4):
        mix(knock(sr, 200 + 20 * i, 0.25, 80 + i), at("cuatro") + 0.1 + i * 0.14, 0.45)
    mix(sfx.whoosh(0.8), at("toga") - 0.15, 0.9); mix(CB.shimmer(2.0, sr, 31), at("toga") + 0.3, 0.6); mix(CB.chord(sr, (392.0, 493.88, 587.33, 783.99, 987.77), 2.2), at("toga") + 0.32, 0.45)
    # 16: vuelta al centro; el marcador de «guárdalo»; el mazo vuelve a bajar (bucle)
    mix(sfx.whoosh(1.6), at("si", 1, 16) + 0.2, 0.9); mix(CB.blip(800, 1300, 0.14, sr), at("guárdalo"), 0.45)
    mix(CB.blip(600, 900, 0.12, sr), at("abogado", 1, 16), 0.3); mix(CB.blip(900, 1350, 0.12, sr), at("juez", 1, 16), 0.3)
    mix(sfx.whoosh(1.4), END - 1.6, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "derecho.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
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
