// node capture3d.mjs <salida> [f0 f1 | --times t1,t2]  → bg/fNNNNN.png y num/fNNNNN.png (fotogramas del montaje, 60 fps)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http';
const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2); const outDir = args[0];
for (const l of ['bg', 'num']) fs.mkdirSync(path.join(outDir, l), { recursive: true });
const A = 0.68, SPEED = 1.06, FPS = 60, NF = Math.round(7.783 * FPS);
let frames = [];
if (args[1] === '--times') frames = args[2].split(',').map(t => Math.round((Number(t) - A) / SPEED * FPS));
else { const f0 = Number(args[1] || 0), f1 = Number(args[2] || NF); for (let f = f0; f < f1; f++) frames.push(f); }
const root = path.resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('[pageerror]', e.message); process.exit(1); });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/projects/serie_cap1/web3d/index.html`);
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 300000 });
const failed = await page.evaluate(() => window.failed); if (failed) { console.log('FAILED', failed); process.exit(1); }
const t0 = Date.now();
for (const f of frames) {
  const ts = A + f / FPS * SPEED;
  const name = `f${String(f).padStart(5, '0')}.png`;
  const r = await page.evaluate(ts => window.renderAt(ts, 'bg'), ts);
  await page.screenshot({ path: path.join(outDir, 'bg', name), omitBackground: true });
  if (r.num) { await page.evaluate(ts => window.renderAt(ts, 'num'), ts); await page.screenshot({ path: path.join(outDir, 'num', name), omitBackground: true }); }
  if (f % 60 === 0) console.log(`f ${f} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log(`ok ${frames.length} fotogramas en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();
