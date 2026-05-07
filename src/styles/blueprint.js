import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let outlineMat = null;
let gridTexture = null;

function ensureGrid() {
  if (gridTexture) return gridTexture;
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c1e3d';
  ctx.fillRect(0, 0, size, size);

  const step = 32;
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = '#1d3a6b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(size, i + 0.5); ctx.stroke();
  }
  ctx.strokeStyle = '#3a6bb0';
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
  // Flat unlit cyan; per-instance CPK color tints it.
  atomMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe7ff });
  bondMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe7ff });
  ringMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe7ff });
  outlineMat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff, side: THREE.BackSide });
}

const OUTLINE_SCALE = 1.08;
let outlines = [];

function makeOutline(source) {
  if (!source) return null;
  const outline = new THREE.InstancedMesh(source.geometry, outlineMat, source.count);
  outline.name = source.name + '-blueprint-outline';
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

export const blueprint = {
  id: 'blueprint',
  name: 'Blueprint',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(ensureGrid());
    viewer.setEnvironment(null);
    viewer.setLights([]); // basic material is unlit
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
