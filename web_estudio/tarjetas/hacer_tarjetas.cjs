// Tarjetas de visita de kiria.ai para repartir en negocios de la zona (85 × 55 mm, el tamaño estándar en España).
// Saca, en esta carpeta:
//   tarjeta_imprenta.pdf  → 2 páginas (frente y dorso) de 91 × 61 mm: 85 × 55 + 3 mm de sangrado por lado, para una imprenta online
//   tarjetas_A4.pdf       → 2 hojas A4 (10 frentes y 10 dorsos) con marcas de corte, para imprimir en casa a doble cara
//   frente.png, dorso.png → vistas previas
// Uso: node hacer_tarjetas.cjs   (qr.svg lo genera Python con la librería qrcode: apunta a https://kiriaai.com)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname, QR = fs.readFileSync(path.join(dir, 'qr.svg'), 'utf8');

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=block');
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card { position: relative; width: 91mm; height: 61mm; overflow: hidden; font-family: 'Instrument Sans', sans-serif; color: #f2f4f8; background: #0a0b10; }
/* zona segura: 3 mm de sangrado + 4 mm de margen */
.safe { position: absolute; inset: 7mm; }
.front .glow { position: absolute; inset: 0; background:
  radial-gradient(42mm 30mm at 92% 8%, rgba(79, 125, 255, .55), transparent 70%),
  radial-gradient(40mm 28mm at 70% 0%, rgba(180, 92, 255, .45), transparent 70%),
  radial-gradient(46mm 34mm at 0% 105%, rgba(255, 77, 97, .40), transparent 70%); }
.front .grid { position: absolute; inset: 0; opacity: .13; background-image: linear-gradient(#fff 0.12mm, transparent 0.12mm), linear-gradient(90deg, #fff 0.12mm, transparent 0.12mm); background-size: 6mm 6mm; mask-image: radial-gradient(60mm 40mm at 85% 15%, #000, transparent 75%); -webkit-mask-image: radial-gradient(60mm 40mm at 85% 15%, #000, transparent 75%); }
.logo { font-family: 'Anton', sans-serif; font-size: 15.5mm; line-height: .9; letter-spacing: .1mm; }
.logo i { font-style: normal; color: #ff4d61; }
.kick { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.95mm; letter-spacing: .55mm; color: #c2c8d3; margin-top: 2.2mm; }
.tag { position: absolute; left: 0; bottom: 0; font-size: 3.35mm; line-height: 1.32; color: #c2c8d3; }
.tag b { color: #fff; font-weight: 700; display: block; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4.8mm;   /* 3 mm de sangrado + 1,8 mm que se ven */ background: linear-gradient(95deg, #ff4d61 0%, #b45cff 52%, #4f7dff 100%); }
.back { background: #0f121a; }
.back .cols { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 23mm; gap: 4mm; }
.back .h { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.85mm; letter-spacing: .5mm; color: #8b94a4; }
.back ul { list-style: none; margin-top: 2.2mm; display: grid; gap: 2mm; }
.back li { display: grid; grid-template-columns: 3.4mm 1fr; column-gap: 1.6mm; }
.back li::before { content: ''; width: 2.2mm; height: 2.2mm; margin-top: .55mm; border-radius: .6mm; background: linear-gradient(135deg, #ff4d61, #b45cff 60%, #4f7dff); grid-row: span 2; }
.back li b { font-size: 3.05mm; line-height: 1.15; color: #fff; }
.back li span { font-size: 2.35mm; line-height: 1.25; color: #c2c8d3; }
.back .price { margin-top: 2.6mm; font-size: 2.6mm; color: #c2c8d3; }
.back .price b { font-family: 'Anton', sans-serif; font-weight: 400; font-size: 4.6mm; letter-spacing: .1mm; color: #fff; }
.qrbox { align-self: start; display: grid; justify-items: center; gap: 1.3mm; }
.qrbox .q { width: 23mm; height: 23mm; padding: 1.7mm; background: #fff; border-radius: 1.6mm; }
.qrbox .q svg { width: 100%; height: 100%; display: block; }
.qrbox span { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.7mm; letter-spacing: .35mm; color: #c2c8d3; }
.foot { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; gap: 2mm; padding-top: 1.8mm; border-top: .2mm solid #353d50; font-size: 2.3mm; color: #c2c8d3; white-space: nowrap; }
.foot b { color: #fff; font-weight: 700; }
`;
const FRONT = `<div class="card front"><div class="glow"></div><div class="grid"></div><div class="safe">
  <div class="logo">kiria<i>.</i>ai</div><div class="kick">ESTUDIO DE VÍDEO CON IA</div>
  <div class="tag">Vídeos en 3D para tu negocio.<b>Sin una sola cámara.</b></div></div><div class="bar"></div></div>`;
const BACK = `<div class="card back"><div class="safe"><div class="cols"><div>
  <p class="h">LO QUE HACEMOS</p>
  <ul><li><b>Vídeos para tus redes</b><span>Guion, voz, 3D, subtítulos y sonido</span></li>
      <li><b>Tu producto, en 3D</b><span>Para enseñarlo como nunca</span></li>
      <li><b>Webs para tu negocio</b><span>Con tus fotos o con las nuestras</span></li></ul>
  <p class="price">Vídeos desde <b>6,99 €</b></p></div>
  <div class="qrbox"><div class="q">${QR}</div><span>ESCANÉAME</span></div></div>
  <div class="foot"><b>kiriaai.com</b><span>@kiria.ai</span><span>kiriaai2026@gmail.com</span></div></div></div>`;

const page1 = side => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} @page { size: 91mm 61mm; margin: 0; }</style></head><body>${side}</body></html>`;
// hoja A4: 2 × 5 tarjetas de 85 × 55 mm (se recorta el sangrado), centradas, con marcas de corte en el margen
const sheet = side => {
  const W = 85, H = 55, x0 = (210 - 2 * W) / 2, y0 = (297 - 5 * H) / 2; let cells = '', marks = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) cells += `<div style="position:absolute;left:${x0 + c * W}mm;top:${y0 + r * H}mm;width:${W}mm;height:${H}mm;overflow:hidden"><div style="position:absolute;left:-3mm;top:-3mm">${side}</div></div>`;
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  for (let c = 0; c <= 2; c++) { const x = x0 + c * W; marks += L(x, 1, x, y0 - 2) + L(x, y0 + 5 * H + 2, x, 296); }
  for (let r = 0; r <= 5; r++) { const y = y0 + r * H; marks += L(1, y, x0 - 2, y) + L(x0 + 2 * W + 2, y, 209, y); }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} @page { size: A4; margin: 0; } .sh { position: relative; width: 210mm; height: 297mm; page-break-after: always; }</style></head><body>
    <div class="sh">${cells}<svg style="position:absolute;inset:0" width="210mm" height="297mm" viewBox="0 0 210 297"><g stroke="#000" stroke-width=".15">${marks}</g></svg></div></body></html>`;
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 4 });
  const pdfs = [];
  for (const [nm, side] of [['frente', FRONT], ['dorso', BACK]]) {
    await p.setContent(page1(side), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    const bb = await p.locator('.card').boundingBox(), mm = 96 / 25.4;   // vista previa ya recortada: 85 × 55 mm, sin el sangrado
    await p.screenshot({ path: path.join(dir, nm + '.png'), clip: { x: bb.x + 3 * mm, y: bb.y + 3 * mm, width: 85 * mm, height: 55 * mm } });
    pdfs.push(await p.pdf({ width: '91mm', height: '61mm', printBackground: true, pageRanges: '1' }));
  }
  fs.writeFileSync(path.join(dir, '_frente.pdf'), pdfs[0]); fs.writeFileSync(path.join(dir, '_dorso.pdf'), pdfs[1]);
  for (const [nm, side] of [['_A4_frentes', FRONT], ['_A4_dorsos', BACK]]) {
    await p.setContent(sheet(side), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    fs.writeFileSync(path.join(dir, nm + '.pdf'), await p.pdf({ format: 'A4', printBackground: true, pageRanges: '1' }));
  }
  const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  console.log('fuentes cargadas:', [...new Set(fonts)].join(', '));
  await b.close();
})();
