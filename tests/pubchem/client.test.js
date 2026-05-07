import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createPubChemClient, parseInputToCID } from '../../src/pubchem/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('parseInputToCID', () => {
  it('parses raw CID string', () => {
    expect(parseInputToCID('2244')).toBe(2244);
  });

  it('parses PubChem compound URL', () => {
    expect(parseInputToCID('https://pubchem.ncbi.nlm.nih.gov/compound/2244')).toBe(2244);
    expect(parseInputToCID('http://pubchem.ncbi.nlm.nih.gov/compound/241/')).toBe(241);
  });

  it('returns null for non-CID input (a name)', () => {
    expect(parseInputToCID('aspirin')).toBeNull();
  });
});

describe('createPubChemClient', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  it('suggest() hits autocomplete endpoint and returns string list', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dictionary_terms: { compound: ['aspirin', 'aspartame'] } }),
    });
    const client = createPubChemClient();
    const out = await client.suggest('asp');
    expect(out).toEqual(['aspirin', 'aspartame']);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/autocomplete/compound/asp/json')
    );
  });

  it('resolveQuery() with a name calls name-to-CID endpoint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ IdentifierList: { CID: [2244] } }),
    });
    const client = createPubChemClient();
    const out = await client.resolveQuery('aspirin');
    expect(out).toEqual({ cid: 2244, name: 'aspirin' });
  });

  it('fetchMolecule() returns parsed MoleculeData and caches it', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => fixture('methane.sdf') });
    const client = createPubChemClient();
    const data = await client.fetchMolecule(297);
    expect(data.atoms).toHaveLength(5);
    expect(data.bonds).toHaveLength(4);
    expect(data.aromaticRings).toEqual([]);
    expect(data.cid).toBe(297);

    // Second call should hit cache (no new fetch).
    const data2 = await client.fetchMolecule(297);
    expect(data2).toBe(data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetchMolecule() throws when 3D structure is unavailable', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const client = createPubChemClient();
    await expect(client.fetchMolecule(99999)).rejects.toThrow(/no 3D structure/i);
  });
});
