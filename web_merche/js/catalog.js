// Catálogo: búsqueda, formato de precios y la tarjeta de producto.
import { PRODUCTS } from './products.js';
import { art } from './art.js';
import { CATS, SHOP } from './config.js';

export { PRODUCTS };
const MAP = new Map(PRODUCTS.map(p => [p.id, p]));
export const byId = id => MAP.get(id);
export const brandName = p => (p.brand === 'ghd' ? 'ghd' : 'Schwarzkopf Professional');
export const eur = n => (n == null ? 'Consultar' : n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }));
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- ilustración provisional: forma según el tipo, color según la línea ----
const SHAPE = {
  plancha: 'iron', secador: 'dryer', moldeador: 'airstyler', rizador: 'wand', 'cepillo-termico': 'brush', cepillo: 'brush', accesorio: 'cone', pack: 'box',
  champu: 'bottle', acondicionador: 'tube', mascarilla: 'jar', tratamiento: 'pump', aceite: 'oil', laca: 'spray', protector: 'spray',
};
const TONES = [
  ['Repair Rescue', '#3a3466', '#e6e2ee', '#c9bff0'], ['Color Freeze', '#8c3f5c', '#f1e2e7', '#f3c6d4'], ['Moisture Kick', '#2f6f86', '#dfecef', '#bfe3ee'],
  ['Volume Boost', '#4f7a4a', '#e3ecdf', '#cfe6c9'], ['Frizz Away', '#b0683a', '#f2e5d8', '#f5d3b8'], ['Time Restore', '#7a5a36', '#efe6d8', '#e6cfa8'],
  ['Scalp', '#5d7f77', '#e2ece9', '#cfe6df'], ['Sun', '#c98a2b', '#f6ecd6', '#f7dfa5'], ['Fibre Clinix', '#cfcfd6', '#e9e6f0', '#6d4bb3'],
  ['BLONDME', '#e3cbbb', '#f4ebe4', '#b98a6b'], ['OSiS', '#1c1c1c', '#e7e3e0', '#e4572e'], ['Session Label', '#eeebe6', '#ddd7cf', '#1a1a1a'],
  ['Silhouette', '#a8262e', '#f3e3e2', '#f4f0ee'], ['Oil Ultime', '#b8862f', '#f3ead6', '#f1d79a'], ['Mad About', '#d06a4e', '#f5e4dc', '#f7c9b9'],
  ['Chroma', '#7d4fa0', '#ece2f2', '#d9c2ea'], ['Bonacure', '#34495a', '#e4e9ec', '#c9d6de'],
];
export function look(p) {
  let shape = SHAPE[p.cat] || 'bottle';
  if (p.cat === 'styling') shape = /\bg\b/.test(p.size) ? 'jar' : 'spray';
  if (p.brand === 'ghd') {
    const soft = ['protector', 'styling', 'laca', 'aceite', 'tratamiento'].includes(p.cat);
    return { shape, tone: soft ? ['#22201e', '#e9e2da'] : ['#1b1816', '#e6ded3'], accent: '#c9a46a' };
  }
  const t = TONES.find(t => p.line.includes(t[0])) || [0, '#2a2a2a', '#ebe6e0', '#d9d2c8'];
  return { shape, tone: [t[1], t[2]], accent: t[3] };
}
export function picture(p, opts) {
  if (p.img) return `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`;
  return art({ ...p, ...look(p) }, opts);
}

// Orden «destacados»: primero lo más vendido, luego novedades y después por tipo (el orden del catálogo)
const RANK = new Map(PRODUCTS.map((p, i) => { const b = SHOP.best.indexOf(p.id); return [p.id, (b >= 0 ? b : 500) * 1000 + (p.new ? 0 : 400) + i]; }));
export const featured = list => list.slice().sort((a, b) => RANK.get(a.id) - RANK.get(b.id));

// ---- tarjeta ----
export function card(p, { n = null } = {}) {
  const can = p.price != null;
  return `<a class="card tilt" href="#/p/${p.id}" data-cursor="Ver">
    <div class="media">
      ${picture(p)}
      ${p.video ? `<video muted loop playsinline preload="none" data-src="${esc(p.video)}"></video><span class="vid-tag"><svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg></span>` : ''}
      <span class="sheen"></span>
      ${p.new ? '<span class="badge dark">Nuevo</span>' : ''}
      ${n != null ? `<span class="num">${String(n).padStart(2, '0')}</span>` : ''}
      ${can ? `<button class="quick" type="button" data-add="${p.id}">Añadir a la bolsa</button>` : ''}
    </div>
    <div class="info">
      <span class="brand">${brandName(p)}</span>
      <span class="name">${esc(p.name.replace(/^ghd /, 'ghd '))}</span>
      <div class="row"><span class="price">${eur(p.price)}</span><span class="size">${esc(p.size || CATS[p.cat] || '')}</span></div>
    </div>
  </a>`;
}

export function search(q) {
  const t = norm(q).split(/\s+/).filter(Boolean);
  if (!t.length) return [];
  return PRODUCTS.filter(p => { const h = norm(`${p.name} ${p.line} ${brandName(p)} ${CATS[p.cat]} ${p.short} ${p.needs.join(' ')}`); return t.every(w => h.includes(w)); });
}
export const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function related(p, n = 4) {
  const score = o => (o.id === p.id ? -1 : (o.line === p.line ? 3 : 0) + o.needs.filter(x => p.needs.includes(x)).length + (o.brand !== p.brand ? 1.5 : 0) + (o.price != null ? .5 : 0));
  return PRODUCTS.map(o => [score(o), o]).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, n).map(a => a[1]);
}
