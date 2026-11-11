window.dbgHide = () => {
  const C = S.cow, G = C.userData.G; C.updateMatrixWorld(true);
  const bb = new THREE.Box3(); const bodyM = G.root.children.find(o => o.isMesh); bb.setFromObject(bodyM, true);
  const nose = C.userData.solids.find(m => m.userData.part === 'nose'), hornR = C.userData.solids.find(m => m.userData.part === 'hornR'), headM = C.userData.solids.find(m => m.userData.part === 'head');
  const bn = new THREE.Box3().setFromObject(nose), bh = new THREE.Box3().setFromObject(hornR), bhe = new THREE.Box3().setFromObject(headM);
  const legs = ['legFR', 'legFL'].map(n => new THREE.Box3().setFromObject(G[n]));
  const f = v => v.toArray().map(x => x.toFixed(3)).join(',');
  console.log('ERROR t=' + NOW.toFixed(2) + ' body z[' + bb.min.z.toFixed(3) + ',' + bb.max.z.toFixed(3) + '] nose min ' + f(bn.min) + ' max ' + f(bn.max) + ' | horn max ' + f(bh.max) + ' | head min ' + f(bhe.min) + ' max ' + f(bhe.max) + ' | legF zmax ' + legs[0].max.z.toFixed(3));
};
