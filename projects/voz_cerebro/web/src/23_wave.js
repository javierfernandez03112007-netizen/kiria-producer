// ---------------------------------------------------------------- ONDAS DE LUZ (láminas «señales neuronales» y «una voz propia»): líneas hechas de muchos puntos que brillan.
// waveLine(n, cols): puntos con color propio; waveSet(...) los coloca a lo largo de un eje con una forma (EEG con picos, o voz)
function waveLine(n, cols, size = 0.02) { const g = new THREE.BufferGeometry(), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const u = i / (n - 1), k = u * (cols.length - 1), a = Math.floor(Math.min(k, cols.length - 1.001)); c.copy(cols[a]).lerp(cols[a + 1], k - a); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: starTex0(), toneMapped: false })); m.frustumCulled = false; return m; }
// EEG: línea horizontal (de x0 a x1) con ruido y picos; «spk» = cuántos picos; «sh» = cuánto se ha dibujado (de izquierda a derecha)
function eegAt(m, x0, x1, y, z, t, amp, spk, sh = 1, a = 1, seed = 0) { const p = m.geometry.attributes.position, n = p.count;
  for (let i = 0; i < n; i++) { const u = i / (n - 1), x = lerp(x0, x1, u), tt = u * 18 - t * 2.2 + seed; let v = Math.sin(tt * 3.1) * 0.18 + Math.sin(tt * 7.3 + 1) * 0.1 + Math.sin(tt * 23.7 + seed) * 0.045 + Math.sin(tt * 41.3 + 2 + seed) * 0.03;
    const sp = hash(Math.floor(tt * 2.5) * 1.7 + seed), ph = ((tt * 2.5) % 1 + 1) % 1;   // (% de un negativo da negativo: eso hacía las columnas de puntos) if (sp > 1 - spk) v += (ph < 0.18 ? Math.sin(ph / 0.18 * Math.PI) * 1.5 : ph < 0.32 ? -Math.sin((ph - 0.18) / 0.14 * Math.PI) * 0.75 : 0);   // picos más bajos: los altos se veían como columnas de puntos
    const env = Math.sin(Math.min(1, u * 1.0) * Math.PI); p.setXYZ(i, x, y + v * amp * (0.35 + 0.65 * env), z); }
  p.needsUpdate = true; m.geometry.setDrawRange(0, Math.floor(n * clamp(sh))); m.material.opacity = a; }
// voz: varias líneas que salen de un punto (la boca) en una dirección (dir), ondulando en «up» y en «side», con forma de onda de sonido
function voiceAt(m, o, k, t, amp, a, len = 3.0) { const p = m.geometry.attributes.position, n = p.count, f = 6 + k * 1.7, D = o.dir || _v().set(o.dx ?? 1, 0, 0), Up = o.up || _v().set(0, 1, 0), Sd = o.side || _v().set(0, 0, 1);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), env = Math.sin(Math.min(1, u * 2.6) * Math.PI / 2) * (1 - 0.5 * u) * (0.55 + 0.45 * Math.sin(u * 5 - t * 2 + k));
    const yy = Math.sin(u * f * 4 - t * 10 + k * 1.3) * (0.05 + 0.38 * amp) * env * (1 - k * 0.1), zz = Math.cos(u * f * 3 - t * 8 + k * 2) * (0.02 + 0.14 * amp) * env;
    p.setXYZ(i, o.x + D.x * u * len + Up.x * yy + Sd.x * zz, o.y + D.y * u * len + Up.y * yy + Sd.y * zz, o.z + D.z * u * len + Up.z * yy + Sd.z * zz); }
  p.needsUpdate = true; m.material.opacity = a; }
