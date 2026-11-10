"""Efectos del capítulo 1 → out/sfx.wav. Solo efectos de ElevenLabs ya hechos para otros vídeos del canal (biblioteca de
projects/*/assets/sfx), uno por suceso, sin música ni fondo. Los instantes salen de web/timeline.json (las mismas palabras que
mueven las tarjetas de web/overlay.html)."""
import os, sys, json, subprocess, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, ROOT)
from engine import sfx

SR = sfx.SR
TL = json.load(open(os.path.join(HERE, 'web', 'timeline.json')))
WD = TL['words']                                      # palabras por toma (nombre)
SEGS = TL['segs']
OLD = ['a8695', 'a8699', 'c8707b', 'c8707a', 'c8707c', 'd8709', 'e8712']      # los números de abajo son la toma en este orden
wt = lambda s, i: WD[OLD[s]][i][0]
we = lambda s, i: WD[OLD[s]][i][1]
A0, SPEED = 0.68, 1.06
src = lambda ts: (ts - A0) / SPEED                     # segundo de la grabación a8695 → segundo del vídeo

_C = {}
def sample(name):
    if name not in _C:
        proj, n = name.split('/')
        p = os.path.join(ROOT, 'projects', proj, 'assets', 'sfx', n + '.mp3')
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _C[name] = x[max(0, on[0] - int(0.004 * SR)):] if len(on) else x
    return _C[name]

EVENTS = [
    # 1 · la pared: dos grietas y el reventón; el número se coloca; «quédate…»; el candado del método
    ('gta6/raja', src(0.62), 0.62), ('robo_banco/hormigon', src(1.56), 0.5), ('robo_banco/rotura', src(2.36) - 0.02, 0.85),
    ('avion/brillo', src(2.36) + 0.85, 0.22),
    ('avion/whoosh', wt(0, 20) - 0.12, 0.28), ('medicina/candado', wt(0, 28) - 0.02, 0.38),
    # 2 · el reto
    ('robo_banco/titulo', wt(1, 3) - 0.04, 0.5), ('economia/puntos', wt(1, 7), 0.32), ('lanzamiento/marcador', wt(1, 7) + 0.28, 0.28),
    ('lanzamiento/tarjeta', wt(1, 11) - 0.08, 0.3), ('economia/subida', wt(1, 15), 0.3), ('avion/flecha', wt(1, 25) - 0.02, 0.45),
    ('cripto/check', wt(1, 28), 0.28),
    # 3 · qué es Kiria
    ('avion/brillo', wt(2, 0) - 0.1, 0.28), ('magisterio/tarjeta', wt(2, 7) - 0.06, 0.26), ('magisterio/tarjeta', wt(2, 9) - 0.06, 0.26),
    ('magisterio/tarjeta', wt(2, 11) - 0.06, 0.26), ('cripto/check', we(2, 17), 0.28), ('cripto/check', we(2, 20), 0.28),
    # 4 · clientes, ventas, visualizaciones; vídeos con IA; web
    ('tapas/pop', wt(3, 1) - 0.06, 0.22), ('tapas/pop', wt(3, 2) - 0.06, 0.22), ('tapas/pop', wt(3, 4) - 0.06, 0.22),
    ('economia/precio_sube', wt(3, 7) - 0.08, 0.38), ('lanzamiento/pantalla', wt(3, 8) - 0.05, 0.28),
    *[('quimica/ok', wt(3, i) + 0.12, 0.16) for i in (8, 10, 12, 14, 16)],
    ('promo_web/scroll', wt(3, 19) - 0.08, 0.32), ('lanzamiento/tap', wt(3, 24) - 0.04, 0.28),
    # 5 · 3D, tiempo real, captación; «quédate…»
    ('avion/giro', wt(4, 2) - 0.1, 0.32), ('cripto/internet', wt(4, 5) - 0.06, 0.26), ('economia/embudo', wt(4, 11) - 0.08, 0.36),
    # 6 · cada jueves; sí / no; comenta NEGOCIO; la web; exponencial
    ('robo_banco/calendario', wt(5, 0) - 0.08, 0.38), ('lanzamiento/mensaje', wt(5, 3) - 0.08, 0.26),
    ('quimica/ok', wt(5, 18), 0.36), ('cerradura/denegado', wt(5, 21), 0.32),
    ('lanzamiento/tarjeta', wt(5, 22) - 0.08, 0.24), ('lanzamiento/teclea', wt(5, 26), 0.32), ('lanzamiento/enviado', we(5, 27), 0.34),
    ('lanzamiento/ping', wt(5, 29) - 0.06, 0.28), ('quimica/crece', wt(5, 34), 0.26),
    # 7 · el descuento y el cierre
    ('lanzamiento/tarjeta', wt(6, 0) - 0.08, 0.28), ('magisterio/sello', wt(6, 10) - 0.08, 0.5), ('lanzamiento/marcador', wt(6, 11), 0.24),
    ('avion/brillo', wt(6, 12) - 0.02, 0.28), ('medicina/dorado', TL['clips']['e8712'][1] + 0.45, 0.34),
]

def build(path):
    out = np.zeros(int((TL['total'] + 1) * SR))
    for name, t0, g in EVENTS:
        x = sample(name).copy()
        start = 0
        if t0 < 0: start = int(-t0 * SR); t0 = 0.0
        x = x[start:]
        fi = min(len(x), int(0.004 * SR)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(0.06 * SR)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, t0, g)
    sfx.write(path, out, drive=1.0, level=0.9)
    print('efectos:', len(EVENTS), '→', path)

if __name__ == '__main__':
    build(os.path.join(HERE, 'out', 'sfx.wav'))
