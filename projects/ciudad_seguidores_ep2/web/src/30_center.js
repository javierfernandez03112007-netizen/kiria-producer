// ---------------------------------------------------------------- la escena y su guion (episodio 2), guiado por la voz (K = inicio de cada palabra):
// 1 «ya tiene nombre: Kiria World… su primer rey… cómo quitarle la corona»: el pueblo desde arriba, el cartel, el rey en el trono
// 2 «ya somos 6.124… cada uno tiene su vida»: una manzana de casas: gente paseando, perros, coches, corrillos, las casas con sus 5 nombres
// 3 la peluquería · 4 el supermercado (el carro lleno, la caja y su cola) · 5 el banco (los guardias sacan el dinero al furgón)
// 6 panaderos, bomberos, taxistas, la profesora, el pescador del lago
// 7–8 «una ciudad de verdad necesita leyes…»: el tablón de leyes vacío, el comentario con más «me gusta», la corona se levanta: nuevo rey
// 9 «mándaselo…»: la cámara vuelve arriba (enlaza con el primer fotograma)
let TL = {};
async function buildScene() {
  TL = { name: K['kiria_1'], king: K['rey_1'], crown: K['corona_1'], pop: K['somos_2'], life: K['vida_2'], pelu: K['peluqueria_3'], hugo: K['hugo_3'], sofia: K['sofia_3'], sup: K['supermercado_4'], carro: K['oscar_4'], caja: K['alanna_4'],
    banco: K['banco_5'], furgon: K['furgon_5'], pan: K['panaderos_6'], bomb: K['bomberos_6'], taxi: K['taxistas_6'], profe: K['profesora_6'], pesca: K['pescador_6'], ley: K['leyes_7'], escribe: K['escribe_7'], gusta: K['gusta_8'],
    cumple: K['cumplira_8'], nuevo: K['nuevo_8'], send: K['mandaselo_9'] };
  S.city = buildCity(); scene.add(S.city); S.sites = buildSites(); scene.add(S.sites); S.people = buildPeople(); scene.add(S.people);
  const ks = PEOPLE.kingS; S.kingHead = ks.y - 0.55 + 2.95 * ks.sc; S.anc = { king: v3(ks.x, S.kingHead + 3.4, ks.z), throne: v3(0, 31, 0) };
  envAll(scene);
}
function stageAt(t, st) {
  NOW = t; const ks = PEOPLE.kingS, lift = sm5(seg(t, TL.nuevo - 0.25, TL.nuevo + 0.7)) * (1 - sm5(seg(t, END - 1.0, END - 0.35))), wob = win(t, TL.crown - 0.2, 0.3) * (1 - win(t, TL.crown + 1.3, 0.4));
  cityAt(t, { crown: { k: 1, s: lerp(0.42, 1.05, lift), x: ks.x, z: ks.z, y: S.kingHead + 0.25 + lift * 11 + 0.35 * wob * Math.abs(Math.sin(t * 7)) + 0.4 * lift * Math.sin(t * 2.4), wob: 0.3 + wob * 1.6 + lift },
    sign: 1 + 0.22 * Math.sin(clamp((t - TL.name) / 0.5) * Math.PI) });
  peopleAt(t, { cheer: 0.55 * win(t, TL.name + 0.1, 0.3) * (1 - win(t, TL.king + 0.8, 0.6)) });
  S.lift = lift; scene.updateMatrixWorld(true); const c = st.l; lightsAt(c, st.p.distanceTo(c));
}
