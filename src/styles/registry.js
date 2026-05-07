import { neon } from './neon.js';
import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { xray } from './xray.js';
import { blueprint } from './blueprint.js';

export const STYLES = { neon, crystal, toon, xray, blueprint };

export const STYLE_LIST = [neon, crystal, toon, xray, blueprint];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.neon;
}
