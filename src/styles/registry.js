import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { xray } from './xray.js';
import { blueprint } from './blueprint.js';
import { iridescence } from './iridescence.js';
import { synthwave } from './synthwave.js';
import { watercolor } from './watercolor.js';
import { papercraft } from './papercraft.js';
import { velvet } from './velvet.js';
import { pixelDither } from './pixelDither.js';
import { origami } from './origami.js';
import { outline } from './outline.js';

export const STYLES = {
  crystal,
  toon,
  xray,
  blueprint,
  iridescence,
  synthwave,
  watercolor,
  papercraft,
  velvet,
  pixelDither,
  origami,
  outline,
};

export const STYLE_LIST = [
  xray,
  crystal,
  toon,
  blueprint,
  iridescence,
  synthwave,
  watercolor,
  papercraft,
  velvet,
  pixelDither,
  origami,
  outline,
];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.xray;
}
