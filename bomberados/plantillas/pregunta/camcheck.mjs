// ¿La cámara «atraviesa» algo? Con el vídeo vertical y la cámara cerrada (fov 28–40°), una persona a menos de ~1,4 m llena
// media pantalla y parece que la cámara pasa por dentro aunque no la toque (trinquete, 26 nov: B tapaba el 88 % a 0,8 m).
// Recorre el vídeo y en cada instante lanza 9×16 rayos por la pantalla: cuenta qué parte la tapa algo a menos de D metros.
// Necesita window.DBG con { scene, cam, THREE, update } (update(t) pone la escena y la cámara en t, sin renderizar).
// Uso: node bomberados/plantillas/pregunta/camcheck.mjs projects/<p> [t0=0] [t1=fin] [paso=0.05] [D=1.4] [umbral=0.12]
// Sale: los tramos en que más del «umbral» de la pantalla queda tapado por algo a menos de D (y la distancia mínima).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '../../..');
const [P, T0 = '0', T1 = '-1', DT = '0.05', DN = '1.4', UM = '0.12'] = process.argv.slice(2);
if (!P) { console.log('uso: node camcheck.mjs projects/<p> [t0] [t1] [paso] [D] [umbral]'); process.exit(1); }
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://127.0.0.1:${server.address().port}/${P}/web/index.html`);
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 400000 });
const res = await page.evaluate(([T0, T1, DT, DN]) => {
  const D = window.DBG; if (!D || !D.update || !D.cam || !D.scene || !D.THREE) return { error: 'falta window.DBG con scene, cam, THREE y update' };
  const THREE = D.THREE, meshes = [];
  D.scene.traverse(o => { if (o.isMesh && o.geometry) { meshes.push(o); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m) m.side = THREE.DoubleSide; } });
  const name = o => { let n = o; while (n && n.parent && n.parent !== D.scene && !n.name) n = n.parent; return (n && n.name) || 'objeto'; };
  const rc = new THREE.Raycaster(); rc.far = 3; const sph = new THREE.Sphere(), out = [];
  const end = T1 < 0 ? (window.END || 40) : T1;
  for (let t = T0; t <= end + 1e-9; t += DT) {
    D.update(t); D.scene.updateMatrixWorld(true);
    const p = D.cam.position;
    const near = meshes.filter(m => { for (let o = m; o; o = o.parent) if (o.visible === false) return false;
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); sph.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld); return sph.distanceToPoint(p) < DN + 0.5; });
    let hit = 0, dmin = 9; const who = {};
    for (let i = 0; i < 9; i++) for (let j = 0; j < 16; j++) {
      rc.setFromCamera(new THREE.Vector2(-1 + (i + 0.5) * 2 / 9, -1 + (j + 0.5) * 2 / 16), D.cam);
      const h = rc.intersectObjects(near, false); if (!h.length) continue;
      dmin = Math.min(dmin, h[0].distance);
      if (h[0].distance < DN) { hit++; const k = name(h[0].object); who[k] = (who[k] || 0) + 1; }
    }
    out.push([+t.toFixed(2), hit / 144, +dmin.toFixed(2), Object.keys(who).join('+')]);
  }
  return { out };
}, [+T0, +T1, +DT, +DN]);
if (res.error) { console.log(res.error); process.exit(1); }
let run = null; const flush = () => { if (run) console.log(`${run.a.toFixed(2)}–${run.b.toFixed(2)} s: tapa hasta el ${Math.round(run.max * 100)} % (a ${run.dmin} m) ${run.who}`); run = null; };
for (const [t, f, d, w] of res.out) {
  if (f > +UM) { if (run) { run.b = t; run.max = Math.max(run.max, f); run.dmin = Math.min(run.dmin, d); } else run = { a: t, b: t, max: f, dmin: d, who: w }; }
  else flush();
}
flush();
console.log(`revisados ${res.out.length} instantes; distancia mínima a lo que se ve: ${Math.min(...res.out.map(r => r[2]))} m`);
await browser.close(); server.close();
