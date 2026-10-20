# Reglas del motor kiria.ai (todas obligatorias en cada vídeo)

## Las tres reglas de retención
1. **El primer segundo es lo más raro del vídeo.** Nada de título, «hola» ni logo: una imagen imposible o
   inesperada que obligue a parar el dedo (un billete que se derrite, una casa que respira, una moneda que se
   aplasta en dónut…). El tema se entiende después.
2. **Cada frase se ve justo cuando se oye.** Lo que se nombra aparece en ese mismo instante (±0,05 s) y los
   objetos se TRANSFORMAN en lo que se dice: si la voz dice «dónut», el objeto que hay en pantalla se aplasta
   hasta ser un dónut. Herramientas: `engine/web/cues.js` (segundo exacto de cada palabra a partir de
   `tiempos.json`) y `engine/web/morph.js` (`Morpher`: esfera, dónut, tortita, cubo, moneda, cilindro, cono,
   billete, gota, anillo, píldora, corazón… y `squash` para el aplastamiento elástico).
3. **La respuesta llega al final.** El guion abre una pregunta en los primeros segundos y no la responde hasta
   el cierre (bucle abierto). En medio se dan pistas, nunca la respuesta. Plantilla: `engine/GUION.md`.

## Honestidad
- No inventar cifras. Cada dato con fuente en `FUENTES.md`; los ejemplos propios, marcados «EJEMPLO».
- No culpar a países ni dar causas políticas: atribuir («según el BCE…»).
- «No es asesoramiento financiero» cuando el tema sea de finanzas personales.
- Sin logotipos reales de marcas; sin direcciones reales; vídeo de archivo solo de dominio público.

## Estilo
- Monocromo (negro, blanco y grises). Cámara siempre en movimiento; los datos aparecen mientras se mueve.
- Cambios negro↔blanco solo acercándose a un objeto blanco o negro; nunca una bola o círculo que crece.
- Poco desenfoque. Figuras de ingeniería (cotas, despieces, solo aristas) mejor que gráficos al uso.
- Subtítulos palabra a palabra (`engine/subs.py`): palabra clave en recuadro, emojis en gris.
- 1080x1920, 30 fps, ≈ 60 s (o lo que pida la voz), bucle: el último fotograma enlaza con el primero.
- Voz en español de España (ElevenLabs). Audio estéreo AAC.
