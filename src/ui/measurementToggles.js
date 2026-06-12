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
    btn.className = 'toggle-btn';
    btn.addEventListener('click', () => {
      state[key] = !state[key];
      btn.setAttribute('aria-pressed', String(state[key]));
      btn.classList.toggle('is-on', state[key]);
      onChange({ ...state });
    });
    container.appendChild(btn);
    return btn;
  }

  makeToggle('Bond lengths', 'lengths');
  makeToggle('Bond angles', 'angles');

  return { getState: () => ({ ...state }) };
}
