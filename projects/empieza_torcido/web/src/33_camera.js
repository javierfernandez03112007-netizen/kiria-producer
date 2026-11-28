// ---------------------------------------------------------------- «Empieza torcido» (v2): LA CÁMARA. De frente y casi quieta (como un escenario): se acerca despacio
// y sube un poco con él. Todo cabe en el plano: él abajo a la izquierda, la escalera en diagonal y la puerta arriba a la derecha; la frase, encima.
let CK = [], CUTS = [];
function buildCam() { const T = TT;
  CK = [
    [0, [0.05, 1.95, 10.4], [0.05, 2.05, 0], 45],
    [T.look + 0.4, [0.0, 1.9, 9.9], [0.0, 2.0, 0], 45],
    [T.fly1, [0.1, 2.1, 9.8], [0.1, 2.2, 0], 45],
    [END, [0.3, 2.45, 9.2], [0.3, 2.55, 0], 45],
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
