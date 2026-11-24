// La bolsa (carrito): se guarda en el navegador y se dibuja en un cajón lateral.
import { SHOP } from './config.js';
import { byId, eur, esc, picture, brandName, PRODUCTS } from './catalog.js';
import { fly } from './fx.js';

const KEY = 'bsm-bolsa';
let items = [];
try { items = (JSON.parse(localStorage.getItem(KEY)) || []).filter(i => byId(i.id)?.price != null); } catch { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { } };

export const lines = () => items.map(i => ({ ...i, p: byId(i.id) }));
export const count = () => items.reduce((n, i) => n + i.qty, 0);
export const subtotal = () => items.reduce((n, i) => n + byId(i.id).price * i.qty, 0);
export const clear = () => { items = []; save(); paint(); };

export function shipCost(methodId, sub = subtotal()) {
  const m = SHOP.shipping.methods.find(x => x.id === methodId) || SHOP.shipping.methods[0];
  if (m.price === 0) return 0;
  return !m.noFree && sub >= SHOP.shipping.freeFrom ? 0 : m.price;
}

export function add(id, qty = 1, from = null) {
  const p = byId(id); if (!p || p.price == null) return;
  const it = items.find(i => i.id === id);
  if (it) it.qty = Math.min(20, it.qty + qty); else items.push({ id, qty });
  save(); fly(from); paint(true);
  toast(`${p.name} está en tu bolsa`);
}
function setQty(id, q) { const it = items.find(i => i.id === id); if (!it) return; if (q <= 0) items = items.filter(i => i.id !== id); else it.qty = Math.min(20, q); save(); paint(); }

// Qué proponer en la bolsa: con una herramienta de calor, el protector; con un champú, su tratamiento
const HEAT = ['plancha', 'secador', 'moldeador', 'rizador', 'cepillo-termico'];
function suggest() {
  const inBag = id => items.some(i => i.id === id), ps = items.map(i => byId(i.id));
  const free = p => p && p.price != null && !inBag(p.id);
  if (ps.some(p => HEAT.includes(p.cat)) && !ps.some(p => p.cat === 'protector')) {
    const p = [byId('ghd-bodyguard'), ...PRODUCTS.filter(x => x.cat === 'protector')].find(free);
    if (p) return { p, why: 'Para usarla con calor' };
  }
  const sh = ps.find(p => p.cat === 'champu');
  if (sh) {
    const p = PRODUCTS.find(x => free(x) && x.line === sh.line && ['mascarilla', 'tratamiento', 'acondicionador'].includes(x.cat));
    if (p) return { p, why: 'Completa la rutina' };
  }
  const p = PRODUCTS.find(x => free(x) && x.cat === 'protector');
  return p ? { p, why: 'Te puede hacer falta' } : null;
}

// ---------- cajón ----------
const $ = s => document.querySelector(s);
export function open() { $('.toast').classList.remove('on'); $('.drawer').classList.add('on'); $('.scrim').classList.add('on'); document.body.classList.add('lock'); $('.drawer').setAttribute('aria-hidden', 'false'); }
export function close() { $('.drawer').classList.remove('on'); $('.scrim').classList.remove('on'); document.body.classList.remove('lock'); $('.drawer').setAttribute('aria-hidden', 'true'); }

function paint(bump = false) {
  const c = $('#cart-btn .count'), n = count();
  c.textContent = n; c.classList.toggle('has', n > 0);
  if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  const box = $('.drawer .body'), sub = subtotal(), free = SHOP.shipping.freeFrom, left = Math.max(0, free - sub);
  if (!items.length) {
    box.innerHTML = `<div class="empty-cart"><b>Tu bolsa está vacía</b><p>Cuando añadas algo, aparecerá aquí.</p><a class="btn" href="#/tienda" data-close>Ver la tienda</a></div>`;
    document.dispatchEvent(new CustomEvent('bolsa')); return;
  }
  const up = suggest();
  box.innerHTML = `
    <div class="ship-bar">${left > 0 ? `Te faltan <b>${eur(left)}</b> para el envío gratis` : '<b>Tienes el envío estándar gratis</b>'}
      <div class="track"><i style="width:${Math.min(100, sub / free * 100)}%"></i></div></div>
    <div class="lines">
      ${lines().map(({ p, qty }) => `<div class="line">
        <a class="th" href="#/p/${p.id}" data-close>${picture(p, { label: false })}</a>
        <div><div class="b">${brandName(p)}</div><div class="n">${esc(p.name)}</div>
          <div class="qty"><button type="button" data-q="${p.id}" data-d="-1" aria-label="Quitar uno">−</button><span>${qty}</span><button type="button" data-q="${p.id}" data-d="1" aria-label="Añadir uno">+</button></div>
          <div><button class="link rm" type="button" data-q="${p.id}" data-d="-99">Quitar</button></div></div>
        <div class="price">${eur(p.price * qty)}</div>
      </div>`).join('')}
      ${up ? `<div class="upsell"><h5>${up.why}</h5><div class="u"><div class="th">${picture(up.p, { label: false })}</div>
        <div><b class="serif">${esc(up.p.name)}</b><br><span class="price">${eur(up.p.price)}</span></div>
        <button class="btn sm ghost" type="button" data-add="${up.p.id}">Añadir</button></div></div>` : ''}
    </div>
    <footer>
      <div class="sum"><span>Subtotal</span><span>${eur(sub)}</span></div>
      <div class="sum" style="color:var(--muted);font-size:13px"><span>IVA incluido. El envío se calcula en el siguiente paso.</span></div>
      <a class="btn block" href="#/caja" data-close>Tramitar pedido · ${eur(sub)}</a>
      <div class="secure"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Pago seguro · con tu compra, el tutorial de Merche</div>
    </footer>`;
  document.dispatchEvent(new CustomEvent('bolsa'));
}

let tt = 0;
export function toast(msg) {
  const t = $('.toast'); t.querySelector('span').textContent = msg; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200);
}

export function init() {
  paint();
  $('#cart-btn').addEventListener('click', open);
  $('.scrim').addEventListener('click', close);
  $('.drawer').addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q) { const it = items.find(i => i.id === q.dataset.q); if (it) setQty(it.id, it.qty + +q.dataset.d); return; }
    if (e.target.closest('[data-close]')) close();
  });
  $('.toast button').addEventListener('click', () => { $('.toast').classList.remove('on'); open(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  // cualquier botón «añadir» de la web
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const ids = b.dataset.add.split(','), q = +(b.dataset.qty || 1);
    const from = b.closest('.card')?.querySelector('.media') || document.querySelector(b.dataset.from || '.none') || null;
    ids.forEach((id, i) => add(id, q, i === 0 ? from : null));
    if (ids.length > 1) toast('El pack está en tu bolsa');
  });
}
