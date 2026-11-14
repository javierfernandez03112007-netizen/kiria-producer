// ---------------------------------------------------------------- el centro (Javi, 14-11): Homer, de pie en la puerta de su casa de Springfield, se come un polo y el dron
// baja hasta él. Al morder, la cámara se mete de golpe en su cabeza (la piel se vuelve cristal y todo se oscurece) y se CONGELA EL CEREBRO (Homer, por fuera,
// no se congela). Dentro pasa lo de cada frase: el frío en el paladar, el nervio da la alarma (primer plano de neuronas), la sangre por la arteria que se
// ensancha, el cráneo y las meninges que duelen, el nervio de la frente y la medida de 2012. Fuera, las peanas en el césped (27 y 13 de cada 100). Dentro
// otra vez para el truco (la lengua contra el paladar). Fuera, Homer aliviado, y el dron vuelve a subir (bucle con el primer fotograma).
let T_HIT = 1.5;      // el mordisco (en el arranque se pone en «comer»)
const P_BITE = v3(-0.19, -1.32, 1.42), D_BITE = v3(0.22, 0.72, -0.66), P_HOLD = v3(-0.36, -1.66, 1.62), D_HOLD = v3(0.2, 0.8, -0.56), P_LOW = v3(-1.0, -3.3, 1.75), D_LOW = v3(0.1, 0.95, 0.3), ELBOW = v3(-2.0, -3.9, 0.9);
const _pp = new THREE.Vector3(), _dd = new THREE.Vector3(), _bw = new THREE.Vector3();
let DK = 0, MAC = 0;                                   // DK: cuánto estamos «dentro» (oscuro + piel de cristal); MAC: primer plano de neuronas
const NRN_POS = new THREE.Vector3(0, 400, 0), NRN_SC = 1, FROST_C = new THREE.Vector3(0, 0.25, 0.3);
// cúpula oscura (fondo de las tomas de dentro): azul casi negro con una neblina muy suave; k = opacidad
function darkDome(r) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { k: { value: 0 } },
    vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n#include <logdepthbuf_vertex>\n}',
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform float k; varying vec3 vP;
float dh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(dh(i), dh(i + vec3(1,0,0)), f.x), mix(dh(i + vec3(0,1,0)), dh(i + vec3(1,1,0)), f.x), f.y), mix(mix(dh(i + vec3(0,0,1)), dh(i + vec3(1,0,1)), f.x), mix(dh(i + vec3(0,1,1)), dh(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
#include <logdepthbuf_fragment>
  float nb = dn(vP * 3.) * 0.6 + dn(vP * 7.) * 0.4;
  vec3 c = vec3(0.006, 0.011, 0.026) + vec3(0.008, 0.016, 0.042) * smoothstep(0.35, 0.85, nb) + vec3(0.012, 0.005, 0.026) * smoothstep(0.55, 0.9, dn(vP * 2. + 5.));
  gl_FragColor = vec4(c, k); }` });
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), m); s.renderOrder = -1; s.frustumCulled = false; return s;
}
function buildCenter() {
  S.hero = buildHero(); scene.add(S.hero); S.hero.traverse(o => { o.renderOrder = 30; });
  for (const ic of S.hero.userData.icicles) ic.m.visible = false;          // Homer no se congela por fuera
  S.dome = darkDome(60); scene.add(S.dome);
  const head = S.hero.userData.head;
  if (typeof buildBrain === 'function') S.brain = buildBrain(head);
  if (typeof buildAnatomy === 'function') S.ana = buildAnatomy(head, S.hero.userData.jaw);
  if (typeof buildNeurons === 'function') { S.nrn = buildNeurons(); S.nrn.group.position.copy(NRN_POS); S.nrn.group.scale.setScalar(NRN_SC); scene.add(S.nrn.group);
    S.dome2 = darkDome(80); S.dome2.position.copy(NRN_POS); S.dome2.material.uniforms.k.value = 1; scene.add(S.dome2); }
}
// dentro (0 → 1): del mordisco a cuando se cierra la arteria (frase 7), y otra vez con el truco (frase 9)
function inK(t) { return Math.max(win(t, T_HIT + 0.03, 0.32) * (1 - win(t, K.cierra7 + 0.25, 0.55)), win(t, K.truco9 + 0.12, 0.42) * (1 - win(t, K.calentarlo9 + 0.12, 0.5))); }
// el primer plano de neuronas («un nervio da la alarma»)
const macT = () => [K.nervio3 + 0.38, K.cuerpo4 - 0.06];
function macK(t) { const [a, b] = macT(); return t >= a && t < b ? 1 : 0; }
// el cerebro se congela al morder y se descongela cuando se ve que lo frío es el paladar
function frostK(t) { return win(t, T_HIT + 0.2, 0.95) * (1 - win(t, K.helado3 + 0.25, K.paladar3 + 0.35 - K.helado3 - 0.25)); }
// la arteria cerebral anterior: se ensancha (frase 4), se abre y se cierra (frase 7) y vuelve a la normalidad con el truco
function acaK(t) { let k = win(t, K.ensancha4 - 0.15, 0.7) * (1 - win(t, K.n2012 - 0.1, 0.6)); k = Math.max(k, win(t, K.abre7 - 0.35, 0.5) * (1 - win(t, K.cierra7 - 0.1, 0.6)));
  return Math.max(k, win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.2, 0.7))); }
function painK(t) {      // las meninges en rojo
  return Math.max(win(t, K.capas5 - 0.1, 0.5) * (1 - win(t, K.n2012 - 0.2, 0.5)), win(t, K.abre7 - 0.25, 0.4) * (1 - win(t, K.cierra7 - 0.05, 0.5)) * 0.85,
    win(t, K.truco9 - 0.05, 0.3) * (1 - win(t, K.paladar9 + 0.1, 0.7)) * 0.7);
}
// pulsos por el nervio: V2 (del paladar al ganglio) con la alarma y antes de la frente; V1 (del ganglio a la frente)
function n2At(t) { const a = (t - K.nervio3 + 0.05) / 0.7; if (a > 0 && a < 1.2) return a; const b = (t - K.nervio6 + 0.1) / 0.7; return b > 0 && b < 1.2 ? b : -1; }
function n1At(t) { const a = (t - K.nervio6 - 0.5) / (K.frente6 - K.nervio6 - 0.3); return a > 0 && a < 1.2 ? a : -1; }
const C_HS = new THREE.Color(0xb9d4ff), C_HG = new THREE.Color(0x56603a), C_LS = new THREE.Color(0x9fb8ff), C_LG = new THREE.Color(0x101018);
function centerAt(t, st) {
  const U = S.hero.userData, mi = U.headMesh.morphTargetInfluences;
  DK = inK(t); MAC = macK(t);
  // la cara: come con la boca entreabierta, la abre antes del mordisco y muerde (T_HIT); luego, el dolor (ojos apretados, mueca, tiritona); con el truco,
  // alivio y sonrisa; al final vuelve a la pose del principio (bucle)
  const bite = win(t, T_HIT - 0.04, 0.08), relief = win(t, K.calentarlo9 + 0.2, 0.6), backK = win(t, END - 0.95, 0.75), pain = win(t, T_HIT + 0.1, 0.4) * (1 - relief);
  let jaw = lerp(0.18 + 0.47 * env(t, T_HIT - 0.45, T_HIT + 0.02, 0.32, 0.04), 0.06, bite);
  jaw = lerp(jaw, 0.18, backK); mi[0] = jaw; mi[1] = relief * (1 - backK); mi[2] = 0.85 * pain * (1 - backK);
  U.jaw.rotation.x = JAW_A * mi[0];
  const shock = env(t, T_HIT + 0.03, T_HIT + 0.5, 0.06, 0.2), squeeze = win(t, T_HIT + 0.42, 0.3) * (1 - relief), blink = Math.max(0, 1 - Math.abs(t - (K.calentarlo9 + 0.75)) / 0.09);
  const open = (1 + 0.5 * shock) * (1 - 0.8 * squeeze) * (1 - blink), pitch = 0.26 * Math.max(1 - bite, backK, env(t, K.tu10 + 0.1, K.mandaselo10, 0.3, 0.3));
  for (const e of U.eyes) eyePose(e, open, 1, 0, pitch);
  // el polo: delante de la boca → muerde → un poco fuera → abajo, contento → otra vez delante de la boca (bucle)
  const toBite = env(t, T_HIT - 0.4, T_HIT + 0.22, 0.36, 0.22), low = win(t, K.calentarlo9 + 0.4, 0.8) * (1 - win(t, END - 1.3, 1.0));
  _pp.copy(P_HOLD).lerp(P_BITE, toBite).lerp(P_LOW, low); _dd.copy(D_HOLD).lerp(D_BITE, toBite).lerp(D_LOW, low); _pp.y += 0.035 * Math.sin(t * 1.7) * (1 - toBite);
  armPose(U, _pp, _dd, ELBOW);
  // la cabeza: un leve movimiento de vida; con dolor, la tiritona y la cabeza un poco gacha
  U.head.rotation.set(0.03 * Math.sin(t * 1.3) + 0.06 * squeeze - 0.04 * pitch, 0.04 * Math.sin(t * 0.9) + pain * 0.012 * Math.sin(t * 37), pain * 0.01 * Math.sin(t * 29));
  S.hero.updateMatrixWorld(true);
  // sin escarcha por fuera; la piel de cristal según DK; el dolor de la frente tiñe la piel
  FZ.r.value = 0; FZ.m.value = -1; FZ.gh.value = DK;
  const fore = env(t, K.frente6 - 0.1, K.n2012 - 0.3, 0.35, 0.5);
  U.head.localToWorld(FZ.pc.value.set(0, 0.5, 0.72)); FZ.pk.value = fore * (0.85 + 0.15 * Math.sin(t * 10));
  // fuera / dentro: cúpula oscura, casa, cielo, luces, reflejos y resplandor
  S.dome.material.uniforms.k.value = DK; S.dome.visible = DK > 0.002; S.house.visible = DK < 0.999; S.sky.visible = DK < 0.999;
  const L = S.L; L.sun.intensity = lerp(3.4, 1.3, DK); L.hemi.intensity = lerp(0.55, 0.6, DK); L.hemi.color.lerpColors(C_HS, C_LS, DK); L.hemi.groundColor.lerpColors(C_HG, C_LG, DK); L.rim.intensity = lerp(1.3, 0.5, DK);
  scene.environment = DK > 0.5 ? S.envRoom : S.envSky; scene.environmentIntensity = lerp(0.75, 0.35, DK);
  post.uniforms.bloom.value = lerp(0.35, 0.9, DK); post.uniforms.vig.value = lerp(0.16, 0.36, DK);
  // dentro de la cabeza
  const cold = win(t, K.enfria3 - 0.1, 0.5) * (1 - win(t, K.paladar9 + 0.3, 0.9)), warm = win(t, K.paladar9 - 0.05, 0.6) * (1 - win(t, K.calentarlo9 + 0.6, 0.4));
  const alarm = env(t, macT()[1] - 0.05, K.sangre4 + 0.3, 0.12, 0.5), pk = painK(t);
  const painPulse = Math.max(env(t, K.esas5 - 0.1, K.nervio6, 0.2, 0.4), 0.5 * pk);
  if (S.brain) brainAt(t, { on: DK, frost: frostK(t), frostC: FROST_C, fibers: 0.55 + 0.45 * Math.max(alarm, pk), alarm, pain: pk, painPulse,
    skull: env(t, K.craneo5 - 0.15, K.nervio6, 0.4, 0.5), arrows: env(t, K.presion5 - 0.2, K.esas5, 0.35, 0.4) });
  if (S.ana) anatomyAt(t, { on: DK, cold, warm, n2: n2At(t), n1: n1At(t), nGlow: Math.min(1, env(t, K.nervio3 - 0.1, K.cuerpo4, 0.3, 0.5) + env(t, K.nervio6 - 0.1, K.n2012 - 0.2, 0.3, 0.5)), fore,
    blood: Math.min(1, 0.25 + env(t, K.sangre4 - 0.15, K.craneo5, 0.3, 0.6) + 0.8 * env(t, K.abre7 - 0.35, K.cierra7, 0.3, 0.4)), aca: acaK(t),
    tongue: win(t, K.aprieta9 + 0.05, 0.9) * (1 - win(t, K.calentarlo9 + 0.5, 0.5)) });
  if (S.nrn) { const [a, b] = macT(); S.nrn.group.visible = MAC > 0; S.dome2.visible = MAC > 0; neuronsAt(t, { on: MAC, pulse: MAC ? (t - a - 0.08) / (b - a - 0.22) : -1, hue: 0, ambient: 1 }); }
}
