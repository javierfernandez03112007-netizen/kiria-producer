// Gráficos del capítulo 1 → PNG con transparencia: node capture_overlay.mjs <salida> [desde_f hasta_f]
// Capas: behind/fNNNNN.png, front/fNNNNN.png y glass.json (rectángulos de cristal por fotograma). Si un fotograma no cambia,
// se enlaza al anterior (no se vuelve a hacer la captura).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http';
const here = path.dirname(new URL(import.meta.url).pathname);
const [outDir, fa, fb] = process.argv.slice(2);
for (const l of ['behind', 'front']) fs.mkdirSync(path.join(outDir, l), { recursive: true });
const root = path.resolve(here, '../../..');
const types = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('[pageerror]', e.message); process.exit(1); });
page.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/projects/serie_cap1/web/overlay.html`);
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 120000 });
const failed = await page.evaluate(() => window.failed); if (failed) { console.log('FAILED', failed); process.exit(1); }
const TL = await page.evaluate(() => window.TL);
const N = Math.round(TL.total * TL.fps);
const f0 = fa ? Number(fa) : 0, f1 = fb ? Math.min(N, Number(fb)) : N;
const gpath = path.join(outDir, `glass_${f0}_${f1}.json`);
const glass = {}; const prev = { behind: null, front: null }; const prevFile = { behind: null, front: null };
const t0 = Date.now(); let shots = 0;
for (let f = f0; f < f1; f++) {
  for (const layer of ['behind', 'front']) {
    const r = await page.evaluate(([t, l]) => window.renderAt(t, l), [f / TL.fps, layer]);
    const file = path.join(outDir, layer, `f${String(f).padStart(5, '0')}.png`);
    if (layer === 'front' && r.glass.length) glass[f] = r.glass;
    if (r.sig === '') { if (fs.existsSync(file)) fs.unlinkSync(file); prev[layer] = ''; prevFile[layer] = null; continue; }
    if (r.sig === prev[layer] && prevFile[layer]) { try { fs.unlinkSync(file); } catch (e) {} fs.linkSync(prevFile[layer], file); continue; }
    await page.screenshot({ path: file, omitBackground: true }); shots++;
    prev[layer] = r.sig; prevFile[layer] = file;
  }
  if (f % 300 === 0) console.log(`f ${f} (${((Date.now() - t0) / 1000).toFixed(0)} s, ${shots} capturas)`);
}
fs.writeFileSync(gpath, JSON.stringify(glass));
console.log(`ok ${f1 - f0} fotogramas, ${shots} capturas, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close(); server.close();
