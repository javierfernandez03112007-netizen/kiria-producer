# Descarga la foto oficial (servidor de imágenes de Henkel) de cada producto emparejado. Uso: dl_sk.py <mapa> <índice> <carpeta destino>
import json, sys, os, subprocess, time
mp, idx, dest = json.load(open(sys.argv[1])), {x['code']: x for x in json.load(open(sys.argv[2], encoding='utf-8'))}, sys.argv[3]
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
ok = bad = 0; log = {}
for pid, code in mp.items():
    it = idx.get(code)
    if not it or not it['img']: print('  SIN ÍNDICE', pid, code); bad += 1; continue
    base = it['img'].split('?')[0]
    url = base + '?qlt=95&wid=1400&hei=1400&fmt=png-alpha&bfc=off'
    out = os.path.join(dest, pid + '.png')
    if not os.path.exists(out) or os.path.getsize(out) < 2000:
        r = subprocess.run(['curl', '-s', '-m', '60', '-A', UA, '-o', out, '-w', '%{http_code} %{content_type}', url], capture_output=True, text=True)
        st = r.stdout.strip()
        if not st.startswith('200') or 'image' not in st:
            print('  FALLO', pid, code, st); bad += 1
            if os.path.exists(out): os.remove(out)
            continue
        time.sleep(0.6)
    ok += 1; log[pid] = {'code': code, 'oficial': it['name'], 'url': it['url'], 'img': base}
json.dump(log, open(os.path.join(dest, '_origen.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('descargadas', ok, '· fallos', bad)
