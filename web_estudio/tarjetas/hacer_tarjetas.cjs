// Tarjetas de visita de kiria.ai para repartir en negocios de la zona (85 × 55 mm, el tamaño estándar en España).
// Javi (4-11-2026): «no quiero que haya nada de precios, algo muy muy profesional» → dos versiones sobrias, sin precios:
//   noche  → frente oscuro (como la web) y dorso claro
//   blanca → frente y dorso blancos, minimalista
// Saca, en esta carpeta, para cada versión:
//   tarjeta_imprenta_<v>.pdf → 2 páginas (frente y dorso) de 91 × 61 mm: 85 × 55 + 3 mm de sangrado por lado, para la imprenta
//   tarjetas_A4_<v>.pdf      → 2 hojas A4 (10 frentes y 10 dorsos) con marcas de corte, para imprimir en casa a doble cara
//   <v>_frente.png, <v>_dorso.png → vistas previas ya recortadas a 85 × 55 mm
// Uso: node hacer_tarjetas.cjs   (qr.svg lo genera Python con la librería qrcode: apunta a https://kiriaai.com). Necesita pdfunite.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = __dirname, QR = fs.readFileSync(path.join(dir, 'qr.svg'), 'utf8');

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=block');
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card { position: relative; width: 91mm; height: 61mm; overflow: hidden; font-family: 'Instrument Sans', sans-serif; }
.safe { position: absolute; inset: 8.5mm; }                 /* 3 mm de sangrado + 5,5 mm de margen */
.logo { font-family: 'Anton', sans-serif; line-height: .95; letter-spacing: .15mm; }
.logo i { font-style: normal; }
.rule { width: 13mm; height: .45mm; border-radius: .3mm; background: linear-gradient(90deg, #ff4d61, #b45cff 55%, #4f7dff); }
.mono { font-family: 'JetBrains Mono', monospace; font-weight: 500; letter-spacing: .3mm; }
/* frente */
.front .mid { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-58%); }
.front .logo { font-size: 11mm; }
.front .rule { margin: 3.2mm 0 2.7mm; }
.front .desc { font-size: 2.5mm; letter-spacing: .1mm; }
.front .url { position: absolute; right: 0; bottom: 0; font-size: 1.8mm; }
.noche.front { background: #0a0b10; color: #f2f4f8; }
.noche.front .soft { position: absolute; inset: 0; background: radial-gradient(62mm 40mm at 104% -6%, rgba(79, 125, 255, .20), transparent 70%), radial-gradient(52mm 34mm at -6% 108%, rgba(255, 77, 97, .13), transparent 70%); }
.noche.front .logo i { color: #ff4d61; }
.noche.front .desc { color: #c2c8d3; }
.noche.front .url { color: #8b94a4; }
.blanca.front { background: #ffffff; color: #0c0e12; }
.blanca.front .logo i { color: #e5243f; }
.blanca.front .desc { color: #3a404a; }
.blanca.front .url { color: #6c737e; }
/* dorso */
.back { color: #0c0e12; }
.back.noche { background: #f5f5f1; }
.back.blanca { background: #ffffff; }
.back .cols { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr) 20mm; column-gap: 6mm; }
.back .logo { font-size: 4.4mm; }
.back .logo i { color: #e5243f; }
.back .svc { list-style: none; margin-top: 3.6mm; }
.back .svc li { font-size: 2.45mm; line-height: 1.2; color: #22262d; padding: 1.25mm 0; border-top: .17mm solid #d6d6cf; }
.back .svc li:last-child { border-bottom: .17mm solid #d6d6cf; }
.back .contact { position: absolute; left: 0; bottom: 0; display: grid; gap: .9mm; font-size: 2.15mm; color: #3a404a; }
.back .qr { align-self: center; display: grid; justify-items: center; gap: 1.6mm; }
.back .qr .q { width: 20mm; height: 20mm; }
.back .qr .q svg { width: 100%; height: 100%; display: block; }
.back .qr span { font-size: 1.75mm; color: #3a404a; }
`;
const FRONT = v => `<div class="card front ${v}">${v === 'noche' ? '<div class="soft"></div>' : ''}<div class="safe">
  <div class="mid"><div class="logo">kiria<i>.</i>ai</div><div class="rule"></div><div class="desc">Estudio de vídeo 3D con inteligencia artificial</div></div>
  <div class="url mono">kiriaai.com</div></div></div>`;
const BACK = v => `<div class="card back ${v}"><div class="safe"><div class="cols">
  <div><div class="logo">kiria<i>.</i>ai</div>
    <ul class="svc"><li>Vídeos 3D para redes sociales</li><li>Tu producto, en 3D</li><li>Páginas web para negocios</li></ul>
    <div class="contact"><span>@kiria.ai</span><span>kiriaai2026@gmail.com</span></div></div>
  <div class="qr"><div class="q">${QR}</div><span class="mono">kiriaai.com</span></div></div></div></div>`;

const page1 = side => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} @page { size: 91mm 61mm; margin: 0; }</style></head><body>${side}</body></html>`;
// hoja A4: 2 × 5 tarjetas de 85 × 55 mm (se recorta el sangrado), centradas, con marcas de corte en el margen
const sheet = side => {
  const W = 85, H = 55, x0 = (210 - 2 * W) / 2, y0 = (297 - 5 * H) / 2; let cells = '', marks = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) cells += `<div style="position:absolute;left:${x0 + c * W}mm;top:${y0 + r * H}mm;width:${W}mm;height:${H}mm;overflow:hidden"><div style="position:absolute;left:-3mm;top:-3mm">${side}</div></div>`;
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  for (let c = 0; c <= 2; c++) { const x = x0 + c * W; marks += L(x, 1, x, y0 - 2) + L(x, y0 + 5 * H + 2, x, 296); }
  for (let r = 0; r <= 5; r++) { const y = y0 + r * H; marks += L(1, y, x0 - 2, y) + L(x0 + 2 * W + 2, y, 209, y); }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} @page { size: A4; margin: 0; } .sh { position: relative; width: 210mm; height: 297mm; }</style></head><body>
    <div class="sh">${cells}<svg style="position:absolute;inset:0" width="210mm" height="297mm" viewBox="0 0 210 297"><g stroke="#000" stroke-width=".15">${marks}</g></svg></div></body></html>`;
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 4 }), mm = 96 / 25.4;
  const render = async (html, file, opts) => { await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); fs.writeFileSync(file, await p.pdf(opts)); };
  for (const v of ['noche', 'blanca']) {
    const tmp = [];
    for (const [nm, side] of [['frente', FRONT(v)], ['dorso', BACK(v)]]) {
      await p.setContent(page1(side), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
      const bb = await p.locator('.card').boundingBox();
      await p.screenshot({ path: path.join(dir, `${v}_${nm}.png`), clip: { x: bb.x + 3 * mm, y: bb.y + 3 * mm, width: 85 * mm, height: 55 * mm } });
      const f = path.join(dir, `_${v}_${nm}.pdf`); fs.writeFileSync(f, await p.pdf({ width: '91mm', height: '61mm', printBackground: true, pageRanges: '1' })); tmp.push(f);
    }
    const a4 = [path.join(dir, `_${v}_A4f.pdf`), path.join(dir, `_${v}_A4d.pdf`)];
    await render(sheet(FRONT(v)), a4[0], { format: 'A4', printBackground: true, pageRanges: '1' });
    await render(sheet(BACK(v)), a4[1], { format: 'A4', printBackground: true, pageRanges: '1' });
    execFileSync('pdfunite', [...tmp, path.join(dir, `tarjeta_imprenta_${v}.pdf`)]);
    execFileSync('pdfunite', [...a4, path.join(dir, `tarjetas_A4_${v}.pdf`)]);
    [...tmp, ...a4].forEach(f => fs.unlinkSync(f));
  }
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  console.log('fuentes cargadas:', [...new Set(fonts)].join(', '));
  await b.close();
})();
