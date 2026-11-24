// Movimiento: todo lo que hace que la web no sea «una página que baja y ya».
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const desktop = matchMedia('(min-width: 861px)');
const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------- un solo bucle de scroll para todo ----------
const fixed = new Set(), view = new Set(), layouts = new Set();
let ticking = false, lastY = 0, vel = 0;
function run() {
  ticking = false;
  const y = scrollY, vh = innerHeight; vel = y - lastY; lastY = y;
  fixed.forEach(f => f(y, vh, vel)); view.forEach(f => f(y, vh, vel));
}
function ask() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
addEventListener('scroll', ask, { passive: true });
addEventListener('resize', () => { layouts.forEach(f => f()); ask(); });
export const onScroll = (f, keep = false) => { (keep ? fixed : view).add(f); f(scrollY, innerHeight, 0); };
export const onLayout = f => { layouts.add(f); f(); };
export const relayout = () => { layouts.forEach(f => f()); ask(); };
export function clearView() { view.clear(); layouts.clear(); io && io.disconnect(); io = null; loops.forEach(l => (l.dead = true)); loops.clear(); }
export const scrollVel = () => vel;

// ---------- aparecer al entrar en pantalla ----------
let io = null;
export function reveal(root = document) {
  const els = root.querySelectorAll('[data-rv]');
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  io = io || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  els.forEach(e => io.observe(e));
}

// titulares que suben palabra a palabra
export function words(root = document) {
  root.querySelectorAll('[data-words]').forEach(el => {
    if (el.dataset.done) return; el.dataset.done = 1;
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w.trim()) { f.append(w); return; }
          const o = document.createElement('span'); o.className = 'w';
          const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--wi', i++);
          o.append(s); f.append(o);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  });
}

// ---------- escena fijada que se desplaza en horizontal al bajar ----------
export function hscroll(sec) {
  const sticky = sec.querySelector('.hs-sticky'), track = sec.querySelector('.hs-track'), bar = sec.querySelector('.hs-bar i');
  let dist = 0;
  onLayout(() => {
    track.style.transform = '';
    if (!desktop.matches || reduce) { sec.style.height = ''; dist = 0; return; }
    dist = Math.max(0, track.scrollWidth - sticky.clientWidth);
    sec.style.height = `calc(100vh + ${dist}px)`;
  });
  onScroll(() => {
    if (!dist) return;
    const p = clamp(-sec.getBoundingClientRect().top / dist);
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    if (bar) bar.style.transform = `scaleX(${p})`;
  });
  if (bar && track) track.addEventListener('scroll', () => { if (!dist) bar.style.transform = `scaleX(${clamp(track.scrollLeft / (track.scrollWidth - track.clientWidth || 1))})`; }, { passive: true });
}

// ---------- escena fijada por pasos (cada tramo de scroll activa un paso) ----------
export function steps(sec, n, cb) {
  let on = false, cur = -1;
  onLayout(() => { on = desktop.matches && !reduce; sec.style.height = on ? `${100 + n * 55}vh` : ''; });
  onScroll((y, vh) => {
    if (!on) return;
    const r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh));
    const i = Math.min(n - 1, Math.floor(p * n));
    if (i !== cur) { cur = i; cb(i, true); }
  });
  return i => { // ir a un paso (clic en una pestaña)
    if (!on) { cb(i, false); return; }
    const r = sec.getBoundingClientRect(), top = scrollY + r.top, span = r.height - innerHeight;
    scrollTo({ top: top + span * ((i + .5) / n), behavior: 'smooth' });
  };
}

// ---------- la sección entra creciendo (cambio de plano) ----------
export function grow(sec) {
  if (reduce) return;
  onScroll((y, vh) => {
    const r = sec.getBoundingClientRect();
    const p = clamp((vh - r.top) / (vh * .75));
    sec.style.setProperty('--grow', p.toFixed(3));
  });
}

// ---------- parallax ----------
export function parallax(root = document, keep = false) {
  if (reduce) return;
  const els = [...root.querySelectorAll('[data-py],[data-px]')];
  if (!els.length) return;
  onScroll((y, vh) => els.forEach(el => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const d = r.top + r.height / 2 - vh / 2;
    if (el.dataset.py) el.style.setProperty('--py', `${(d * +el.dataset.py).toFixed(1)}px`);
    if (el.dataset.px) el.style.setProperty('--px', `${(d * +el.dataset.px).toFixed(1)}px`);
  }), keep);
}

// ---------- cintas que corren y aceleran con el scroll ----------
const loops = new Set();
export function marquee(el, dir = 1) {
  if (reduce) return;
  const tr = el.querySelector('.tr'); tr.style.animation = 'none';
  const st = { dead: false }; loops.add(st);
  let x = 0, sp = 0, d = dir, half = 0, last = performance.now();
  const measure = () => { half = tr.scrollWidth / 2; };
  onLayout(measure);
  (function tick(now) {
    if (st.dead || !el.isConnected) return;
    const dt = Math.min(50, now - last) / 16.67; last = now;
    if (Math.abs(vel) > 1) d = Math.sign(vel) * dir;
    sp += ((.55 + Math.min(14, Math.abs(vel)) * .5) - sp) * .08; vel *= .9;
    x -= sp * d * dt;
    if (half) { if (x <= -half) x += half; if (x > 0) x -= half; }
    tr.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    requestAnimationFrame(tick);
  })(last);
}

