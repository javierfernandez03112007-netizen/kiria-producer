// Empaqueta la web en UN solo archivo HTML (para enseñarla sin servidor: se abre con doble clic o en la app).
//   node tools/bundle.mjs            (necesita esbuild:  npm i esbuild  — o ESBUILD=/ruta/a/node_modules/esbuild)
// Mete dentro el CSS, las fuentes, el JS (con three.js para la intro) y las imágenes pequeñas. Los vídeos NO se incrustan.
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esbuild = await import(process.env.ESBUILD ? pathToFileURL(join(process.env.ESBUILD, 'lib/main.js')).href : 'esbuild');
const MIME = { '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const dataUri = f => `data:${MIME[extname(f).toLowerCase()]};base64,${readFileSync(f).toString('base64')}`;

const out = await (esbuild.default || esbuild).build({ entryPoints: [join(root, 'js/app.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
let js = out.outputFiles[0].text;
// imágenes referenciadas desde el JS (portada, fotos de producto): se incrustan si pesan menos de 400 KB
let embedded = 0, skipped = new Set();
js = js.replace(/(["'`])((?:img|media)\/[\w./-]+\.(?:jpg|jpeg|png|webp|svg|mp4))\1/g, (m, q, rel) => {
  const f = join(root, rel);
  if (!existsSync(f) || !MIME[extname(f).toLowerCase()] || statSync(f).size > 400e3) { skipped.add(rel); return m; }
  embedded++; return q + dataUri(f) + q;
});
let css = ['css/styles.css', 'css/motion.css'].map(f => readFileSync(join(root, f), 'utf8')).join('\n')
  .replace(/url\(\.\.\/(fonts\/[\w.-]+\.woff2)\)/g, (m, rel) => `url(${dataUri(join(root, rel))})`)
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');
let html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<link rel="preload"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="css\/styles\.css">\n?/, () => `<style>${css}</style>\n`)
  .replace(/<link rel="stylesheet" href="css\/motion\.css">\n?/, '')
  .replace(/<script type="module" src="js\/app\.js"><\/script>/, () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
if (/href="css\/|src="js\//.test(html)) throw new Error('quedan referencias a archivos sueltos');

// --artifact: la misma web como «fragmento» para publicarla de vista previa privada en claude.ai.
// Allí la página va dentro de un marco: sin <html>/<head>/<body> propios, título corto y rutas en memoria (js/nav.js).
if (process.argv.includes('--artifact')) {
  const src = readFileSync(join(root, 'index.html'), 'utf8');
  const pre = /<script>\s*\/\* Antes de pintar[\s\S]*?<\/script>/.exec(src)[0];
  const body = /<body>([\s\S]*)<\/body>/.exec(src)[1]
    .replace(/<script type="module" src="js\/app\.js"><\/script>/, () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
  const frag = `<title>Beauty Salon Merche</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>${css}</style>\n`
    + `<script>window.__MEM_ROUTER = true; document.documentElement.lang = 'es';</script>\n${pre}\n${body.trim()}\n`;
  if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(frag.replace(/<script>[\s\S]*?<\/script>/g, ''))) throw new Error('el fragmento no puede llevar doctype, html, head ni body');
  const out2 = process.env.OUT || join(root, 'dist/artifact.html');
  mkdirSync(dirname(out2), { recursive: true }); writeFileSync(out2, frag);
  console.log(`${out2} · ${(frag.length / 1e6).toFixed(2)} MB (fragmento para claude.ai)`);
}
mkdirSync(join(root, 'dist'), { recursive: true });
const dest = join(root, 'dist/beauty-salon-merche-demo.html');
writeFileSync(dest, html);
console.log(`dist/beauty-salon-merche-demo.html · ${(html.length / 1e6).toFixed(2)} MB · imágenes incrustadas: ${embedded}${skipped.size ? ' · sin incrustar: ' + [...skipped].join(', ') : ''}`);
