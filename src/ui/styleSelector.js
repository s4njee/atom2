import { STYLE_LIST } from '../styles/registry.js';

export function createStyleSelector(container, { initial, onChange }) {
  container.innerHTML = '';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Visual style');
  for (const s of STYLE_LIST) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (s.id === initial) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => onChange(select.value));
  container.appendChild(select);

  return {
    setValue(id) {
      if (select.value !== id) select.value = id;
    },
  };
}
