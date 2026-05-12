import * as THREE from 'three';
import { GROUP_COLORS } from '../chem/functionalGroups.js';
import { getColor } from '../chem/elements.js';

// Per-bond instance count must mirror builder.js: single = 1 cylinder, double = 2, triple = 3.
function bondInstanceCount(order) {
  if (order >= 3) return 3;
  if (order >= 2) return 2;
  return 1;
}

const WHITE = new THREE.Color(1, 1, 1);

// Paint atom and bond instance colors based on detected functional-group instances.
// - When `focusedGroup` is null, every group's atoms/bonds get its palette color.
// - When `focusedGroup` is set, only that group is colored; everything else reverts.
// Atoms not in any (active) group fall back to CPK; bonds not in any (active) group
// stay neutral white so the active style's material color shows through.
export function applyGroupColors(meshes, molecule, instances, focusedGroup = null) {
  const { atoms, bonds } = molecule;

  const atomGroup = new Map();
  const bondGroup = new Map();
  for (const inst of instances) {
    if (focusedGroup && inst.group !== focusedGroup) continue;
    for (const a of inst.atomIndices) {
      if (!atomGroup.has(a)) atomGroup.set(a, inst.group);
    }
    for (const b of inst.bondIndices) {
      if (!bondGroup.has(b)) bondGroup.set(b, inst.group);
    }
  }

  if (meshes.atoms) {
    const c = new THREE.Color();
    for (let i = 0; i < atoms.length; i++) {
      const g = atomGroup.get(i);
      if (g) c.set(GROUP_COLORS[g] || '#ffffff');
      else c.setHex(getColor(atoms[i].element));
      meshes.atoms.setColorAt(i, c);
    }
    if (meshes.atoms.instanceColor) meshes.atoms.instanceColor.needsUpdate = true;
  }

  if (meshes.bonds) {
    let idx = 0;
    const c = new THREE.Color();
    for (let bi = 0; bi < bonds.length; bi++) {
      const count = bondInstanceCount(bonds[bi].order);
      const g = bondGroup.get(bi);
      if (g) c.set(GROUP_COLORS[g] || '#ffffff');
      else c.copy(WHITE);
      for (let k = 0; k < count; k++) meshes.bonds.setColorAt(idx + k, c);
      idx += count;
    }
    if (meshes.bonds.instanceColor) meshes.bonds.instanceColor.needsUpdate = true;
  }
}
