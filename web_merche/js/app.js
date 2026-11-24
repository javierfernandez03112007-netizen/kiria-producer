// Arranque: intro, cabecera, rutas, buscador y pie.
import { SHOP } from './config.js';
import { card, search } from './catalog.js';
import * as fx from './fx.js';
import * as cart from './cart.js';
import * as home from './home.js';
import * as views from './views.js';

const $ = s => document.querySelector(s);
const view = $('#view');
try { history.scrollRestoration = 'manual'; } catch { }

// ---------- rutas (#/tienda?g=…, #/p/<id>, #/caja…) ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, ''), [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/$/, ''), q: new URLSearchParams(qs) };
}
function resolve({ path, q }) {
  const [a, b] = path.split('/');
  if (a === 'tienda') return { kind: 'tienda', make: () => views.tienda(q) };
  if (a === 'p') return { kind: 'p:' + b, make: () => views.producto(b) };
  if (a === 'caja') return { kind: 'caja', make: views.caja };
  if (a === 'gracias') return { kind: 'gracias', make: views.gracias };
  if (a === 'legal') return { kind: 'legal:' + b, make: () => views.legal(b) };
  return { kind: 'home', make: () => ({ title: 'Beauty Salon Merche · Herramientas ghd y Schwarzkopf Professional', html: home.html(), mount: home.mount }) };
}
let current = null;
function toSection(id, smooth = true) {
  const el = id && document.getElementById(id); if (!el) return;
  const pinned = el.classList.contains('hscroll') || el.classList.contains('ghd-scene');
  const y = el.getBoundingClientRect().top + scrollY - (pinned ? 0 : 90);
  scrollTo({ top: y, behavior: smooth && !fx.reduce ? 'smooth' : 'auto' });
}
function show(r, route, keepScroll) {
  const y = scrollY, v = r.make();
  fx.clearView();
  view.innerHTML = v.html; document.title = v.title;
  document.body.dataset.route = r.kind.split(':')[0];
  v.mount(view); fx.relayout();
  const here = location.hash || '#/';
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === here));
  if (keepScroll) scrollTo(0, Math.min(y, Math.max(0, document.documentElement.scrollHeight - innerHeight)));
  else { scrollTo(0, 0); const s = route.q.get('s'); if (r.kind === 'home' && s) requestAnimationFrame(() => toSection(s, false)); }
  current = r.kind;
}
function go(first = false) {
  const route = parse(), r = resolve(route), s = route.q.get('s');
  closeSearch(); $('.mnav').classList.remove('on'); $('.menu-btn').setAttribute('aria-expanded', 'false'); cart.close();
  if (first) return show(r, route);
  if (r.kind === 'home' && current === 'home') { if (s) toSection(s); else scrollTo({ top: 0, behavior: fx.reduce ? 'auto' : 'smooth' }); return; }
  if (r.kind === 'tienda' && current === 'tienda') return show(r, route, true);
  fx.curtain(() => show(r, route));
}
addEventListener('hashchange', () => go());
// pulsar un enlace que ya es la dirección actual (p. ej. «¿Cuál es mi ghd?» dos veces) también debe responder
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/"]');
  if (a && !e.defaultPrevented && a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); go(); }
});

// ---------- avisos ----------
function avisos() {
  const ul = $('.ann ul');
  ul.innerHTML = SHOP.avisos.map(t => `<li>${t}</li>`).join('');
  const li = [...ul.children]; let i = 0; li[0].classList.add('on');
  if (li.length > 1) setInterval(() => {
    const prev = li[i]; prev.classList.remove('on'); prev.classList.add('off'); setTimeout(() => prev.classList.remove('off'), 650);
    i = (i + 1) % li.length; li[i].classList.add('on');
  }, 4000);
}

// ---------- cabecera: se esconde al bajar y vuelve al subir ----------
function cabecera() {
  const h = $('header.top'); let last = 0;
  fx.onScroll(y => {
    h.classList.toggle('scrolled', y > 8);
    if (Math.abs(y - last) > 6) { h.classList.toggle('hide', y > 500 && y > last && !document.body.classList.contains('lock')); last = y; }
  }, true);
  const menu = $('.mnav'), btn = $('.menu-btn');
  btn.addEventListener('click', () => { const o = menu.classList.toggle('on'); btn.setAttribute('aria-expanded', o); document.body.classList.toggle('lock', o); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('on'); btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('lock'); } });
}

