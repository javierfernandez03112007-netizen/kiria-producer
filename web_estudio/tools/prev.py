import numpy as np, cv2
d = np.load('preview.npz')
def splat(layers, W=900, H=900, scale=640, yaw=90, cy=-0.08):
    a = np.radians(yaw); Ry = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
    img = np.ones((H, W, 3))
    for pts, col, ink, rad in layers:
        q = pts @ Ry.T; x = (W / 2 + q[:, 0] * scale).astype(int); y = (H / 2 - (q[:, 1] - cy) * scale).astype(int)
        acc = np.zeros((H, W))
        for dx in range(-rad, rad + 1):
            for dy in range(-rad, rad + 1):
                m = (x + dx >= 0) & (x + dx < W) & (y + dy >= 0) & (y + dy < H); np.add.at(acc, (y[m] + dy, x[m] + dx), ink)
        a = 1 - np.exp(-acc); img = img * (1 - a[..., None]) + np.array(col)[None, None] * a[..., None]
    return (img[..., ::-1] * 255).astype(np.uint8)
gray = (0.13, 0.14, 0.17); red = (0.86, 0.12, 0.25); blue = (0.14, 0.34, 1.0)
B, Bf = d['B'], d['Bf']
h = splat([(d['H'], gray, 0.10, 1), (B[Bf < 0.05], (1.0, 0.45, 0.52), 0.25, 1), (B[Bf >= 0.05], red, 0.55, 1)])
a = splat([(d['R'], blue, 0.30, 1), (d['V'], (0.0, 0.62, 0.85), 0.5, 1), (d['N'], blue, 0.9, 2)], yaw=-90)
b2 = splat([(B[Bf < 0.05], (1.0, 0.45, 0.52), 0.25, 1), (B[Bf >= 0.05], red, 0.55, 1)], yaw=90, scale=1100, cy=0.18)
cv2.imwrite('prev_heads.png', np.hstack([h, a])); cv2.imwrite('prev_brain.png', b2)
