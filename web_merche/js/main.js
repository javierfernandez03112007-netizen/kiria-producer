// Parte 1: base, intro, cabecera y portada. Las demás partes se irán añadiendo aquí.
import { SHOP } from './config.js';

const $ = s => document.querySelector(s);

// ---------- barra de avisos (rota cada 4 s) ----------
function avisos() {
  const ul = $('.ann ul');
  ul.innerHTML = SHOP.avisos.map(t => `<li><i></i>${t}<i></i></li>`).join('');
  const li = [...ul.children];
  let i = 0;
  li[0].classList.add('on');
  if (li.length < 2) return;
  setInterval(() => {
    li[i].classList.remove('on'); li[i].classList.add('off');
    const prev = li[i];
    setTimeout(() => prev.classList.remove('off'), 650);
    i = (i + 1) % li.length;
    li[i].classList.add('on');
  }, 4000);
}

// ---------- cabecera: borde al hacer scroll ----------
function cabecera() {
  const h = $('header.top');
  const on = () => h.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', on, { passive: true }); on();
  const menu = $('.mnav'), btn = $('.menu-btn');
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('on');
    btn.setAttribute('aria-expanded', open);
    document.body.classList.toggle('lock', open);
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('on'); document.body.classList.remove('lock'); } });
}

// ---------- intro: vídeo con IA si existe; si no, la bolsa en 3D ----------
function enter() { requestAnimationFrame(() => document.body.classList.add('entered')); }

async function intro() {
  const box = $('#intro'), host = $('#intro .stage3d');
  let seen = false;
  try { seen = sessionStorage.getItem('bsm-intro') === '1'; } catch { }
  const q = new URLSearchParams(location.search);
  const force = q.has('intro'), skipAll = q.has('sinintro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (skipAll || (seen && !force) || reduce) { box.remove(); enter(); return; }
  try { sessionStorage.setItem('bsm-intro', '1'); } catch { }

  document.body.classList.add('lock');
  let stop = null, finished = false;
  const done = () => {
    if (finished) return; finished = true;
    box.classList.add('out'); document.body.classList.remove('lock'); enter();
    setTimeout(() => box.remove(), 900);
  };
  $('#skip').addEventListener('click', () => (stop ? stop() : done()));

  const v = SHOP.intro.video, src = innerWidth / innerHeight < .8 ? v.portrait : v.landscape;
  try {
    const mod = await import('./intro.js');
    box.classList.add('ready');
    stop = src ? mod.playIntroVideo(host, src, done) : await mod.playIntro3D(host, done);
  } catch (e) {
    console.warn('Intro no disponible:', e);
    done();
  }
}

avisos();
cabecera();
intro();
