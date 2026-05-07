const DEBOUNCE_MS = 150;

export function createSearchBar(container, { client, onSubmit }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'PubChem name, URL, or CID';
  input.style.width = '320px';
  input.style.padding = '6px 8px';
  input.setAttribute('aria-label', 'PubChem search');
  const list = document.createElement('ul');
  list.style.position = 'absolute';
  list.style.top = '100%';
  list.style.left = '0';
  list.style.right = '0';
  list.style.margin = '0';
  list.style.padding = '0';
  list.style.listStyle = 'none';
  list.style.background = 'white';
  list.style.border = '1px solid #ccc';
  list.style.maxHeight = '240px';
  list.style.overflow = 'auto';
  list.style.display = 'none';
  list.style.zIndex = '10';

  wrap.appendChild(input);
  wrap.appendChild(list);
  container.appendChild(wrap);

  let timer = null;
  let activeIdx = -1;
  let suggestions = [];

  function hide() {
    list.style.display = 'none';
    list.innerHTML = '';
    activeIdx = -1;
    suggestions = [];
  }

  function render() {
    list.innerHTML = '';
    suggestions.forEach((name, i) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.style.padding = '6px 8px';
      li.style.cursor = 'pointer';
      li.style.background = i === activeIdx ? '#eef' : 'white';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = name;
        hide();
        onSubmit(name);
      });
      list.appendChild(li);
    });
    list.style.display = suggestions.length ? 'block' : 'none';
  }

  async function fetchSuggestions(q) {
    if (!q.trim()) { hide(); return; }
    try {
      suggestions = await client.suggest(q);
      activeIdx = -1;
      render();
    } catch {
      hide();
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => fetchSuggestions(input.value), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(suggestions.length - 1, activeIdx + 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(-1, activeIdx - 1);
      render();
    } else if (e.key === 'Enter') {
      const value = activeIdx >= 0 ? suggestions[activeIdx] : input.value;
      hide();
      if (value.trim()) onSubmit(value);
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(hide, 150);
  });

  return {
    focus: () => input.focus(),
    setValue: (v) => { input.value = v; },
  };
}
