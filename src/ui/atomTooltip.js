import { getName, getAtomicNumber } from '../chem/elements.js';

export function createAtomTooltip(container) {
  const el = document.createElement('div');
  el.className = 'atom-tooltip';
  el.style.cssText = [
    'position:absolute',
    'pointer-events:none',
    'padding:6px 10px',
    'background:rgba(20,20,28,0.92)',
    'color:#fff',
    'border:1px solid rgba(255,255,255,0.15)',
    'border-radius:4px',
    'font:12px system-ui, sans-serif',
    'line-height:1.4',
    'transform:translate(12px,12px)',
    'pointer-events:none',
    'z-index:20',
    'display:none',
    'white-space:nowrap',
  ].join(';');
  container.appendChild(el);

  function show(atom, x, y) {
    const num = getAtomicNumber(atom.element);
    const name = getName(atom.element);
    el.innerHTML =
      `<div style="font-weight:600;font-size:13px">${atom.element} — ${name}</div>` +
      (num != null ? `<div style="opacity:0.7">Z = ${num}</div>` : '') +
      `<div style="opacity:0.7;margin-top:2px">x ${atom.position.x.toFixed(2)}  y ${atom.position.y.toFixed(2)}  z ${atom.position.z.toFixed(2)}</div>`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  }

  function hide() {
    el.style.display = 'none';
  }

  return { show, hide };
}
