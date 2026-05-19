import * as THREE from 'three';
import { getSharedGeometry } from '../scene/geometry.js';

let paperGeometries = null;
let paperMaterial = null;
let noiseTexture = null;
let matTexture = null;
let paperLights = [];

function ensureGeometries() {
  if (paperGeometries) return;
  paperGeometries = {
    sphere: new THREE.IcosahedronGeometry(1, 0),                // 20-sided flat faceted polyhedron
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 3, 1, true),   // 3-sided folded triangular tube
    torus: new THREE.TorusGeometry(1, 0.04, 3, 6),               // folded low-segment ring
  };
}

function ensureNoiseTexture() {
  if (noiseTexture) return noiseTexture;
  
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  noiseTexture = new THREE.CanvasTexture(canvas);
  noiseTexture.wrapS = THREE.RepeatWrapping;
  noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.repeat.set(12, 12);
  return noiseTexture;
}

function ensureMaterials() {
  if (paperMaterial) return;

  paperMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true, // critical for flat folded paper facets
    bumpMap: ensureNoiseTexture(),
    bumpScale: 0.007,  // subtle paper tooth texture
  });
}

function ensureMatTexture() {
  if (matTexture) return matTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Self-healing cutting mat deep teal-green color
  ctx.fillStyle = '#0f3d32';
  ctx.fillRect(0, 0, size, size);
  
  // Subtle cutting mat material texture noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 5;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1.0;
  const step = 32;
  for (let x = 0; x <= size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  matTexture = new THREE.CanvasTexture(canvas);
  matTexture.minFilter = THREE.LinearFilter;
  matTexture.magFilter = THREE.LinearFilter;
  matTexture.wrapS = THREE.RepeatWrapping;
  matTexture.wrapT = THREE.RepeatWrapping;
  matTexture.repeat.set(4, 4);
  return matTexture;
}

function getLights() {
  if (paperLights.length > 0) return paperLights;

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  
  // Main desk lamp illumination
  const mainDir = new THREE.DirectionalLight(0xffffff, 0.85);
  mainDir.position.set(10, 15, 12);
  
  // Soft blue back/fill light for soft shadows
  const fillDir = new THREE.DirectionalLight(0xdcefff, 0.35);
  fillDir.position.set(-10, -8, -10);

  paperLights = [ambient, mainDir, fillDir];
  return paperLights;
}

export const papercraft = {
  id: 'papercraft',
  name: 'Papercraft',

  apply(viewer, meshes) {
    ensureGeometries();
    ensureMaterials();
    
    // Set cutting mat background and lighting
    viewer.setBackground(ensureMatTexture());
    viewer.setEnvironment(null);
    viewer.setLights(getLights());
    
    viewer.setPostProcessing([]); // No bloom needed

    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    ensureGeometries();

    // Swap high-res primitives to flat-shaded folded paper geometries
    if (meshes.atoms) {
      meshes.atoms.geometry = paperGeometries.sphere;
      meshes.atoms.material = paperMaterial;
    }
    if (meshes.bonds) {
      meshes.bonds.geometry = paperGeometries.cylinder;
      meshes.bonds.material = paperMaterial;
    }
    if (meshes.rings) {
      meshes.rings.geometry = paperGeometries.torus;
      meshes.rings.material = paperMaterial;
    }
  },

  dispose(viewer, meshes) {
    // Revert geometries back to high-res standard primitives on exit
    const shared = getSharedGeometry();
    if (meshes) {
      if (meshes.atoms) meshes.atoms.geometry = shared.sphere;
      if (meshes.bonds) meshes.bonds.geometry = shared.cylinder;
      if (meshes.rings) meshes.rings.geometry = shared.torus;
    }
  },
};
