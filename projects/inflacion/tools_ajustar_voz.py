"""Ajusta el ritmo de la voz: acorta pausas y acelera ligeramente sin cambiar el tono.
Uso: python3 tools_ajustar_voz.py assets/voz_original.mp3 assets/voz.mp3"""
import subprocess, sys, numpy as np

SR = 44100
PAUSA_FRASE = 0.30      # pausa entre frases (s)
PAUSA_DRAMA = 0.65      # pausa antes de "Esto no es un juego"
PAUSA_INTERNA = 0.20    # tope de pausas dentro de una frase
TEMPO = 1.04            # aceleración global (atempo, conserva el tono)

# fin de frase -> inicio de la siguiente (segundos, medidos con detección de silencios + DP)
CORTES_FRASE = [(2.63, 3.10), (8.70, 9.25), (17.14, 17.67), (23.52, 23.98), (28.68, 29.16),
                (35.72, 36.14), (39.30, 39.74), (43.16, 43.73), (50.07, 50.57), (56.31, 56.86),
                (58.17, 58.57), (59.65, 60.31)]
DRAMA = 9  # índice del corte anterior a "Esto no es un juego"

def leer(f):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def silencios(x, min_d=0.15):
    hop = 441; n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[:n*hop].reshape(n, hop)**2).mean(1)) + 1e-9)
    sil = db < db.max() - 38
    out = []; i = 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]: j += 1
            if (j - i) * hop / SR >= min_d and i > 0 and j < n: out.append((i*hop/SR, j*hop/SR))
            i = j
        else: i += 1
    return out

def main(src, dst):
    x = leer(src)
    gaps = silencios(x)
    piezas = []; pos = 0
    for a, b in gaps:
        k = None
        for kk, (fa, fb) in enumerate(CORTES_FRASE):
            if abs(fa - a) < 0.08: k = kk
        objetivo = (PAUSA_DRAMA if k == DRAMA else PAUSA_FRASE) if k is not None else min(PAUSA_INTERNA, b - a)
        piezas.append(x[int(pos*SR):int(a*SR)])
        piezas.append(np.zeros(int(objetivo*SR), np.float32))
        pos = b
    piezas.append(x[int(pos*SR):])
    y = np.concatenate(piezas)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", f"atempo={TEMPO}", "-c:a", "libmp3lame", "-b:a", "192k", dst], input=y.tobytes(), check=True)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
