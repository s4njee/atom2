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

export function getColor(element) {
  return CPK_COLORS[element] ?? CPK_COLORS.default;
}

export function getRadius(element) {
  return VDW_RADII[element] ?? VDW_RADII.default;
}
