# Web del estudio (venta de vídeos a empresas) — versión base v1

Idea aprobada por el usuario el 31-10-2026 («vamos a partir de esa idea»): **una web muy profesional para vender
vídeos hechos con IA directamente a empresas** (no se vende el motor ni las ideas). Toda versión nueva parte de esta.

- Página: `index.html` (un solo archivo, sin librerías) + `media/` (clips y pósters).
- Vista previa privada (Artifact): https://claude.ai/artifact/31hjcpiCg4H1Wdvx2Qb8vy — se actualiza publicando
  este mismo `index.html` con esa `url`. Solo el dueño la ve hasta que la comparta desde el menú «Compartir».
- Copia fija de esta versión: rama `web-estudio-v1` (commit 5913977; no la muevas). Las etiquetas git no se pueden
  subir desde estas máquinas (el proxy devuelve 403).

## Concepto
Una sala de montaje: la página se lee como un reel vertical. Titular en Anton con el recuadro amarillo de nuestros
subtítulos, vídeos 9:16 y datos técnicos en monoespaciada. Tema oscuro único.
- Colores: `--ink #0a0c10` (fondo), `--panel #12161d`, `--line #252c37`, `--fg #eef2f6`, `--muted #9aa4b2`,
  `--yellow #ffc83d` (recuadro de palabras clave), `--teal #62e3d4`, `--rec #ff4d4d` (punto REC).
- Fuentes (Google Fonts): Anton (titulares), Instrument Sans (texto), JetBrains Mono (datos).

## Secciones (en orden)
1. Cabecera fija: marca + «Pedir un vídeo».
2. Portada: «Vídeos que **paran** el scroll.», móvil con el showreel en bucle, REC y contador de tiempo.
3. Pruebas: 460.000 visualizaciones · 22.000 me gusta · +20 vídeos · 4 marcas.
4. Han confiado en nosotros: Élite Bomberos, Bomberados, Fersalv, Beauty Salon Merche.
5. Trabajos: 6 clips que se cargan y reproducen al verse (Industrial, Software vs Informática, Aeroespacial,
   Bomberados, Civil, Bomberados IA).
6. Formatos: Así es por dentro · El duelo · El dato que sorprende · Pregunta test (con duraciones reales).
7. Anatomía de un reel: barra proporcional de 60 s (imagen imposible → pregunta → datos → respuesta → bucle).
8. Cómo trabajamos: Brief → Guion (se aprueba) → Voz y 3D → Entrega.
9. Qué recibes: especificaciones de entrega.
10. Preguntas frecuentes.
11. Contacto: formulario (en la vista previa solo prepara un mensaje para copiar) + correo, WhatsApp, Instagram.
12. Pie con enlaces legales.

## Datos: solo reales (regla de honestidad de `engine/REGLAS.md`)
Usados en la página:
- **460.000 visualizaciones y 22.000 me gusta** en el reel de Ingeniería Industrial (dicho por el usuario).
- **+20 vídeos**: 21 proyectos con vídeo final en `projects/*/out/`.
- **4 marcas**: la lista que dio el usuario. Élite Bomberos es la academia y Bomberados su app (`bomberados/MARCA.md`).
- Duraciones de los formatos medidas en los vídeos finales: Así es por dentro 60–75 s (Industrial 70,3 · Aero 68,8
  · Mecánica 72,0) · El duelo 60–75 s (Software 71,2 · Civil 61,6 · FP 60,1) · El dato 55–65 s (Bomberados 59,2 ·
  Euríbor 60,0 · Inflación 57,9) · Pregunta test 45–60 s (Bomberados IA 48,2).

Cifras reales que el usuario ya dio y que aún **no** salen (confirmar antes de ponerlas):
- ≈ 800.000 visualizaciones entre todos los vídeos; vídeos con 14.000, 10.000 y 6.000 me gusta.
- Ingeniería Informática: 165.000 visualizaciones y 9.400 me gusta (en el momento en que lo dijo).

## Pendiente (en la página sale como recuadro discontinuo amarillo «pendiente»)
- Nombre comercial del estudio (ahora «kiria.ai · Estudio de vídeo») y dominio.
- Qué se hizo para Fersalv y para Beauty Salon Merche (+ vídeos o capturas), logos y permiso de cada marca para salir.
- Métricas por vídeo y red (capturas), seguidores totales.
- Correo, WhatsApp e Instagram de contacto.
- Plazo habitual de entrega y cuántas rondas de cambios entran.
- Precios: paquetes o «pide presupuesto».
- Opiniones de clientes (texto + nombre + cargo, con permiso).
- Textos legales: titular, NIF y dirección o contacto (aviso legal, privacidad y cookies).
- Para publicarla de verdad: hosting (GitHub Pages o Netlify) y servicio para que el formulario llegue al correo
  (p. ej. Formspree).
- Revisar promesas comerciales: «el vídeo es tuyo para publicarlo donde quieras» (derechos) y la licencia comercial
  de la voz (ElevenLabs exige plan de pago para uso comercial).

## Media
`media/*.mp4`: fragmentos de 7 s a 540×960, sin audio, H.264 crf 27, con su póster `.jpg` del mismo nombre.
`media/showreel.mp4`: 10,2 s, montaje de varios vídeos para la portada. Pesan ≈ 7,4 MB en total.
