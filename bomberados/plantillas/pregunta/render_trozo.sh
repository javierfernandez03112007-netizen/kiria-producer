#!/bin/bash
# MÁQUINA DE AYUDA (grupo fijo de render de Bomberados; ver README, «Render con el grupo fijo de máquinas de ayuda»).
# Trae la versión pedida de master a una copia aparte (~/render-wt: la copia principal de la sesión queda limpia), renderiza
# los fotogramas [A, B) de projects/<p>, los codifica en un trozo (mp4, crf 12: ≈ 46 dB, no se nota) y lo sube a su rama de
# trozos como un único commit huérfano (se sobrescribe en cada vídeo: las ramas no crecen).
# Se lanza SIEMPRE la versión de master, sin tocar la copia de la sesión:
#   git fetch -q origin master && bash <(git show origin/master:bomberados/plantillas/pregunta/render_trozo.sh) \
#       projects/<p> A B [procesos=4] [rama=render-bomberados-mN] [commit=origin/master]
main() {
  local P=$1 A=$2 B=$3 WK=${4:-4} RAMA=${5:-render-bomberados-$(hostname | tail -c 6)} REV=${6:-origin/master}
  [ -n "$P" ] && [ -n "$A" ] && [ -n "$B" ] || { echo "uso: render_trozo.sh projects/<p> A B [procesos] [rama] [commit]"; return 1; }
  local NAME; NAME=$(basename "$P")
  cd "$(git rev-parse --show-toplevel)" || return 1
  local i; for i in 1 2 3 4; do git fetch -q origin master && break; sleep $((2 ** i)); done
  local SHA; SHA=$(git rev-parse --short=7 "$REV^{commit}") || { echo "no encuentro el commit $REV"; return 1; }
  local WT=$HOME/render-wt
  if [ -e "$WT/.git" ]; then git -C "$WT" checkout -q -f --detach "$SHA" || return 1
  else git worktree prune; git worktree add -q -f --detach "$WT" "$SHA" || return 1; fi
  cd "$WT" || return 1
  if [ ! -f engine/fonts/impact.ttf ]; then      # Impact no se sube al repo (licencia): de la copia principal o de su fuente
    local MAIN; MAIN=$(git worktree list --porcelain | awk 'NR==1{print $2}')
    if [ -f "$MAIN/engine/fonts/impact.ttf" ]; then cp "$MAIN/engine/fonts/impact.ttf" engine/fonts/
    else
      command -v cabextract >/dev/null || apt-get install -y -qq cabextract >/dev/null 2>&1 ||
        { apt-get update -qq >/dev/null 2>&1; apt-get install -y -qq cabextract >/dev/null 2>&1; }
      python3 engine/fonts/get_impact.py >/dev/null || { echo "no pude bajar la fuente Impact"; return 1; }
    fi
  fi
  [ -x "$P/preparar.sh" ] && { (cd "$P" && ./preparar.sh) || { echo "falló preparar.sh"; return 1; }; }
  mkdir -p "$P/out/frames" "$P/out/trozos"
  # los trozos de este vídeo hechos con otro commit ya no valen
  [ "$(cat "$P/out/trozos/rev" 2>/dev/null)" = "$SHA" ] || rm -f "$P"/out/trozos/*.mp4
  echo "$SHA" > "$P/out/trozos/rev"
  local w f t0=$SECONDS
  for w in $(seq 0 $((WK - 1))); do
    PROJ=$P FPS=60 SKIP=1 node bomberados/plantillas/pregunta/capture.mjs "$P/out/frames" --range "$A" "$B" "$w" "$WK" > "$P/out/trozo_w$w.log" 2>&1 &
  done
  wait
  for f in $(seq "$A" $((B - 1))); do
    [ -f "$P/out/frames/f$(printf %05d "$f").jpg" ] || { echo "falta el fotograma $f"; tail -n 3 "$P"/out/trozo_w*.log; return 1; }
  done
  local C="$P/out/trozos/${NAME}_${A}_${B}.mp4"
  ffmpeg -v error -y -framerate 60 -start_number "$A" -i "$P/out/frames/f%05d.jpg" -frames:v $((B - A)) \
    -c:v libx264 -preset medium -crf 12 -pix_fmt yuv420p "$C" || return 1
  # commit huérfano con trozos/<NAME>/<todos los trozos de este vídeo hechos en esta máquina>
  local L="" T1 T2 T3 CM
  for f in "$P"/out/trozos/"${NAME}"_*.mp4; do L+=$(printf '100644 blob %s\t%s' "$(git hash-object -w "$f")" "$(basename "$f")")$'\n'; done
  T1=$(printf '%s' "$L" | git mktree) && T2=$(printf '040000 tree %s\t%s\n' "$T1" "$NAME" | git mktree) &&
    T3=$(printf '040000 tree %s\ttrozos\n' "$T2" | git mktree) || return 1
  CM=$(git commit-tree "$T3" -m "trozos $NAME ($A-$B) rev=$SHA") || return 1
  for i in 1 2 3 4; do
    git push -q -f origin "$CM:refs/heads/$RAMA" && break
    [ "$i" = 4 ] && { echo "no se pudo subir a $RAMA"; return 1; }; sleep $((2 ** i))
  done
  rm -f "$P"/out/frames/f*.jpg
  echo "hecho $NAME $A $B → rama $RAMA (rev=$SHA, $((SECONDS - t0)) s)"
}
main "$@"; exit
