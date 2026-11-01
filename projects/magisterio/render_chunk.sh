#!/bin/bash
# Máquina de ayuda: renderiza los fotogramas A..B-1 de «Magisterio por dentro», los codifica en chunks/chunk_A_B.mp4 y los sube a la
# rama render-mag-X. Uso (desde la raíz del repo): bash projects/magisterio/render_chunk.sh A B X
set -u
A=$1; B=$2; X=$3
cd "$(dirname "$0")"
(cd web && npm install --silent >/dev/null 2>&1; ./build.sh)
mkdir -p out/frames chunks
for attempt in 1 2 3 4; do
  for w in 0 1 2; do FPS=60 SKIP=1 timeout 30000 node web/capture.mjs out/frames --range $A $B $w 3 > out/w$w.log 2>&1 & sleep 5; done
  wait
  miss=$(python3 -c "import os; print(sum(1 for i in range($A, $B) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt: faltan $miss"
  [ "$miss" = "0" ] && break
done
[ "$miss" = "0" ] || { echo "ERROR: faltan $miss fotogramas"; exit 1; }
F=chunks/chunk_${A}_${B}.mp4
for crf in 14 17 20; do
  ffmpeg -v error -y -framerate 60 -start_number $A -i out/frames/f%05d.jpg -frames:v $((B - A)) -c:v libx264 -crf $crf -preset medium -pix_fmt yuv420p $F
  [ $(stat -c %s $F) -lt 90000000 ] && break
done
n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 $F)
[ "$n" = "$((B - A))" ] || { echo "ERROR: el trozo tiene $n fotogramas"; exit 1; }
cd ../..
git checkout -q -B render-mag-$X
git add -f projects/magisterio/$F
git commit -qm "Magisterio: trozo $A-$B renderizado (máquina de ayuda $X)"
for i in 1 2 3 4 5; do git push -q -f -u origin render-mag-$X && break; sleep $((2 ** i)); done
echo "SUBIDO render-mag-$X $F ($(du -h projects/magisterio/$F | cut -f1))"
