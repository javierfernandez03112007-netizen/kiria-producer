#!/bin/bash
# Trae los trozos renderizados en las otras 3 sesiones (ramas render-industrial-a/b/c), los vuelve a convertir en fotogramas
# en out/frames y, si no falta ninguno, compone el vídeo final.
cd /home/user/kiria-producer/projects/industrial
N=4221
for spec in a:1100:2150 b:2150:3150 c:3150:4221; do
  IFS=: read x A B <<< "$spec"
  git fetch -q origin render-industrial-$x || { echo "falta la rama render-industrial-$x"; exit 1; }
  git show origin/render-industrial-$x:projects/industrial/chunks/chunk_${A}_${B}.mp4 > out/chunk_$x.mp4
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 out/chunk_$x.mp4)
  [ "$n" = "$((B - A))" ] || { echo "trozo $x: $n fotogramas, esperaba $((B - A))"; exit 1; }
  ffmpeg -v error -y -i out/chunk_$x.mp4 -start_number $A -q:v 2 out/frames/f%05d.jpg
  echo "trozo $x ($A..$((B - 1))) OK"
done
missing=$(python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
echo "faltan $missing"
[ "$missing" = "0" ] || exit 1
python3 compose_industrial.py > out/compose.log 2>&1 && echo "$(date +%H:%M) COMPUESTO" >> out/render_progress.log
tail -3 out/compose.log
