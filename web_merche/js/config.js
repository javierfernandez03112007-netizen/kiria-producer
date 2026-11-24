// Ajustes de la tienda. Todo lo que dependa de Merche se cambia aquí, no en el código.
export const SHOP = {
  name: 'Beauty Salon Merche',
  owner: 'Merche Herrera',
  city: 'Motril (Granada)',
  address: 'Urb. El Pilar, C/ Ntra. Sra. de Lourdes s/n, 18600 Motril', // dato de su web de 2022: CONFIRMAR
  whatsapp: '', // PENDIENTE: número con prefijo, p. ej. '34600000000'
  // Intro: cuando tengamos el vídeo con IA (Merche dando la bolsa), se ponen aquí las rutas.
  // Mientras estén vacías, la web abre con la bolsa en 3D.
  intro: { video: { portrait: '', landscape: '' } }, // p. ej. 'media/intro_9x16.mp4' y 'media/intro_16x9.mp4'
  // Fotos y vídeos generales. Se rellenan cuando Javi los mande (rutas dentro de la web).
  media: {
    heroVideo: '',                    // vídeo de Merche en su mostrador (bucle, sin sonido), p. ej. 'media/hero.mp4'
    heroPoster: 'img/bolsa-hero.jpg', // imagen fija mientras carga (o mientras no haya vídeo)
    merchePhoto: '',                  // foto de Merche en el salón, p. ej. 'img/merche.jpg'
    tutorialTeaser: '',               // trozo de un tutorial para la sección «Merche te enseña», p. ej. 'media/tutorial.mp4'
  },
  // Barra de avisos de arriba (van rotando). PENDIENTE: confirmar plazos y precios de envío con Merche.
  avisos: [
    'Con cada compra, el vídeo tutorial de Merche',
    'Producto original ghd y Schwarzkopf Professional',
    'Recogida gratis en el salón · Motril',
    'Envío 24/48 h a la península',
  ],
  // Envíos. PENDIENTE: todo esto son propuestas; lo decide Merche.
  shipping: {
    freeFrom: 49,
    cutoffHour: 14,
    methods: [
      { id: 'estandar', label: 'Envío estándar', detail: 'Península · 24–72 h laborables', price: 4.95 },
      { id: 'expres', label: 'Envío exprés', detail: 'Península · 24 h laborables', price: 7.95, noFree: true },
      { id: 'recogida', label: 'Recogida en el salón', detail: 'Motril · gratis · te avisamos cuando esté listo', price: 0, pickup: true },
      { id: 'baleares', label: 'Baleares', detail: '48–96 h laborables', price: 9.95, noFree: true },
    ],
  },
  // «Lo más vendido»: PROVISIONAL (elección nuestra). Hay que cambiarlo por lo que más vende Merche de verdad.
  best: ['ghd-gold', 'ghd-chronos', 'ghd-helios', 'sk-blondme-champu-morado', 'ghd-platinum-plus', 'sk-repair-rescue-iluminador',
    'ghd-chronos-curve-classic', 'sk-osis-flatliner', 'ghd-duet-style', 'sk-fibre-clinix-fortify-champu'],
  // «¿Cuál es tu ghd?»: textos orientativos nuestros a partir de los datos de la marca. Que los revise Merche.
  ghdGuide: [
    { id: 'ghd-original', si: 'quieres tu primera ghd y un liso sencillo para el día a día.' },
    { id: 'ghd-gold', si: 'buscas la de siempre: fiable, para liso y ondas, sin complicarte.' },
    { id: 'ghd-platinum-plus', si: 'tienes el pelo teñido o delicado y te lo planchas a menudo.' },
    { id: 'ghd-chronos', si: 'vas con prisa y quieres que el peinado te aguante todo el día.' },
    { id: 'ghd-sculpt', si: 'quieres lo último: que la plancha mida tu pelo y adapte el calor sola.' },
  ],
  // Packs: el precio es la suma de los productos (sin descuento inventado). Merche decide si hay precio de pack.
  packs: [
    { id: 'primera-ghd', name: 'Tu primera ghd', sub: 'La plancha clásica y su protector', items: ['ghd-gold', 'ghd-bodyguard'] },
    { id: 'invitada', name: 'Kit invitada', sub: 'Ondas que aguantan toda la boda', items: ['ghd-chronos-curve-classic', 'sk-osis-session', 'sk-osis-dust-it'] },
    { id: 'rubia', name: 'Rubia sin amarillo', sub: 'Matiza y repara el rubio', items: ['sk-blondme-champu-morado', 'sk-fibre-clinix-aceite-ligero'] },
    { id: 'rescate', name: 'Rescate', sub: 'La rutina completa para pelo dañado', items: ['sk-repair-rescue-champu', 'sk-repair-rescue-iluminador', 'sk-repair-rescue-puntas'] },
  ],
};

// Lo que necesita el pelo → etiqueta `needs` de cada producto. `home`: sale en la lista grande de la portada.
export const NEEDS = [
  { id: 'alisar', label: 'Alisar', sub: 'Planchas, cepillos y protectores', home: true },
  { id: 'secar', label: 'Secar', sub: 'Secadores y moldeadores de aire', home: true },
  { id: 'rizar', label: 'Rizar y ondular', sub: 'Tenacillas, rizadores y planchas', home: true },
  { id: 'volumen', label: 'Dar volumen', sub: 'Raíz levantada y cuerpo', home: true },
  { id: 'reparar', label: 'Reparar', sub: 'Pelo dañado, poroso o que se rompe', home: true },
  { id: 'hidratar', label: 'Hidratar', sub: 'Pelo seco o áspero' },
  { id: 'encrespamiento', label: 'Sin encrespamiento', sub: 'Pelo que se eriza con la humedad' },
  { id: 'rubio', label: 'Cuidar el rubio', sub: 'Adiós al tono amarillo', home: true },
  { id: 'color', label: 'Proteger el color', sub: 'Que el tinte dure más', home: true },
  { id: 'rizos-naturales', label: 'Rizos naturales', sub: 'Definir y cuidar el rizo' },
  { id: 'cuero-cabelludo', label: 'Cuero cabelludo', sub: 'Caída, caspa, grasa o sensibilidad' },
  { id: 'fijacion', label: 'Fijar el peinado', sub: 'Lacas y textura para recogidos', home: true },
  { id: 'proteccion-calor', label: 'Proteger del calor', sub: 'Antes de la plancha o el secador' },
  { id: 'brillo', label: 'Dar brillo', sub: 'Acabado pulido y luminoso' },
];

export const GROUPS = {
  herramientas: { label: 'Herramientas', cats: ['plancha', 'secador', 'moldeador', 'rizador', 'cepillo-termico', 'cepillo', 'accesorio'] },
  cuidado: { label: 'Cuidado', cats: ['champu', 'acondicionador', 'mascarilla', 'tratamiento', 'aceite'] },
  peinado: { label: 'Peinado', cats: ['styling', 'laca', 'protector'] },
};

export const CATS = {
  plancha: 'Planchas', secador: 'Secadores', moldeador: 'Moldeadores de aire', rizador: 'Rizadores', 'cepillo-termico': 'Cepillos térmicos',
  cepillo: 'Cepillos', accesorio: 'Accesorios', champu: 'Champús', acondicionador: 'Acondicionadores', mascarilla: 'Mascarillas',
  tratamiento: 'Tratamientos', aceite: 'Aceites, sérums y brillo', styling: 'Textura y forma', laca: 'Lacas', protector: 'Protectores térmicos', pack: 'Estuches',
};
