# SHADERS — style ideas to explore

A catalog of visual styles beyond the existing four ([xray](src/styles/xray.js), [crystal](src/styles/crystal.js), [toon](src/styles/toon.js), [blueprint](src/styles/blueprint.js)). Each entry includes the aesthetic, the core technique, and notes on how it maps onto atom spheres, bond cylinders, and aromatic ring tori.

The style contract is documented at [profile.js](src/styles/profile.js): each entry is an `{ id, name, apply, dispose, onMoleculeChanged }` registered in [registry.js](src/styles/registry.js).

Grouped by visual family. Effort tags: **S** (a few hours), **M** (a day), **L** (multi-day, may need new infra), **XL** (research project).

---

## 1. Optical / physical

Styles that lean on real or quasi-real light transport.

### Soap-bubble iridescence — **S/M**
Thin-film interference: surface color shifts through a wavelength-dependent rainbow based on view angle and a per-atom thickness term.

- Fragment math: compute `cosI = dot(N, V)`, derive optical path `2 * thickness * n * cosI`, convert path length into RGB via a precomputed wavelength → RGB ramp (or three cosines at 650/550/450 nm).
- Per-atom `thickness` uniform (or instance attribute) so different elements show different bands.
- Pairs well with a soft bloom and a dark background.
- Risk: gets noisy on tight curvature; clamp thickness range.

### True refraction (gemstone) — **M**
Each atom acts as a real lens — back of the molecule warps through the front spheres.

- Use `MeshPhysicalMaterial` with `transmission: 1`, `ior: ~1.7`, `thickness > 0`, `roughness` small.
- Needs an environment / scene render target so refraction has something to bend. Render molecule once opaque to an offscreen target, then sample it for transmission.
- Distinct from crystal because the molecule self-refracts.
- Watch perf: transmission is multi-pass; consider lower DPR while in this style.

### Parallax geode interior — **M**
Atom surface is opaque, but inside each sphere a parallax-mapped cubemap fakes a glittering mineral cavity.

- Fragment shader: from view direction and surface normal, march a few steps "inward" through a cubemap of mineral patterns; tint by element color.
- Steps 4–8 is enough; this is fake volumetric, not raymarched volume.
- Procedurally generate the cubemap once with a noise + Voronoi shader.

### Caustics & god-rays — **M/L**
Underwater / cathedral mood — caustic pattern across surfaces plus volumetric beams from a key light.

- Cubemap-projected Voronoi pattern for caustics (sample tri-planar in fragment shader, advect with `uTime`).
- God-rays as a post-pass: radial blur from light position in screen space, masked by an occluder pass.
- Background should be a slow-moving gradient.

### Velvet / Minnaert — **S**
Soft suede — inverse fresnel rim brightening, calm and matte.

- BRDF: `(N·L * N·V)^(k-1) * N·L`, k around 1.5–2.
- Or simpler: `color * pow(1.0 - N·V, k)` added on top of a low diffuse term.
- Cheapest fresnel-driven style; good "rest" mode between the louder ones.

### Subsurface scattering (wax / jade) — **M**
Light visibly bleeds through atoms, especially at thin silhouettes.

- Approximate SSS: extra "back-light" term `pow(saturate(dot(V, -L)), p) * thickness`.
- Per-element `thickness` lets H read translucent, S read waxy.
- Looks fantastic with a warm rim and cool fill light.

---

## 2. Print / illustration

Styles that look like they came off a press or out of a sketchbook.

### Riso / halftone overprint — **M**
Posterize to 3 spot colors, render each through a screen-door dot pattern at a different angle, slight per-channel registration offset.

- Post-pass: split scene into 3 luminance channels (or use 3 fixed inks).
- For each ink, threshold against a rotated halftone screen (Bayer or sine-grid).
- Offset each ink by 1–2 px for misregistration.
- Spot-color palette per molecule (could pick from atomic compositions).

### Comic Ben-Day with action lines — **M**
CMYK halftone dots scaled by luminance, plus speed lines that emerge only during rotation.

- Halftone as above but in CMYK.
- Action lines: in a post-pass, sample camera angular velocity; if above threshold, draw radial streaks emanating from the molecule centroid in screen space, alpha by velocity.
- Outlines via Sobel on the depth/normal buffer.

### Stained-glass / leaded — **M**
Flat element-colored regions, thick black silhouette "lead", translucent inner fill with faint internal caustics.

- Reuse toon's inverted-hull trick for the lead lines but make them thicker (1.10–1.15 scale).
- Inside, flat element-color with `step()`-quantized lighting (1 or 2 bands).
- Optional: animated caustic overlay through a transmission layer for the "light through glass" feel.

### Sumi-e ink wash — **L**
Watercolor / brush aesthetic.

- Bonds as tapered brush strokes: cylinder UV → alpha mask shaped like a strokes-with-bristles texture; modulate width along axis.
- Paper-grain texture as background and as a multiply layer on the whole scene.
- Watercolor bleed at silhouettes: in a post-pass, dilate the alpha by curl-noise-displaced sampling so edges feather irregularly.
- Limit palette to 2–3 sumi inks plus paper.

