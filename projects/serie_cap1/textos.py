"""Textos y tarjetas del capítulo 1, sincronizados con la voz → web/timeline.json (lo lee web/overlay.html).

- Los tiempos salen de las palabras de cada toma (reconocedor) pasadas al tiempo del vídeo (recortes y velocidad de montaje.py).
- Subtítulos «detrás de la cabeza»: cada trozo son 1-2 líneas; cada palabra aparece cuando la dice; *así* = palabra destacada (serif
  cursiva amarilla). Se colocan justo encima de la cabeza (el pelo tapa el pie de las letras).
"""
import os, json
import numpy as np
import montaje as MJ
import fondo

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = fondo.WORK

def words(clip):
    ws = json.load(open(os.path.join(WORK, clip + '.json')))
    return ws['words'] if isinstance(ws, dict) else ws

# trozos de subtítulo: (toma, primera palabra, última palabra, texto con | para el salto de línea y *destacado*)
OLD = ['a8695', 'a8699', 'c8707b', 'c8707a', 'c8707c', 'd8709', 'e8712']    # el número de cada trozo es la toma en este orden
SUBS = [
    (0, 0, 2, 'HE GENERADO *vídeos*'),
    (0, 3, 5, 'CON MÁS DE'),
    (0, 8, 9, 'DE *visualizaciones*'),
    (0, 10, 13, 'EN TAN SOLO *7 días*'),
    (0, 14, 16, '¿QUIERES SABER *cómo*'),
    (0, 17, 19, 'LO HE *hecho*?'),
    (0, 20, 23, 'QUÉDATE HASTA EL *final*'),
    (0, 24, 26, 'Y TE EXPLICO'),
    (0, 27, 29, 'EL *método Kiria*'),
    (1, 0, 1, 'HOY COMENZAMOS'),
    (1, 2, 4, 'UN NUEVO *reto*'),
    (1, 5, 6, 'ESTAMOS BUSCANDO'),
    (1, 7, 8, '*10 clientes*'),
    (1, 9, 11, 'QUE QUIERAN COLABORAR'),
    (1, 12, 13, 'CON *Kiria*'),
    (1, 14, 16, 'PARA DESPEGAR SUS'),
    (1, 17, 17, '*visualizaciones*'),
    (1, 18, 21, 'DE MANERA MUY *eficiente*'),
    (1, 22, 25, 'Y LLEGAR A ALCANZAR'),
    (1, 26, 28, 'SUS *objetivos*'),
    (2, 0, 3, 'KIRIA ES UNA *herramienta*'),
    (2, 4, 6, 'QUE AYUDA A'),
    (2, 7, 8, '*pequeños negocios*'),
    (2, 9, 10, 'EMPRESAS O'),
    (2, 11, 13, '*ideas de proyectos*'),
    (2, 14, 18, 'QUE TIENEN UN BUEN *producto*'),
    (2, 19, 21, 'O BUEN *servicio*'),
    (2, 22, 23, 'A *desplegar*'),
    (3, 0, 2, 'SUS CLIENTES, VENTAS'),
    (3, 3, 4, 'O *visualizaciones*'),
    (3, 5, 7, 'DE FORMA *exponencial*'),
    (3, 8, 10, 'MEDIANTE LA GENERACIÓN'),
    (3, 11, 13, 'DE VÍDEOS *automatizados*'),
    (3, 14, 16, 'CON *inteligencia artificial*'),
    (3, 17, 20, 'O LA CREACIÓN DE'),
    (3, 21, 23, 'UNA *página web*'),
    (3, 24, 27, 'A TU PEQUEÑO *negocio*'),
    (4, 0, 1, 'IDEA CON'),
    (4, 2, 4, '*productos en 3D*'),
    (4, 5, 6, 'UNA VISUALIZACIÓN'),
    (4, 7, 9, 'EN *tiempo real*'),
    (4, 10, 13, 'Y CAPTACIÓN DE CLIENTES'),
    (4, 14, 14, '*automatizada*'),
    (4, 15, 17, '¿CÓMO HACEMOS *eso*?'),
    (4, 18, 20, 'QUÉDATE HASTA EL *final*'),
    (5, 0, 2, 'TODOS LOS *jueves*'),
    (5, 3, 6, 'IREMOS ACTUALIZANDO LAS *noticias*'),
    (5, 7, 12, 'DE ESTAS PEQUEÑAS EMPRESAS'),
    (5, 13, 15, 'DE ESTE *reto*'),
    (5, 16, 18, 'TANTO LOS *sí*'),
    (5, 19, 21, 'COMO LOS *no*'),
    (5, 22, 25, 'SI TIENES UN *negocio*'),
    (5, 26, 27, 'COMENTA «*negocio*»'),
    (5, 28, 31, 'Y ACCEDE AQUÍ *ya*'),
    (5, 32, 36, 'PARA GANAR TUS CLIENTES'),
    (5, 37, 39, 'DE FORMA *exponencial*'),
]

