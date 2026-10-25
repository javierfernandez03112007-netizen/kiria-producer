#!/bin/bash
# Reparto en 4 máquinas: esta hace 0..1599 (los procesos ya lanzados por render_all.sh siguen); el resto lo hacen otras 3 sesiones
# (1600..2299, 2300..2999, 3000..3687) y suben su trozo como vídeo a ramas render-dientes-a/b/c.
cd /home/user/kiria-producer/projects/dientes
B=1600
miss() { python3 -c "import os; print(sum(1 for i in range($B) if not os.path.exists('out/frames/f%05d.jpg'%i)))"; }
while [ "$(miss)" != "0" ] && pgrep -f "capture.mjs out/frames" > /dev/null; do sleep 30; done
pkill -f "capture.mjs out/frames"
for attempt in 1 2 3; do
  [ "$(miss)" = "0" ] && break
  for w in 0 1 2 3; do FPS=60 SKIP=1 node web/capture.mjs out/frames --range 0 $B $w 4 > out/local_w$w.log 2>&1 & sleep 12; done
  wait
done
echo "$(date +%H:%M) local 0..$((B-1)) hecho, faltan $(miss)" >> out/render_progress.log
