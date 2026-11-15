# Compara el dibujo plano de la cabeza (toon.mjs) con la vista de la hoja: [hoja | dibujo | dibujo con la tinta de la hoja encima en rojo]
# y da el parecido (IoU) de la silueta, del morro y de los ojos.  python3 cmp_toon.py <vista> <toon.ppm> <salida.png> [escala]
import sys, cv2, numpy as np, ref
view, toonf, out = sys.argv[1:4]; S = float(sys.argv[4]) if len(sys.argv) > 4 else 3
box = {'perfil': ('perfil', 0, 0), 'frente': ('grande', 0, 0), 'nuca': ('nuca', 0, 0)}[view]
c = ref.crop(box[0]); toon = cv2.imread(toonf)
H, W = toon.shape[:2]
c = c[:int(H / S), :int(W / S)]
big = cv2.resize(c, (W, H), interpolation=cv2.INTER_CUBIC)
mt, mb = ref.masks(toon), ref.masks(big)
ft, fb = ref.figure(toon), ref.figure(big)
if view == 'perfil': fb[int(150 * S):, int(60 * S):] = False; ft[int(150 * S):, int(60 * S):] = False     # el cursor de la hoja
if view == 'frente': fb[int(128 * S):] = False; ft[int(128 * S):] = False                                # solo la cabeza
iou = lambda a, b: (a & b).sum() / max(1, (a | b).sum())
wt = mt['white'] & ft; wb = mb['white'] & fb
print('%s  silueta %.3f  morro %.3f  ojos %.3f' % (view, iou(ft, fb), iou(mt['muz'], mb['muz']), iou(wt, wb)))
ov = toon.copy(); ink = mb['dark']
ov[ink] = (0.35 * ov[ink] + 0.65 * np.array([0, 0, 255])).astype(np.uint8)
# contornos de diferencia de silueta
d = (ft ^ fb); ov[d & ~ink] = (0.6 * ov[d & ~ink] + 0.4 * np.array([255, 0, 255])).astype(np.uint8)
sheet = np.hstack([big, np.full((H, 6, 3), 255, np.uint8), toon, np.full((H, 6, 3), 255, np.uint8), ov])
cv2.imwrite(out, sheet)
