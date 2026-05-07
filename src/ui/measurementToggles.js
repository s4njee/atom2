export function createMeasurementToggles(container, { onChange }) {
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.gap = '6px';

  const state = { lengths: false, angles: false };

  function makeToggle(label, key) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', 'false');
    applyStyle(btn, false);
    btn.addEventListener('click', () => {
      state[key] = !state[key];
      btn.setAttribute('aria-pressed', String(state[key]));
      applyStyle(btn, state[key]);
      onChange({ ...state });
    });
    container.appendChild(btn);
    return btn;
  }

  function applyStyle(btn, on) {
    btn.style.background = on ? '#1f3a5e' : '#0d1117';
    btn.style.borderColor = on ? '#58a6ff' : '#252b34';
    btn.style.color = on ? '#cfe6ff' : '#d8dde6';
    btn.style.cursor = 'pointer';
  }

  makeToggle('Bond lengths', 'lengths');
  makeToggle('Bond angles', 'angles');

  return { getState: () => ({ ...state }) };
}
