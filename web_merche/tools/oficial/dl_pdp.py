# Descarga la ficha oficial de cada producto emparejado y saca sus datos estructurados (nombre, descripción, EAN).
import json, sys, os, subprocess, time, re, html
origen, dest, out = json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2], sys.argv[3]
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
res = {}
for pid, o in origen.items():
    f = os.path.join(dest, o['code'] + '.html')
    if not os.path.exists(f) or os.path.getsize(f) < 20000:
        subprocess.run(['curl', '-s', '-m', '45', '-L', '-A', UA, '--compressed', '-o', f, o['url']]); time.sleep(0.8)
    t = open(f, errors='replace').read(); d = {}
    for blk in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>', t):
        try:
            j = json.loads(blk, strict=False)
            if isinstance(j, dict) and j.get('@type') == 'Product': d = j
        except Exception: pass
    body = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', ' ', t)
    txt = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body)))
    use = ''
    i = txt.find('Modo de uso')
    if i >= 0:
        use = txt[i + len('Modo de uso'):i + 700]
        for stop in ('Avisos', 'Ingredientes', 'Descargas', 'Productos relacionados'):
            j = use.find(stop)
            if j >= 0: use = use[:j]
        use = use.strip()
    res[pid] = {'code': o['code'], 'name': html.unescape(d.get('name', '')).strip(), 'desc': html.unescape(d.get('description', '')).strip(), 'gtin': d.get('gtin', ''),
                'cat': d.get('category', ''), 'img': (d.get('image') or '').split('?')[0], 'use': use, 'url': o['url']}
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(res), 'fichas · con descripción:', sum(1 for v in res.values() if v['desc']), '· con EAN:', sum(1 for v in res.values() if v['gtin']), '· con modo de uso:', sum(1 for v in res.values() if v['use']))
print('longitud media de la descripción oficial:', sum(len(v['desc']) for v in res.values()) // max(1, len(res)))
