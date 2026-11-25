#!/usr/bin/env python3
"""Hoja imprimible (HTML) con la lista numerada de productos y qué fotos faltan.  Uso: python3 tools/lista_html.py salida.html
Después se imprime a PDF con un navegador (Playwright: page.pdf) y se guarda en merche/LISTA_PRODUCTOS_FOTOS.pdf.
Antes hay que ejecutar tools/lista.py (deja data/_lista.json)."""
import json, html, os, sys, datetime
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
d = json.load(open(os.path.join(root, 'data', '_lista.json'), encoding='utf-8'))
F = 'file://' + os.path.join(root, 'fonts') + '/'
e = html.escape
allp = [p for _, _, ps in d['groups'] for p in ps]
tot, done = len(allp), sum(1 for p in allp if p['img'])
first = [p for p in allp if p['home'] and not p['img']]
hoy = datetime.date.today(); MES = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split()
def row(p, star=True):
    return (f"<div class='r{' ok' if p['img'] else ''}'><i>{'✓' if p['img'] else ''}</i><b>{p['n']}</b><span>{e(p['name'])}"
            f"{' <em>' + e(p['size']) + '</em>' if p['size'] else ''}</span>{'<u>★</u>' if star and p['home'] else ''}</div>")
body, brand = [], None
for b, l, ps in d['groups']:
    if b != brand:
        if brand: body.append('</div>')
        n = [p for bb, _, x in d['groups'] if bb == b for p in x]
        body.append(f"<h2>{e(b)} <small>{len(n)} productos · faltan {sum(1 for p in n if not p['img'])} fotos</small></h2><div class='cols'>"); brand = b
    body.append(f"<section><h3>{e(l)}</h3>{''.join(row(p) for p in ps)}</section>")
body.append('</div>')
doc = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Lista de productos para las fotos</title><style>
@font-face{{font-family:"Bodoni Moda";font-style:normal;font-weight:400 900;src:url({F}bodoni-moda-latin-opsz-normal.woff2) format("woff2")}}
@font-face{{font-family:"Bodoni Moda";font-style:italic;font-weight:400 900;src:url({F}bodoni-moda-latin-opsz-italic.woff2) format("woff2")}}
@font-face{{font-family:"Jost";font-weight:100 900;src:url({F}jost-latin-wght-normal.woff2) format("woff2")}}
@page{{size:A4;margin:13mm 12mm 14mm}}
*{{box-sizing:border-box}} body{{font:400 8.8pt/1.35 Jost,sans-serif;color:#1a1411;margin:0}}
h1{{font:400 27pt/1 "Bodoni Moda",serif;margin:8pt 0 5pt;letter-spacing:-.01em}} h1 em{{color:#d6b97f}}
.cover{{background:#110d0b;color:#efe3cf;border-radius:9pt;padding:16pt 18pt;margin-bottom:10pt}}
.cover p{{margin:0;color:#cfc2b1;max-width:470pt}} .eye{{font:500 7.5pt/1 Jost;letter-spacing:.24em;text-transform:uppercase;color:#bba98e}}
.how{{display:grid;grid-template-columns:1fr 1fr;gap:4pt 18pt;border:1px solid #e3d8cc;border-radius:8pt;padding:10pt 12pt;background:#fcfaf7;margin-bottom:10pt}}
.how h3{{grid-column:1/-1;margin:0 0 2pt}} .how div{{display:grid;grid-template-columns:14pt 1fr;gap:4pt}} .how div b{{color:#a8813f;font:italic 400 11pt/1.1 "Bodoni Moda"}}
.how div.note{{display:block;grid-column:1/-1;font-size:8pt;color:#7b6e64;border-top:1px solid #e3d8cc;padding-top:5pt;margin-top:2pt}}
h2{{font:400 17pt/1 "Bodoni Moda",serif;margin:12pt 0 6pt;padding-top:8pt;border-top:1.5px solid #1a1411;break-after:avoid}} h2 small{{font:500 7.5pt/1 Jost;letter-spacing:.2em;text-transform:uppercase;color:#7b6e64;margin-left:6pt}}
h3{{font:500 7.6pt/1 Jost;letter-spacing:.2em;text-transform:uppercase;color:#a8813f;margin:0 0 3pt;break-after:avoid}}
.cols{{columns:2;column-gap:16pt}} section{{break-inside:avoid;margin:0 0 8pt}}
.r{{display:grid;grid-template-columns:9pt 20pt 1fr auto;gap:5pt;align-items:baseline;padding:2.4pt 0;border-bottom:1px solid #eee5db;break-inside:avoid}}
.r i{{width:8pt;height:8pt;border:1px solid #1a1411;border-radius:2pt;align-self:center;font:700 6.5pt/7pt Jost;text-align:center;font-style:normal}}
.r.ok{{color:#a39a90}} .r.ok i{{background:#3d7a57;border-color:#3d7a57;color:#fff}}
.r b{{font:600 8.6pt/1 Jost;text-align:right;font-variant-numeric:tabular-nums}}
.r em{{font-style:normal;color:#7b6e64;font-size:7.8pt;margin-left:3pt}} .r u{{text-decoration:none;color:#a8813f}}
.first{{border:1.5px dashed #d4a017;background:#fff8de;border-radius:8pt;padding:9pt 12pt;margin-bottom:4pt}} .first h3{{color:#6d5400}}
.first .cols{{columns:3;column-gap:12pt}} .first .r{{border-color:#f0e2ad;grid-template-columns:9pt 20pt 1fr}}
</style></head><body>
<div class="cover"><div class="eye">Beauty Salon Merche · {hoy.day} de {MES[hoy.month - 1]} de {hoy.year}</div>
<h1>Lista de productos <em>para las fotos</em></h1>
<p>Los {tot} productos y herramientas de la tienda. <b style="color:#efe3cf">Ya tienen foto {done}; faltan {tot - done}.</b> Cada uno tiene un número fijo: así, «la 23» es siempre el mismo producto. Los que llevan ✓ ya están puestos.</p></div>
<div class="how"><h3>Cómo me mandas las que faltan</h3>
<div><b>1</b><span>Adjúntalas en el chat. Pueden ser muchas a la vez.</span></div>
<div><b>2</b><span>Si puedes, pon el número en el nombre del archivo (<b style="font:600 8.8pt Jost;color:#1a1411">23.jpg</b>). Si no, la reconozco por la etiqueta y te confirmo cuál es.</span></div>
<div><b>3</b><span>Una foto principal por producto. Si tienes más (otro ángulo, el estuche abierto), mándalas como 23-2.jpg, 23-3.jpg.</span></div>
<div><b>4</b><span>El producto entero y de frente, sobre fondo blanco o liso, sin letras ni marcas de agua encima. Cuanto más grande, mejor (mínimo 800 px). JPG, PNG o WebP.</span></div>
<div><b>5</b><span>Yo la recorto, la dejo igual que las demás y la pongo en la tarjeta, la ficha y la bolsa.</span></div>
<div><b>6</b><span>Si Merche no vende alguno, dime el número y lo quito de la tienda.</span></div>
<div class="note">Empieza por los ★: son los que salen en la portada.</div></div>
{f'<div class="first"><h3>Primero, estos {len(first)} (salen en la portada y aún no tienen foto) ★</h3><div class="cols">' + ''.join(row(p, False) for p in first) + '</div></div>' if first else ''}
{''.join(body)}
</body></html>"""
open(sys.argv[1], 'w', encoding='utf-8').write(doc)
print(f'{sys.argv[1]} · {done} con foto · faltan {tot - done}')
