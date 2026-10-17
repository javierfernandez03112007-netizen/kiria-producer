// Utilidades: tiempo, geografía (TopoJSON world-atlas), texto en sprites y modelos low-poly monocromos.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const W = 1080, H = 1920;

// ---------------------------------------------------------------- tiempo
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t, t0, d) => clamp((t - t0) / d);
export const lerp = (a, b, u) => a + (b - a) * u;
export const eo = x => 1 - Math.pow(1 - x, 3);
export const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const ss = x => x * x * (3 - 2 * x);
export const loglerp = (a, b, u) => a * Math.pow(b / a, u);

// ---------------------------------------------------------------- geografía
const D2R = Math.PI / 180;
export function ll(lon, lat, r = 1) {
  const la = lat * D2R, lo = lon * D2R;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

export async function loadTopo(url) {
  const d = await (await fetch(url)).json();
  const [sx, sy] = d.transform.scale, [tx, ty] = d.transform.translate;
  const arcs = d.arcs.map(a => {
    let x = 0, y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
  const ring = idx => {
    const pts = [];
    for (const i of idx) {
      const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
      pts.push(...(pts.length ? a.slice(1) : a));
    }
    return pts;
  };
  return d.objects.countries.geometries.map(g => {
    const polys = g.type === 'MultiPolygon' ? g.arcs : g.type === 'Polygon' ? [g.arcs] : [];
    return { name: (g.properties || {}).name || '', rings: polys.flatMap(p => p.map(ring)) };
  });
}

// segmentos (pares de puntos) de los anillos, opcionalmente filtrados por caja lon/lat
export function ringSegments(countries, r, filter = null, bbox = null) {
  const pos = [];
  for (const c of countries) {
    if (filter && !filter(c.name)) continue;
    for (const ringPts of c.rings) {
      if (bbox) {
        let inside = false;
        for (const [lo, la] of ringPts) if (lo > bbox[0] && lo < bbox[2] && la > bbox[1] && la < bbox[3]) { inside = true; break; }
        if (!inside) continue;
      }
      for (let i = 0; i + 1 < ringPts.length; i++) {
        const a = ll(ringPts[i][0], ringPts[i][1], r), b = ll(ringPts[i + 1][0], ringPts[i + 1][1], r);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  return new Float32Array(pos);
}

export function basicLines(positions, color, opacity) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.LineSegments(g, m);
}

export function fatLines(positions, color, width, opacity = 1) {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false });
  m.resolution.set(W, H);
  const l = new LineSegments2(g, m);
  l.userData.count = positions.length / 6;
  return l;
}

// polilínea → segmentos
export function polySegments(pts) {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) out.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  return new Float32Array(out);
}

// arco de círculo máximo elevado entre dos puntos lon/lat
export function arcPoints(a, b, alt, n = 120) {
  const va = ll(a[0], a[1]).normalize(), vb = ll(b[0], b[1]).normalize();
  const om = Math.acos(clamp(va.dot(vb), -1, 1)), s = Math.sin(om);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = va.clone().multiplyScalar(Math.sin((1 - u) * om) / s).add(vb.clone().multiplyScalar(Math.sin(u * om) / s));
    pts.push(v.multiplyScalar(1 + alt * Math.sin(Math.PI * u) * Math.min(1, om / 1.2)));
  }
  return pts;
}

// ruta sobre la superficie que pasa por puntos lon/lat (interpolación esférica entre cada par)
export function surfaceRoute(wps, r = 1.0015, perSeg = 30) {
  const pts = [];
  for (let k = 0; k + 1 < wps.length; k++) {
    const a = ll(wps[k][0], wps[k][1]).normalize(), b = ll(wps[k + 1][0], wps[k + 1][1]).normalize();
    for (let i = (k ? 1 : 0); i <= perSeg; i++) {
      const v = a.clone().lerp(b, i / perSeg).normalize().multiplyScalar(r);
      pts.push(v);
    }
  }
  return pts;
}

export class Path {
  constructor(pts) {
    this.pts = pts; this.len = [0];
    for (let i = 1; i < pts.length; i++) this.len.push(this.len[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.total = this.len[this.len.length - 1];
  }
  at(u) {
    const d = clamp(u) * this.total;
    let i = 1;
    while (i < this.len.length - 1 && this.len[i] < d) i++;
    const f = (d - this.len[i - 1]) / Math.max(1e-9, this.len[i] - this.len[i - 1]);
    const p = this.pts[i - 1].clone().lerp(this.pts[i], f);
    const dir = this.pts[i].clone().sub(this.pts[i - 1]).normalize();
    return { p, dir };
  }
}

// orienta un objeto sobre la esfera: arriba = normal, delante = dir
export function placeOnSphere(obj, p, dir, lift = 0) {
  const up = p.clone().normalize();
  const fwd = dir.clone().sub(up.clone().multiplyScalar(dir.dot(up))).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
  const m = new THREE.Matrix4().makeBasis(fwd, up, right.negate());
  obj.quaternion.setFromRotationMatrix(m);
  obj.position.copy(p.clone().add(up.multiplyScalar(lift)));
}

// ---------------------------------------------------------------- texto
export function textSprite(str, { size = 120, weight = 900, color = '#e2e2e2', font = 'Inter', height = 1,
  spacing = 0, align = 'center', glow = 0 } = {}) {
  const lines = str.split('\n');
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const f = `${weight} ${size}px ${font}`;
  g.font = f;
  const pad = size * 0.5;
  const widths = lines.map(l => g.measureText(l).width + spacing * size * Math.max(0, l.length - 1));
  c.width = Math.ceil(Math.max(...widths) + pad * 2);
  c.height = Math.ceil(lines.length * size * 1.15 + pad * 2);
  g.font = f; g.fillStyle = color; g.textBaseline = 'top';
  if ('letterSpacing' in g) g.letterSpacing = `${spacing * size}px`;
  if (glow) { g.shadowColor = color; g.shadowBlur = glow; }
  lines.forEach((l, i) => {
    const x = align === 'center' ? (c.width - widths[i]) / 2 : pad;
    g.fillText(l, x, pad + i * size * 1.15);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.set(height * c.width / c.height, height, 1);
  s.renderOrder = 10;
  s.userData.aspect = c.width / c.height;
  return s;
}

// ---------------------------------------------------------------- materiales y modelos
export const mat = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, emissive: e ? c : 0x000000, emissiveIntensity: e, flatShading: true });
export const glowMat = (c = 0xffffff) => new THREE.MeshBasicMaterial({ color: c });

export function withEdges(mesh, color = 0xffffff, opacity = 0.9) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(e);
  return mesh;
}

export function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

// barco portacontenedores: eje delantero = +x, arriba = +y (unidades: eslora = 1)
export function makeShip(edge = 0xffffff) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.09); s.lineTo(0.36, -0.09); s.lineTo(0.5, 0); s.lineTo(0.36, 0.09); s.lineTo(-0.5, 0.09); s.lineTo(-0.5, -0.09);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false }), mat(0x3a3a3a));
  hull.rotation.x = -Math.PI / 2; hull.position.y = -0.03;
  withEdges(hull, edge, 0.9); g.add(hull);
  const greys = [0x9a9a9a, 0x6e6e6e, 0xc4c4c4, 0x828282];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const c = box(0.1, 0.05 + (i + j) % 2 * 0.03, 0.075, mat(greys[(i + j) % 4]), -0.3 + i * 0.11, 0.065, -0.04 + j * 0.08);
    withEdges(c, edge, 0.35); g.add(c);
  }
  const bridge = box(0.08, 0.13, 0.15, glowMat(0xf6f6f6), -0.42, 0.1, 0);
  withEdges(bridge, edge, 0.8); g.add(bridge);
  return g;
}

