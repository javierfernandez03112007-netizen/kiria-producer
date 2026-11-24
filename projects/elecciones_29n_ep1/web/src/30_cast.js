// ---------------------------------------------------------------- 29N · LOS CUATRO CANDIDATOS: sus FOTOS REALES (Wikimedia Commons; autor y licencia en FUENTES.md),
// igualadas por retratos.py (misma escala, misma altura de ojos, el color de su partido detrás). Cada foto va en una pantalla vertical detrás de su atril, con un poco
// de relieve (la cabeza sale de la pantalla: al moverse la cámara se nota el volumen). No se les anima ni se les hace hablar: son sus fotos, no vídeo generado.
// (Javi, 24-11: «lo más realista posible»: fuera los muñecos.)
const T = {};
const PARTY = {
  pp: { sig: 'PP', col: 0x1f86e0, css: '#1f86e0', ink: '#ffffff', who: 'Alberto Núñez Feijóo', short: 'Feijóo' },
  psoe: { sig: 'PSOE', col: 0xe30613, css: '#e30613', ink: '#ffffff', who: 'Pedro Sánchez', short: 'Sánchez' },
  vox: { sig: 'VOX', col: 0x5dbb2a, css: '#5dbb2a', ink: '#ffffff', who: 'Santiago Abascal', short: 'Abascal' },
  fa: { sig: 'FRENTE AMPLIO', col: 0xff5a1f, css: '#ff5a1f', ink: '#d6f23c', who: 'Ada Colau', short: 'Colau' },
};
const ORDER = ['pp', 'psoe', 'vox', 'fa'];            // orden de escaños en el Congreso saliente (2023): el mismo en la voz, en el plató y en la serie
// la pantalla: ancho y alto (m), altura de su borde de abajo sobre el suelo del atril, cuánto queda detrás del atril, y dónde caen los ojos y la barbilla (fracción desde arriba)
const TOTEM = { W: 0.92, H: 1.38, Y: 0.95, Z: -0.4, EYE: 470 / 1350, CHIN: 0.545, RELIEF: 0.085 };
function totemFrame(col, zone = 'city') { const g = new THREE.Group(), W = TOTEM.W, H = TOTEM.H, fr = stdM(0x0a0c11, 0.35, { metalness: 0.6 });
  g.add(box(W + 0.07, H + 0.07, 0.05, fr, 0, H / 2, -0.02)); g.add(box(0.16, TOTEM.Y + 0.02, 0.1, fr, 0, -TOTEM.Y / 2, -0.06));
  const strip = nightMat(new THREE.MeshStandardMaterial({ color: 0x050505, emissive: col, emissiveIntensity: 2.6, roughness: 0.4 }), zone);
  for (const s of [-1, 1]) g.add(box(0.022, H + 0.07, 0.03, strip, s * (W / 2 + 0.046), H / 2, 0)); g.add(box(W + 0.114, 0.022, 0.03, strip, 0, H + 0.046, 0));
  shadowAll(g, true, true); return { g, strip }; }
// mapa de relieve de un retrato (imagen en gris) leído a memoria: el relieve se aplica a la malla una vez (material sin luces: mucho más rápido de pintar)
async function depthData(file) { const im = new Image(); im.src = ASSET + file; await im.decode(); const c = cnv(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }; }
// pantalla de un candidato: su foto (emite luz: no depende de los focos) con relieve. El brillo se cambia con mat.color.
function totem(id) { const { g, strip } = totemFrame(PARTY[id].col, 'tot_' + id), map = tx('cand_' + id + '.jpg'), D = S.depth[id];
  const mat = new THREE.MeshBasicMaterial({ map }), geo = new THREE.PlaneGeometry(TOTEM.W, TOTEM.H, 60, 90), P = geo.attributes.position, UV = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) { const x = Math.min(D.w - 1, Math.round(UV.getX(i) * (D.w - 1))), y = Math.min(D.h - 1, Math.round((1 - UV.getY(i)) * (D.h - 1))); P.setZ(i, TOTEM.RELIEF * D.d[(y * D.w + x) * 4] / 255); }
  const scr = new THREE.Mesh(geo, mat); scr.position.set(0, TOTEM.H / 2, 0.012); g.add(scr);
  return { g, mat, strip, scr }; }
// pantalla de otro partido (hay más de cuatro): apagada, con una silueta genérica que se enciende un momento
function dimTotem() { const { g, strip } = totemFrame(0x8a93a6); strip.emissiveIntensity = 0.25;
  const t = signTex(300, 450, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0e15'); gr.addColorStop(1, '#1b212d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3b4352'; c.beginPath(); c.arc(w / 2, h * 0.36, w * 0.2, 0, 7); c.fill(); c.beginPath(); c.ellipse(w / 2, h * 0.86, w * 0.4, h * 0.3, 0, Math.PI, 0); c.fill(); });
  const mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color().setScalar(0.1) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(TOTEM.W, TOTEM.H), mat); scr.position.set(0, TOTEM.H / 2, 0.012); g.add(scr); return { g, mat, strip }; }
