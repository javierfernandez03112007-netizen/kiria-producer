// Imágenes de la comunidad de WhatsApp de kiria.ai (estilo de los vídeos: negro, globo de alambre, letra técnica y dorado):
//   bienvenida.png (1080×1080, primer aviso fijado) · lanzamiento.png (1080×1080, domingo 8 a las 12:00) · historia_comunidad.png (1080×1920,
//   historia de Instagram con el hueco para el sticker de enlace). Uso: node projects/lanzamiento/whatsapp/hacer_imagenes.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const here = __dirname, FD = path.resolve(here, '../../../engine/fonts');
const data = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;      // todo incrustado: una página en blanco no puede leer archivos locales
const font = name => data(path.join(FD, name), name.endsWith('.otf') ? 'font/otf' : 'font/ttf');
const GLOBE = data(path.join(here, 'foto_canal.png'), 'image/png');
const css = `
@font-face{font-family:Inter;src:url(${font('Inter-Black.otf')});font-weight:900}
@font-face{font-family:Inter;src:url(${font('Inter-Bold.otf')});font-weight:700}
@font-face{font-family:Inter;src:url(${font('Inter-Medium.otf')});font-weight:500}
@font-face{font-family:Mono;src:url(${font('SpaceMono-Bold.ttf')});font-weight:700}
@font-face{font-family:Mono;src:url(${font('SpaceMono-Regular.ttf')});font-weight:400}
*{margin:0;box-sizing:border-box}
body{background:#000;color:#eef2f6;font-family:Inter;overflow:hidden}
.c{position:relative;overflow:hidden;background:#000}
.globe{position:absolute;background:url(${GLOBE}) center/cover no-repeat}
.lab{font:700 26px Mono;letter-spacing:8px;color:#9aa1ab;text-transform:uppercase}
.rule{height:2px;background:rgba(238,242,246,.35)}
.gold{color:#ffc24a}
.box{border:2px solid #ffc24a;border-radius:18px}
`;
const pages = {
  'bienvenida.png': [1080, 1080, `
  <div class="c" style="width:1080px;height:1080px">
    <div class="globe" style="left:150px;top:40px;width:780px;height:780px;opacity:.85"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0,rgba(0,0,0,0) 26%,rgba(0,0,0,0) 46%,#000 78%)"></div>
    <div style="position:absolute;left:72px;right:72px;top:64px;display:flex;justify-content:space-between;align-items:center">
      <div class="lab">Comunidad oficial</div><div class="lab" style="color:#ffc24a">WhatsApp</div></div>
    <div class="rule" style="position:absolute;left:72px;right:72px;top:118px"></div>
    <div style="position:absolute;left:72px;right:72px;bottom:72px">
      <div style="font:500 34px Inter;color:#c9d0da;margin-bottom:6px">Te damos la bienvenida a</div>
      <div style="font:900 132px Inter;letter-spacing:-3px;line-height:1">kiria.ai</div>
      <div style="font:700 40px Inter;line-height:1.3;margin-top:22px;color:#e6ebf2">Vídeos en 3D hechos con IA.<br>Sin una sola cámara.</div>
      <div class="rule" style="margin:38px 0 26px"></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font:700 28px Mono;letter-spacing:4px" class="gold">DOMINGO 8 · 12:00</div>
        <div style="font:700 28px Mono;letter-spacing:4px;color:#eef2f6">ABRIMOS LA WEB</div></div>
    </div>
  </div>`],
  'lanzamiento.png': [1080, 1080, `
  <div class="c" style="width:1080px;height:1080px">
    <div class="globe" style="left:330px;top:-120px;width:900px;height:900px;opacity:.55"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,#000 0,rgba(0,0,0,.7) 45%,rgba(0,0,0,.15) 100%)"></div>
    <div style="position:absolute;left:72px;right:72px;top:64px;display:flex;justify-content:space-between;align-items:center">
      <div class="lab gold">Ya está abierta</div><div class="lab">Domingo 8 · 12:00</div></div>
    <div class="rule" style="position:absolute;left:72px;right:72px;top:118px"></div>
    <div style="position:absolute;left:72px;right:72px;top:250px">
      <div style="font:900 128px Inter;letter-spacing:-3px;line-height:1">kiriaai.com</div>
      <div style="font:700 40px Inter;line-height:1.32;margin-top:28px;color:#e6ebf2">Vídeos en 3D hechos con IA<br>para tu cuenta, tus productos<br>o tu negocio.</div>
    </div>
    <div class="box" style="position:absolute;left:72px;right:72px;bottom:150px;padding:30px 36px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font:700 24px Mono;letter-spacing:6px;color:#9aa1ab">SOLO PARA LA COMUNIDAD</div>
        <div style="font:900 64px Inter;margin-top:6px">10 % extra</div></div>
      <div style="text-align:right"><div style="font:700 24px Mono;letter-spacing:6px;color:#9aa1ab">CÓDIGO</div>
        <div style="font:700 60px Mono;letter-spacing:6px;margin-top:4px" class="gold">KIRIA10</div></div>
    </div>
    <div style="position:absolute;left:72px;right:72px;bottom:80px;font:500 28px Inter;color:#9aa1ab">Hasta el domingo 15 de noviembre a las 23:59</div>
  </div>`],
  'historia_comunidad.png': [1080, 1920, `
  <div class="c" style="width:1080px;height:1920px">
    <div class="globe" style="left:140px;top:215px;width:800px;height:800px;opacity:.9"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,#000 0,rgba(0,0,0,0) 16%,rgba(0,0,0,0) 44%,#000 56%)"></div>
    <div style="position:absolute;left:80px;right:80px;top:150px;display:flex;justify-content:space-between;align-items:center">
      <div class="lab">Comunidad de WhatsApp</div><div class="lab gold">Gratis</div></div>
    <div class="rule" style="position:absolute;left:80px;right:80px;top:206px"></div>
    <div style="position:absolute;left:80px;right:80px;top:990px">
      <div style="font:900 104px Inter;letter-spacing:-2px;line-height:1.02">Únete a<br>kiria.ai</div>
      <div style="font:700 42px Inter;line-height:1.3;margin-top:30px;color:#e6ebf2">Avisos, vídeos nuevos y ventajas<br>antes que nadie.</div>
      <div style="font:700 30px Mono;letter-spacing:3px;margin-top:34px" class="gold">DOMINGO 8 · 12:00 · ABRIMOS LA WEB<br>10 % EXTRA SOLO PARA LA COMUNIDAD</div>
    </div>
    <div style="position:absolute;left:80px;right:80px;bottom:230px;height:150px;border:3px dashed rgba(238,242,246,.55);border-radius:28px;display:flex;align-items:center;justify-content:center;font:700 28px Mono;letter-spacing:5px;color:#9aa1ab">↓ AQUÍ EL STICKER DE ENLACE ↓</div>
  </div>`],
};
(async () => {
  const b = await chromium.launch();
  for (const [name, [w, h, html]] of Object.entries(pages)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(here, name) });
    await p.close(); console.log('→', name);
  }
  await b.close();
})();
