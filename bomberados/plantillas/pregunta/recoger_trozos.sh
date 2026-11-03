#!/bin/bash
# SESIÓN PRINCIPAL: recoge los trozos de projects/<p> que han subido las máquinas de ayuda (ramas render-bomberados-*)
# y los convierte en fotogramas en out/frames (para compose.py). Uso: bomberados/plantillas/pregunta/recoger_trozos.sh projects/<p>
cd "$(dirname "$0")/../../.." || exit 1
P=$1; NAME=$(basename "$P"); mkdir -p "$P/out/frames"
for r in $(git ls-remote --heads origin 'render-bomberados-*' | awk '{print $2}' | sed 's#refs/heads/##'); do
  W=$(mktemp -d); git fetch -q origin "$r" && git worktree add -q --detach "$W" FETCH_HEAD
  for c in "$W"/trozos/"$NAME"/*.mp4; do
    [ -f "$c" ] || continue
    A=$(basename "$c" .mp4 | awk -F_ '{print $(NF-1)}')
    ffmpeg -v error -y -i "$c" -start_number "$A" -q:v 2 "$P/out/frames/f%05d.jpg" && echo "trozo $(basename "$c") ← $r"
  done
  git worktree remove --force "$W"
done
ls "$P/out/frames" | wc -l
