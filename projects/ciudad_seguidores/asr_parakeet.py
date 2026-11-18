"""Reconocimiento de voz con tiempos por palabra: Parakeet TDT 0.6b v3 int8 (sherpa-onnx) → asr_original.json [{w,start,end}].
Uso: PARAKEET=/ruta/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 python3 asr_parakeet.py
(ENTRADA=otro.mp3 SALIDA=otro.json para reconocer otro audio sin tocar asr_original.json)"""
import json, os, subprocess
import numpy as np
import sherpa_onnx

ROOT = os.path.dirname(os.path.abspath(__file__))
M = os.environ["PARAKEET"]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)
SR = 16000
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.environ.get("ENTRADA", os.path.join(ROOT, "assets", "voz_original.mp3")),
                                  "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)
# trozos de ≈ 25 s cortados en silencios para no saturar el modelo
hop = 160; n = len(x) // hop
db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12))
quiet = db < db.max() - 35
cuts, last = [0], 0
for i in range(n):
    if i * hop - last > 25 * SR and quiet[i] and all(quiet[i:i + 15]):
        cuts.append(i * hop + 7 * hop); last = cuts[-1]
cuts.append(len(x))
words = []
for a, b in zip(cuts[:-1], cuts[1:]):
    s = rec.create_stream(); s.accept_waveform(SR, x[a:b]); rec.decode_stream(s)
    r = s.result
    toks, ts = list(r.tokens), list(r.timestamps)
    for k, (t, tt) in enumerate(zip(toks, ts)):
        t0 = a / SR + tt
        if t.startswith(("▁", " ")) or not words or k == 0:
            words.append(dict(w=t.replace("▁", "").strip(), start=round(t0, 3), end=round(t0 + 0.08, 3)))
        else:
            words[-1]["w"] += t; words[-1]["end"] = round(t0 + 0.08, 3)
words = [w for w in words if w["w"].strip()]
json.dump(words, open(os.environ.get("SALIDA", os.path.join(ROOT, "asr_original.json")), "w"), ensure_ascii=False, indent=0)
print(len(words), "palabras;", " ".join(w["w"] for w in words))
