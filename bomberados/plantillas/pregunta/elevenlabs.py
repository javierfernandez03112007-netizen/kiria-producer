"""Voz y efectos con la API de ElevenLabs (sin pegar la clave en el código).

    python3 bomberados/plantillas/pregunta/elevenlabs.py voz projects/<p> [--modelo eleven_multilingual_v2] [--stability 0.38] [--style 0.35]
        → assets/voz_original.mp3 (Danny, español peninsular) a partir de script_tts.txt
        → asr_original.json con los tiempos EXACTOS de cada palabra (los da ElevenLabs), emparejados con script.txt
          (mismo número de palabras en los dos ficheros). Después: ajustar_voz.py projects/<p>
    python3 bomberados/plantillas/pregunta/elevenlabs.py efecto projects/<p>/assets/sfx/<nombre>.mp3 <segundos> "<descripción en inglés>"

Clave: el entorno «Predeterminado» la añade sola a las peticiones a api.elevenlabs.io. Si el proxy responde «upstream auth
failed», pedir a Javi que vuelva a guardar la clave en la configuración del entorno o exportarla solo para esa sesión en
XI_API_KEY (nunca en el repositorio). La cuenta no es Creator: el mp3 va a 128 kbps (192 da error 403).
Comprobar después con asr.py que la voz dijo todas las palabras (Danny a veces se las salta o cambia el acento: en el
PAS dijo «opósite»; se arregló escribiendo «oposíte» en script_tts.txt)."""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.elevenlabs.io/v1"
DANNY = "wnKyx1zkUEUnfURKiuaP"        # Danny - Relatable, Expressive and Warm (es, peninsular)


def call(url, body):
    h = {"Content-Type": "application/json"}
    if os.environ.get("XI_API_KEY"):
        h["xi-api-key"] = os.environ["XI_API_KEY"]
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=h, method="POST")
    try:
        return urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs HTTP {e.code}: {e.read()[:400].decode(errors='replace')} {e.headers.get('X-Proxy-Error', '')}")


def voz(proj, modelo="eleven_multilingual_v2", stability=0.38, style=0.35):
    text = "\n".join(l.strip() for l in open(os.path.join(proj, "script_tts.txt"), encoding="utf-8") if l.strip())
    body = {"text": text, "model_id": modelo, "voice_settings": {"stability": stability, "similarity_boost": 0.8, "style": style,
                                                                     "use_speaker_boost": True, "speed": 1.0}}
    if modelo != "eleven_v3":
        body["language_code"] = "es"
    d = json.loads(call(f"{API}/text-to-speech/{DANNY}/with-timestamps?output_format=mp3_44100_128", body))
    os.makedirs(os.path.join(proj, "assets"), exist_ok=True)
    open(os.path.join(proj, "assets", "voz_original.mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]
    words, cur = [], None
    for c, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if c.isspace():
            if cur:
                words.append(cur)
            cur = None
            continue
        cur = cur or {"w": "", "start": s, "end": e}
        cur["w"] += c
        cur["end"] = e
    if cur:
        words.append(cur)
    script = [w for l in open(os.path.join(proj, "script.txt"), encoding="utf-8") for w in l.split()]
    if len(script) != len(words):
        sys.exit(f"script.txt tiene {len(script)} palabras y script_tts.txt {len(words)}: deben coincidir")
    out = [{"w": sw.strip("¿?¡!.,:;…"), "start": round(w["start"], 3), "end": round(w["end"], 3)} for sw, w in zip(script, words)]
    json.dump(out, open(os.path.join(proj, "asr_original.json"), "w"), ensure_ascii=False, indent=1)
    print(f"voz → {proj}/assets/voz_original.mp3 ({words[-1]['end']:.2f} s); tiempos → asr_original.json")


def efecto(dst, seg, texto, influencia=0.5):
    data = call(f"{API}/sound-generation?output_format=mp3_44100_128", {"text": texto, "duration_seconds": seg, "prompt_influence": influencia})
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    open(dst, "wb").write(data)
    print("efecto →", dst)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "voz":
        kw = {}
        for k, f in (("--modelo", str), ("--stability", float), ("--style", float)):
            if k in a:
                kw[k[2:]] = f(a[a.index(k) + 1])
        voz(a[1], **kw)
    elif a and a[0] == "efecto":
        efecto(a[1], float(a[2]), a[3], float(a[4]) if len(a) > 4 else 0.5)
    else:
        print(__doc__)
