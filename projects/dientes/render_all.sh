#!/bin/bash
# Render completo de «No te enjuagues» a 60 fps (4 procesos), reintentos hasta que no falte ningún fotograma, y composición final.
cd /home/user/kiria-producer/projects/dientes
N=3688
for attempt in 1 2 3 4; do
  for w in 0 1 2 3; do
    FPS=60 SKIP=1 timeout 15000 node web/capture.mjs out/frames --range 0 $N $w 4 > out/render_w$w.log 2>&1 &
    sleep 20
  done
  wait
  missing=$(python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt: faltan $missing" >> out/render_progress.log
  [ "$missing" = "0" ] && break
done
python3 compose_dientes.py > out/compose.log 2>&1
echo "$(date +%H:%M) COMPUESTO" >> out/render_progress.log
