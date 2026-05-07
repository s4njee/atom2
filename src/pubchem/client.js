import { parseSDF } from './sdf.js';
import { detectAromaticRings } from './rings.js';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov';

export function parseInputToCID(input) {
  const trimmed = String(input).trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const m = trimmed.match(/pubchem\.ncbi\.nlm\.nih\.gov\/compound\/(\d+)/i);
  if (m) return Number(m[1]);
  return null;
}

export function createPubChemClient() {
  const cache = new Map(); // cid → MoleculeData

  async function suggest(query) {
    const q = query.trim();
    if (!q) return [];
    const url = `${BASE}/rest/autocomplete/compound/${encodeURIComponent(q)}/json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.dictionary_terms?.compound ?? [];
  }

  async function nameToCID(name) {
    const url = `${BASE}/rest/pug/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No compound found for "${name}"`);
    const json = await res.json();
    const cid = json?.IdentifierList?.CID?.[0];
    if (!cid) throw new Error(`No compound found for "${name}"`);
    return cid;
  }

  async function resolveQuery(input) {
    const cid = parseInputToCID(input);
    if (cid != null) return { cid, name: String(cid) };
    const resolved = await nameToCID(input);
    return { cid: resolved, name: input.trim() };
  }

  async function fetchMolecule(cid) {
    if (cache.has(cid)) return cache.get(cid);
    const url = `${BASE}/rest/pug/compound/cid/${cid}/SDF/?record_type=3d`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CID ${cid} has no 3D structure available`);
    const sdf = await res.text();
    const parsed = parseSDF(sdf);
    const data = {
      cid,
      name: String(cid),
      atoms: parsed.atoms,
      bonds: parsed.bonds,
      aromaticRings: detectAromaticRings(parsed),
    };
    cache.set(cid, data);
    return data;
  }

  return { suggest, resolveQuery, fetchMolecule };
}
