import { describe, it, expect } from 'vitest';
import { getStyle, STYLE_LIST, STYLES } from '../../src/styles/registry.js';

describe('styles registry', () => {
  it('contains crystal, toon, xray, blueprint, synthwave, watercolor, and papercraft styles', () => {
    expect(STYLES.crystal).toBeDefined();
    expect(STYLES.toon).toBeDefined();
    expect(STYLES.xray).toBeDefined();
    expect(STYLES.blueprint).toBeDefined();
    expect(STYLES.synthwave).toBeDefined();
    expect(STYLES.watercolor).toBeDefined();
    expect(STYLES.papercraft).toBeDefined();
  });

  it('lists all seven styles in STYLE_LIST', () => {
    const ids = STYLE_LIST.map(s => s.id);
    expect(ids).toContain('xray');
    expect(ids).toContain('crystal');
    expect(ids).toContain('toon');
    expect(ids).toContain('blueprint');
    expect(ids).toContain('synthwave');
    expect(ids).toContain('watercolor');
    expect(ids).toContain('papercraft');
    expect(STYLE_LIST).toHaveLength(7);
  });

  it('getStyle falls back to xray for invalid/unknown style ids', () => {
    expect(getStyle('non-existent')).toBe(STYLES.xray);
  });

  it('getStyle resolves correct style profiles', () => {
    expect(getStyle('synthwave').id).toBe('synthwave');
    expect(getStyle('watercolor').id).toBe('watercolor');
    expect(getStyle('papercraft').id).toBe('papercraft');
    expect(getStyle('crystal').id).toBe('crystal');
  });
});
