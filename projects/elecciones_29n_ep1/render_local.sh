#!/bin/bash
# Render local de «29N, capítulo 0»: fotogramas A..B-1 a 60 fps en out/frames (4 procesos; salta los que ya existen).
# Uso: nohup ./render_local.sh A B > out/local.log 2>&1 &
cd "$(dirname "$0")"; A=$1; B=$2; mkdir -p out/frames
for attempt in 1 2 3; do
  for w in 0 1 2 3; do FPS=60 SKIP=1 timeout 30000 node web/capture.mjs out/frames --range $A $B $w 4 > out/lw$w.log 2>&1 & sleep 5; done
  wait
  miss=$(python3 -c "import os; print(sum(1 for i in range($A, $B) if not os.path.exists('out/frames/f%05d.jpg'%i)))")
  echo "$(date +%H:%M) intento $attempt: faltan $miss de $A-$B"; [ "$miss" = "0" ] && break
done
