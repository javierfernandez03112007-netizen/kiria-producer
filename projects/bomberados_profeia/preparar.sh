#!/bin/bash
# Fotogramas de la grabación de la app (30 fps) para profeia.js. La foto de la página 226 (out/pagina226.jpg) no está en
# el repositorio (es público): sin ella, la escena 3 sale sin la página.
[ -d out/rec ] && [ "$(ls out/rec | wc -l)" -ge 818 ] && exit 0
mkdir -p out/rec && ffmpeg -v error -i ../../bomberados/app/app_ia_por_dentro_2026-11-03.mp4 -vf fps=30 -q:v 3 out/rec/r%04d.jpg
