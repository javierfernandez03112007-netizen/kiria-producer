# Fuentes · «La ciudad de los seguidores», episodio 1

| Dato del vídeo | Fuente |
|---|---|
| «Casi seis mil personas» · barra «5.997 habitantes» | Exportación oficial de Instagram de la cuenta kiria.ai («Descargar tu información» → Seguidores y seguidos, JSON), hecha por Javi el 17-11-2026: `followers_1.json` trae 5.997 seguidores; el último, del 17-11-2026 a las 23:28. Metricool daba 5.882 el 16-11-2026. |
| Un hogar por cada 5 seguidores (1.200 tiendas de campaña) | Regla de la serie (Javi, 18-11-2026): 5.997 / 5 = 1.199,4 → 1.200 hogares. El hogar n es de los seguidores 5n … 5n+4 por orden de llegada. |
| El contador de «me gusta» de la tarjeta del comentario (hasta 2.431) | EJEMPLO ilustrativo de la mecánica (no es un comentario real). |
| Sequía, subida de precios, crisis, mercado, banco, impuestos | No son datos: es lo que pasará en la ciudad en los próximos episodios (decisiones del rey). |

## Datos personales
- Los nombres que salen en pantalla son los nombres de usuario públicos de los seguidores de la cuenta.
- **Ni la exportación de Instagram ni la lista de nombres están en el repositorio.** En el repo solo va el número de habitantes; los nombres los pone
  el montaje en local (`out/names.json` y `out/labels.jsonl`, carpeta ignorada por git). Del archivo de Instagram solo se usó `followers_1.json`;
  el resto se borró al descomprimirlo.
- Se ocultan los nombres ofensivos (3 en este episodio) y se quita a quien lo pida.

## Estilo
Ciudad vista en diagonal desde arriba, como los juegos de construir ciudades (referencia de Javi, 18-11-2026). Diseño propio: no copia ningún
juego concreto ni usa sus gráficos.
