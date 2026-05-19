# tasks — shader expansion

Implementation tasks for every shader cataloged in [SHADERS.md](SHADERS.md). Tasks are organized by shader; cross-cutting infrastructure is listed once under **Common**.

## Common requirements (apply to every shader below)

- [x] Each shader lives in its **own file** under [src/styles/](src/styles/), exporting a `StyleProfile` per the contract in [profile.js](src/styles/profile.js). *(pattern established by existing four)*
- [ ] Register every new shader in [registry.js](src/styles/registry.js) (`STYLES` map and `STYLE_LIST` array — order in `STYLE_LIST` determines arrow-key cycle order). *(ongoing — done per shader)*
- [x] Add a global keydown handler that cycles through `STYLE_LIST`:
  - `ArrowUp` → previous style (wraps to last)
  - `ArrowDown` → next style (wraps to first)
  - Ignore when an input/textarea is focused (search bar is at [searchBar.js](src/ui/searchBar.js)).
  - Calls the viewer's existing style-switch path; reuses `dispose` + `apply` + `onMoleculeChanged`.
- [x] Show the currently active style name briefly on switch (HUD or info-card update). *(flashes via status bar for 900ms)*

---

## 1. Optical / physical

### Soap-bubble iridescence — **S/M** ✅
- [x] Create `src/styles/iridescence.js`.
- [x] Custom `ShaderMaterial` for atoms: compute `cosI = dot(N, V)`, optical path `2 * thickness * n * cosI`.
- [x] Wavelength → RGB ramp (precomputed LUT, or three cosines at 650/550/450 nm) in fragment shader.
- [x] Per-element `thickness` uniform / instance attribute; clamp range to avoid noise on tight curvature. *(per-element via instance-color hash)*
- [x] Soft bloom pass + dark background in `apply`.
- [x] Register + add to `STYLE_LIST`.

### True refraction (gemstone) — **M**
- [ ] Create `src/styles/gemstone.js`.
- [ ] `MeshPhysicalMaterial` with `transmission: 1`, `ior: ~1.7`, `thickness > 0`, low `roughness`.
- [ ] Offscreen render target: render molecule opaque first, sample for transmission so it self-refracts.
- [ ] Lower DPR while this style is active (perf safety net); restore in `dispose`.
- [ ] Register + add to `STYLE_LIST`.

### Parallax geode interior — **M**
- [ ] Create `src/styles/geode.js`.
- [ ] Procedurally generate a noise+Voronoi cubemap once at module load (cache).
- [ ] Fragment shader: march 4–8 steps inward from view direction through cubemap; tint by element color.
- [ ] Register + add to `STYLE_LIST`.

### Caustics & god-rays — **M/L**
- [ ] Create `src/styles/caustics.js`.
- [ ] Tri-planar cubemap-projected Voronoi caustic pattern, advected with `uTime`.
- [ ] Post-pass god-rays: occluder pass + screen-space radial blur from key-light position.
- [ ] Slow-moving gradient background.
- [ ] Register + add to `STYLE_LIST`.

### Velvet / Minnaert — **S** ✅
- [x] Create `src/styles/velvet.js`.
- [x] BRDF: `(N·L * N·V)^(k-1) * N·L`, k ≈ 1.5–2 (or simpler: `color * pow(1 - N·V, k)` over low diffuse).
- [x] Register + add to `STYLE_LIST`.

### Subsurface scattering (wax / jade) — **M**
- [ ] Create `src/styles/sss.js`.
- [ ] Back-light term `pow(saturate(dot(V, -L)), p) * thickness` added to material.
- [ ] Per-element `thickness` attribute (H translucent, S waxy).
- [ ] Warm rim + cool fill light in `apply`.
- [ ] Register + add to `STYLE_LIST`.

---

## 2. Print / illustration

### Riso / halftone overprint — **M**
- [ ] Create `src/styles/riso.js`.
- [ ] Post-pass: split scene into 3 ink channels.
- [ ] For each ink, threshold against rotated halftone screen (Bayer or sine-grid), distinct angle per ink.
- [ ] Per-ink 1–2 px misregistration offset.
- [ ] Spot palette derived from atomic composition.
- [ ] Register + add to `STYLE_LIST`.

