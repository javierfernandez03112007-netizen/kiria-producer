// POST /api/checkout · Cobro del carrito de kiriaai.com con Stripe Checkout (Cloudflare Pages Functions).
//
// La web manda lo que hay en el carrito; aquí se calculan los precios otra vez (no se fían del navegador), con las MISMAS tablas
// que index.html (KT, KP, KW y kCalc: si cambias un precio allí, cámbialo aquí), y se abre una página de pago de Stripe con todo junto.
// Si hay algún pack mensual, la página es de suscripción (se cobra cada mes hasta que el cliente la cancele); los vídeos sueltos y
// las webs se cobran una vez, en el mismo pago. Al pagar, Stripe devuelve al cliente a /#pagado; si se echa atrás, a /#pago.
//
// La clave es una clave RESTRINGIDA de Stripe (rk_live_…) que Javi guarda en Cloudflare: proyecto kiriaai → Settings →
// Variables and Secrets → STRIPE_KEY (tipo Secret). Nunca va en el repositorio ni en el chat. Sin clave, responde 503 y la web
// ofrece mandar el pedido por correo.

const KT = [
  { n: 'Básico', d: '15–30 s', c: 699, s: 'de 15 a 30 segundos' },
  { n: 'Publicidad', d: '30–45 s', c: 999, s: 'publicitario de 30 a 45 segundos, para tu marca o producto' },
  { n: 'Completo', d: '45 s – 1 min', c: 1399, s: 'de 45 segundos a 1 minuto' },
  { n: 'Pro', d: 'más de 1 min', c: 1699, s: 'de más de 1 minuto' }];
const KP = [{ n: 1, d: 0, name: 'Un vídeo' }, { n: 4, d: 10, name: '4 vídeos al mes' }, { n: 10, d: 12, name: '10 vídeos al mes' }, { n: 30, d: 15, name: 'Un vídeo al día' }];
const KW = [
  { name: 'Página web con tus fotos', c: 25000, desc: 'Diseño y publicación de tu página web con las fotos de tu negocio. Pago único, todo incluido.' },
  { name: 'Página web con fotos nuestras', c: 35000, desc: 'Diseño y publicación de tu página web con fotos hechas por nosotros. Pago único, todo incluido.' }];
const kCalc = (t, pi, dif) => { const p = KP[pi], full = p.n * KT[t].c, net = Math.round(full * (100 - p.d) / 100), extra = dif ? 200 * p.n : 0; return { n: p.n, tot: net + extra }; };
const MAX_LINES = 20, MAX_Q = 10;

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// El carrito ya convertido en líneas de Stripe (o null si no hay nada válido)
function lineas(items) {
  const out = [];
  for (const it of Array.isArray(items) ? items.slice(0, MAX_LINES) : []) {
    if (!it || typeof it !== 'object') continue;
    if (it.k === 'w' && Number.isInteger(it.w) && KW[it.w]) {
      const w = KW[it.w]; out.push({ name: w.name, desc: w.desc, amount: w.c, q: 1, month: false });
    } else if (it.k === 'v' && Number.isInteger(it.t) && KT[it.t] && Number.isInteger(it.pi) && KP[it.pi]) {
      const t = KT[it.t], p = KP[it.pi], dif = !!it.dif, pack = p.n > 1, c = kCalc(it.t, it.pi, dif);
      const q = pack ? 1 : Math.min(MAX_Q, Math.max(1, Math.floor(+it.q || 1)));
      const name = `Vídeo ${t.n} (${t.d})${pack ? ` · ${p.n} vídeos al mes` : ''}${dif ? ' + difusión en kiria.ai' : ''}`;
      const desc = (pack ? `${p.n} vídeos al mes en 3D hechos con IA, ${t.s} cada uno` : `Vídeo en 3D hecho con IA, ${t.s}`)
        + ': guion, voz, animación 3D, subtítulos y sonido. Entrega digital.'
        + (dif ? ' Incluye la difusión en kiria.ai (colaboración identificada como publicidad).' : '')
        + (pack ? ' Se renueva cada mes hasta que lo canceles.' : '');
      out.push({ name, desc, amount: c.tot, q, month: pack });
    }
  }
  return out.length ? out : null;
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.STRIPE_KEY) return json({ error: 'sin_clave' }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'pedido_ilegible' }, 400); }
  const li = lineas(b && b.items);
  if (!li) return json({ error: 'carrito_vacio' }, 400);
  const mensual = li.some(l => l.month), origin = new URL(request.url).origin;
  const resumen = li.map(l => (l.q > 1 ? l.q + ' × ' : '') + l.name).join(' | ');
  const meta = { pedido: txt(resumen, 490), nombre: txt(b.name, 200), empresa: txt(b.empresa, 200) };

  const f = new URLSearchParams();
  f.set('mode', mensual ? 'subscription' : 'payment');
  f.set('success_url', origin + '/#pagado');
  f.set('cancel_url', origin + '/#pago');
  f.set('locale', 'es');
  f.set('allow_promotion_codes', 'true');
  f.set('billing_address_collection', 'required');
  f.set('tax_id_collection[enabled]', 'true');
  const email = txt(b.email, 200);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f.set('customer_email', email);
  li.forEach((l, i) => {
    const p = `line_items[${i}]`;
    f.set(`${p}[quantity]`, String(l.q));
    f.set(`${p}[price_data][currency]`, 'eur');
    f.set(`${p}[price_data][unit_amount]`, String(l.amount));
    f.set(`${p}[price_data][product_data][name]`, l.name);
    f.set(`${p}[price_data][product_data][description]`, l.desc);
    if (l.month) f.set(`${p}[price_data][recurring][interval]`, 'month');
  });
  for (const [k, v] of Object.entries(meta)) if (v) f.set(`metadata[${k}]`, v);
  if (mensual) {
    f.set('subscription_data[description]', txt('kiria.ai · ' + resumen, 490));
    for (const [k, v] of Object.entries(meta)) if (v) f.set(`subscription_data[metadata][${k}]`, v);
    f.set('custom_text[submit][message]', 'Los packs mensuales se renuevan solos cada mes hasta que los canceles. Puedes cancelarlos cuando quieras desde el enlace de tu correo de confirmación o escribiéndonos.');
  } else {
    f.set('customer_creation', 'always');
    f.set('payment_intent_data[description]', txt('kiria.ai · ' + resumen, 990));
    for (const [k, v] of Object.entries(meta)) if (v) f.set(`payment_intent_data[metadata][${k}]`, v);
  }

  let r, s;
  try {
    r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', body: f.toString(),
      headers: { authorization: 'Bearer ' + env.STRIPE_KEY, 'content-type': 'application/x-www-form-urlencoded' } });
    s = await r.json();
  } catch (e) { return json({ error: 'stripe_no_responde' }, 502); }
  if (!r.ok || !s || !s.url) return json({ error: 'stripe', detalle: s && s.error ? txt(s.error.message, 300) : '' }, 502);
  return json({ url: s.url });
}