export function makeSatellite(edge = 0xffffff) {
  const g = new THREE.Group();
  const body = box(0.5, 0.5, 0.8, mat(0x8a8a8a)); withEdges(body, edge); g.add(body);
  for (const sx of [-1, 1]) {
    const p = box(1.6, 0.02, 0.55, mat(0x1c1c1c), sx * 1.15, 0, 0);
    withEdges(p, edge, 0.9); g.add(p);
    const grid = [];
    for (let i = 1; i < 6; i++) { const x = sx * (0.35 + i * 1.6 / 6); grid.push(x, 0.012, -0.27, x, 0.012, 0.27); }
    const gl = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(grid, 3)),
      new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.6 }));
    g.add(gl);
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.15, 12, 1, true), mat(0xbbbbbb));
  dish.position.set(0, 0, 0.5); dish.rotation.x = Math.PI / 2; g.add(dish);
  return g;
}

export function makeTruck(edge = 0xffffff) {
  const g = new THREE.Group();
  const cab = box(0.25, 0.3, 0.32, mat(0xdcdcdc), 0.38, 0.17, 0); withEdges(cab, edge, 0.8); g.add(cab);
  const tr = box(0.62, 0.38, 0.34, mat(0x8c8c8c), -0.08, 0.21, 0); withEdges(tr, edge, 0.8); g.add(tr);
  return g;
}

