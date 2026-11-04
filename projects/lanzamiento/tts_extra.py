"""Frases nuevas con la voz de Javi (Danny, ElevenLabs v4, estabilidad 0,50, similitud 0,75: los ajustes de su archivo
«…Danny_…_pvc_s50_sim75_v4.mp3») en UNA sola toma, para que suenen igual entre sí: assets/extra.mp3 + assets/extra.json (tiempos de
cada palabra). Luego se cortan y se pegan en su toma (voz_con_extra.py). Clave: la pone el entorno (api.elevenlabs.io)."""
import base64
import json
import os
import sys

import requests

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from engine.tts import clave, palabras, DANNY  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
TEXTO = ("Más de dos mil quinientos seguidores nuevos en seis días. ¿Cómo? ... "
         "Y además, puedes probar tu objeto en 3D... y ver cómo se vería en redes... o en una página web. ... "
         "Si quieres vídeos así, comenta Kiria y te paso el enlace por privado.")
r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{DANNY}/with-timestamps", headers={"xi-api-key": clave()},
                  json={"text": TEXTO, "model_id": "eleven_v4", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.0, "use_speaker_boost": True}},
                  timeout=180)
if r.status_code != 200:
    sys.exit(f"error {r.status_code}: {r.text[:300]}")
d = r.json()
open(os.path.join(ROOT, "assets", "extra.mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
ws = palabras(d["alignment"])
json.dump(ws, open(os.path.join(ROOT, "assets", "extra.json"), "w"), ensure_ascii=False, indent=0)
print(len(ws), "palabras:", " ".join(f"{w['w']}@{w['start']:.2f}" for w in ws))
