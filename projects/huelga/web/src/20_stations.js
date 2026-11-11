// ---------------------------------------------------------------- piezas de los objetos gigantes (casa, etiqueta, monedas, prohibido, calendario, urna, billetes, escudo, nómina)
function canvasPlane(w, h, px, draw, opts = {}) {
  const t = canvasTex(px, Math.round(px * h / w), draw); const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: opts.r ?? 0.85, transparent: !!opts.tr, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), opts.cs ?? false);
  m.userData.tex = t; return m;
}
// ---------- piezas
function house(s = 1, wall = 0xf1ede6, roof = 0xb8412f) {
  const g = new THREE.Group(), w = 0.34, d = 0.28, h = 0.24;
  g.add(at(rbox(w, h, d, plastic(wall, 0.35), 0.02), 0, h / 2, 0, 0, Math.PI / 2 * 0));
  g.children[0].rotation.x = 0; g.children[0].scale.set(1, 1, 1);
  const gab = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2 - 0.03, 0), new THREE.Vector2(w / 2 + 0.03, 0), new THREE.Vector2(0, 0.17)]), { depth: d + 0.06, bevelEnabled: false });
  gab.translate(0, h, -(d + 0.06) / 2); g.add(mesh(gab, plastic(roof, 0.3)));
  const door = mesh(new THREE.BoxGeometry(0.07, 0.12, 0.01), plastic(0x5a3420, 0.4)); door.position.set(0, 0.06, d / 2 + 0.005); g.add(door);
  for (const x of [-0.1, 0.1]) { const wdw = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), glowM(0xffd9a0, 0.8)); wdw.position.set(x, 0.15, d / 2 + 0.005); g.add(wdw); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.scale.setScalar(s); return g;
}
function tag(txt, col = '#ffc24a', s = 1) {      // etiqueta de precio con agujero y cordel
  const g = new THREE.Group(); const sh = new THREE.Shape(); const w = 0.32, h = 0.16;
  sh.moveTo(-w / 2 + 0.05, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2 + 0.05, h / 2); sh.lineTo(-w / 2, 0); sh.closePath();
  const hole = new THREE.Path(); hole.absarc(-w / 2 + 0.05, 0, 0.015, 0, Math.PI * 2, true); sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }); g.add(mesh(geo, plastic(0xf4efe4, 0.4)));
  const f = plateText(0.25, 0.12, [[txt, 0.5, 0.52]], { fg: col === '#ffc24a' ? '#1b1e24' : col, weight: 900 }); f.position.set(0.025, 0, 0.017); g.add(f);
  g.scale.setScalar(s); return g;
}
function coinStack(n, r = 0.05) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const c = coin(r); c.position.set((hash(i) - 0.5) * 0.006, r * 0.22 * (i + 0.5), (hash(i * 3) - 0.5) * 0.006); c.rotation.y = i; g.add(c); } return g; }
function noSign(s = 1) { const g = new THREE.Group(), m = glowM(0xff3b30, 2.2); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 40), m)); const b = mesh(new THREE.BoxGeometry(0.19, 0.026, 0.026), m); b.rotation.z = -Math.PI / 4; g.add(b); g.scale.setScalar(s); return g; }
function banner(txt, h = 0.62) { const g = new THREE.Group(); g.add(at(cyl(0.008, 0.008, h, M.woodL, 8), 0, h / 2, 0));
  const cloth = plateText(0.36, 0.13, [[txt, 0.42, 0.52]], { fg: '#16181d', bg: '#f2efe8', weight: 900 }); cloth.material.side = THREE.DoubleSide; cloth.position.set(0.19, h - 0.08, 0); g.add(cloth); g.userData.cloth = cloth; return g; }
