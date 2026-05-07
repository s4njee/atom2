import { getRecents, getFavorites, toggleFavorite, isFavorite } from '../state/storage.js';

export function createSidebar(container, { onPick }) {
  container.innerHTML = '';

  function section(title) {
    const h = document.createElement('h3');
    h.textContent = title;
    h.style.margin = '12px 0 6px';
    h.style.fontSize = '13px';
    h.style.textTransform = 'uppercase';
    h.style.color = '#666';
    container.appendChild(h);
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    container.appendChild(ul);
    return ul;
  }

  const favList = section('Favorites');
  const recentList = section('Recent');

  function makeItem(entry, { showStar }) {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.padding = '4px 0';
    const name = document.createElement('button');
    name.textContent = `${entry.name} (${entry.cid})`;
    name.style.background = 'none';
    name.style.border = 'none';
    name.style.cursor = 'pointer';
    name.style.font = 'inherit';
    name.style.padding = '0';
    name.style.color = '#0366d6';
    name.addEventListener('click', () => onPick(entry));
    li.appendChild(name);
    if (showStar) {
      const star = document.createElement('button');
      star.textContent = isFavorite(entry.cid) ? '★' : '☆';
      star.style.background = 'none';
      star.style.border = 'none';
      star.style.cursor = 'pointer';
      star.style.fontSize = '14px';
      star.addEventListener('click', () => {
        toggleFavorite(entry);
        refresh();
      });
      li.appendChild(star);
    }
    return li;
  }

  function refresh() {
    favList.innerHTML = '';
    for (const e of getFavorites()) favList.appendChild(makeItem(e, { showStar: true }));
    recentList.innerHTML = '';
    for (const e of getRecents()) recentList.appendChild(makeItem(e, { showStar: true }));
  }

  refresh();
  return { refresh };
}
