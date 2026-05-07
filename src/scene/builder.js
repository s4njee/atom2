import * as THREE from 'three';
import { getColor, getRadius } from '../chem/elements.js';

const ATOM_SCALE = 0.3;       // ball-and-stick: shrink atoms relative to vdW
const BOND_RADIUS = 0.08;
const DOUBLE_OFFSET = 0.18;
const TRIPLE_OFFSET = 0.22;
const RING_SHRINK = 0.65;     // inner aromatic torus radius factor

const _v = new THREE.Vector3();
const _u = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();

const PLACEHOLDER_MAT = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

export function buildMoleculeMeshes(data, geometry) {
  const { atoms, bonds, aromaticRings } = data;
  const atomMesh = buildAtoms(atoms, geometry.sphere);

  // For each higher-order bond we add 2 extra cylinders (double = 1 main + 1 offset; triple = 1 main + 2 offsets).
  const cylCount = bonds.reduce((n, b) => n + (b.order >= 2 ? (b.order >= 3 ? 3 : 2) : 1), 0);
  const bondMesh = buildBonds(atoms, bonds, cylCount, geometry.cylinder);

  let ringMesh = null;
  if (aromaticRings.length > 0) ringMesh = buildRings(aromaticRings, geometry.torus);

  return { atoms: atomMesh, bonds: bondMesh, rings: ringMesh };
}

export function disposeMoleculeMeshes(meshes) {
  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    if (!m) continue;
    if (m.parent) m.parent.remove(m);
    // Materials are owned by style profiles; don't dispose here.
  }
}

function buildAtoms(atoms, sphereGeom) {
  const mesh = new THREE.InstancedMesh(sphereGeom, PLACEHOLDER_MAT.clone(), atoms.length);
  mesh.name = 'atoms';
  const color = new THREE.Color();
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    const r = getRadius(a.element) * ATOM_SCALE;
    _v.set(a.position.x, a.position.y, a.position.z);
    _s.set(r, r, r);
    _m.compose(_v, new THREE.Quaternion(), _s);
    mesh.setMatrixAt(i, _m);
    color.setHex(getColor(a.element));
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildBonds(atoms, bonds, totalCount, cylGeom) {
  const mesh = new THREE.InstancedMesh(cylGeom, PLACEHOLDER_MAT.clone(), totalCount);
  mesh.name = 'bonds';
  let idx = 0;
  for (const b of bonds) {
    const a = atoms[b.a].position;
    const c = atoms[b.b].position;
    if (b.order === 1) {
      idx = setBondInstance(mesh, idx, a, c, 0);
    } else if (b.order === 2) {
      computePerpendicular(a, c, DOUBLE_OFFSET);
      idx = setBondInstance(mesh, idx, a, c, +1);
      idx = setBondInstance(mesh, idx, a, c, -1);
    } else { // 3 or higher
      computePerpendicular(a, c, TRIPLE_OFFSET);
      idx = setBondInstance(mesh, idx, a, c, 0);
      idx = setBondInstance(mesh, idx, a, c, +1);
      idx = setBondInstance(mesh, idx, a, c, -1);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

let _lastPerp = new THREE.Vector3();

function computePerpendicular(a, c, magnitude) {
  const axis = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).normalize();
  const helper = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  _lastPerp.crossVectors(axis, helper).normalize().multiplyScalar(magnitude);
}

function setBondInstance(mesh, idx, a, c, sign) {
  const ax = a.x, ay = a.y, az = a.z;
  const cx = c.x, cy = c.y, cz = c.z;
  const ox = _lastPerp.x * sign;
  const oy = _lastPerp.y * sign;
  const oz = _lastPerp.z * sign;

  _v.set((ax + cx) / 2 + ox, (ay + cy) / 2 + oy, (az + cz) / 2 + oz);
  const dx = cx - ax, dy = cy - ay, dz = cz - az;
  const len = Math.hypot(dx, dy, dz);

  // Cylinder geometry is along Y axis with height 1; scale Y to bond length, X/Z to bond radius.
  _u.set(dx, dy, dz).normalize();
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _u);
  _s.set(BOND_RADIUS, len, BOND_RADIUS);
  _m.compose(_v, _q, _s);
  mesh.setMatrixAt(idx, _m);
  return idx + 1;
}

function buildRings(rings, torusGeom) {
  const mesh = new THREE.InstancedMesh(torusGeom, PLACEHOLDER_MAT.clone(), rings.length);
  mesh.name = 'rings';
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    _v.set(r.center.x, r.center.y, r.center.z);
    _u.set(r.normal.x, r.normal.y, r.normal.z);
    // Torus geometry's axis is +Z; align Z to ring normal.
    _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _u);
    const inner = r.radius * RING_SHRINK;
    _s.set(inner, inner, inner);
    _m.compose(_v, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
