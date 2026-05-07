import { neon } from './neon.js';
import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { painterly } from './painterly.js';

export const STYLES = { neon, crystal, toon, painterly };

export const STYLE_LIST = [neon, crystal, toon, painterly];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.neon;
}
