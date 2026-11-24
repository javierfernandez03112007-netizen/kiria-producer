// Páginas: tienda, ficha de producto, caja, pedido hecho y textos legales.
import { SHOP, NEEDS, GROUPS, CATS } from './config.js';
import { PRODUCTS, byId, card, eur, esc, picture, brandName, related, search, look, featured } from './catalog.js';
import * as cart from './cart.js';
import * as fx from './fx.js';
import { navigate } from './nav.js';

const param = (q, o) => { const p = new URLSearchParams(q); Object.entries(o).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); const s = p.toString(); return '#/tienda' + (s ? '?' + s : ''); };
const PAGE = 24;

// =============== TIENDA ===============
export function tienda(q) {
  const g = q.get('g') || '', marca = q.get('marca') || '', cat = q.get('cat') || '', need = q.get('need') || '', linea = q.get('linea') || '', orden = q.get('orden') || '', busca = q.get('q') || '';
  let b0 = busca ? search(busca) : PRODUCTS.slice();
  if (marca) b0 = b0.filter(p => p.brand === marca);
  if (g && GROUPS[g]) b0 = b0.filter(p => GROUPS[g].cats.includes(p.cat));
  const needsOn = NEEDS.filter(n => b0.some(p => p.needs.includes(n.id)));
  let base = need ? b0.filter(p => p.needs.includes(need)) : b0;
  const lines = marca === 'schwarzkopf' || linea ? [...new Set(base.filter(p => p.brand === 'schwarzkopf').map(p => p.line))] : [];
  if (linea) base = base.filter(p => p.line.includes(linea));
  const cats = Object.keys(CATS).filter(c => base.some(p => p.cat === c));
  let list = cat ? base.filter(p => p.cat === cat) : base;
  if (orden === 'precio') list = list.slice().sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
  else if (orden === 'precio-desc') list = list.slice().sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  else if (!busca) list = featured(list);
  const nd = NEEDS.find(n => n.id === need);
  const plain = !(busca || nd || linea || g || marca);
  const title = busca ? `«${esc(busca)}»` : nd ? nd.label : linea ? esc(linea) : g ? GROUPS[g].label : marca === 'ghd' ? 'ghd' : marca ? 'Schwarzkopf Professional' : 'Toda la tienda';
  const seg = (k, v, l, cur) => `<a class="${cur === v ? 'on' : ''}" href="${param(q, { [k]: v, cat: '', linea: k === 'marca' ? '' : linea })}">${l}</a>`;
  const cells = (from, to) => list.slice(from, to).map((p, i) => `<div class="cell" style="--d:${Math.min(i, 11) * 45}ms" data-rv>${card(p)}</div>`).join('');
  return {
    title: `${title} · Beauty Salon Merche`,
    html: `<section class="shop page-in"><div class="wrap">
      <div class="shop-top">
        <div class="crumbs"><a href="#/">Inicio</a><span>/</span><a href="#/tienda">Tienda</a>${plain ? '' : `<span>/</span><span>${title}</span>`}</div>
        <h1 class="shop-title" data-words>${plain ? 'Toda la <em>tienda</em>' : title}</h1>
        <p class="shop-sub">${list.length} producto${list.length === 1 ? '' : 's'}${nd ? ` · ${nd.sub}` : ''} ${plain ? '' : `<a class="link" href="#/tienda">Quitar filtros</a>`}</p>
      </div>
      <div class="shop-bar">
        <div class="seg">${seg('g', '', 'Todo', g)}${Object.entries(GROUPS).map(([k, v]) => seg('g', k, v.label, g)).join('')}</div>
        <div class="seg">${seg('marca', '', 'Todas', marca)}${seg('marca', 'ghd', 'ghd', marca)}${seg('marca', 'schwarzkopf', 'Schwarzkopf', marca)}</div>
        <select class="sort" aria-label="¿Qué necesita tu pelo?" data-sel="need"><option value="">¿Qué necesita tu pelo?</option>${needsOn.map(n => `<option value="${n.id}" ${need === n.id ? 'selected' : ''}>${n.label}</option>`).join('')}</select>
        <select class="sort" aria-label="Ordenar" data-sel="orden">
          <option value="">Destacados</option><option value="precio" ${orden === 'precio' ? 'selected' : ''}>Precio: de menor a mayor</option><option value="precio-desc" ${orden === 'precio-desc' ? 'selected' : ''}>Precio: de mayor a menor</option></select>
      </div>
      ${lines.length > 1 || linea ? `<div class="chips lines" data-drag>
        <a class="chip ${linea ? '' : 'on'}" href="${param(q, { linea: '', cat: '' })}">Todas las líneas</a>
        ${lines.map(l => `<a class="chip ${linea === l ? 'on' : ''}" href="${param(q, { linea: l, cat: '' })}">${esc(l)}</a>`).join('')}</div>` : ''}
      <div class="chips" data-drag>
        <a class="chip ${cat ? '' : 'on'}" href="${param(q, { cat: '' })}">Todo <small>${base.length}</small></a>
        ${cats.map(c => `<a class="chip ${cat === c ? 'on' : ''}" href="${param(q, { cat: c })}">${CATS[c]} <small>${base.filter(p => p.cat === c).length}</small></a>`).join('')}
      </div>
      <div class="grid" id="grid">${list.length ? cells(0, PAGE) : '<p class="empty">No hay productos con ese filtro. <a class="link" href="#/tienda">Ver todo</a></p>'}</div>
      ${list.length > PAGE ? `<div class="more-wrap"><button class="btn ghost" type="button" id="more">Ver más <small>(quedan ${list.length - PAGE})</small></button></div>` : ''}
      <p class="price-note"><span class="pend">Precios de referencia (PVP de la marca o de tiendas, nov. 2026). El precio final lo pone Merche.</span></p>
    </div></section>`,
    mount(root) {
      fx.words(root); fx.reveal(root); fx.tilt(root); fx.drag(root); fx.lazyVideos(root);
      root.querySelectorAll('[data-sel]').forEach(s => s.addEventListener('change', e => { navigate(param(q, { [s.dataset.sel]: e.target.value, ...(s.dataset.sel === 'need' ? { cat: '', linea: '' } : {}) })); }));
      const more = root.querySelector('#more'), grid = root.querySelector('#grid'); let shown = PAGE;
      if (more) more.addEventListener('click', () => {
        const t = document.createElement('template'); t.innerHTML = cells(shown, shown + PAGE); shown += PAGE;
        grid.append(t.content);
        fx.reveal(grid); fx.tilt(grid); fx.lazyVideos(grid); fx.relayout();
        if (shown >= list.length) more.parentElement.remove(); else more.querySelector('small').textContent = `(quedan ${list.length - shown})`;
      });
      // la fila de filtros activos queda a la vista
      root.querySelectorAll('.chips .chip.on').forEach(c => { const r = c.parentElement; r.scrollLeft = Math.max(0, c.offsetLeft - r.clientWidth / 2 + c.clientWidth / 2); });
    },
  };
}

