// ---------------------------------------------------------------- «La sombra»: LA CÁMARA (lenta). Plano general desde detrás del farol: él pequeño, su sombra llenando la
// pared → al crecer la sombra, la cámara se aparta y sube un poco → cuando avanza, la cámara le sigue y baja → al final, de lado: él y su sombra del mismo tamaño.
let CK = [], CUTS = [];
function buildCam() { const T = TT;
  CK = [
    [0, [0.12, 1.55, 8.9], [0.42, 3.7, -3.0], 56],                                       // él abajo, pequeño; su sombra, toda la pared
    [T.startle, [0.1, 1.5, 8.6], [0.4, 3.7, -3.0], 56],
    [T.back1 + 0.3, [0.12, 1.45, 9.4], [0.5, 4.3, -3.0], 60],                             // la sombra crece: la cámara se aparta y mira arriba
    [T.rise0, [0.1, 1.45, 9.2], [0.45, 4.1, -3.0], 59],
    [T.walk0, [0.15, 1.5, 8.6], [0.35, 3.4, -3.0], 56],
    [T.walk0 + 3.6, [0.8, 1.65, 4.4], [-0.1, 1.65, -3.0], 52],                             // le sigue
    [T.walk1 + 0.1, [1.55, 1.6, 1.7], [0.3, 1.45, -3.0], 46],                               // de lado: él y su sombra
    [END, [1.6, 1.5, 0.5], [0.33, 1.4, -3.0], 42],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
