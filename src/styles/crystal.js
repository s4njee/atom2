import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let envTexture = null;
let gridTexture = null;

function ensureGrid() {
  if (gridTexture) return gridTexture;
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eef3f8';
  ctx.fillRect(0, 0, size, size);

  const step = 32;
  // Crisp 1-px lines: integer coords, half-pixel offset, no smoothing.
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = '#7a93b0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(size, i + 0.5); ctx.stroke();
  }
  // Heavier line every 4 cells.
  ctx.strokeStyle = '#3f5b7c';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += step * 4) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(size, i + 0.5); ctx.stroke();
  }

  gridTexture = new THREE.CanvasTexture(canvas);
  gridTexture.minFilter = THREE.NearestFilter;
  gridTexture.magFilter = THREE.NearestFilter;
  gridTexture.generateMipmaps = false;
  return gridTexture;
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshPhysicalMaterial({
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
    viewer.setBackground(ensureGrid());
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
