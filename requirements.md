# atom2 — Stylized PubChem Molecule Viewer

A single-page web app that takes a PubChem reference (name, URL, or CID) and renders the molecule in 3D using one of four switchable visual styles.

## Goals

- Accept a PubChem molecule via search bar with name autocomplete, URL paste, or raw CID.
- Render the molecule in 3D as ball-and-stick using Three.js.
- Let the user switch between four distinct stylized looks at any time.
- Preserve the current molecule + style in the URL so views are shareable.
- Remember recently viewed molecules and user favorites locally.

## Non-Goals

- Server-side rendering or any backend service.
- Editing, modifying, or generating molecules.
- Scientific accuracy beyond what PubChem provides (e.g., quantum properties, dynamics).
- Protein/macromolecule visualization (PubChem hosts small molecules; ribbon representations are not in scope).
- Mobile-first UX (desktop is primary; mobile should be usable but is not optimized).

## Functional Requirements

### Search and Input

- A persistent search bar accepts:
  - **Name** (e.g., `aspirin`, `caffeine`) with live autocomplete via PubChem's REST autocomplete endpoint: `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/{query}/json`.
  - **PubChem compound URL** (e.g., `https://pubchem.ncbi.nlm.nih.gov/compound/2244`); the CID is parsed from the URL path.
  - **Raw CID** (e.g., `2244`); accepted directly.
- Autocomplete suggestions appear as the user types (debounced ~150 ms) and are dismissable with Escape.
- Submitting (click suggestion, press Enter, or paste-and-confirm) resolves to a CID and triggers a molecule load.
- Loading state is visible during the fetch.
- Errors are displayed inline and do not break the current view:
  - Unknown name / no results
  - CID exists but no 3D conformer available
  - Network failure

### Molecule Loading

- Fetch the 3D conformer from PubChem's PUG REST: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/SDF/?record_type=3d`.
- Parse the SDF to extract atoms (element + 3D coordinates) and bonds (atom indices + bond order).
- If no 3D conformer exists, surface a clear error and keep the previous molecule on screen.

### Rendering

- Representation: **ball-and-stick**.
  - Atoms: spheres sized roughly by van der Waals radius, colored by CPK convention.
  - Bonds: cylinders between bonded atoms. Bond order is visually distinct:
    - **Single** — one cylinder.
    - **Double** — two parallel offset cylinders.
    - **Triple** — three parallel offset cylinders (one centered, two offset).
  - **Aromatic rings** are detected and visually marked:
    - Ring perception via SSSR (smallest set of smallest rings) on the bond graph.
    - A ring is treated as aromatic if PubChem reports bond type 4 for its bonds, or if the ring has the alternating single/double pattern characteristic of a Kekulé representation (e.g., benzene from PubChem comes through as alternating 1/2 bonds).
    - Aromatic rings are rendered with an inner ring (thin torus) lying in the ring's mean plane, in addition to the underlying bonds. The underlying bonds for aromatic rings are drawn as single cylinders (the inner torus communicates the delocalization), so the inner ring is the canonical "aromatic" cue.
- Molecule geometry is built once per loaded molecule. Style changes never rebuild geometry — they only swap materials, lighting, background, and post-processing.
- Camera frames the molecule on load (auto-fit to bounding sphere).

### Visual Styles

A style selector (e.g., dropdown or segmented control) lets the user switch between four styles. The current style is reflected in the URL (see Sharing).

1. **Neon / Holographic**
   - Emissive atom and bond materials with strong bloom post-processing.
   - Dark or near-black background.
   - Slight chromatic aberration / color fringing optional.
   - Mood: sci-fi, glowing, Tron-like.

2. **Crystal / Glassy**
   - `MeshPhysicalMaterial` with transmission, refraction, and clearcoat.
   - Soft HDRI environment lighting for realistic reflections.
   - Light, neutral background that reads through the translucent atoms.
   - Mood: jewel-like, refined.

3. **Cel-shaded / Cartoon**
   - Toon shader (stepped lighting) on atoms and bonds.
   - Outline pass (post-processing or inverted-hull) around atoms and bonds.
   - Flat, single-color background.
   - Mood: comic-book, bold.

4. **Painterly / Organic**
   - Matte, slightly subsurface-feeling materials (clay or wax-like).
   - Warm key light + cool fill.
   - Subtle paper-grain or canvas-texture background.
   - Mood: soft, hand-rendered.

Each style is implemented as a self-contained "style profile" (materials, lights, background, post-processing pipeline) that can be applied to or removed from the shared scene without touching molecule geometry.

### Interaction

- `OrbitControls`: drag to rotate, scroll/pinch to zoom. Panning disabled.
- No auto-rotate.
- Damping enabled for smooth motion.

### Sharing and Persistence

- Active molecule and style are encoded in URL query params: `?cid=<cid>&style=<neon|crystal|toon|painterly>`.
- On page load, if `cid` is present, the molecule is fetched automatically; if `style` is present, that style is applied. Defaults: no molecule loaded, style = neon.
- A `localStorage` store keeps:
  - **Recent**: rolling list of the last N (e.g., 10) viewed CIDs with their resolved name.
  - **Favorites**: user-starred molecules.
- A sidebar or dropdown UI exposes both lists; clicking an entry loads it.

## Technical Requirements

- **Build tool:** Vite.
- **Rendering:** vanilla Three.js (ES modules, no React).
- **No backend.** All requests go directly to PubChem from the browser.
- **Browser target:** modern evergreen (Chrome/Firefox/Safari current). WebGL2 assumed.
- **Module structure:** clear separation between
  - PubChem client (search, autocomplete, fetch SDF)
  - SDF parser
  - Scene/geometry builder (atoms, bonds)
  - Style profiles (one module per style)
  - UI (search bar, autocomplete, style selector, recent/favorites)
  - URL state sync

## Future Requirements (out of scope for v1)

- Click an atom to see element info (name, atomic number, etc.).
- Hover tooltips on atoms/bonds.
- Additional representations (space-fill, wireframe, stick-only).
- Mobile-optimized gesture handling.
- Side-by-side style comparison.