export function makeCar(color = 0x9c9c9c) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.5, 0.95, mat(color), 0, 0.42, 0));
  g.add(box(1.0, 0.42, 0.85, mat(0x2a2a2a), -0.1, 0.86, 0));
  for (const z of [-0.33, 0.33]) {
    g.add(box(0.06, 0.12, 0.18, glowMat(0xffffff), 0.92, 0.45, z));
    g.add(box(0.06, 0.1, 0.18, glowMat(0x777777), -0.92, 0.45, z));
  }
  return g;
}

export function makeTree() {
  const g = new THREE.Group();
  g.add(box(0.18, 1.2, 0.18, mat(0x2b2b2b), 0, 0.6, 0));
  const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mat(0x3d3d3d)); c.position.y = 1.8; g.add(c);
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  g.add(box(0.1, 4, 0.1, mat(0x333333), 0, 2, 0));
  g.add(box(0.7, 0.08, 0.1, mat(0x333333), 0.3, 3.95, 0));
  g.add(box(0.35, 0.08, 0.2, glowMat(0xffffff), 0.55, 3.88, 0));
  return g;
}

// casa low-poly: frente hacia +z. Devuelve el grupo
export function makeHouse(w = 6, h = 4.5, d = 6, seed = 1) {
  const g = new THREE.Group();
  const wall = mat([0xbdbdbd, 0xa8a8a8, 0xcfcfcf][seed % 3]);
  g.add(box(w, h, d, wall, 0, h / 2, 0));
  const roofGeo = new THREE.CylinderGeometry(0.01, w * 0.78, 2.2, 4, 1);
  const roof = new THREE.Mesh(roofGeo, mat(0x262626)); roof.position.y = h + 1.1; roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, d / w); g.add(roof);
  const lit = (seed * 7) % 3;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const on = (i + j + lit) % 3 !== 0;
    g.add(box(1.1, 1.1, 0.06, on ? glowMat(0xf2f2f2) : mat(0x1a1a1a), -w / 4 + i * w / 2, 1.3 + j * 2, d / 2 + 0.02));
  }
  g.add(box(1, 1.9, 0.06, mat(0x2e2e2e), 0, 0.95, d / 2 + 0.03));
  return g;
}