function calendarNov() {
  const g = new THREE.Group(); g.add(at(rbox(0.86, 0.78, 0.03, plastic(0xf6f4ef, 0.4), 0.03), 0, 0, 0));
  const t = canvasPlane(0.82, 0.74, 768, (c, w, h) => { c.fillStyle = '#f6f4ef'; c.fillRect(0, 0, w, h); c.fillStyle = '#c42a2a'; c.fillRect(0, 0, w, 96); c.fillStyle = '#fff'; c.font = '900 56px Inter'; c.textAlign = 'center'; c.fillText('NOVIEMBRE 2026', w / 2, 68);
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'], cw = w / 7, top = 150; c.fillStyle = '#555'; c.font = '700 30px Inter'; days.forEach((d, i) => c.fillText(d, cw * (i + 0.5), top - 20));
    for (let n = 1; n <= 30; n++) { const idx = n + 5, col = idx % 7, row = Math.floor(idx / 7), x = cw * (col + 0.5), y = top + 20 + row * 92;
      const mark = { 11: '#d6262e', 13: '#d99a1a', 29: '#1b2a4a' }[n]; if (mark) { c.fillStyle = mark; c.beginPath(); c.arc(x, y + 22, 38, 0, 7); c.fill(); c.fillStyle = '#fff'; } else c.fillStyle = col === 6 ? '#b3222b' : '#222';
      c.font = '800 42px Inter'; c.fillText(String(n), x, y + 36); } }, { r: 0.6 }); t.position.z = 0.017; g.add(t);
  return g;
}
function ballotBox(s = 1) { const g = new THREE.Group(); g.add(at(rbox(0.3, 0.3, 0.22, M.dish, 0.012), 0, 0.15, 0, 0, 0, 0)); g.children[0].rotation.x = 0;
  const lid = mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), plastic(0x1b2a4a, 0.3)); lid.position.y = 0.31; g.add(lid);
  const slot = mesh(new THREE.BoxGeometry(0.14, 0.022, 0.02), M.black); slot.position.y = 0.315; g.add(slot);
  const env = mesh(new THREE.BoxGeometry(0.12, 0.004, 0.16), plastic(0xf2f0ea, 0.5)); env.rotation.x = Math.PI / 2; g.add(env); g.userData.env = env;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; }
function billStack(n, s = 1) { const g = new THREE.Group(), mt = new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#7fb8a0'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(20,60,50,.6)'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = 'rgba(20,60,50,.85)'; c.font = '900 60px Inter'; c.textAlign = 'center'; c.fillText('€', w / 2, h / 2 + 20); }), roughness: 0.7 });
  for (let i = 0; i < n; i++) { const b = mesh(new THREE.BoxGeometry(0.24, 0.012, 0.12), mt); b.position.set((hash(i) - 0.5) * 0.01, 0.006 + i * 0.012, (hash(i * 2) - 0.5) * 0.01); b.rotation.y = (hash(i * 5) - 0.5) * 0.08; g.add(b); }
  g.scale.setScalar(s); return g; }
function shield(s = 1) { const sh = new THREE.Shape(); sh.moveTo(0, 0.2); sh.quadraticCurveTo(0.12, 0.2, 0.17, 0.16); sh.lineTo(0.15, -0.02); sh.quadraticCurveTo(0.1, -0.15, 0, -0.22); sh.quadraticCurveTo(-0.1, -0.15, -0.15, -0.02); sh.lineTo(-0.17, 0.16); sh.quadraticCurveTo(-0.12, 0.2, 0, 0.2);
  const g = new THREE.Group(); g.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }), M.gold));
  const f = plateText(0.22, 0.12, [['ART. 28', 0.55, 0.5]], { fg: '#1b1e24', weight: 900 }); f.position.set(0, 0.02, 0.052); g.add(f); g.scale.setScalar(s); return g; }
function payslip() { return canvasPlane(0.46, 0.62, 512, (c, w, h) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a4a'; c.font = '900 40px Inter'; c.textAlign = 'center'; c.fillText('NÓMINA', w / 2, 56); c.font = '600 22px Inter'; c.fillText('NOVIEMBRE 2026 · EJEMPLO', w / 2, 88);
    c.textAlign = 'left'; c.font = '600 22px Inter'; for (let i = 0; i < 8; i++) { const y = 140 + i * 54; c.fillStyle = '#333'; c.fillText(['Salario base', 'Complementos', 'Pagas extra (parte)', 'Descanso semanal', 'Día 11 · huelga', 'Cotización', 'IRPF', 'Líquido'][i], 28, y);
      c.textAlign = 'right'; c.fillText(i === 4 ? '0,00 €' : '···', w - 28, y); c.textAlign = 'left'; c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(24, y + 14, w - 48, 2); } }, { r: 0.7 }); }