// ---------- buscador ----------
const sbox = $('.search');
function closeSearch() { sbox.classList.remove('on'); }
function buscador() {
  const inp = sbox.querySelector('input'), res = sbox.querySelector('.res');
  const draw = () => {
    const all = inp.value.trim() ? search(inp.value) : [], r = all.slice(0, 8);
    res.innerHTML = r.map(p => card(p)).join('') + (all.length > 8 ? `<p class="empty"><a class="btn ghost sm" href="#/tienda?q=${encodeURIComponent(inp.value.trim())}">Ver los ${all.length} resultados</a></p>` : '')
      || (inp.value.trim() ? '<p class="empty">Nada con ese nombre. Prueba con «plancha», «rubio» o «laca».</p>' : '');
  };
  $('#search-btn').addEventListener('click', () => { sbox.classList.add('on'); inp.value = ''; draw(); setTimeout(() => inp.focus(), 60); });
  sbox.querySelector('[data-x]').addEventListener('click', closeSearch);
  inp.addEventListener('input', draw);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) location.hash = '#/tienda?q=' + encodeURIComponent(inp.value.trim()); });
  sbox.querySelector('.hint').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { inp.value = b.textContent; draw(); inp.focus(); } });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
}

// ---------- pie ----------
function pie() {
  $('footer.foot').innerHTML = `<div class="wrap">
    <p class="big" data-px=".12">Merche</p>
    <div class="cols">
      <div><h4>Beauty Salon Merche</h4><p>${SHOP.address} <span class="pend">confirmar</span></p><p>WhatsApp, correo e Instagram <span class="pend">pendiente</span></p></div>
      <div><h4>Tienda</h4><ul><li><a href="#/tienda?g=herramientas">Herramientas</a></li><li><a href="#/tienda?g=cuidado">Cuidado</a></li><li><a href="#/tienda?g=peinado">Peinado</a></li><li><a href="#/?s=packs">Packs y regalos</a></li></ul></div>
      <div><h4>Ayuda</h4><ul><li><a href="#/?s=cual-ghd">¿Cuál es mi ghd?</a></li><li><a href="#/?s=rutina">Tu rutina en 30 s</a></li><li><a href="#/?s=preguntas">Preguntas frecuentes</a></li><li><a href="#/legal/envios">Envíos y devoluciones</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="#/legal/aviso-legal">Aviso legal</a></li><li><a href="#/legal/condiciones">Condiciones de venta</a></li><li><a href="#/legal/privacidad">Privacidad</a></li><li><a href="#/legal/cookies">Cookies</a></li></ul></div>
    </div>
    <div class="legal"><span>© ${new Date().getFullYear()} Beauty Salon Merche · Motril. ghd y Schwarzkopf Professional son marcas de sus titulares.</span>
      <span class="pay"><span>VISA</span><span>MASTERCARD</span><span>APPLE PAY</span><span>GOOGLE PAY</span></span>
      <button class="link" type="button" id="replay">Ver la intro otra vez</button></div>
  </div>`;
  fx.parallax($('footer.foot'), true);
  $('#replay').addEventListener('click', () => intro(true));
}

// ---------- intro: vídeo con IA si existe; si no, la bolsa en 3D ----------
function enter(quick) { if (quick) document.body.classList.add('is-quick'); requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('entered'))); }
let introBusy = false;
async function intro(force = false) {
  let box = $('#intro');
  if (!force && window.__noIntro) { box?.remove(); enter(true); return; }
  if (introBusy) return; introBusy = true;
  try { sessionStorage.setItem('bsm-intro', '1'); } catch { }
  if (force) { // repetirla: se vuelve arriba, a la portada, y la página se prepara para «entrar» otra vez
    if (current !== 'home') { location.hash = '#/'; }
    scrollTo(0, 0); document.body.classList.remove('entered', 'is-quick'); document.documentElement.classList.remove('no-intro');
  }
  if (!box) {
    box = document.createElement('div'); box.id = 'intro'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="stage3d"></div><div class="intro-title"><small>BEAUTY SALON</small><b>Merche</b></div><button id="skip" class="skip" type="button">Saltar</button>';
    document.body.append(box);
  }
  document.body.classList.add('lock');
  let stop = null, finished = false;
  const done = () => {
    if (finished) return; finished = true; introBusy = false;
    box.classList.add('out'); document.body.classList.remove('lock'); enter(false);
    setTimeout(() => box.remove(), 900);
  };
  box.querySelector('.skip').addEventListener('click', () => (stop ? stop() : done()));
  const v = SHOP.intro.video, src = innerWidth / innerHeight < .8 ? v.portrait : v.landscape;
  try {
    const mod = await import('./intro.js');
    box.classList.add('ready');
    stop = src ? mod.playIntroVideo(box.querySelector('.stage3d'), src, done) : await mod.playIntro3D(box.querySelector('.stage3d'), done);
  } catch (e) { console.warn('Intro no disponible:', e); done(); }
}

avisos(); cabecera(); buscador(); cart.init(); pie();
fx.progress(); fx.cursor();
go(true);
intro();
