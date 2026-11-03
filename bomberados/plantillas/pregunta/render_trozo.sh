#!/bin/bash
# MÁQUINA DE AYUDA (grupo fijo de render de Bomberados): renderiza los fotogramas [A, B) de projects/<p>, los codifica en
# un trozo (mp4, crf 12) y lo sube a su rama de trozos (rama huérfana, solo con trozos/).
# Uso: bomberados/plantillas/pregunta/render_trozo.sh projects/<p> A B [procesos=4] [rama=render-bomberados-mN]
cd "$(dirname "$0")/../../.." || exit 1
P=$1; A=$2; B=$3; WK=${4:-4}; RAMA=${5:-render-bomberados-$(hostname | tail -c 6)}
NAME=$(basename "$P")
[ -x "$P/preparar.sh" ] && (cd "$P" && ./preparar.sh)          # p. ej. sacar los fotogramas de una grabación de la app
mkdir -p "$P/out/frames" "$P/out/trozos"
for w in $(seq 0 $((WK - 1))); do
  PROJ=$P FPS=60 SKIP=1 node bomberados/plantillas/pregunta/capture.mjs "$P/out/frames" --range "$A" "$B" "$w" "$WK" > "$P/out/trozo_w$w.log" 2>&1 &
done
wait
for f in $(seq "$A" $((B - 1))); do [ -f "$P/out/frames/f$(printf %05d "$f").jpg" ] || { echo "falta el fotograma $f"; exit 1; }; done
C="$P/out/trozos/${NAME}_${A}_${B}.mp4"
ffmpeg -v error -y -framerate 60 -start_number "$A" -i "$P/out/frames/f%05d.jpg" -frames:v $((B - A)) -c:v libx264 -preset medium -crf 12 -pix_fmt yuv420p "$C"
W=$(mktemp -d)
if git fetch -q origin "$RAMA" 2>/dev/null; then git worktree add -q --detach "$W" FETCH_HEAD
else git worktree add -q --detach "$W" && (cd "$W" && git checkout -q --orphan tmp && git rm -rqf . >/dev/null); fi
mkdir -p "$W/trozos/$NAME" && cp "$C" "$W/trozos/$NAME/"
(cd "$W" && git add trozos && git commit -qm "trozo $NAME $A-$B" && for i in 1 2 3 4; do git push -q origin HEAD:refs/heads/"$RAMA" && break || sleep $((2 ** i)); done)
git worktree remove --force "$W"
echo "hecho $NAME $A $B → rama $RAMA"
