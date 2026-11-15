// Dibujo plano de la cabeza (campo de distancias de hero_v2.js) con la misma escala y encuadre que una vista de la hoja de modelo,
// para comparar formas sin pasar por el navegador:  node toon.mjs <vista> <salida.ppm> [escala] [archivo del personaje]
// vistas: perfil (cámara en −x: la cara mira a la derecha), frente (cabeza grande de frente), nuca (de espaldas).
import * as THREE from '../../node_modules/three/build/three.module.js';
import { triTable } from '../../node_modules/three/examples/jsm/objects/MarchingCubes.js';
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const [view, out, sArg, heroArg] = process.argv.slice(2);
const S = Number(sArg || 3), heroFile = heroArg || path.join(here, '..', 'hero_v2.js');
// lo mínimo del motor que usa el archivo del personaje
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u, hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z), smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function capP(a, b, ra, rb, zs) { const izs = 1 / zs, dx = b[0] - a[0], dy = b[1] - a[1], dz = ((b[2] || 0) - (a[2] || 0)) * izs; return { ax: a[0], ay: a[1], az: a[2] || 0, dx, dy, dz, ra, rb, izs, il2: 1 / (dx * dx + dy * dy + dz * dz) }; }
function capD(x, y, z, P) { const px = x - P.ax, py = y - P.ay, pz = (z - P.az) * P.izs; let h = (px * P.dx + py * P.dy + pz * P.dz) * P.il2; h = h < 0 ? 0 : h > 1 ? 1 : h; const qx = px - P.dx * h, qy = py - P.dy * h, qz = pz - P.dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - (P.ra + (P.rb - P.ra) * h); }
function ellD(x, y, z, E) { const a = (x - E[0]) / E[3], b = (y - E[1]) / E[4], c = (z - E[2]) / E[5]; return (Math.sqrt(a * a + b * b + c * c) - 1) * E[6]; }
const MC_E = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 2], [1, 0, 0, 2], [1, 1, 0, 2], [0, 1, 0, 2]];
const HAND_Y0 = -0.75, D2 = Math.PI / 180;
const src = fs.readFileSync(heroFile, 'utf8');
const names = ['sdHead', 'hrHeadClosed', 'hrPaint', 'hrEyeD', 'HM', 'HR_ZZ', 'HR_SQ', 'headGeo', 'hrHairPts'];
const mod = new Function('THREE', 'triTable', 'clamp', 'lerp', 'hash', 'v3', 'smin', 'capP', 'capD', 'ellD', 'MC_E', 'HAND_Y0', 'D2',
  src + '\n;return {' + names.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : null`).join(',') + '};')(THREE, triTable, clamp, lerp, hash, v3, smin, capP, capD, ellD, MC_E, HAND_Y0, D2);
// encuadre de cada vista: recorte de la hoja (en píxeles de la hoja) → mundo
const V = {
  perfil: { w: 118, h: 172, map: (px, py) => [0, 3.65 - (py - 19) * 5.1 / 132, (px - 46.3) * 5.1 / 132], dir: [1, 0, 0] },
  frente: { w: 157, h: 160, map: (px, py) => [(px - 73) * 5.1 / 107, 3.65 - (py - 18) * 5.1 / 107, 0], dir: [0, 0, -1] },
  nuca: { w: 122, h: 258, map: (px, py) => [-(px - 60) * 5.1 / 187, 3.65 - (py - 26) * 5.1 / 187, 0], dir: [0, 0, 1] },
}[view];
const W = Math.round(V.w * S), H = Math.round(V.h * S), img = Buffer.alloc(W * H * 3, 255), cls = new Int8Array(W * H).fill(-1), dep = new Float32Array(W * H);
const eyes = (x, y, z) => mod.hrEyeD(Math.abs(x), y, z);
const hairs = mod.hrHairPts ? mod.hrHairPts() : [];
const hairD = (x, y, z) => { let d = 9; for (const L of hairs) for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1]; const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2], t = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)); d = Math.min(d, Math.hypot(px - dx * t, py - dy * t, pz - dz * t) - 0.03); } return d; };
const all = (x, y, z) => Math.min(mod.hrHeadClosed(x, y, z), eyes(x, y, z), hairs.length ? hairD(x, y, z) : 9);
const t0 = Date.now();
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const [mx, my, mz] = V.map(i / S, j / S), d = V.dir; let x = mx - d[0] * 4, y = my - d[1] * 4, z = mz - d[2] * 4, t = 0, hit = false;
  for (let k = 0; k < 160 && t < 8; k++) { const s = all(x, y, z); if (s < 0.002) { hit = true; break; } const st = Math.max(s * 0.9, 0.004); x += d[0] * st; y += d[1] * st; z += d[2] * st; t += st; }
  if (!hit) continue; const q = j * W + i; dep[q] = t;
  let c = 0; const de = eyes(x, y, z), dh = mod.hrHeadClosed(x, y, z);
  if (hairs.length && hairD(x, y, z) < Math.min(de, dh)) c = 5;
  else if (de < dh) { const E = mod.HM.ey, u = (Math.abs(x) - E.cx) / E.rx, v = (y - E.cy) / E.ry, w = (z - E.cz) / E.rz; c = (w > 0.975 && Math.hypot(u, v) < 0.16) ? 4 : 2; }
  else if (mod.hrPaint(x, y, z) > 0) c = 1;
  // la línea del pelo (zigzag) y el garabato de la boca
  if (c <= 1) { const ph = Math.atan2(x, -(z + 0.2)) * 1.25; let dz = 9; const Z = mod.HR_ZZ; for (let k = 0; k < Z.length - 1; k++) { const a = Z[k], b = Z[k + 1], bx = b[0] - a[0], by = b[1] - a[1], px = ph - a[0], py = y - a[1], h2 = clamp((px * bx + py * by) / (bx * bx + by * by)); dz = Math.min(dz, Math.hypot(px - bx * h2, py - by * h2)); }
    if (dz < 0.035 && Math.abs(ph) < 2.6) c = 3;
    if (z > 1.5) { let ds = 9; const Q = mod.HR_SQ; for (let k = 0; k < Q.length - 1; k++) { const a = Q[k], b = Q[k + 1], bx = b[0] - a[0], by = b[1] - a[1], px = x - a[0], py = y - a[1], h2 = clamp((px * bx + py * by) / (bx * bx + by * by)); ds = Math.min(ds, Math.hypot(px - bx * h2, py - by * h2)); } if (ds < 0.035) c = 3; } }
  cls[q] = c;
}
const COL = { 0: [246, 197, 69], 1: [206, 144, 90], 2: [255, 255, 255], 3: [30, 30, 30], 4: [10, 10, 10], 5: [90, 90, 90] };
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const q = j * W + i, c = cls[q]; if (c < 0) continue; const col = COL[c]; img[q * 3] = col[0]; img[q * 3 + 1] = col[1]; img[q * 3 + 2] = col[2]; }
// tinta: bordes de la silueta, cambios de zona y saltos de profundidad
const ink = Math.max(1, Math.round(S * 0.55));
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const q = j * W + i, c = cls[q]; if (c < 0) continue; let edge = false;
  for (let dj = -ink; dj <= ink && !edge; dj++) for (let di = -ink; di <= ink; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const r = jj * W + ii, c2 = cls[r];
    if (c2 < 0 || (c2 !== c && !((c2 === 3 || c === 3) || (c2 === 4 || c === 4))) || Math.abs(dep[r] - dep[q]) > 0.3) { edge = true; break; } }
  if (edge) { img[q * 3] = 25; img[q * 3 + 1] = 25; img[q * 3 + 2] = 25; } }
fs.writeFileSync(out, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), img]));
console.log(`${view}: ${W}x${H} en ${Date.now() - t0} ms`);
