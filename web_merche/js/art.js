// Ilustración provisional de cada producto (SVG) mientras no tengamos la foto oficial ni el vídeo.
// Es una silueta genérica por tipo (no imita el envase real de ninguna marca): sirve para ver la maqueta.
// Cuando llegue la foto oficial, products.js lleva `img` y `video` y esto deja de usarse.

let uid = 0;

// sombreado cilíndrico: oscuro en los bordes, brillo cerca del centro
function cyl(id, c) {
  return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="${c}" stop-opacity="1"/>
    <stop offset=".18" stop-color="${mix(c, '#ffffff', .18)}"/>
    <stop offset=".34" stop-color="${mix(c, '#ffffff', .42)}"/>
    <stop offset=".5" stop-color="${mix(c, '#ffffff', .1)}"/>
    <stop offset=".85" stop-color="${mix(c, '#000000', .25)}"/>
    <stop offset="1" stop-color="${mix(c, '#000000', .45)}"/></linearGradient>`;
}

function mix(a, b, k) {
  const pa = hex(a), pb = hex(b);
  const r = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return '#' + r.map(v => v.toString(16).padStart(2, '0')).join('');
}
function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }

const SHAPES = {
  bottle: (g, c, a) => `
    <rect x="168" y="70" width="64" height="56" rx="10" fill="url(#${g}b)"/>
    <path d="M150 140 q0-14 14-14 h72 q14 0 14 14 l14 22 q8 12 8 26 v216 q0 22-22 22 h-100 q-22 0-22-22 v-216 q0-14 8-26z" fill="url(#${g})"/>
    <rect x="148" y="240" width="104" height="96" rx="4" fill="${a}" opacity=".9"/>
    <rect x="148" y="240" width="104" height="96" rx="4" fill="url(#${g}s)" opacity=".5"/>`,
  pump: (g, c, a) => `
    <path d="M190 40 h44 q8 0 8 8 v10 h-30 v28 h-22z" fill="url(#${g}b)"/>
    <rect x="178" y="84" width="44" height="40" rx="6" fill="url(#${g}b)"/>
    <path d="M146 136 q0-14 14-14 h80 q14 0 14 14 v268 q0 24-24 24 h-80 q-24 0-24-24z" fill="url(#${g})"/>
    <rect x="146" y="250" width="108" height="92" fill="${a}" opacity=".9"/>
    <rect x="146" y="250" width="108" height="92" fill="url(#${g}s)" opacity=".5"/>`,
  tube: (g, c, a) => `
    <path d="M140 70 h120 l-6 18 l-30 250 h-48 l-30-250z" fill="url(#${g})"/>
    <path d="M140 62 h120 v14 h-120z" fill="${mix(c, '#000000', .2)}"/>
    <rect x="176" y="338" width="48" height="78" rx="8" fill="url(#${g}b)"/>
    <path d="M152 170 h96 l-8 90 h-80z" fill="${a}" opacity=".9"/>`,
  jar: (g, c, a) => `
    <rect x="118" y="200" width="164" height="54" rx="10" fill="url(#${g}b)"/>
    <path d="M114 254 h172 v148 q0 26-26 26 h-120 q-26 0-26-26z" fill="url(#${g})"/>
    <rect x="114" y="310" width="172" height="64" fill="${a}" opacity=".9"/>
    <rect x="114" y="310" width="172" height="64" fill="url(#${g}s)" opacity=".5"/>`,
  spray: (g, c, a) => `
    <path d="M178 54 h40 q10 0 10 10 v40 h-60 v-40 q0-10 10-10z" fill="url(#${g}b)"/>
    <rect x="218" y="66" width="22" height="10" rx="4" fill="${mix(c, '#000000', .35)}"/>
    <path d="M160 112 q0-10 10-10 h60 q10 0 10 10 v14 q14 8 14 26 v252 q0 24-24 24 h-60 q-24 0-24-24 v-252 q0-18 14-26z" fill="url(#${g})"/>
    <rect x="146" y="236" width="108" height="100" fill="${a}" opacity=".9"/>
    <rect x="146" y="236" width="108" height="100" fill="url(#${g}s)" opacity=".5"/>`,
  oil: (g, c, a) => `
    <rect x="182" y="96" width="36" height="22" rx="4" fill="url(#${g}b)"/>
    <path d="M186 60 h28 v40 h-28z" fill="url(#${g}b)"/>
    <path d="M170 124 h60 q30 22 30 60 v200 q0 24-24 24 h-72 q-24 0-24-24 v-200 q0-38 30-60z" fill="url(#${g})"/>
    <rect x="140" y="270" width="120" height="70" fill="${a}" opacity=".85"/>`,
  iron: (g, c, a) => `
    <g transform="rotate(-62 200 260)">
      <rect x="40" y="226" width="300" height="30" rx="15" fill="url(#${g}h)"/>
      <rect x="40" y="262" width="300" height="30" rx="15" fill="url(#${g}h)" transform="rotate(5 330 262)"/>
      <rect x="60" y="232" width="110" height="18" rx="4" fill="${mix(c, '#ffffff', .25)}" opacity=".55"/>
      <rect x="318" y="236" width="40" height="46" rx="12" fill="${a}"/>
      <path d="M358 258 q40 0 60 30" stroke="${mix(c, '#000000', .3)}" stroke-width="8" fill="none" stroke-linecap="round"/>
    </g>`,
  dryer: (g, c, a) => `
    <rect x="96" y="132" width="210" height="96" rx="48" fill="url(#${g}h)"/>
    <ellipse cx="302" cy="180" rx="22" ry="46" fill="${mix(c, '#000000', .35)}"/>
    <ellipse cx="302" cy="180" rx="12" ry="30" fill="${a}" opacity=".9"/>
    <path d="M150 214 h66 l-14 186 q-2 16-18 16 h-6 q-16 0-18-16z" fill="url(#${g})"/>
    <rect x="166" y="260" width="34" height="8" rx="4" fill="${a}"/>`,
  airstyler: (g, c, a) => `
    <g transform="rotate(-20 200 250)">
      <rect x="176" y="40" width="48" height="300" rx="24" fill="url(#${g})"/>
      <rect x="168" y="44" width="64" height="120" rx="30" fill="url(#${g}b)"/>
      <g fill="${mix(c, '#000000', .45)}">${Array.from({ length: 12 }, (_, i) => `<circle cx="${184 + (i % 3) * 16}" cy="${66 + Math.floor(i / 3) * 24}" r="4"/>`).join('')}</g>
      <rect x="186" y="230" width="28" height="9" rx="4" fill="${a}"/>
      <rect x="190" y="340" width="20" height="60" rx="8" fill="${mix(c, '#000000', .3)}"/>
    </g>`,
  wand: (g, c, a) => `
    <g transform="rotate(-24 200 250)">
      <path d="M186 40 h28 l6 230 h-40z" fill="url(#${g}b)"/>
      <rect x="174" y="270" width="52" height="130" rx="22" fill="url(#${g})"/>
      <rect x="188" y="300" width="24" height="8" rx="4" fill="${a}"/>
      <circle cx="200" cy="38" r="12" fill="${mix(c, '#000000', .3)}"/>
    </g>`,
  cone: (g, c, a) => `
    <path d="M150 170 h100 l44 190 q4 22-18 22 h-152 q-22 0-18-22z" fill="url(#${g})"/>
    <rect x="142" y="140" width="116" height="40" rx="12" fill="url(#${g}b)"/>
    <rect x="118" y="330" width="164" height="12" rx="6" fill="${a}" opacity=".9"/>
    <g fill="${mix(c, '#ffffff', .4)}" opacity=".55">${Array.from({ length: 5 }, (_, i) => `<rect x="${150 + i * 22}" y="230" width="8" height="80" rx="4"/>`).join('')}</g>`,
  box: (g, c, a) => `
    <path d="M110 210 h180 v190 q0 14-14 14 h-152 q-14 0-14-14z" fill="url(#${g})"/>
    <rect x="100" y="176" width="200" height="44" rx="8" fill="url(#${g}b)"/>
    <rect x="188" y="176" width="24" height="238" fill="${a}" opacity=".9"/>
    <path d="M200 176 q-46-60-70-26 q-10 22 70 26 q80-4 70-26 q-24-34-70 26z" fill="${a}"/>`,
  brush: (g, c, a) => `
    <g transform="rotate(-18 200 250)">
      <rect x="150" y="40" width="100" height="190" rx="46" fill="url(#${g}b)"/>
      <g fill="${mix(c, '#ffffff', .55)}">${Array.from({ length: 24 }, (_, i) => `<circle cx="${168 + (i % 4) * 21}" cy="${66 + Math.floor(i / 4) * 27}" r="5"/>`).join('')}</g>
      <rect x="176" y="226" width="48" height="176" rx="22" fill="url(#${g})"/>
      <rect x="188" y="262" width="24" height="8" rx="4" fill="${a}"/>
    </g>`,
};

/** SVG provisional del producto. p.shape, p.tone = [cuerpo, fondo], p.accent */
export function art(p, { label = true, bg: withBg = true } = {}) {
  const id = 'g' + (++uid);
  const body = p.tone?.[0] || '#2a2420';
  const bg = p.tone?.[1] || '#efe6dc';
  const acc = p.accent || '#c9a46a';
  const shape = SHAPES[p.shape] || SHAPES.bottle;
  return `<svg class="art" viewBox="0 0 400 500" role="img" aria-label="${p.name}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="${id}bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="${mix(bg, '#ffffff', .55)}"/><stop offset="1" stop-color="${bg}"/></radialGradient>
      ${cyl(id, body)}
      ${cyl(id + 'b', mix(body, '#000000', .25))}
      <linearGradient id="${id}h" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${mix(body, '#ffffff', .35)}"/><stop offset=".45" stop-color="${body}"/><stop offset="1" stop-color="${mix(body, '#000000', .45)}"/></linearGradient>
      <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
      <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>
    ${withBg ? `<rect width="400" height="500" fill="url(#${id}bg)"/>` : ''}
    <ellipse cx="200" cy="438" rx="120" ry="16" fill="url(#${id}sh)"/>
    <g class="art-obj">${shape(id, body, acc)}</g>
    ${label ? `<text x="200" y="478" text-anchor="middle" class="art-tag">imagen oficial · pendiente</text>` : ''}
  </svg>`;
}
