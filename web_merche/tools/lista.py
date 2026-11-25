#!/usr/bin/env python3
"""Lista numerada de productos para ir pidiendo y colocando las fotos.

  python3 tools/lista.py        -> actualiza data/numeros.json y escribe ../merche/LISTA_FOTOS.md

- Cada producto tiene un NÚMERO fijo (data/numeros.json: id -> número). Los números no cambian nunca:
  si entran productos nuevos, reciben los siguientes. Así «la foto del 23» siempre es el mismo producto.
- ★ = sale en la portada (lo más vendido, guía de ghd, novedades, packs y estuches): son las primeras fotos que conviene tener.
"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
txt = open(os.path.join(root, 'js', 'products.js'), encoding='utf-8').read()
P = json.loads(txt[txt.index('['):txt.rindex(']') + 1])
cfg = open(os.path.join(root, 'js', 'config.js'), encoding='utf-8').read()
ids = {p['id'] for p in P}
home = {i for i in re.findall(r"'((?:ghd|sk)-[a-z0-9-]+)'", cfg) if i in ids} | {p['id'] for p in P if p.get('new') or p['cat'] == 'pack'}

GHD = ['Planchas', 'Secadores', 'Moldeadores de aire', 'Rizadores', 'Cepillos térmicos', 'Cepillos', 'Accesorios', 'Peinado y cuidado', 'Estuches']
SK = ['Bonacure Repair Rescue+', 'Bonacure Color Freeze', 'Bonacure Moisture Kick', 'Bonacure Volume Boost', 'Bonacure Frizz Away', 'Bonacure Time Restore',
      'Bonacure Scalp', 'Bonacure Sun Protect', 'Fibre Clinix', 'BLONDME', 'Scalp Clinix', 'Oil Ultime', 'Chroma ID', 'Goodbye Yellow', 'OSiS', 'Session Label', 'Silhouette']
def key(p):
    order = GHD if p['brand'] == 'ghd' else SK
    return (p['brand'] != 'ghd', order.index(p['line']) if p['line'] in order else 99, p['line'])
ordered = sorted(P, key=key)          # sorted es estable: dentro de cada línea se mantiene el orden del catálogo

npath = os.path.join(root, 'data', 'numeros.json')
nums = json.load(open(npath, encoding='utf-8')) if os.path.exists(npath) else {}
nxt = max(nums.values(), default=0) + 1
for p in ordered:
    if p['id'] not in nums: nums[p['id']] = nxt; nxt += 1
json.dump(nums, open(npath, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)

groups = []                           # [(marca, línea, [productos])]
for p in ordered:
    b = 'ghd' if p['brand'] == 'ghd' else 'Schwarzkopf Professional'
    if not groups or groups[-1][0] != b or groups[-1][1] != p['line']: groups.append((b, p['line'], []))
    groups[-1][2].append(p)
have = sum(1 for p in P if p.get('img'))
out = [f"# Lista de productos para las fotos ({len(P)})", '',
       f"Generada por `web_merche/tools/lista.py`. Con foto: **{have}** de {len(P)}. ★ = sale en la portada (prioridad).",
       'El número de cada producto es fijo (`web_merche/data/numeros.json`).', '']
brand = None
for b, line, ps in groups:
    if b != brand: out += [f'## {b}', '']; brand = b
    out.append(f'### {line}')
    for p in ps:
        out.append(f"- [{'x' if p.get('img') else ' '}] **{nums[p['id']]}** · {p['name']}{' · ' + p['size'] if p['size'] else ''}{' ★' if p['id'] in home else ''}  `{p['id']}`")
    out.append('')
open(os.path.join(root, '..', 'merche', 'LISTA_FOTOS.md'), 'w', encoding='utf-8').write('\n'.join(out))
json.dump({'groups': [[b, l, [{'n': nums[p['id']], 'id': p['id'], 'name': p['name'], 'size': p['size'], 'home': p['id'] in home, 'img': bool(p.get('img'))} for p in ps]] for b, l, ps in groups]},
          open(os.path.join(root, 'data', '_lista.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(len(P), 'productos ·', len(home), 'en portada ·', have, 'con foto')