### Comic Ben-Day with action lines — **M**
- [ ] Create `src/styles/benday.js`.
- [ ] CMYK halftone dot post-pass scaled by luminance.
- [ ] Sobel outlines on depth + normal buffer.
- [ ] Track camera angular velocity; above threshold, draw radial speed lines from molecule centroid in screen space, alpha by velocity.
- [ ] Register + add to `STYLE_LIST`.

### Stained-glass / leaded — **M**
- [ ] Create `src/styles/stainedGlass.js`.
- [ ] Thicker inverted-hull lead lines (1.10–1.15 scale) — reuse toon's trick.
- [ ] Inside: flat element color with 1–2 `step()` bands of lighting.
- [ ] Optional animated caustic overlay through transmission layer.
- [ ] Register + add to `STYLE_LIST`.

### Sumi-e ink wash — **L**
- [ ] Create `src/styles/sumie.js`.
- [ ] Bond strokes: cylinder UV → bristle-shaped alpha mask, taper width along axis.
- [ ] Paper-grain background + multiply overlay across the scene.
- [ ] Post-pass silhouette dilation via curl-noise-displaced alpha sampling.
- [ ] 2–3 ink palette + paper.
- [ ] Register + add to `STYLE_LIST`.

### Stencil cutout — **S/M** ✅
- [x] Create `src/styles/stencil.js`.
- [x] Pure flat per-atom/bond/ring color (no lighting).
- [x] Draw each mesh twice: offset + tinted dark for shadow, then full color on top. *(via instanced shadow meshes premultiplied with a small world-space translation)*
- [ ] Palette: one shade per detected functional group.
- [x] Register + add to `STYLE_LIST`.

---

## 3. CRT / digital aesthetics

### Oscilloscope / vector display — **M**
- [ ] Create `src/styles/oscilloscope.js`.
- [ ] Render bonds as lines; atom spheres as low-res wireframe icosahedrons.
- [ ] Two ping-pong render targets; `target = prev * 0.92 + newDraw` for persistence.
- [ ] Post: scanlines (`sin(uv.y * h * PI)`), barrel distortion (radius² offset), slight chromatic aberration.
- [ ] Phosphor-green color theme.
- [ ] Register + add to `STYLE_LIST`.

### Pixel-art dither — **S** ✅
- [x] Create `src/styles/pixelDither.js`.
- [x] Render to low-res target (~256 wide). *(implemented as UV snap to a chunky-pixel grid in the post-pass — single composer pass, no separate low-res RT)*
- [x] Bayer 4×4 / 8×8 dither against a fixed palette in a fragment pass.
- [x] Upscale nearest-neighbor to canvas. *(implicit — the post-pass writes at full res with snapped UVs)*
- [ ] Fallback heuristic for very large molecules (skip or downgrade).
- [x] Register + add to `STYLE_LIST`.

### ASCII / terminal — **M**
- [ ] Create `src/styles/ascii.js`.
- [ ] Render scene to low-res luminance buffer.
- [ ] Glyph atlas (`' .:-=+*#%@'`); single shader pass maps luminance → atlas cell.
- [ ] Black background, monochrome green/amber tint.
- [ ] Register + add to `STYLE_LIST`.

### Glitch / databend — **S** (transition-only)
- [ ] Create `src/styles/glitch.js` — exposes a `crossfade(prevStyle, nextStyle, ms)` helper.
- [ ] Random horizontal row offsets sampled from noise.
- [ ] Per-row RGB channel shift; occasional 1-frame UV scramble.
- [ ] Wire into the arrow-key cycle so 300–600ms glitch plays during every style switch.
- [ ] Register + add to `STYLE_LIST` (so it can also run as a steady state if selected).

### Trading-card foil — **M**
- [ ] Create `src/styles/foil.js`.
- [ ] High-frequency normal-map noise modulating a specular highlight.
- [ ] Rainbow smear when `N·H` crosses thresholds.
- [ ] Sparkle density clamp for readability.
- [ ] Register + add to `STYLE_LIST`.

