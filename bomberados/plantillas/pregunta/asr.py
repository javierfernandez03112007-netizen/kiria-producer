"""Tiempos reales de cada palabra de la voz (Parakeet TDT v3 con sherpa-onnx), para ajustar_voz.py.
Uso: python3 bomberados/plantillas/pregunta/asr.py projects/<p>/assets/voz_original.mp3 projects/<p>/asr_original.json
Necesita: pip install sherpa-onnx  y el modelo en $ASR_MODEL (por defecto /root/asr/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8):
https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2"""
import json
import os
import subprocess
import sys

import numpy as np
import sherpa_onnx
d = os.environ.get('ASR_MODEL', '/root/asr/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8').rstrip('/') + '/'
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+'encoder.int8.onnx', decoder=d+'decoder.int8.onnx', joiner=d+'joiner.int8.onnx', tokens=d+'tokens.txt', model_type='nemo_transducer', num_threads=4)
raw = subprocess.run(['ffmpeg','-v','quiet','-i',sys.argv[1],'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True).stdout
x = np.frombuffer(raw, np.float32)
s = rec.create_stream(); s.accept_waveform(16000, x); rec.decode_stream(s)
r = s.result
toks, ts = r.tokens, r.timestamps
words = []
for t, tt in zip(toks, ts):
    if t.startswith(' ') or not words:
        words.append(dict(w=t.strip(), start=round(float(tt),3)))
    else:
        words[-1]['w'] += t
for i,w in enumerate(words):
    w['end'] = words[i+1]['start'] if i+1 < len(words) else round(len(x)/16000,3)
json.dump(words, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
print(r.text)
