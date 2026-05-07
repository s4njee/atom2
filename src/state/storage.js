const RECENTS_KEY = 'atom2:recents';
const FAVORITES_KEY = 'atom2:favorites';
export const MAX_RECENTS = 10;

function read(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function write(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function addRecent(entry) {
  const list = read(RECENTS_KEY).filter(e => e.cid !== entry.cid);
  list.unshift({ cid: entry.cid, name: entry.name });
  write(RECENTS_KEY, list.slice(0, MAX_RECENTS));
}
export function getRecents() {
  return read(RECENTS_KEY);
}
export function toggleFavorite(entry) {
  const list = read(FAVORITES_KEY);
  const idx = list.findIndex(e => e.cid === entry.cid);
  if (idx >= 0) list.splice(idx, 1);
  else list.push({ cid: entry.cid, name: entry.name });
  write(FAVORITES_KEY, list);
}
export function getFavorites() {
  return read(FAVORITES_KEY);
}
export function isFavorite(cid) {
  return read(FAVORITES_KEY).some(e => e.cid === cid);
}
