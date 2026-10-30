#!/bin/bash
# Render de «Ingeniería Aeroespacial» a 60 fps en esta máquina (W procesos, cada uno un fotograma de cada W, en orden).
# Uso: ./render_local.sh [inicio] [fin]   (por defecto todos: 0..N-1). SKIP=1 salta los ya hechos, así que se puede relanzar.
cd /home/user/kiria-producer/projects/aeroespacial
A=${1:-0}; N=${2:-$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")}
WK=${WK:-3}
mkdir -p out/frames
for attempt in 1 2 3; do
  for w in $(seq 0 $((WK - 1))); do FPS=60 SKIP=1 timeout 30000 node web/capture.mjs out/frames --range $A $N $w $WK > out/render_w$w.log 2>&1 & sleep 8; done
  wait
  missing=$(python3 -c "import os; print(sum(1 for i in range($A, $N) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt ($A..$((N-1))): faltan $missing" >> out/render_progress.log
  [ "$missing" = "0" ] && break
done
