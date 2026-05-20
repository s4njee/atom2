import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

function makeBiolumMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00ffcc,
    emissiveIntensity: 1.0,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.0,
  });
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = makeBiolumMaterial();
  bondMaterial = makeBiolumMaterial();
  ringMaterial = makeBiolumMaterial();
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  // Intensity cut from 1.5 to 0.375 (4x reduction)
  bloomPass = new UnrealBloomPass(size, 0.375, 0.4, 0.85);
  return bloomPass;
}

let boundUpdate = null;

export const biolum = {
  id: 'biolum',
  name: 'Bioluminescence',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x000205)); 
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.1),
      new THREE.PointLight(0x00ffcc, 0.5),
    ]); 
    viewer.setPostProcessing([ensureBloom(viewer)]);
    
    if (!boundUpdate) boundUpdate = this.update.bind(this);
    viewer.addUpdateCallback(boundUpdate);
    
    this.onMoleculeChanged(viewer, meshes);
  },

  update() {
    const time = Date.now() * 0.001;
    // Shift sine upwards so it's positive for more than half the cycle
    const raw = Math.sin(time * 1.2 - Math.PI * 0.5);
    const pulse = Math.max(0, (raw + 0.4) / 1.4);
    [atomMaterial, bondMaterial, ringMaterial].forEach(mat => {
      if (mat) {
        mat.emissiveIntensity = pulse * 4.0;
        mat.opacity = 0.2 + pulse * 0.8;
      }
    });
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setPostProcessing([]);
    if (boundUpdate) viewer.removeUpdateCallback(boundUpdate);
  },
};
