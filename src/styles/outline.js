import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let outlineMat = null;

function ensureMaterials() {
  if (atomMaterial) return;
  // Light, gently-lit base so the heavy black outline carries the read.
  atomMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  bondMaterial = new THREE.MeshLambertMaterial({ color: 0xe6e6e6 });
  ringMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  outlineMat = new THREE.MeshBasicMaterial({ color: 0x101418, side: THREE.BackSide });
}

const OUTLINE_SCALE = 1.09;
let outlines = [];

function makeOutline(source) {
  if (!source) return null;
  const o = new THREE.InstancedMesh(source.geometry, outlineMat, source.count);
  o.name = source.name + '-outline-overlay';
  const m = new THREE.Matrix4();
  const s = new THREE.Matrix4().makeScale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE);
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, m);
    m.multiply(s);
    o.setMatrixAt(i, m);
  }
  o.instanceMatrix.needsUpdate = true;
  return o;
}

function clearOutlines(viewer) {
  for (const o of outlines) viewer.scene.remove(o);
  outlines = [];
}

function buildOutlines(viewer, meshes) {
  clearOutlines(viewer);
  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    const o = makeOutline(m);
    if (o) { viewer.scene.add(o); outlines.push(o); }
  }
}

export const outline = {
  id: 'outline',
  name: 'Outline',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xf2f4f7));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.6),
      new THREE.DirectionalLight(0xffffff, 0.65),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
    buildOutlines(viewer, meshes);
  },

  dispose(viewer) {
    clearOutlines(viewer);
  },
};