---

## 4. Living / animated

### Plasma sun — **M**
- [ ] Create `src/styles/plasma.js`.
- [ ] Fragment: sample 3D simplex noise at world-space position, advect with `uTime`.
- [ ] Red → orange → white-hot color ramp.
- [ ] Additive blending + bloom corona.
- [ ] Dark background in `apply`.
- [ ] Register + add to `STYLE_LIST`.

### Bioluminescence — **M**
- [ ] Create `src/styles/biolum.js`.
- [ ] Per-atom `phase` + `period` instance attributes; emit `sin(uTime/period + phase)` clamped to a soft pulse.
- [ ] Bonds inherit a fraction of endpoint emission.
- [ ] Small per-pulse noise so it doesn't tick like a metronome.
- [ ] Pitch-black scene background.
- [ ] Register + add to `STYLE_LIST`.

### Aurora ribbons — **L**
- [ ] Create `src/styles/aurora.js`.
- [ ] Generate billboarded strip mesh along each bond axis (rebuild in `onMoleculeChanged`).
- [ ] Vertex shader displaces along curl noise of `worldPos + uTime`.
- [ ] Fragment: aurora palette indexed by world-y; alpha falloff at strip edges.
- [ ] Trigger slow auto-rotate while active.
- [ ] Register + add to `STYLE_LIST`.

### Reaction-diffusion skin — **L/XL**
- [ ] Create `src/styles/rdSkin.js`.
- [ ] Two 256×256 ping-pong render targets holding `(u, v)` species.
- [ ] Per-frame Gray-Scott step with `feed`, `kill`, `Du`, `Dv` uniforms.
- [ ] Sample RD texture as atom diffuse via spherical UV.
- [ ] UI sliders for `feed`/`kill` (added/removed in `apply`/`dispose`).
- [ ] Register + add to `STYLE_LIST`.

### Stop-motion clay — **S/M**
- [ ] Create `src/styles/clay.js`.
- [ ] High-roughness clay material with subtle SSS.
- [ ] Low-freq noise normal perturbation, updated every ~3 frames only.
- [ ] Tiny per-frame atom position jitter.
- [ ] Register + add to `STYLE_LIST`.

---

## 5. Scientific / instrument

### SEM (scanning electron microscope) — **M**
- [ ] Create `src/styles/sem.js`.
- [ ] Grayscale Lambert + strong rim `pow(1 - N·V, 4)`.
- [ ] Post-pass scan sweep: brightness 1.05× band traveling top→bottom on ~3s loop.
- [ ] Faint scratched-glass texture + occasional vertical static lines.
- [ ] Register + add to `STYLE_LIST`.

### IR thermography — **M**
- [ ] Create `src/styles/thermal.js`.
- [ ] Pick temperature channel (atomic mass, formal charge, Voronoi distance from picked atom, or ring count).
- [ ] CPU-compute per-atom temperature once per molecule in `onMoleculeChanged`; push as instance attribute.
- [ ] Thermal palette texture lookup in fragment shader.
- [ ] Light bloom on hottest values.
- [ ] Register + add to `STYLE_LIST`.

### Topographic contours — **S/M**
- [ ] Create `src/styles/topographic.js`.
- [ ] Fragment: `d = distance(worldPos, reference)`; isolines via `smoothstep` on `fract(d * freq)` with `fwidth(d)` for AA.
- [ ] Reference = molecule centroid (default) or picked atom.
- [ ] Background plane matching isolines.
- [ ] Register + add to `STYLE_LIST`.

### True schlieren imaging — **M**
- [ ] Create `src/styles/schlieren.js`.
- [ ] Smooth horizontal-gradient background.
- [ ] Per-atom: screen-space normal-x at silhouette offsets background sample.
- [ ] Register + add to `STYLE_LIST`.

