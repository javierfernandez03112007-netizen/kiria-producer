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
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--disable-web-security'] });
const PR = Number(process.env.PR || 1);   // PR=2 → 2160x3840 reales (4K vertical)
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: PR });
await page.addInitScript(`window.PR = ${PR};`);
if (process.env.COVER_T) await page.addInitScript(`window.COVER_T = ${Number(process.env.COVER_T)};`);
if (process.env.COVER_CAM) await page.addInitScript(`window.COVER_CAM = [${process.env.COVER_CAM}];`);
page.setDefaultTimeout(300000);
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('ERROR')) console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/projects/civil/web/index.html`);
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 400000 });
const failed = await page.evaluate(() => window.failed);
if (failed) { console.log('FAILED', failed); process.exit(1); }
const t0 = Date.now();
if (process.env.COVER) { await page.evaluate(() => window.renderCover()); await page.screenshot({ path: path.join(outDir, 'cover3d.png') }); frames = []; }
for (const f of frames) {
  if (process.env.SKIP && fs.existsSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`))) continue;
  await page.evaluate(t => window.renderAt(t), f / FPS);
  await page.screenshot({ path: path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
}
console.log(`ok ${frames.length} frames en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await browser.close();
server.close();
