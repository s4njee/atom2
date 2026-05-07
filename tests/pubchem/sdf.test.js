import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSDF } from '../../src/pubchem/sdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('parseSDF', () => {
  it('parses methane: 5 atoms, 4 single bonds', () => {
    const data = parseSDF(fixture('methane.sdf'));
    expect(data.atoms).toHaveLength(5);
    expect(data.bonds).toHaveLength(4);
    expect(data.atoms[0].element).toBe('C');
    expect(data.atoms[1].element).toBe('H');
    expect(data.atoms[0].position.x).toBeCloseTo(0);
    expect(data.atoms[0].position.y).toBeCloseTo(0);
    expect(data.atoms[0].position.z).toBeCloseTo(0);
    expect(data.bonds[0]).toMatchObject({ a: 0, b: 1, order: 1 });
  });

  it('parses benzene: 12 atoms, 12 bonds with mixed orders', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    expect(data.atoms).toHaveLength(12);
    expect(data.bonds).toHaveLength(12);
    const orders = data.bonds.map(b => b.order).sort();
    // 3 double bonds in benzene + 9 single (6 C-H + 3 C-C)
    expect(orders.filter(o => o === 2)).toHaveLength(3);
    expect(orders.filter(o => o === 1)).toHaveLength(9);
  });

  it('uses 0-based atom indices in bonds', () => {
    const data = parseSDF(fixture('methane.sdf'));
    // SDF uses 1-based; we expect 0-based
    const ai = data.bonds.map(b => b.a);
    expect(Math.min(...ai)).toBe(0);
  });
});
