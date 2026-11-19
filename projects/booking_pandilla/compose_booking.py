"""Compone el spot «El plan lo ponéis vosotros» (Booking.com para «La pandilla low-cost», trabajo de clase; 16:9, 40 s, 30 fps):
fotogramas 3D de los planos 1–5 (out/frames, 0–35 s, ya con los mensajes, la pantalla de la app y los textos del guion)
+ plano 6 (35–40 s) hecho aquí: el selfi se congela en una foto sobre el azul de la marca, con el eslogan arriba y «Booking.com · Descarga la app» abajo
+ subtítulos de lo que dicen (el eslogan final va como rótulo) + la voz (un MP3, cada frase en su segundo) + efectos SOLO de la biblioteca de ElevenLabs del canal.
+ música ORIGINAL sintetizada con musica.py (Javi pidió «cualquiera que encaje»; el guion pide pop/indie libre de derechos: esta es nuestra, sin derechos de nadie).

    python3 build_voz.py && python3 env_voz.py && python3 musica.py
    (render → out/frames)
    python3 projects/booking_pandilla/compose_booking.py [--test t1 t2 ...] [--sfx]
"""
import json
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 30, 1920, 1080
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END, T3D = 40.0, 35.0
N, N3D = int(END * FPS), int(T3D * FPS)
FRAMES = os.environ.get("FRAMES_DIR", os.path.join(ROOT, "out", "frames"))
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
FONTS = os.path.join(ROOT, "..", "..", "engine", "fonts")
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]
BLUE, YEL, CTA = (0x00, 0x35, 0x80), (0xFE, 0xBB, 0x02), (0x00, 0x71, 0xC2)          # RGB


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
sm = lambda x: (lambda u: u * u * (3 - 2 * u))(clamp(x))
eo = lambda x: 1 - (1 - clamp(x)) ** 3


def pop(t, t0, d=0.35):
    u = clamp((t - t0) / d)
    return 0.0 if u <= 0 else 1.0 if u >= 1 else 1 + np.sin(u * np.pi * 1.15) * (1 - u) * 0.55 + (eo(u) - 1)


# ---------------------------------------------------------------- subtítulos: en el sofá van bajo el grupo (a la izquierda de la pantalla de la app); en la votación, centrados
SUBS_L = SUBS_C = None


def init():
    global SUBS_L, SUBS_C
    blank = lambda l: dict(l, words=[])
    kw = dict(y=972, size=60, max_words=9, max_chars=46, style="accent", accent=hex_bgr("#FFFFFF"), stroke=6, face="black")
    SUBS_L = Subs([l if i < 4 else blank(l) for i, l in enumerate(LINES)], {}, {}, maxw=1120, W=1230, **kw)
    SUBS_C = Subs([l if i == 4 else blank(l) for i, l in enumerate(LINES)], {}, {}, maxw=1640, W=W, **kw)


# ---------------------------------------------------------------- plano 6 · el cierre
def fnt(name, px):
    return ImageFont.truetype(os.path.join(FONTS, name), px)


def text_sprite(parts, px, font="Inter-Black.otf", shadow=True):
    """parts: [(texto, (r,g,b))…] en una línea → RGBA (float, BGR premultiplicado) y su ancho/alto."""
    f = fnt(font, px); pad = int(px * 0.4)
    w = int(sum(f.getlength(p[0]) for p in parts)) + 2 * pad; asc, desc = f.getmetrics(); h = asc + desc + 2 * pad
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = pad
    for txt, col in parts:
        d.text((x, pad), txt, font=f, fill=col + (255,)); x += f.getlength(txt)
    a = np.asarray(im).astype(np.float32) / 255
    return np.dstack([a[..., 2], a[..., 1], a[..., 0]]) * a[..., 3:4], a[..., 3]


