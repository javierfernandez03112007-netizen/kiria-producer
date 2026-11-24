// Navegación entre páginas. Normalmente la ruta va en la dirección (#/tienda, #/p/<id>…), y así se puede enlazar
// un producto desde un anuncio. En la vista previa de claude.ai (window.__MEM_ROUTER) la página vive dentro de un
// marco por el que solo pasan direcciones sencillas, así que allí la ruta se guarda en memoria.
export const memory = !!window.__MEM_ROUTER;
let route = '';
const subs = new Set();
export const hash = () => (memory ? (route ? '#' + route : '') : location.hash);
export function navigate(h) {
  h = h || '#/';
  if (!memory) { if (location.hash === h) subs.forEach(f => f()); else location.hash = h; return; }
  route = h.replace(/^#/, '');
  subs.forEach(f => f());
}
export function onNavigate(f) { subs.add(f); if (!memory) addEventListener('hashchange', f); }
