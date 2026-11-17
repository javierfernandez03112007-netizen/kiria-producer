// Captura fotogramas: node capture.mjs <salida_dir> <t1,t2,...> | --range <inicio> <fin> <paso_frames> <worker> <workers>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import http from 'http';
const here = path.dirname(new URL(import.meta.url).pathname);
const [outDir, ...rest] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const FPS = Number(process.env.FPS || 30);
let frames;
if (rest[0] === '--range') {
  const [a, b, w, n] = rest.slice(1).map(Number);
  frames = []; for (let f = a; f < b; f++) if (f % n === w) frames.push(f);
} else frames = rest[0].split(',').map(x => Math.round(Number(x) * FPS));
// servidor estático local (raíz del repo) para que fetch funcione
const root = path.resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const PR = Number(process.env.PR || 1);   // PR=2 → 2160x3840 reales (4K vertical)
// abre el navegador y la escena; si el contexto WebGL nace perdido (SwiftShader, a veces con varios procesos a la vez), lo cierra y devuelve null
async function openPage() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--disable-web-security', '--disable-gpu-watchdog', '--disable-gpu-process-crash-limit'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: PR });
  await page.addInitScript(`window.PR = ${PR};`);
  if (process.env.LABINIT) await page.addInitScript(process.env.LABINIT);
  if (process.env.COVER_T) await page.addInitScript(`window.COVER_T = ${Number(process.env.COVER_T)};`);
  if (process.env.COVER_CAM) await page.addInitScript(`window.COVER_CAM = [${process.env.COVER_CAM}];`);
  page.setDefaultTimeout(300000);
  page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('ERROR')) { const s = m.text(); if (!/VALIDATE_STATUS false|Material (Name|Type)|Program Info Log/.test(s)) console.log('[page]', s); } });
  page.on('pageerror', e => { console.log('[pageerror]', e.message); process.exit(1); });
  await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || 'projects/pausa_universitaria/web/index.html'}`);
  await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 400000 });
  const failed = await page.evaluate(() => window.failed);
  if (failed) { console.log('FAILED', failed); process.exit(1); }
  if (process.env.EVAL) await page.evaluate(s => window.dbgEval(s), process.env.EVAL);
  const lost = await page.evaluate(() => window.glLost ? window.glLost() : false);
  if (lost) { await browser.close(); return null; }
  return { browser, page };
}
async function open() { for (let i = 0; i < 6; i++) { const c = await openPage(); if (c) return c; console.log('contexto WebGL perdido al arrancar; reintento ' + (i + 1)); await new Promise(r => setTimeout(r, 3000 + i * 4000)); } console.log('FAILED: contexto WebGL perdido'); process.exit(1); }
let { browser, page } = await open();
const t0 = Date.now();
if (process.env.COVER) { await page.evaluate(() => window.renderCover()); await page.screenshot({ path: path.join(outDir, 'cover3d.png') }); frames = []; }
for (const f of frames) {
  const file = path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`);
  if (process.env.SKIP && fs.existsSync(file)) continue;
  for (let k = 0; ; k++) {
    const ok = await page.evaluate(t => { window.renderAt(t); return !(window.glLost && window.glLost()); }, f / FPS);
    if (ok) break;
    if (k >= 4) { console.log('FAILED: contexto WebGL perdido en ' + f); process.exit(1); }
    console.log('contexto WebGL perdido en el fotograma ' + f + '; reabro'); await browser.close(); ({ browser, page } = await open());
  }
  await page.screenshot({ path: file, type: 'jpeg', quality: 93 });
}
console.log(`ok ${frames.length} frames en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await browser.close();
server.close();
