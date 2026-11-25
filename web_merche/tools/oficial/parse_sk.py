# Lee las páginas de catálogo descargadas de la tienda oficial y saca un índice: código, nombre, marca, categoría, foto.
import re, html, json, sys, glob, os
src, out = sys.argv[1], sys.argv[2]
items = {}
for f in sorted(glob.glob(os.path.join(src, 'p*.html'))):
    t = open(f, errors='replace').read()
    for m in re.finditer(r'<div\s+class="o-product-list__item\s[^"]*"\s+data-product-id="(\d+)"([\s\S]*?)\n>', t):
        code, attrs = m.group(1), m.group(2)
        block = t[m.end():m.end() + 6000]
        nxt = block.find('data-product-id="')
        if nxt > 0: block = block[:nxt]
        g = lambda k: html.unescape((re.search(k + r'="([^"]*)"', attrs) or [None, ''])[1]).strip()
        img = re.search(r'<img[^>]*class="o-product-list__item__image[^"]*"[^>]*?(?:data-src|src)="([^"]+)"', block) or re.search(r'(https://dm\.henkel-dam\.com/is/image/henkel/[^"?\s]+)', block)
        href = re.search(r'href="([^"]*?/p/' + code + r')"', block)
        name = re.search(r'o-product-list__item__name">\s*([^<]+)<', block)
        items[code] = {'code': code, 'name': html.unescape(name.group(1)).strip() if name else g('data-product-name'), 'brand': g('data-product-brand'), 'cat': g('data-product-category'),
                       'img': html.unescape(img.group(1)) if img else '', 'url': 'https://shop.schwarzkopf-professional.es' + href.group(1) if href else ''}
json.dump(list(items.values()), open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
from collections import Counter
v = list(items.values())
print(len(v), 'productos · con foto:', sum(1 for x in v if x['img']), '· con url:', sum(1 for x in v if x['url']))
print(Counter(x['brand'] for x in v).most_common(30))
for x in v[:6]: print(x)
