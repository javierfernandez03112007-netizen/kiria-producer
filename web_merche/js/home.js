// La portada: una sucesión de escenas con movimiento.
import { SHOP, NEEDS } from './config.js';
import { PRODUCTS, byId, card, eur, esc, picture } from './catalog.js';
import * as fx from './fx.js';

const M = SHOP.media;
const count = need => PRODUCTS.filter(p => p.needs.includes(need)).length;
const first = need => PRODUCTS.find(p => p.needs.includes(need) && p.price != null && SHOP.best.includes(p.id)) || PRODUCTS.find(p => p.needs.includes(need) && p.price != null);
const PLAY = '<svg viewBox="0 0 12 12"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor"/></svg>';

// ---------- escenas ----------
const hero = () => `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-txt">
      <div class="eyebrow rise" style="--i:0">Peluquería en Motril · más de 20 años</div>
      <h1 class="rise" style="--i:1">Lo que usamos en el salón, <em>ahora en tu casa.</em></h1>
      <p class="lead rise" style="--i:2">Herramientas ghd y cuidado Schwarzkopf Professional, elegidos por Merche.
        Y cuando compras, <b>ella te enseña a usarlo</b> con su vídeo.</p>
      <div class="ctas rise" style="--i:3">
        <a class="btn" href="#/tienda">Ver la tienda</a>
        <a class="btn ghost" href="#/?s=cual-ghd">¿Cuál es mi ghd?</a>
      </div>
      <div class="by-merche rise" style="--i:4"><span class="av">M</span><span><b>${SHOP.owner}</b><br>Peluquera de novias y eventos</span></div>
    </div>
    <figure class="hero-media rise" style="--i:2">
      ${M.heroVideo ? `<video src="${esc(M.heroVideo)}" poster="${esc(M.heroPoster)}" autoplay muted loop playsinline data-py="-.06"></video>`
    : `<img src="${esc(M.heroPoster)}" alt="Bolsa negra de Beauty Salon Merche con el nombre en dorado sobre un mostrador de mármol" width="1200" height="1500" fetchpriority="high" data-py="-.06">
      <figcaption><span class="dot"></span><span class="txt">Aquí irá el vídeo de Merche en su mostrador</span> <span class="pend">vídeo pendiente</span></figcaption>`}
    </figure>
  </div>
  <a class="scroll-cue rise" style="--i:6" href="#/?s=mas-vendido" aria-label="Bajar a lo más vendido"><span>Baja</span><i></i></a>
</section>`;

const ticker = (items, cls = '') => `
<div class="ticker ${cls}" aria-hidden="true"><div class="tr">${[0, 1].map(() => items.map(t => `<span>${t}</span>`).join('')).join('')}</div></div>`;

const best = () => {
  const ps = SHOP.best.map(byId).filter(Boolean);
  return `
<section class="hscroll best" id="mas-vendido">
  <div class="hs-sticky">
    <div class="wrap hs-head">
      <div><p class="eyebrow">Lo más vendido <span class="pend">selección provisional</span></p>
        <h2 class="sec-title" data-words data-rv>Lo que más <em>se llevan.</em></h2></div>
      <a class="btn ghost sm" href="#/tienda">Ver todo (${PRODUCTS.length})</a>
    </div>
    <div class="hs-track" data-drag>
      ${ps.map((p, i) => card(p, { n: i + 1 })).join('')}
      <a class="card more" href="#/tienda"><span class="serif">Toda la<br><em class="it">tienda</em><small>${PRODUCTS.length} productos</small></span><i>→</i></a>
    </div>
    <div class="wrap"><div class="hs-bar"><i></i></div></div>
  </div>
</section>`;
};

