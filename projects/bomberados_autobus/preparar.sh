#!/bin/bash
# Lo que no está en el repositorio y hace falta para renderizar: three.js (web/node_modules, en .gitignore) y los fotogramas
# de las grabaciones reales de la app (out/rec_menu, out/rec_1vs1; 30 fps, de bomberados/app/).
cd "$(dirname "$0")" || exit 1
A=../../bomberados/app
if [ ! -f out/rec_menu/r0060.jpg ]; then mkdir -p out/rec_menu && ffmpeg -v error -y -i $A/app_ia_por_dentro_2026-11-03.mp4 -t 4.2 -vf fps=30,scale=603:-1 -q:v 3 out/rec_menu/r%04d.jpg || exit 1; fi
if [ ! -f out/rec_1vs1/r0480.jpg ]; then mkdir -p out/rec_1vs1 && ffmpeg -v error -y -i $A/app_ruleta_1vs1_movil.mp4 -t 16.2 -vf fps=30,scale=603:-1 -q:v 3 out/rec_1vs1/r%04d.jpg || exit 1; fi
cd web || exit 1
[ -f node_modules/three/build/three.module.js ] && exit 0
for i in 1 2 3; do npm install --no-save --no-package-lock --silent three@0.170.0 >/dev/null 2>&1 && exit 0; sleep $((2 ** i)); done
echo "no pude instalar three"; exit 1
