// ---------------------------------------------------------------- el mapa de España flotando sobre la manifestación como un globo gigante (Natural Earth 1:10m), en corte:
// arriba el campo (verdes y ocres), a los lados las capas de tierra (como la maqueta de la referencia). La huelga sale de Madrid en una onda roja y en cada
// ciudad se clava una chincheta roja; la pila de monedas y la casa («no es solo por los sueldos»); a la frase 8, gente en las calles de muchas ciudades.
let SPAIN = null;
const MAP_K = 0.01, MAP_H = 0.55, CAN_SHIFT = [3.6, -6.9], MAP_S = 0.24;        // unidades del mapa: 1 = 100 km; grosor; Canarias más cerca; escala en la ciudad
const T_WAVE = -0.2, WAVE_V = 5.5;
const MAP_P = [v3(0, 2.75, -6.4), v3(0, 3.5, -33.0)];                             // dónde flota: sobre la avenida (frase 1) y sobre la plaza (frase 8)
const mapXZ = (p, can = false) => [p[0] * MAP_K + (can ? CAN_SHIFT[0] : 0), -p[1] * MAP_K + (can ? CAN_SHIFT[1] : 0)];
const isCan = r => r.every(p => p[1] < -900);
function splitSlab(rings, h) {      // losa extruida → [tapas, lados] (para dar a cada parte su material)
  const caps = { p: [], n: [], u: [] }, sides = { p: [], n: [], u: [] };
  for (const r of rings) { const s = new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
    const q = g.toNonIndexed(), P = q.attributes.position, N = q.attributes.normal, U = q.attributes.uv;
    for (const gr of q.groups) { const T = gr.materialIndex === 0 ? caps : sides; for (let i = gr.start; i < gr.start + gr.count; i++) { T.p.push(P.getX(i), P.getY(i), P.getZ(i)); T.n.push(N.getX(i), N.getY(i), N.getZ(i)); T.u.push(U.getX(i), U.getY(i)); } } }
  return [caps, sides].map(T => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(T.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2)); return g; });
}
function outline(rings, y, color, width, op = 1) { const pos = []; for (const r of rings) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; pos.push(a[0], y, a[1], b[0], y, b[1]); }
  const g = new LineSegmentsGeometry(); g.setPositions(pos); const l = new LineSegments2(g, lineMat(color, width, op)); l.renderOrder = 4; return l; }
