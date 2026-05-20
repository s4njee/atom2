import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let envTexture = null;

function ensureMaterials() {
  if (atomMaterial) return;
  
  // Gemstone uses MeshPhysicalMaterial with high transmission and IOR
  atomMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.95,
    ior: 2.4,
    thickness: 1.0,
    roughness: 0.01,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  });

  bondMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.5,
    ior: 1.5,
    thickness: 0.5,
    roughness: 0.1,
    metalness: 0.1,
  });

  ringMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.8,
    ior: 1.8,
    thickness: 0.2,
    roughness: 0.05,
  });
}

function ensureEnvironment(viewer) {
  if (envTexture) return envTexture;
  const pmrem = new THREE.PMREMGenerator(viewer.renderer);
  envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return envTexture;
}

export const gemstone = {
  id: 'gemstone',
  name: 'Gemstone',

  apply(viewer, meshes) {
    ensureMaterials();
    // Slightly brighter background to help refraction visibility
    viewer.setBackground(new THREE.Color(0x0a0a10));
    const env = ensureEnvironment(viewer);
    viewer.setEnvironment(env);
    
    // Increase environment intensity for better sparkle
    atomMaterial.envMapIntensity = 2.5;
    bondMaterial.envMapIntensity = 1.0;
    ringMaterial.envMapIntensity = 1.0;

    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.5), // Brighter ambient
      new THREE.PointLight(0xffffff, 2.0, 50), // Strong point light
      new THREE.PointLight(0x00ffcc, 1.5, 50), // Colored rim-ish light
      new THREE.DirectionalLight(0xffffff, 1.0),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) {
      meshes.atoms.material = atomMaterial;
      if (viewer.currentMolecule) {
        const color = new THREE.Color();
        const atoms = viewer.currentMolecule.atoms;
        for (let i = 0; i < atoms.length; i++) {
          const el = atoms[i].element;
          // Gemstone color palette
          if (el === 'O') color.setHex(0xff0033);      // Ruby
          else if (el === 'N') color.setHex(0x0033ff); // Sapphire
          else if (el === 'C') color.setHex(0xeeeeee); // Diamond
          else if (el === 'H') color.setHex(0xffffff); // Clear
          else if (el === 'S') color.setHex(0xffdd00); // Topaz/Amber
          else if (el === 'P') color.setHex(0xff6600); // Fire Opal
          else if (el === 'Cl') color.setHex(0x33ff00); // Peridot
          else color.setHex(0xcc00ff);                 // Amethyst (default)
          meshes.atoms.setColorAt(i, color);
        }
        meshes.atoms.instanceColor.needsUpdate = true;
      }
    }
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setEnvironment(null);
  },
};
