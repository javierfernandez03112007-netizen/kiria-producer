#!/bin/bash
# Render de «Ingeniería Industrial» a 60 fps en esta máquina (4 procesos, cada uno un fotograma de cada 4, en orden).
# Uso: ./render_local.sh [fin]   (por defecto todos: 0..N-1). SKIP=1 salta los ya hechos, así que se puede relanzar.
cd /home/user/kiria-producer/projects/industrial
N=${1:-4221}
for attempt in 1 2 3; do
  for w in 0 1 2 3; do FPS=60 SKIP=1 timeout 20000 node web/capture.mjs out/frames --range 0 $N $w 4 > out/render_w$w.log 2>&1 & sleep 12; done
  wait
  missing=$(python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt (0..$((N-1))): faltan $missing" >> out/render_progress.log
  [ "$missing" = "0" ] && break
done
