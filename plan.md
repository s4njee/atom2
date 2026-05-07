# atom2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app that takes a PubChem reference (name with autocomplete, URL, or CID) and renders the molecule in 3D using one of four switchable visual styles.

**Architecture:** Vite + vanilla Three.js. Pure-data `MoleculeData` flows from a PubChem client through a scene builder that produces shared `InstancedMesh` objects. Styles are independent profile modules that swap materials/lights/post-processing without rebuilding geometry.

**Tech Stack:** Vite, Three.js, Vitest (unit tests + jsdom for DOM tests), vanilla JS (ES modules).

---

## File Map

```
package.json
vite.config.js
vitest.config.js
index.html
.gitignore

src/
  main.js                  entry — boots the app
  app.js                   top-level wiring (UI ↔ scene ↔ state)

  pubchem/
    client.js              autocomplete, fetch SDF, URL/CID parsing, in-memory cache
    sdf.js                 SDF text → { atoms, bonds }
    rings.js               SSSR + aromaticity → aromaticRings[]

  chem/
    elements.js            CPK colors, vdW radii

  scene/
    viewer.js              renderer/scene/camera/controls/composer; render loop
    geometry.js            shared unit sphere/cylinder/torus
    builder.js             MoleculeData → MoleculeMeshes (InstancedMesh × atoms/bonds/rings)
    fitCamera.js           frame the molecule on load

  styles/
    profile.js             StyleProfile contract docs
    registry.js            { neon, crystal, toon, painterly } lookup
    neon.js
    crystal.js
    toon.js
    painterly.js

  ui/
    searchBar.js
    styleSelector.js
    sidebar.js
    statusBar.js

  state/
    url.js
    storage.js
    store.js

  styles.css

tests/
  fixtures/
    methane.sdf
    benzene.sdf
    aspirin.sdf
  pubchem/
    sdf.test.js
    rings.test.js
    client.test.js
  chem/
    elements.test.js
  state/
    url.test.js
    storage.test.js
    store.test.js
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `.gitignore`, `src/main.js`, `src/styles.css`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/sanjee/atom2
git init
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "atom2",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0"
  }
}
```

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: { outDir: 'dist' },
});
```

- [ ] **Step 4: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    environmentMatchGlobs: [
      ['tests/state/**', 'jsdom'],
    ],
  },
});
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
.DS_Store
*.log
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>atom2</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app">
      <header id="topbar">
        <div id="search-container"></div>
        <div id="style-container"></div>
      </header>
      <aside id="sidebar"></aside>
      <main id="canvas-container"></main>
      <div id="status"></div>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `src/styles.css`**

```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; font-family: system-ui, sans-serif; }
#app { display: grid; grid-template-areas: "top top" "side canvas"; grid-template-rows: 56px 1fr; grid-template-columns: 240px 1fr; height: 100%; }
#topbar { grid-area: top; display: flex; gap: 16px; align-items: center; padding: 8px 16px; border-bottom: 1px solid #ddd; }
#sidebar { grid-area: side; padding: 12px; border-right: 1px solid #ddd; overflow: auto; }
#canvas-container { grid-area: canvas; position: relative; }
#canvas-container canvas { display: block; width: 100%; height: 100%; }
#status { position: absolute; bottom: 12px; right: 12px; padding: 6px 10px; background: rgba(0,0,0,0.7); color: white; border-radius: 4px; font-size: 13px; display: none; }
#status.visible { display: block; }
```

- [ ] **Step 8: Create `src/main.js` placeholder**

```js
console.log('atom2 boot');
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: dependencies installed, `node_modules/` created.

- [ ] **Step 10: Verify dev server starts**

Run: `npm run dev`
Expected: Vite logs a local URL (e.g., `http://localhost:5173`). Open it; you should see an empty page with the layout grid (no errors in console). Stop the server.

- [ ] **Step 11: Verify test runner works**

Run: `npm test`
Expected: "No test files found" — that's fine for now.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: initial Vite + Three.js + Vitest scaffold"
```

---

## Task 2: Element Data Tables

**Files:**
- Create: `src/chem/elements.js`
- Create: `tests/chem/elements.test.js`

- [ ] **Step 1: Write the failing test**

`tests/chem/elements.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { CPK_COLORS, VDW_RADII, getColor, getRadius } from '../../src/chem/elements.js';

