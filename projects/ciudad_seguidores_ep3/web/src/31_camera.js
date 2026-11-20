// ---------------------------------------------------------------- LA CÁMARA: un solo plano, sin cortes. Empieza pegada al pergamino (el sello cae), sube a la cara del rey, vuelve
// a leer la ley, el rey señala a cámara, sale volando por la puerta a la plaza (estelas de polvo), recorre las tres tiendas por sus cristales, sigue la
// cola hasta la esquina, ve escaparse al perro, cruza a la plaza (el pedestal vacío, la tarjeta del comentario, la estatua de oro) y vuelve al salón
// hasta el mismo pergamino del principio (bucle).
let CK = [], CUTS = [];
function buildCam() { const T = TL, P0 = [1.3, 2.4, -30.95], L0 = [0.93, 2.15, -31.66];
  CK = [
    [0, P0, L0, 36], [T.stamp - 0.3, [1.27, 2.42, -31.0], [0.94, 2.17, -31.66], 36], [T.stamp + 0.2, [1.25, 2.38, -31.03], [0.94, 2.13, -31.66], 36],                                                        // el sello cae sobre la ley
    [T.trono - 0.2, [0.78, 2.62, -30.85], [0.08, 2.33, -32.4], 34], [T.ley2 - 0.1, [0.62, 2.56, -30.6], [0.05, 2.32, -32.4], 34],           // la cara del rey
    [T.semana - 0.15, [0.97, 2.6, -31.48], [0.85, 2.03, -31.85], 30], [T.seguidor + 0.3, [0.93, 2.5, -31.42], [0.85, 2.03, -31.85], 30],     // la ley, de cerca
    [T.final - 0.1, [0.42, 2.72, -29.3], [0.0, 2.27, -32.3], 36], [T.E[3] + 0.12, [0.25, 2.9, -27.6], [0.0, 2.2, -32.0], 38],               // «cómo ser tú»: el rey señala
    [T.E[3] + 0.5, [0.4, 2.9, -26.9], [2.6, 2.6, -29.8], 40], [T.E[3] + 0.95, [0.5, 2.9, -25.6], [3.7, 2.6, -24.8], 40], [T.E[3] + 1.4, [0.4, 2.87, -23.4], [2.6, 2.7, -19.8], 41], [T.crece, [0.3, 2.85, -21.0], [1.5, 2.6, -14.0], 42],   // giro suave hacia la puerta                     // gira hacia la puerta…
    [T.pedis - 0.2, [0.0, 2.85, -15.4], [2.0, 2.8, -5.0], 44], [T.E[4] + 0.15, [6.0, 3.4, -8.0], [24.0, 2.8, -7.0], 44],                  // …sale a la plaza y mira a las tiendas
    [T.sushi - 0.1, [16.8, 2.1, -9.0], [25.5, 1.9, -8.4], 40], [T.sushi + 1.0, [21.6, 1.7, -8.8], [27.2, 1.35, -8.6], 40],                // el sushi lleno
    [T.mesa - 0.05, [22.6, 1.65, -6.6], [25.0, 1.7, -5.5], 40], [T.E[5] - 0.05, [22.75, 1.7, -5.3], [25.0, 1.6, -5.5], 40], [T.E[5] + 0.3, [20.6, 2.0, -3.6], [25.3, 1.8, -3.0], 42],   // se aparta de la fachada para pasar a la pastelería              // «COMPLETO»
    [T.past + 0.15, [21.6, 1.9, -2.2], [25.6, 1.45, -1.4], 42], [T.tartas + 0.2, [22.6, 1.55, -1.6], [25.8, 1.1, -1.9], 40],              // el escaparate de tartas
    [T.cola - 0.2, [22.2, 2.2, 0.8], [23.6, 1.45, 7.0], 44], [T.esquina + 0.3, [22.0, 2.4, 5.6], [23.7, 1.4, 14.5], 44],                   // la cola hasta la esquina
    [T.vet + 0.1, [24.2, 1.7, 5.4], [27.3, 1.25, 5.9], 40], [T.vacunar - 0.5, [24.3, 1.5, 6.0], [27.4, 1.0, 6.2], 38], [T.E[7] - 0.2, [24.3, 1.462, 6.477], [27.278, 0.621, 7.077], 38.7],   // el perro
    [T.E[7] + 0.15, [24.25, 3.0, 6.75], [26.2, 0.45, 4.9], 41],   // sube mirando hacia abajo por el cristal (la cámara está a 0,7 m de la fachada)
    [T.E[7] + 0.32, [23.807, 3.219, 6.863], [23.9, 0.4, 3.6], 42],   // pasa por encima de la cola mirando la fila desde arriba (sin barrer la pared)
    [T.E[7] + 0.5, [22.9, 3.4, 7.0], [21.18, 2.4, 2.73], 43], [T.E[7] + 0.85, [20.3, 3.9, 7.5], [15.0, 3.0, 2.7], 45],   // y gira hacia la plaza (por el sur)
    [T.L[8] + 0.7, [16.8, 4.2, 7.8], [5.0, 2.5, 2.6], 46], [T.pedestal + 0.1, [2.3, 2.2, 6.3], [0.0, 2.0, 0.0], 42],                         // a la plaza: el pedestal vacío
    [T.coment, [2.7, 2.4, 5.2], [0.0, 3.4, 0.0], 42], [T.construir, [2.9, 2.5, 4.6], [0.0, 3.6, 0.0], 42], [T.estatua + 0.5, [3.2, 2.3, 5.8], [0.0, 3.9, 0.0], 46], [T.E[9] + 0.1, [2.1, 1.85, 3.7], [0.0, 2.3, 0.3], 42],
    [T.manda + 0.2, [1.6, 4.2, -3.0], [0.5, 3.0, -20.0], 46], [T.estatua10 + 0.1, [0.4, 2.9, -16.0], [0.6, 2.5, -28.0], 44], [END - 0.45, [1.38, 2.5, -30.7], [0.93, 2.15, -31.66], 38],   // vuelta al salón…
    [END, P0, L0, 36],                                                                                                                         // …y al pergamino (bucle)
  ];
  for (let i = 1; i < CK.length; i++) if (CK[i][0] <= CK[i - 1][0]) console.error('ERROR claves de cámara desordenadas en ' + i + ': ' + CK[i - 1][0].toFixed(2) + ' → ' + CK[i][0].toFixed(2)); }
function camAt(t) { return camKeys(clamp(t, 0, END), CK); }
function prevT(t, dt) { return Math.max(0, t - dt); }
function whiteAt(t) { return 0; }
function flashAt(t) { return 0; }
function dofAt(t, st) { const f = st.p.distanceTo(st.l); return { focus: f, scale: f < 1.2 ? 0.35 * f : 0.05 * f }; }
