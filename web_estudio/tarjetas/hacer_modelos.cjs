// Catálogo de modelos de tarjeta de kiria.ai (85 × 55 mm), sin precios. Javi (5-11-2026): «hazme 10 modelos diferentes… también en
// tonos grises, o por los dos lados modo noche, uno blanco y otro noche, al revés, prueba muchas combinaciones, entre 10 y 20».
// Saca en modelos/: catalogo_1.png y catalogo_2.png (8 modelos cada uno, frente y dorso), mNN_frente.png / mNN_dorso.png y
// mNN_imprenta.pdf (91 × 61 mm con 3 mm de sangrado, frente y dorso) de cada modelo. Uso: node hacer_modelos.cjs (necesita pdfunite).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = __dirname, out = path.join(dir, 'modelos'), QR = fs.readFileSync(path.join(dir, 'qr.svg'), 'utf8');
fs.mkdirSync(out, { recursive: true });

// colores de cada cara
const T = {
  noche:   { bg: '#0a0b10', ink: '#f2f4f8', sub: '#c2c8d3', mut: '#8b94a4', line: '#2a3040', red: '#ff4d61', dark: true },
  negro:   { bg: '#000000', ink: '#ffffff', sub: '#c9cdd4', mut: '#8d939c', line: '#24272e', red: '#ff4d61', dark: true },
  grafito: { bg: '#2a2d33', ink: '#f4f5f7', sub: '#d0d4da', mut: '#a3aab4', line: '#454a53', red: '#ff5a6b', dark: true },
  gris:    { bg: '#5d6269', ink: '#ffffff', sub: '#eceef1', mut: '#d2d6db', line: '#767c84', red: '#ffd0d6', dark: true },
  perla:   { bg: '#e8e9eb', ink: '#14161a', sub: '#2f343b', mut: '#5b616b', line: '#c9ccd1', red: '#e5243f', dark: false },
  piedra:  { bg: '#dcd8d1', ink: '#1b1a18', sub: '#33302b', mut: '#6a655d', line: '#c2bcb2', red: '#c8202f', dark: false },
  blanca:  { bg: '#ffffff', ink: '#0c0e12', sub: '#2c3139', mut: '#6c737e', line: '#dcdcd6', red: '#e5243f', dark: false },
  degradado: { bg: 'linear-gradient(118deg, #ff4d61 0%, #b45cff 52%, #4f7dff 100%)', ink: '#ffffff', sub: '#ffffff', mut: 'rgba(255,255,255,.85)', line: 'rgba(255,255,255,.4)', red: '#0a0b10', dark: true, grad: true },
};
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=block');
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card { position: relative; width: 91mm; height: 61mm; overflow: hidden; font-family: 'Instrument Sans', sans-serif; color: var(--ink); background: var(--bg); }
.safe { position: absolute; inset: 8.5mm; }
.logo { font-family: 'Anton', sans-serif; line-height: .95; letter-spacing: .15mm; color: var(--ink); }
.logo i { font-style: normal; color: var(--red); }
.rule { width: 13mm; height: .45mm; border-radius: .3mm; background: linear-gradient(90deg, #ff4d61, #b45cff 55%, #4f7dff); }
.grad .rule { background: rgba(255,255,255,.9); }
.mono { font-family: 'JetBrains Mono', monospace; font-weight: 500; letter-spacing: .3mm; }
.desc { font-size: 2.5mm; letter-spacing: .1mm; color: var(--sub); }
.url { font-size: 1.8mm; color: var(--mut); }
.glow { position: absolute; inset: 0; background: radial-gradient(62mm 40mm at 104% -6%, rgba(79, 125, 255, .2), transparent 70%), radial-gradient(52mm 34mm at -6% 108%, rgba(255, 77, 97, .13), transparent 70%); }
/* frentes */
.fA .mid { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-58%); }
.fA .logo { font-size: 11mm; } .fA .rule { margin: 3.2mm 0 2.7mm; } .fA .url { position: absolute; right: 0; bottom: 0; }
.fB .mid { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-62%); text-align: center; }
.fB .logo { font-size: 12.5mm; } .fB .rule { margin: 3.2mm auto 2.7mm; } .fB .url { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; }
.fC .desc2 { position: absolute; left: 0; top: 0; font-size: 1.85mm; letter-spacing: .45mm; color: var(--sub); }
.fC .rule { position: absolute; left: 0; top: 4.2mm; }
.fC .logo { position: absolute; left: -.4mm; bottom: -1.2mm; font-size: 15mm; }
.fC .url { position: absolute; right: 0; top: 0; }
.fD .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 6.4mm; background: linear-gradient(180deg, #ff4d61, #b45cff 55%, #4f7dff); }
.fD .mid { position: absolute; left: 0; right: 0; bottom: 0; }
.fD .logo { font-size: 10mm; } .fD .desc { margin-top: 2.2mm; } .fD .url { position: absolute; right: 0; top: 0; }
/* dorsos */
.bA .cols { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr) 20mm; column-gap: 6mm; }
.bA .logo { font-size: 4.4mm; }
.svc { list-style: none; margin-top: 3.6mm; }
.svc li { font-size: 2.45mm; line-height: 1.2; color: var(--sub); padding: 1.25mm 0; border-top: .17mm solid var(--line); }
.svc li:last-child { border-bottom: .17mm solid var(--line); }
.contact { position: absolute; left: 0; bottom: 0; display: grid; gap: .9mm; font-size: 2.15mm; color: var(--sub); }
.qr { display: grid; justify-items: center; gap: 1.6mm; }
.qr .q { width: 20mm; height: 20mm; border-radius: 1.4mm; }
.qr .q svg { width: 100%; height: 100%; display: block; }
.dk .qr .q { background: #fff; padding: 1.6mm; width: 21.5mm; height: 21.5mm; }
.qr span { font-size: 1.75mm; color: var(--sub); }
.bA .qr { align-self: center; }
.bB .top { position: absolute; left: 0; right: 0; top: 0; text-align: center; font-size: 1.8mm; letter-spacing: .35mm; color: var(--sub); }
.bB .qr { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -54%); }
.bB .qr .q { width: 21mm; height: 21mm; } .dk.bB .qr .q { width: 22.5mm; height: 22.5mm; }
.bB .contact2 { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: 4mm; font-size: 2.1mm; color: var(--sub); }
`;
const vars = th => `--bg:${th.bg};--ink:${th.ink};--sub:${th.sub};--mut:${th.mut};--line:${th.line};--red:${th.red}`;
const LOGO = '<div class="logo">kiria<i>.</i>ai</div>';
function FRONT(tn, L) {
  const th = T[tn], cls = `card front f${L} ${th.dark ? 'dk' : ''} ${th.grad ? 'grad' : ''}`, glow = tn === 'noche' || tn === 'negro' ? '<div class="glow"></div>' : '';
  const body = {
    A: `<div class="mid">${LOGO}<div class="rule"></div><div class="desc">Estudio de vídeo 3D con inteligencia artificial</div></div><div class="url mono">kiriaai.com</div>`,
    B: `<div class="mid">${LOGO}<div class="rule"></div><div class="desc">Estudio de vídeo 3D con inteligencia artificial</div></div><div class="url mono">kiriaai.com</div>`,
    C: `<div class="desc2 mono">ESTUDIO DE VÍDEO 3D CON IA</div><div class="rule"></div><div class="url mono">kiriaai.com</div>${LOGO}`,
    D: `<div class="mid">${LOGO}<div class="desc">Estudio de vídeo 3D con inteligencia artificial</div></div><div class="url mono">kiriaai.com</div>`,
  }[L];
  return `<div class="${cls}" style="${vars(th)}">${glow}${L === 'D' ? '<div class="bar"></div>' : ''}<div class="safe">${body}</div></div>`;
}
function BACK(tn, L) {
  const th = T[tn], cls = `card back b${L} ${th.dark ? 'dk' : ''}`;
  const body = L === 'A'
    ? `<div class="cols"><div>${LOGO}<ul class="svc"><li>Vídeos 3D para redes sociales</li><li>Tu producto, en 3D</li><li>Páginas web para negocios</li></ul>
        <div class="contact"><span>@kiria.ai</span><span>kiriaai2026@gmail.com</span></div></div><div class="qr"><div class="q">${QR}</div><span class="mono">kiriaai.com</span></div></div>`
    : `<div class="top mono">VÍDEOS 3D · TU PRODUCTO EN 3D · WEBS</div><div class="qr"><div class="q">${QR}</div><span class="mono">kiriaai.com</span></div>
       <div class="contact2"><span>@kiria.ai</span><span>kiriaai2026@gmail.com</span></div>`;
  return `<div class="${cls}" style="${vars(th)}"><div class="safe">${body}</div></div>`;
}
// [frente, composición del frente, dorso, composición del dorso, nombre]
const MODELOS = [
  ['noche', 'A', 'noche', 'A', 'Noche · noche'],
  ['noche', 'A', 'blanca', 'A', 'Noche · blanco'],
  ['blanca', 'A', 'blanca', 'A', 'Blanco · blanco'],
  ['blanca', 'A', 'noche', 'A', 'Blanco · noche'],
  ['grafito', 'A', 'grafito', 'A', 'Grafito · grafito'],
  ['grafito', 'B', 'perla', 'B', 'Grafito · perla (centrado)'],
  ['perla', 'B', 'grafito', 'B', 'Perla · grafito (centrado)'],
  ['gris', 'B', 'blanca', 'A', 'Gris · blanco'],
  ['negro', 'B', 'negro', 'B', 'Negro · negro (centrado)'],
  ['blanca', 'B', 'blanca', 'B', 'Blanco minimalista (centrado)'],
  ['noche', 'C', 'blanca', 'B', 'Noche editorial · blanco'],
  ['blanca', 'C', 'noche', 'B', 'Blanco editorial · noche'],
  ['degradado', 'B', 'noche', 'A', 'Degradado · noche'],
  ['degradado', 'C', 'blanca', 'A', 'Degradado editorial · blanco'],
  ['piedra', 'D', 'piedra', 'A', 'Piedra · piedra (barra de color)'],
  ['grafito', 'D', 'blanca', 'B', 'Grafito con barra · blanco'],
];
const page1 = side => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} @page { size: 91mm 61mm; margin: 0; }</style></head><body>${side}</body></html>`;

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 3 }), mm = 96 / 25.4;
  for (const [i, [ft, fl, bt, bl, name]] of MODELOS.entries()) {
    const id = 'm' + String(i + 1).padStart(2, '0'), pdfs = [];
    for (const [nm, html] of [['frente', FRONT(ft, fl)], ['dorso', BACK(bt, bl)]]) {
      await p.setContent(page1(html), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
      const bb = await p.locator('.card').boundingBox();
      await p.screenshot({ path: path.join(out, `${id}_${nm}.png`), clip: { x: bb.x + 3 * mm, y: bb.y + 3 * mm, width: 85 * mm, height: 55 * mm } });
      const f = path.join(out, `_${id}_${nm}.pdf`); fs.writeFileSync(f, await p.pdf({ width: '91mm', height: '61mm', printBackground: true, pageRanges: '1' })); pdfs.push(f);
    }
    execFileSync('pdfunite', [...pdfs, path.join(out, `${id}_imprenta.pdf`)]); pdfs.forEach(f => fs.unlinkSync(f));
    console.log(id, name);
  }
  // catálogo: 8 modelos por imagen (frente y dorso, con su número)
  for (let c = 0; c < 2; c++) {
    const items = MODELOS.slice(c * 8, c * 8 + 8).map((m, j) => { const id = 'm' + String(c * 8 + j + 1).padStart(2, '0');
      const img = s => 'data:image/png;base64,' + fs.readFileSync(path.join(out, `${id}_${s}.png`)).toString('base64');
      return `<div class="it"><div class="n">${c * 8 + j + 1}<span>${m[4]}</span></div><div class="pr"><img src="${img('frente')}"><img src="${img('dorso')}"></div></div>`; }).join('');
    await p.setViewportSize({ width: 1500, height: 1000 });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;700&display=block');
      body{margin:0;background:#9aa0a8;font-family:'Instrument Sans',sans-serif;} .g{display:grid;grid-template-columns:1fr 1fr;gap:26px 30px;padding:30px;width:1440px}
      .it{display:grid;gap:8px} .n{font-size:22px;font-weight:700;color:#0c0e12;display:flex;gap:12px;align-items:baseline} .n span{font-weight:500;font-size:17px;color:#1f2329}
      .pr{display:flex;gap:10px} .pr img{width:345px;height:auto;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.35)}</style></head><body><div class="g">${items}</div></body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.locator('.g').screenshot({ path: path.join(out, `catalogo_${c + 1}.png`) });
  }
  await b.close();
})();