def put_sprite(img, spr, cx, cy, alpha=1.0, scale=1.0):
    rgb, a = spr
    if alpha <= 0.003:
        return
    if abs(scale - 1) > 0.002:
        rgb = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC); a = cv2.resize(a, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
    h, w = a.shape; x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2)); xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    A = (a[ya - y0:yb - y0, xa - x0:xb - x0] * alpha)[..., None]
    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - A) + rgb[ya - y0:yb - y0, xa - x0:xb - x0] * alpha


@lru_cache(1)
def closing_assets():
    last = cv2.imread(os.path.join(FRAMES, f"f{N3D - 1:05d}.jpg")).astype(np.float32) / 255
    # fondo: azul de la marca con un degradado suave y puntos
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); r = np.hypot((xx - W * 0.5) / W, (yy - H * 0.48) / H)
    k = np.clip(1.12 - r * 0.9, 0.55, 1.15)[..., None]; bg = np.array([BLUE[2], BLUE[1], BLUE[0]], np.float32) / 255 * k
    dots = ((xx.astype(int) % 48 < 4) & (yy.astype(int) % 48 < 4))[..., None] * 0.035; bg = np.clip(bg + dots, 0, 1).astype(np.float32)
    # la foto: el último fotograma con marco blanco (como una foto revelada) y su sombra
    pw, bd = 1010, 20; ph = int(pw * H / W); card = np.ones((ph + 2 * bd + 46, pw + 2 * bd, 3), np.float32) * 0.985
    card[bd:bd + ph, bd:bd + pw] = cv2.resize(last, (pw, ph), interpolation=cv2.INTER_AREA)
    wt, yl = (255, 255, 255), YEL
    S = dict(l1=text_sprite([("El plan lo ponéis ", wt), ("vosotros.", yl)], 78), l2=text_sprite([("El sitio, ", wt), ("Booking.com", yl)], 78),
             logo=text_sprite([("Booking", wt), (".com", (0x4F, 0xB3, 0xFF))], 104), app=None)
    # botón «Descarga la app»
    f = fnt("Inter-Black.otf", 44); tw = int(f.getlength("Descarga la app")); bw, bh = tw + 96, 96; im = Image.new("RGBA", (bw + 8, bh + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, bw + 4, bh + 4), 22, fill=YEL + (255,)); d.text((4 + 48, 4 + (bh - sum(f.getmetrics())) / 2), "Descarga la app", font=f, fill=(0x1A, 0x1A, 0x1A, 255)); a = np.asarray(im).astype(np.float32) / 255
    S["app"] = (np.dstack([a[..., 2], a[..., 1], a[..., 0]]) * a[..., 3:4], a[..., 3])
    return last, bg, card, S


