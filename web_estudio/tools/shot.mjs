// Vista previa local de web_estudio/index.html con el mismo esqueleto que pone el Artifact.
// Uso: OUT=/tmp/capturas FONTS=/carpeta/con/Anton.ttf,InstrumentSans.ttf,JetBrainsMono.ttf node shot.mjs heads|globe|page|poster [ancho alto dpr]
// (heads: PS=0,0.5,... progreso del scroll; page: IDS=cifras,trabajos,...; poster: rehace media/cabezas.jpg en bruto)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), FONTS = process.env.FONTS || '/tmp/fonts', OUT = process.env.OUT || '/tmp';
const [mode = 'heads', w = '1440', h = '900', dpr = '1'] = process.argv.slice(2);
const types = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.ttf': 'font/ttf', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { const body = fs.readFileSync(ROOT + '/index.html', 'utf8'); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`); return; }
  const f = u.startsWith('/fonts/') ? FONTS + u.slice(6) : ROOT + u;
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errs = []; page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: `@font-face{font-family:'Anton';src:url(http://127.0.0.1:${port}/fonts/Anton.ttf)}@font-face{font-family:'Instrument Sans';font-weight:400 700;src:url(http://127.0.0.1:${port}/fonts/InstrumentSans.ttf)}@font-face{font-family:'JetBrains Mono';font-weight:400 800;src:url(http://127.0.0.1:${port}/fonts/JetBrainsMono.ttf)}` }));
await page.route('https://fonts.gstatic.com/**', r => r.abort());
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500);
const tag = `${mode}_${w}x${h}`;
if (mode === 'heads') {
  const ps = (process.env.PS || '0,0.2,0.38,0.5,0.555,0.6,0.66,0.76,0.92').split(',').map(Number);
  for (const p of ps) { await page.evaluate(p => { window.kiriaP = p; window.kiriaKick && window.kiriaKick(); }, p); await page.waitForTimeout(+(process.env.WAIT || 1800)); await page.screenshot({ path: `${OUT}/s_${tag}_p${String(p).replace('.', '')}.png` }); }
} else if (mode === 'poster') {
  await page.evaluate(() => { for (const id of ['intro', 'tagH', 'tagA', 'hint', 'reveal']) document.getElementById(id).style.visibility = 'hidden'; document.querySelector('.top').style.visibility = 'hidden'; window.kiriaP = 0; window.kiriaKick(); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/poster_raw.png`, clip: { x: 150, y: 150, width: 1140, height: 640 } });
} else if (mode === 'globe') {
  await page.evaluate(() => document.getElementById('mundo').scrollIntoView()); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/s_${tag}_globe.png` });
  const b = await page.locator('#globeBox').boundingBox();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5); await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.55, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/s_${tag}_globe2.png` });
} else if (mode === 'page') {
  for (const id of (process.env.IDS || 'cifras,clientes,trabajos,formatos,proceso,mundo,anunciarse,planes,preguntas,contacto').split(',')) {
    await page.evaluate(id => { document.documentElement.style.scrollBehavior = 'auto'; const el = document.getElementById(id); el.scrollIntoView(); document.querySelectorAll('.rv').forEach(e => e.classList.add('in')); }, id);
    await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/s_${tag}_${id}.png` });
  }
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/s_${tag}_footer.png` });
}
const ow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log('errores:', errs.length ? errs.join('\n') : 'ninguno', '| desborde horizontal:', ow);
await browser.close(); server.close();
