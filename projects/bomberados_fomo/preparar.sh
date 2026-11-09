#!/bin/bash
# Lo que no está en el repositorio y hace falta para renderizar: three.js (web/node_modules) y los fotogramas de las
# GRABACIONES REALES de la app (bomberados/app/, 30 fps): ruleta y 1 vs 1, inicio + menú PRO + Profe IA, simulacro (web) y
# grupo con «Callejero».
cd "$(dirname "$0")" || exit 1
A=../../bomberados/app
ex() { [ -f "out/$1/r$(printf %04d "$4").jpg" ] && return 0; mkdir -p "out/$1" && ffmpeg -v error -y -ss "$3" -i "$A/$2" -t "$5" -vf "fps=30,scale=603:-2" -q:v 3 "out/$1/r%04d.jpg"; }
ex rec_1vs1 app_ruleta_1vs1_movil.mp4 0 480 16.2 || exit 1
ex rec_ia app_ia_por_dentro_2026-11-03.mp4 0 800 27.2 || exit 1
ex rec_sim app_simulacro_examen_web.mov 1.5 240 8.2 || exit 1
ex rec_grupo app_test_grupo_movil.mp4 8.5 280 9.5 || exit 1
cd web || exit 1
[ -f node_modules/three/build/three.module.js ] && exit 0
for i in 1 2 3; do npm install --no-save --no-package-lock --silent three@0.170.0 >/dev/null 2>&1 && exit 0; sleep $((2 ** i)); done
echo "no pude instalar three"; exit 1
