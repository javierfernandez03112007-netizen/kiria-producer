// ---------------------------------------------------------------- CARAS, MÓVILES, BRAZOS Y OBJETOS
// ---- cara: dos ojos y una boca (sonrisa que crece; boca abierta para gritar de alegría)
function addFace(d) { const J = d.userData.J, dark = new THREE.MeshStandardMaterial({ color: 0x1b1512, roughness: 0.35 }), mm = new THREE.MeshStandardMaterial({ color: 0x8a2f27, roughness: 0.5 }), F = { eyes: [] };
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 10), dark); e.position.set(sx * 0.027, 0.092, 0.0625); J.neck.add(e); F.eyes.push(e);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.016, 3, 6), d.userData.hairM || dark); b.rotation.z = Math.PI / 2 + sx * 0.12; b.position.set(sx * 0.027, 0.11, 0.0615); J.neck.add(b); }
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 6, 16, Math.PI), mm); m.rotation.set(0.28, 0, Math.PI); m.position.set(0, 0.07, 0.0708); J.neck.add(m); F.mouth = m;
  const o = new THREE.Mesh(new THREE.CircleGeometry(0.02, 18, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a1712, roughness: 0.6 })); o.position.set(0, 0.072, 0.0735); o.rotation.x = 0.3; J.neck.add(o); F.open = o; o.visible = false;
  d.userData.F = F; return d; }
function smile(d, k, open = 0, t = 0, seed = 0) { const F = d.userData.F; if (!F) return; k = clamp(k); F.open.visible = open > 0.5; F.mouth.visible = !F.open.visible; F.mouth.scale.set(0.55 + 0.45 * k, 0.12 + 0.88 * k, 1); F.open.scale.setScalar(0.9 + 0.25 * open);
  const b = (t * 0.31 + hash(seed * 3.7)) % 1 < 0.035 ? 0.12 : 1; for (const e of F.eyes) e.scale.set(1, b * (1 - 0.25 * k * (open > 0.5 ? 1 : 0)), 1); }
// ---- móvil: cuerpo oscuro y pantalla (textura). El frente es +z y la parte de arriba +y
const PH = { w: 0.074, h: 0.156 };
function phoneModel(tex, col = 0x1c1d21) { const g = new THREE.Group(); const b = rbox(PH.w, PH.h, 0.009, new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.5 }), 0.012); g.add(b);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.007, PH.h - 0.008), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); s.position.z = 0.0049; g.add(s); g.userData.scr = s;
  const cm = new THREE.Mesh(new THREE.CircleGeometry(0.008, 16), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2 })); cm.rotation.y = Math.PI; cm.position.set(0.02, 0.058, -0.0048); g.add(cm); return g; }
// pantalla de chat (fija) para los móviles de los planos cortos
function chatTex(mine) { return canvasTex(270, 570, (g, w, h) => { g.fillStyle = '#efe7dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f7a68'; g.fillRect(0, 0, w, 62); g.fillStyle = '#fff'; g.font = '700 24px Inter, sans-serif'; g.fillText('VERANO 🌴', 16, 40);
    const bub = (y, txt, me) => { g.font = '500 19px Inter, sans-serif'; const tw = Math.min(w - 60, g.measureText(txt).width + 24); g.fillStyle = me ? '#d9fdd3' : '#ffffff'; rr(g, me ? w - 14 - tw : 14, y, tw, 40, 12); g.fill(); g.fillStyle = '#1b1b1b'; g.fillText(txt, (me ? w - 14 - tw : 14) + 12, y + 27); };
    bub(90, '¿y si nos vamos?', false); if (mine) bub(144, mine, true); g.fillStyle = '#fff'; rr(g, 12, h - 56, w - 24, 42, 21); g.fill(); }); }