// =============== FICHA ===============
function eta() {
  const now = new Date(), add = (d, n) => { const x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) n--; } return x; };
  const late = now.getHours() >= SHOP.shipping.cutoffHour || !(now.getDay() % 6);
  const a = add(now, late ? 2 : 1), b = add(now, late ? 4 : 3);
  const f = d => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return `entre el <b>${f(a)}</b> y el <b>${f(b)}</b>`;
}
const SW = { negro: '#1b1816', blanco: '#f4f1ec', 'negro titanio': '#3b3a3d', 'blanco plata': '#dcdcde', rosa: '#e8b9c2', ciruela: '#5b2a44', dorado: '#c9a46a', champagne: '#e3d2b0', azul: '#2b3f66', 'beige cashmere': '#d9c7b0' };
const PLAY = '<svg width="18" height="18" viewBox="0 0 12 12"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor"/></svg>';
const slot = (t, d, tag) => `<div><div class="ring">${PLAY}</div><b>${t}</b><p>${d}</p><span class="pend">${tag}</span></div>`;

function shots(p) {
  const th = picture(p, { label: false }), a = [{ html: picture(p), thumb: th, label: '', aria: 'Imagen' }];
  (p.gallery || []).forEach(src => { const im = `<img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy">`; a.push({ html: im, thumb: im, label: '', aria: 'Otra imagen' }); });
  a.push(p.video ? { html: `<video src="${esc(p.video)}" muted loop playsinline preload="metadata" data-auto></video>`, thumb: th, label: 'VÍDEO', aria: 'Vídeo del producto' }
    : { cls: 'vslot', html: slot(`El vídeo de ${esc(p.name)}`, 'Aquí irá el vídeo profesional del producto.', 'vídeo pendiente'), thumb: th, label: 'VÍDEO', aria: 'Vídeo del producto' });
  a.push(p.tutorial ? { html: `<video src="${esc(p.tutorial)}" controls playsinline preload="none"></video>`, thumb: th, label: 'MERCHE', aria: 'Tutorial de Merche' }
    : { cls: 'vslot', html: slot('Merche te enseña a usarlo', 'Un avance del tutorial que recibes al comprarlo.', 'tutorial pendiente'), thumb: th, label: 'MERCHE', aria: 'Tutorial de Merche' });
  return a;
}
const buyLabel = n => `Añadir<span class="dsk"> a la bolsa</span> · ${eur(n)}`;

