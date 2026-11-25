#!/bin/bash
# Recoge los fotogramas sueltos (chunks/all_A_B/ u odd_A_B/, f*.jpg) de TODAS las ramas render-e3-* y mete en out/frames los que falten.
# Termina cuando están los N fotogramas (escribe out/TODO_LISTO). Uso: nohup ./fetch_odd.sh > out/fetch.log 2>&1 &
cd /home/user/kiria-producer/projects/elecciones_29n_vox
PFX=${PFX:-render-e3}
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
missing() { python3 -c "import os; print(sum(1 for i in range($N) if not os.path.exists('out/frames/f%05d.jpg'%i)))"; }
while true; do
  git fetch -q origin "+refs/heads/$PFX-*:refs/remotes/origin/$PFX-*" 2>/dev/null
  for br in $(git branch -r --list "origin/$PFX-*"); do
    for d in $(git ls-tree --full-tree --name-only $br projects/elecciones_29n_vox/chunks/ 2>/dev/null | grep -E 'all_[0-9]+_[0-9]+$'); do
      tag=$(basename $d); h=$(git rev-parse $br:$d 2>/dev/null); [ -f out/$tag.$h.done ] && continue
      rm -rf out/tmp_$tag && mkdir -p out/tmp_$tag && git -C /home/user/kiria-producer archive $br $d | tar -x -C out/tmp_$tag || continue
      k=0; for f in out/tmp_$tag/$d/f[0-9][0-9][0-9][0-9][0-9].jpg; do b=$(basename $f); [ -s "$f" ] || continue; if [ ! -f out/frames/$b ]; then mv $f out/frames/$b; k=$((k + 1)); fi; done
      rm -rf out/tmp_$tag; touch out/$tag.$h.done; echo "$(date +%H:%M:%S) $br $tag: $k fotogramas nuevos"
    done
  done
  m=$(missing); echo "$(date +%H:%M:%S) faltan $m"
  [ "$m" = "0" ] && break
  sleep 20
done
touch out/TODO_LISTO; echo "$(date +%H:%M:%S) están los $N fotogramas"
