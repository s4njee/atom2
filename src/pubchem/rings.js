// Detect aromatic rings in MoleculeData.
//
// Strategy:
//   1. Build an adjacency list from bonds.
//   2. Find all simple cycles of size 5 or 6 via canonical-form DFS (small molecules → cheap).
//   3. A ring is "aromatic" if every atom is in {C, N, O, S} AND
//      (a) any of its bonds has order 4 (PubChem aromatic bond type), OR
//      (b) the bond orders alternate 1-2-1-2-... around the ring.
//   4. Compute geometric center, mean-plane normal (via SVD-free triangle-fan estimate),
//      and a representative radius for each aromatic ring.

const AROMATIC_ELEMENTS = new Set(['C', 'N', 'O', 'S']);
const RING_SIZES = [5, 6];

export function detectAromaticRings(molecule) {
  const { atoms, bonds } = molecule;
  const adj = buildAdjacency(atoms.length, bonds);
  const bondMap = buildBondMap(bonds);

  const rings = findSimpleRings(adj, RING_SIZES);
  const out = [];

  for (const atomIndices of rings) {
    if (!atomIndices.every(i => AROMATIC_ELEMENTS.has(atoms[i].element))) continue;
    if (!isAromaticByBondPattern(atomIndices, bondMap)) continue;
    out.push(buildRingGeometry(atomIndices, atoms));
  }

  return dedupeRings(out);
}

function buildAdjacency(atomCount, bonds) {
  const adj = Array.from({ length: atomCount }, () => []);
  for (const { a, b } of bonds) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

function buildBondMap(bonds) {
  const map = new Map();
  for (const { a, b, order } of bonds) {
    map.set(key(a, b), order);
  }
  return map;
}

function key(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// Find simple cycles of given sizes using DFS from each atom, keeping only
// cycles whose minimum atom index equals the start atom (avoids duplicates by rotation).
function findSimpleRings(adj, sizes) {
  const maxSize = Math.max(...sizes);
  const seen = new Set();
  const out = [];

  for (let start = 0; start < adj.length; start++) {
    const stack = [[start, [start]]];
    while (stack.length) {
      const [node, path] = stack.pop();
      if (path.length > maxSize) continue;
      for (const next of adj[node]) {
        if (next === start && path.length >= 3 && sizes.includes(path.length)) {
          // Closes a ring of an allowed size.
          const k = canonicalRingKey(path);
          if (!seen.has(k)) {
            seen.add(k);
            out.push([...path]);
          }
        } else if (next > start && !path.includes(next)) {
          stack.push([next, [...path, next]]);
        }
      }
    }
  }
  return out;
}

function canonicalRingKey(atomIndices) {
  // Rotate so smallest index is first; pick the lexicographically smaller of
  // the forward and reversed rotation.
  const n = atomIndices.length;
  let minIdx = 0;
  for (let i = 1; i < n; i++) if (atomIndices[i] < atomIndices[minIdx]) minIdx = i;
  const fwd = [];
  const rev = [];
  for (let i = 0; i < n; i++) {
    fwd.push(atomIndices[(minIdx + i) % n]);
    rev.push(atomIndices[(minIdx - i + n) % n]);
  }
  const fwdKey = fwd.join(',');
  const revKey = rev.join(',');
  return fwdKey < revKey ? fwdKey : revKey;
}

function isAromaticByBondPattern(atomIndices, bondMap) {
  const orders = [];
  for (let i = 0; i < atomIndices.length; i++) {
    const a = atomIndices[i];
    const b = atomIndices[(i + 1) % atomIndices.length];
    const order = bondMap.get(key(a, b));
    if (order == null) return false;
    orders.push(order);
  }
  if (orders.includes(4)) return true;

  // Alternating 1-2-1-2-... pattern starting from either offset.
  const altA = orders.every((o, i) => o === (i % 2 === 0 ? 1 : 2));
  const altB = orders.every((o, i) => o === (i % 2 === 0 ? 2 : 1));
  return altA || altB;
}

function buildRingGeometry(atomIndices, atoms) {
  const positions = atomIndices.map(i => atoms[i].position);
  const center = {
    x: positions.reduce((s, p) => s + p.x, 0) / positions.length,
    y: positions.reduce((s, p) => s + p.y, 0) / positions.length,
    z: positions.reduce((s, p) => s + p.z, 0) / positions.length,
  };
  // Average normal from triangle fans around the centroid.
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    const b = positions[(i + 1) % positions.length];
    const v1 = sub(a, center);
    const v2 = sub(b, center);
    const c = cross(v1, v2);
    nx += c.x; ny += c.y; nz += c.z;
  }
  const nlen = Math.hypot(nx, ny, nz) || 1;
  const normal = { x: nx / nlen, y: ny / nlen, z: nz / nlen };

  const radius = positions.reduce((s, p) => s + dist(p, center), 0) / positions.length;
  return { atomIndices, center, normal, radius };
}

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }

function dedupeRings(rings) {
  const seen = new Set();
  const out = [];
  for (const r of rings) {
    const k = canonicalRingKey(r.atomIndices);
    if (!seen.has(k)) { seen.add(k); out.push(r); }
  }
  return out;
}
