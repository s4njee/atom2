// CPK colors as 0xRRGGBB integers (Three.js color format)
export const CPK_COLORS = {
  H:  0xffffff,
  C:  0x909090,
  N:  0x3050f8,
  O:  0xff0d0d,
  F:  0x90e050,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I:  0x940094,
  P:  0xff8000,
  S:  0xffff30,
  B:  0xffb5b5,
  Si: 0xf0c8a0,
  Na: 0xab5cf2,
  K:  0x8f40d4,
  Ca: 0x3dff00,
  Fe: 0xe06633,
  Mg: 0x8aff00,
  Zn: 0x7d80b0,
  default: 0xcccccc,
};

// Van der Waals radii in Ångströms; ball-and-stick scales these down at render time.
export const VDW_RADII = {
  H:  1.20,
  C:  1.70,
  N:  1.55,
  O:  1.52,
  F:  1.47,
  Cl: 1.75,
  Br: 1.85,
  I:  1.98,
  P:  1.80,
  S:  1.80,
  B:  1.92,
  Si: 2.10,
  Na: 2.27,
  K:  2.75,
  Ca: 2.31,
  Fe: 2.00,
  Mg: 1.73,
  Zn: 1.39,
  default: 1.50,
};

export const ELEMENT_NAMES = {
  H: 'Hydrogen', He: 'Helium',
  Li: 'Lithium', Be: 'Beryllium', B: 'Boron', C: 'Carbon', N: 'Nitrogen',
  O: 'Oxygen', F: 'Fluorine', Ne: 'Neon',
  Na: 'Sodium', Mg: 'Magnesium', Al: 'Aluminum', Si: 'Silicon', P: 'Phosphorus',
  S: 'Sulfur', Cl: 'Chlorine', Ar: 'Argon',
  K: 'Potassium', Ca: 'Calcium', Fe: 'Iron', Cu: 'Copper', Zn: 'Zinc',
  Br: 'Bromine', I: 'Iodine',
};

export const ATOMIC_NUMBERS = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, Br: 35, I: 53,
};

// Ground-state electron configurations using Unicode superscripts.
export const ELECTRON_CONFIGS = {
  H:  '1s¹',
  He: '1s²',
  Li: '1s² 2s¹',
  Be: '1s² 2s²',
  B:  '1s² 2s² 2p¹',
  C:  '1s² 2s² 2p²',
  N:  '1s² 2s² 2p³',
  O:  '1s² 2s² 2p⁴',
  F:  '1s² 2s² 2p⁵',
  Ne: '1s² 2s² 2p⁶',
  Na: '[Ne] 3s¹',
  Mg: '[Ne] 3s²',
  Al: '[Ne] 3s² 3p¹',
  Si: '[Ne] 3s² 3p²',
  P:  '[Ne] 3s² 3p³',
  S:  '[Ne] 3s² 3p⁴',
  Cl: '[Ne] 3s² 3p⁵',
  Ar: '[Ne] 3s² 3p⁶',
  K:  '[Ar] 4s¹',
  Ca: '[Ar] 4s²',
  Fe: '[Ar] 3d⁶ 4s²',
  Cu: '[Ar] 3d¹⁰ 4s¹',
  Zn: '[Ar] 3d¹⁰ 4s²',
  Br: '[Ar] 3d¹⁰ 4s² 4p⁵',
  I:  '[Kr] 4d¹⁰ 5s² 5p⁵',
};

export function getColor(element) {
  return CPK_COLORS[element] ?? CPK_COLORS.default;
}

export function getRadius(element) {
  return VDW_RADII[element] ?? VDW_RADII.default;
}

export function getName(element) {
  return ELEMENT_NAMES[element] ?? element;
}

export function getAtomicNumber(element) {
  return ATOMIC_NUMBERS[element] ?? null;
}

export function getElectronConfig(element) {
  return ELECTRON_CONFIGS[element] ?? null;
}