describe('elements', () => {
  it('has CPK color for common elements', () => {
    expect(CPK_COLORS.H).toBeDefined();
    expect(CPK_COLORS.C).toBeDefined();
    expect(CPK_COLORS.N).toBeDefined();
    expect(CPK_COLORS.O).toBeDefined();
  });

  it('has van der Waals radius for common elements', () => {
    expect(VDW_RADII.H).toBeGreaterThan(0);
    expect(VDW_RADII.C).toBeGreaterThan(VDW_RADII.H);
  });

  it('getColor falls back to default for unknown element', () => {
    expect(getColor('Xx')).toBe(CPK_COLORS.default);
  });

  it('getRadius falls back to default for unknown element', () => {
    expect(getRadius('Xx')).toBe(VDW_RADII.default);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/chem/elements.js`**

```js
// CPK colors as 0xRRGGBB integers (Three.js color format)
export const CPK_COLORS = {
  H:  0xffffff,
  C:  0x222222,
  N:  0x3050f8,
  O:  0xff0d0d,
  F:  0x90e050,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I:  0x940094,
  P:  0xff8000,
  S:  0xffff30,
  B:  0xffb5b5,
  Si: 0xf0c8a0,
  Na: 0xab5cf2,
  K:  0x8f40d4,
  Ca: 0x3dff00,
  Fe: 0xe06633,
  Mg: 0x8aff00,
  Zn: 0x7d80b0,
  default: 0xcccccc,
};

// Van der Waals radii in Ångströms; ball-and-stick scales these down at render time.
export const VDW_RADII = {
  H:  1.20,
  C:  1.70,
  N:  1.55,
  O:  1.52,
  F:  1.47,
  Cl: 1.75,
  Br: 1.85,
  I:  1.98,
  P:  1.80,
  S:  1.80,
  B:  1.92,
  Si: 2.10,
  Na: 2.27,
  K:  2.75,
  Ca: 2.31,
  Fe: 2.00,
  Mg: 1.73,
  Zn: 1.39,
  default: 1.50,
};

export function getColor(element) {
  return CPK_COLORS[element] ?? CPK_COLORS.default;
}

export function getRadius(element) {
  return VDW_RADII[element] ?? VDW_RADII.default;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chem/elements.js tests/chem/elements.test.js
git commit -m "feat(chem): CPK colors and van der Waals radii"
```

---

## Task 3: SDF Parser

**Files:**
- Create: `src/pubchem/sdf.js`
- Create: `tests/fixtures/methane.sdf`, `tests/fixtures/benzene.sdf`
- Create: `tests/pubchem/sdf.test.js`

- [ ] **Step 1: Add fixtures**

`tests/fixtures/methane.sdf` (copy verbatim, including trailing newline):

```
297
  -ISIS-

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.6300    0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6300   -0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6300    0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.6300   -0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
  1  5  1  0  0  0  0
M  END
$$$$
```

`tests/fixtures/benzene.sdf`:

```
241
  -ISIS-

 12 12  0  0  0  0  0  0  0  0999 V2000
    1.2131   -0.6884    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2028    0.7064    0.0001 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0103   -1.3948    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0104    1.3948   -0.0001 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2028   -0.7063    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2131    0.6884    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.1577   -1.2244    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    2.1393    1.2564    0.0001 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0184   -2.4809    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0184    2.4808    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -2.1394   -1.2563    0.0001 H   0  0  0  0  0  0  0  0  0  0  0  0
   -2.1577    1.2245    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  1  3  1  0  0  0  0
  2  4  1  0  0  0  0
  3  5  2  0  0  0  0
  4  6  2  0  0  0  0
  5  6  1  0  0  0  0
  1  7  1  0  0  0  0
  2  8  1  0  0  0  0
  3  9  1  0  0  0  0
  4 10  1  0  0  0  0
  5 11  1  0  0  0  0
  6 12  1  0  0  0  0
M  END
$$$$
```

- [ ] **Step 2: Write the failing test**

`tests/pubchem/sdf.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSDF } from '../../src/pubchem/sdf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('parseSDF', () => {
  it('parses methane: 5 atoms, 4 single bonds', () => {
    const data = parseSDF(fixture('methane.sdf'));
    expect(data.atoms).toHaveLength(5);
    expect(data.bonds).toHaveLength(4);
    expect(data.atoms[0].element).toBe('C');
    expect(data.atoms[1].element).toBe('H');
    expect(data.atoms[0].position.x).toBeCloseTo(0);
    expect(data.atoms[0].position.y).toBeCloseTo(0);
    expect(data.atoms[0].position.z).toBeCloseTo(0);
    expect(data.bonds[0]).toMatchObject({ a: 0, b: 1, order: 1 });
  });

  it('parses benzene: 12 atoms, 12 bonds with mixed orders', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    expect(data.atoms).toHaveLength(12);
    expect(data.bonds).toHaveLength(12);
    const orders = data.bonds.map(b => b.order).sort();
    // 3 double bonds in benzene + 9 single (6 C-H + 3 C-C)
    expect(orders.filter(o => o === 2)).toHaveLength(3);
    expect(orders.filter(o => o === 1)).toHaveLength(9);
  });

  it('uses 0-based atom indices in bonds', () => {
    const data = parseSDF(fixture('methane.sdf'));
    // SDF uses 1-based; we expect 0-based
    const ai = data.bonds.map(b => b.a);
    expect(Math.min(...ai)).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/pubchem/sdf.js`**

```js
// Minimal SDF V2000 parser for PubChem 3D conformer records.
// Returns { atoms: [{element, position:{x,y,z}}], bonds: [{a,b,order}] } with 0-based atom indices.

export function parseSDF(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 4) throw new Error('SDF too short');

  // Counts line is line index 3 (after 3-line header).
  const counts = lines[3];
  const atomCount = parseInt(counts.slice(0, 3), 10);
  const bondCount = parseInt(counts.slice(3, 6), 10);
  if (!Number.isFinite(atomCount) || !Number.isFinite(bondCount)) {
    throw new Error('Invalid SDF counts line');
  }

  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const line = lines[4 + i];
    if (!line) throw new Error(`Missing atom line ${i}`);
    const x = parseFloat(line.slice(0, 10));
    const y = parseFloat(line.slice(10, 20));
    const z = parseFloat(line.slice(20, 30));
    const element = line.slice(31, 34).trim();
    atoms.push({ element, position: { x, y, z } });
  }

  const bonds = [];
  for (let i = 0; i < bondCount; i++) {
    const line = lines[4 + atomCount + i];
    if (!line) throw new Error(`Missing bond line ${i}`);
    const a = parseInt(line.slice(0, 3), 10) - 1;
    const b = parseInt(line.slice(3, 6), 10) - 1;
    const order = parseInt(line.slice(6, 9), 10);
    bonds.push({ a, b, order });
  }

  return { atoms, bonds };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests added).

- [ ] **Step 6: Commit**

```bash
git add src/pubchem/sdf.js tests/pubchem/sdf.test.js tests/fixtures/methane.sdf tests/fixtures/benzene.sdf
git commit -m "feat(pubchem): SDF V2000 parser"
```

---

## Task 4: Ring Perception and Aromaticity

**Files:**
- Create: `src/pubchem/rings.js`
- Create: `tests/pubchem/rings.test.js`

- [ ] **Step 1: Write the failing test**

`tests/pubchem/rings.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSDF } from '../../src/pubchem/sdf.js';
import { detectAromaticRings } from '../../src/pubchem/rings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('detectAromaticRings', () => {
  it('finds one aromatic ring in benzene', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const rings = detectAromaticRings(data);
    expect(rings).toHaveLength(1);
    expect(rings[0].atomIndices).toHaveLength(6);
  });

  it('reports a ring center near origin for benzene', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const [ring] = detectAromaticRings(data);
    expect(Math.abs(ring.center.x)).toBeLessThan(0.05);
    expect(Math.abs(ring.center.y)).toBeLessThan(0.05);
  });

  it('reports a normal vector for the ring plane', () => {
    const data = parseSDF(fixture('benzene.sdf'));
    const [ring] = detectAromaticRings(data);
    const len = Math.hypot(ring.normal.x, ring.normal.y, ring.normal.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it('finds no aromatic rings in methane', () => {
    const data = parseSDF(fixture('methane.sdf'));
    const rings = detectAromaticRings(data);
    expect(rings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/pubchem/rings.js`**

```js
// Detect aromatic rings in MoleculeData.
//
// Strategy:
//   1. Build an adjacency list from bonds.
//   2. Find all simple cycles of size 5 or 6 via canonical-form DFS (small molecules → cheap).
//   3. A ring is "aromatic" if every atom is in {C, N, O, S} AND
//      (a) any of its bonds has order 4 (PubChem aromatic bond type), OR
//      (b) the bond orders alternate 1-2-1-2-... around the ring.
//   4. Compute geometric center, mean-plane normal (via SVD-free triangle-fan estimate),
//      and a representative radius for each aromatic ring.

const AROMATIC_ELEMENTS = new Set(['C', 'N', 'O', 'S']);
const RING_SIZES = [5, 6];

export function detectAromaticRings(molecule) {
  const { atoms, bonds } = molecule;
  const adj = buildAdjacency(atoms.length, bonds);
  const bondMap = buildBondMap(bonds);

  const rings = findSimpleRings(adj, RING_SIZES);
  const out = [];

  for (const atomIndices of rings) {
    if (!atomIndices.every(i => AROMATIC_ELEMENTS.has(atoms[i].element))) continue;
    if (!isAromaticByBondPattern(atomIndices, bondMap)) continue;
    out.push(buildRingGeometry(atomIndices, atoms));
  }

  return dedupeRings(out);
}

function buildAdjacency(atomCount, bonds) {
  const adj = Array.from({ length: atomCount }, () => []);
  for (const { a, b } of bonds) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

function buildBondMap(bonds) {
  const map = new Map();
  for (const { a, b, order } of bonds) {
    map.set(key(a, b), order);
  }
  return map;
}

function key(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// Find simple cycles of given sizes using DFS from each atom, keeping only
// cycles whose minimum atom index equals the start atom (avoids duplicates by rotation).
function findSimpleRings(adj, sizes) {
  const maxSize = Math.max(...sizes);
  const seen = new Set();
  const out = [];

  for (let start = 0; start < adj.length; start++) {
    const stack = [[start, [start]]];
    while (stack.length) {
      const [node, path] = stack.pop();
      if (path.length > maxSize) continue;
      for (const next of adj[node]) {
        if (next === start && path.length >= 3 && sizes.includes(path.length)) {
          // Closes a ring of an allowed size.
          const k = canonicalRingKey(path);
          if (!seen.has(k)) {
            seen.add(k);
            out.push([...path]);
          }
        } else if (next > start && !path.includes(next)) {
          stack.push([next, [...path, next]]);
        }
      }
    }
  }
  return out;
}

function canonicalRingKey(atomIndices) {
  // Rotate so smallest index is first; pick the lexicographically smaller of
  // the forward and reversed rotation.
  const n = atomIndices.length;
  let minIdx = 0;
  for (let i = 1; i < n; i++) if (atomIndices[i] < atomIndices[minIdx]) minIdx = i;
  const fwd = [];
  const rev = [];
  for (let i = 0; i < n; i++) {
    fwd.push(atomIndices[(minIdx + i) % n]);
    rev.push(atomIndices[(minIdx - i + n) % n]);
  }
  const fwdKey = fwd.join(',');
  const revKey = rev.join(',');
  return fwdKey < revKey ? fwdKey : revKey;
}

function isAromaticByBondPattern(atomIndices, bondMap) {
  const orders = [];
  for (let i = 0; i < atomIndices.length; i++) {
    const a = atomIndices[i];
    const b = atomIndices[(i + 1) % atomIndices.length];
    const order = bondMap.get(key(a, b));
    if (order == null) return false;
    orders.push(order);
  }
  if (orders.includes(4)) return true;

  // Alternating 1-2-1-2-... pattern starting from either offset.
  const altA = orders.every((o, i) => o === (i % 2 === 0 ? 1 : 2));
  const altB = orders.every((o, i) => o === (i % 2 === 0 ? 2 : 1));
  return altA || altB;
}

function buildRingGeometry(atomIndices, atoms) {
  const positions = atomIndices.map(i => atoms[i].position);
  const center = {
    x: positions.reduce((s, p) => s + p.x, 0) / positions.length,
    y: positions.reduce((s, p) => s + p.y, 0) / positions.length,
    z: positions.reduce((s, p) => s + p.z, 0) / positions.length,
  };
  // Average normal from triangle fans around the centroid.
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    const b = positions[(i + 1) % positions.length];
    const v1 = sub(a, center);
    const v2 = sub(b, center);
    const c = cross(v1, v2);
    nx += c.x; ny += c.y; nz += c.z;
  }
  const nlen = Math.hypot(nx, ny, nz) || 1;
  const normal = { x: nx / nlen, y: ny / nlen, z: nz / nlen };

  const radius = positions.reduce((s, p) => s + dist(p, center), 0) / positions.length;
  return { atomIndices, center, normal, radius };
}

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }

function dedupeRings(rings) {
  const seen = new Set();
  const out = [];
  for (const r of rings) {
    const k = canonicalRingKey(r.atomIndices);
    if (!seen.has(k)) { seen.add(k); out.push(r); }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 ring tests + earlier tests).

- [ ] **Step 5: Commit**

```bash
git add src/pubchem/rings.js tests/pubchem/rings.test.js
git commit -m "feat(pubchem): SSSR + aromaticity detection"
```

---

## Task 5: PubChem Client

**Files:**
- Create: `src/pubchem/client.js`
- Create: `tests/pubchem/client.test.js`

- [ ] **Step 1: Write the failing test**

`tests/pubchem/client.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/pubchem/client.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pubchem/client.js tests/pubchem/client.test.js
git commit -m "feat(pubchem): client with autocomplete, name-to-CID, fetch+cache"
```

---

## Task 6: URL State

**Files:**
- Create: `src/state/url.js`
- Create: `tests/state/url.test.js`

- [ ] **Step 1: Write the failing test**

`tests/state/url.test.js`:

```js
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
    window.history.replaceState({}, '', '/?cid=2244&style=neon');
    expect(readURLState()).toEqual({ cid: 2244, style: 'neon' });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/url.js`**

```js
const VALID_STYLES = new Set(['neon', 'crystal', 'toon', 'painterly']);

export function readURLState() {
  const params = new URLSearchParams(window.location.search);
  const rawCID = params.get('cid');
  const cid = rawCID && /^\d+$/.test(rawCID) ? Number(rawCID) : null;
  const rawStyle = params.get('style');
  const style = rawStyle && VALID_STYLES.has(rawStyle) ? rawStyle : null;
  return { cid, style };
}

export function writeURLState({ cid, style }) {
  const params = new URLSearchParams();
  if (cid != null) params.set('cid', String(cid));
  if (style != null) params.set('style', style);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/url.js tests/state/url.test.js
git commit -m "feat(state): URL ?cid=&style= read/write"
```

---

## Task 7: localStorage (recents + favorites)

**Files:**
- Create: `src/state/storage.js`
- Create: `tests/state/storage.test.js`

- [ ] **Step 1: Write the failing test**

`tests/state/storage.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/storage.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/storage.js tests/state/storage.test.js
git commit -m "feat(state): localStorage recents and favorites"
```

---

## Task 8: In-Memory Store

**Files:**
- Create: `src/state/store.js`
- Create: `tests/state/store.test.js`

- [ ] **Step 1: Write the failing test**

`tests/state/store.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/store.js`**

```js
export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.js tests/state/store.test.js
git commit -m "feat(state): pub/sub store"
```

---

## Task 9: Shared Geometry

**Files:**
- Create: `src/scene/geometry.js`

- [ ] **Step 1: Implement `src/scene/geometry.js`**

```js
import * as THREE from 'three';

// Created lazily and shared across the app's lifetime.
let cache = null;

export function getSharedGeometry() {
  if (cache) return cache;
  cache = {
    sphere: new THREE.SphereGeometry(1, 24, 16),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true),
    torus: new THREE.TorusGeometry(1, 0.06, 12, 48),
  };
  return cache;
}
```

- [ ] **Step 2: Commit**

No test (used at runtime by viewer/builder; smoke-tested in browser later).

```bash
git add src/scene/geometry.js
git commit -m "feat(scene): shared unit sphere/cylinder/torus geometry"
```

---

## Task 10: Viewer

**Files:**
- Create: `src/scene/viewer.js`

- [ ] **Step 1: Implement `src/scene/viewer.js`**

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export function createViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Tracked so they can be cleared on style change.
  let activeLights = [];
  let activeExtraPasses = [];

  function setLights(lights) {
    for (const l of activeLights) scene.remove(l);
    activeLights = lights;
    for (const l of activeLights) scene.add(l);
  }

  function setBackground(value) {
    scene.background = value ?? null;
  }

  function setEnvironment(envTexture) {
    scene.environment = envTexture ?? null;
  }

  function setPostProcessing(passes) {
    for (const p of activeExtraPasses) composer.removePass(p);
    activeExtraPasses = passes;
    for (const p of activeExtraPasses) composer.addPass(p);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let raf = null;
  function start() {
    if (raf != null) return;
    const tick = () => {
      controls.update();
      composer.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    scene, camera, renderer, controls, composer,
    setLights, setBackground, setEnvironment, setPostProcessing,
    resize, start, stop,
  };
}
```

- [ ] **Step 2: Smoke-test in browser**

Update `src/main.js` temporarily:

```js
import * as THREE from 'three';
import { createViewer } from './scene/viewer.js';

const viewer = createViewer(document.getElementById('canvas-container'));
viewer.setBackground(new THREE.Color(0x222233));
viewer.setLights([new THREE.AmbientLight(0xffffff, 0.6), new THREE.DirectionalLight(0xffffff, 0.8)]);
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x88ccff }));
viewer.scene.add(cube);
viewer.start();
```

Run: `npm run dev`
Expected: Open the URL — a shaded blue cube on a dark gray background. Drag to orbit; scroll to zoom. No console errors. Stop the server.

- [ ] **Step 3: Revert main.js to placeholder**

```js
console.log('atom2 boot');
```

- [ ] **Step 4: Commit**

```bash
git add src/scene/viewer.js src/main.js
git commit -m "feat(scene): viewer with orbit controls and post-processing composer"
```

---

## Task 11: Mesh Builder

**Files:**
- Create: `src/scene/builder.js`

- [ ] **Step 1: Implement `src/scene/builder.js`**

```js
import * as THREE from 'three';
import { getColor, getRadius } from '../chem/elements.js';

const ATOM_SCALE = 0.3;       // ball-and-stick: shrink atoms relative to vdW
const BOND_RADIUS = 0.08;
const DOUBLE_OFFSET = 0.18;
const TRIPLE_OFFSET = 0.22;
const RING_SHRINK = 0.65;     // inner aromatic torus radius factor

const _v = new THREE.Vector3();
const _u = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();

const PLACEHOLDER_MAT = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

export function buildMoleculeMeshes(data, geometry) {
  const { atoms, bonds, aromaticRings } = data;
  const atomMesh = buildAtoms(atoms, geometry.sphere);

  // For each higher-order bond we add 2 extra cylinders (double = 1 main + 1 offset; triple = 1 main + 2 offsets).
  const cylCount = bonds.reduce((n, b) => n + (b.order >= 2 ? (b.order >= 3 ? 3 : 2) : 1), 0);
  const bondMesh = buildBonds(atoms, bonds, cylCount, geometry.cylinder);

  let ringMesh = null;
  if (aromaticRings.length > 0) ringMesh = buildRings(aromaticRings, geometry.torus);

  return { atoms: atomMesh, bonds: bondMesh, rings: ringMesh };
}

export function disposeMoleculeMeshes(meshes) {
  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    if (!m) continue;
    if (m.parent) m.parent.remove(m);
    // Materials are owned by style profiles; don't dispose here.
  }
}

function buildAtoms(atoms, sphereGeom) {
  const mesh = new THREE.InstancedMesh(sphereGeom, PLACEHOLDER_MAT.clone(), atoms.length);
  mesh.name = 'atoms';
  const color = new THREE.Color();
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    const r = getRadius(a.element) * ATOM_SCALE;
    _v.set(a.position.x, a.position.y, a.position.z);
    _s.set(r, r, r);
    _m.compose(_v, new THREE.Quaternion(), _s);
    mesh.setMatrixAt(i, _m);
    color.setHex(getColor(a.element));
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildBonds(atoms, bonds, totalCount, cylGeom) {
  const mesh = new THREE.InstancedMesh(cylGeom, PLACEHOLDER_MAT.clone(), totalCount);
  mesh.name = 'bonds';
  let idx = 0;
  for (const b of bonds) {
    const a = atoms[b.a].position;
    const c = atoms[b.b].position;
    if (b.order === 1) {
      idx = setBondInstance(mesh, idx, a, c, 0);
    } else if (b.order === 2) {
      const off = perpendicular(a, c, DOUBLE_OFFSET);
      idx = setBondInstance(mesh, idx, a, c, +off);
      idx = setBondInstance(mesh, idx, a, c, -off);
    } else { // 3 or higher
      const off = perpendicular(a, c, TRIPLE_OFFSET);
      idx = setBondInstance(mesh, idx, a, c, 0);
      idx = setBondInstance(mesh, idx, a, c, +off);
      idx = setBondInstance(mesh, idx, a, c, -off);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// `perpendicular` returns a scalar offset along a stable perpendicular direction
// computed from the bond axis. The axis is captured by the closure for reuse.
function perpendicular(a, c, magnitude) {
  // We pick a perpendicular based on the bond direction. Stash it on a side channel.
  const axis = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).normalize();
  const helper = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perp = new THREE.Vector3().crossVectors(axis, helper).normalize().multiplyScalar(magnitude);
  // Cache for `setBondInstance` to read.
  perpendicular._lastPerp = perp;
  return 1; // The offset sign is multiplied at the call site (+1 / -1 / 0).
}

function setBondInstance(mesh, idx, a, c, sign) {
  const ax = a.x, ay = a.y, az = a.z;
  const cx = c.x, cy = c.y, cz = c.z;
  const perp = perpendicular._lastPerp || new THREE.Vector3();
  const ox = perp.x * sign;
  const oy = perp.y * sign;
  const oz = perp.z * sign;

  _v.set((ax + cx) / 2 + ox, (ay + cy) / 2 + oy, (az + cz) / 2 + oz);
  const dx = cx - ax, dy = cy - ay, dz = cz - az;
  const len = Math.hypot(dx, dy, dz);

  // Cylinder geometry is along Y axis with height 1; scale Y to bond length, X/Z to bond radius.
  _u.set(dx, dy, dz).normalize();
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _u);
  _s.set(BOND_RADIUS, len, BOND_RADIUS);
  _m.compose(_v, _q, _s);
  mesh.setMatrixAt(idx, _m);
  return idx + 1;
}

function buildRings(rings, torusGeom) {
  const mesh = new THREE.InstancedMesh(torusGeom, PLACEHOLDER_MAT.clone(), rings.length);
  mesh.name = 'rings';
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    _v.set(r.center.x, r.center.y, r.center.z);
    _u.set(r.normal.x, r.normal.y, r.normal.z);
    // Torus geometry's axis is +Z; align Z to ring normal.
    _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _u);
    const inner = r.radius * RING_SHRINK;
    _s.set(inner, inner, inner);
    _m.compose(_v, _q, _s);
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/builder.js
git commit -m "feat(scene): build InstancedMesh for atoms, bonds, aromatic rings"
```

---

## Task 12: fitCamera

**Files:**
- Create: `src/scene/fitCamera.js`

- [ ] **Step 1: Implement `src/scene/fitCamera.js`**

```js
import * as THREE from 'three';

export function fitCamera(viewer, meshes) {
  const box = new THREE.Box3();
  if (meshes.atoms) box.expandByObject(meshes.atoms);
  if (box.isEmpty()) return;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const { camera, controls } = viewer;
  const fov = (camera.fov * Math.PI) / 180;
  const distance = sphere.radius / Math.sin(fov / 2) * 1.4;

  const dir = new THREE.Vector3(0, 0, 1);
  camera.position.copy(sphere.center).add(dir.multiplyScalar(distance));
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();

  controls.target.copy(sphere.center);
  controls.update();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/fitCamera.js
git commit -m "feat(scene): fit camera to molecule bounding sphere"
```

---

## Task 13: Smoke-Test the Pipeline (Methane)

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Wire a hardcoded methane render**

```js
import * as THREE from 'three';
import { createViewer } from './scene/viewer.js';
import { getSharedGeometry } from './scene/geometry.js';
import { buildMoleculeMeshes } from './scene/builder.js';
import { fitCamera } from './scene/fitCamera.js';
import { parseSDF } from './pubchem/sdf.js';
import { detectAromaticRings } from './pubchem/rings.js';

const METHANE_SDF = `297
  -ISIS-

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.6300    0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6300   -0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6300    0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.6300   -0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
  1  5  1  0  0  0  0
M  END
$$$$
`;

const viewer = createViewer(document.getElementById('canvas-container'));
viewer.setBackground(new THREE.Color(0x222233));
viewer.setLights([new THREE.AmbientLight(0xffffff, 0.6), new THREE.DirectionalLight(0xffffff, 0.8)]);
viewer.start();

const parsed = parseSDF(METHANE_SDF);
const data = { cid: 297, name: 'methane', ...parsed, aromaticRings: detectAromaticRings(parsed) };
const meshes = buildMoleculeMeshes(data, getSharedGeometry());
viewer.scene.add(meshes.atoms);
viewer.scene.add(meshes.bonds);
fitCamera(viewer, meshes);
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: A central dark-gray carbon sphere with four white hydrogen spheres connected by gray cylinders, framed by the camera. Drag to orbit; scroll to zoom. No console errors.

- [ ] **Step 3: Stop the server and commit**

```bash
git add src/main.js
git commit -m "chore: smoke-test pipeline with hardcoded methane"
```

---

## Task 14: StyleProfile Contract + Registry Stub

**Files:**
- Create: `src/styles/profile.js`
- Create: `src/styles/registry.js`

- [ ] **Step 1: Document the contract in `src/styles/profile.js`**

```js
// StyleProfile contract:
//
// {
//   id:    'neon' | 'crystal' | 'toon' | 'painterly',
//   name:  string,                              // human-readable label
//   apply(viewer, meshes): void,                // activate; assign materials, lights, bg, post-processing
//   dispose(viewer, meshes): void,              // remove everything `apply` added
//   onMoleculeChanged(viewer, meshes): void,    // reapply materials to freshly built meshes
// }

export {};
```

- [ ] **Step 2: Implement `src/styles/registry.js` with empty entries**

```js
import { neon } from './neon.js';
import { crystal } from './crystal.js';
import { toon } from './toon.js';
import { painterly } from './painterly.js';

export const STYLES = { neon, crystal, toon, painterly };

export const STYLE_LIST = [neon, crystal, toon, painterly];

export function getStyle(id) {
  return STYLES[id] ?? STYLES.neon;
}
```

(Note: this file imports modules created in the next four tasks — until those exist, `npm run dev` will fail to import. That's expected; we'll build them next.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/profile.js src/styles/registry.js
git commit -m "feat(styles): StyleProfile contract and registry"
```

---

## Task 15: Neon Style

**Files:**
- Create: `src/styles/neon.js`

- [ ] **Step 1: Implement `src/styles/neon.js`**

```js
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const ID = 'neon';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.4,
  });
  bondMaterial = new THREE.MeshStandardMaterial({
    color: 0x66ffff,
    emissive: 0x33ccff,
    emissiveIntensity: 1.0,
    metalness: 0.4,
    roughness: 0.3,
  });
  ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xff66ff,
    emissive: 0xff33ff,
    emissiveIntensity: 1.2,
    metalness: 0.3,
    roughness: 0.3,
  });
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 1.4, 0.6, 0.0);
  return bloomPass;
}

export const neon = {
  id: ID,
  name: 'Neon',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x05050a));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0x222244, 0.4),
      new THREE.PointLight(0xffffff, 0.5),
    ]);
    viewer.setPostProcessing([ensureBloom(viewer)]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setPostProcessing([]);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/neon.js
git commit -m "feat(styles): neon/holographic style with bloom"
```

---

## Task 16: Crystal Style

**Files:**
- Create: `src/styles/crystal.js`

- [ ] **Step 1: Implement `src/styles/crystal.js`**

```js
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let envTexture = null;

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    transmission: 0.85,
    thickness: 0.6,
    ior: 1.5,
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  bondMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xeeeeee,
    transmission: 0.6,
    thickness: 0.3,
    ior: 1.4,
    roughness: 0.1,
    clearcoat: 0.8,
  });
  ringMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.7,
    thickness: 0.2,
    ior: 1.5,
    roughness: 0.1,
  });
}

function ensureEnvironment(viewer) {
  if (envTexture) return envTexture;
  const pmrem = new THREE.PMREMGenerator(viewer.renderer);
  envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return envTexture;
}

export const crystal = {
  id: 'crystal',
  name: 'Crystal',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xe8eef5));
    viewer.setEnvironment(ensureEnvironment(viewer));
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.3),
      new THREE.DirectionalLight(0xffffff, 0.6),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setEnvironment(null);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/crystal.js
git commit -m "feat(styles): crystal/glassy style with PMREM environment"
```

---

## Task 17: Toon Style

**Files:**
- Create: `src/styles/toon.js`

- [ ] **Step 1: Implement `src/styles/toon.js`**

```js
import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let outlineGradient = null;

function ensureGradient() {
  if (outlineGradient) return outlineGradient;
  const data = new Uint8Array([0, 80, 160, 255]); // 4-step toon ramp
  outlineGradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  outlineGradient.needsUpdate = true;
  outlineGradient.minFilter = THREE.NearestFilter;
  outlineGradient.magFilter = THREE.NearestFilter;
  return outlineGradient;
}

function ensureMaterials() {
  if (atomMaterial) return;
  const grad = ensureGradient();
  atomMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  bondMaterial = new THREE.MeshToonMaterial({ color: 0x444444, gradientMap: grad });
  ringMaterial = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: grad });
}

// "Outline" via inverted-hull child mesh: a slightly larger black instance of each mesh,
// rendered with BackSide so it shows only as a silhouette around the original.
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const OUTLINE_SCALE = 1.05;

function makeOutline(source) {
  if (!source) return null;
  const outline = new THREE.InstancedMesh(source.geometry, OUTLINE_MAT, source.count);
  outline.name = source.name + '-outline';
  const m = new THREE.Matrix4();
  const s = new THREE.Matrix4().makeScale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE);
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, m);
    m.multiply(s);
    outline.setMatrixAt(i, m);
  }
  outline.instanceMatrix.needsUpdate = true;
  return outline;
}

let outlines = [];

function clearOutlines(viewer) {
  for (const o of outlines) viewer.scene.remove(o);
  outlines = [];
}

function buildOutlines(viewer, meshes) {
  clearOutlines(viewer);
  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    const o = makeOutline(m);
    if (o) { viewer.scene.add(o); outlines.push(o); }
  }
}

export const toon = {
  id: 'toon',
  name: 'Cartoon',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xfff7e0));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.5),
      new THREE.DirectionalLight(0xffffff, 0.8),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
    buildOutlines(viewer, meshes);
  },

  dispose(viewer) {
    clearOutlines(viewer);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/toon.js
git commit -m "feat(styles): toon/cartoon style with inverted-hull outlines"
```

---

## Task 18: Painterly Style

**Files:**
- Create: `src/styles/painterly.js`

- [ ] **Step 1: Implement `src/styles/painterly.js`**

```js
import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let paperTexture = null;

function ensurePaper() {
  if (paperTexture) return paperTexture;
  // Generate a soft paper-grain noise texture procedurally.
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = 220 + Math.floor(Math.random() * 35);
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v - 5;
    data[i * 4 + 2] = v - 15;
    data[i * 4 + 3] = 255;
  }
  paperTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
  paperTexture.needsUpdate = true;
  return paperTexture;
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: false,
  });
  bondMaterial = new THREE.MeshStandardMaterial({
    color: 0x886655,
    roughness: 0.95,
    metalness: 0.0,
  });
  ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xa07050,
    roughness: 0.9,
    metalness: 0.0,
  });
}

export const painterly = {
  id: 'painterly',
  name: 'Painterly',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(ensurePaper());
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xfff0d8, 0.4),
      new THREE.DirectionalLight(0xfff5e0, 0.8),
      new THREE.DirectionalLight(0x88aaff, 0.3),
    ]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose() {},
};
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/painterly.js
git commit -m "feat(styles): painterly style with procedural paper-grain background"
```

---

## Task 19: Status Bar

**Files:**
- Create: `src/ui/statusBar.js`

- [ ] **Step 1: Implement `src/ui/statusBar.js`**

```js
export function createStatusBar(container) {
  function set(message, kind = 'info') {
    if (!message) {
      container.classList.remove('visible');
      container.textContent = '';
      return;
    }
    container.textContent = message;
    container.style.background = kind === 'error' ? 'rgba(180,40,40,0.85)' : 'rgba(0,0,0,0.7)';
    container.classList.add('visible');
  }
  return { set };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/statusBar.js
git commit -m "feat(ui): status bar for loading and error messages"
```

---

## Task 20: Style Selector

**Files:**
- Create: `src/ui/styleSelector.js`

- [ ] **Step 1: Implement `src/ui/styleSelector.js`**

```js
import { STYLE_LIST } from '../styles/registry.js';

export function createStyleSelector(container, { initial, onChange }) {
  container.innerHTML = '';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Visual style');
  for (const s of STYLE_LIST) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (s.id === initial) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => onChange(select.value));
  container.appendChild(select);

  return {
    setValue(id) {
      if (select.value !== id) select.value = id;
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/styleSelector.js
git commit -m "feat(ui): style selector dropdown"
```

---

## Task 21: Search Bar with Autocomplete

**Files:**
- Create: `src/ui/searchBar.js`

- [ ] **Step 1: Implement `src/ui/searchBar.js`**

```js
const DEBOUNCE_MS = 150;

export function createSearchBar(container, { client, onSubmit }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'PubChem name, URL, or CID';
  input.style.width = '320px';
  input.style.padding = '6px 8px';
  input.setAttribute('aria-label', 'PubChem search');
  const list = document.createElement('ul');
  list.style.position = 'absolute';
  list.style.top = '100%';
  list.style.left = '0';
  list.style.right = '0';
  list.style.margin = '0';
  list.style.padding = '0';
  list.style.listStyle = 'none';
  list.style.background = 'white';
  list.style.border = '1px solid #ccc';
  list.style.maxHeight = '240px';
  list.style.overflow = 'auto';
  list.style.display = 'none';
  list.style.zIndex = '10';

  wrap.appendChild(input);
  wrap.appendChild(list);
  container.appendChild(wrap);

  let timer = null;
  let activeIdx = -1;
  let suggestions = [];

  function hide() {
    list.style.display = 'none';
    list.innerHTML = '';
    activeIdx = -1;
    suggestions = [];
  }

  function render() {
    list.innerHTML = '';
    suggestions.forEach((name, i) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.style.padding = '6px 8px';
      li.style.cursor = 'pointer';
      li.style.background = i === activeIdx ? '#eef' : 'white';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = name;
        hide();
        onSubmit(name);
      });
      list.appendChild(li);
    });
    list.style.display = suggestions.length ? 'block' : 'none';
  }

  async function fetchSuggestions(q) {
    if (!q.trim()) { hide(); return; }
    try {
      suggestions = await client.suggest(q);
      activeIdx = -1;
      render();
    } catch {
      hide();
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => fetchSuggestions(input.value), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(suggestions.length - 1, activeIdx + 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(-1, activeIdx - 1);
      render();
    } else if (e.key === 'Enter') {
      const value = activeIdx >= 0 ? suggestions[activeIdx] : input.value;
      hide();
      if (value.trim()) onSubmit(value);
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(hide, 150);
  });

  return {
    focus: () => input.focus(),
    setValue: (v) => { input.value = v; },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/searchBar.js
git commit -m "feat(ui): search bar with debounced autocomplete and keyboard nav"
```

---

## Task 22: Sidebar (Recents + Favorites)

**Files:**
- Create: `src/ui/sidebar.js`

- [ ] **Step 1: Implement `src/ui/sidebar.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/sidebar.js
git commit -m "feat(ui): sidebar with favorites and recents"
```

---

## Task 23: App Wiring

**Files:**
- Create: `src/app.js`
- Modify: `src/main.js`

- [ ] **Step 1: Implement `src/app.js`**

```js
import { createViewer } from './scene/viewer.js';
import { getSharedGeometry } from './scene/geometry.js';
import { buildMoleculeMeshes, disposeMoleculeMeshes } from './scene/builder.js';
import { fitCamera } from './scene/fitCamera.js';
import { createPubChemClient } from './pubchem/client.js';
import { getStyle } from './styles/registry.js';
import { createSearchBar } from './ui/searchBar.js';
import { createStyleSelector } from './ui/styleSelector.js';
import { createSidebar } from './ui/sidebar.js';
import { createStatusBar } from './ui/statusBar.js';
import { createStore } from './state/store.js';
import { readURLState, writeURLState } from './state/url.js';
import { addRecent } from './state/storage.js';

export function startApp() {
  const viewer = createViewer(document.getElementById('canvas-container'));
  viewer.start();

  const client = createPubChemClient();
  const status = createStatusBar(document.getElementById('status'));
  const initial = readURLState();
  const store = createStore({
    molecule: null,
    meshes: null,
    style: initial.style ?? 'neon',
  });

  let activeStyle = getStyle(store.get().style);
  activeStyle.apply(viewer, null);

  const styleSelector = createStyleSelector(document.getElementById('style-container'), {
    initial: store.get().style,
    onChange: (id) => switchStyle(id),
  });

  const sidebar = createSidebar(document.getElementById('sidebar'), {
    onPick: (entry) => loadCID(entry.cid, entry.name),
  });

  createSearchBar(document.getElementById('search-container'), {
    client,
    onSubmit: (input) => loadFromInput(input),
  });

  if (initial.cid != null) loadCID(initial.cid, String(initial.cid));

  async function loadFromInput(input) {
    status.set('Resolving…');
    try {
      const { cid, name } = await client.resolveQuery(input);
      await loadCID(cid, name);
    } catch (e) {
      status.set(e.message, 'error');
    }
  }

  async function loadCID(cid, name) {
    status.set(`Loading CID ${cid}…`);
    try {
      const data = await client.fetchMolecule(cid);
      data.name = name || data.name;
      const old = store.get().meshes;
      if (old) {
        disposeMoleculeMeshes(old);
        for (const m of [old.atoms, old.bonds, old.rings]) if (m) viewer.scene.remove(m);
      }
      const meshes = buildMoleculeMeshes(data, getSharedGeometry());
      if (meshes.atoms) viewer.scene.add(meshes.atoms);
      if (meshes.bonds) viewer.scene.add(meshes.bonds);
      if (meshes.rings) viewer.scene.add(meshes.rings);
      activeStyle.onMoleculeChanged(viewer, meshes);
      fitCamera(viewer, meshes);
      store.set({ molecule: data, meshes });
      addRecent({ cid, name: data.name });
      sidebar.refresh();
      writeURLState({ cid, style: activeStyle.id });
      status.set('');
    } catch (e) {
      status.set(e.message, 'error');
    }
  }

  function switchStyle(id) {
    const next = getStyle(id);
    if (next.id === activeStyle.id) return;
    const meshes = store.get().meshes;
    activeStyle.dispose(viewer, meshes);
    next.apply(viewer, meshes);
    activeStyle = next;
    store.set({ style: id });
    styleSelector.setValue(id);
    const cid = store.get().molecule?.cid ?? null;
    writeURLState({ cid, style: id });
  }
}
```

- [ ] **Step 2: Replace `src/main.js`**

```js
import { startApp } from './app.js';

startApp();
```

- [ ] **Step 3: End-to-end smoke test**

Run: `npm run dev`. Open the local URL. Verify:

1. Empty scene loads with default neon style (dark background, glow visible once a molecule is rendered).
2. Type "asp" in the search bar — autocomplete suggestions appear within ~200ms.
3. Click "aspirin" — status shows loading, then molecule appears framed and centered.
4. Drag to orbit; scroll to zoom. Panning is disabled.
5. Switch to "Crystal" in the dropdown — translucent glassy atoms appear without re-fetching.
6. Switch to "Cartoon" — flat shaded atoms with black outlines.
7. Switch to "Painterly" — matte clay-feel atoms on paper-grain background.
8. URL updates to `?cid=2244&style=painterly`. Reload the page — molecule and style restore.
9. Aspirin's benzene ring shows an inner torus mark (aromatic indicator).
10. Star aspirin in the sidebar — it appears in Favorites. Click another suggestion (e.g., search "benzene", pick it) — appears in Recents. Reload the page — favorites and recents persist.
11. Search for an invalid term ("zzzzzzz") — error appears in the status bar; previous molecule stays on screen.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/app.js src/main.js
git commit -m "feat(app): wire UI, scene, state, and style switching end-to-end"
```

---

## Task 24: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write a short README**

```markdown
# atom2

A stylized 3D molecule viewer for PubChem compounds. Search by name (with autocomplete), URL, or CID; render in one of four switchable visual styles (neon, crystal, cartoon, painterly).

See [requirements.md](requirements.md) and [design.md](design.md).

## Develop

```
npm install
npm run dev
```

## Test

```
npm test
```

## Build

```
npm run build
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with quickstart"
```

---

## Notes for the Implementer

- **PubChem CORS:** PubChem REST endpoints support CORS for browser fetches. No proxy needed.
- **Three.js add-ons** (`OrbitControls`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `RoomEnvironment`, `PMREMGenerator`) live under `three/addons/` in modern versions. If imports fail, check the installed Three.js version's add-on path.
- **Style profiles never own meshes.** They only set materials and scene-level state (lights, background, environment, post-processing). The toon style's outline meshes are an exception — those are added in `apply`/`onMoleculeChanged` and removed in `dispose` and on every molecule change.
- **`disposeMoleculeMeshes` does not dispose materials.** Materials belong to style profiles and are reused. It only removes meshes from the scene.
- **Browser smoke-tests are part of the plan.** Don't skip them — Three.js bugs rarely fail unit tests but show up immediately visually.
