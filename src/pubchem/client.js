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
  const propsCache = new Map(); // cid → properties object

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

  async function fetchProperties(cid) {
    if (propsCache.has(cid)) return propsCache.get(cid);
    const props = 'Title,MolecularFormula,MolecularWeight,InChIKey';
    const url = `${BASE}/rest/pug/compound/cid/${cid}/property/${props}/JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Properties unavailable for CID ${cid}`);
    const json = await res.json();
    const row = json?.PropertyTable?.Properties?.[0] ?? {};
    const data = {
      cid,
      title: row.Title ?? null,
      formula: row.MolecularFormula ?? null,
      weight: row.MolecularWeight != null ? Number(row.MolecularWeight) : null,
      inchiKey: row.InChIKey ?? null,
    };
    propsCache.set(cid, data);
    return data;
  }

  return { suggest, resolveQuery, fetchMolecule, fetchProperties };
}
