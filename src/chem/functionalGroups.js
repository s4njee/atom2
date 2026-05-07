// Detect a small set of common functional groups for stylistic annotation.
// Returns flat arrays of length items and angle items, each tagged with a
// color and a short label that gets prepended to the measurement.

export const GROUP_COLORS = {
  carbonyl: '#ff8a4d',  // C=O
  hydroxyl: '#79c0ff',  // O–H
  amine:    '#b48cff',  // N–H
  halide:   '#7fdb91',  // C–X
  nitrile:  '#ffb74d',  // C≡N
};

const HALIDES = new Set(['F', 'Cl', 'Br', 'I']);

export function detectFunctionalGroups(molecule, aromaticRings = []) {
  const { atoms, bonds } = molecule;

  const aromaticAtoms = new Set();
  for (const r of aromaticRings) for (const i of r.atomIndices) aromaticAtoms.add(i);

  // Adjacency: index → [{ atom, order, bondIdx }]
  const neighbors = atoms.map(() => []);
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    neighbors[b.a].push({ atom: b.b, order: b.order, bondIdx: i });
    neighbors[b.b].push({ atom: b.a, order: b.order, bondIdx: i });
  }

  const lengths = []; // { bondIdx, color, prefix, group }
  const angles = [];  // { triple: [i,j,k], color, prefix, group }
  const seenLength = new Set();
  const seenAngle = new Set();

  function pushLength(bondIdx, color, prefix, group) {
    if (seenLength.has(bondIdx)) return;
    seenLength.add(bondIdx);
    lengths.push({ bondIdx, color, prefix, group });
  }
  function pushAngle(triple, color, prefix, group) {
    const key = canonicalAngleKey(triple);
    if (seenAngle.has(key)) return;
    seenAngle.add(key);
    angles.push({ triple, color, prefix, group });
  }

  // Bond-driven groups
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    const ea = atoms[b.a].element;
    const eb = atoms[b.b].element;

    // Carbonyl C=O (skip if either atom is in an aromatic ring — that's just the ring)
    if (b.order === 2 &&
        ((ea === 'C' && eb === 'O') || (ea === 'O' && eb === 'C')) &&
        !aromaticAtoms.has(b.a) && !aromaticAtoms.has(b.b)) {
      const cIdx = ea === 'C' ? b.a : b.b;
      const oIdx = ea === 'C' ? b.b : b.a;
      pushLength(i, GROUP_COLORS.carbonyl, 'C=O', 'carbonyl');
      const otherCNeighbors = neighbors[cIdx].filter(n => n.atom !== oIdx).slice(0, 2);
      for (const n of otherCNeighbors) {
        pushAngle([n.atom, cIdx, oIdx], GROUP_COLORS.carbonyl, '∠', 'carbonyl');
      }
    }

    // Halide C–X
    if (b.order === 1) {
      const isHalide = (ea === 'C' && HALIDES.has(eb)) || (eb === 'C' && HALIDES.has(ea));
      if (isHalide) {
        const x = HALIDES.has(eb) ? eb : ea;
        pushLength(i, GROUP_COLORS.halide, `C–${x}`, 'halide');
      }
    }

    // Nitrile C≡N
    if (b.order === 3 && ((ea === 'C' && eb === 'N') || (ea === 'N' && eb === 'C'))) {
      pushLength(i, GROUP_COLORS.nitrile, 'C≡N', 'nitrile');
    }
  }

  // Atom-driven groups
  for (let i = 0; i < atoms.length; i++) {
    const el = atoms[i].element;
    const ns = neighbors[i];

    // Hydroxyl: O bonded to one H and one heavy atom (single bonds only, not in ring)
    if (el === 'O' && !aromaticAtoms.has(i)) {
      const hN = ns.find(n => atoms[n.atom].element === 'H' && n.order === 1);
      const heavyN = ns.find(n => atoms[n.atom].element !== 'H' && n.order === 1);
      const hasDoubleBond = ns.some(n => n.order >= 2);
      if (hN && heavyN && !hasDoubleBond) {
        pushLength(hN.bondIdx, GROUP_COLORS.hydroxyl, 'O–H', 'hydroxyl');
        pushAngle([heavyN.atom, i, hN.atom], GROUP_COLORS.hydroxyl, '∠', 'hydroxyl');
      }
    }

    // Amine: N (non-aromatic, no double bonds) bonded to ≥1 H and a heavy atom
    if (el === 'N' && !aromaticAtoms.has(i)) {
      const hasDouble = ns.some(n => n.order >= 2);
      if (!hasDouble) {
        const hNs = ns.filter(n => atoms[n.atom].element === 'H');
        const heavyN = ns.find(n => atoms[n.atom].element !== 'H');
        if (hNs.length > 0 && heavyN) {
          for (const h of hNs) {
            pushLength(h.bondIdx, GROUP_COLORS.amine, 'N–H', 'amine');
            pushAngle([heavyN.atom, i, h.atom], GROUP_COLORS.amine, '∠', 'amine');
          }
        }
      }
    }
  }

  return { lengths, angles };
}

function canonicalAngleKey(triple) {
  const [a, b, c] = triple;
  // Center atom is fixed (b); the two outer atoms are interchangeable.
  const lo = Math.min(a, c);
  const hi = Math.max(a, c);
  return `${b}|${lo}-${hi}`;
}
