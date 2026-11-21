// Intro de 5 s. Si hay vídeo (el de la IA: Merche en el mostrador dando la bolsa) se reproduce ese.
// Si no, se dibuja en 3D: la bolsa de Beauty Salon Merche en un mostrador de mármol, la cámara se acerca
// al nombre, sube y se mete dentro de la bolsa, donde hay luz → la luz se convierte en la tienda.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function playIntroVideo(host, src, onDone) {
  const v = document.createElement('video');
  Object.assign(v, { src, muted: true, playsInline: true, autoplay: true, preload: 'auto' });
  v.className = 'intro-video';
  host.appendChild(v);
  let done = false;
  const finish = () => { if (!done) { done = true; onDone(); } };
  v.addEventListener('ended', finish);
  v.addEventListener('error', () => finish(false));
  v.play().catch(() => finish());
  return () => { finish(); v.pause(); };
}

// ---------- texturas hechas en canvas ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function marble() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#ece6df'; g.fillRect(0, 0, w, h);
    // nubes suaves
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, rad = 80 + r() * 260;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${200 + r() * 30},${190 + r() * 25},${180 + r() * 25},.25)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    // vetas
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      let x = r() * w, y = r() * h; g.moveTo(x, y);
      const n = 6 + r() * 8;
      for (let k = 0; k < n; k++) { const nx = x + (r() - .3) * 360, ny = y + (r() - .5) * 220; g.quadraticCurveTo((x + nx) / 2 + (r() - .5) * 120, (y + ny) / 2 + (r() - .5) * 120, nx, ny); x = nx; y = ny; }
      const gold = r() < .25;
      g.strokeStyle = gold ? `rgba(176,140,88,${.35 + r() * .3})` : `rgba(120,110,104,${.12 + r() * .25})`;
      g.lineWidth = gold ? .8 + r() * 1.6 : .6 + r() * 3;
      g.filter = `blur(${r() * 1.5}px)`; g.stroke(); g.filter = 'none';
    }
  });
}

function paperRough() {
  return canvasTex(512, 512, (g, w, h) => {
    const im = g.createImageData(w, h), r = rng(3);
    for (let i = 0; i < w * h; i++) { const v = 150 + r() * 70; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, false);
}

// el nombre en la bolsa: blanco sobre negro = máscara para el dorado (alphaMap)
function logoMask() {
  const t = canvasTex(1600, 2000, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    // marco fino
    g.lineWidth = 5; g.strokeRect(110, 140, w - 220, h - 280);
    g.lineWidth = 2; g.strokeRect(132, 162, w - 264, h - 324);
    g.font = '500 78px Jost, Futura, sans-serif';
    g.letterSpacing = '30px';
    g.fillText('BEAUTY SALON', w / 2 + 15, h * .40);
    g.letterSpacing = '0px';
    g.font = 'italic 400 360px "Bodoni Moda", Didot, serif';
    g.fillText('Merche', w / 2, h * .58);
    g.fillRect(w / 2 - 120, h * .655, 240, 4);
    g.font = '500 52px Jost, Futura, sans-serif'; g.letterSpacing = '22px';
    g.fillText('MOTRIL', w / 2 + 11, h * .73);
  }, false);
  return t;
}

function glowTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(.35, 'rgba(255,214,160,.45)'); gr.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// papel de seda arrugado
function tissue(color, seed) {
  const geo = new THREE.PlaneGeometry(.62, .5, 40, 32);
  const p = geo.attributes.position, r = rng(seed);
  const fx = [r() * 9 + 6, r() * 9 + 6, r() * 14 + 10], ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const edge = clamp((y + .25) / .5);
    const z = .035 * Math.sin(x * fx[0] + ph[0]) * Math.cos(y * fx[1] + ph[1]) + .014 * Math.sin((x + y) * fx[2] + ph[2]) + (r() - .5) * .006;
    p.setZ(i, z * (.4 + edge));
    p.setX(i, x * (1 - .25 * edge * edge));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .92, side: THREE.DoubleSide }));
}