### NMR-style projection — **L**
- [ ] Create `src/styles/nmr.js`.
- [ ] Project all atoms onto XY plane.
- [ ] For each grid cell, sum a Gaussian per nearby atom.
- [ ] Render filled contour map.
- [ ] Optional: blend 3D model at low opacity on top.
- [ ] Register + add to `STYLE_LIST`.

---

## 6. Geometric / sculptural

### Origami / faceted — **S** ✅
- [x] Create `src/styles/origami.js`.
- [x] Quantize normals: `N = normalize(round(N * k) / k)`, k ≈ 6.
- [x] Flat (per-face) shading. *(derived from `cross(dFdx, dFdy)` of view-space position)*
- [ ] Paper-fiber multiply overlay.
- [x] Register + add to `STYLE_LIST`.

### Liquid mercury — **M**
- [ ] Create `src/styles/mercury.js`.
- [ ] Matcap material + chrome/mercury matcap texture.
- [ ] Animated tangent-space flowmap advected with `uTime` perturbs matcap UV sample.
- [ ] High specular, minimal diffuse.
- [ ] Register + add to `STYLE_LIST`.

### Negative space — **M**
- [ ] Create `src/styles/negative.js`.
- [ ] Stencil-write molecule to mask textured background — molecule cuts holes.
- [ ] Background: halftone / gradient / scene render-target.
- [ ] Optional faint silhouette glow at cutout edges.
- [ ] Register + add to `STYLE_LIST`.

### Voxelized — **M**
- [ ] Create `src/styles/voxel.js`.
- [ ] Sample "inside any atom or bond" implicit function on a grid (default 64³) in `onMoleculeChanged`.
- [ ] Emit instanced cubes per occupied cell, colored by owning atom.
- [ ] UI slider for voxel size.
- [ ] Register + add to `STYLE_LIST`.

---

## 7. Post-process / cross-style (toggles, not full styles)

These do **not** get their own arrow-key slot — they're modifiers on top of any base style.

### Selective bloom — **S** ✅
- [x] Create `src/styles/selectiveBloom.js`. *(lives at top level, not under postprocess/, since for now it's a full style in the cycle)*
- [x] Stencil mask render of the bloom subset (halogens or hovered functional group). *(in-shader: per-fragment halogen detection by instance-color match → bright color, otherwise muted; UnrealBloom catches the brightness)*
- [x] Reuse existing `UnrealBloomPass`; composite back.
- [ ] Expose toggle (keyboard or UI) independent of the up/down arrow style cycle. *(deferred — currently reachable through the style cycle as 'Halogen glow')*

### Depth of field with bokeh — **M**
- [ ] Create `src/styles/postprocess/dof.js`.
- [ ] Depth-aware Gaussian or hexagonal-kernel bokeh.
- [ ] Focal-plane slider mapped 0–1 to molecule depth extent.
- [ ] Configurable aperture shape / blade count.

### Motion blur — **S/M**
- [ ] Create `src/styles/postprocess/motionBlur.js`.
- [ ] Velocity buffer storing screen-space per-pixel delta between frames.
- [ ] Post-pass smear samples along velocity vector.
- [ ] Engages only above angular-velocity threshold.

### Style-blend slider — **M**
- [ ] Create `src/styles/postprocess/blend.js`.
- [ ] Render two styles to two targets; composite `mix(a, b, slider)`.
- [ ] Slider UI for picking two `STYLE_LIST` entries + blend amount.

### Outline-only overlay — **S** ✅
- [x] Create `src/styles/outline.js`. *(lives at top level, not under postprocess/, since for now it's a full style in the cycle)*
- [x] Sobel on depth + normal buffers; configurable thickness & color. *(implemented using Three's built-in `OutlinePass` — selectedObjects updated in `onMoleculeChanged`)*
- [ ] Replace inverted-hull outlines in toon/blueprint if quality matches. *(deferred — needs a side-by-side comparison first)*

### SSAO — **S/M**
- [ ] Create `src/styles/postprocess/ssao.js`.
- [ ] Wrap Three's `SSAOPass`.
- [ ] Tune radius to average bond length so AO sits under bonds.
