// ---------------------------------------------------------------- «La sombra»: ANDAR SIN QUE PATINEN LOS PIES y posturas de miedo.
// walkPose(p, ph, amp): ph en ciclos (1 ciclo = 2 pasos); el pie de apoyo barre ≈ 0,53·amp m por paso, así que la fase se saca de la distancia andada:
// ph = distancia / (1,05·amp). En three.js la flexión de cadera (muslo adelante) es rotation.x negativa; la de rodilla, positiva.
const STRIDE = 1.05;
function walkPose(p, ph, amp = 1) { const J = p.userData.J, k = p.userData.k, TAU = Math.PI * 2;
  for (const [n, o] of [['L', 0], ['R', 0.5]]) { const u = ((ph + o) % 1 + 1) % 1;
    const hip = 0.42 * Math.cos(TAU * u) + 0.06;                                            // + = muslo adelante
    const knee = u < 0.6 ? 0.1 + 0.16 * Math.sin(Math.PI * u / 0.6) : 0.12 + 1.0 * Math.sin(Math.PI * (u - 0.6) / 0.4);
    const ank = u < 0.12 ? -0.22 * (1 - u / 0.12) : (u > 0.42 && u < 0.62 ? 0.38 * Math.sin(Math.PI * (u - 0.42) / 0.2) : 0);
    J['hp' + n].rotation.x = -hip * amp; J['kn' + n].rotation.x = knee * amp; J['an' + n].rotation.x = ank * amp; }
  J.pelvis.position.y = p.userData.base.pelY - 0.03 * k * amp + 0.018 * k * amp * Math.cos(TAU * 2 * ph);
  J.pelvis.rotation.y = 0.07 * amp * Math.cos(TAU * ph); J.chest.rotation.y = -0.09 * amp * Math.cos(TAU * ph); J.spine.rotation.z = 0.025 * amp * Math.sin(TAU * ph);
  J.shL.rotation.x = 0.3 * amp * Math.cos(TAU * ph); J.shR.rotation.x = -0.3 * amp * Math.cos(TAU * ph); J.elL.rotation.x = J.elR.rotation.x = -0.22 - 0.12 * amp;
  J.shL.rotation.z = -0.07; J.shR.rotation.z = 0.07; }
// encogido de miedo: rodillas dobladas, brazos cruzados sobre la cabeza, cabeza baja (k = 0…1)
function poseCower(p, k) { const J = p.userData.J, kk = p.userData.k;
  J.pelvis.position.y -= 0.3 * kk * k; J.hpL.rotation.x += -0.95 * k; J.hpR.rotation.x += -0.8 * k; J.knL.rotation.x += 1.6 * k; J.knR.rotation.x += 1.45 * k; J.anL.rotation.x += -0.55 * k; J.anR.rotation.x += -0.5 * k;
  J.spine.rotation.x += 0.42 * k; J.chest.rotation.x += 0.2 * k; J.neck.rotation.x += 0.3 * k; J.head.rotation.x += 0.25 * k;
  J.shL.rotation.x += -2.45 * k; J.shR.rotation.x += -2.35 * k; J.shL.rotation.z += -0.35 * k; J.shR.rotation.z += 0.35 * k; J.elL.rotation.x += -1.75 * k; J.elR.rotation.x += -1.8 * k; J.elL.rotation.y += 0.5 * k; J.elR.rotation.y += -0.5 * k; }
// sobresalto: hombros arriba, brazos a medio subir delante del pecho, cabeza atrás
function poseStartle(p, k) { const J = p.userData.J; J.shL.rotation.z += -0.12 * k; J.shR.rotation.z += 0.12 * k; J.shL.rotation.x += -0.75 * k; J.shR.rotation.x += -0.7 * k; J.elL.rotation.x += -1.35 * k; J.elR.rotation.x += -1.3 * k;
  J.chest.rotation.x += -0.1 * k; J.head.rotation.x += -0.18 * k; J.spine.rotation.x += -0.06 * k; }
// temblor (ruido rápido y pequeño en pecho, brazos y cabeza)
function shake(p, t, k) { if (k <= 0.001) return; const J = p.userData.J, n = (a, b) => Math.sin(t * a + b) * 0.6 + Math.sin(t * a * 1.73 + b * 2.1) * 0.4;
  J.chest.rotation.z += 0.025 * k * n(41, 1); J.chest.rotation.x += 0.02 * k * n(37, 2); J.head.rotation.y += 0.04 * k * n(29, 3); J.shL.rotation.x += 0.05 * k * n(47, 4); J.shR.rotation.x += 0.05 * k * n(43, 5); J.pelvis.position.y += 0.004 * k * n(53, 6); }
// respiración marcada (pecho y hombros), k = intensidad
function breath(p, t, k, f = 1.2) { const J = p.userData.J, s = Math.sin(t * f * Math.PI * 2); J.chest.rotation.x += -0.035 * k * s; J.shL.rotation.z += -0.03 * k * s; J.shR.rotation.z += 0.03 * k * s; J.neck.rotation.x += 0.02 * k * s; }
