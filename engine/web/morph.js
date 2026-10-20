// Morfos 3D: cualquier forma se transforma en otra (esfera → dónut, moneda → billete…) porque todas se
// describen sobre la MISMA rejilla (u, v): mismos vértices, solo cambia dónde está cada uno.
//   import { Morpher, SHAPES, squash } from '../../../engine/web/morph.js';
//   const m = new Morpher(['sphere', 'donut', 'coin'], material);  scene.add(m.mesh);
//   m.set('sphere', 'donut', k);        // k: 0 → 1
//   m.mesh.scale.copy(squash(t, t0));   // aplastamiento elástico al cambiar
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// cada forma: (u, v) ∈ [0,1]² → punto. u da la vuelta, v va de arriba (0) a abajo (1). Tamaño ~1 de alto.
export const SHAPES = {
  sphere: (u, v) => { const p = u * TAU, t = v * Math.PI; return [Math.sin(t) * Math.cos(p) * 0.5, Math.cos(t) * 0.5, Math.sin(t) * Math.sin(p) * 0.5]; },
  donut: (u, v) => { const p = u * TAU, t = v * TAU + Math.PI / 2, R = 0.42, r = 0.2; return [Math.cos(p) * (R + r * Math.cos(t)), r * Math.sin(t), Math.sin(p) * (R + r * Math.cos(t))]; },
  pancake: (u, v) => { const p = u * TAU, t = v * Math.PI; return [Math.sin(t) * Math.cos(p) * 0.62, Math.cos(t) * 0.07, Math.sin(t) * Math.sin(p) * 0.62]; },
  cube: (u, v) => { const [x, y, z] = SHAPES.sphere(u, v); const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1; const k = 0.42 / m; return [x * k, y * k, z * k]; },
  coin: (u, v) => { const p = u * TAU, r = 0.5, h = 0.06; let rr, y; if (v < 0.25) { rr = r * v / 0.25; y = h; } else if (v < 0.75) { rr = r; y = h - 2 * h * (v - 0.25) / 0.5; } else { rr = r * (1 - v) / 0.25; y = -h; } return [Math.cos(p) * rr, y, Math.sin(p) * rr]; },
  cylinder: (u, v) => { const p = u * TAU, r = 0.32, h = 0.5; let rr, y; if (v < 0.15) { rr = r * v / 0.15; y = h; } else if (v < 0.85) { rr = r; y = h - 2 * h * (v - 0.15) / 0.7; } else { rr = r * (1 - v) / 0.15; y = -h; } return [Math.cos(p) * rr, y, Math.sin(p) * rr]; },
  cone: (u, v) => { const p = u * TAU; let rr, y; if (v < 0.8) { rr = 0.45 * v / 0.8; y = 0.5 - v / 0.8; } else { rr = 0.45 * (1 - v) / 0.2; y = -0.5; } return [Math.cos(p) * rr, y, Math.sin(p) * rr]; },
  bill: (u, v) => { const w = 1.0, d = 0.5, x = (u < 0.5 ? u * 2 : 2 - u * 2) - 0.5, side = u < 0.5 ? 1 : -1; return [x * w, 0.004 * side + 0.02 * Math.sin(x * 6), (v - 0.5) * d]; },
  drop: (u, v) => { const p = u * TAU, t = v * Math.PI, s = Math.sin(t) * (1 - 0.55 * Math.cos(t * 0.5) ** 6); return [s * Math.cos(p) * 0.42, Math.cos(t) * 0.55 - 0.05, s * Math.sin(p) * 0.42]; },
  ring: (u, v) => { const p = u * TAU, t = v * TAU, R = 0.45, r = 0.05; return [Math.cos(p) * (R + r * Math.cos(t)), r * Math.sin(t), Math.sin(p) * (R + r * Math.cos(t))]; },
  pill: (u, v) => { const [x, y, z] = SHAPES.sphere(u, v); return [x * 0.6, y * 0.6 + Math.sign(y) * 0.2, z * 0.6]; },
  heart: (u, v) => { const p = u * TAU, t = v * Math.PI; const x = 16 * Math.sin(p) ** 3, y = 13 * Math.cos(p) - 5 * Math.cos(2 * p) - 2 * Math.cos(3 * p) - Math.cos(4 * p); const s = Math.sin(t); return [x * 0.03 * s, y * 0.03 * s + 0.05, Math.cos(t) * 0.18]; },
};

export class Morpher {
  constructor(names, material, nu = 160, nv = 96) {
    this.nu = nu; this.nv = nv; this.cache = {};
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((nu + 1) * (nv + 1) * 3), idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    this.geo = geo; this.mesh = new THREE.Mesh(geo, material);
    names.forEach(n => this.shape(n));
    this.set(names[0], names[0], 0);
  }
  shape(name) {
    if (this.cache[name]) return this.cache[name];
    const f = typeof name === 'function' ? name : SHAPES[name], a = new Float32Array((this.nu + 1) * (this.nv + 1) * 3);
    let k = 0; for (let j = 0; j <= this.nv; j++) for (let i = 0; i <= this.nu; i++) { const p = f(i / this.nu, j / this.nv); a[k++] = p[0]; a[k++] = p[1]; a[k++] = p[2]; }
    return (this.cache[name] = a);
  }
  // mezcla de A a B con k ∈ [0,1]; «wobble» añade una ondulación orgánica durante el cambio
  set(a, b, k, wobble = 0.06) {
    const A = this.shape(a), B = this.shape(b), P = this.geo.attributes.position.array, s = Math.sin(Math.PI * clamp(k));
    const e = k * k * (3 - 2 * k);
    for (let i = 0; i < P.length; i += 3) {
      const w = 1 + wobble * s * Math.sin(A[i + 1] * 4 + A[i] * 2 + k * 5);   // ondulación suave y orgánica
      P[i] = (A[i] + (B[i] - A[i]) * e) * w; P[i + 1] = (A[i + 1] + (B[i + 1] - A[i + 1]) * e) * w; P[i + 2] = (A[i + 2] + (B[i + 2] - A[i + 2]) * e) * w;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
  }
  // secuencia por palabras: [[t, 'forma'], …] → forma en el instante t (transición de dur s al oír la palabra)
  play(seq, t, dur = 0.35) {
    let i = 0; while (i < seq.length - 1 && t >= seq[i + 1][0]) i++;
    if (i === 0 && t < seq[0][0]) return this.set(seq[0][1], seq[0][1], 0);
    const prev = i ? seq[i - 1][1] : seq[0][1];
    this.set(prev, seq[i][1], clamp((t - seq[i][0]) / dur));
  }
}

// aplastamiento y rebote (squash & stretch) al recibir el golpe en t0
export function squash(t, t0, amount = 0.35) {
  const x = t - t0; if (x < 0 || x > 0.9) return new THREE.Vector3(1, 1, 1);
  const y = 1 - amount * Math.exp(-x * 6) * Math.cos(x * 22);
  return new THREE.Vector3(1 / Math.sqrt(y), y, 1 / Math.sqrt(y));
}