// ---------- la plaza: los objetos gigantes de cada frase (aparecen en el centro y se van transformando), el reloj de la fachada, el autobús de servicios
// mínimos y el cruce del final; en la avenida, «tú» con el contrato y la interrogación (frase 2) y la pantalla gigante con el contador 2012 → 2026 (frase 3)
const PS = {};
function giant(o, s) { o.scale.setScalar(s); o.userData.s0 = s; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(o); return o; }
function busModel() {
  const g = new THREE.Group(), L = 1.2, Wd = 0.25, Hh = 0.3, y0 = 0.05;
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, Hh, Wd), flatM(0xd6262e, 0.45)); body.position.y = y0 + Hh / 2; g.add(body);
  const win = new THREE.Mesh(new THREE.BoxGeometry(L * 0.94, 0.1, Wd + 0.006), new THREE.MeshStandardMaterial({ color: 0x1d2a38, roughness: 0.15, metalness: 0.4 })); win.position.y = y0 + Hh * 0.7; g.add(win);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(L + 0.004, 0.022, Wd + 0.006), flatM(0xffffff)); stripe.position.y = y0 + Hh * 0.36; g.add(stripe);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.03, Wd * 0.8), flatM(0xeeeeee)); roof.position.y = y0 + Hh + 0.015; g.add(roof);
  for (const x of [-0.38, 0.38]) for (const z of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.032, 14), flatM(0x1a1a1a)); w.rotation.x = Math.PI / 2; w.position.set(x, y0, z * Wd / 2); g.add(w); }
  const sg = (w, h) => canvasPlane(w, h, 1024, (c, W2, H2) => { c.fillStyle = '#0d0f12'; c.fillRect(0, 0, W2, H2); c.fillStyle = '#ffb300'; c.font = `900 ${Math.round(H2 * 0.62)}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SERVICIOS MÍNIMOS', W2 / 2, H2 / 2 + 3); });
  const f = sg(0.22, 0.045); f.rotation.y = Math.PI / 2; f.position.set(L / 2 + 0.003, y0 + Hh * 0.9, 0); g.add(f);
  for (const sd of [-1, 1]) { const s2 = sg(0.86, 0.075); s2.position.set(0, y0 + Hh * 0.92 - 0.02, sd * (Wd / 2 + 0.004)); if (sd < 0) s2.rotation.y = Math.PI; g.add(s2); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.userData.signs = g.children.filter(c => c.userData.tex); return g;
}
function signPost(txt, bg, fg, w) { const g = new THREE.Group(); const p = cyl(0.004, 0.004, 0.3, flatM(0x9a7a50), 6); p.position.y = 0.15; g.add(p);
  const s = plateText(w, 0.075, [[txt, 0.62, 0.52]], { fg, bg, weight: 900 }); s.material.side = THREE.DoubleSide; s.position.y = 0.27; g.add(s); return g; }
function buildPlazaSet() {
  const X = PLZ.x, Z = PLZ.z;
  // frase 4 · lo que piden: la pila del sueldo sube, el alquiler baja, ningún desahucio sin alternativa
  PS.coins = giant(coinStack(24, 0.06), 3.4); PS.coins.position.set(X - 1.05, 0.012, Z + 0.15);
  PS.house = giant(house(1.0), 3.6); PS.house.position.set(X + 0.1, 0.012, Z - 0.85); PS.house.rotation.y = 0.15;
  PS.rent = giant(tag('ALQUILER', '#2b7a3d', 1.0), 3.0); PS.rent.position.set(X + 0.75, 1.15, Z - 0.35); PS.rent.rotation.y = -0.25;
  PS.arrow = giant(arrow3(0.3, glowM(0x34d27a, 1.2), 0.02), 3.0); PS.arrow.rotation.z = Math.PI; PS.arrow.position.set(X + 1.42, 1.75, Z - 0.35);
  PS.box = giant(cardboardBox(), 4.5); PS.box.position.set(X + 1.25, 0.012, Z + 0.6); PS.box.rotation.y = -0.4;
  PS.no = giant(noSign(1), 3.4); PS.no.position.set(X + 1.25, 1.0, Z + 0.75);
  // frase 5 · la balanza: el sueldo (monedas) pesa menos que el alquiler (casa)
  PS.sc = giant(scales(1), 2.2); PS.sc.position.set(X, 0.012, Z - 0.2); { const pans = PS.sc.userData.pans; const c = coinStack(8, 0.05); c.position.y = -0.415; pans[0].add(c); const h = house(0.8); h.position.y = -0.415; pans[1].add(h); PS.sc.traverse(m => { if (m.isMesh) m.castShadow = true; }); }
  // frase 6 · lo que costaría: dos torres de billetes (1.850 y 4.560 millones)
  PS.lo = giant(billStack(26, 1), 3.4); PS.lo.position.set(X - 0.6, 0.012, Z + 0.1); PS.hi = giant(billStack(64, 1), 3.4); PS.hi.position.set(X + 0.6, 0.012, Z - 0.15);
  PS.loL = plateText(0.36, 0.1, [['1.850 M€', 0.7, 0.52]], { fg: '#1b1e24', bg: '#ffffff', weight: 900 }); PS.loL.scale.setScalar(2.4); scene.add(PS.loL);
  PS.hiL = plateText(0.36, 0.1, [['4.560 M€', 0.7, 0.52]], { fg: '#ffffff', bg: '#d6262e', weight: 900 }); PS.hiL.scale.setScalar(2.4); scene.add(PS.hiL);
  // frase 7 · la patronal: «electoral»; el calendario de noviembre (11 huelga · 13 campaña · 29 elecciones) y la urna
  PS.cal = giant(calendarNov(), 2.3); PS.cal.position.set(X - 0.25, 1.2, Z - 0.6);
  PS.calLegs = new THREE.Group(); for (const sd of [-1, 1]) { const l = cyl(0.02, 0.02, 1.25, flatM(0x2b3038, 0.5), 8); l.position.set(sd * 0.8, 0.62, 0); PS.calLegs.add(l); } PS.calLegs.position.set(X - 0.25, 0.012, Z - 0.66); scene.add(PS.calLegs);
  PS.urn = giant(ballotBox(1), 3.0); PS.urn.position.set(X + 1.2, 0.012, Z + 0.5); PS.urn.rotation.y = -0.4;
  PS.quote = plateText(0.7, 0.18, [['«ELECTORAL»', 0.62, 0.52]], { fg: '#ff3b30', bg: '#ffffff', weight: 900 }); PS.quote.material.side = THREE.DoubleSide; PS.quote.scale.setScalar(2.2); scene.add(PS.quote);
  // frase 9 · tus derechos: la Constitución (art. 28.2) en un atril, el escudo y la nómina con el día de huelga a cero
  PS.book = giant(openBook(0.62, 0.42, 0x7a1a1a, (g, w, h) => { const hw = w / 2; g.fillStyle = '#2b2218'; g.textAlign = 'left';
    g.font = '900 46px Inter'; g.fillText('CONSTITUCIÓN', 40, 90); g.font = '700 34px Inter'; g.fillText('ESPAÑOLA', 40, 136); textLines(g, 40, 180, hw - 80, 14, 32, 'rgba(40,36,30,.45)', 3);
    g.font = '900 44px Inter'; g.fillText('Artículo 28.2', hw + 40, 90); g.font = '500 33px Inter';
    ['Se reconoce el derecho', 'a la huelga de los', 'trabajadores para la', 'defensa de sus intereses.'].forEach((l, i) => g.fillText(l, hw + 40, 150 + i * 46)); textLines(g, hw + 40, 360, hw - 80, 7, 32, 'rgba(40,36,30,.35)', 5); }), 1.75);
  PS.book.position.set(X - 0.1, 0.5, Z - 0.1); PS.book.rotation.x = 0.75;
  PS.lect = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.46, 0.4), flatM(0x6b4426, 0.7)); PS.lect.position.set(X - 0.1, 0.23, Z - 0.22); PS.lect.castShadow = true; scene.add(PS.lect);
  PS.sh = giant(shield(1), 3.4); PS.sh.position.set(X + 1.25, 1.35, Z - 0.55);
  PS.pay = giant(payslip(), 2.4); PS.pay.position.set(X + 1.05, 0.78, Z + 0.55); PS.pay.rotation.set(-0.15, -0.35, 0.04);
  PS.cross = drawLine([v3(-0.2, -0.0, 0.003), v3(0.2, -0.0, 0.003)], 0xff1f1f, 6, 1); PS.pay.add(PS.cross);
  // frase 8 · el reloj de la fachada (medianoche) y el autobús
  PS.clock = wallClock(4.2); PS.clock.position.set(0, 2.2, AV.PZ1 + 0.075); scene.add(PS.clock);
  PS.bus = busModel(); PS.bus.rotation.y = Math.PI; scene.add(PS.bus);
  // frase 10 · el cruce: «tú» y dos caminos
  PS.fork = new THREE.Group(); PS.fork.position.set(X, 0.012, Z + 1.7); scene.add(PS.fork);
  PS.hero2 = figurine(M.ceramic, 1.1); PS.fork.add(PS.hero2);
  PS.signL = signPost('LA HAGO', '#d6262e', '#ffffff', 0.26); PS.signL.position.set(-0.2, 0, -0.32); PS.signL.rotation.y = 0.35; PS.fork.add(PS.signL);
  PS.signR = signPost('VOY A TRABAJAR', '#ffc24a', '#111111', 0.3); PS.signR.position.set(0.2, 0, -0.32); PS.signR.rotation.y = -0.35; PS.fork.add(PS.signR);
  PS.paths = [drawLine([v3(0, 0.004, 0.02), v3(-0.08, 0.004, -0.25), v3(-0.5, 0.004, -0.9)], 0xff3b30, 6, 1), drawLine([v3(0, 0.004, 0.02), v3(0.08, 0.004, -0.25), v3(0.5, 0.004, -0.9)], 0xffc24a, 6, 1)]; PS.paths.forEach(l => PS.fork.add(l));
  // frase 2 · «tú» en la acera con el contrato y la interrogación
  PS.hero1 = new THREE.Group(); PS.hero1.position.set(1.2, 0.02, -10.0); PS.hero1.rotation.y = 0.1; scene.add(PS.hero1);
  { const f = figurine(M.ceramic, 1.1); PS.hero1.add(f); PS.hero1.userData.J = f.userData.J;
    PS.contract = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.1), new THREE.MeshStandardMaterial({ map: paperTex((g, w, h) => { g.fillStyle = '#1b2a4a'; g.font = '900 44px Inter'; g.textAlign = 'center'; g.fillText('CONTRATO', w / 2, 76); textLines(g, 40, 120, w - 80, 20, 26, 'rgba(40,36,30,.5)', 2); g.font = '600 28px Inter'; g.fillStyle = '#555'; g.fillText('EJEMPLO', w / 2, h - 36); }), roughness: 0.85, side: THREE.DoubleSide }));
    PS.contract.position.set(0, 0.105, 0.05); PS.contract.rotation.x = -0.5; PS.hero1.add(PS.contract);
    PS.qm = qmark(plastic(0xff2d2d, 0.25)); PS.qm.scale.setScalar(0.2); PS.qm.position.set(0, 0.265, 0); PS.qm.userData.s0 = 0.2; PS.hero1.add(PS.qm); }
  // frase 3 · la pantalla gigante de la fachada
  { const b = S.screenB; PS.screen = new THREE.Group(); const fr = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.64, 0.05), flatM(0x15171b, 0.4)); PS.screen.add(fr);
    PS.scrT = canvasTex(1024, 584, () => {}); const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.57), new THREE.MeshBasicMaterial({ map: PS.scrT })); sc.position.z = 0.027; PS.screen.add(sc);
    PS.screen.position.set(0, GH + 3.6 * FH, 0.06); b.g.add(PS.screen); PS.scrLast = ''; }
}
function drawScreen(mode, year) {
  const T = PS.scrT, g = T.userData.g, w = T.userData.c.width, h = T.userData.c.height; g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (mode === 0) { g.fillStyle = '#d6262e'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 150px Inter'; g.fillText('HUELGA', w / 2, h * 0.36); g.font = '900 104px Inter'; g.fillText('GENERAL · 11-N', w / 2, h * 0.68); }
  else { g.fillStyle = '#9AA1AB'; g.font = '800 54px Inter'; g.fillText('HUELGA GENERAL DE CCOO Y UGT', w / 2, 80); g.fillStyle = year >= 2026 ? '#ff4136' : '#ffffff'; g.font = '900 250px Inter'; g.fillText(String(year), w / 2, 300);
    g.fillStyle = '#ffc24a'; g.font = '900 74px Inter'; g.fillText(year >= 2026 ? '14 AÑOS DESPUÉS' : year === 2012 ? 'LA ANTERIOR: 14-N' : '· · ·', w / 2, 492); }
  for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, w, 1); } T.needsUpdate = true;
}
const gone = (t, t1) => 1 - win(t, t1, 0.25);
function plazaAt(t) {
  // frase 2: «tú» con el contrato y la interrogación
  { const on = t > K.si2 - 0.8 && t < K.primera3 + 1.0; PS.hero1.visible = on; show(PS.qm, pop(t, K.despedir2 - 0.25, 0.4)); PS.qm.rotation.y = 0.45 * Math.sin(t * 2.2); const J = PS.hero1.userData.J; if (J) { J.neck.rotation.x = -0.25 - 0.1 * win(t, K.despedir2, 0.3); J.shL.rotation.x = -0.7; J.shR.rotation.x = -0.7; J.elL.rotation.x = -0.6; J.elR.rotation.x = -0.6; } }
  // frase 3: la pantalla
  { const mode = t < K.primera3 - 0.15 || t > K.piden4 + 1 ? 0 : 1, y = Math.round(lerp(2012, 2026, eio(clamp((t - K.catorce3 + 0.3) / 0.75)))), key = mode + '_' + y; if (key !== PS.scrLast) { drawScreen(mode, y); PS.scrLast = key; } }
  // frase 4
  { const out = gone(t, K.vivienda5 - 0.15), ck = pop(t, K.subir4 - 0.15, 0.4) * out; show(PS.coins, ck); const n = Math.round(lerp(17, 24, eo(clamp((t - K.n7 + 0.1) / 0.5)))); PS.coins.children.forEach((c, i) => c.visible = i < n);
    const hk = pop(t, K.bajar4 - 0.2, 0.45) * out; show(PS.house, hk); show(PS.rent, hk); show(PS.arrow, hk); if (PS.arrow.visible) { PS.arrow.userData.setLen(0.1 + 0.2 * eo(clamp((t - K.alquileres4) / 0.5))); PS.arrow.position.y = 1.75 - 0.25 * eo(clamp((t - K.alquileres4) / 0.6)); }
    PS.rent.rotation.z = 0.12 * Math.sin(t * 2.4); show(PS.box, pop(t, K.desahucio4 - 0.2, 0.4) * out); show(PS.no, pop(t, K.alternativa4 - 0.15, 0.35) * out); PS.no.rotation.y = 0.3 * Math.sin(t * 2); }
  // frase 5
  { const k = pop(t, K.vivienda5 - 0.05, 0.45) * gone(t, K.asociacion6 - 0.15); show(PS.sc, k); scalesTilt(PS.sc, -0.3 * eio(clamp((t - K.llega5 + 0.1) / 0.6)) + 0.03 * Math.sin(t * 2) * win(t, K.llega5 + 0.6, 0.3)); }
  // frase 6
  { const out = gone(t, K.y7 - 0.1), lk = clamp((t - K.asociacion6 + 0.1) / (K.n1850 - K.asociacion6 + 0.4)), hk = clamp((t - K.n1850) / (K.n4560 - K.n1850 + 0.7)) * 0.55 + 0.45 * clamp((t - K.n4560 + 0.1) / 0.6); const on = t > K.asociacion6 - 0.3 && out > 0.01;
    PS.lo.visible = PS.hi.visible = on; if (on) { PS.lo.scale.setScalar(3.4 * out); PS.hi.scale.setScalar(3.4 * out); PS.lo.children.forEach((b, i) => b.visible = i < Math.max(2, Math.round(26 * eo(lk)))); PS.hi.children.forEach((b, i) => b.visible = i < Math.max(2, Math.round(64 * eo(hk)))); }
    PS.loL.visible = on && lk > 0.3; PS.hiL.visible = on && hk > 0.3; PS.loL.position.set(PLZ.x - 0.6, 0.06 + 26 * 0.012 * 3.4 * eo(lk) + 0.2, PLZ.z + 0.1); PS.hiL.position.set(PLZ.x + 0.6, 0.06 + 64 * 0.012 * 3.4 * eo(hk) + 0.2, PLZ.z - 0.15);
    PS.loL.quaternion.copy(cam.quaternion); PS.hiL.quaternion.copy(cam.quaternion); PS.loL.scale.setScalar(2.4 * out); PS.hiL.scale.setScalar(2.4 * out); }
  // frase 7
  { const out = gone(t, K.hoy8 - 0.1); const qk = pop(t, K.electoral7 - 0.15, 0.4) * out * gone(t, K.dos7 - 0.25); PS.quote.visible = qk > 0.01; PS.quote.scale.setScalar(Math.max(0.0001, 1.45 * qk)); PS.quote.position.set(PLZ.x - 0.95, 0.75 + 0.03 * Math.sin(t * 2), PLZ.z + 0.75); PS.quote.quaternion.copy(cam.quaternion);
    const ck = pop(t, K.dos7 - 0.3, 0.45) * out; show(PS.cal, ck * 2.3 / 2.3); PS.calLegs.visible = ck > 0.5; show(PS.urn, pop(t, K.generales7 - 0.2, 0.4) * out);
    const e = PS.urn.userData.env, ek = clamp((t - K.noviembre7) / 0.5); e.position.set(0, 0.5 - 0.3 * eio(ek), 0); e.visible = t > K.generales7 && ek < 1; }
  // frase 8: el reloj marca las 00:00 y pasa el autobús de servicios mínimos
  { setClock(PS.clock, t < K.medianoche8 - 0.5 ? 10.17 : lerp(23.6, 24.0, eio(clamp((t - K.medianoche8 + 0.4) / 0.7))));
    const bk = clamp((t - K.minimos8 + 0.9) / 3.2); PS.bus.visible = t > K.minimos8 - 0.9 && t < K.y9 + 0.5; PS.bus.position.set(lerp(6.0, -7.0, bk), 0.012, -26.35); }
  // frase 9
  { const out = gone(t, K.tu10 - 0.2); show(PS.sh, pop(t, K.despedir9 - 0.1, 0.4) * out); PS.sh.rotation.y = -0.35 + 0.15 * Math.sin(t * 1.5);
    const bk = pop(t, K.fundamental9 - 0.35, 0.45) * out; show(PS.book, bk); PS.lect.visible = bk > 0.3; show(PS.pay, pop(t, K.pero9 - 0.2, 0.4) * out); drawK(PS.cross, clamp((t - K.cobras9 + 0.05) / 0.3)); }
  // frase 10
  { const k = pop(t, K.tu10 - 0.35, 0.45) * (1 - win(t, END - 1.0, 0.3)); show(PS.fork, k); const J = PS.hero2.userData.J; if (J) { J.neck.rotation.y = 0.6 * Math.sin(t * 1.6); J.shL.rotation.z = -0.5 * win(t, K.haces10, 0.3); J.shR.rotation.z = 0.5 * win(t, K.trabajar10, 0.3); }
    drawK(PS.paths[0], clamp((t - K.haces10) / 0.4)); drawK(PS.paths[1], clamp((t - K.trabajar10) / 0.4)); }
}
