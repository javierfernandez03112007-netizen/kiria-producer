#!/bin/bash
# Lo que no está en el repositorio y hace falta para renderizar: three.js (web/node_modules, en .gitignore).
cd "$(dirname "$0")/web" || exit 1
[ -f node_modules/three/build/three.module.js ] && exit 0
for i in 1 2 3; do npm install --no-save --no-package-lock --silent three@0.170.0 >/dev/null 2>&1 && exit 0; sleep $((2 ** i)); done
echo "no pude instalar three"; exit 1