// ---- brazo hasta un punto del mundo (dos huesos): el codo cae hacia atrás/abajo
function armTo(d, side, target, k = 1) { if (k <= 0.001) return; const J = d.userData.J, sh = J['sh' + side], el = J['el' + side]; d.updateMatrixWorld(true);
  const p = sh.parent.worldToLocal(target.clone()).sub(sh.position), L = 0.19, dist = Math.min(p.length(), 2 * L * 0.999), a = Math.acos(dist / (2 * L)), q0 = sh.quaternion.clone(), e0 = el.rotation.x;
  sh.quaternion.setFromUnitVectors(_yn, p.normalize()); sh.rotateX(a); el.rotation.set(-2 * a, 0, 0);
  if (k < 0.999) { const q1 = sh.quaternion.clone(); sh.quaternion.copy(q0).slerp(q1, k); el.rotation.x = lerp(e0, -2 * a, k); } }
const _yn = new THREE.Vector3(0, -1, 0);
const headW = d => wpos(d.userData.J.head);
const handW = (d, side) => wpos(d.userData.J['h' + side]);
// mirar a un punto con la cabeza (giro y cabeceo limitados)
function lookAtPt(d, target, k = 1) { const J = d.userData.J; d.updateMatrixWorld(true); const p = J.chest.worldToLocal(target.clone()).sub(J.neck.position).sub(v3(0, 0.08, 0)); const yaw = clamp(Math.atan2(p.x, p.z), -1.1, 1.1), pit = clamp(-Math.atan2(p.y, Math.hypot(p.x, p.z)), -0.6, 0.85); J.neck.rotation.y = yaw * k; J.neck.rotation.x = pit * k; }
// sostener el móvil delante de la cara: se coloca el móvil (mirando a los ojos) y la mano va a él
function holdPhone(d, ph, o = {}) { const J = d.userData.J; d.updateMatrixWorld(true); const side = o.side || 'R', sx = side === 'R' ? 1 : -1, s = d.userData.s0;
  const P = J.chest.localToWorld(v3((o.x ?? 0.06) * sx, o.y ?? 0.24, o.z ?? 0.2)); ph.position.copy(P); const hw = headW(d); ph.up.set(0, 1, 0); ph.lookAt(hw); if (o.roll) ph.rotateZ(o.roll);
  const grip = P.clone().add(v3(0, -0.05, 0).applyQuaternion(ph.quaternion)).add(v3(0.03 * sx, 0, -0.012).applyQuaternion(ph.quaternion)); armTo(d, side, grip); if (o.both) armTo(d, side === 'R' ? 'L' : 'R', P.clone().add(v3(-0.03 * sx, -0.05, -0.012).applyQuaternion(ph.quaternion)));
  lookAtPt(d, P, o.look ?? 1); return P; }
// ---- maleta con ruedas (se arrastra inclinada) y bocadillo
function suitcase(col) { const g = new THREE.Group(), m = stdM(col, 0.45), dk = stdM(0x26282e, 0.5); const b = rbox(0.4, 0.58, 0.24, m, 0.05); b.position.y = 0.37; g.add(b); for (const y of [0.25, 0.5]) boxAt(g, 0.41, 0.015, 0.245, stdM(new THREE.Color(col).multiplyScalar(0.7).getHex(), 0.5), 0, y, 0);
  for (const sx of [-1, 1]) { cylAt(g, 0.006, 0.006, 0.42, stdM(0xbfc4cc, 0.3, { metalness: 0.8 }), sx * 0.11, 0.86, -0.07, 6); const w = cylAt(g, 0.04, 0.04, 0.03, dk, sx * 0.15, 0.04, -0.08, 12); w.rotation.z = Math.PI / 2; } boxAt(g, 0.26, 0.025, 0.03, dk, 0, 1.07, -0.07); g.userData.handle = v3(0, 1.07, -0.07); return g; }
