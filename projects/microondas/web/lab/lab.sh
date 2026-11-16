#!/bin/bash
# Laboratorio del microondas: bash web/lab/lab.sh <módulo.js> <prueba.js> <nombre> t1 t2 ...  → projects/microondas/out/lab_<nombre>/sheet.jpg
# (fotogramas: out/lab_<nombre>/fNNNNN.jpg con NNNNN = t·60). PR=1.5 opcional. El motor y la cocina salen de web/src (00–13 y 11_env.js).
cd "$(dirname "$0")"; M=$1; T=$2; N=$3; shift 3
S=../src; cat $S/00_head.js $S/01_common.js $S/02_hud.js $S/03_flow.js $S/04_fx.js $S/10_parts.js $S/11_env.js $S/13_skin.js $EXTRA $M $T lab_tail.js > scene_lab_$N.js
sed "s#./scene.js#./scene_lab_$N.js#" index.html > index_$N.html
OUT=../../out/lab_$N; rm -rf $OUT; mkdir -p $OUT
L=$(IFS=,; echo "$*"); [ -n "$ENVFILE" ] && export LABINIT="window.ENVFILE='$ENVFILE';"
PAGE=projects/microondas/web/lab/index_$N.html FPS=60 timeout 1500 node ../capture.mjs $OUT $L > $OUT/log.txt 2>&1
grep -v '^ok\|^$' $OUT/log.txt | head -8; grep '^ok' $OUT/log.txt
python3 sheet.py $OUT/sheet.jpg $(ls $OUT/f*.jpg) && echo "hoja: $(cd $OUT && pwd)/sheet.jpg"
