import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSDF } from '../../src/pubchem/sdf.js';
import { detectAromaticRings } from '../../src/pubchem/rings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('detectAromaticRings', () => {
  it('finds one aromatic ring in benzene', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const rings = detectAromaticRings(data);
    expect(rings).toHaveLength(1);
    expect(rings[0].atomIndices).toHaveLength(6);
  });

  it('reports a ring center near origin for benzene', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const [ring] = detectAromaticRings(data);
    expect(Math.abs(ring.center.x)).toBeLessThan(0.05);
    expect(Math.abs(ring.center.y)).toBeLessThan(0.05);
  });

  it('reports a normal vector for the ring plane', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const [ring] = detectAromaticRings(data);
    const len = Math.hypot(ring.normal.x, ring.normal.y, ring.normal.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it('finds no aromatic rings in methane', () => {
    const data = parseSDF(fixture('methane.sdf'));
    const rings = detectAromaticRings(data);
    expect(rings).toHaveLength(0);
  });
});
