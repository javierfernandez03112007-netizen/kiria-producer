"""Voz con ElevenLabs y tiempos de cada palabra (sin reconocedor de voz).
Uso: python3 engine/tts.py projects/<p> [--voz wnKyx1zkUEUnfURKiuaP] [--modelo eleven_multilingual_v2]
Lee <p>/script_tts.txt y escribe <p>/assets/voz_original.mp3 y <p>/asr_original.json ([{w, start, end}], el mismo formato
que el reconocedor Parakeet, para ajustar_voz.py).
Clave: el entorno la añade sola a api.elevenlabs.io; si no, variable ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (un archivo
fuera del repo). Nunca escribir la clave en el repositorio."""
import argparse
import base64
import json
import os

import requests

DANNY = "wnKyx1zkUEUnfURKiuaP"


def clave():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    f = os.environ.get("ELEVENLABS_KEY_FILE")
    if f and os.path.exists(f):
        return open(f).read().strip()
    return "x"   # el proxy del entorno la sustituye por la real


def palabras(al):
    out, cur, t0, t1 = [], "", None, None
    for ch, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                out.append({"w": cur, "start": round(t0, 3), "end": round(t1, 3)})
            cur, t0 = "", None
            continue
        if t0 is None:
            t0 = s
        cur, t1 = cur + ch, e
    if cur:
        out.append({"w": cur, "start": round(t0, 3), "end": round(t1, 3)})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("proyecto")
    ap.add_argument("--voz", default=DANNY)
    ap.add_argument("--modelo", default="eleven_multilingual_v2")
    ap.add_argument("--salida", default="voz_original")
    a = ap.parse_args()
    texto = " ".join(l.strip() for l in open(os.path.join(a.proyecto, "script_tts.txt"), encoding="utf-8") if l.strip())
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{a.voz}/with-timestamps",
                      headers={"xi-api-key": clave()}, json={"text": texto, "model_id": a.modelo}, timeout=300)
    r.raise_for_status()
    d = r.json()
    os.makedirs(os.path.join(a.proyecto, "assets"), exist_ok=True)
    open(os.path.join(a.proyecto, "assets", a.salida + ".mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
    ws = palabras(d["alignment"])
    json.dump(ws, open(os.path.join(a.proyecto, "asr_original.json" if a.salida == "voz_original" else a.salida + ".json"), "w"),
              ensure_ascii=False)
    print(len(ws), "palabras;", ws[-1]["end"], "s")


if __name__ == "__main__":
    main()
