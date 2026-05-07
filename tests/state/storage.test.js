import { describe, it, expect, beforeEach } from 'vitest';
import { addRecent, getRecents, toggleFavorite, getFavorites, isFavorite, MAX_RECENTS } from '../../src/state/storage.js';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('addRecent prepends and dedupes by cid', () => {
    addRecent({ cid: 1, name: 'A' });
    addRecent({ cid: 2, name: 'B' });
    addRecent({ cid: 1, name: 'A' });
    const r = getRecents();
    expect(r.map(x => x.cid)).toEqual([1, 2]);
  });

  it('addRecent caps at MAX_RECENTS', () => {
    for (let i = 0; i < MAX_RECENTS + 5; i++) addRecent({ cid: i, name: `n${i}` });
    expect(getRecents()).toHaveLength(MAX_RECENTS);
  });

  it('toggleFavorite adds then removes', () => {
    toggleFavorite({ cid: 7, name: 'lucky' });
    expect(isFavorite(7)).toBe(true);
    expect(getFavorites()).toEqual([{ cid: 7, name: 'lucky' }]);
    toggleFavorite({ cid: 7, name: 'lucky' });
    expect(isFavorite(7)).toBe(false);
    expect(getFavorites()).toEqual([]);
  });
});
