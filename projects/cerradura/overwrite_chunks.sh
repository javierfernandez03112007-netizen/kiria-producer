#!/bin/bash
# Re-render de un tramo: trae los trozos de las ramas <prefijo>* (p. ej. render-cer-m) y SOBREESCRIBE sus fotogramas en out/frames
# (fetch_compose.sh solo rellena los que faltan). Uso: ./overwrite_chunks.sh render-cer-m
cd /home/user/kiria-producer/projects/cerradura
P=$1
git fetch -q origin "+refs/heads/$P*:refs/remotes/origin/$P*" 2>/dev/null
for br in $(git branch -r --list "origin/$P*"); do
  for c in $(git ls-tree --full-tree --name-only $br projects/cerradura/chunks/ 2>/dev/null | grep 'chunk_[0-9]*_[0-9]*\.mp4'); do
    tag=$(basename $c .mp4); A=$(echo $tag | cut -d_ -f2); B=$(echo $tag | cut -d_ -f3)
    git show $br:$c > out/re_$tag.mp4 || continue
    n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 out/re_$tag.mp4)
    [ "$n" = "$((B - A))" ] || { echo "$br $tag: $n fotogramas (esperaba $((B - A)))"; continue; }
    rm -rf out/tmp_re && mkdir -p out/tmp_re && ffmpeg -v error -y -i out/re_$tag.mp4 -start_number $A -q:v 2 out/tmp_re/f%05d.jpg
    mv -f out/tmp_re/*.jpg out/frames/ && echo "$br $tag sobrescrito ($A..$((B - 1)))"
  done
done
rm -rf out/tmp_re
