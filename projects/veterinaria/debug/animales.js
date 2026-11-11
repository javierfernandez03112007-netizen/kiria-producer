const kinds = ['cow', 'horse', 'pig', 'dog', 'cat', 'hen'];
const sizes = { cow: 1.6, horse: 1.9, pig: 1.0, dog: 0.45, cat: 0.38, hen: 0.42 };
window.TA = kinds.map(k => { const A = makeAnimal(k, 1); A.rotation.y = -1.2; scene.add(A); A.visible = false; return A; });
const cw = makeAnimal('cow', 1); cw.rotation.y = -1.2; addXray(cw); scene.add(cw); cw.visible = false; window.CW = cw;
const hn = makeAnimal('dog', 1); hn.rotation.y = -1.2; addXray(hn); scene.add(hn); hn.visible = false; window.HN = hn;
const gl = glove(0.8); gl.position.set(0, 0.9, 0); gl.rotation.z = 0.3; scene.add(gl); gl.visible = false; window.GL = gl;
window.camOverride = (cam, v3) => {
  const i = Math.floor(NOW + 0.01) - 1;
  for (const A of TA) A.visible = false; CW.visible = false; HN.visible = false; GL.visible = false;
  let sz = 1;
  if (i < 6) { TA[i].visible = true; sz = sizes[kinds[i]]; }
  else if (i === 6) { CW.visible = true; xrMode(CW, 'scan', v3(0, 0, 1).applyAxisAngle(v3(0, 1, 0), -1.2), 0.0); sz = 1.6; }
  else if (i === 7) { CW.visible = true; xrMode(CW, 'xray'); sz = 1.6; poseAnimal(CW, { neck: 0.7 }); }
  else if (i === 8) { HN.visible = true; xrMode(HN, 'scan', v3(0, 0, 1).applyAxisAngle(v3(0, 1, 0), -1.2), 0.0); sz = 0.45; }
  else if (i === 9) { GL.visible = true; sz = 0.9; }
  const vis = [...TA, CW, HN, GL].find(o => o.visible); const bb = new THREE.Box3().setFromObject(vis), c = bb.getCenter(new THREE.Vector3()), sv = bb.getSize(new THREE.Vector3()); const r = Math.max(sv.x, sv.y * 0.6, sv.z); const d = r * 3.2; cam.fov = 34; cam.updateProjectionMatrix(); cam.position.set(c.x + d * 0.1, c.y + r * 0.35, c.z + d); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld();
  rigAt(v3(0, sz * 0.4, 0), 0.25, clamp(sz / 2.5, 0.2, 1.6), 1.15, 0.6);
};