function buildMap() {
  const Z = new THREE.Group(); scene.add(Z); S.map = Z; Z.scale.setScalar(MAP_S);
  const esp = []; for (const r of SPAIN.Spain) { const can = isCan(r); esp.push(r.map(p => mapXZ(p, can))); } S.espRings = esp;
  // arriba: campo low-poly (verdes al norte, ocres en el centro y el sur); a los lados: capas de tierra
  const land = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#86c45a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = hash(i * 1.3) * w, y = hash(i * 2.7) * h, r = 10 + hash(i * 5.1) * 38, south = y / h; const c = hash(i * 9.1) < 0.35 + south * 0.5 ? ['#d9b26a', '#c99a55', '#e2c27e'][i % 3] : ['#6fb24c', '#5fa043', '#9bd067', '#4f8f3a'][i % 4];
      g.fillStyle = c; g.globalAlpha = 0.55; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, rr2 = r * (0.7 + hash(i * 13 + k) * 0.5); g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.fill(); } g.globalAlpha = 1; });
  land.wrapS = land.wrapT = THREE.RepeatWrapping; land.repeat.set(1 / 13, 1 / 11); land.offset.set(0.5, 0.45);
  const strata = canvasTex(64, 256, (g, w, h) => { const bands = [['#3b2a1e', 0.0], ['#4d3626', 0.22], ['#6a4a31', 0.42], ['#7d5a3a', 0.6], ['#946b45', 0.76], ['#a97d50', 0.88], ['#5e9e3e', 0.94], ['#7cc153', 0.97]];
    bands.forEach(([c, y0], i) => { const y1 = i + 1 < bands.length ? bands[i + 1][1] : 1; g.fillStyle = c; g.fillRect(0, y0 * h, w, (y1 - y0) * h + 1); });
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(30,22,16,${0.25 + hash(i) * 0.3})`; const y = hash(i * 3.3) * h * 0.86; g.fillRect(hash(i * 7.1) * w, y, 2 + hash(i * 2.2) * 5, 2 + hash(i * 4.4) * 4); } });
  strata.wrapS = strata.wrapT = THREE.RepeatWrapping; const D = MAP_H + 0.06; strata.repeat.set(1, 1 / D); strata.offset.set(0, -(1 - D) / D - 0.03 / D);
  M.mapTop = new THREE.MeshStandardMaterial({ map: land, roughness: 0.9, flatShading: true }); M.mapSide = new THREE.MeshStandardMaterial({ map: strata, roughness: 0.95 });
  const [caps, sides] = splitSlab(esp, MAP_H);
  S.mapTopM = new THREE.Mesh(caps, M.mapTop); S.mapSideM = new THREE.Mesh(sides, M.mapSide); for (const m of [S.mapTopM, S.mapSideM]) { m.castShadow = true; m.receiveShadow = true; Z.add(m); }
  S.coast = outline(esp, MAP_H + 0.04, 0xffffff, 2.2, 0.95); Z.add(S.coast);
  S.coastRed = outline(esp, MAP_H + 0.045, 0xff3b2f, 3.4, 0.0); Z.add(S.coastRed);
  // ciudades: chinchetas rojas que se clavan cuando pasa la onda, y pulsos
  const C = Object.entries(SPAIN.cities).map(([n, p]) => { const can = p[1] < -900; const [x, z] = mapXZ(p, can); return { n, x, z, w: p[2] }; });
  S.cities = C; const madrid = C.find(c => c.n === 'Madrid'); S.madrid = madrid; const city = n => C.find(c => c.n === n);
  C.forEach(c => { c.d = Math.hypot(c.x - madrid.x, c.z - madrid.z); });
  const pinG = mergeGeometries([new THREE.ConeGeometry(0.07, 0.42, 10).translate(0, 0.21, 0).rotateX(Math.PI).translate(0, 0.42, 0), new THREE.SphereGeometry(0.12, 14, 10).translate(0, 0.5, 0)].map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; }));
  S.pins = new THREE.InstancedMesh(pinG, new THREE.MeshStandardMaterial({ color: 0xff2d2d, roughness: 0.35, metalness: 0.1, emissive: 0x550000 }), C.length); S.pins.castShadow = true; S.pins.frustumCulled = false; Z.add(S.pins);
  S.wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.16, 0.12).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  S.wave.rotation.x = -Math.PI / 2; S.wave.position.set(madrid.x, MAP_H + 0.05, madrid.z); Z.add(S.wave);
  S.reds = C.filter(c => c.w >= 0.14).map(c => { const m = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.15, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.2, 0.15).multiplyScalar(1.5), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(c.x, MAP_H + 0.05, c.z); m.userData.c = c; Z.add(m); return m; });
  // «no es solo por los sueldos»: la pila de monedas y, detrás, una casa más grande (en Madrid)
  S.coins = new THREE.Group(); for (let i = 0; i < 16; i++) { const c2 = coin(0.26); c2.position.set((hash(i) - 0.5) * 0.03, 0.03 + i * 0.058, (hash(i * 3) - 0.5) * 0.03); c2.rotation.y = i; S.coins.add(c2); }
  S.coins.position.set(madrid.x - 0.55, MAP_H + 0.02, madrid.z + 0.25); Z.add(S.coins);
  S.house = house(4.4); S.house.userData.s0 = 4.4; S.house.position.set(madrid.x + 0.45, MAP_H + 0.02, madrid.z - 0.35); S.house.rotation.y = -0.35; Z.add(S.house);
  // gente en las calles de muchas ciudades (frase 8)
  const marchC = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza', 'Málaga', 'Vigo', 'Palma', 'Murcia', 'Valladolid', 'Las Palmas', 'Granada', 'A Coruña', 'Oviedo', 'Alicante', 'Córdoba', 'Pamplona', 'Santander', 'Badajoz'].map(city);
  const NP = 26; S.mcrowd = new THREE.InstancedMesh(coatGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), marchC.length * NP); S.mcrowd.frustumCulled = false;
  S.mcrowdH = new THREE.InstancedMesh(headGeo(true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), marchC.length * NP); S.mcrowdH.frustumCulled = false;
  S.mcrowdP = []; marchC.forEach((c, k) => { for (let i = 0; i < NP; i++) { const a = hash(i * 3.1 + k) * 6.283, r = Math.sqrt(hash(i * 7.7 + k * 2)) * (0.16 + 0.1 * Math.sqrt(c.w)); S.mcrowdP.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, k });
    S.mcrowd.setColorAt(k * NP + i, new THREE.Color([0xff3b30, 0xf4f1ea, 0xffc24a, 0x3a7bd5, 0xff3b30][i % 5])); S.mcrowdH.setColorAt(k * NP + i, new THREE.Color(0xe0c0a0)); } }); Z.add(S.mcrowd, S.mcrowdH);
}
const _m4b = new THREE.Object3D();
const mapWave = t => { const tl = t > END - 0.7 ? t - END : t; return tl; };
function mapAt(t) {
  const Z = S.map, side = t > K.hoy8 - 1.0 && t < END - 0.7 ? 1 : 0, P = MAP_P[side];
  const vis = t < K.si2 + 0.9 || (t > K.hoy8 - 1.0 && t < K.y9 + 0.3) || t > END - 1.1; Z.visible = vis; if (!vis) return;
  Z.position.set(P.x, P.y + 0.04 * Math.sin(t * 1.1), P.z); Z.rotation.set((side ? 0.22 : 0.34) + 0.03 * Math.sin(t * 0.7), 0.06 * Math.sin(t * 0.5), 0.02 * Math.sin(t * 0.9));
  const tl = mapWave(t), r = Math.max(0.001, (tl - T_WAVE) * WAVE_V), a = tl > T_WAVE && r < 9 ? 0.95 * (1 - r / 9) : 0; S.wave.visible = a > 0.01; S.wave.scale.setScalar(r); S.wave.material.opacity = a;
  const red = clamp((tl - T_WAVE) * 1.2) * (t > END - 0.7 ? 1 : 1); S.coastRed.material.opacity = 0.85 * red; S.coast.material.opacity = 0.95 * (1 - 0.7 * red);
  S.cities.forEach((c, i) => { const k = pop(tl, T_WAVE + c.d / WAVE_V - 0.05, 0.35); _m4b.position.set(c.x, MAP_H + 0.02, c.z); _m4b.rotation.set(0, 0, 0); _m4b.scale.setScalar(Math.max(0.0001, k * (c.w >= 0.1 ? 0.42 + 0.32 * Math.sqrt(c.w) : 0))); _m4b.updateMatrix(); S.pins.setMatrixAt(i, _m4b.matrix); });
  S.pins.instanceMatrix.needsUpdate = true;
  S.reds.forEach((m, i) => { const k = clamp((tl - T_WAVE - m.userData.c.d / WAVE_V) / 0.3); m.visible = k > 0.01; const ph = (t * 1.2 + i * 0.37) % 1; m.scale.setScalar(1 + ph * 2.2); m.material.opacity = k * (1 - ph); });
  { const out = 1 - win(t, K.si2 + 0.2, 0.3), ck = clamp((t - K.solo1 + 0.2) / 0.5); S.coins.visible = ck > 0 && out > 0.01 && t < K.hoy8; S.coins.children.forEach((c2, i) => { c2.visible = i < Math.round(16 * eo(ck)); }); S.coins.scale.setScalar(Math.max(0.0001, out));
    show(S.house, t < K.hoy8 ? pop(t, K.sueldos1 - 0.05, 0.45) * out : 0); }
  { const on = t > K.manifestaciones8 - 0.3 && t < K.y9 + 0.3; S.mcrowd.visible = S.mcrowdH.visible = on;
    if (on) { S.mcrowdP.forEach((p, j) => { const k = clamp((t - K.manifestaciones8 + 0.2 - p.k * 0.04 - hash(j) * 0.25) / 0.3); _m4b.position.set(p.x + Math.sin(t * 2 + j) * 0.01, MAP_H + 0.02, p.z); _m4b.rotation.set(0, j, 0); _m4b.scale.setScalar(Math.max(0.0001, 5.5 * eo(k))); _m4b.updateMatrix(); S.mcrowd.setMatrixAt(j, _m4b.matrix); S.mcrowdH.setMatrixAt(j, _m4b.matrix); });
      S.mcrowd.instanceMatrix.needsUpdate = S.mcrowdH.instanceMatrix.needsUpdate = true; } }
}