export function producto(id) {
  const p = byId(id);
  if (!p) return { title: 'No encontrado', html: `<section class="wrap done page-in"><h1>No encontramos ese producto</h1><p><a class="btn" href="#/tienda">Ir a la tienda</a></p></section>`, mount() { } };
  const can = p.price != null, rel = related(p), group = Object.entries(GROUPS).find(([, v]) => v.cats.includes(p.cat));
  const tool = group?.[0] === 'herramientas' && p.cat !== 'cepillo' && p.cat !== 'accesorio';
  const facts = Object.entries(p.facts || {}), sh = shots(p);
  const swOk = p.colors.length && p.colors.length <= 5 && p.colors.every(c => SW[c.toLowerCase()]);
  return {
    title: `${p.name} · Beauty Salon Merche`,
    html: `<section class="pdp page-in"><div class="wrap">
      <div class="crumbs"><a href="#/">Inicio</a><span>/</span><a href="#/tienda">Tienda</a><span>/</span><a href="#/tienda?cat=${p.cat}">${CATS[p.cat]}</a><span>/</span><span>${esc(p.name)}</span></div>
      <div class="pdp-grid">
        <div class="gallery">
          <div class="thumbs">${sh.map((s, i) => `<button type="button" class="${i ? '' : 'on'}" data-shot="${i}" aria-label="${s.aria}">${s.thumb}${s.label ? `<span class="play">${s.label}</span>` : ''}</button>`).join('')}</div>
          <div class="stage" id="pdp-stage">${sh.map((s, i) => `<div class="shot ${s.cls || ''} ${i ? '' : 'on'}" data-s="${i}">${s.html}</div>`).join('')}</div>
        </div>
        <div class="pdp-info">
          <div class="eyebrow">${brandName(p)}${p.line ? ` · ${esc(p.line)}` : ''}${p.new ? ' · <span class="gold">Novedad</span>' : ''}</div>
          <h1 data-words>${esc(p.name)}</h1>
          <p class="sub">${esc(p.short)}</p>
          <div class="price">${eur(p.price)}</div>
          <div class="tax">${can ? 'IVA incluido' : 'Escríbenos y te decimos precio y disponibilidad'}${p.size ? ` · ${esc(p.size)}` : ''} ${can ? `<span class="pend">precio de referencia${p.priceSrc ? ` (${esc(p.priceSrc)})` : ''}</span>` : ''}</div>
          ${p.colors.length ? `<div class="variants"><div class="lbl">${swOk ? 'Color' : 'Tono'}: <b id="col">${esc(p.colors[0])}</b></div>
            ${swOk ? `<div class="swatches">${p.colors.map((c, i) => `<button type="button" class="sw ${i ? '' : 'on'}" data-col="${esc(c)}" aria-label="${esc(c)}"><i style="background:${SW[c.toLowerCase()]}"></i></button>`).join('')}</div>`
        : `<div class="col-chips">${p.colors.map((c, i) => `<button type="button" class="chip ${i ? '' : 'on'}" data-col="${esc(c)}">${esc(c)}</button>`).join('')}</div>`}</div>` : ''}
          ${can ? `<div class="buy"><div class="qty"><button type="button" data-qd="-1" aria-label="Menos">−</button><span id="qty">1</span><button type="button" data-qd="1" aria-label="Más">+</button></div>
            <button class="btn" type="button" id="buy" data-add="${p.id}" data-qty="1" data-from="#pdp-stage">${buyLabel(p.price)}</button></div>` : `<div class="buy one"><a class="btn" href="#/?s=contacto">Preguntar por este producto</a></div>`}
          <div class="eta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>
            <div>Recíbelo ${eta()}. <span class="pend">plazos por confirmar</span><br><span style="color:var(--muted)">O recógelo gratis en el salón, en Motril.</span></div></div>
          <div class="eta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/></svg>
            <div><b>Incluye el tutorial de Merche.</b><br><span style="color:var(--muted)">Te llega por correo: cómo usarlo, el error típico y su truco.</span></div></div>
          <div class="perks"><span>Producto original</span><span>14 días para devolverlo</span>${tool ? '<span>Garantía legal de 3 años</span>' : ''}</div>
          <div class="merche-says"><small>El consejo de Merche</small><p>${p.merche ? esc(p.merche) : 'Aquí irá lo que Merche dice de este producto: para quién es, para quién no y su truco. <span class="pend">pendiente de la ficha</span>'}</p></div>
          <div class="acc">
            <details open><summary>Qué es</summary><p>${esc(p.desc)}</p>${p.benefits.length ? `<ul>${p.benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</details>
            ${p.use ? `<details><summary>Cómo se usa</summary><p>${esc(p.use)}</p></details>` : ''}
            ${facts.length ? `<details><summary>Datos técnicos</summary><dl class="specs">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>` : ''}
            <details><summary>Envío y devoluciones</summary><p>Envío estándar ${eur(SHOP.shipping.methods[0].price)}, gratis desde ${eur(SHOP.shipping.freeFrom)}. Recogida gratis en el salón. Tienes 14 días para devolverlo; los productos de cuidado precintados, solo sin abrir. <span class="pend">por confirmar</span></p></details>
          </div>
          <p class="src">Datos del fabricante${p.url ? ` · <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">fuente</a>` : ''}${p.confirm.length ? ` · <span class="pend">por confirmar: ${p.confirm.map(esc).join(', ')}</span>` : ''}</p>
        </div>
      </div>
      ${rel.length ? `<div class="related"><div class="shop-head"><h2 class="sec-title" data-words data-rv>Combínalo <em>con</em></h2></div><div class="grid">${rel.map((r, i) => `<div class="cell" data-rv style="--d:${i * 60}ms">${card(r)}</div>`).join('')}</div></div>` : ''}
    </div>
    ${can ? `<div class="sticky-buy"><div><b>${esc(p.name)}</b><span class="price">${eur(p.price)}</span></div><button class="btn sm" type="button" data-add="${p.id}" data-from="#pdp-stage">Añadir</button></div>` : ''}
    </section>`,
    mount(root) {
      fx.words(root); fx.reveal(root); fx.tilt(root); fx.lazyVideos(root);
      let qty = 1; const buy = root.querySelector('#buy'), stage = root.querySelector('.stage');
      const setShot = i => {
        root.querySelectorAll('[data-shot]').forEach(b => b.classList.toggle('on', +b.dataset.shot === i));
        root.querySelectorAll('.shot').forEach(x => {
          const on = +x.dataset.s === i; x.classList.toggle('on', on);
          const v = x.querySelector('video'); if (v) { if (on && v.dataset.auto != null) v.play().catch(() => { }); else v.pause(); }
        });
      };
      root.addEventListener('click', e => {
        const s = e.target.closest('[data-shot]'); if (s) return setShot(+s.dataset.shot);
        const d = e.target.closest('[data-qd]');
        if (d) { qty = Math.max(1, Math.min(10, qty + +d.dataset.qd)); root.querySelector('#qty').textContent = qty; buy.dataset.qty = qty; buy.innerHTML = buyLabel(p.price * qty); return; }
        const c = e.target.closest('[data-col]');
        if (c) { root.querySelectorAll('[data-col]').forEach(b => b.classList.toggle('on', b === c)); root.querySelector('#col').textContent = c.dataset.col; }
      });
      const sb = root.querySelector('.sticky-buy');
      if (sb && buy && 'IntersectionObserver' in window) new IntersectionObserver(es => sb.classList.toggle('on', !es[0].isIntersecting)).observe(buy);
      stage.style.background = look(p).tone[1];
    },
  };
}

// =============== CAJA (demostración: no cobra) ===============
const PROV = 'Álava,Albacete,Alicante,Almería,Asturias,Ávila,Badajoz,Barcelona,Burgos,Cáceres,Cádiz,Cantabria,Castellón,Ciudad Real,Córdoba,A Coruña,Cuenca,Girona,Granada,Guadalajara,Gipuzkoa,Huelva,Huesca,Illes Balears,Jaén,León,Lleida,Lugo,Madrid,Málaga,Murcia,Navarra,Ourense,Palencia,Pontevedra,La Rioja,Salamanca,Segovia,Sevilla,Soria,Tarragona,Teruel,Toledo,Valencia,Valladolid,Bizkaia,Zamora,Zaragoza'.split(',');
const field = (id, label, o = {}) => `<div class="field ${o.full ? 'full' : ''}"><input id="${id}" name="${id}" placeholder=" " type="${o.type || 'text'}" autocomplete="${o.ac || 'off'}" ${o.req === false ? '' : 'required'} ${o.pat ? `pattern="${o.pat}"` : ''} ${o.mode ? `inputmode="${o.mode}"` : ''}><label for="${id}">${label}</label><div class="msg" hidden>${o.msg || 'Revisa este dato'}</div></div>`;

export function caja() {
  if (!cart.count()) return { title: 'Tu bolsa', html: `<section class="wrap done page-in"><h1>Tu bolsa está vacía</h1><p>Añade algo y vuelve por aquí.</p><p><a class="btn" href="#/tienda">Ir a la tienda</a></p></section>`, mount() { } };
  const M = SHOP.shipping.methods;
  return {
    title: 'Tramitar pedido · Beauty Salon Merche',
    html: `<section class="checkout page-in"><div class="wrap">
      <div class="steps"><b>Bolsa</b><i></i><b>Datos y envío</b><i></i><span>Pago</span><i></i><span>Listo</span></div>
      <div class="demo-note"><b>Maqueta.</b> Este paso es una demostración: no se cobra nada ni se guarda ningún dato. En la web real aquí se abre la pasarela de pago segura.</div>
      <form class="co-grid" novalidate>
        <div>
          <fieldset class="fs"><legend>Contacto</legend><div class="fields">
            ${field('email', 'Correo (aquí te llega el tutorial)', { type: 'email', ac: 'email', full: true, msg: 'Escribe un correo válido' })}
            ${field('tel', 'Teléfono', { type: 'tel', ac: 'tel', mode: 'tel', pat: '[0-9 +]{9,15}', msg: 'Escribe un teléfono válido' })}
            ${field('nombre', 'Nombre y apellidos', { ac: 'name' })}
          </div></fieldset>
          <fieldset class="fs"><legend>Entrega</legend><div class="radios">
            ${M.map((m, i) => `<label class="radio"><input type="radio" name="envio" value="${m.id}" ${i ? '' : 'checked'}><span><b>${m.label}</b><small>${m.detail}</small></span><b data-ship="${m.id}"></b></label>`).join('')}
          </div></fieldset>
          <fieldset class="fs" id="dir"><legend>Dirección</legend><div class="fields">
            ${field('calle', 'Calle y número', { ac: 'address-line1', full: true })}
            ${field('piso', 'Piso, puerta (opcional)', { ac: 'address-line2', req: false })}
            ${field('cp', 'Código postal', { ac: 'postal-code', mode: 'numeric', pat: '[0-5][0-9]{4}', msg: 'Son 5 números' })}
            ${field('ciudad', 'Localidad', { ac: 'address-level2' })}
            <div class="field"><select id="prov" name="prov" required autocomplete="address-level1"><option value="">Elige…</option>${PROV.map(p => `<option>${p}</option>`).join('')}</select><label for="prov">Provincia</label><div class="msg" hidden>Elige la provincia</div></div>
          </div><p class="note" style="color:var(--muted);font-size:13px;margin-top:10px">De momento no enviamos a Canarias, Ceuta ni Melilla. <span class="pend">por decidir</span></p></fieldset>
          <fieldset class="fs"><legend>Pago</legend><div class="radios">
            <label class="radio"><input type="radio" name="pago" value="tarjeta" checked><span><b>Tarjeta, Apple Pay o Google Pay</b><small>Pasarela segura. No guardamos los datos de tu tarjeta.</small></span><span class="pm"><span>VISA</span><span>MC</span></span></label>
            <label class="radio"><input type="radio" name="pago" value="bizum"><span><b>Bizum</b><small><span class="pend">por confirmar con el banco de Merche</span></small></span><span class="pm"><span>BIZUM</span></span></label>
          </div></fieldset>
          <label class="check"><input type="checkbox" id="ok" required><span>He leído y acepto las <a href="#/legal/condiciones">condiciones de venta</a> y la <a href="#/legal/privacidad">política de privacidad</a>.</span></label>
          <label class="check"><input type="checkbox" id="news"><span>Quiero recibir los consejos y novedades de Merche (puedes darte de baja cuando quieras).</span></label>
        </div>
        <aside class="summary"><h3>Tu pedido</h3><div id="sum"></div>
          <button class="btn block" type="submit" id="pay"></button>
          <div class="secure"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Pago seguro · IVA incluido</div>
        </aside>
      </form>
    </div></section>`,
    mount(root) {
      const form = root.querySelector('form'), dir = root.querySelector('#dir');
      const paint = () => {
        const sub = cart.subtotal(), met = form.envio.value, ship = cart.shipCost(met, sub), pick = M.find(m => m.id === met)?.pickup;
        M.forEach(m => { root.querySelector(`[data-ship="${m.id}"]`).textContent = cart.shipCost(m.id, sub) ? eur(cart.shipCost(m.id, sub)) : 'Gratis'; });
        dir.hidden = !!pick; dir.querySelectorAll('input,select').forEach(i => (i.disabled = !!pick));
        root.querySelector('#sum').innerHTML = cart.lines().map(({ p, qty }) => `<div class="line"><div class="th">${picture(p, { label: false })}<em>${qty}</em></div><div><div class="n" style="margin:0">${esc(p.name)}</div><div class="b">${brandName(p)}</div></div><div class="price">${eur(p.price * qty)}</div></div>`).join('')
          + `<div class="sums"><div class="sum"><span>Subtotal</span><span>${eur(sub)}</span></div><div class="sum"><span>${pick ? 'Recogida en el salón' : 'Envío'}</span><span>${ship ? eur(ship) : 'Gratis'}</span></div>
             <div class="sum total"><span>Total</span><span>${eur(sub + ship)}</span></div><div class="sum" style="color:var(--muted);font-size:13px"><span>Incluye ${eur((sub + ship) - (sub + ship) / 1.21)} de IVA (21 %)</span></div>
             <div class="sum gift"><span>Con tu compra: el tutorial de Merche</span></div></div>`;
        root.querySelector('#pay').textContent = `Pagar ${eur(sub + ship)}`;
      };
      form.addEventListener('change', paint); paint();
      const onBag = () => { if (!form.isConnected) return document.removeEventListener('bolsa', onBag); if (!cart.count()) navigate('#/tienda'); else paint(); };
      document.addEventListener('bolsa', onBag);
      form.addEventListener('submit', e => {
        e.preventDefault(); let bad = null;
        form.querySelectorAll('.field input:not(:disabled), .field select:not(:disabled)').forEach(i => {
          const ok = i.checkValidity(); i.closest('.field').classList.toggle('err', !ok); i.closest('.field').querySelector('.msg').hidden = ok; if (!ok && !bad) bad = i;
        });
        const okb = root.querySelector('#ok'); if (!okb.checked && !bad) { bad = okb; cart.toast('Acepta las condiciones para seguir'); }
        if (bad) { bad.focus({ preventScroll: true }); bad.scrollIntoView({ block: 'center', behavior: fx.reduce ? 'auto' : 'smooth' }); return; }
        const total = cart.subtotal() + cart.shipCost(form.envio.value);
        try { sessionStorage.setItem('bsm-pedido', JSON.stringify({ n: 'BSM-' + String(Date.now()).slice(-6), total, pick: !!M.find(m => m.id === form.envio.value)?.pickup })); } catch { }
        document.removeEventListener('bolsa', onBag);
        cart.clear(); navigate('#/gracias');
      });
    },
  };
}

export function gracias() {
  let o = {}; try { o = JSON.parse(sessionStorage.getItem('bsm-pedido')) || {}; } catch { }
  return {
    title: 'Pedido recibido · Beauty Salon Merche',
    html: `<section class="wrap done page-in"><div class="seal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
      <p class="eyebrow">Demostración · no se ha cobrado nada</p><h1>¡Gracias! <em class="it gold">Ya es tuyo.</em></h1>
      <p>${o.n ? `Pedido <b>${o.n}</b> · ${eur(o.total)}. ` : ''}${o.pick ? 'Te avisaremos cuando puedas recogerlo en el salón.' : 'Te escribiremos cuando salga hacia tu casa.'}</p>
      <p>En tu correo recibirás la confirmación y, cuando lo tengas, <b>el tutorial de Merche</b> para usarlo.</p>
      <p style="margin-top:26px"><a class="btn" href="#/">Volver al inicio</a></p></section>`,
    mount() { },
  };
}

// =============== TEXTOS LEGALES (pendientes de los datos de Merche) ===============
const LEGAL = {
  'aviso-legal': ['Aviso legal', ['Titular de la web, NIF y domicilio', 'Datos de contacto', 'Condiciones de uso de la web', 'Propiedad intelectual: las marcas ghd y Schwarzkopf Professional pertenecen a sus titulares']],
  condiciones: ['Condiciones de venta', ['Cómo se hace un pedido y cuándo queda confirmado', 'Precios con IVA y formas de pago', 'Envíos: zonas, plazos y costes', 'Derecho de desistimiento: 14 días y sus excepciones (productos precintados abiertos)', 'Garantía legal de 3 años', 'Cómo reclamar y resolución de litigios en línea']],
  privacidad: ['Política de privacidad', ['Quién es el responsable de tus datos', 'Para qué se usan: gestionar el pedido, enviarte el tutorial y, si lo aceptas, las novedades', 'Con quién se comparten: transporte y pasarela de pago', 'Cuánto tiempo se guardan', 'Tus derechos y cómo ejercerlos']],
  cookies: ['Política de cookies', ['Esta maqueta solo usa el almacenamiento del navegador para recordar tu bolsa', 'Si se añaden analítica o el píxel de Meta, hará falta el aviso de cookies con consentimiento']],
  envios: ['Envíos y devoluciones', ['Zonas de envío y plazos', 'Costes y envío gratis', 'Recogida en el salón', 'Cómo devolver un producto y formulario de desistimiento']],
};
export function legal(k) {
  const [t, pts] = LEGAL[k] || LEGAL['aviso-legal'];
  return {
    title: `${t} · Beauty Salon Merche`,
    html: `<section class="wrap legal-page page-in"><p class="eyebrow">Textos legales</p><h1>${t}</h1>
      <p><span class="pend">Pendiente: se redacta con los datos fiscales de Merche y lo revisa su gestor.</span></p>
      <h2>Qué incluirá</h2><ul>${pts.map(p => `<li>${p}</li>`).join('')}</ul><p style="margin-top:30px"><a class="link" href="#/">← Volver</a></p></section>`,
    mount() { },
  };
}
