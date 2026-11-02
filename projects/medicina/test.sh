#!/bin/bash
# Fotogramas de prueba en 3 procesos y una hoja de contactos: ./test.sh nombre t1 t2 t3 ...
cd /home/user/kiria-producer/projects/medicina && web/build.sh && name=$1; shift
rm -rf out/t_$name && mkdir -p out/t_$name
ts=("$@"); for w in 0 1 2; do l=""; for i in "${!ts[@]}"; do [ $((i % 3)) = $w ] && l="$l,${ts[$i]}"; done; [ -n "$l" ] && FPS=60 timeout 900 node web/capture.mjs out/t_$name ${l#,} > out/t_$name/w$w.log 2>&1 & done; wait
cat out/t_$name/w*.log | grep -v '^ok' | head -5
python3 /tmp/claude-0/sheet.py out/t_$name/sheet.jpg $(ls out/t_$name/f*.jpg)
