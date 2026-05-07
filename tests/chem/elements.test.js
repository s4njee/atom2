import { describe, it, expect } from 'vitest';
import { CPK_COLORS, VDW_RADII, getColor, getRadius } from '../../src/chem/elements.js';

describe('elements', () => {
  it('has CPK color for common elements', () => {
    expect(CPK_COLORS.H).toBeDefined();
    expect(CPK_COLORS.C).toBeDefined();
    expect(CPK_COLORS.N).toBeDefined();
    expect(CPK_COLORS.O).toBeDefined();
  });

  it('has van der Waals radius for common elements', () => {
    expect(VDW_RADII.H).toBeGreaterThan(0);
    expect(VDW_RADII.C).toBeGreaterThan(VDW_RADII.H);
  });

  it('getColor falls back to default for unknown element', () => {
    expect(getColor('Xx')).toBe(CPK_COLORS.default);
  });

  it('getRadius falls back to default for unknown element', () => {
    expect(getRadius('Xx')).toBe(VDW_RADII.default);
  });
});
