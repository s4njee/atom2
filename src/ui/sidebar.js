import { getRecents, getFavorites, toggleFavorite, isFavorite } from '../state/storage.js';
import { COLLECTIONS } from '../data/collections.js';

const COLLAPSED_KEY = 'atom2:collections:collapsed';

function readCollapsed() {
  try { return new Set(JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) || '[]')); }
  catch { return new Set(); }
}
function writeCollapsed(set) {
  window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
}

export function createSidebar(container, { onPick }) {
  container.innerHTML = '';
  const collapsed = readCollapsed();

  function makeList() {
    const ul = document.createElement('ul');
    ul.className = 'sidebar-list';
    return ul;
  }

  function staticSection(title) {
    const h = document.createElement('h3');
    h.className = 'sidebar-heading';
    h.textContent = title;
    container.appendChild(h);
    const ul = makeList();
    container.appendChild(ul);
    return ul;
  }

  function collapsibleSection(id, title) {
    const h = document.createElement('button');
    h.className = 'sidebar-heading sidebar-heading-collapsible';
    h.type = 'button';
    const caret = document.createElement('span');
    caret.className = 'sidebar-caret';
    const label = document.createElement('span');
    label.textContent = title;
    h.appendChild(caret);
    h.appendChild(label);
    container.appendChild(h);
    const ul = makeList();
    container.appendChild(ul);

    function applyState() {
      const isCollapsed = collapsed.has(id);
      ul.style.display = isCollapsed ? 'none' : '';
      caret.textContent = isCollapsed ? '▸' : '▾';
    }
    h.addEventListener('click', () => {
      if (collapsed.has(id)) collapsed.delete(id);
      else collapsed.add(id);
      writeCollapsed(collapsed);
      applyState();
    });
    applyState();
    return ul;
  }

  const favList = staticSection('Favorites');
  const recentList = staticSection('Recent');

  const collectionLists = COLLECTIONS.map((c) => ({
    collection: c,
    ul: collapsibleSection(`collection:${c.id}`, c.title),
  }));

  function makeItem(entry, { showStar }) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const name = document.createElement('button');
    name.className = 'sidebar-item-name';
    name.textContent = `${entry.name} (${entry.cid})`;
    name.addEventListener('click', () => onPick(entry));
    li.appendChild(name);
    if (showStar) {
      const star = document.createElement('button');
      star.className = 'sidebar-item-star';
      const favorited = isFavorite(entry.cid);
      star.textContent = favorited ? '★' : '☆';
      if (favorited) star.classList.add('is-fav');
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
    for (const { collection, ul } of collectionLists) {
      ul.innerHTML = '';
      for (const e of collection.entries) ul.appendChild(makeItem(e, { showStar: true }));
    }
  }

  refresh();
  return { refresh };
}