function dragCase(c, d, side, back = 0.42, tilt = 0.5) { const yaw = d.rotation.y, sx = side === 'R' ? 1 : -1; d.updateMatrixWorld(true); const sh = wpos(d.userData.J['sh' + side]);
  const hx = sh.x + Math.cos(yaw) * (-0.1 * sx) - Math.sin(yaw) * 0.22, hz = sh.z - Math.sin(yaw) * (-0.1 * sx) - Math.cos(yaw) * 0.22, hy = 0.74, H = c.userData.handle;      // la mano, algo detrás del hombro
  c.rotation.set(0, 0, 0); c.rotation.order = 'YXZ'; c.rotation.y = yaw; c.rotation.x = tilt; const off = H.clone().applyEuler(c.rotation); c.position.set(hx - off.x, 0.04, hz - off.z); c.position.y = Math.max(0, hy - off.y); armTo(d, side, v3(hx, c.position.y + off.y, hz)); }
function bocadillo() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.15, 6, 12), stdM(0xd9a55a, 0.8)); b.rotation.z = Math.PI / 2; b.castShadow = true; g.add(b); const f = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.066), stdM(0x7ab648, 0.8)); g.add(f); const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.07), stdM(0xe5533d, 0.7)); f2.position.y = 0.008; g.add(f2);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.09, 12, 1, true), stdM(0xfdfcf7, 0.9, { side: THREE.DoubleSide })); p.rotation.z = Math.PI / 2; p.position.x = -0.05; g.add(p); return g; }
// comer: la mano sube el bocadillo a la boca (k = 0 abajo, 1 en la boca)
function eatAt(d, food, side, k) { const J = d.userData.J, sx = side === 'R' ? 1 : -1; d.updateMatrixWorld(true); const rest = J.chest.localToWorld(v3(0.08 * sx, 0.1, 0.17)), mouth = J.chest.localToWorld(v3(0.02 * sx, 0.385, 0.115)), P = rest.lerp(mouth, sm5(clamp(k))); food.position.copy(P); food.rotation.set(0, d.rotation.y + 0.5 * sx, 0.25 * sx); armTo(d, side, P.clone().add(v3(0, -0.03, 0))); }
// ---- brazo suelto para el plano cenital de la votación: la yema del índice está en el origen y el brazo se aleja por +x
function voteArm(sleeve, skin) { const g = new THREE.Group(), ms = stdM(skin, 0.6), mc = stdM(sleeve, 0.75), cap = (r, l, m, x) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m); c.rotation.z = Math.PI / 2; c.position.x = x; c.castShadow = true; g.add(c); return c; };
  cap(0.0075, 0.06, ms, 0.037); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), ms); hd.scale.set(1.15, 0.6, 0.95); hd.position.set(0.108, 0.008, 0); hd.castShadow = true; g.add(hd);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.02, 4, 8), ms); f.rotation.z = Math.PI / 2; f.position.set(0.075, -0.004, 0.016 + i * 0.016 - 0.008); f.castShadow = true; g.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.028, 4, 8), ms); th.rotation.set(0, 0.7, Math.PI / 2); th.position.set(0.085, 0.0, -0.034); g.add(th);
  cap(0.027, 0.2, ms, 0.27); cap(0.036, 0.5, mc, 0.62); return g; }
function armPose(a, tip, yaw, tilt = 0.3) { a.position.copy(tip); a.rotation.set(0, yaw, tilt); }