// ---------- bolsa ----------
function makeBag() {
  const W = 1.0, H = 1.25, D = .42;
  const bag = new THREE.Group();
  const rough = paperRough();
  const paper = new THREE.MeshStandardMaterial({ color: '#15110f', roughness: .62, roughnessMap: rough, metalness: 0 });
  const inside = new THREE.MeshStandardMaterial({ color: '#2a201a', roughness: .9, side: THREE.BackSide });
  const face = (w, h) => new THREE.PlaneGeometry(w, h);

  const front = new THREE.Mesh(face(W, H), paper); front.position.set(0, H / 2, D / 2);
  const back = new THREE.Mesh(face(W, H), paper); back.position.set(0, H / 2, -D / 2); back.rotation.y = Math.PI;
  bag.add(front, back);
  // laterales con fuelle (pliegue hacia dentro)
  for (const s of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    const v = [], idx = [];
    const pts = [[-D / 2, 0], [0, -.06], [D / 2, 0]];
    for (let j = 0; j <= 1; j++) for (const [z, dx] of pts) v.push(s * (W / 2 + dx), j * H, z);
    idx.push(0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5);
    if (s < 0) idx.reverse();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    bag.add(new THREE.Mesh(g, paper));
  }
  const bottom = new THREE.Mesh(face(W, D), paper); bottom.rotation.x = Math.PI / 2; bottom.position.y = .002; bag.add(bottom);
  // interior oscuro
  const inner = new THREE.Mesh(new THREE.BoxGeometry(W - .01, H - .01, D - .01), inside); inner.position.y = H / 2; bag.add(inner);
  // borde superior doblado
  const rimM = paper.clone(); rimM.color.set('#1d1714');
  for (const z of [D / 2, -D / 2]) { const r = new THREE.Mesh(new THREE.BoxGeometry(W, .055, .008), rimM); r.position.set(0, H - .028, z + Math.sign(z) * .002); bag.add(r); }

  // nombre en dorado (hoja metálica)
  const foil = new THREE.MeshStandardMaterial({ color: '#e2c27f', metalness: 1, roughness: .26, alphaMap: logoMask(), transparent: true });
  const logo = new THREE.Mesh(face(W * .92, H * .92), foil); logo.position.set(0, H / 2 - .02, D / 2 + .0015); bag.add(logo);

  // asas de cinta satinada
  const satin = new THREE.MeshStandardMaterial({ color: '#c8a26a', metalness: .35, roughness: .32 });
  for (const z of [D / 2 + .004, -D / 2 - .004]) {
    const lean = Math.sign(z) * .06;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.2, H - .07, z), new THREE.Vector3(-.21, H + .14, z + lean), new THREE.Vector3(-.1, H + .33, z + lean * 1.6),
      new THREE.Vector3(.1, H + .33, z + lean * 1.6), new THREE.Vector3(.21, H + .14, z + lean), new THREE.Vector3(.2, H - .07, z)]);
    bag.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, .011, 10, false), satin));
    for (const x of [-.2, .2]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .01, 20), satin); k.rotation.x = Math.PI / 2; k.position.set(x, H - .07, z); bag.add(k); }
  }

  // papel de seda asomando
  const t1 = tissue('#f3e6dd', 11); t1.position.set(-.3, H + .08, -.06); t1.rotation.set(-.1, .5, .35); t1.scale.set(.7, .8, 1); bag.add(t1);
  const t2 = tissue('#ead1c4', 23); t2.position.set(.3, H + .07, -.08); t2.rotation.set(.12, -.5, -.35); t2.scale.set(.7, .8, 1); bag.add(t2);
  const t3 = tissue('#fbf3ec', 37); t3.position.set(.05, H + .06, -.17); t3.rotation.set(.25, .05, .04); t3.scale.set(.8, .7, 1); bag.add(t3);

  // luz dentro de la bolsa (adonde entra la cámara)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.position.set(0, H * .45, 0); glow.scale.set(.9, .9, 1); bag.add(glow);
  const inLight = new THREE.PointLight('#ffd9a8', 0, 1.6, 1.5); inLight.position.set(0, H * .5, 0); bag.add(inLight);

  bag.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  inner.castShadow = false;
  return { bag, glow, inLight, H };
}

