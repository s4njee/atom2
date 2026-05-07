# atom2 — Design

Companion to [requirements.md](requirements.md). Covers what can be reused across molecules and styles, the module layout, and the contracts between modules.

## Core Data Model

The whole app revolves around a single value type produced by the SDF parser:

```
MoleculeData {
  cid:            number,
  name:           string,         // resolved display name
  atoms:    Atom[]                // { element: 'C', position: Vec3 }
  bonds:    Bond[]                // { a: number, b: number, order: 1|2|3 }
  aromaticRings:  Ring[]          // { atomIndices: number[], normal: Vec3, center: Vec3, radius: number }
}
```

`MoleculeData` is pure data — no Three.js types — so it's easy to test, cache, and serialize. Everything visual is derived from it.

## Reuse Strategy

What gets created once and reused vs. what's per-molecule:

### Reused across all molecules (created once, lifetime of app)

- **Unit geometries** — a single `SphereGeometry(1)`, `CylinderGeometry(1, 1, 1)`, and `TorusGeometry(1, …)`. Every atom, bond, and aromatic ring is an instance of these, scaled and oriented via per-instance matrices. No per-molecule geometry allocation.
- **Element lookup tables** — CPK colors (`element → hex color`) and van der Waals radii (`element → number`). Static maps in `chem/elements.js`.
- **Three.js infrastructure** — one `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `OrbitControls`, and `EffectComposer`. Created at startup, never rebuilt.
- **PubChem client** — one instance handling autocomplete, URL/CID parsing, and SDF fetching, with a small in-memory cache of `cid → MoleculeData` so revisiting a recent molecule is instant.
- **Style profiles** — each of the four styles is a singleton object. Materials, textures, and post-processing passes inside a profile are created lazily on first activation and cached for the rest of the session (e.g., the crystal style's HDRI loads once).

### Reused across style switches (per molecule, kept until molecule changes)

- **InstancedMesh objects** for atoms, bonds, and aromatic rings. Switching style swaps the material on these meshes; geometry and instance buffers are untouched.
- **Per-instance buffers** (transform matrices, atom-color attribute) — computed once when the molecule loads.

### Rebuilt per molecule

- The set of `InstancedMesh` objects (atom count and bond count differ per molecule, so `InstancedMesh` instance counts must be set at construction time). Old meshes are disposed when a new molecule is loaded.

### Why this matters

- Switching styles is cheap: material swap + lights/background/post-processing reconfiguration. No geometry rebuild, no re-upload of instance data.
- Switching molecules rebuilds InstancedMesh instances but keeps the unit geometries, camera, controls, and active style profile intact.
- Memory stays bounded: at most one molecule's meshes live in the scene at a time; geometries and materials are shared.

## Module Layout

```
src/
  main.js                  entry — boots the app
  app.js                   top-level wiring (UI ↔ scene ↔ state)

  pubchem/
    client.js              autocomplete, fetch SDF, parse URL/CID, in-memory cache
    sdf.js                 SDF text → MoleculeData (atoms + bonds, no rings yet)
    rings.js               SSSR + aromaticity detection → MoleculeData.aromaticRings

  chem/
    elements.js            CPK colors, vdW radii, atomic-number table

  scene/
    viewer.js              owns renderer/scene/camera/controls/composer; render loop
    geometry.js            shared unit sphere/cylinder/torus
    builder.js             MoleculeData → MoleculeMeshes (InstancedMesh × atoms/bonds/rings)
    fitCamera.js           frame the molecule on load

  styles/
    profile.js             StyleProfile contract (interface)
    registry.js            { neon, crystal, toon, painterly } lookup
    neon.js
    crystal.js
    toon.js
    painterly.js

  ui/
    searchBar.js           input + debounced autocomplete + suggestion list
    styleSelector.js       4-way selector
    sidebar.js             recent + favorites list
    statusBar.js           loading/error display

  state/
    url.js                 read/write ?cid=&style= query params
    storage.js             localStorage: recent (rolling, max 10) + favorites
    store.js               minimal in-memory app state with subscribe()
```

## Module Contracts

The boundaries that matter:

### `pubchem/client.js`

```
resolveQuery(input: string): Promise<{ cid: number, name: string }>
  // input is name, URL, or raw CID
suggest(query: string): Promise<string[]>
  // autocomplete suggestions
