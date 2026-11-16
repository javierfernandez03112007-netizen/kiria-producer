#!/bin/bash
# Vista previa rápida de «Así funciona: el microondas» para que Javi vea el vídeo entero antes del render bueno:
# 15 fps (un fotograma de cada 4) a media resolución (PR=0,5), con la voz y los efectos. → out/preview.mp4
# Uso: bash projects/microondas/preview.sh [WK=3]
cd "$(dirname "$0")"
WK=${WK:-3}; STEP=${STEP:-4}
N=$(python3 -c "import json; L=json.load(open('tiempos.json')); print(int((L[-1]['end'] + 1.2) * 60))")
(cd web && ./build.sh)
mkdir -p out/prev
for w in $(seq 0 $((WK - 1))); do
  T=$(python3 -c "print(','.join('%.4f' % (f / 60) for f in range($N) if f % $STEP == 0 and (f // $STEP) % $WK == $w))")
  PR=0.5 FPS=60 SKIP=1 timeout 20000 node web/capture.mjs out/prev "$T" > out/prev_w$w.log 2>&1 &
  sleep 6
done
wait
python3 - <<'EOF'
import os, sys, json, subprocess, cv2, numpy as np
sys.path.insert(0, os.getcwd()); import compose_microondas as cm
STEP = int(os.environ.get('STEP', 4)); fs = [f for f in range(cm.N) if f % STEP == 0]
miss = [f for f in fs if not os.path.exists('out/prev/f%05d.jpg' % f)]; print('faltan', len(miss))
cm.init(); os.path.exists('out/sfx.wav') or cm.sfx_track('out/sfx.wav')
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '540x960', '-r', str(60 // STEP), '-i', '-', '-i', 'assets/voz.mp3', '-i', 'out/sfx.wav',
                       '-filter_complex', '[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,apad[v];[2:a]volume=0.8[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]',
                       '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', 'out/preview.mp4'], stdin=subprocess.PIPE)
last = None
for f in fs:
    p = 'out/prev/f%05d.jpg' % f
    if os.path.exists(p): last = cv2.resize(cv2.imread(p), (1080, 1920))
    img = (last if last is not None else np.zeros((1920, 1080, 3), np.uint8)).astype(np.float32) / 255
    cm.SUBS.draw(img, f / 60, 1 - cm.prog(f / 60, cm.END - 0.5, 0.3))
    ff.stdin.write(cv2.resize((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), (540, 960)).tobytes())
ff.stdin.close(); ff.wait(); print('vista previa → out/preview.mp4')
EOF
