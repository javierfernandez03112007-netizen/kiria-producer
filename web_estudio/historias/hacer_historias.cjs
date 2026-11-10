// Historias de Instagram de kiria.ai (10-11-2026). Javi: «contenido de calidad para las historias, sobre todo promocionando el producto…
// la tarjeta de kiria con el QR, una foto con preguntas, información para empresas». 1080 × 1920 (formato de historia), estilo de
// kiriaai.com y de las tarjetas: Anton (marca), Instrument Sans, JetBrains Mono y el degradado rojo → violeta → azul. Sin precios.
// Zona segura: nada importante por encima de y = 250 ni por debajo de y = 1600 (ahí van la barra de Instagram y la caja de respuesta).
// Uso: node hacer_historias.cjs  → png/01_*.png … y png/todas.jpg (hoja de contactos).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname, out = path.join(dir, 'png');
fs.mkdirSync(out, { recursive: true });
const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, 'img', f)).toString('base64');
const QR = fs.readFileSync(path.join(dir, '..', 'tarjetas', 'qr.svg'), 'utf8');

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=block');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#07080c}
.s{position:relative;width:1080px;height:1920px;overflow:hidden;color:#f2f4f8;font-family:'Instrument Sans',sans-serif;
  background:radial-gradient(1200px 900px at 100% 0%,#151c34 0%,rgba(7,8,12,0) 60%),radial-gradient(900px 700px at 0% 100%,#2a0f18 0%,rgba(7,8,12,0) 65%),#07080c}
.s.light{color:#0c0e12;background:#f4f4f0}
.brand{position:absolute;left:84px;top:150px;font-family:Anton;font-size:46px;letter-spacing:.5px}
.brand i{font-style:normal;color:#ff4d61}
.tag{position:absolute;right:84px;top:166px;font-family:'JetBrains Mono';font-size:22px;letter-spacing:3px;color:#8b94a4;text-transform:uppercase}
.k{font-family:'JetBrains Mono';font-weight:500;font-size:26px;letter-spacing:4px;text-transform:uppercase;color:#8b94a4}
.h{font-family:Anton;font-size:150px;line-height:.95;text-transform:uppercase;letter-spacing:.5px}
.h2{font-family:Anton;font-size:104px;line-height:1;text-transform:uppercase}
.g{background:linear-gradient(95deg,#ff4d61 0%,#b45cff 52%,#4f7dff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.bar{width:200px;height:10px;border-radius:6px;background:linear-gradient(95deg,#ff4d61,#b45cff 52%,#4f7dff)}
.p{font-size:44px;line-height:1.3;color:#c2c8d3}
.light .p{color:#3a404a}
.pill{display:inline-block;padding:22px 40px;border-radius:999px;font-weight:700;font-size:40px;background:#f2f4f8;color:#07080c}
.pill.g2{background:linear-gradient(95deg,#ff4d61,#b45cff 52%,#4f7dff);color:#fff}
.url{font-family:'JetBrains Mono';font-size:34px;letter-spacing:6px;color:#c2c8d3}
.abs{position:absolute}
.shot{border-radius:36px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.06)}
.shot img{display:block;width:100%;height:100%;object-fit:cover}
.phone{position:absolute;border-radius:70px;padding:22px;background:#111521;box-shadow:0 50px 140px rgba(0,0,0,.7),inset 0 0 0 3px #2a3146}
.phone .scr{border-radius:50px;overflow:hidden;width:100%;height:100%}
.phone img{width:100%;height:100%;object-fit:cover;display:block}
.slot{position:absolute;left:120px;right:120px;border:0;border-radius:40px;display:flex;align-items:center;
  justify-content:center;font-family:'JetBrains Mono';font-size:26px;letter-spacing:3px;color:transparent;text-transform:uppercase}
.light .slot{color:transparent}
.num{font-family:Anton;font-size:120px;line-height:1}
.row{display:flex;gap:44px;align-items:flex-start}
.row .t{font-size:48px;font-weight:700;line-height:1.15}
.row .d{font-size:36px;color:#c2c8d3;line-height:1.3;margin-top:10px}
.qa{border-top:2px solid #222838;padding:34px 0}
.qa .q{font-weight:700;font-size:46px}
.qa .a{font-size:40px;color:#c2c8d3;margin-top:12px;line-height:1.3}
`;

const brand = (tag = '') => `<div class="brand">kiria<i>.</i>ai</div>${tag ? `<div class="tag">${tag}</div>` : ''}`;
const card3d = `
<div class="abs" style="left:0;right:0;top:650px;height:760px;perspective:2400px">
  <div class="abs" style="left:70px;top:0;width:640px;height:414px;transform:rotateX(14deg) rotateZ(-8deg) rotateY(-12deg);border-radius:20px;overflow:hidden;box-shadow:0 50px 110px rgba(0,0,0,.7)">
    <img src="${img('noche_frente.jpg')}" style="width:100%;height:100%;object-fit:cover"></div>
  <div class="abs" style="left:330px;top:290px;width:660px;height:427px;transform:rotateX(10deg) rotateZ(5deg) rotateY(10deg);border-radius:20px;overflow:hidden;box-shadow:0 60px 140px rgba(0,0,0,.75)">
    <img src="${img('noche_dorso.jpg')}" style="width:100%;height:100%;object-fit:cover"></div>
</div>`;

const S = [
  // 1 · La tarjeta con el QR
  ['01_tarjeta', `<div class="s">${brand('Estudio de vídeo 3D')}
    <div class="abs" style="left:84px;top:300px;right:84px">
      <div class="k">¿Te ha llegado nuestra tarjeta?</div>
      <div class="h2" style="margin-top:26px">Escanea el QR<br><span class="g">y prueba la web</span></div></div>
    ${card3d}
    <div class="abs" style="left:84px;right:84px;top:1450px"><div class="p">Sube una foto de tu producto y míralo en 3D en un minuto. Gratis.</div></div>
    <div class="abs url" style="left:0;right:0;top:1600px;text-align:center">kiriaai.com</div></div>`],

  // 2 · Esto no es una foto
  ['02_producto_3d', `<div class="s">${brand('Tu producto, en 3D')}
    <div class="abs" style="left:84px;top:290px;right:84px"><div class="h">Esto no<br>es una <span class="g">foto</span>.</div></div>
    <div class="shot abs" style="left:84px;right:84px;top:640px;height:860px"><img src="${img('tarro.jpg')}" style="object-position:50% 60%"></div>
    <div class="abs" style="left:84px;right:84px;top:1530px"><div class="p">Es un producto en 3D, hecho con <b style="color:#f2f4f8">una sola foto</b>. Pruébalo con el tuyo ↓</div></div></div>`],

  // 3 · Seis formas de enseñarlo
  ['03_presentaciones', `<div class="s">${brand('Tu producto, en 3D')}
    <div class="abs" style="left:84px;top:300px;right:84px"><div class="k">Una foto · seis formas</div>
      <div class="h2" style="margin-top:22px">El mismo producto.<br><span class="g">Como tú quieras.</span></div></div>
    <div class="abs" style="left:84px;right:84px;top:640px;display:grid;grid-template-columns:1fr 1fr;gap:28px">
      <div class="shot" style="height:560px"><img src="${img('caja.jpg')}" style="object-position:50% 55%"></div>
      <div class="shot" style="height:560px"><img src="${img('lata.jpg')}" style="object-position:50% 55%"></div>
      <div class="shot" style="height:300px;grid-column:span 2"><img src="${img('tarro.jpg')}" style="object-position:50% 62%"></div></div>
    <div class="abs" style="left:84px;right:84px;top:1540px"><div class="p">Caja · bolsa · tarro · botella · lata · taza</div></div></div>`],

  // 4 · Cómo funciona
  ['04_como_funciona', `<div class="s">${brand('Cómo trabajamos')}
    <div class="abs" style="left:84px;top:300px;right:84px"><div class="h2">Así de fácil.</div><div class="bar" style="margin-top:34px"></div></div>
    <div class="abs" style="left:84px;right:84px;top:600px;display:flex;flex-direction:column;gap:70px">
      <div class="row"><div class="num g">1</div><div><div class="t">Nos mandas una foto</div><div class="d">De tu producto o de tu local, y qué quieres contar. No tienes que grabar nada.</div></div></div>
      <div class="row"><div class="num g">2</div><div><div class="t">La convertimos en un vídeo 3D</div><div class="d">Con movimiento, luz, voz en español, subtítulos y sonido. Pensado para que la gente se pare.</div></div></div>
      <div class="row"><div class="num g">3</div><div><div class="t">En 12 a 72 horas, listo</div><div class="d">Para Instagram, TikTok, WhatsApp o tu web. Tú solo lo subes.</div></div></div></div>
    <div class="abs" style="left:84px;right:84px;top:1530px"><span class="pill g2">Escríbenos por privado</span></div></div>`],

  // 5 · El dato: 3,3 millones sin cámaras
  ['05_dato', `<div class="s">${brand('Resultados reales')}
    <div class="abs" style="left:84px;top:290px;right:84px"><div class="h" style="font-size:210px"><span class="g">3,3 M</span></div>
      <div class="p" style="margin-top:18px;color:#f2f4f8;font-size:50px;font-weight:600">visualizaciones en Instagram.<br>Ni una sola cámara.</div></div>
    <div class="phone" style="left:300px;top:760px;width:480px;height:780px"><div class="scr"><img src="${img('derecho.jpg')}"></div></div>
    <div class="abs" style="left:84px;right:84px;top:1570px"><div class="p" style="font-size:38px">Todos nuestros reels están hechos con IA en este estudio. Datos de Metricool, noviembre de 2026.</div></div></div>`],

  // 6 · Encuesta
  ['06_encuesta', `<div class="s">${brand('Pregunta del día')}
    <div class="abs" style="left:84px;top:330px;right:84px"><div class="k">Si tienes un negocio</div>
      <div class="h2" style="margin-top:26px">¿Qué te frena<br>para subir <span class="g">vídeos</span>?</div></div>
    <div class="slot" style="top:820px;height:420px">Pon aquí la encuesta</div>
    <div class="abs" style="left:84px;right:84px;top:1330px"><div class="p">Opciones: «No tengo tiempo» · «No sé qué contar».<br>Mañana respondemos a lo que más votéis.</div></div></div>`],

  // 7 · Caja de preguntas
  ['07_preguntas', `<div class="s light">${brand('Para negocios').replace('class="tag"','class="tag" style="color:#6c737e"')}
    <div class="abs" style="left:84px;top:330px;right:84px"><div class="k" style="color:#6c737e">Respondemos todas</div>
      <div class="h2" style="margin-top:26px">Pregúntanos lo que<br>quieras sobre <span class="g">vídeos</span><br>para tu negocio.</div></div>
    <div class="slot" style="top:900px;height:420px">Pon aquí la caja de preguntas</div>
    <div class="abs" style="left:84px;right:84px;top:1400px"><div class="p">Cuánto tarda, qué necesitas, qué funciona en Instagram… Te contestamos aquí en historias.</div></div></div>`],

  // 8 · Preguntas típicas
  ['08_dudas', `<div class="s">${brand('Lo que nos preguntan')}
    <div class="abs" style="left:84px;top:300px;right:84px"><div class="h2">Tus dudas,<br><span class="g">resueltas.</span></div></div>
    <div class="abs" style="left:84px;right:84px;top:600px">
      <div class="qa"><div class="q">¿Tengo que grabar algo?</div><div class="a">No. Con una foto de tu producto o de tu local basta.</div></div>
      <div class="qa"><div class="q">¿Se nota que es IA?</div><div class="a">Se hace con IA, pero el diseño lo hacemos a mano, con tu producto real.</div></div>
      <div class="qa"><div class="q">¿Cuánto tarda?</div><div class="a">Entre 12 y 72 horas desde que lo pides.</div></div>
      <div class="qa" style="border-bottom:2px solid #222838"><div class="q">¿Lo subís vosotros?</div><div class="a">Te lo damos listo para subir. Si quieres, también lo publicamos en kiria.ai.</div></div></div></div>`],

  // 9 · Webs
  ['09_webs', `<div class="s">${brand('Páginas web')}
    <div class="abs" style="left:84px;top:290px;right:84px"><div class="h2">¿Tu negocio<br>no tiene <span class="g">web</span>?</div>
      <div class="p" style="margin-top:22px">Te la hacemos. Y ves el diseño antes de publicarla.</div></div>
    <div class="phone" style="left:270px;top:760px;width:540px;height:800px"><div class="scr"><img src="${img('web.jpg')}" style="object-position:50% 0"></div></div>
    <div class="abs url" style="left:0;right:0;top:1600px;text-align:center">kiriaai.com</div></div>`],

  // 10 · Código KIRIA10
  ['10_kiria10', `<div class="s">${brand('Solo noviembre')}
    <div class="abs" style="left:84px;top:330px;right:84px"><div class="k">Código de descuento</div>
      <div style="margin-top:40px;display:inline-block;padding:30px 50px;border:4px dashed #ff4d61;border-radius:30px"><div class="h" style="font-size:170px"><span class="g">KIRIA10</span></div></div>
      <div class="h2" style="margin-top:60px">10 % menos</div>
      <div class="p" style="margin-top:20px">en tu pedido hasta el 30 de noviembre. Lo escribes en la página de pago.</div></div>
    <div class="shot abs" style="left:84px;right:84px;top:1060px;height:480px"><img src="${img('tarro.jpg')}" style="object-position:50% 68%"></div>
    <div class="abs url" style="left:0;right:0;top:1580px;text-align:center">kiriaai.com</div></div>`],

  // 11 · Personas + IA
  ['11_personas_ia', `<div class="s light">${brand('Cómo trabajamos').replace('class="tag"','class="tag" style="color:#6c737e"')}
    <div class="abs" style="left:84px;top:300px;right:84px"><div class="h2">Personas <span class="g">+</span> IA</div></div>
    <div class="shot abs" style="left:40px;right:40px;top:520px;height:560px;border-radius:30px;box-shadow:0 30px 80px rgba(0,0,0,.18)"><img src="${img('cabezas.jpg')}"></div>
    <div class="abs" style="left:84px;right:84px;top:1170px">
      <div class="p" style="font-size:46px"><b style="color:#e5243f">La idea, el guion y el criterio</b> son nuestros.</div>
      <div class="p" style="font-size:46px;margin-top:24px"><b style="color:#2357ff">La voz, el 3D y la velocidad</b>, de la IA.</div>
      <div class="p" style="margin-top:40px;font-size:38px">Por eso un vídeo profesional ya no necesita un rodaje.</div></div></div>`],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const [name, html] of S) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, name + '.png') });
    console.log('ok', name);
  }
  await browser.close();
})();
