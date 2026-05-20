// Detect a variety of functional groups for stylistic annotation.
// More-specific groups (amide, ester, carboxyl) are detected first and claim
// their bonds, so a C=O inside an amide doesn't also trigger a generic
// "carbonyl" label.

export const GROUP_COLORS = {
  amide:        '#ff79b3',
  ester:        '#ffb74d',
  carboxyl:     '#ff5577',
  carbonyl:     '#ff8a4d',
  hydroxyl:     '#79c0ff',
  ether:        '#5fbcd3',
  amine:        '#b48cff',
  imine:        '#c08aff',
  halide:       '#7fdb91',
  nitrile:      '#ffd24a',
  nitro:        '#ff7676',
  thiol:        '#e6e052',
  alkene:       '#9ad97a',
  alkyne:       '#bedc7a',
  phosphate:    '#ff9bd1',
  sulfonyl:     '#fff176',
  'r-chain':    '#afff79',
};

const HALIDES = new Set(['F', 'Cl', 'Br', 'I']);

export function detectFunctionalGroups(molecule, aromaticRings = []) {
  const { atoms, bonds } = molecule;

  const aromaticAtoms = new Set();
  for (const r of aromaticRings) for (const i of r.atomIndices) aromaticAtoms.add(i);

  // Adjacency: atomIndex → [{ atom, order, bondIdx }]
  const neighbors = atoms.map(() => []);
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    neighbors[b.a].push({ atom: b.b, order: b.order, bondIdx: i });
    neighbors[b.b].push({ atom: b.a, order: b.order, bondIdx: i });
  }

  const lengths = []; // { bondIdx, color, prefix, group, instanceId }
  const angles = [];  // { triple: [i,j,k], color, prefix, group, instanceId }
  const instances = []; // { id, group, color, atomIndices: Set<number>, bondIndices: Set<number> }
  const claimedBonds = new Set();
  const claimedCarbonyls = new Set(); // C atom indices already in a higher-priority group
  const seenLength = new Set();
  const seenAngle = new Set();

  let currentInstance = null;
  function startInstance(group) {
    currentInstance = {
      id: instances.length,
      group,
      color: GROUP_COLORS[group],
      atomIndices: new Set(),
      bondIndices: new Set(),
    };
    instances.push(currentInstance);
    return currentInstance;
  }

  function addLength(bondIdx, color, prefix, group) {
    if (seenLength.has(bondIdx)) return;
    seenLength.add(bondIdx);
    claimedBonds.add(bondIdx);
    const instanceId = currentInstance ? currentInstance.id : -1;
    lengths.push({ bondIdx, color, prefix, group, instanceId });
    if (currentInstance) {
      currentInstance.bondIndices.add(bondIdx);
      const b = bonds[bondIdx];
      currentInstance.atomIndices.add(b.a);
      currentInstance.atomIndices.add(b.b);
    }
  }
  function addAngle(triple, color, prefix, group) {
    const key = `${triple[1]}|${Math.min(triple[0], triple[2])}-${Math.max(triple[0], triple[2])}`;
    if (seenAngle.has(key)) return;
    seenAngle.add(key);
    const instanceId = currentInstance ? currentInstance.id : -1;
    angles.push({ triple, color, prefix, group, instanceId });
    if (currentInstance) {
      for (const idx of triple) currentInstance.atomIndices.add(idx);
    }
  }

  // Helpers
  const elem = (i) => atoms[i].element;

  // Find C=O bonds and index by carbon: cIdx → { oIdx, bondIdx }
  const carbonylAtCarbon = new Map();
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 2) continue;
    if (elem(b.a) === 'C' && elem(b.b) === 'O') carbonylAtCarbon.set(b.a, { oIdx: b.b, bondIdx: i });
    else if (elem(b.b) === 'C' && elem(b.a) === 'O') carbonylAtCarbon.set(b.b, { oIdx: b.a, bondIdx: i });
  }

  // 1. Amide — C(=O) bonded to N (single bond)
  for (const [cIdx, { oIdx, bondIdx: coBond }] of carbonylAtCarbon) {
    if (aromaticAtoms.has(cIdx)) continue;
    const nN = neighbors[cIdx].find((n) => n.atom !== oIdx && elem(n.atom) === 'N' && n.order === 1);
    if (!nN) continue;
    startInstance('amide');
    addLength(coBond, GROUP_COLORS.amide, 'amide C=O', 'amide');
    addLength(nN.bondIdx, GROUP_COLORS.amide, 'amide C–N', 'amide');
    addAngle([oIdx, cIdx, nN.atom], GROUP_COLORS.amide, '∠', 'amide');
    claimedCarbonyls.add(cIdx);
  }

  // 2. Carboxylic acid — C(=O) bonded to O–H
  for (const [cIdx, { oIdx, bondIdx: coBond }] of carbonylAtCarbon) {
    if (claimedCarbonyls.has(cIdx)) continue;
    if (aromaticAtoms.has(cIdx)) continue;
    const ohN = neighbors[cIdx].find((n) => {
      if (n.atom === oIdx || elem(n.atom) !== 'O' || n.order !== 1) return false;
      return neighbors[n.atom].some((nn) => elem(nn.atom) === 'H');
    });
    if (!ohN) continue;
    startInstance('carboxyl');
    addLength(coBond, GROUP_COLORS.carboxyl, 'COOH C=O', 'carboxyl');
    addLength(ohN.bondIdx, GROUP_COLORS.carboxyl, 'COOH C–O', 'carboxyl');
    const ohHydrogen = neighbors[ohN.atom].find((nn) => elem(nn.atom) === 'H');
    if (ohHydrogen) {
      addLength(ohHydrogen.bondIdx, GROUP_COLORS.carboxyl, 'COOH O–H', 'carboxyl');
      addAngle([cIdx, ohN.atom, ohHydrogen.atom], GROUP_COLORS.carboxyl, '∠', 'carboxyl');
    }
    addAngle([oIdx, cIdx, ohN.atom], GROUP_COLORS.carboxyl, '∠', 'carboxyl');
    claimedCarbonyls.add(cIdx);
  }

  // 3. Ester — C(=O) bonded to O–C (no H on that O)
  for (const [cIdx, { oIdx, bondIdx: coBond }] of carbonylAtCarbon) {
    if (claimedCarbonyls.has(cIdx)) continue;
    if (aromaticAtoms.has(cIdx)) continue;
    const oN = neighbors[cIdx].find((n) => {
      if (n.atom === oIdx || elem(n.atom) !== 'O' || n.order !== 1) return false;
      const oNeighbors = neighbors[n.atom];
      const hasHydrogen = oNeighbors.some((nn) => elem(nn.atom) === 'H');
      const otherCarbon = oNeighbors.some((nn) => nn.atom !== cIdx && elem(nn.atom) === 'C');
      return !hasHydrogen && otherCarbon;
    });
    if (!oN) continue;
    startInstance('ester');
    addLength(coBond, GROUP_COLORS.ester, 'ester C=O', 'ester');
    addLength(oN.bondIdx, GROUP_COLORS.ester, 'ester C–O', 'ester');
    addAngle([oIdx, cIdx, oN.atom], GROUP_COLORS.ester, '∠', 'ester');
    claimedCarbonyls.add(cIdx);
  }

  // 4. Generic carbonyl (ketone / aldehyde) — remaining C=O
  for (const [cIdx, { oIdx, bondIdx: coBond }] of carbonylAtCarbon) {
    if (claimedCarbonyls.has(cIdx)) continue;
    if (aromaticAtoms.has(cIdx)) continue;
    startInstance('carbonyl');
    addLength(coBond, GROUP_COLORS.carbonyl, 'C=O', 'carbonyl');
    const others = neighbors[cIdx].filter((n) => n.atom !== oIdx).slice(0, 2);
    for (const n of others) {
      addAngle([n.atom, cIdx, oIdx], GROUP_COLORS.carbonyl, '∠', 'carbonyl');
    }
    claimedCarbonyls.add(cIdx);
  }

  // 5. Nitro -NO2 — N with two oxygens (one or both via double / aromatic-ish bond)
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'N') continue;
    const oxygens = neighbors[i].filter((n) => elem(n.atom) === 'O');
    if (oxygens.length < 2) continue;
    startInstance('nitro');
    if (currentInstance) currentInstance.atomIndices.add(i);
    for (const o of oxygens) addLength(o.bondIdx, GROUP_COLORS.nitro, 'NO₂', 'nitro');
    addAngle([oxygens[0].atom, i, oxygens[1].atom], GROUP_COLORS.nitro, '∠', 'nitro');
  }

  // 6. Sulfonyl S(=O)(=O)
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'S') continue;
    const dblO = neighbors[i].filter((n) => elem(n.atom) === 'O' && n.order >= 2);
    if (dblO.length < 2) continue;
    startInstance('sulfonyl');
    if (currentInstance) currentInstance.atomIndices.add(i);
    for (const o of dblO) addLength(o.bondIdx, GROUP_COLORS.sulfonyl, 'SO₂', 'sulfonyl');
    addAngle([dblO[0].atom, i, dblO[1].atom], GROUP_COLORS.sulfonyl, '∠', 'sulfonyl');
  }

  // 7. Phosphate-like P–O bonds (any P bonded to O)
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'P') continue;
    const os = neighbors[i].filter((n) => elem(n.atom) === 'O');
    if (os.length === 0) continue;
    startInstance('phosphate');
    if (currentInstance) currentInstance.atomIndices.add(i);
    for (const o of os) addLength(o.bondIdx, GROUP_COLORS.phosphate, 'P–O', 'phosphate');
  }

  // 8. Hydroxyl — O bonded to H + heavy single bond, not part of carboxyl
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'O') continue;
    if (aromaticAtoms.has(i)) continue;
    const ns = neighbors[i];
    if (ns.some((n) => n.order >= 2)) continue;
    const hN = ns.find((n) => elem(n.atom) === 'H' && n.order === 1);
    const heavyN = ns.find((n) => elem(n.atom) !== 'H' && n.order === 1);
    if (!hN || !heavyN) continue;
    if (claimedBonds.has(hN.bondIdx)) continue; // already in carboxyl
    startInstance('hydroxyl');
    if (currentInstance) currentInstance.atomIndices.add(i);
    addLength(hN.bondIdx, GROUP_COLORS.hydroxyl, 'O–H', 'hydroxyl');
    addAngle([heavyN.atom, i, hN.atom], GROUP_COLORS.hydroxyl, '∠', 'hydroxyl');
  }

  // 9. Ether — O with two heavy single-bond neighbors, no H, no double bond, not in ring with claimed bonds
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'O') continue;
    if (aromaticAtoms.has(i)) continue;
    const ns = neighbors[i];
    if (ns.length !== 2) continue;
    if (ns.some((n) => n.order >= 2 || elem(n.atom) === 'H')) continue;
    // Exclude if part of an ester / carboxyl already claimed
    if (ns.every((n) => claimedBonds.has(n.bondIdx))) continue;
    startInstance('ether');
    if (currentInstance) currentInstance.atomIndices.add(i);
    addAngle([ns[0].atom, i, ns[1].atom], GROUP_COLORS.ether, '∠ ether', 'ether');
    for (const n of ns) {
      if (!claimedBonds.has(n.bondIdx)) addLength(n.bondIdx, GROUP_COLORS.ether, 'ether C–O', 'ether');
    }
  }

  // 10. Thiol — S bonded to H
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'S') continue;
    const ns = neighbors[i];
    const hN = ns.find((n) => elem(n.atom) === 'H' && n.order === 1);
    if (!hN) continue;
    startInstance('thiol');
    if (currentInstance) currentInstance.atomIndices.add(i);
    addLength(hN.bondIdx, GROUP_COLORS.thiol, 'S–H', 'thiol');
  }

  // 11. Imine — C=N (excluding nitrile, and skipping aromatic N's that are part of a ring system)
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 2) continue;
    const isCN = (elem(b.a) === 'C' && elem(b.b) === 'N') || (elem(b.a) === 'N' && elem(b.b) === 'C');
    if (!isCN) continue;
    if (aromaticAtoms.has(b.a) || aromaticAtoms.has(b.b)) continue;
    startInstance('imine');
    addLength(i, GROUP_COLORS.imine, 'C=N', 'imine');
  }

  // 12. Nitrile C≡N
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 3) continue;
    if ((elem(b.a) === 'C' && elem(b.b) === 'N') || (elem(b.a) === 'N' && elem(b.b) === 'C')) {
      startInstance('nitrile');
      addLength(i, GROUP_COLORS.nitrile, 'C≡N', 'nitrile');
    }
  }

  // 13. Amine — non-aromatic N with no double bonds, not already claimed (e.g. by amide).
  // Covers primary, secondary, and tertiary amines.
  for (let i = 0; i < atoms.length; i++) {
    if (elem(i) !== 'N') continue;
    if (aromaticAtoms.has(i)) continue;
    const ns = neighbors[i];
    if (ns.some((n) => n.order >= 2)) continue;
    // Must have at least one C neighbor; show all bonds at this N that aren't claimed.
    if (!ns.some((n) => elem(n.atom) === 'C')) continue;
    const fresh = ns.filter((n) => !claimedBonds.has(n.bondIdx));
    if (fresh.length === 0) continue;
    startInstance('amine');
    if (currentInstance) currentInstance.atomIndices.add(i);
    for (const n of fresh) {
      const lbl = elem(n.atom) === 'H' ? 'N–H' : 'N–C';
      addLength(n.bondIdx, GROUP_COLORS.amine, lbl, 'amine');
    }
    // One representative angle around the N
    if (ns.length >= 2) {
      addAngle([ns[0].atom, i, ns[1].atom], GROUP_COLORS.amine, '∠ amine', 'amine');
    }
  }

  // 14. Halide C–X
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 1) continue;
    const a = elem(b.a), c = elem(b.b);
    if (a === 'C' && HALIDES.has(c)) {
      startInstance('halide');
      addLength(i, GROUP_COLORS.halide, `C–${c}`, 'halide');
    } else if (c === 'C' && HALIDES.has(a)) {
      startInstance('halide');
      addLength(i, GROUP_COLORS.halide, `C–${a}`, 'halide');
    }
  }

  // 15. Alkene C=C (non-aromatic)
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 2 || elem(b.a) !== 'C' || elem(b.b) !== 'C') continue;
    if (aromaticAtoms.has(b.a) && aromaticAtoms.has(b.b)) continue;
    if (claimedBonds.has(i)) continue;
    startInstance('alkene');
    addLength(i, GROUP_COLORS.alkene, 'C=C', 'alkene');
  }

  // 16. Alkyne C≡C
  for (let i = 0; i < bonds.length; i++) {
    const b = bonds[i];
    if (b.order !== 3 || elem(b.a) !== 'C' || elem(b.b) !== 'C') continue;
    startInstance('alkyne');
    addLength(i, GROUP_COLORS.alkyne, 'C≡C', 'alkyne');
  }

  // --- Amino Acid Specific Annotation ---
  // If we see an amine and a carboxyl connected to the same (alpha) carbon,
  // relabel them to the more specific "Amino group" and "Carboxylic acid".
  const amineInstances = instances.filter((inst) => inst.group === 'amine');
  const carboxylInstances = instances.filter((inst) => inst.group === 'carboxyl');

  for (const amine of amineInstances) {
    const nIdx = Array.from(amine.atomIndices).find((i) => elem(i) === 'N');
    if (nIdx === undefined) continue;

    for (const n of neighbors[nIdx]) {
      if (elem(n.atom) !== 'C') continue;
      const alphaIdx = n.atom;

      // Check if alpha carbon is connected to a carboxyl carbon
      const carboxylNeighbor = neighbors[alphaIdx].find((an) => {
        return carboxylInstances.some((cInst) => cInst.atomIndices.has(an.atom) && elem(an.atom) === 'C' && an.atom !== alphaIdx);
      });

      if (carboxylNeighbor) {
        const carboxyl = carboxylInstances.find((cInst) => cInst.atomIndices.has(carboxylNeighbor.atom));

        // Relabel amine lengths to "Amino group"
        for (const l of lengths) {
          if (l.instanceId === amine.id) {
            l.prefix = 'Amino group';
          }
        }
        // Relabel carboxyl lengths to "Carboxylic acid"
        for (const l of lengths) {
          if (l.instanceId === carboxyl.id) {
            l.prefix = 'Carboxylic acid';
          }
        }

        // Identify and label the R-chain
        // The R-chain is any neighbor of alphaIdx that is NOT the amine N, NOT the carboxyl C, and NOT the alpha-hydrogen.
        // For glycine, it will be the "other" H. For others, it will be a C.
        const rNeighbors = neighbors[alphaIdx].filter((an) => {
          return an.atom !== nIdx && an.atom !== carboxylNeighbor.atom;
        });

        // Usually there is one H and one R group. We'll pick the non-H one if it exists,
        // otherwise pick one of the H's (for glycine).
        let rEntry = rNeighbors.find((an) => elem(an.atom) !== 'H');
        if (!rEntry && rNeighbors.length > 0) rEntry = rNeighbors[0];

        if (rEntry) {
          lengths.push({
            bondIdx: rEntry.bondIdx,
            color: GROUP_COLORS['r-chain'],
            prefix: 'R chain',
            group: 'r-chain',
            instanceId: -1,
          });
        }
      }
    }
  }

  return { lengths, angles, instances };
}
