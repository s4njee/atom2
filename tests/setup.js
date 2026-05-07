// Polyfill localStorage and history for tests when the environment doesn't provide them.
class MemoryStorage {
  constructor() { this._m = new Map(); }
  get length() { return this._m.size; }
  clear() { this._m.clear(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(String(k), String(v)); }
  removeItem(k) { this._m.delete(k); }
  key(i) { return Array.from(this._m.keys())[i] ?? null; }
}

const installStorage = (target) => {
  if (!target) return;
  const ls = target.localStorage;
  if (!ls || typeof ls.clear !== 'function') {
    Object.defineProperty(target, 'localStorage', {
      value: new MemoryStorage(),
      writable: true,
      configurable: true,
    });
  }
};

const installHistory = (target) => {
  if (!target) return;
  if (!target.history || typeof target.history.replaceState !== 'function') {
    let search = '';
    Object.defineProperty(target, 'location', {
      value: {
        get search() { return search; },
        get pathname() { return '/'; },
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(target, 'history', {
      value: {
        replaceState(_state, _title, url) {
          if (typeof url === 'string') {
            const q = url.indexOf('?');
            search = q >= 0 ? url.slice(q) : '';
          }
        },
      },
      writable: true,
      configurable: true,
    });
  }
};

installStorage(globalThis.window);
installStorage(globalThis);
installHistory(globalThis.window);
