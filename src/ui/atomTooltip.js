import { getName, getAtomicNumber, getElectronConfig } from '../chem/elements.js';

export function createAtomTooltip(container) {
  const el = document.createElement('div');
  el.className = 'atom-tooltip';
  container.appendChild(el);

  function show(atom, x, y) {
    const num = getAtomicNumber(atom.element);
    const name = getName(atom.element);
    const config = getElectronConfig(atom.element);
    el.innerHTML =
      `<div style="font-weight:600;font-size:13px">${atom.element} — ${name}</div>` +
      (num != null ? `<div style="opacity:0.7">Z = ${num}</div>` : '') +
      (config ? `<div style="opacity:0.85;margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${config}</div>` : '');
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  }

  function hide() {
    el.style.display = 'none';
  }

  return { show, hide };
}
