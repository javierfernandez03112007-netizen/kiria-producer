# recorte ampliado de una vista de la hoja con una cuadrícula cada 10 px (coordenadas del recorte) para medir a ojo
import ref, cv2, sys, numpy as np
name = sys.argv[1]; s = int(sys.argv[2]) if len(sys.argv) > 2 else 4; out = sys.argv[3]
c = ref.crop(name); h, w = c.shape[:2]; big = cv2.resize(c, (w * s, h * s), interpolation=cv2.INTER_CUBIC)
for x in range(0, w, 10):
  cv2.line(big, (x * s, 0), (x * s, h * s), (255, 0, 255) if x % 50 == 0 else (230, 180, 230), 1)
  if x % 20 == 0: cv2.putText(big, str(x), (x * s + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 0, 200), 1)
for y in range(0, h, 10):
  cv2.line(big, (0, y * s), (w * s, y * s), (255, 0, 255) if y % 50 == 0 else (230, 180, 230), 1)
  if y % 20 == 0: cv2.putText(big, str(y), (2, y * s - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 0, 200), 1)
cv2.imwrite(out, big)
