#!/bin/bash
# Termina el vídeo sin intervención: cuando acaba el trozo local 0-1030 sigue renderizando aquí el resto (saltando lo que ya
# exista) y, mientras, cada 2 min mira si las ramas render-aero-b/c/d ya traen su trozo: si sí, mete sus fotogramas (solo los
# que falten). Con los N fotogramas, compone el vídeo (out/ingenieria_aeroespacial.mp4) y escribe out/DONE.
# Uso: nohup ./auto_finish.sh <pid del render local en marcha> > out/auto.log 2>&1 &
cd /home/user/kiria-producer/projects/aeroespacial
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
WAIT_PID=$1
missing() { python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))"; }
fetch_chunks() {
  for spec in b:1030:2060 c:2060:3090 d:3090:$N; do
    IFS=: read x A B <<< "$spec"
    [ -f out/chunk_$x.done ] && continue
    git fetch -q origin render-aero-$x 2>/dev/null || continue
    git show origin/render-aero-$x:projects/aeroespacial/chunks/chunk_${A}_${B}.mp4 > out/chunk_$x.mp4 2>/dev/null || continue
    n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 out/chunk_$x.mp4)
    [ "$n" = "$((B - A))" ] || { echo "$(date +%H:%M) trozo $x: $n fotogramas (esperaba $((B - A)))"; continue; }
    rm -rf out/tmp_$x && mkdir -p out/tmp_$x && ffmpeg -v error -y -i out/chunk_$x.mp4 -start_number $A -q:v 2 out/tmp_$x/f%05d.jpg
    for f in out/tmp_$x/*.jpg; do b=$(basename $f); [ -f out/frames/$b ] || mv $f out/frames/$b; done
    rm -rf out/tmp_$x; touch out/chunk_$x.done; echo "$(date +%H:%M) trozo $x ($A..$((B - 1))) metido"
  done
}
( if [ "${WAIT_PID:-0}" -gt 1 ]; then while kill -0 $WAIT_PID 2>/dev/null; do sleep 20; done; fi
  echo "$(date +%H:%M) trozo local 0-1030 terminado; sigo con 1030-$N"
  WK=3 ./render_local.sh 1030 $N ) &
LOCAL=$!
while true; do
  fetch_chunks
  m=$(missing); echo "$(date +%H:%M) faltan $m"
  [ "$m" = "0" ] && break
  sleep 120
done
pkill -P $LOCAL 2>/dev/null; kill $LOCAL 2>/dev/null
for p in $(pgrep -f "node web/capture.mjs out/frames"); do kill $p 2>/dev/null; done
python3 compose_aero.py > out/compose.log 2>&1 && touch out/DONE && echo "$(date +%H:%M) COMPUESTO"
tail -3 out/compose.log
