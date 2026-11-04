// ---------------------------------------------------------------- tiempos y animación (todo depende de K: las palabras de la voz)
const sinL = (t, f, ph = 0) => Math.sin(2 * Math.PI * Math.max(1, Math.round(f * END / (2 * Math.PI))) * t / END + ph);   // periódico en END (bucle)
const cwin = (t, t0, t1, fi = 0.25, fo = 0.25) => win(t, t0, fi) * (1 - win(t, t1, fo));
let TT = {};
function buildTimes() {
  TT = {
    dig0: K.tunel1 - 0.05, dig1: K.debajo1 + 0.15,              // la línea del túnel: de la casa a la cámara
    drill0: K.perforan7, drill1: K.capa7 + 0.1,                // perforan hasta dejar la capa fina
    brk: K.rompen8 + 0.25,                                     // se rompe la última capa
    flow0: K.sacan11 - 0.1, flow1: K.reales11 + 0.7,           // los billetes salen por el túnel
    rw: END - 0.85,                                            // vuelta al principio (bucle)
  };
}

function xDigAt(t) {     // hasta dónde se ve el túnel por dentro: terminado en el gancho (y al final, para el bucle); se construye en la frase 5
  if (t < K.fortaleza2 + 0.4) return TX1 + 0.4;
  if (t < K.avanza5 - 0.5) return TX0 - 1;
  return lerp(TX0 - 0.2, TX1 + 0.4, eio(clamp((t - K.avanza5 + 0.5) / (K.ventilacion5 - K.avanza5 + 0.9))));
}
const lightsOn = t => (t < K.fortaleza2 + 0.4 ? 1 : 0) + (t > K.luz5 - 0.1 ? win(t, K.luz5 - 0.1, 0.25) : 0);
// camino de los bloques de billetes: palé → agujero → túnel → pozo de la casa
function flowPath(u, i, out) {
  const P = PALS[i % 4], top = v3(P[0], SLB1 + 0.3 + BLK.ny * BLK.h, P[1]);
  const pts = [top, v3(HX, SLB1 + 0.55, CZ - 0.22), v3(HX, TY - 0.15, CZ - 0.22), v3(TX0 + 0.2, TY - 0.15, CZ - 0.22), v3(TX0, -0.2, CZ - 0.22)];
  const L = []; let tot = 0; for (let k = 1; k < pts.length; k++) { const d = pts[k].distanceTo(pts[k - 1]); L.push(d); tot += d; }
  let s = u * tot; for (let k = 0; k < L.length; k++) { if (s <= L[k] || k === L.length - 1) return out.copy(pts[k]).lerp(pts[k + 1], clamp(s / L[k])); s -= L[k]; }
  return out.copy(pts[pts.length - 1]);
}
function stageAt2(t) {
  const rw = win(t, TT.rw, 0.7);
  // la línea del túnel (gancho)
  { const k = eio(clamp((t - TT.dig0) / (TT.dig1 - TT.dig0))) * (1 - win(t, K.fortaleza2 + 0.2, 0.5)); drawK(S.digLine, k); S.digLine.material.opacity = 1; }
  // farolas: un parpadeo lento
  S.lamps.forEach((L, i) => { L.intensity = 20 + 2 * sinL(t, 1.3, i); });
  // la casa: el cartel resalta; los rollos de césped botan en «césped artificial»
  S.rolls.forEach((r, i) => { const b = pop(t, K.cesped3 + i * 0.05, 0.4), s = t > K.cesped3 && t < K.cesped3 + 0.6 ? 1 + 0.12 * Math.sin(clamp((t - K.cesped3 - i * 0.05) / 0.4) * Math.PI) : 1; r.scale.set(s, 1, s); void b; });
  // la camioneta con tierra: aparece aparcada y se va por la avenida en «sale tierra»
  { const tk = S.truck, t0 = K.alquilan3 - 0.2, td = K.sale4 - 0.25, vis = t > t0 && t < td + 3; tk.visible = vis;
    if (vis) { const u = clamp((t - td) / 2.6), z = -2.6 - 12 * u * u; tk.position.set(3.1, 0.12, z); tk.rotation.y = 0; tk.scale.setScalar(Math.max(0.001, pop(t, t0, 0.4) * (1 - clamp((-z - 7.5) / 1.5)))); S.dirt.visible = true; } }
  // banco: ventanas y «CERRADO»
  { const closed = cwin(t, K.cerrado8 - 0.1, K.lunes12, 0.3, 0.3); S.bankWin.forEach(w => (w.material.emissiveIntensity = 0.9 * (1 - 0.85 * closed)));
    S.closed.visible = closed > 0.01; S.closed.scale.setScalar(Math.max(0.001, pop(t, K.cerrado8 - 0.1, 0.4) * (1 - win(t, K.lunes12, 0.3)))); }
  // la cámara: luz al principio (gancho), luego a oscuras hasta que entran
  S.vaultL.intensity = 26 * cwin(t, K.camara1 - 0.1, K.fortaleza2 + 0.4, 0.35, 0.5) + 10 * cwin(t, K.entran8, K.abren12, 0.4, 0.3) + 4 * cwin(t, K.abren12, TT.rw, 0.3, 0.5);
  // el túnel por dentro
  { const xd = xDigAt(t);
    S.frames.forEach(f => { const k = clamp((xd - f.userData.x) / 0.8); f.visible = k > 0.01; f.scale.set(1, Math.max(0.001, eo(k)), 1); });
    const lightOn = clamp(lightsOn(t));
    S.bulbs.forEach(b => { b.visible = xd > b.userData.x && (b.geometry.type !== 'SphereGeometry' || lightOn > 0.02); if (b.material.emissiveIntensity !== undefined && b.geometry.type === 'SphereGeometry') b.material.emissiveIntensity = 4 * lightOn; });
    const dk = (t < K.ventilacion5 - 0.15 && t > K.fortaleza2 + 0.4) ? 0 : clamp((xd - TX0) / (TX1 - TX0)), dl = Math.max(0.001, (TX1 - TX0) * dk);
    S.duct.visible = dk > 0.003; S.duct.scale.set(1, dl, 1); S.duct.position.x = TX0 + dl / 2;
    S.tFloor.visible = xd > TX0; S.tFloor.scale.x = Math.max(0.001, clamp((xd - TX0) / (TX1 - TX0)));
    S.tFloor.position.x = TX0 + (TX1 - TX0 + 0.4) * S.tFloor.scale.x / 2 - 0.2; }
  // perforación: el tapón sube hasta dejar una capa fina; el viernes la rompen
  { const yFin = SLB1 - 0.07, ycut = lerp(SLB0, yFin, eio(clamp((t - TT.drill0) / (TT.drill1 - TT.drill0)))), gone = t > TT.brk;
    if (!gone) { S.plug.visible = true; S.plug.position.y = ycut; S.plug.scale.y = Math.max(0.001, SLB1 - ycut); const fr = (SLB1 - ycut) / (SLB1 - SLB0); S.plugTex.repeat.set(1, fr); S.plugTex.offset.set(0, 1 - fr); }
    else if (rw > 0.001) { const hgt = (SLB1 - SLB0) * rw; S.plug.visible = true; S.plug.position.y = SLB1 - hgt; S.plug.scale.y = Math.max(0.001, hgt); }
    else S.plug.visible = false;
    const drilling = t > TT.drill0 - 0.1 && t < TT.drill1 + 0.25;
    S.disc.visible = drilling; S.disc.position.y = ycut - 0.04; S.disc.rotation.y = t * 40;
    const thin = cwin(t, K.capa7 - 0.1, TT.brk, 0.2, 0.05), pulse = 0.55 + 0.45 * Math.sin(t * 7);
    S.layerGlow.visible = (drilling || thin > 0.01) && !gone; S.layerGlow.position.set(HX, ycut + 0.005, CZ + 0.003); S.layerGlow.material.opacity = drilling ? 0.9 : thin * pulse;
    S.sp.visible = drilling && t > TT.drill0; if (S.sp.visible) burst(S.sp, v3(HX, ycut - 0.05, CZ - 0.15), t, TT.drill0, 0.35, 0.45, true, 2.4);
    // los trozos de la capa
    S.frags.forEach((f, i) => { const u = t - TT.brk; f.visible = u > 0 && u < 1.4 && rw < 0.01; if (!f.visible) return; const g = 6;
      f.position.copy(f.userData.p).addScaledVector(f.userData.v, u); f.position.y -= 0.5 * g * u * u; if (f.position.y < TY - TH / 2 + 0.05) f.position.y = TY - TH / 2 + 0.05; f.rotation.set(u * 4 + i, u * 3, u * 2); });
    const up = cwin(t, TT.brk, K.abren12 + 0.3, 0.15, 0.4) * (1 - rw); S.upLight.intensity = 22 * up; S.cone.visible = up > 0.01; S.cone.material.uniforms.op.value = 0.13 * up; }
  // cámaras y sensores: parpadean y se apagan (no funcionaban)
  S.sec.forEach((g, i) => { const tOff = i < 2 ? K.camaras9 : K.sensores9, fl = t > tOff - 0.05 && t < tOff + 0.35 ? (Math.sin((t - tOff) * 60) > 0 ? 1 : 0) : (t < tOff ? 1 : 0);
    g.userData.led.material.emissiveIntensity = 3 * (rw > 0.5 ? 1 : fl); });
  // los billetes: palés llenos → se vacían de arriba abajo mientras salen por el túnel
  { const f = clamp((t - TT.flow0) / (TT.flow1 - TT.flow0)) * (1 - rw);
    S.pals.forEach(P => { const hide = Math.floor(P.n * f); for (let j = 0; j < P.n; j++) { const v = j >= hide; _m4.compose(P.home[j], _q.identity(), _s.setScalar(v ? 1 : 0.0001)); P.im.setMatrixAt(j, _m4); } P.im.instanceMatrix.needsUpdate = true; });
    const N = 190, on = cwin(t, TT.flow0, TT.flow1, 0.2, 0.4) * (1 - rw), per = 2.1; let n = 0;
    if (on > 0.01) for (let i = 0; i < N; i++) { const ph = i / N, u = ((t - TT.flow0) / per + ph) % 1; if (t - TT.flow0 < ph * per) continue;
      flowPath(u, i, _p); _e.set(u * 6 + i, u * 4, i); _q.setFromEuler(_e); _m4.compose(_p, _q, _s.setScalar(on * (u > 0.97 ? (1 - u) / 0.03 : 1))); S.fly.setMatrixAt(n++, _m4); }
    S.fly.count = Math.max(0, n); S.fly.instanceMatrix.needsUpdate = true; S.fly.visible = n > 0; S.fly.count = n || 0; }
  // la puerta: el lunes se abre
  { const o = eio(clamp((t - K.abren12 + 0.05) / 0.95)) * (1 - rw); S.doorPv.rotation.y = -1.5 * o; S.doorL.intensity = 140 * o; S.corr.material.emissiveIntensity = 0.45 * o; }
  // luces del túnel (las bombillas)
  { const on = clamp(lightsOn(t)), xd = xDigAt(t); S.tLights.forEach(L => (L.intensity = 7 * on * (xd > L.userData.x ? 1 : 0))); }
}
