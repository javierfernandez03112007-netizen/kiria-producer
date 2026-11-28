// ---------------------------------------------------------------- «Empieza torcido» (versión 2, en blanco, negro y grises; Javi, 28-11: «en tonos blancos, negros y
// grises y que sea de otra manera»). Escenario: negro, un suelo oscuro con un charco de luz, y arriba a la derecha una PUERTA que flota en la oscuridad: cerrada,
// con luz blanca por las rendijas; al final se abre y la luz lo inunda todo. Unidades en metros; el suelo es y = 0; la cámara mira de frente (−z).
const DOOR = { x: 1.55, y: 2.42, w: 0.86, h: 1.62, z: 0 };                  // la puerta: esquina de abajo a la altura del último escalón
const grey = (v, r = 0.7, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(v, v, v), roughness: r, ...o });
function buildStage(G) { const g = new THREE.Group(); G.add(g); const U = {}; g.userData = U;
  // suelo: disco oscuro que se funde con el negro (textura radial) y recibe sombras
  const t = tex2(512, 512, (c, W, H) => { const gr = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(0.45, '#141414'); gr.addColorStop(1, '#000000'); c.fillStyle = gr; c.fillRect(0, 0, W, H); });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.0 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0.2, 0, -0.5); fl.receiveShadow = true; g.add(fl); U.floor = fl;
  // la puerta: marco que brilla, la hoja oscura (bisagra a la izquierda) y la luz de detrás
  const D = new THREE.Group(); D.position.set(DOOR.x, DOOR.y, DOOR.z); g.add(D); U.door = D;
  U.frameM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.5 });
  const fw = 0.06; for (const [w, h, x, y] of [[DOOR.w + 2 * fw, fw, 0, DOOR.h + fw / 2], [fw, DOOR.h, -DOOR.w / 2 - fw / 2, DOOR.h / 2], [fw, DOOR.h, DOOR.w / 2 + fw / 2, DOOR.h / 2], [DOOR.w + 2 * fw, fw * 0.6, 0, -fw * 0.3]]) D.add(box(w, h, 0.1, U.frameM, x, y, 0));
  U.lightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(2.2), toneMapped: false }); const lp = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w, DOOR.h), U.lightM); lp.position.set(0, DOOR.h / 2, -0.06); D.add(lp); U.lightP = lp;
  const hinge = new THREE.Group(); hinge.position.set(-DOOR.w / 2 + 0.01, 0, 0.02); D.add(hinge); U.hinge = hinge;
  const leafM = grey(0.09, 0.6); const leaf = box(DOOR.w - 0.04, DOOR.h - 0.04, 0.05, leafM, DOOR.w / 2 - 0.01, DOOR.h / 2, 0); hinge.add(leaf);
  const knob = sph(0.03, grey(0.5, 0.3, { metalness: 0.8 }), 12, 8); knob.position.set(DOOR.w - 0.12, DOOR.h * 0.48, 0.05); hinge.add(knob);
  shadowAll(D, false, false);
  // la luz que sale de la puerta (foco con sombra hacia abajo a la izquierda) y el haz visible
  U.sp = new THREE.SpotLight(0xffffff, 0, 14, 0.75, 0.55, 1.1); U.sp.position.set(DOOR.x - 0.15, DOOR.y + DOOR.h * 0.55, 0.9); U.sp.target.position.set(-0.7, 0, 0.2);
  U.sp.castShadow = true; U.sp.shadow.mapSize.set(1536, 1536); U.sp.shadow.bias = -0.0004; U.sp.shadow.radius = 3; g.add(U.sp, U.sp.target);
  U.beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), new THREE.ShaderMaterial({ uniforms: { k: { value: 0 }, w: { value: 0.2 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float k; varying vec2 vU; varying vec3 vN, vV; void main(){ float f = abs(dot(vN, vV)); float a = k * (0.02 + 0.12 * vU.y) * smoothstep(0.0, 0.7, f); gl_FragColor = vec4(vec3(a), 1.); }' }));
  U.beam.renderOrder = 5; U.beam.frustumCulled = false; g.add(U.beam);
  return g; }
// el haz va de la puerta al suelo (cono con la punta en la puerta); w = anchura en el suelo
function beamAt(U, k, w) { const top = _v(DOOR.x - 0.1, DOOR.y + DOOR.h * 0.45, 0.05), bot = _v(-0.55, 0, 0.15), d = bot.clone().sub(top), L = d.length();
  U.beam.visible = k > 0.005; U.beam.material.uniforms.k.value = k; U.beam.position.copy(top).addScaledVector(d, 0.5); U.beam.quaternion.setFromUnitVectors(_v(0, -1, 0), d.normalize()); U.beam.scale.set(w, L, w); }
function tex2(w, h, draw) { const c = cnv(w, h), g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
