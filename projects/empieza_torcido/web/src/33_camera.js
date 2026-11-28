// ---------------------------------------------------------------- «Empieza torcido»: LA CÁMARA (un solo plano que se mueve despacio).
// La isla cortada entera (sótano abajo, hierba y cielo arriba) → se acerca a él cuando mira la luz → sigue la escalera mientras se forma → sube con él a la hierba
// → se queda detrás de él, de cara al sol, mientras caen los pétalos.
let CK = [], CUTS = [];
function buildCam() { const T = TT;
  CK = [
    [0, [0.05, -1.0, 8.8], [0.05, -1.1, -0.8], 48],
    [T.look + 0.3, [-0.3, -1.45, 6.6], [-0.4, -1.55, -0.9], 46],                      // se acerca: él mira la luz
    [T.fly0 + 0.6, [0.05, -1.5, 6.9], [0.15, -1.45, -0.8], 46],                        // la escalera que se forma
    [T.push, [0.55, -1.1, 6.8], [0.7, -0.95, -0.8], 46],
    [T.out1, [0.45, 0.5, 6.8], [0.55, 0.85, -1.5], 46],                                 // sube con él a la hierba
    [END, [-0.15, 1.0, 6.3], [-0.1, 1.45, -1.8], 46],                                   // detrás de él, de cara al sol, con el árbol en flor
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { return { focus: st.p.distanceTo(st.l), scale: 0 }; }
