// ---------------------------------------------------------------- «El efecto dominó»: LA CÁMARA (siempre en movimiento).
// A: muy cerca de la primera ficha y del dedo. B: corre con la ola: apunta a la ficha que está cayendo y se aleja en proporción a su tamaño (la escala sube
// 1,45 veces por ficha), girando despacio a su alrededor. C: la gigante cae hacia la cámara (abajo, de lado). D: vuelve volando por encima de la cadena
// hasta detrás de la persona.
let CK = [], CUTS = [];
const CAMP = { t: [], c: [] };
function buildCamPath() { const t0 = TT.push - 0.2, t1 = WARP.V[DOM.N - 1] + 0.6, n = Math.ceil((t1 - t0) * 120), raw = [];
  for (let i = 0; i <= n; i++) raw.push(frontAt(t0 + i / 120));
  const sig = 0.22 * 120, K = Math.round(3 * sig), out = []; for (let i = 0; i <= n; i++) { let s = 0, w = 0; for (let k = -K; k <= K; k++) { const j = clamp(i + k, 0, n), g = Math.exp(-0.5 * (k / sig) ** 2); s += raw[j] * g; w += g; } out.push(s / w); }
  CAMP.t0 = t0; CAMP.c = out; }
function frontSmooth(t) { const f = clamp((t - CAMP.t0) * 120, 0, CAMP.c.length - 1), k = Math.floor(f), u = f - k; return CAMP.c[k] + (CAMP.c[Math.min(CAMP.c.length - 1, k + 1)] - CAMP.c[k]) * u; }
const hOf = c => DOM.h0 * Math.pow(DOM.r, c);
const xOf = c => { const i = clamp(Math.floor(c), 0, DOM.N - 2), u = clamp(c - i, 0, 1); return DOM.X[i] + (DOM.X[i + 1] - DOM.X[i]) * u; };
function camA(t) { const k = eio(clamp(t / (TT.push + 0.35))); return { p: _v(0.05 + 0.03 * k, 0.03 - 0.01 * k, 0.24 - 0.11 * k), l: _v(-0.03 + 0.03 * k, 0.012 - 0.004 * k, -0.01), f: 40 }; }
const CB = { T: [1.4, 4.0, 7.0, 10.2, 12.8, 15.2], PH: [1.75, 0.75, 2.55, 2.2, 1.15, 0.95], EL: [0.12, 0.2, 0.62, 0.5, 0.06, 0.16], D: [2.7, 3.0, 4.6, 4.2, 2.6, 3.0] };
function camB(t) { const c = frontSmooth(t), h = hOf(c), x = xOf(c), ph = mono(t, CB.T, CB.PH), el = mono(t, CB.T, CB.EL), d = mono(t, CB.T, CB.D) * h;
  const tgt = _v(x + 0.25 * h, 0.42 * h, 0); return { p: tgt.clone().add(_v(Math.cos(ph) * Math.cos(el) * d, Math.sin(el) * d + 0.15 * h, Math.sin(ph) * Math.cos(el) * d)), l: tgt, f: 42 }; }
function camC(t) { const X = DOM.X[DOM.N - 1], H = DOM.h[DOM.N - 1], u = seg(t, WARP.V[DOM.N - 1], WARP.land + 0.4);
  const up = eio(seg(t, WARP.land, WARP.land + 1.3)); return { p: _v(X + 4 + 5 * u, 1.1 + 0.6 * u + 6 * up, 15.5 - 1.5 * u + 2 * up), l: _v(X + 1.5 + 4.5 * eio(u), H * (0.55 - 0.45 * eio(u)), 0), f: 50 }; }
function camD(t) { const u = eio(seg(t, WARP.land + 0.6, END)), X = DOM.X[DOM.N - 1];
  const P = [_v(X + 9, 7.6, 17.5), _v(X * 0.5, 14, 14), _v(-5.0, 2.0, 0.1)], L = [_v(X + 5, 0, 0), _v(X * 0.3, 0, 0), _v(8, 0.7, -0.1)];
  const q = (A, s) => s < 0.5 ? A[0].clone().lerp(A[1], s * 2) : A[1].clone().lerp(A[2], (s - 0.5) * 2); const s1 = sm5(u);
  return { p: q(P, s1), l: q(L, s1), f: 46 }; }
function mixCam(a, b, k) { return { p: a.p.clone().lerp(b.p, k), l: a.l.clone().lerp(b.l, k), f: lerp(a.f, b.f, k) }; }
function camAt(t) { t = clamp(t, 0, END); let c;
  const kAB = eio(seg(t, TT.push + 0.15, TT.push + 0.75)), kBC = eio(seg(t, WARP.V[DOM.N - 1] - 0.4, WARP.V[DOM.N - 1] + 0.5)), kCD = eio(seg(t, WARP.land + 0.4, WARP.land + 1.2));
  if (kAB < 1) c = mixCam(camA(t), camB(t), kAB); else if (kBC <= 0) c = camB(t); else if (kCD <= 0) c = mixCam(camB(t), camC(t), kBC); else c = mixCam(camC(t), camD(t), kCD);
  // temblor al caer la gigante
  const sh = Math.max(0, 1 - (t - WARP.land) / 0.9) * (t > WARP.land ? 1 : 0); if (sh > 0) { c.p.x += 0.12 * sh * Math.sin(t * 61); c.p.y += 0.09 * sh * Math.sin(t * 47 + 1); }
  return { p: c.p, l: c.l, f: c.f, roll: 0 }; }
function buildCam() { }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