const needs = () => {
  const ns = NEEDS.filter(n => n.home && count(n.id));
  return `
<section class="wrap needs" id="necesidades">
  <div class="needs-head"><p class="eyebrow" data-rv>Empieza por aquí</p><h2 class="sec-title" data-words data-rv>¿Qué necesita <em>tu pelo?</em></h2></div>
  <div class="needs-grid">
    <ul class="needs-list">
      ${ns.map((n, i) => `<li data-rv style="--d:${i * 50}ms"><a href="#/tienda?need=${n.id}" data-need="${n.id}" class="${i ? '' : 'on'}">
        <span class="k">${String(i + 1).padStart(2, '0')}</span><b>${n.label}</b><small>${n.sub}</small><em>${count(n.id)}</em><i>→</i></a></li>`).join('')}
    </ul>
    <div class="needs-stage" aria-hidden="true">
      ${ns.map((n, i) => { const p = first(n.id); return `<div class="pane ${i ? '' : 'on'}" data-pane="${n.id}">${p ? picture(p, { label: false }) : ''}<span>${n.label}</span></div>`; }).join('')}
    </div>
  </div>
</section>`;
};

const ghd = () => {
  const g = SHOP.ghdGuide.map(x => ({ ...x, p: byId(x.id) })).filter(x => x.p);
  return `
<section class="ghd-scene" id="cual-ghd">
  <div class="ghd-sticky">
    <div class="ghd-bg"></div>
    <div class="wrap ghd-grid">
      <div class="ghd-left">
        <p class="eyebrow">ghd · guía rápida</p>
        <h2 class="sec-title">¿Cuál es <em>tu ghd?</em></h2>
        <ol class="ghd-tabs">
          ${g.map((x, i) => `<li><button type="button" data-ghd="${i}" class="${i ? '' : 'on'}"><span>${esc(x.p.name)}</span><em>${eur(x.p.price)}</em></button></li>`).join('')}
        </ol>
        <p class="note">Guía orientativa. ¿Dudas? Merche te dice cuál es la tuya. <span class="pend">WhatsApp pendiente</span></p>
      </div>
      <div class="ghd-stage">
        <div class="ghd-ring"></div>
        ${g.map((x, i) => `<div class="ghd-art ${i ? '' : 'on'}" data-art="${i}">${picture(x.p, { label: false, bg: false })}</div>`).join('')}
        <div class="ghd-count"><b>01</b><span>/ ${String(g.length).padStart(2, '0')}</span></div>
      </div>
      <div class="ghd-right">
        ${g.map((x, i) => `<div class="ghd-info ${i ? '' : 'on'}" data-info="${i}">
          <p class="si">Para ti si <b>${esc(x.si)}</b></p>
          <ul>${x.p.benefits.slice(0, 3).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
          <div class="ctas"><button class="btn light" type="button" data-add="${x.p.id}" data-from=".ghd-art.on">Añadir · ${eur(x.p.price)}</button><a class="btn ghost inv" href="#/p/${x.p.id}">Ver ficha</a></div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>`;
};

const news = () => {
  const ps = PRODUCTS.filter(p => p.new);
  if (ps.length < 3) return '';
  return `
<section class="news" id="novedades">
  <h2 class="visually-hidden">Novedades</h2>
  ${ticker(['Novedades', 'Lo último', 'Novedades', '2026'], 'big')}
  <div class="rail" data-drag>
    ${ps.map((p, i) => `<div class="rail-card" data-rv style="--d:${i * 70}ms">${card(p)}</div>`).join('')}
    <div class="rail-card" data-rv style="--d:${ps.length * 70}ms"><a class="card more" href="#/tienda"><span class="serif">Ver<br><em class="it">todo</em></span><i>→</i></a></div>
  </div>
</section>`;
};

const teach = () => `
<section class="wrap teach" id="tutorial">
  <div class="teach-txt">
    <p class="eyebrow" data-rv>Lo que no hace una perfumería</p>
    <h2 class="sec-title" data-words data-rv>Compras, y Merche <em>te enseña.</em></h2>
    <ol class="teach-steps">
      <li data-rv style="--d:0ms"><span>1</span><div><b>Eliges</b><p>Con su consejo en cada producto: para quién es y para quién no.</p></div></li>
      <li data-rv style="--d:120ms"><span>2</span><div><b>Te llega</b><p>Original, en su bolsa. O lo recoges gratis en el salón.</p></div></li>
      <li data-rv style="--d:240ms"><span>3</span><div><b>Merche te enseña</b><p>Recibes por correo su vídeo: cómo usarlo, el error típico y su truco de peluquera.</p></div></li>
    </ol>
  </div>
  <div class="phone" data-py=".06">
    <div class="screen">
      <div class="mail"><small>Beauty Salon Merche</small><b>Tu tutorial ya está aquí</b></div>
      <div class="vid">${M.tutorialTeaser ? `<video src="${esc(M.tutorialTeaser)}" autoplay muted loop playsinline></video>` : `<div class="ring">${PLAY}</div><span class="pend">vídeos de Merche pendientes</span>`}</div>
      <div class="bars"><i></i><i></i><i style="width:55%"></i></div>
      <div class="pill">Ver el vídeo</div>
    </div>
  </div>
</section>`;

const LINES = [
  { k: 'Bonacure', t: 'Bonacure', d: 'El cuidado de cada día: reparar, hidratar, dar volumen y proteger el color.' },
  { k: 'Fibre Clinix', t: 'Fibre Clinix', d: 'Reparación intensa para pelo muy procesado.' },
  { k: 'BLONDME', t: 'BLONDME', d: 'Todo para el rubio: matizar, reparar y dar brillo.' },
  { k: 'Scalp Clinix', t: 'Scalp Clinix', d: 'El cuero cabelludo: caída, caspa, grasa y sensibilidad.' },
  { k: 'OSiS', t: 'OSiS', d: 'Peinado: textura, volumen, fijación y protección del calor.' },
  { k: 'Session Label', t: 'Session Label', d: 'Acabados de peluquera para recogidos y eventos.' },
  { k: 'Silhouette', t: 'Silhouette', d: 'Fijación muy fuerte que no se nota.' },
];
const sk = () => {
  const ls = LINES.map(l => ({ ...l, ps: PRODUCTS.filter(p => p.brand === 'schwarzkopf' && p.line.includes(l.k)) })).filter(l => l.ps.length);
  return `
<section class="sk-scene" id="schwarzkopf">
  <div class="wrap sk-head"><p class="eyebrow" data-rv>Schwarzkopf Professional</p><h2 class="sec-title" data-words data-rv>El cuidado <em>del salón.</em></h2></div>
  <div class="wrap"><div class="panels" data-drag>
    ${ls.map((l, i) => `<a class="panel ${i ? '' : 'on'}" href="#/tienda?marca=schwarzkopf&linea=${encodeURIComponent(l.k)}" data-panel>
      <span class="v">${l.t}</span>
      <div class="in"><small>${l.ps.length} producto${l.ps.length > 1 ? 's' : ''}</small><h3>${l.t}</h3><p>${l.d}</p>
        <div class="minis">${l.ps.slice(0, 3).map(p => `<span>${picture(p, { label: false })}</span>`).join('')}</div><span class="go">Ver la línea</span></div>
    </a>`).join('')}
  </div></div>
</section>`;
};

const quiz = () => `
<section class="wrap"><div class="quiz" id="rutina">
  <div><p class="eyebrow">30 segundos</p><h2>Tu rutina, <em class="it">a tu medida.</em></h2>
    <p>Tres preguntas y te proponemos qué usar. Es una recomendación orientativa: si quieres, Merche te lo mira en el salón.</p></div>
  <div class="q-box"></div>
</div></section>`;

const packs = () => {
  const ps = SHOP.packs.map(k => ({ ...k, ps: k.items.map(byId).filter(p => p && p.price != null) })).filter(k => k.ps.length === k.items.length);
  const sets = PRODUCTS.filter(p => p.cat === 'pack' && p.price != null);
  if (!ps.length && !sets.length) return '';
  return `
<section class="packs" id="packs">
  <div class="wrap hs-head"><div><p class="eyebrow" data-rv>Listos para regalar</p><h2 class="sec-title" data-words data-rv>Los packs <em>de Merche.</em></h2></div><span class="hint">Arrastra →</span></div>
  <div class="rail" data-drag>
    ${ps.map((k, i) => `<article class="pack" data-rv style="--d:${i * 80}ms">
      <div class="pk-art">${k.ps.map(p => `<span>${picture(p, { label: false })}</span>`).join('')}</div>
      <div class="pk-body"><h3>${k.name}</h3><p>${k.sub}</p>
        <ul>${k.ps.map(p => `<li><a href="#/p/${p.id}">${esc(p.name)}</a><span>${eur(p.price)}</span></li>`).join('')}</ul>
        <button class="btn block" type="button" data-add="${k.items.join(',')}">Añadir el pack · ${eur(k.ps.reduce((n, p) => n + p.price, 0))}</button></div>
    </article>`).join('')}
    ${sets.map((p, i) => `<div class="rail-card" data-rv style="--d:${(ps.length + i) * 80}ms">${card(p)}</div>`).join('')}
  </div>
</section>`;
};

const merche = () => `
<section class="merche" id="novias">
  <div class="giant" aria-hidden="true" data-px="-.35">Merche Herrera · Merche Herrera · Merche Herrera</div>
  <div class="wrap salon">
    ${M.merchePhoto ? `<div class="ph has" data-rv><img src="${esc(M.merchePhoto)}" alt="${SHOP.owner} en su salón de Motril" loading="lazy"></div>`
    : `<div class="ph" data-rv><b>M</b><span class="pend">foto de Merche en el salón · pendiente</span></div>`}
    <div>
      <p class="eyebrow" data-rv>Detrás del mostrador</p>
      <h2 data-words data-rv>Más de 20 años <em class="it">peinando novias.</em></h2>
      <p data-rv>${SHOP.owner} es peluquera en Motril y su especialidad son las novias y los eventos: recogidos, ondas y el asesoramiento de imagen para el gran día.
        En esta tienda solo está lo que ella usa y recomienda en el salón.</p>
      <div class="facts" data-rv><div><b>+20</b><span>años de oficio</span></div><div><b>Motril</b><span>Costa Tropical, Granada</span></div><div><b>Novias</b><span>y eventos, su especialidad</span></div></div>
      <div class="ctas" data-rv><a class="btn" href="#/tienda?need=fijacion">El kit de novia e invitada</a><a class="btn ghost" href="#/?s=contacto">Pedir cita <span class="pend">WhatsApp</span></a></div>
    </div>
  </div>
</section>`;

const ICON = {
  ok: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/>', play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>', pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  back: '<path d="M4 9h11a5 5 0 0 1 0 10h-4"/><path d="m8 5-4 4 4 4"/>',
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const trust = () => `
<section class="wrap"><div class="trust" data-rv>
  <div>${ico('ok')}<b>Producto original</b><span>De distribución oficial, con su garantía. <span class="pend">confirmar con las marcas</span></span></div>
  <div>${ico('play')}<b>El tutorial de Merche</b><span>Con cada compra, su vídeo para que le saques partido.</span></div>
  <div>${ico('truck')}<b>Envío 24/48 h</b><span>A la península. Gratis desde ${eur(SHOP.shipping.freeFrom)}. <span class="pend">por confirmar</span></span></div>
  <div>${ico('pin')}<b>Recogida en el salón</b><span>Gratis, en Motril.</span></div>
  <div>${ico('back')}<b>14 días para devolverlo</b><span>Como marca la ley.</span></div>
</div></section>`;

const faq = () => `
<section class="wrap faq" id="preguntas">
  <div><p class="eyebrow" data-rv>Preguntas frecuentes</p><h2 class="sec-title" data-words data-rv>Lo que nos <em>preguntan.</em></h2></div>
  <div data-rv>
    <details open><summary>¿Los productos son originales?</summary><p>Sí. Son los mismos que usamos y vendemos en el salón, comprados a la distribución oficial de cada marca. Las herramientas ghd llevan su holograma con número de serie. <span class="pend">añadir «salón autorizado» cuando ghd lo confirme</span></p></details>
    <details><summary>¿Cuánto tarda en llegar?</summary><p>Preparamos el pedido el mismo día si lo haces antes de las ${SHOP.shipping.cutoffHour}:00 y llega en 24–72 h laborables a la península. También puedes recogerlo gratis en el salón, en Motril. <span class="pend">plazos por confirmar</span></p></details>
    <details><summary>¿Qué es el tutorial de Merche?</summary><p>Un vídeo corto en el que Merche te explica cómo usar lo que has comprado: los pasos, el error más habitual y su truco. Te llega por correo después de la compra.</p></details>
    <details><summary>¿Puedo devolverlo?</summary><p>Tienes 14 días desde que lo recibes. Por higiene, los productos de cuidado precintados no se pueden devolver una vez abiertos. Las herramientas tienen la garantía legal de 3 años.</p></details>
    <details><summary>¿Cómo puedo pagar?</summary><p>Con tarjeta, Apple Pay o Google Pay, en una pasarela segura. <span class="pend">Bizum por confirmar</span></p></details>
    <details><summary>No sé qué elegir, ¿me ayudáis?</summary><p>Claro: es lo que mejor sabemos hacer. Haz el test de rutina o escríbenos y Merche te aconseja. <span class="pend">WhatsApp pendiente</span></p></details>
  </div>
</section>`;

export function html() {
  return hero()
    + ticker(['ghd', 'Schwarzkopf Professional', 'Producto original', 'El tutorial de Merche con cada compra', 'Recogida en el salón'])
    + best() + needs() + ghd() + news() + teach() + sk() + quiz() + packs() + merche() + trust() + faq();
}

// ---------- test de rutina ----------
// cada respuesta: [necesidad, texto, producto preferido si existe]
const Q = [
  { t: '¿Qué te preocupa más?', k: 'need', o: [['reparar', 'Está dañado o se rompe'], ['color', 'El color se me apaga'], ['rubio', 'El rubio se pone amarillo'], ['encrespamiento', 'Se encrespa'], ['volumen', 'Le falta volumen'], ['hidratar', 'Está seco']] },
  { t: '¿Qué herramienta usas más?', k: 'tool', o: [['alisar', 'La plancha', 'sk-osis-flatliner'], ['secar', 'El secador', 'ghd-bodyguard'], ['rizar', 'La tenacilla', 'ghd-bodyguard'], ['', 'Casi ninguna']] },
  { t: '¿Y para peinarte?', k: 'style', o: [['fijacion', 'Que el peinado aguante', 'sk-osis-session'], ['volumen', 'Volumen y textura', 'sk-osis-dust-it'], ['brillo', 'Brillo y suavidad', 'sk-osis-glow'], ['', 'Lo mínimo']] },
];
// el primero que encaje, probando los tipos por orden de preferencia
function pick(need, cats, used) {
  for (const c of cats) {
    const p = PRODUCTS.find(p => p.price != null && !used.has(p.id) && p.cat === c && p.needs.includes(need) && !/1000 ml/.test(p.size));
    if (p) return p;
  }
}
function routine(a, pref) {
  const used = new Set(), out = [];
  const push = (label, p) => { if (p && p.price != null && !used.has(p.id)) { used.add(p.id); out.push([label, p]); } };
  push('Lavar', pick(a.need, ['champu'], used) || pick('reparar', ['champu'], used));
  push('Cuidar', pick(a.need, ['mascarilla', 'tratamiento', 'acondicionador', 'aceite'], used) || pick('reparar', ['mascarilla', 'tratamiento'], used));
  if (a.tool) push('Proteger del calor', byId(pref.tool) || pick('proteccion-calor', ['protector'], used));
  if (a.style) push('Peinar', byId(pref.style) || pick(a.style, ['laca', 'styling', 'aceite'], used));
  return out;
}
function mountQuiz(box) {
  let step = 0; const a = {}, pref = {};
  const draw = () => {
    if (step < Q.length) {
      const q = Q[step];
      box.innerHTML = `<div class="q-step on"><div class="q-prog">${Q.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
        <h3>${q.t}</h3><div class="opts">${q.o.map(([v, l, pid]) => `<button class="opt" type="button" data-v="${v}" data-p="${pid || ''}"><b>${l}</b></button>`).join('')}</div></div>`;
    } else {
      const r = routine(a, pref);
      box.innerHTML = `<div class="q-step on"><h3>Tu rutina</h3><div class="routine">
        ${r.map(([l, p]) => `<a class="r-item" href="#/p/${p.id}"><span class="th">${picture(p, { label: false })}</span><span><small>${l}</small><b>${esc(p.name)}</b></span><span class="price">${eur(p.price)}</span></a>`).join('')}</div>
        <div class="ctas" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" type="button" data-add="${r.map(x => x[1].id).join(',')}">Añadir la rutina · ${eur(r.reduce((n, x) => n + x[1].price, 0))}</button>
        <button class="btn ghost inv sm" type="button" data-again>Repetir</button></div>
        <p class="note" style="margin-top:14px">Recomendación orientativa a partir de lo que declara cada marca.</p></div>`;
    }
  };
  box.addEventListener('click', e => {
    const o = e.target.closest('.opt'); if (o) { a[Q[step].k] = o.dataset.v; pref[Q[step].k] = o.dataset.p; step++; draw(); return; }
    if (e.target.closest('[data-again]')) { step = 0; draw(); }
  });
  draw();
}

// ---------- al montar la portada ----------
export function mount(root) {
  fx.words(root); fx.reveal(root); fx.tilt(root); fx.drag(root); fx.parallax(root); fx.lazyVideos(root);
  root.querySelectorAll('.ticker').forEach((t, i) => fx.marquee(t, i % 2 ? -1 : 1));
  root.querySelectorAll('.hscroll').forEach(fx.hscroll);

  // necesidades: al pasar por cada una cambia el plano de la derecha
  const nl = root.querySelector('.needs-list');
  if (nl) {
    const show = a => {
      nl.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a));
      root.querySelectorAll('.needs-stage .pane').forEach(p => p.classList.toggle('on', p.dataset.pane === a.dataset.need));
    };
    nl.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a && e.pointerType === 'mouse') show(a); });
    nl.addEventListener('focusin', e => { const a = e.target.closest('a'); if (a) show(a); });
  }

  // ghd: escena fijada por pasos (con el dedo, deslizando a los lados)
  const gs = root.querySelector('.ghd-scene');
  if (gs) {
    const n = gs.querySelectorAll('[data-ghd]').length, cnt = gs.querySelector('.ghd-count b'), tabs = gs.querySelector('.ghd-tabs');
    let cur = 0;
    const set = i => {
      cur = i;
      gs.querySelectorAll('[data-ghd]').forEach((b, k) => b.classList.toggle('on', k === i));
      gs.querySelectorAll('[data-art]').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('past', k < i); });
      gs.querySelectorAll('[data-info]').forEach((b, k) => b.classList.toggle('on', k === i));
      cnt.textContent = String(i + 1).padStart(2, '0');
      const t = tabs.querySelector('.on'); if (t && tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: t.parentElement.offsetLeft - 20, behavior: 'smooth' });
    };
    const go = fx.steps(gs, n, set);
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-ghd]'); if (b) go(+b.dataset.ghd); });
    fx.swipe(gs.querySelector('.ghd-stage'), d => { const i = Math.max(0, Math.min(n - 1, cur + d)); if (i !== cur) go(i); });
    fx.grow(gs);
  }

  // líneas de Schwarzkopf: paneles que se abren
  const ps = root.querySelectorAll('[data-panel]');
  ps.forEach(p => {
    const on = () => ps.forEach(x => x.classList.toggle('on', x === p));
    p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') on(); });
    p.addEventListener('focus', on);
    p.addEventListener('click', e => { if (fx.desktop.matches && !p.classList.contains('on')) { e.preventDefault(); on(); } });
  });

  const qb = root.querySelector('.q-box'); if (qb) mountQuiz(qb);
  if (document.fonts?.ready) document.fonts.ready.then(fx.relayout);
}