// casa protagonista con la ventana doble de la foto (marco blanco, frontón, 2 hojas con cuarterones)
// y hueco real para que la cámara entre. La ventana queda centrada en (0, wy, d/2).
export function makeHeroHouse(mapTex) {
  const g = new THREE.Group();
  const w = 8, h = 6, d = 8, wy = 3.2, ww = 3.0, wh = 2.6;
  const wall = mat(0xc2c2c2);
  // fachada con hueco
  const fz = d / 2;
  g.add(box((w - ww) / 2, h, 0.3, wall, -(w + ww) / 4, h / 2, fz));
  g.add(box((w - ww) / 2, h, 0.3, wall, (w + ww) / 4, h / 2, fz));
  g.add(box(ww, wy - wh / 2, 0.3, wall, 0, (wy - wh / 2) / 2, fz));
  g.add(box(ww, h - (wy + wh / 2), 0.3, wall, 0, (h + wy + wh / 2) / 2, fz));
  // resto de la casa (paredes y tejado)
  g.add(box(w, h, 0.3, wall, 0, h / 2, -fz));
  g.add(box(0.3, h, d, wall, -w / 2, h / 2, 0));
  g.add(box(0.3, h, d, wall, w / 2, h / 2, 0));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.78, 2.6, 4, 1), mat(0x222222));
  roof.position.y = h + 1.3; roof.rotation.y = Math.PI / 4; g.add(roof);
  // lamas del revestimiento (siding)
  for (let y = 0.4; y < h; y += 0.35) g.add(box(w + 0.02, 0.03, 0.32, mat(0x9e9e9e), 0, y, fz + 0.01));
  // marco blanco, frontón y cuarterones
  const white = mat(0xf4f4f4, 0.15);
  const fw = 0.18;
  g.add(box(ww + 2 * fw, fw, 0.2, white, 0, wy + wh / 2 + fw / 2, fz + 0.12));
  g.add(box(ww + 2 * fw, fw, 0.2, white, 0, wy - wh / 2 - fw / 2, fz + 0.12));
  g.add(box(fw, wh, 0.2, white, -ww / 2 - fw / 2, wy, fz + 0.12));
  g.add(box(fw, wh, 0.2, white, ww / 2 + fw / 2, wy, fz + 0.12));
  g.add(box(ww + 0.9, 0.35, 0.35, white, 0, wy + wh / 2 + 0.45, fz + 0.18));   // frontón
  g.add(box(ww + 0.6, 0.12, 0.3, white, 0, wy + wh / 2 + 0.25, fz + 0.16));
  g.add(box(0.1, wh, 0.12, white, 0, wy, fz + 0.12));                          // parteluz central
  for (const sx of [-1, 1]) {
    const cx = sx * ww / 4;
    g.add(box(ww / 2 - 0.1, 0.07, 0.1, white, cx, wy, fz + 0.12));            // encuentro de hojas
    for (let k = 1; k < 3; k++) g.add(box(0.04, wh, 0.06, white, cx - ww / 4 + k * ww / 6 - 0.05 * sx, wy, fz + 0.12));
    for (const yy of [wy + wh / 4, wy - wh / 4]) g.add(box(ww / 2 - 0.1, 0.04, 0.06, white, cx, yy, fz + 0.12));
    // persiana medio bajada en la parte alta
    for (let k = 0; k < 8; k++) g.add(box(ww / 2 - 0.15, 0.05, 0.02, mat(0xe8e8e8, 0.4), cx, wy + wh / 2 - 0.1 - k * 0.09, fz - 0.05));
  }
  // habitación interior iluminada y resplandor
  const room = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, h - 0.4, d - 0.6), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, side: THREE.BackSide, roughness: 1 }));
  room.position.y = h / 2; g.add(room);
  const light = new THREE.PointLight(0xffffff, 10, 10, 1.5); light.position.set(0, 4.2, -1.2); g.add(light);
  // mesa con un mapa del mundo encima (la cámara se mete en él)
  const ty = 1.0, mz = -1.4, mw = 2.8, mh = 1.4;
  g.add(box(3.4, 0.08, 2.0, mat(0x6a6a6a), 0, ty, mz));
  for (const [x, z] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.8], [1.5, 0.8]]) g.add(box(0.08, ty, 0.08, mat(0x4a4a4a), x, ty / 2, mz + z));
  const map = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshBasicMaterial({ map: mapTex }));
  map.rotation.x = -Math.PI / 2; map.position.set(0, ty + 0.045, mz); g.add(map);
  g.add(box(0.5, 0.06, 0.5, glowMat(0xd8d8d8), 0, 4.5, mz));          // lámpara de techo
  g.userData = { window: new THREE.Vector3(0, wy, fz), map: { c: new THREE.Vector3(0, ty + 0.045, mz), w: mw, h: mh } };
  return g;
}
