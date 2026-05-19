import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let shadowMaterial = null;

function ensureMaterials() {
  if (atomMaterial) return;
  // Flat unlit — built-in materials auto-multiply instanceColor on InstancedMesh.
  atomMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  bondMaterial = new THREE.MeshBasicMaterial({ color: 0x2d3748 });
  ringMaterial = new THREE.MeshBasicMaterial({ color: 0x4a5568 });
  shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false,
  });
}

// World-space drop-shadow offset (down + slightly right). Small fraction of bond length.
const SHADOW_OFFSET = new THREE.Vector3(0.12, -0.18, 0.0);

let shadows = [];

function clearShadows(viewer) {
  for (const s of shadows) viewer.scene.remove(s);
  shadows = [];
}

function makeShadow(source) {
  if (!source) return null;
  const shadow = new THREE.InstancedMesh(source.geometry, shadowMaterial, source.count);
  shadow.name = source.name + '-stencil-shadow';
  // Render behind by drawing first; the small offset + depthWrite:false keeps it readable.
  shadow.renderOrder = -1;
  const m = new THREE.Matrix4();
  const t = new THREE.Matrix4().makeTranslation(SHADOW_OFFSET.x, SHADOW_OFFSET.y, SHADOW_OFFSET.z);
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, m);
    // Apply translation in world space — premultiply.
    m.premultiply(t);
    shadow.setMatrixAt(i, m);
  }
  shadow.instanceMatrix.needsUpdate = true;
  return shadow;
}

function buildShadows(viewer, meshes) {
  clearShadows(viewer);
  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    const s = makeShadow(m);
    if (s) { viewer.scene.add(s); shadows.push(s); }
  }
}

export const stencil = {
  id: 'stencil',
  name: 'Stencil',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xf6f0e6));
    viewer.setEnvironment(null);
    viewer.setLights([]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
    buildShadows(viewer, meshes);
  },

  dispose(viewer) {
    clearShadows(viewer);
  },
};
