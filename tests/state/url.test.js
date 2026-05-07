import { describe, it, expect, beforeEach } from 'vitest';
import { readURLState, writeURLState } from '../../src/state/url.js';

describe('url state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('readURLState returns null cid + null style when params absent', () => {
    expect(readURLState()).toEqual({ cid: null, style: null });
  });

  it('readURLState parses cid and style', () => {
    window.history.replaceState({}, '', '/?cid=2244&style=xray');
    expect(readURLState()).toEqual({ cid: 2244, style: 'xray' });
  });

  it('writeURLState updates the query string without reloading', () => {
    writeURLState({ cid: 241, style: 'crystal' });
    expect(window.location.search).toBe('?cid=241&style=crystal');
  });

  it('writeURLState omits null cid', () => {
    writeURLState({ cid: null, style: 'toon' });
    expect(window.location.search).toBe('?style=toon');
  });
});
