#!/usr/bin/env python3
"""Junta el catálogo en js/products.js.

  python3 data/build.py

- Lee data/base.json y los demás data/*.json (ampliaciones), sin repetir ids.
- Aplica data/overrides.json (retoques a mano por id: precio de Merche, «new», etc.).
- Si existe media/productos/<id>.jpg|.webp|.png  -> foto oficial del producto (campo img)
           media/productos/<id>.mp4               -> vídeo del producto (campo video)
           media/productos/<id>-tutorial.mp4      -> tutorial de Merche (campo tutorial)
           media/productos/<id>-2.webp, -3.webp…  -> más fotos (campo gallery)
  Las fotos se colocan con tools/foto.py, que las recorta y las deja todas iguales.
"""
import json, glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
CATS = ['plancha','secador','moldeador','rizador','cepillo-termico','cepillo','accesorio','champu','acondicionador','mascarilla',
        'tratamiento','aceite','styling','laca','protector','pack']
NEEDS = set('alisar secar rizar volumen reparar hidratar rubio color encrespamiento cuero-cabelludo fijacion proteccion-calor rizos-naturales brillo'.split())
DEF = (('line',''),('size',''),('price',None),('priceSrc',''),('short',''),('desc',''),('benefits',[]),('use',''),('facts',{}),('needs',[]),('colors',[]),('url',''),('confirm',[]))
clean = lambda s: re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', '', str(s))).strip()

seen, out = set(), []
skip = {'overrides.json', 'numeros.json'}        # no son catálogo (y tampoco los que empiezan por «_»)
files = [os.path.join(here, 'base.json')] + sorted(f for f in glob.glob(os.path.join(here, '*.json'))
                                                   if os.path.basename(f) not in skip | {'base.json'} and not os.path.basename(f).startswith('_'))
for f in files:
    for p in json.load(open(f, encoding='utf-8')):
        pid = re.sub(r'[^a-z0-9-]', '-', str(p.get('id', '')).lower()).strip('-')
        if not pid or pid in seen or p.get('cat') not in CATS or p.get('brand') not in ('ghd', 'schwarzkopf') or not p.get('name'):
            print('  descartado:', p.get('id'), '(', os.path.basename(f), ')'); continue
        seen.add(pid); p['id'] = pid
        for k, d in DEF: p.setdefault(k, d)
        for k in ('name','line','size','priceSrc','short','desc','use'): p[k] = clean(p[k])
        p['benefits'] = [clean(b) for b in p['benefits'] if clean(b)][:5]
        p['facts'] = {clean(k): clean(v) for k, v in dict(p['facts']).items() if clean(k) and clean(v)}
        p['needs'] = [n for n in p['needs'] if n in NEEDS]
        p['colors'] = [clean(c) for c in p['colors']][:16]
        p['confirm'] = [clean(c) for c in p['confirm']]
        if not isinstance(p['price'], (int, float)) or isinstance(p['price'], bool) or not (0 < p['price'] < 2000): p['price'] = None
        if not re.match(r'^https://[\w.-]+/', p['url'] or ''): p['url'] = ''   # solo enlaces https normales
        out.append(p)

ov = json.load(open(os.path.join(here, 'overrides.json'), encoding='utf-8'))
byid = {p['id']: p for p in out}
for k, v in ov.items():
    if k.startswith('_'): continue
    if k in byid: byid[k].update(v)
    else: print('  override sin producto:', k)

# fotos y vídeos: basta con dejar el fichero con el nombre del id
media = os.path.join(root, 'media', 'productos')
have = set(os.listdir(media)) if os.path.isdir(media) else set()
n_img = n_vid = 0
for p in out:
    for ext in ('webp', 'jpg', 'png'):
        if f"{p['id']}.{ext}" in have: p['img'] = f"media/productos/{p['id']}.{ext}"; n_img += 1; break
    g = sorted(f for f in have if re.fullmatch(re.escape(p['id']) + r'-\d+\.(jpg|webp|png)', f))
    if g: p['gallery'] = ['media/productos/' + f for f in g]
    if f"{p['id']}.mp4" in have: p['video'] = f"media/productos/{p['id']}.mp4"; n_vid += 1
    if f"{p['id']}-tutorial.mp4" in have: p['tutorial'] = f"media/productos/{p['id']}-tutorial.mp4"

out.sort(key=lambda p: (CATS.index(p['cat']), p['brand'] != 'ghd'))   # orden estable: por tipo, ghd primero
js = '// GENERADO por data/build.py a partir de data/*.json. No lo edites a mano.\nexport const PRODUCTS = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n'
open(os.path.join(root, 'js', 'products.js'), 'w', encoding='utf-8').write(js)
from collections import Counter
print(len(out), 'productos ·', dict(Counter(p['brand'] for p in out)), '· con foto:', n_img, '· con vídeo:', n_vid, '· sin precio:', sum(p['price'] is None for p in out))
