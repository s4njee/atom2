import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let outlineGradient = null;

function ensureGradient() {
  if (outlineGradient) return outlineGradient;
  const data = new Uint8Array([0, 80, 160, 255]); // 4-step toon ramp
  outlineGradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  outlineGradient.needsUpdate = true;
  outlineGradient.minFilter = THREE.NearestFilter;
  outlineGradient.magFilter = THREE.NearestFilter;
  return outlineGradient;
}

function ensureMaterials() {
  if (atomMaterial) return;
  const grad = ensureGradient();
  atomMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  bondMaterial = new THREE.MeshToonMaterial({ color: 0x444444, gradientMap: grad });
  ringMaterial = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: grad });
}

// "Outline" via inverted-hull child mesh: a slightly larger black instance of each mesh,
// rendered with BackSide so it shows only as a silhouette around the original.
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const OUTLINE_SCALE = 1.05;

function makeOutline(source) {
  if (!source) return null;
  const outline = new THREE.InstancedMesh(source.geometry, OUTLINE_MAT, source.count);
  outline.name = source.name + '-outline';
  const m = new THREE.Matrix4();
  const s = new THREE.Matrix4().makeScale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE);
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, m);
    m.multiply(s);
    outline.setMatrixAt(i, m);
  }
  outline.instanceMatrix.needsUpdate = true;
  return outline;
}

let outlines = [];

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

export const toon = {
  id: 'toon',
  name: 'Cartoon',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xfff7e0));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.5),
      new THREE.DirectionalLight(0xffffff, 0.8),
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
