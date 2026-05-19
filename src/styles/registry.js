import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { xray } from './xray.js';
import { blueprint } from './blueprint.js';
import { synthwave } from './synthwave.js';
import { watercolor } from './watercolor.js';
import { papercraft } from './papercraft.js';

export const STYLES = { crystal, toon, xray, blueprint, synthwave, watercolor, papercraft };

export const STYLE_LIST = [xray, crystal, toon, blueprint, synthwave, watercolor, papercraft];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.xray;
}
