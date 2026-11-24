#!/bin/bash
# Máquina de ayuda: renderiza los fotogramas A..B-1 de «29N, capítulo 0» y los sube a la rama <PFX>-X (por defecto render-e1).
#   bash projects/elecciones_29n_ep1/render_chunk.sh A B X [PFX]            → todos, codificados en chunks/chunk_A_B.mp4
#   ALL=1 bash projects/elecciones_29n_ep1/render_chunk.sh A B X [PFX]      → todos, como JPG sueltos en chunks/all_A_B/ (sin recodificar: idénticos a los
#                                                                             de la máquina principal; es lo que se usa)
#   ODD=1 bash projects/elecciones_29n_ep1/render_chunk.sh A B X [PFX]      → solo los IMPARES, como JPG sueltos en chunks/odd_A_B/
# Desde la raíz del repo, en la rama claude/stoic-newton-ja94mt al día.
set -u
A=$1; B=$2; X=$3; PFX=${4:-render-e1}; ODD=${ODD:-0}; ALL=${ALL:-0}
cd "$(dirname "$0")"
(cd web && npm install --silent >/dev/null 2>&1; ./build.sh)
mkdir -p out/frames chunks
if [ "$ODD" = "1" ]; then SEL="i % 2 == 1"; WS="1 3 5"; NW=6; TAG=odd; else SEL="True"; WS="0 1 2"; NW=3; TAG=all; fi
for attempt in 1 2 3 4; do
  for w in $WS; do FPS=60 SKIP=1 timeout 30000 node web/capture.mjs out/frames --range $A $B $w $NW > out/w$w.log 2>&1 & sleep 5; done
  wait
  miss=$(python3 -c "import os; print(sum(1 for i in range($A, $B) if ($SEL) and not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt: faltan $miss"
  [ "$miss" = "0" ] && break
done
[ "$miss" = "0" ] || { echo "ERROR: faltan $miss fotogramas"; exit 1; }
if [ "$ODD" = "1" ] || [ "$ALL" = "1" ]; then
  F=chunks/${TAG}_${A}_${B}; rm -rf chunks/odd_* chunks/all_*; mkdir -p $F
  python3 -c "
import shutil
for i in range($A, $B):
    if $SEL: shutil.copy('out/frames/f%05d.jpg' % i, '$F/f%05d.jpg' % i)"
else
  F=chunks/chunk_${A}_${B}.mp4
  for crf in 14 17 20; do
    ffmpeg -v error -y -framerate 60 -start_number $A -i out/frames/f%05d.jpg -frames:v $((B - A)) -c:v libx264 -crf $crf -preset medium -pix_fmt yuv420p $F
    [ $(stat -c %s $F) -lt 90000000 ] && break
  done
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 $F)
  [ "$n" = "$((B - A))" ] || { echo "ERROR: el trozo tiene $n fotogramas"; exit 1; }
fi
cd ../..
git checkout -q -B $PFX-$X
git add -f projects/elecciones_29n_ep1/$F
git commit -qm "29N capítulo 0: trozo $A-$B renderizado (máquina de ayuda $X)"
for i in 1 2 3 4 5; do git push -q -f -u origin $PFX-$X && break; sleep $((2 ** i)); done
echo "SUBIDO $PFX-$X $F ($(du -sh projects/elecciones_29n_ep1/$F | cut -f1))"
