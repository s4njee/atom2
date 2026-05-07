import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let envTexture = null;

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    transmission: 0.85,
    thickness: 0.6,
    ior: 1.5,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  bondMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xeeeeee,
    transmission: 0.6,
    thickness: 0.3,
    ior: 1.4,
    roughness: 0.1,
    clearcoat: 0.8,
  });
  ringMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.7,
    thickness: 0.2,
    ior: 1.5,
    roughness: 0.1,
  });
}

function ensureEnvironment(viewer) {
  if (envTexture) return envTexture;
  const pmrem = new THREE.PMREMGenerator(viewer.renderer);
  envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return envTexture;
}

export const crystal = {
  id: 'crystal',
  name: 'Crystal',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xe8eef5));
    viewer.setEnvironment(ensureEnvironment(viewer));
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.3),
      new THREE.DirectionalLight(0xffffff, 0.6),
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

  dispose(viewer) {
    viewer.setEnvironment(null);
  },
};
