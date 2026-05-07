import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const ID = 'neon';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.2,
    roughness: 0.35,
  });
  // Use the per-instance color as emissive too, so each atom glows in its CPK color.
  atomMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       #ifdef USE_INSTANCING_COLOR
         totalEmissiveRadiance += vColor * 2.2;
       #endif`
    );
  };
  bondMaterial = new THREE.MeshStandardMaterial({
    color: 0x66ffff,
    emissive: 0x33ccff,
    emissiveIntensity: 1.0,
    metalness: 0.4,
    roughness: 0.3,
  });
  ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xff66ff,
    emissive: 0xff33ff,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.3,
  });
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 1.4, 0.6, 0.0);
  return bloomPass;
}

export const neon = {
  id: ID,
  name: 'Neon',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x05050a));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0x4455aa, 0.6),
      new THREE.DirectionalLight(0xffffff, 0.8),
    ]);
    viewer.setPostProcessing([ensureBloom(viewer)]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setPostProcessing([]);
  },
};