fetchMolecule(cid: number): Promise<MoleculeData>
  // fetch SDF, parse, run ring perception, return full MoleculeData
```

The client is the only module that touches `fetch` or PubChem URLs. Everything downstream sees `MoleculeData`.

### `scene/viewer.js`

```
class Viewer {
  scene, camera, renderer, controls, composer    // exposed for style profiles
  setEnvironment(envTexture | null)
  setBackground(color | texture | null)
  setPostProcessing(passes: Pass[])
  setLights(lights: Light[])                     // replaces previous set
  start() / stop()                               // render loop
}
```

The viewer doesn't know about molecules or styles. It exposes the seams styles need to do their job.

### `scene/builder.js`

```
buildMoleculeMeshes(data: MoleculeData, geometry: SharedGeometry): MoleculeMeshes
disposeMoleculeMeshes(meshes: MoleculeMeshes): void

MoleculeMeshes {
  atoms:  InstancedMesh           // instanceColor = CPK
  bonds:  InstancedMesh           // single + offset cylinders for higher orders
  rings:  InstancedMesh | null    // aromatic-ring tori
}
```

The builder takes pure data + shared geometry and produces meshes with a placeholder material. The active style overwrites materials immediately after construction.

### `styles/profile.js` — the StyleProfile contract

```
StyleProfile {
  id:    'neon' | 'crystal' | 'toon' | 'painterly'
  name:  string                          // for the UI

  // Called when this style becomes active.
  apply(viewer: Viewer, meshes: MoleculeMeshes): void
  // Called when switching to a different style or unloading.
  dispose(viewer: Viewer, meshes: MoleculeMeshes): void

  // Called when a new molecule is loaded while this style is already active.
  // Lets the style assign its materials to the freshly built meshes.
  onMoleculeChanged(viewer: Viewer, meshes: MoleculeMeshes): void
}
```

Each profile owns: its materials (atom material, bond material, ring material — possibly per-element variants for special cases), its lights, its background/environment, and its post-processing passes. Profiles are independent — adding a fifth style is a new file in `styles/` plus an entry in `registry.js`.

### `state/store.js`

A tiny pub/sub store holding `{ cid, molecule, style }`. UI modules subscribe; `app.js` orchestrates the side effects (URL sync, fetching, mesh rebuilds).

## Data Flow

**On molecule change:**

1. UI submits a query → `pubchem.resolveQuery` → CID.
2. `pubchem.fetchMolecule(cid)` → `MoleculeData` (cached).
3. `builder.disposeMoleculeMeshes(old)` → `builder.buildMoleculeMeshes(data, geometry)` → new `MoleculeMeshes`.
4. `activeStyle.onMoleculeChanged(viewer, newMeshes)` reapplies the style's materials.
5. `fitCamera(viewer, newMeshes)`.
6. `state/url.js` writes `?cid=…`.

**On style change:**

1. UI emits new style id.
2. `activeStyle.dispose(viewer, meshes)`.
3. `nextStyle.apply(viewer, meshes)`.
4. `state/url.js` writes `?style=…`.

No geometry rebuild, no fetch, no flicker.

**On page load with `?cid=…&style=…`:**

1. `state/url.js` reads params.
2. `app.js` activates the requested style, then triggers the molecule-change flow above.

## Tradeoffs and Notes

- **Materials per element vs. per-instance color:** atoms share a single material with per-instance colors via `InstancedMesh.instanceColor`. Cheaper than per-element materials and fine for ball-and-stick. The cost: styles that want truly per-element behavior (e.g., a different shader for hydrogens) would need to either bucket by element into multiple `InstancedMesh` groups, or branch in a custom shader. Out of scope for v1.
- **Aromatic rings as tori:** they live in their own `InstancedMesh`. Detection happens in `pubchem/rings.js` after parsing; if no aromatic rings are detected, the rings mesh is `null` and not added to the scene.
- **Style isolation:** styles never touch each other's state. `dispose` is responsible for removing every light, pass, and environment the style added. This makes the switch path symmetric and reduces "leaked lights" bugs.
- **Testability:** `pubchem/sdf.js`, `pubchem/rings.js`, and `chem/elements.js` are pure and unit-testable without a DOM. `scene/builder.js` is testable with a mock geometry and a `MoleculeData` fixture.
