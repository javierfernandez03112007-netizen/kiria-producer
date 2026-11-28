// ---------------------------------------------------------------- «La sombra»: LO QUE PASA EN CADA FOTOGRAMA (todo depende solo de t).
const WALK_AMP = 0.85, BACK_AMP = 0.45;
const WALK_D = P_WALL.clone().sub(P_BACK).setY(0).length();
// distancia andada hacia la pared: primer paso, duda, pasos seguidos, frena
function walkS(t) { const T = TT; return mono(t, [T.walk0, T.walk0 + 0.95, T.walk0 + 1.5, T.walk1 - 0.7, T.walk1], [0, 0.4, 0.45, WALK_D - 0.3, WALK_D]); }
function backS(t) { return mono(t, [TT.back0, TT.back0 + 0.8, TT.back0 + 1.05, TT.back1], [0, 0.22, 0.24, 0.47]); }
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
// la llama: parpadeo (más fuerte con el miedo; casi quieta al final)
function flameAt(t) { const fear = win(t, TT.startle, 0.3) * (1 - win(t, TT.rise1, 1.5)), calm = win(t, TT.touch - 1, 1.5), a = (0.5 + 0.9 * fear) * (1 - 0.7 * calm);
  const n = (f, p) => Math.sin(t * f + p); const dx = 0.006 * a * (n(7.3, 1) + 0.6 * n(13.1, 2)), dz = 0.005 * a * (n(5.9, 3) + 0.5 * n(11.7, 4)), dy = 0.004 * a * n(9.1, 5);
  const I = 1 + 0.06 * a * (n(17.3, 6) + 0.7 * n(29.1, 7) + 0.4 * n(43.7, 8)); return { off: _v(dx, dy, dz), I }; }
function animA(t) { const A = CAST.A, U = A.userData, J = U.J; poseReset(A); const T = TT;
  if (t < T.walk0) {
    // quieto → sobresalto → dos pasos atrás → encogido → se levanta → respira
    const sb = backS(t), d = P_BACK.clone().sub(P_START), p = P_START.clone().addScaledVector(d, sb / d.length()); A.position.copy(p); A.rotation.set(0, Math.PI - 0.1, 0);
    const back = t > T.back0 && t < T.back1 + 0.2 ? 1 - win(t, T.back1 - 0.3, 0.4) : 0; if (back > 0) walkPose(A, -sb / (STRIDE * BACK_AMP), BACK_AMP * back);
    const st = win(t, T.startle, 0.18) * (1 - win(t, T.cower0, 0.6)), cw = win(t, T.cower0, 0.9) * (1 - win(t, T.rise0, 1.4));
    poseStartle(A, st + 0.4 * cw * 0); poseCower(A, eio(cw)); shake(A, t, 0.6 * st + 1.0 * cw);
    const up = win(t, T.rise0 + 0.6, 1.3), br = win(t, T.rise0 + 1.2, 0.6); breath(A, t, 0.6 * cw + 1.2 * br * (1 - win(t, T.walk0, 0.4)), 0.9 - 0.4 * br);
    // mira su sombra (arriba) antes del susto y al levantarse
    A.updateMatrixWorld(true); const look = (1 - win(t, T.startle, 0.2)) + up * (1 - win(t, T.walk0, 0.5)); lookAtP(A, _v(1.0, 7.5, ROOM.wallZ), 0.9 * Math.min(1, look));
  } else {
    // avanza hacia la pared; al llegar, gira de frente a la pared y levanta la mano
    const s = walkS(t), d = P_WALL.clone().sub(P_BACK), p = P_BACK.clone().addScaledVector(d, s / WALK_D); A.position.copy(p);
    const yaw = yawTo(P_BACK, P_WALL); A.rotation.set(0, lerp(Math.PI - 0.1, yaw, win(t, T.walk0 - 0.2, 0.5)) * (1 - win(t, T.walk1 - 0.3, 0.6)) + Math.PI * win(t, T.walk1 - 0.3, 0.6), 0);
    const go = win(t, T.walk0, 0.3) * (1 - win(t, T.walk1 - 0.25, 0.45)); if (go > 0.001) walkPose(A, s / (STRIDE * WALK_AMP), WALK_AMP * go);
    // el cuerpo, cada vez más erguido; la cabeza mira la sombra (que baja hasta su altura)
    J.spine.rotation.x += 0.06 * (1 - win(t, T.walk0 + 2, 2)); breath(A, t, 0.4 * (1 - win(t, T.walk0 + 1.5, 1)), 0.7);
    const sh = shadowHead(A); A.updateMatrixWorld(true); lookAtP(A, sh, 0.8);
    const hk = win(t, T.hand0, T.touch - T.hand0); if (hk > 0) { const tgt = handWall(); const pre = tgt.clone().add(_v(-0.05, -0.12, 0.22)); reachTo(A, 'L', pre.lerp(tgt, sm5(clamp((t - T.hand0) / (T.touch - T.hand0)))), Math.min(1, hk * 1.6), _v(0, -1, 0.4)); J.head.rotation.y += 0.25 * hk; }
    breath(A, t, 0.35 * win(t, T.touch, 1), 0.45);
  } }
// dónde toca la pared con la mano (y donde la toca su sombra)
function handWall() { return _v(P_WALL.x + 0.27, 1.46, ROOM.wallZ + 0.012); }
// la cabeza de su sombra en la pared (para que la mire): proyección desde la llama
function shadowHead(A) { const L = FLAME(), h = A.position.clone().add(_v(0, 1.55, 0)), s = (L.z - ROOM.wallZ) / Math.max(0.05, L.z - h.z); return _v(L.x + (h.x - L.x) * s, L.y + (h.y - L.y) * s, ROOM.wallZ); }
function animLight(t) { const f = flameAt(t), Lp = FLAME().add(f.off), U = S.lamp; U.sp.position.copy(Lp); U.pt.position.copy(Lp).add(_v(0, 0.05, 0));
  U.sp.intensity = 7 * f.I; U.pt.intensity = 0.9 * f.I; const lan = S.lan.userData; lan.flame.position.y = 0.205 + f.off.y; lan.flame.position.x = f.off.x; lan.flame.scale.set(0.011, 0.022 * (0.9 + 0.2 * (f.I - 1) * 4), 0.011);
  lan.glow.material.opacity = 0.8 * f.I; lan.glow2.material.opacity = 0.2 * f.I; }
function animAt(t, st) { animA(t); animLight(t); motesAt(t); }