export async function playIntro3D(host, onDone, { duration = 5.4 } = {}) {
  try { await Promise.race([Promise.all([document.fonts.load('italic 400 100px "Bodoni Moda"'), document.fonts.load('500 40px Jost')]), new Promise(r => setTimeout(r, 1200))]); } catch { }

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'intro-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const bgc = new THREE.Color('#1b1512');
  scene.background = bgc; scene.fog = new THREE.Fog(bgc, 5, 12);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;

  const cam = new THREE.PerspectiveCamera(32, 1, .02, 40);

  // mostrador de mármol con canto de latón
  const top = new THREE.Mesh(new THREE.BoxGeometry(7, .12, 2.6), new THREE.MeshStandardMaterial({ map: marble(), roughness: .18, metalness: 0 }));
  top.position.set(0, -.06, -.3); top.receiveShadow = true; scene.add(top);
  const brass = new THREE.Mesh(new THREE.BoxGeometry(7, .025, .03), new THREE.MeshStandardMaterial({ color: '#c79f5e', metalness: 1, roughness: .25 }));
  brass.position.set(0, -.02, 1.0); scene.add(brass);
  const front = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, .1), new THREE.MeshStandardMaterial({ color: '#2b211c', roughness: .5 }));
  front.position.set(0, -.82, .96); scene.add(front);

  // pared del salón con luces desenfocadas (bokeh)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: '#3a2c24', roughness: 1 }));
  wall.position.set(0, 2, -5); scene.add(wall);
  const bokehMap = glowTex(), r = rng(5);
  for (let i = 0; i < 38; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokehMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .12 + r() * .25, fog: false }));
    const sz = .25 + r() * .7; s.scale.set(sz, sz, 1);
    s.position.set((r() - .5) * 12, .4 + r() * 3.6, -3.8 - r() * 1); scene.add(s);
  }

  const { bag, glow, inLight, H } = makeBag();
  bag.position.set(0, 0, 0); scene.add(bag);

  // luces
  const key = new THREE.SpotLight('#fff1e0', 38, 12, .5, .55, 1.6);
  key.position.set(2.2, 3.6, 2.6); key.target = bag; key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.radius = 6; scene.add(key);
  const rim = new THREE.SpotLight('#ffcf9a', 16, 10, .6, .8, 1.5); rim.position.set(-2.5, 2.4, -1.8); rim.target = bag; scene.add(rim);
  scene.add(new THREE.HemisphereLight('#fff4ea', '#2a1d16', .35));
  // brillo que barre el dorado
  const sweep = new THREE.PointLight('#fff6e6', 0, 3, 1.2); scene.add(sweep);

  // recorrido de cámara (posición, punto al que mira)
  const portrait = host.clientWidth / host.clientHeight < .8; // en móvil la bolsa entera necesita más distancia
  const P = (portrait ? [[2.6, 2.0, 6.4], [1.4, 1.2, 4.4], [.3, .74, 2.9], [0, .66, 2.35], [0, 2.3, .7], [0, 1.05, .0]]
    : [[2.9, 1.7, 4.6], [1.5, 1.1, 3.1], [.3, .74, 2.0], [0, .66, 1.42], [0, 2.05, .62], [0, 1.05, .0]]).map(a => new THREE.Vector3(...a));
  const L = [[0, .7, 0], [0, .66, 0], [0, .63, 0], [0, .6, 0], [0, .55, -.02], [0, .1, 0]].map(a => new THREE.Vector3(...a));
  const keyT = [0, .3, .56, .7, .86, 1];
  const posC = new THREE.CatmullRomCurve3(P, false, 'centripetal'), lookC = new THREE.CatmullRomCurve3(L, false, 'centripetal');
  const toU = t => { // tiempo → parámetro de la curva (tramos iguales por punto)
    let i = 0; while (i < keyT.length - 2 && t > keyT[i + 1]) i++;
    const k = (t - keyT[i]) / (keyT[i + 1] - keyT[i]);
    return (i + k) / (keyT.length - 1);
  };

  const wash = document.createElement('div'); wash.className = 'intro-wash'; host.appendChild(wash);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < .8 ? 40 : 32;
    cam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let start = null, raf = 0, finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf); removeEventListener('resize', resize);
    onDone();
    setTimeout(() => { renderer.dispose(); pmrem.dispose(); }, 1200);
  };

  const v = new THREE.Vector3();
  function frame(now) {
    if (start === null) start = now;
    // window.__introT (0–1) congela el tiempo: solo para capturas de prueba
    const tt = typeof window.__introT === 'number' ? window.__introT : (now - start) / 1000 / duration;
    const t = clamp(tt);
    const e = ease(clamp(t / .97));
    posC.getPoint(toU(e), cam.position); lookC.getPoint(toU(e), v); cam.lookAt(v);
    bag.rotation.y = -.55 * (1 - ease(clamp(t / .62)));
    // barrido de brillo sobre el nombre (de izquierda a derecha)
    const s = clamp((t - .36) / .3);
    sweep.intensity = Math.sin(s * Math.PI) * 1.4;
    sweep.position.set(-1.1 + s * 2.2, .9, 1.15);
    // al subir hacia la boca de la bolsa se enciende la luz de dentro
    const g = clamp((t - .7) / .22);
    glow.material.opacity = g; inLight.intensity = g * 6;
    wash.style.opacity = clamp((t - .86) / .12);
    renderer.render(scene, cam);
    if (tt < 1.02) raf = requestAnimationFrame(frame); else finish();
  }
  raf = requestAnimationFrame(frame);
  return finish;
}