// ---------------------------------------------------------------- PANTALLAS DEL MÓVIL PROTAGONISTA (lienzo 540 × 1160 que se redibuja)
const BK = { blue: '#003580', cta: '#0071c2', yel: '#febb02', ink: '#1a1a1a', grey: '#6b6b6b' };
function scrText(g, txt, x, y, px, w = 700, col = BK.ink, align = 'left') { g.font = `${w} ${px}px Inter, "Noto Color Emoji", sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(txt, x, y); g.textAlign = 'left'; }
// pantalla de bloqueo: se enciende (k) y baja el aviso del grupo (n)
function drawLock(g, w, h, k, n) { g.fillStyle = '#050608'; g.fillRect(0, 0, w, h); if (k <= 0.01) return; g.save(); g.globalAlpha = clamp(k);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(0.55, '#e0527a'); gr.addColorStop(1, '#3b2a6b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(w * 0.5, h * 0.66, 120, 0, 7); g.fill(); g.fillStyle = '#2a1f55'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 6; i++) g.fillRect(w * 0.5 - 150 + i * 14, h * 0.74 + i * 34, 300 - i * 28, 8);
  scrText(g, '17:42', w / 2, 250, 150, 500, '#ffffff', 'center'); scrText(g, 'jueves, 4 de junio', w / 2, 310, 34, 500, 'rgba(255,255,255,.9)', 'center');
  if (n > 0.01) { const y = 400 - (1 - sm5(clamp(n))) * 70; g.globalAlpha = clamp(k) * clamp(n * 1.5); g.fillStyle = 'rgba(255,255,255,.96)'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 26; g.shadowOffsetY = 8; rr(g, 14, y, w - 28, 240, 40); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.fillStyle = '#25b34b'; g.beginPath(); g.arc(76, y + 62, 32, 0, 7); g.fill(); g.fillStyle = '#fff'; rr(g, 58, y + 46, 36, 27, 9); g.fill(); g.beginPath(); g.moveTo(62, y + 68); g.lineTo(60, y + 82); g.lineTo(74, y + 72); g.fill();
    scrText(g, 'VERANO 🌴', 124, y + 78, 50, 900); scrText(g, 'ahora', w - 46, y + 74, 28, 500, BK.grey, 'right'); scrText(g, '¿y si nos vamos?', 44, y + 178, 57, 700); }
  g.restore(); }
// tarjeta de un alojamiento (datos de ejemplo inventados)
function stayCard(g, s, x, y, w, h, o = {}) { g.save(); g.globalAlpha *= o.a ?? 1; g.fillStyle = o.sel ? '#e7f1fb' : '#ffffff'; g.shadowColor = 'rgba(0,0,0,.16)'; g.shadowBlur = 14; g.shadowOffsetY = 4; rr(g, x, y, w, h, 22); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  if (o.sel) { g.strokeStyle = BK.cta; g.lineWidth = 7; rr(g, x, y, w, h, 22); g.stroke(); }
  const ph = h - 32; g.save(); rr(g, x + 16, y + 16, ph * 0.8, ph, 14); g.clip(); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(0.62, '#8fd3f0'); gr.addColorStop(0.63, s.col); gr.addColorStop(1, s.col); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x + 16 + ph * 0.58, y + 16 + ph * 0.28, ph * 0.11, 0, 7); g.fill(); g.fillStyle = '#fdfcf7'; g.fillRect(x + 16 + ph * 0.14, y + 16 + ph * 0.42, ph * 0.5, ph * 0.4); g.fillStyle = '#33414f'; g.fillRect(x + 16 + ph * 0.24, y + 16 + ph * 0.52, ph * 0.1, ph * 0.12); g.fillRect(x + 16 + ph * 0.44, y + 16 + ph * 0.52, ph * 0.1, ph * 0.12); g.restore();
  const tx = x + 16 + ph * 0.8 + 18, k = h / 200; scrText(g, s.name, tx, y + 50 * k, 29 * k, 900); g.fillStyle = BK.blue; rr(g, tx, y + 68 * k, 72 * k, 52 * k, 10); g.fill(); scrText(g, s.score, tx + 36 * k, y + 105 * k, 32 * k, 900, '#fff', 'center'); scrText(g, s.word, tx + 84 * k, y + 104 * k, 27 * k, 700, BK.ink);
  scrText(g, s.price + ' €', x + w - 20, y + h - 26 * k, 44 * k, 900, BK.ink, 'right'); scrText(g, '4 noches', tx, y + h - 28 * k, 24 * k, 500, BK.grey); g.restore(); }
function appHeader(g, w, title) { g.fillStyle = BK.blue; g.fillRect(0, 0, w, 128); scrText(g, 'Booking.com', 28, 84, 48, 900, '#ffffff'); if (title) scrText(g, title, 28, 196, 42, 900); }
// la votación: tres opciones → todos señalan la B (sel) → queda sola con el botón «Reservar» (ex) → se pulsa (press) → confirmada (ok)
function drawVote(g, w, h, o) { g.fillStyle = '#f2f3f5'; g.fillRect(0, 0, w, h); appHeader(g, w, null); const ex = sm5(clamp(o.ex)), ok = clamp(o.ok);
  g.save(); g.globalAlpha = 1 - ex; scrText(g, '¿Cuál reservamos?', 28, 200, 46, 900); g.restore();
  for (let i = 0; i < 3; i++) { const s = STAYS[i], y0 = 236 + i * 236, isB = i === 1; if (!isB && ex > 0.99) continue; stayCard(g, s, 20, isB ? lerp(y0, 190, ex) : y0, w - 40, 212, { sel: isB && o.sel > 0.5, a: isB ? 1 : 1 - ex }); }
  if (ex > 0.01) { g.save(); g.globalAlpha = ex; scrText(g, 'Total para 4 personas', 30, 480, 30, 500, BK.grey); scrText(g, '352 €', w - 30, 484, 50, 900, BK.ink, 'right'); scrText(g, '88 € por persona', w - 30, 536, 34, 700, '#1f8a4c', 'right'); g.fillStyle = '#d9dde3'; g.fillRect(30, 568, w - 60, 3);
    scrText(g, '✓ Cancelación gratis', 30, 632, 32, 700, '#1f8a4c'); scrText(g, '✓ A 200 m de la playa', 30, 684, 32, 700, '#1f8a4c');
    const p = clamp(o.press), bw = (w - 60) * (1 - 0.04 * p), bh = 132 * (1 - 0.04 * p), bx = w / 2 - bw / 2, by = 800 + (132 - bh) / 2; g.fillStyle = p > 0.5 ? '#00579a' : BK.cta; g.shadowColor = 'rgba(0,60,130,.45)'; g.shadowBlur = 22 * (1 - p); g.shadowOffsetY = 8 * (1 - p); rr(g, bx, by, bw, bh, 18); g.fill(); g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; scrText(g, 'Reservar', w / 2, 800 + 86, 62, 900, '#ffffff', 'center'); g.restore(); }
  if (ok > 0.01) { g.save(); g.globalAlpha = sm5(ok); g.fillStyle = '#ffffff'; g.fillRect(0, 128, w, h - 128); const s = 0.6 + 0.4 * pop(o.ok, 0, 1); g.translate(w / 2, 440); g.scale(s, s); g.fillStyle = '#1f9d55'; g.beginPath(); g.arc(0, 0, 118, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-52, 4); g.lineTo(-14, 44); g.lineTo(56, -36); g.stroke(); g.setTransform(1, 0, 0, 1, 0, 0);
    scrText(g, '¡Reserva', w / 2, 680, 76, 900, BK.ink, 'center'); scrText(g, 'confirmada!', w / 2, 766, 76, 900, BK.ink, 'center'); scrText(g, 'Piso Brisa del Mar · 4 noches', w / 2, 846, 32, 500, BK.grey, 'center'); g.restore(); } }
// punto del mundo de un píxel (u, v) de la pantalla del móvil protagonista cuando está tumbado en la mesa
function scrPt(ph, u, v, lift = 0.004) { const s = ph.scale.x; return ph.localToWorld(v3((u / 540 - 0.5) * (PH.w - 0.007), (0.5 - v / 1160) * (PH.h - 0.008), 0.0049 + lift / s)); }
