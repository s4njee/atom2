import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { xray } from './xray.js';
import { blueprint } from './blueprint.js';

export const STYLES = { crystal, toon, xray, blueprint };

export const STYLE_LIST = [xray, crystal, toon, blueprint];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.xray;
}
