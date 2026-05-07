import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let paperTexture = null;

function ensurePaper() {
  if (paperTexture) return paperTexture;
  // Generate a soft paper-grain noise texture procedurally.
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = 220 + Math.floor(Math.random() * 35);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v - 5;
    data[i * 4 + 2] = v - 15;
    data[i * 4 + 3] = 255;
  }
  paperTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
  paperTexture.needsUpdate = true;
  return paperTexture;
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0.0,
    flatShading: false,
  });
  bondMaterial = new THREE.MeshStandardMaterial({
    color: 0x886655,
    roughness: 0.95,
    metalness: 0.0,
  });
  ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xa07050,
    roughness: 0.9,
    metalness: 0.0,
  });
}

export const painterly = {
  id: 'painterly',
  name: 'Painterly',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(ensurePaper());
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xfff0d8, 0.4),
      new THREE.DirectionalLight(0xfff5e0, 0.8),
      new THREE.DirectionalLight(0x88aaff, 0.3),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose() {},
};