### Stencil cutout — **S/M**
Construction-paper aesthetic — flat colors layered with subtle drop shadows.

- Material: pure flat color per atom/bond/ring (no lighting).
- Shadow: render each mesh twice — once offset by a small screen-space delta and tinted dark, then on top in full color.
- Group palette: one shade per detected functional group.

---

## 3. CRT / digital aesthetics

Styles that lean into the screen as a medium.

### Oscilloscope / vector display — **M**
Phosphor green, wireframe only, persistent afterimage via render-target feedback.

- Render geometry as line primitives (bonds: lines; atom spheres: low-res wireframe icosahedrons).
- Two render targets, ping-pong: each frame `target = (prevTarget * 0.92) + newDraw`, then composite.
- Post: CRT scanlines (`sin(uv.y * h * PI)`), barrel distortion (offset uv by radius² term), slight chromatic aberration.
- Strong candidate for "feels alive" because of the persistence.

### Pixel-art dither — **S**
Quantized retro look.

- Render the whole scene to a low-res target (e.g. 256-wide), quantize each fragment to a fixed palette using Bayer 4×4 or 8×8 dither, upscale nearest-neighbor to canvas size.
- Bonds become chunky pixels — endearing on simple molecules, fragmented on large ones (consider a fallback).

### ASCII / terminal — **M**
Each "pixel" is a glyph picked by luminance.

- Render scene → low-res luminance buffer.
- For each cell, look up a glyph from `' .:-=+*#%@'` based on luminance.
- Draw glyphs as instanced billboards on a quad grid, or use a glyph atlas in a single shader pass.
- Black background, monochrome green or amber.
- Pure stylization, very memorable for a screenshot.

### Glitch / databend — **S** (style transition)
Best used during style switches rather than as a steady state.

- Random horizontal row offsets sampled from a noise function.
- RGB channel shift on certain rows.
- Occasional UV scrambles for ~1 frame.
- Drives `crossfade` between two styles over 300–600ms.

### Trading-card foil — **M**
Hologram glitter — angular micro-facet sparkle that shifts with view direction.

- High-frequency normal-map noise (sub-pixel) modulates a specular highlight that smears into rainbow when `N·H` crosses thresholds.
- Limit sparkle density so it stays readable.
- Pairs perfectly with screenshot mode.

---

## 4. Living / animated

Styles where `uTime` is doing real work.

### Plasma sun — **M**
Atoms emit like mini stars: 3D simplex noise in world space drives a hot/cool gradient, surface slowly bubbles.

- Fragment shader: sample 3D simplex noise at world-space position, advect with `uTime`.
- Color ramp: deep red → orange → white-hot at high values.
- Additive blending + bloom for the corona.
- Best on dark background.

### Bioluminescence — **M**
Pitch-black scene; each atom emits soft animated cyan/green bursts.

- Per-atom `phase` and `period` uniforms (instance attributes), emit at `sin(uTime/period + phase)` clamped to a soft pulse.
- Bonds pick up a fraction of their endpoint atoms' current emission, so they shimmer in time.
- Slight noise on each pulse so it doesn't look like a metronome.

### Aurora ribbons — **L**
Curl-noise-advected emissive ribbons draped along bonds.

- Generate a strip mesh along each bond axis, perpendicular to view (billboarded).
- Vertex shader displaces along curl noise sampled at world position + `uTime`.
- Fragment: cycle through aurora palette by world-y; alpha-falloff at strip edges.
- Best on slow auto-rotate.

### Reaction-diffusion skin — **L/XL**
A Gray-Scott simulation runs in a render texture, mapped to atom surfaces — animated Turing patterns spread across the molecule like bacteria.

- Two ping-pong RTs at 256×256 holding (u, v) species concentrations.
- Each frame: run RD step (`feed`, `kill`, `Du`, `Dv` uniforms).
- Sample resulting texture as the diffuse map for atoms in spherical UV.
- Tunable feed/kill from UI gives wildly different patterns (spots, stripes, mitosis).

### Stop-motion clay — **S/M**
Adds an organic, hand-shaped wobble.

- Matte clay material (high roughness, subtle SSS).
- Per-frame normal perturbation from low-frequency noise; but only update the perturbation **every ~3 frames** to mimic stop-motion's discrete cadence.
- Slight per-frame jitter in atom positions (very small) to sell the "clay was re-placed by hand."

---

## 5. Scientific / instrument

Styles that look like data from real lab instruments.

### SEM (scanning electron microscope) — **M**
Monochrome grayscale, exaggerated rim, scan-line sweep, dust/scratches overlay.

- Material: grayscale Lambert + strong rim term (`pow(1 - N·V, 4)`).
- Scan sweep: in post, a horizontal band of brightness 1.05× sweeps top→bottom over ~3s, then loops.
- Overlay a faint scratched-glass texture and occasional vertical static lines.

### IR thermography — **M**
False-color blue → cyan → yellow → red → white, mapped to a "temperature" channel.

- Choose a channel: atomic mass, formal charge, Voronoi distance from a picked atom, ring membership count.
- Compute per-atom temperature on CPU once per molecule, push as instance attribute.
- Fragment looks up a thermal palette texture.
- Slight bloom on the hottest values.

