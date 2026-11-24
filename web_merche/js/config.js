// Ajustes de la tienda. Todo lo que dependa de Merche se cambia aquí, no en el código.
export const SHOP = {
  name: 'Beauty Salon Merche',
  city: 'Motril (Granada)',
  // Intro: cuando tengamos el vídeo con IA (Merche dando la bolsa), se ponen aquí las rutas.
  // Mientras estén vacías, la web abre con la bolsa en 3D.
  intro: { video: { portrait: '', landscape: '' } }, // p. ej. 'media/intro_9x16.mp4' y 'media/intro_16x9.mp4'
  // Barra de avisos de arriba (van rotando). PENDIENTE: confirmar plazos y precios de envío con Merche.
  avisos: [
    'Con cada compra, el vídeo tutorial de Merche',
    'Producto original ghd y Schwarzkopf Professional',
    'Recogida gratis en el salón · Motril',
    'Envío 24/48 h a la península',
  ],
};
