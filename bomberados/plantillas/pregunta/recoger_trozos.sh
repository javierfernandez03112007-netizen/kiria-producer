#!/bin/bash
# SESIÓN PRINCIPAL: recoge los trozos de projects/<p> que han subido las máquinas de ayuda (ramas render-bomberados-*) y los
# pasa a fotogramas en out/frames (para compose.py). ESPERA=N: espera (lánzalo en segundo plano) hasta que haya N trozos;
# REV=<commit>: solo valen los trozos renderizados con ese commit.
# Uso: [ESPERA=3] [REV=abc1234] bomberados/plantillas/pregunta/recoger_trozos.sh projects/<p>
main() {
  cd "$(dirname "$0")/../../.." || return 1
  local P=$1 NAME r c k n A; NAME=$(basename "$P"); mkdir -p "$P/out/frames"
  local -a REFS
  while :; do
    git fetch -q -p origin '+refs/heads/render-bomberados-*:refs/remotes/origin/render-bomberados-*' 2>/dev/null
    REFS=(); n=0
    for r in $(git for-each-ref --format='%(refname)' 'refs/remotes/origin/render-bomberados-*'); do
      [ -n "$REV" ] && ! git log -1 --format=%s "$r" | grep -q "rev=${REV:0:7}" && continue
      k=$(git ls-tree --name-only "$r" "trozos/$NAME/" | grep -c '\.mp4$')
      [ "$k" -gt 0 ] && { REFS+=("$r"); n=$((n + k)); }
    done
    [ "$n" -ge "${ESPERA:-0}" ] && break
    sleep 15
  done
  local TMP; TMP=$(mktemp -d)
  for r in "${REFS[@]}"; do
    for c in $(git ls-tree --name-only "$r" "trozos/$NAME/" | grep '\.mp4$'); do
      A=$(basename "$c" .mp4 | awk -F_ '{print $(NF-1)}')
      git cat-file blob "$r:$c" > "$TMP/t.mp4" &&
        ffmpeg -v error -y -i "$TMP/t.mp4" -start_number "$A" -q:v 2 "$P/out/frames/f%05d.jpg" && echo "trozo $(basename "$c") ← ${r##*/}"
    done
  done
  rm -rf "$TMP"
  echo "fotogramas en $P/out/frames: $(ls "$P/out/frames" | wc -l)"
}
main "$@"; exit