def closing(t):
    last, bg, card, S = closing_assets(); u = t - T3D
    k = sm(u / 0.75)                                               # la foto encoge desde pantalla completa hasta su sitio
    img = bg.copy()
    ch, cw = card.shape[:2]; s1 = 0.84; s0 = W / (cw - 40); s = s0 + (s1 - s0) * k; ang = -3.2 * k; cx, cy = W / 2, H / 2 + (534 - H / 2) * k + 13 * s * (1 - k)
    M = cv2.getRotationMatrix2D((cw / 2, ch / 2), ang, s); M[0, 2] += cx - cw / 2; M[1, 2] += cy - ch / 2
    mask = cv2.warpAffine(np.ones((ch, cw), np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    if k > 0.02:                                                   # sombra
        sh = cv2.GaussianBlur(cv2.warpAffine(np.ones((ch, cw), np.float32), M + np.array([[0, 0, 0], [0, 0, 22]], np.float32), (W, H)), (0, 0), 26) * 0.5 * k
        img *= (1 - sh)[..., None]
    ph = cv2.warpAffine(card, M, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR)
    img = img * (1 - mask[..., None]) + ph * mask[..., None]
    # eslogan (con la voz) y marca
    t1 = min(at("plan", 1, 6) - 0.25, T3D + 0.75); t2 = at("sitio", 1, 6) - 0.3; t3 = min(at("booking", 1, 6) - 0.15, END - 1.7)
    a1, a2 = sm((t - t1) / 0.4), sm((t - t2) / 0.4)
    put_sprite(img, S["l1"], W / 2, 80 + (1 - a1) * 22, a1); put_sprite(img, S["l2"], W / 2, 168 + (1 - a2) * 22, a2)
    kl = pop(t, t3, 0.4); lw = S["logo"][1].shape[1]; aw = S["app"][1].shape[1]; tot = lw + aw - 10; x0 = W / 2 - tot / 2
    if kl > 0.01:
        put_sprite(img, S["logo"], x0 + lw / 2, 962, clamp((t - t3) / 0.15), 0.8 + 0.2 * kl)
    ka = pop(t, t3 + 0.25, 0.4)
    if ka > 0.01:
        put_sprite(img, S["app"], x0 + lw - 10 + aw / 2, 968, clamp((t - t3 - 0.25) / 0.15), 0.8 + 0.2 * ka)
    fl = (1 - clamp(u / 0.4)) ** 2                                  # el destello de la foto
    return img * (1 - fl) + fl


def compose(fi):
    t = fi / FPS
    if fi < N3D:
        img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
        fl = clamp((t - (T3D - 0.07)) / 0.07) * 0.9                 # el destello empieza en los dos últimos fotogramas del selfi
        if fl > 0:
            img = img * (1 - fl) + fl
        if t < LINES[4]["start"] - 0.03:                            # cada subtítulo se va cuando acaba su frase (no se queda bajo el plano siguiente)
            SUBS_L.draw(img, t, 1.0)
        elif t < LINES[4]["end"] + 0.3:
            SUBS_C.draw(img, t, 1.0)
    else:
        img = closing(t)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


# ---------------------------------------------------------------- efectos: SOLO de la biblioteca de ElevenLabs del canal (projects/<vídeo>/assets/sfx), uno por cosa que pasa
_CACHE = {}


def sample(name, sr):
    if name not in _CACHE:
        proj, n = name.split("/")
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(PROJ, proj, "assets", "sfx", n + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64); x = x / (np.abs(x).max() + 1e-9) * 0.5; on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR; out = np.zeros(int((END + 1) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    c1 = at("uno", 1, 5); no, si = at("uf", 1, 3), at("este", 1, 4); t4 = min(at("dividimos", 1, 2), no - 1.6); t5 = min(at("cuatro", 1, 2), no - 0.95)
    point = min(c1 - 0.02, 22.45); ex = point + 0.45; press = ex + 0.55; ok = press + 0.14          # igual que TL en web/src/30_center.js
    # 1 · biblioteca: un lápiz, el aviso del grupo y la mano coge el móvil
    put("magisterio/lapiz", 0.15, 0.8, 0.14, 0.3); put("lanzamiento/mensaje", 1.0, 0.6, 0.5, 0.2); put("magisterio/papel", 3.72, 0.4, 0.26, 0.15)
    # 2 · responden los tres: un «pop» por mensaje
    put("avion/pop", 5.5, 0.4, 0.5, 0.12); put("economia/pop", 7.1, 0.4, 0.5, 0.12); put("tapas/pop", 8.8, 0.4, 0.5, 0.12)
    # 3 · la app: entra la pantalla, ordenar, opiniones, la cuenta, «ese no» y «este sí»
    put("lanzamiento/desliza", 10.68, 0.5, 0.3, 0.2); put("lanzamiento/tap", 11.2, 0.3, 0.36, 0.1); put("promo_web/scroll", 11.34, 0.45, 0.24, 0.15)
    rev = at("mirad", 1, 1)
    for i in range(3):
        put("lanzamiento/tarjeta", rev + 0.3 + i * 0.36, 0.3, 0.2, 0.1)
    put("avion/cifra", t4, 0.4, 0.28, 0.12); put("economia/ding", t5, 0.6, 0.34, 0.25)
    put("avion/error", no + 0.12, 0.5, 0.26, 0.2); put("quimica/ok", si + 0.02, 0.5, 0.36, 0.2)
    # 4 · la votación: tres toques en la mesa, todos señalan, «Reservar» y confirmada
    for k in ("tres", "dos"):
        put("magisterio/madera_toc", at(k, 1, 5) + 0.05, 0.25, 0.3, 0.1)
    put("avion/pop", point + 0.05, 0.4, 0.42, 0.12); put("lanzamiento/desliza", ex, 0.4, 0.2, 0.15)
    put("avion/clic", press, 0.3, 0.55, 0.1); put("avion/ding", ok + 0.02, 0.8, 0.5, 0.35); put("avion/brillo", 24.35, 0.85, 0.3, 0.4)
    # 5 · el viaje (lo lleva la música): solo el clic de la foto
    put("avion/clic", 34.94, 0.3, 0.6, 0.1)
    # 6 · el cierre: aparece la marca
    put("avion/whoosh", 35.05, 0.6, 0.22); put("economia/brillo", min(at("booking", 1, 6) - 0.15, END - 1.7), 1.0, 0.3, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr.split("Summary:")[-1]
    g = lambda k: float(r.split(k)[1].split()[0])
    return g("I:"), g("Peak:")


def audio_mix(dst):
    """Voz (−15 LUFS) + efectos + música (si existen) → dst (48 kHz estéreo) a ≈ −15 LUFS con limitador."""
    out = os.path.join(ROOT, "out"); sfxp = os.path.join(out, "sfx.wav"); sfx_track(sfxp)
    mus = os.path.join(out, "musica.wav"); voz = os.path.exists(AUDIO); ins, parts, lab = [], [], []
    if voz:
        ins += ["-i", AUDIO]; parts.append(f"[{len(lab)}:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur={END}[v]"); lab.append("[v]")
    ins += ["-i", sfxp]; parts.append(f"[{len(lab)}:a]volume=0.8,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur={END}[s]"); lab.append("[s]")
    if os.path.exists(mus):
        ins += ["-i", mus]; parts.append(f"[{len(lab)}:a]volume={MUSIC_GAIN},aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur={END}[m]"); lab.append("[m]")
    raw = os.path.join(out, "mix_raw.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(parts) + ";" + "".join(lab) + f"amix=inputs={len(lab)}:duration=longest:normalize=0[a]", "-map", "[a]", "-t", str(END), "-ar", "48000", raw], check=True)
    i0, p0 = lufs(raw); g = max(-12.0, min(14.0, -15.0 - i0))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", f"volume={g:.2f}dB,alimiter=limit=0.84:level=false", "-ar", "48000", dst], check=True)
    i1, p1 = lufs(dst); print(f"audio: {'voz + ' if voz else 'SIN voz · '}efectos{' + música' if os.path.exists(mus) else ''} · {i0:.1f} → {i1:.1f} LUFS (pico {p1:.1f} dBFS)")
    return voz


MUSIC_GAIN = float(os.environ.get("MUSIC_GAIN", 0.7))


def main(dst=os.path.join(ROOT, "out", "booking_pandilla.mp4")):
    missing = [i for i in range(N3D) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    mix = os.path.join(ROOT, "out", "mix.wav"); voz = audio_mix(mix)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", mix,
           "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "9M", "-bufsize", "18M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", str(END), "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(int(os.environ.get("PROCS", 4)), initializer=init) as pool:
        for buf in pool.imap(compose, range(N), chunksize=8):
            ff.stdin.write(buf)
    ff.stdin.close(); ff.wait()
    print("vídeo →", dst, "(con voz)" if voz else "(SIN voz: falta assets/voz.mp3)")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        init(); os.makedirs(os.path.join(ROOT, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[2:]]:
            fr = np.frombuffer(compose(int(round(t * FPS))), np.uint8).reshape(H, W, 3)
            cv2.imwrite(os.path.join(ROOT, "out", "ctest", f"c{t:05.2f}.jpg"), fr)
    elif len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav"))
    elif len(sys.argv) > 1 and sys.argv[1] == "--audio":
        audio_mix(os.path.join(ROOT, "out", "mix.wav"))
    else:
        main()