### Topographic contours — **S/M**
Iso-distance bands from the centroid (or a picked atom) drawn directly in the fragment shader.

- For each fragment, compute `d = distance(worldPos, reference)`.
- Draw isolines via `smoothstep` against `fract(d * frequency) > threshold`; use `fwidth(d)` to keep lines anti-aliased.
- Background plane gets matching isolines so the contour theme is unified.

### True schlieren imaging — **M**
Index-of-refraction shimmer around silhouettes against a gradient background.

- Background: smooth horizontal gradient.
- Per-atom: compute screen-space normal-x at silhouette, offset background sample by that delta — reads as light bending around mass.
- Reads like a wind-tunnel photo. Calm, scientific.

### NMR-style projection — **L**
Inspired by 2D NMR plots — render the molecule as projected blobs on a grid with contour rings.

- Project all atoms onto the XY plane.
- For each grid cell, sum a Gaussian per nearby atom.
- Render filled contours.
- Pure 2D output, but you can blend the 3D model on top at low opacity.

---

## 6. Geometric / sculptural

Styles that change the *shape* read, not just the surface.

### Origami / faceted — **S**
Hard creases, paper aesthetic.

- Quantize normals: `N = normalize(round(N * k) / k)` where k ≈ 6, so normals snap to a small set of directions.
- Flat shading (per-face normals).
- Paper-fiber texture as a multiply overlay.

### Liquid mercury — **M**
Just-settled molten droplets.

- Matcap material with a chrome/mercury matcap texture.
- Animated tangent-space flow: perturb the matcap UV sample by a low-amplitude flowmap that advects with `uTime`.
- High specular, minimal diffuse.

### Negative space — **M**
You perceive the structure by absence.

- Render the molecule as a stencil that *cuts holes* out of a textured background.
- Background could be a halftone pattern, a gradient, or a render of "what would have been there."
- Optional: faint silhouette glow at the cutout edges.

### Voxelized — **M**
Quantize the molecule onto a 3D grid; render as cubes.

- Sample the implicit "is-inside-any-atom-or-bond" function on a grid (say 64³).
- Emit instanced cubes for occupied cells, colored by which atom owns each cell.
- Tunable voxel size from chunky Minecraft to fine sand.

---

## 7. Post-process / cross-style

These work as toggles on top of any base style rather than as their own profiles.

### Selective bloom — **S**
Only halogens (or only the currently hovered functional group) bloom.

- Stencil mask: render the "blooming subset" to a separate target, run the existing `UnrealBloomPass` on it, composite back.
- Reuses the bloom infrastructure already in [xray.js](src/styles/xray.js).

### Depth of field with bokeh — **M**
Already noted in [IDEAS.md:73](IDEAS.md:73); worth shader-implementing properly.

- Depth-aware Gaussian or hexagonal-kernel bokeh.
- UI: focal-plane slider that maps 0–1 to the molecule's depth extent.
- Bokeh kernel parameters: aperture shape, blade count.

### Motion blur — **S/M**
Kicks in only when angular velocity exceeds a threshold.

- Velocity buffer: store screen-space delta between frames in a target.
- Smear samples along the velocity vector in a post-pass.
- Threshold prevents jitter blur during stillness.

### Style-blend slider — **M**
Drag a slider to fade between any two styles in real time.

- Two scenes / two render targets, one per style.
- Composite: `mix(a, b, slider)`.
- Different from a transition because it's a steady state — useful for picking favorites.

### Outline-only overlay — **S**
A toggle that adds a contour outline (Sobel on depth + normal buffers) on top of any style.

- Reusable across styles.
- Could replace the inverted-hull outlines in toon/blueprint with a unified post-process.

### SSAO — **S/M**
Adds depth cues to flat styles (toon, stencil, riso).

- Three's `SSAOPass` is a drop-in.
- Tune radius to the average bond length so the ambient occlusion sits "under" the bonds nicely.

---

## Suggested ordering

| Effort | Picks |
| --- | --- |
| **S** | Velvet/Minnaert, Pixel-art dither, Origami, Stencil cutout, Selective bloom, Outline overlay |
| **M** | Soap-bubble iridescence, Riso halftone, Oscilloscope, Plasma sun, SEM, IR thermography, Trading-card foil, Mercury matcap, Style-blend slider |
| **L** | True refraction, Sumi-e ink wash, Aurora ribbons, NMR projection, Voxelized |
| **XL** | Reaction-diffusion skin, Caustics + god-rays |

## Two to build first

For maximum bang per shader-line:

1. **Soap-bubble iridescence** — instantly understood, completely different from the existing four, and the math fits in ~30 lines of fragment shader.
2. **Oscilloscope vector display** — the persistence feedback gives the viewer a quality the current four lack: *time*. Pairs naturally with the entry animation and auto-rotate ideas in [IDEAS.md](IDEAS.md).

A natural exploration sprint: iridescence + oscilloscope + velvet + pixel-art dither. Four very distinct moods, all small-to-medium, and together they roughly double the stylistic range of the app.
