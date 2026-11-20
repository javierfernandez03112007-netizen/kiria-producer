#!/bin/bash
# Recoge los trozos de TODAS las ramas render-vc-* (chunks/chunk_A_B.mp4), mete los fotogramas que falten y, con los N,
# compone el vídeo (out/voz_cerebro.mp4) y escribe out/DONE. Uso: nohup ./fetch_compose.sh > out/fetch.log 2>&1 &
cd /home/user/kiria-producer/projects/voz_cerebro
PFX=${PFX:-render-vc}
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
missing() { python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))"; }
while true; do
  git fetch -q origin "+refs/heads/$PFX-*:refs/remotes/origin/$PFX-*" 2>/dev/null
  for br in $(git branch -r --list "origin/$PFX-*"); do
    X=${br##*-}
    # 1, 5 y 6 (y los nuevos, ≥ 6) solo valen con el arreglo de la cabeza de cristal (72b508d); 2–4 no tienen cabeza
    if [ "$X" = 1 ] || [ "$X" = 5 ] || [ "$X" -ge 6 ]; then git merge-base --is-ancestor 72b508d $br 2>/dev/null || continue; fi
    for c in $(git ls-tree --full-tree --name-only $br projects/voz_cerebro/chunks/ 2>/dev/null | grep 'chunk_[0-9]*_[0-9]*\.mp4'); do
      tag=$(basename $c .mp4); [ -f out/$tag.done ] && continue
      A=$(echo $tag | cut -d_ -f2); B=$(echo $tag | cut -d_ -f3)
      git show $br:$c > out/$tag.mp4 || continue
      n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 out/$tag.mp4)
      [ "$n" = "$((B - A))" ] || { echo "$(date +%H:%M) $br $tag: $n fotogramas (esperaba $((B - A)))"; continue; }
      rm -rf out/tmp_$tag && mkdir -p out/tmp_$tag && ffmpeg -v error -y -i out/$tag.mp4 -start_number $A -q:v 2 out/tmp_$tag/f%05d.jpg
      for f in out/tmp_$tag/*.jpg; do b=$(basename $f); i=$((10#$(echo $b | tr -dc 0-9)))
        [ -f out/frames/$b ] || mv $f out/frames/$b; done
      rm -rf out/tmp_$tag; touch out/$tag.done; echo "$(date +%H:%M) $br $tag metido"
    done
  done
  m=$(missing); echo "$(date +%H:%M) faltan $m"
  [ "$m" = "0" ] && break
  sleep 30
done
for p in $(pgrep -f "auto_finish.sh") $(pgrep -f "render_local.sh"); do kill $p 2>/dev/null; done
for p in $(pgrep -f "node web/capture.mjs out/frames"); do kill $p 2>/dev/null; done
sleep 3
while [ ! -f out/SFX_READY ]; do sleep 20; done      # los efectos tienen que estar revisados antes de componer
python3 compose_voz.py > out/compose.log 2>&1 && touch out/DONE && echo "$(date +%H:%M) COMPUESTO"
tail -3 out/compose.log