// ---------- tarjetas que se inclinan con el ratón ----------
export function tilt(root = document) {
  if (!hover || reduce) return;
  root.querySelectorAll('.tilt').forEach(c => {
    if (c.dataset.tilt) return; c.dataset.tilt = 1;
    const m = c.querySelector('.media') || c;
    c.addEventListener('pointermove', e => {
      const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      m.style.transform = `perspective(900px) rotateY(${(x * 7).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg) translateZ(0)`;
    });
    c.addEventListener('pointerleave', () => { m.style.transform = ''; });
  });
}

// ---------- arrastrar con el ratón los carriles horizontales ----------
export function drag(root = document) {
  root.querySelectorAll('[data-drag]').forEach(el => {
    let down = false, sx = 0, sl = 0, moved = 0;
    el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = el.scrollLeft; });
    addEventListener('pointerup', () => { if (down) { down = false; el.classList.remove('dragging'); } });
    el.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) { el.classList.add('dragging'); el.scrollLeft = sl - dx; } });
    el.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
}

// ---------- cursor con etiqueta («Ver») ----------
export function cursor() {
  if (!hover || reduce) return;
  const w = document.createElement('div'); w.className = 'clip z-cursor';
  const c = document.createElement('div'); c.className = 'cursor'; c.innerHTML = '<span></span>'; w.append(c); document.body.append(w);
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const tick = () => { x += (tx - x) * .22; y += (ty - y) * .22; c.style.transform = `translate3d(${x}px,${y}px,0)`; raf = Math.abs(tx - x) + Math.abs(ty - y) > .3 ? requestAnimationFrame(tick) : 0; };
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick);
    const t = e.target.closest && e.target.closest('[data-cursor]');
    const over = t && !e.target.closest('button');
    c.classList.toggle('on', !!over); if (over) c.firstChild.textContent = t.dataset.cursor;
  }, { passive: true });
  addEventListener('pointerdown', () => c.classList.remove('on'));
}

// ---------- telón entre páginas ----------
export function curtain(cb) {
  const el = document.querySelector('.curtain');
  if (reduce || !el) { cb(); return Promise.resolve(); }
  return new Promise(res => {
    el.classList.remove('out'); el.classList.add('in');
    setTimeout(() => {
      cb();
      requestAnimationFrame(() => { el.classList.add('out'); el.classList.remove('in'); setTimeout(() => { el.classList.remove('out'); res(); }, 620); });
    }, 480);
  });
}

// ---------- el producto vuela a la bolsa ----------
export function fly(from) {
  const to = document.querySelector('#cart-btn');
  if (reduce || !from || !to || !from.animate) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const g = document.createElement('div'); g.className = "fly-ghost";
  g.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  g.innerHTML = from.querySelector('svg,img')?.outerHTML || '';
  document.body.append(g);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  g.animate([{ transform: 'none', opacity: 1, borderRadius: '18px' }, { transform: `translate(${dx * .5}px,${dy * .5 - 60}px) scale(.45)`, opacity: 1, offset: .55 },
  { transform: `translate(${dx}px,${dy}px) scale(.06)`, opacity: .2, borderRadius: '50%' }], { duration: 750, easing: 'cubic-bezier(.3,.6,.2,1)' }).onfinish = () => g.remove();
}

// ---------- barra de progreso de la página ----------
export function progress() {
  const el = document.querySelector('.prog i'); if (!el) return;
  onScroll(y => { const h = document.documentElement.scrollHeight - innerHeight; el.style.transform = `scaleX(${h > 0 ? clamp(y / h) : 0})`; }, true);
}

// vídeos de producto: con ratón se reproducen al pasar por encima; en el móvil, al verse en pantalla
export function lazyVideos(root = document) {
  const vs = [...root.querySelectorAll('video[data-src]')].filter(v => !v.dataset.lv); if (!vs.length) return;
  const play = v => { if (!v.src) v.src = v.dataset.src; v.play().then(() => v.parentElement.classList.add('playing')).catch(() => { }); };
  const stop = v => { v.pause(); v.parentElement.classList.remove('playing'); };
  vs.forEach(v => (v.dataset.lv = 1));
  if (hover) {
    vs.forEach(v => { const c = v.closest('.card') || v.parentElement; c.addEventListener('pointerenter', () => play(v)); c.addEventListener('pointerleave', () => stop(v)); });
  } else if ('IntersectionObserver' in window) {
    const o = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? play(e.target) : stop(e.target))), { threshold: .6 });
    vs.forEach(v => o.observe(v));
  }
}

// deslizar con el dedo a izquierda o derecha (devuelve -1 o 1)
export function swipe(el, cb) {
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) cb(dx < 0 ? 1 : -1);
  }, { passive: true });
}
