let MW, MG, SP, CF, ST, BB;
async function labBuild() { MW = buildMicrowave(); MW.position.set(0, 0, -6); scene.add(MW);
  const U = MW.userData; MG = buildMug(); MG.position.copy(U.plateC).add(v3(0, 1.75, 0)).add(MW.position); scene.add(MG);
  SP = buildSplash(); MG.add(SP); CF = buildCoffee(); MG.add(CF); ST = buildStick(); ST.position.set(1.2, 0.8, 0.6); ST.rotation.set(0.12, 0.3, -0.18); ST.visible = false; MG.add(ST); BB = buildBubbles(); MG.add(BB); }
function labAt(t) {
  const k = Math.round(t), c = MG.position; microwaveAt(MW, { on: 1, turn: 0, display: '1:00' });
  const cin = [c.x + 0.8, c.y + 11.5, c.z + 15, c.x, c.y + 7.2, c.z, 36];          // dentro del horno, desde la puerta
  if (k === 0) { mugSurface(MG, t, {}); splashAt(SP, 0, {}); return cin; }
  if (k === 1) { mugSurface(MG, t, { bulge: 0.6, crown: 0.3 }); splashAt(SP, 0.03, { dir: v3(0, 0, 1), floor: -1.75 }); return cin; }
  if (k === 2) { mugSurface(MG, t, { bulge: 0.2, crown: 1 }); splashAt(SP, 0.08, { dir: v3(0, 0, 1), floor: -1.75 }); return cin; }
  if (k === 3) { splashAt(SP, 0, {}); mugSurface(MG, t, {}); coffeeAt(CF, 0.6); return [c.x + 3, c.y + 13, c.z + 15.5, c.x, c.y + 8, c.z, 34]; }
  ST.visible = true; coffeeAt(CF, 0); bubblesAt(BB, t, v3(1.25, 1.2, 0.65), v3(1.7, 7.6, 1.6), 1, {}); mugSurface(MG, t, { amp: 0.05 });
  return [c.x + 2, c.y + 14, c.z + 13, c.x + 1, c.y + 7, c.z, 34];
}
