# Utilidades para comparar los renders con la hoja de modelo de Javi (web/lab/ref/homer_modelo.jpg).
# Segmenta por color (piel amarilla, morro tostado, blanco, azul del pantalón, línea negra) y recorta cada vista de la hoja.
import cv2, numpy as np, os
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', 'ref', 'homer_modelo.jpg')
# cajas (x0, y0, x1, y1) de cada vista en la hoja (coordenadas de la imagen original 872×641)
BOX = {
  'frente': (26, 52, 136, 296),        # cuerpo entero de frente (camiseta de tirantes)
  'espalda': (19, 368, 128, 608),      # cuerpo entero de espaldas
  'vestido': (127, 366, 214, 614),     # la figura vestida (tres cuartos / perfil, mira a la izquierda)
  'nuca': (212, 352, 334, 610),        # la nuca grande
  'perfil': (512, 208, 630, 380),      # la cabeza grande de perfil (mira a la derecha)
  'cab_O': (394, 30, 482, 216),        # cabeza de frente con la boca en O
  'cab_sonrisa': (493, 26, 581, 213),  # sonrisa enorme con dientes
  'cab_dientes': (658, 33, 733, 190),  # sonrisa con dientes apretados
  'cab_grito': (765, 32, 839, 190),    # boca abierta gritando
  'cab_risa': (402, 207, 475, 358),    # boca abierta riendo
  'cab_neutra1': (659, 205, 729, 356), # neutras con el «~»
  'cab_neutra2': (727, 205, 803, 356),
  'cab_neutra3': (803, 205, 872, 356),
  'grande': (368, 349, 525, 641),      # cabeza grande de frente y cuerpo con camiseta
  'brazos': (541, 366, 872, 641),      # brazos en alto
}
def sheet():
  return cv2.imread(REF)
def crop(name, im=None):
  im = sheet() if im is None else im; x0, y0, x1, y1 = BOX[name]; return im[y0:y1, x0:x1].copy()
def masks(im):
  """máscaras booleanas: piel, morro, blanco, azul, oscuro (línea / zapatos), gris (pelos)"""
  hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(int); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
  skin = (H >= 17) & (H <= 32) & (S > 110) & (V > 150)
  muz = (H >= 7) & (H < 17) & (S > 70) & (V > 120)
  blue = (H >= 100) & (H <= 130) & (S > 50) & (V > 110)
  dark = V < 110
  white = (S < 40) & (V > 200)
  gray = (S < 50) & (V >= 110) & (V <= 200)
  return dict(skin=skin, muz=muz, blue=blue, dark=dark, white=white, gray=gray)
def figure(im, bg_white=True):
  """silueta de la figura: todo lo que no es fondo (relleno de agujeros)"""
  m = masks(im); fg = m['skin'] | m['muz'] | m['blue'] | m['dark'] | m['gray']
  if bg_white:
    fg = fg | (m['white'] & False)
  fg = fg.astype(np.uint8) * 255
  fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
  # rellena: todo lo que no está conectado con el borde (el blanco de dentro: ojos, camisa)
  h, w = fg.shape; ff = fg.copy(); msk = np.zeros((h + 2, w + 2), np.uint8)
  for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    if ff[y, x] == 0: cv2.floodFill(ff, msk, (x, y), 128)
  return ff != 128
def bbox(m):
  ys, xs = np.nonzero(m); return xs.min(), ys.min(), xs.max(), ys.max()
