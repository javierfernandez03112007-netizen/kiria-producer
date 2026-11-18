// ---------------------------------------------------------------- la escena y su guion, guiado por la voz (K = inicio de cada palabra):
// 1 «viven casi seis mil personas… una eres tú»: toda la población desde arriba y la cámara baja hasta un grupo (con sus nombres)
// 2 «cada seguidor es un habitante… tu casa todavía no existe»: recorre un grupo; el solar vacío con su tienda fantasma
// 3 «hoy es solo un campamento… un pueblo, una ciudad, mercado, banco, impuestos»: llegan más, las tiendas pasan a casas y a edificios
// 4 «una sequía, una subida de precios, una crisis. Y alguien tendrá que decidir»: el lago se seca, suben los precios, todo gris; vuelve a hoy
// 5 «¿quién se sienta en el trono?… reina mañana»: el trono vacío, el comentario con más «me gusta», el cartel sin nombre, baja la corona
// 6 «mándaselo a quien tú no dejarías reinar ni un día»: la gente salta; la cámara vuelve arriba (enlaza con el primer fotograma)
let TL = {};
async function buildScene() {
  TL = { you: K['una_1'], plot0: K['si_2'] - 0.1, plot1: K['hoy_3'] - 0.1, more0: K['cuantos_3'], more1: K['pueblo_3'] - 0.25, town: K['pueblo_3'] - 0.2, city: K['ciudad_3'] - 0.15,
    mercado: K['mercado_3'] - 0.08, banco: K['banco_3'] - 0.08, tax: K['impuestos_3'] - 0.08, dry: K['sequia_4'] - 0.1, price: K['subida_4'] - 0.05, crisis: K['crisis_4'] - 0.08,
    back0: K['y_4'] - 0.05, back1: K['quien_5'] - 0.15, who: K['quien_5'], comment: K['comentario_5'] - 0.05, like: K['gusta_5'], name: K['nombre_5'] - 0.1, reign: K['reina_5'] - 0.12, send: K['mandaselo_6'] };
  S.city = buildCity(); scene.add(S.city); S.people = buildPeople(); scene.add(S.people);
  S.anc = { throne: v3(0, 31, 0), seat: v3(0.6, 11, 0.6), plot: PLOTP.clone().setY(5.2), mercado: v3(CITY.mercado.position.x, 9, CITY.mercado.position.z), banco: v3(CITY.banco.position.x, 21, CITY.banco.position.z),
    hacienda: v3(CITY.hacienda.position.x, 29, CITY.hacienda.position.z), lago: v3(CITY.lagoB.x, 5, CITY.lagoB.z) };
  envAll(scene);
}
function stageAt(t, st) {
  NOW = t; const rw = sm5(seg(t, TL.back0, TL.back1)), live = 1 - rw;                                 // rw: vuelta a «hoy» (se deshace lo que crecerá)
  const town = sm5(seg(t, TL.town, TL.town + 1.0)) * live, city = sm5(seg(t, TL.city, TL.city + 1.15)) * live, crisis = sm5(seg(t, TL.crisis, TL.crisis + 0.45)) * (1 - sm5(seg(t, TL.back0, TL.back0 + 0.5)));
  moodMix({ dia: 1 - 0.85 * crisis, crisis: 0.85 * crisis });
  const crK = win(t, TL.reign, 0.6) * (1 - win(t, END - 0.75, 0.45)), drop = eo(seg(t, TL.reign, TL.reign + 0.75));
  cityAt(t, { town, city, drought: sm5(seg(t, TL.dry, TL.dry + 0.9)) * (1 - sm5(seg(t, TL.back0, TL.back0 + 0.6))), crisis,
    mercado: seg(t, TL.mercado, TL.mercado + 0.4) * live, banco: seg(t, TL.banco, TL.banco + 0.4) * live, hacienda: seg(t, TL.tax, TL.tax + 0.4) * live, coins: seg(t, TL.tax + 0.1, TL.tax + 1.5) * live,
    plot: win(t, TL.plot0, 0.35) * (1 - win(t, TL.plot1, 0.4)),
    crown: { k: crK, y: lerp(60, CITY.throne.userData.seatY + 5.2, drop) + 0.5 * Math.sin(t * 2.6) + (1 - crK) * (t > TL.reign + 1 ? 50 : 0), spin: t * 1.5 } });
  peopleAt(t, { cheer: win(t, TL.reign + 0.45, 0.4) * (1 - win(t, END - 1.3, 0.6)), ghost: seg(t, TL.more0, TL.more1 + 0.4), ghostOut: rw });
  scene.updateMatrixWorld(true); const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
