// Minimal SDF V2000 parser for PubChem 3D conformer records.
// Returns { atoms: [{element, position:{x,y,z}}], bonds: [{a,b,order}] } with 0-based atom indices.

export function parseSDF(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 4) throw new Error('SDF too short');

  // Counts line is line index 3 (after 3-line header).
  const counts = lines[3];
  const atomCount = parseInt(counts.slice(0, 3), 10);
  const bondCount = parseInt(counts.slice(3, 6), 10);
  if (!Number.isFinite(atomCount) || !Number.isFinite(bondCount)) {
    throw new Error('Invalid SDF counts line');
  }

  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const line = lines[4 + i];
    if (!line) throw new Error(`Missing atom line ${i}`);
    const x = parseFloat(line.slice(0, 10));
    const y = parseFloat(line.slice(10, 20));
    const z = parseFloat(line.slice(20, 30));
    const element = line.slice(31, 34).trim();
    atoms.push({ element, position: { x, y, z } });
  }

  const bonds = [];
  for (let i = 0; i < bondCount; i++) {
    const line = lines[4 + atomCount + i];
    if (!line) throw new Error(`Missing bond line ${i}`);
    const a = parseInt(line.slice(0, 3), 10) - 1;
    const b = parseInt(line.slice(3, 6), 10) - 1;
    const order = parseInt(line.slice(6, 9), 10);
    bonds.push({ a, b, order });
  }

  return { atoms, bonds };
}
