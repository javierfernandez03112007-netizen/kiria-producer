#!/bin/bash
# Trae los trozos renderizados en las otras 3 sesiones (ramas render-aero-b/c/d), los vuelve a convertir en fotogramas
# en out/frames y, si no falta ninguno, compone el vídeo final.
cd /home/user/kiria-producer/projects/aeroespacial
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
for spec in b:1030:2060 c:2060:3090 d:3090:$N; do
  IFS=: read x A B <<< "$spec"
  git fetch -q origin render-aero-$x || { echo "falta la rama render-aero-$x"; exit 1; }
  git show origin/render-aero-$x:projects/aeroespacial/chunks/chunk_${A}_${B}.mp4 > out/chunk_$x.mp4
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 out/chunk_$x.mp4)
  [ "$n" = "$((B - A))" ] || { echo "trozo $x: $n fotogramas, esperaba $((B - A))"; exit 1; }
  ffmpeg -v error -y -i out/chunk_$x.mp4 -start_number $A -q:v 2 out/frames/f%05d.jpg
  echo "trozo $x ($A..$((B - 1))) OK"
done
missing=$(python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
echo "faltan $missing"
[ "$missing" = "0" ] || exit 1
python3 compose_aero.py > out/compose.log 2>&1 && echo "$(date +%H:%M) COMPUESTO" >> out/render_progress.log
tail -3 out/compose.log
