#!/bin/bash
# Publica la web del estudio en GitHub Pages: https://javierfernandez03112007-netizen.github.io/kiria-producer/
#
# Toma web_estudio/index.html (el mismo archivo que se publica como artifact en claude.ai, que no lleva <html>/<head>
# porque el artifact los añade solo), le pone la cabecera de una página normal (charset, viewport, el pequeño reset
# del artifact, icono y enlace para compartir), copia web_estudio/media/ y lo sube todo a la rama gh-pages.
# GitHub Pages sirve esa rama; en una web normal el formulario y los pedidos se envían solos (FormSubmit).
#
# Javi (3-11-2026): «no quiero que esté publicada aún» → se retiró. Javi (4-11-2026): «la ponemos ya en la web» (Stripe pide la
# dirección de la web para abrir la cuenta) → PUBLICADA desde el 4-11-2026. Se sigue publicando solo con orden expresa:
#   ./web_estudio/publicar.sh --publicar                 → construye y sube (solo cuando Javi lo pida)
#   ./web_estudio/publicar.sh --solo-construir DIR       → solo deja la web en DIR, para probarla en local
set -euo pipefail
case "${1:-}" in
  --publicar|--solo-construir) ;;
  *) echo "No se publica nada: Javi pidió no publicar la web todavía (se supervisa en la vista privada de claude.ai)."
     echo "Cuando él lo diga: ./web_estudio/publicar.sh --publicar  ·  para probar en local: --solo-construir DIR"; exit 1 ;;
esac
cd "$(git rev-parse --show-toplevel)"
URL=https://javierfernandez03112007-netizen.github.io/kiria-producer/
if [ -n "${2:-}" ]; then OUT=$2; else OUT=$(mktemp -d); trap 'rm -rf "$OUT"' EXIT; fi     # la carpeta temporal se borra al acabar
mkdir -p "$OUT"

python3 - "$OUT" "$URL" <<'PY'
import os, re, shutil, sys
out, url = sys.argv[1], sys.argv[2]
src = open('web_estudio/index.html', encoding='utf-8').read()
cut = src.index('</style>') + len('</style>')            # título, metas, fuentes, script inicial y estilos → <head>
head, body = src[:cut], src[cut:]
assert re.search(r'<(header|section|main|div)\b', head) is None, 'el bloque de cabecera tiene contenido de la página'
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E"
        "%3Cstop offset='0' stop-color='%23ff4d61'/%3E%3Cstop offset='.52' stop-color='%23b45cff'/%3E%3Cstop offset='1' stop-color='%234f7dff'/%3E"
        "%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='%230a0b10'/%3E%3Ctext x='32' y='47' font-family='Arial Black,Arial,sans-serif' "
        "font-size='42' font-weight='900' text-anchor='middle' fill='url(%23g)'%3Ek%3C/text%3E%3C/svg%3E")
top = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       # el mismo reset que pone el artifact de claude.ai (la página cuenta con él, sobre todo con [hidden])
       '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
       'body{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
       f'<link rel="icon" href="{icon}">\n<link rel="canonical" href="{url}">\n'
       f'<meta property="og:type" content="website">\n<meta property="og:url" content="{url}">\n'
       f'<meta property="og:image" content="{url}media/cabezas.jpg">\n<meta property="og:locale" content="es_ES">\n'
       '<meta name="theme-color" content="#0a0b10">\n')
page = top + head.strip() + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n'
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
shutil.copytree('web_estudio/media', os.path.join(out, 'media'), dirs_exist_ok=True)
open(os.path.join(out, '.nojekyll'), 'w').close()      # sin Jekyll: se sirve tal cual
print(f'web construida en {out} ({len(page) // 1024} KB de HTML)')
PY

[ "${1:-}" = "--solo-construir" ] && exit 0

# commit en la rama gh-pages sin tocar la carpeta de trabajo ni la rama actual
GITDIR=$(git rev-parse --absolute-git-dir)
git fetch -q origin gh-pages 2>/dev/null || true
PARENT=$(git rev-parse -q --verify refs/remotes/origin/gh-pages || true)
IDX=$(mktemp); rm -f "$IDX"
TREE=$(cd "$OUT" && GIT_INDEX_FILE="$IDX" git --git-dir="$GITDIR" --work-tree="$OUT" add -A . && GIT_INDEX_FILE="$IDX" git --git-dir="$GITDIR" write-tree)
rm -f "$IDX"
if [ -n "$PARENT" ] && [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then echo "La web publicada ya es esta versión: nada que subir. $URL"; exit 0; fi
SRCREV=$(git rev-parse --short HEAD)
MSG="Web del estudio publicada desde $(git branch --show-current) ($SRCREV)${TRAILER:+

$TRAILER}"                                  # TRAILER: líneas de autoría opcionales para el commit
COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "$MSG")
for i in 0 2 4 8 16; do
  sleep $i
  if git push -q origin "$COMMIT:refs/heads/gh-pages"; then echo "Subida a gh-pages ($COMMIT). En 1-2 minutos: $URL"; exit 0; fi
done
echo "No se pudo subir a gh-pages"; exit 1
