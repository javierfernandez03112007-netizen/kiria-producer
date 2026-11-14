#!/bin/bash
# Laboratorio: bash web/lab/lab.sh <módulo.js> <prueba.js> <nombre> t1 t2 ...   → projects/cerebro_congelado/out/lab_<nombre>/sheet.jpg
# (fotogramas sueltos: out/lab_<nombre>/fNNNNN.jpg con NNNNN = t·60). GHOST=0..1, NOHERO=1, PR=1.5, LABDAY=1 (fondo claro y luz de estudio),
# HERO=<ruta de otro 16_hero.js> y SKIN=<ruta de otro 13_skin.js> (relativas a web/lab) opcionales.
cd "$(dirname "$0")"; M=$1; T=$2; N=$3; shift 3
S=../src; SK=${SKIN:-$S/13_skin.js}; HE=${HERO:-$S/16_hero.js}
cat $S/00_head.js $S/01_common.js $S/02_hud.js $S/03_flow.js $S/04_fx.js $S/10_parts.js $SK $S/14_objects.js $HE $M $T lab_tail.js > scene_lab_$N.js
sed "s#./scene_lab.js#./scene_lab_$N.js#" index.html > index_$N.html
OUT=../../out/lab_$N; rm -rf $OUT; mkdir -p $OUT
INIT=""; [ -n "$GHOST" ] && INIT="window.GHOST=$GHOST;"; [ -n "$NOHERO" ] && INIT="$INIT window.NOHERO=true;"; [ -n "$LABDAY" ] && INIT="$INIT window.LABDAY=true;"
L=$(IFS=,; echo "$*")
LABINIT="$INIT" PAGE=projects/cerebro_congelado/web/lab/index_$N.html FPS=60 timeout 1200 node ../capture.mjs $OUT $L > $OUT/log.txt 2>&1
grep -v '^ok\|^$\|Material Name\|Program Info\|Material Type' $OUT/log.txt | head -8; grep '^ok' $OUT/log.txt
python3 sheet.py $OUT/sheet.jpg $(ls $OUT/f*.jpg) && echo "hoja: $(cd $OUT && pwd)/sheet.jpg"