def main():
    total = MJ.timeline()
    segs = []
    W = {}
    hp_cache = os.path.join(fondo.BG, 'heads.json')
    heads = json.load(open(hp_cache)) if os.path.exists(hp_cache) else {}
    for k, s in enumerate(MJ.SEGS):
        c = s['clip']
        if c not in heads: heads[c] = [float(v) for v in fondo.head_pos(c)]
        hx, hy = heads[c]; top = hy - 150
        # cabeza en la pantalla (con el zoom medio de la toma)
        z = sum(s['z']) / 2; Mz = MJ.zoom_mat(z, hx, hy + 120)
        sx = Mz[0, 0] * hx + Mz[0, 2]; sy = Mz[1, 1] * top + Mz[1, 2]
        ws = words(c)
        tw = []
        for w in ws:
            t0 = s['T0'] + (w['start'] - s['a']) / MJ.SPEED; t1 = s['T0'] + (w['end'] - s['a']) / MJ.SPEED
            tw.append([round(max(s['T0'], t0), 3), round(min(s['T0'] + s['dur'], max(t0 + 0.05, t1)), 3), w['w']])
        W[k] = tw
        segs.append(dict(clip=c, T0=round(s['T0'], 3), T1=round(s['T0'] + s['dur'], 3), headX=round(sx), headTop=round(sy), zoom=z))
    json.dump(heads, open(hp_cache, 'w'))
    subs = []
    order = [s['clip'] for s in MJ.SEGS]
    for (k0, i0, i1, txt) in SUBS:
        k = order.index(OLD[k0])
        tw = W[k]
        lines = [l.split(' ') for l in txt.split('|')]
        ntok = sum(len(l) for l in lines)
        times = [tw[min(i1, i0 + int(round(j * (i1 - i0) / max(1, ntok - 1))))][0] if ntok > 1 else tw[i0][0] for j in range(ntok)]
        # la palabra j del texto aparece cuando se dice la palabra proporcional del trozo
        seg = MJ.SEGS[k]; tm = (tw[i0][0] + tw[i1][1]) / 2 - seg['T0']
        z, cx, cy = MJ.zoom_at(seg, tm); hx, hy = heads[seg['clip']]
        Mz = MJ.zoom_mat(z, cx, cy)
        subs.append(dict(seg=k, t0=tw[i0][0], t1=tw[i1][1], lines=lines, times=times,
                         headX=round(Mz[0, 0] * hx + Mz[0, 2]), headTop=round(Mz[1, 1] * (hy - 150) + Mz[1, 2])))
    # cada trozo dura hasta que empieza el siguiente de la misma toma (como mucho 0,35 s después de su última palabra)
    for a, b in zip(subs, subs[1:]):
        if a['seg'] == b['seg']: a['t1'] = round(min(b['t0'] - 0.1, a['t1'] + 0.35), 3)
        else: a['t1'] = round(min(segs[a['seg']]['T1'] - 0.02, a['t1'] + 0.35), 3)
    subs[-1]['t1'] = round(min(segs[subs[-1]['seg']]['T1'] - 0.02, subs[-1]['t1'] + 0.4), 3)
    out = dict(total=round(total, 3), fps=MJ.FPS, segs=segs, words={str(k): v for k, v in W.items()}, subs=subs)
    os.makedirs(os.path.join(HERE, 'web'), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, 'web', 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    for s in segs: print(s)
    print('trozos', len(subs), 'duración', out['total'])

if __name__ == '__main__':
    main()
