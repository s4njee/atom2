import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';

describe('store', () => {
  it('subscribes and notifies on set', () => {
    const store = createStore({ molecule: null, style: 'neon' });
    const sub = vi.fn();
    store.subscribe(sub);
    store.set({ style: 'crystal' });
    expect(sub).toHaveBeenCalledWith(expect.objectContaining({ style: 'crystal' }));
    expect(store.get().molecule).toBeNull();
  });

  it('unsubscribes', () => {
    const store = createStore({ count: 0 });
    const sub = vi.fn();
    const off = store.subscribe(sub);
    off();
    store.set({ count: 1 });
    expect(sub).not.toHaveBeenCalled();
  });
});
