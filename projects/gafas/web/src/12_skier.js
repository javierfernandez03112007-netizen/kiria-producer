// ---------------------------------------------------------------- el esquiador, congelado en plena curva, con la nieve suspendida en el aire
const SK = {};
function skiGeo() {          // perfil de un esquí (largo en z, espátula levantada delante), extruido a lo ancho
  const s = new THREE.Shape(); s.moveTo(-0.8, 0.012); s.lineTo(0.62, 0.012); s.quadraticCurveTo(0.8, 0.014, 0.86, 0.075); s.lineTo(0.855, 0.087); s.quadraticCurveTo(0.78, 0.03, 0.62, 0.0); s.lineTo(-0.8, 0.0); s.quadraticCurveTo(-0.86, 0.004, -0.84, 0.03); s.lineTo(-0.82, 0.03); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.082, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -0.041); g.rotateY(-Math.PI / 2); return g;
}
function buildSkier() {
  const outer = new THREE.Group(), g = new THREE.Group(); outer.add(g); scene.add(outer); SK.outer = outer; SK.g = g;
  const jacket = paint(0xe9ecf0, 0.55, 0.3), pants = paint(0x2a2e36, 0.62, 0.15), white = paint(0xf3f5f8, 0.22, 1), glove = paint(0x15171c, 0.6, 0.1), skiM = paint(0x111318, 0.25, 1), skiTop = paint(0x9aa1ab, 0.3, 1);
  const d = makeDoll(jacket), J = d.userData.J; SK.J = J; g.add(d); d.scale.setScalar(1.66);
  for (const k of ['hpL', 'hpR', 'knL', 'knR']) J[k].traverse(o => { if (o.isMesh) o.material = pants; });
  J.hip.children.forEach(o => { if (o.isMesh) o.material = pants; });
  for (const k of ['hL', 'hR']) J[k].traverse(o => { if (o.isMesh) o.material = glove; });
  J.head.material = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.8 });        // braga y cara tapada
  // casco y gafas
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.086, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.46), white); helmet.position.set(0, 0.1, -0.008); helmet.scale.set(1.0, 1.05, 1.08); helmet.castShadow = true; J.neck.add(helmet);
  const gog = buildGoggles(0.6, 'mini'); gog.position.set(0, 0.086, 0.084); J.neck.add(gog); SK.gog = gog;
  // pose: rodillas flexionadas, cadera atrás, tronco adelantado, brazos delante con los bastones
  const PO = Object.assign({ hy: 0.36, hx: -0.2, hz: 0.12, cx: 0.62, cz: -0.38, cy: -0.25, nx: -0.5, nz: 0.22, hpL: -1.18, knL: 1.5, hpR: -0.9, knR: 1.22, hpLz: 0.26, hpRz: 0.2, lean: -0.5, yaw: 0.2 }, window.POSE || {});
  SK.PO = PO;
  J.hip.position.y = PO.hy; J.hip.rotation.x = PO.hx; J.hip.rotation.z = PO.hz;
  J.chest.rotation.x = PO.cx; J.chest.rotation.z = PO.cz; J.chest.rotation.y = PO.cy; J.neck.rotation.x = PO.nx; J.neck.rotation.z = PO.nz;
  J.hpL.rotation.x = PO.hpL; J.knL.rotation.x = PO.knL; J.hpR.rotation.x = PO.hpR; J.knR.rotation.x = PO.knR;
  J.hpL.rotation.z = PO.hpLz; J.hpR.rotation.z = PO.hpRz;
  J.shL.rotation.x = -0.9; J.shL.rotation.z = -0.62; J.elL.rotation.x = -0.6; J.shR.rotation.x = -1.05; J.shR.rotation.z = 0.35; J.elR.rotation.x = -0.75;
  g.updateMatrixWorld(true);
  // con la inclinación (giro en z) la pierna de dentro de la curva se flexiona lo justo para que los dos esquís pisen la nieve
  const sl = Math.sin(PO.lean), cl = Math.cos(PO.lean), tilt = p => p.x * sl + p.y * cl;
  const feet = () => { g.updateMatrixWorld(true); return ['knL', 'knR'].map(k => { const f = J[k].localToWorld(v3(0, -0.24, 0)); g.worldToLocal(f); return f; }); };
  { const inn = PO.lean >= 0 ? 'L' : 'R', hp0 = J['hp' + inn].rotation.x, kn0 = J['kn' + inn].rotation.x; let a = 0.2, b = 2.6;
    for (let it = 0; it < 40; it++) { const m = (a + b) / 2; J['hp' + inn].rotation.x = hp0 * m; J['kn' + inn].rotation.x = Math.min(2.4, kn0 * m); const [fL, fR] = feet(); const dIn = inn === 'L' ? tilt(fL) - tilt(fR) : tilt(fR) - tilt(fL); if (dIn < 0) a = m; else b = m; } }
  // esquís bajo los pies, de canto
  const sg = skiGeo(); SK.skis = []; const FT = feet(); let hS = 0;
  for (const [i, k] of ['knL', 'knR'].entries()) {
    const foot = FT[i];
    const ski = new THREE.Mesh(sg, skiM); ski.position.set(foot.x, foot.y - 0.13, foot.z + 0.08); ski.castShadow = true; g.add(ski); hS += tilt(ski.position) / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 1.2), skiTop); top.position.set(0, 0.014, -0.02); ski.add(top);
    const boot = rbox(0.1, 0.14, 0.24, paint(0x2a2e36, 0.3, 1), 0.03); boot.position.set(0, 0.075, 0); ski.add(boot);
    SK.skis.push(ski);
  }
  // bastones
  for (const [k, sd] of [['hL', -1], ['hR', 1]]) {
    const hand = J[k].localToWorld(v3(0, 0, 0)); g.worldToLocal(hand);
    const tip = v3(hand.x + sd * 0.28, 0.0, hand.z - 0.55); tip.y = (hS - tip.x * sl) / cl;     // la punta del bastón en la nieve
    g.add(bar(hand, tip, 0.008, metal(0xc9ced6, 0.25), 8));
    const bk = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), paint(0x111318, 0.4, 0.5)); bk.position.copy(tip).lerp(hand, 0.08); bk.rotation.x = Math.PI / 2; g.add(bk);
  }
  // inclinación hacia dentro de la curva y dirección de la bajada (+x)
  g.rotation.z = PO.lean; g.rotation.y = PO.yaw; outer.rotation.y = Math.PI / 2;
  outer.position.set(0, groundH(0, 0) - 0.02 - hS, 0); SK.hS = hS; SK.tilt = tilt;
  // la nieve que levantan los cantos: congelada en el aire (tiempo detenido)
  // sale del canto del esquí de fuera, hacia atrás y hacia arriba (hacia el sol: a contraluz la nieve brilla)
  const N = 5200, P = new Float32Array(N * 3), V = [], so = PO.lean >= 0 ? 1 : -1, skO = SK.skis[so > 0 ? 1 : 0].position;
  for (let i = 0; i < N; i++) {
    const s = hash(i * 1.37), u = hash(i * 2.11), w = hash(i * 3.97), along = (u - 0.6) * 1.1;
    const o = v3(skO.x + so * (0.05 + s * 0.06), 0, skO.z + along); o.y = (hS + 0.03 - o.x * sl) / cl;
    const vo = (-0.35 + w * 0.6) * so, vu = 1.6 + Math.pow(hash(i * 5.3), 0.8) * 3.4, vb = 1.0 + hash(i * 6.1) * 3.2;
    const vel = v3(vo * cl + vu * sl, -vo * sl + vu * cl, -vb + (hash(i * 7.9) - 0.5) * 0.8);   // fuera + arriba (del mundo) en el marco inclinado; atrás = −z
    V.push([o, vel, 0.12 + Math.pow(hash(i * 8.7), 1.2) * 0.85]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const sz = new Float32Array(N); for (let i = 0; i < N; i++) sz[i] = 0.5 + Math.pow(hash(i * 4.4), 3) * 2.6; geo.setAttribute('sz', new THREE.Float32BufferAttribute(sz, 1));
  SK.spray = new THREE.Points(geo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: starTex0() }, k: { value: 1 }, sunDir: { value: SUN_DIR.clone() } },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float sz; uniform float k; uniform vec3 sunDir; varying float vA, vG; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv;
#include <logdepthbuf_vertex>
vA = k; vG = 1.0 + 2.6 * pow(max(dot(normalize(wp.xyz - cameraPosition), sunDir), 0.0), 4.0); gl_PointSize = clamp(sz * 18.0 / -mv.z, 1.0, 11.0); }`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; varying float vA, vG; void main(){
#include <logdepthbuf_fragment>
float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * 1.15 * vG, a * 0.85); }` }));
  SK.spray.frustumCulled = false; SK.spray.userData.V = V; g.add(SK.spray);
}
// tiempo de la escena del esquiador: casi parado (cámara lenta extrema) para que la nieve flote
function skierAt(t, vis) {
  SK.outer.visible = vis > 0.001; if (!SK.outer.visible) return;
  const tau0 = 0.46 + (((t % END) + END) % END) * 0.0025, A = SK.spray.geometry.attributes.position.array, V = SK.spray.userData.V;
  const sl = Math.sin(SK.PO.lean), cl = Math.cos(SK.PO.lean), hS = SK.hS;
  for (let i = 0; i < V.length; i++) { const [o, v, life] = V[i], tt = Math.min(life, tau0 * (0.35 + hash(i) * 1.1)), x = o.x + v.x * tt - 4.9 * sl * tt * tt; let y = o.y + v.y * tt - 4.9 * cl * tt * tt; const h = x * sl + y * cl; if (h < hS) y += (hS - h) / cl;
    A[i * 3] = x; A[i * 3 + 1] = y; A[i * 3 + 2] = o.z + v.z * tt; }
  SK.spray.geometry.attributes.position.needsUpdate = true;
}
