import { describe, it, expect } from 'vitest';
import { getStyle, STYLE_LIST, STYLES } from '../../src/styles/registry.js';

describe('styles registry', () => {
  it('contains all 15 styles', () => {
    expect(STYLES.crystal).toBeDefined();
    expect(STYLES.toon).toBeDefined();
    expect(STYLES.xray).toBeDefined();
    expect(STYLES.blueprint).toBeDefined();
    expect(STYLES.iridescence).toBeDefined();
    expect(STYLES.synthwave).toBeDefined();
    expect(STYLES.watercolor).toBeDefined();
    expect(STYLES.papercraft).toBeDefined();
    expect(STYLES.velvet).toBeDefined();
    expect(STYLES.pixelDither).toBeDefined();
    expect(STYLES.origami).toBeDefined();
    expect(STYLES.outline).toBeDefined();
    expect(STYLES.oscilloscope).toBeDefined();
    expect(STYLES.biolum).toBeDefined();
    expect(STYLES.gemstone).toBeDefined();
  });

  it('lists all 15 styles in STYLE_LIST', () => {
    const ids = STYLE_LIST.map(s => s.id);
    const expected = [
      'xray', 'crystal', 'toon', 'blueprint', 'iridescence',
      'synthwave', 'watercolor', 'papercraft', 'velvet',
      'pixelDither', 'origami', 'outline', 'oscilloscope', 'biolum', 'gemstone'
    ];
    expected.forEach(id => expect(ids).toContain(id));
    expect(STYLE_LIST).toHaveLength(15);
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
