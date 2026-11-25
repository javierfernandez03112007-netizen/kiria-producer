// Pase LOCAL de rótulos: para cada fotograma, qué habitantes se ven lo bastante grandes para llevar su nombre y dónde caen en pantalla.
// No renderiza nada (solo mueve la cámara y proyecta). Salida: una línea JSON por fotograma → node labels.mjs <salida.jsonl> <N> [FPS=60]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http';
const here = path.dirname(new URL(import.meta.url).pathname), [out, N] = process.argv.slice(2), FPS = Number(process.env.FPS || 60);
const root = path.resolve(here, '../../..'), types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } }); await page.addInitScript('window.PR = 0.25;'); page.setDefaultTimeout(300000);
page.on('console', m => { if (m.text().startsWith('ERROR')) console.log('[page]', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/projects/elecciones_29n_vox/web/index.html`);
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 400000 });
fs.writeFileSync(path.join(path.dirname(out), 'jobs.json'), JSON.stringify(await page.evaluate(() => window.whoIs())));
const w = fs.createWriteStream(out); let tot = 0, mx = 0;
for (let f = 0; f < Number(N); f++) { const L = await page.evaluate(t => window.labelsAt(t), f / FPS); tot += L.p.length + L.h.length; mx = Math.max(mx, L.p.length + L.h.length); w.write(JSON.stringify(L) + '\n'); }
await new Promise(r => w.end(r)); console.log(`ok ${N} fotogramas, ${tot} rótulos, máx ${mx} en un fotograma`); await browser.close(); server.close();
