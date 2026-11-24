#!/bin/bash
# Render local en dos pasadas: primero los fotogramas PARES (con ellos ya se puede montar una versión a 30 fps para revisar) y luego los impares.
# Uso: nohup ./render_orden.sh > out/orden.log 2>&1 &
cd "$(dirname "$0")"; mkdir -p out/frames
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
for pass in "0 2" "1 3"; do
  for attempt in 1 2 3; do
    for w in $pass; do FPS=60 SKIP=1 timeout 30000 node web/capture.mjs out/frames --range 0 $N $w 4 > out/lw$w.log 2>&1 & sleep 5; done
    wait
    miss=$(python3 -c "import os; print(sum(1 for i in range($N) if i % 4 in ($(echo $pass | tr ' ' ',')) and not os.path.exists('out/frames/f%05d.jpg'%i)))")
    echo "$(date +%H:%M) pasada [$pass] intento $attempt: faltan $miss"; [ "$miss" = "0" ] && break
  done
  [ "$pass" = "0 2" ] && touch out/PARES_LISTOS
done
touch out/RENDER_LISTO; echo "$(date +%H:%M) render completo"
