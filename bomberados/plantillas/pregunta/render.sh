#!/bin/bash
# Render de una Pregunta del día a 60 fps en esta máquina (4 procesos). Uso: bomberados/plantillas/pregunta/render.sh projects/<p>
cd "$(dirname "$0")/../../.." || exit 1
P=$1
N=$(python3 -c "import json; L=json.load(open('$P/tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
mkdir -p $P/out/frames
for w in 0 1 2 3; do PROJ=$P FPS=60 SKIP=1 node bomberados/plantillas/pregunta/capture.mjs $P/out/frames --range 0 $N $w 4 > $P/out/render_w$w.log 2>&1 & done
wait
ls $P/out/frames | wc -l
