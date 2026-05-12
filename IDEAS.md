# IDEAS — making atom2 more dynamic and interactive

A catalog of features that would push atom2 from "static stylized viewer" toward something playful, exploratory, and physically alive. Organized roughly by effort, with cheap wins first.

---

## 1. Motion & life in the scene

Tiny ambient motion makes a 3D viewer feel alive even when the user isn't touching it.

- **Idle auto-rotate.** After ~3s of no input, slowly rotate the molecule on its long axis. Cancels on any pointer interaction. Tunable in a settings panel.
- **Subtle thermal jitter.** Each atom oscillates around its rest position with a small per-atom random phase (Perlin noise on position, amplitude ~0.02 Å). Bonds follow. Sells the idea that real molecules vibrate. Toggleable; off by default.
- **Bond stretch animation.** When jitter is on, scale bond cylinders along their axis to track the moving atoms (recompute per frame in a vertex shader for cheap GPU update).
- **Breathing aromatic rings.** The aromatic torus pulses its emissive intensity at ~1 Hz — communicates delocalization at a glance.
- **Entry animation.** New molecules fade/scale in from the centroid outward over ~400ms instead of popping into place. Atoms first, then bonds, then ring annotations.
- **Style transition crossfade.** When switching styles, crossfade material properties over ~300ms instead of swapping instantly. Particularly noticeable when going between toon ↔ crystal.

## 2. Atom & bond interaction

The current tooltip shows element info. Click-to-pin and selection unlock a lot.

- **Click-to-pin atom info.** Pin a tooltip card next to the canvas with element, atomic number, partial charge (if available), bonded neighbors, hybridization guess. Multiple pins allowed.
- **Click two atoms → measure distance.** Persistent ruler line between selected atoms with a numeric label. Click three → angle. Four → dihedral. This generalizes the existing functional-group-scoped measurements to anything the user is curious about.
- **Highlight neighborhood.** Hover an atom: bonded atoms remain at full brightness, everything else fades to ~30% opacity. Hold Shift to extend N bonds out. Makes large molecules legible.
- **Bond hover.** Hover a bond → show order, length, and whether it's part of a detected ring or functional group.
- **Right-click context menu** on an atom: "center camera here," "select this atom's ring," "select this functional group," "copy SMILES of fragment."

## 3. Functional groups as first-class citizens

The detector is already there; expose it more.

- **Functional-group legend panel** that lists every detected group with a count and a color swatch. Clicking an entry isolates that group (others fade out).
- **"Highlight only" mode.** A toggle that desaturates the whole molecule and color-pulses only the selected group type.
- **Group hover from list → camera flies to that group.** Smooth orbit + zoom to frame just that atom set.
- **Per-group toggles in the existing measurement bar.** Instead of a single "lengths" toggle, expand to "lengths: amide / ester / alcohol / ..." chips so the user can layer information.

## 4. Comparison & multi-molecule

Right now the viewer holds one molecule.

- **Split view.** Two canvases side-by-side, linked cameras (rotate one, both rotate). Great for "what's the difference between caffeine and theobromine."
- **Style A/B preview.** Drag a divider across the canvas to render the same molecule in two styles split-screen. Hint: a single scene with a stencil/scissor split is cheaper than two renderers.
- **Overlay mode.** Two molecules aligned at a common atom, one rendered semi-transparent. Useful for stereoisomer comparison.
- **History scrubber.** Timeline along the bottom showing the last N viewed molecules as thumbnails; click to revisit, drag to reorder favorites.

## 5. Search & discovery upgrades

The search bar is single-purpose. Browsing is where stickiness comes from.

- **Curated collections** in the sidebar: "Common drugs," "Amino acids," "Sugars," "Solvents," "Famous molecules" — pre-seeded CID lists. One click to jump in.
- **"Random molecule" button.** Pulls from a CID range or a curated list. Surprise discovery.
- **Related compounds.** PubChem has a similarity endpoint; show "similar to this" thumbnails under the loaded molecule.
- **Inline name on the canvas.** A subtle bottom-left card with the molecule's name, formula, molecular weight, and InChIKey. Pulls from PubChem's properties endpoint.
- **Recent-as-carousel.** Replace the sidebar recents list with a horizontal thumbnail strip across the top (rendered offscreen at low res and cached).

## 6. Atom labels & overlays

The CPK color convention only carries you so far.

- **Element-symbol labels** rendered as billboarded text on each atom. Toggle on/off. Three modes: off / hetero only (skip C and H) / all.
- **Hydrogen toggle.** Show all H / show only polar H / hide all H. Pretty much standard in chem viewers; surprisingly transformative for visual clarity.
- **Partial-charge heatmap.** A style overlay where atom color is mapped to a red↔blue gradient by formal/partial charge. Requires a property fetch; could be its own "style profile."
- **Electrostatic surface approximation.** A translucent isosurface shell colored by approximate charge distribution. Heavy lift — likely a v2 feature — but visually striking.

## 7. New visual styles & post-processing

The style system is built for extension; let's lean on it.

- **Hand-drawn / sketch style.** Edge-detection post-pass + cross-hatching shader. Pairs well with a paper-grain background.
- **Schlieren / wireframe-only.** Just bonds, no atom spheres. Great for very large molecules.
- **Heatmap style.** Color atoms by distance from molecular centroid, or by surface accessibility, or by ring membership.
- **CPK photoreal.** A "boring but accurate" baseline style — PBR materials, soft GI, no stylization. Useful reference and a nice contrast to the artistic styles.
- **Depth-of-field control.** A slider that shifts the focal plane through the molecule for cinematic shots.
- **Screenshot mode.** Hide all UI, render at 2× DPR, copy PNG to clipboard. Bonus: render at 4× and trigger a download.

## 8. Physics & simulation

This is where it gets really fun.

- **Click and drag an atom** to pull it; bonds act as springs, the rest of the molecule relaxes in real time. Simple force-field (harmonic bonds + repulsion) is enough — no need for real chemistry.
- **"Shake" button** that perturbs every atom and watches the spring network settle back. Cathartic and informative.
- **Bond breaking.** Drag two atoms far enough apart and the bond visually snaps. Reset button restores.
- **Rotatable single bonds.** Detect rotatable bonds (single, non-ring), and let the user drag a circular handle around the bond axis to rotate the dihedral. Real-time conformer exploration.
- **Energy bar.** A bar at the top that goes red as the user distorts the molecule from its loaded conformation. Visceral feedback for "you've gone too far."

## 9. Audio (used sparingly)

Audio that maps to structure can be delightful if it's tasteful and off by default.

- **Soft chime on atom click**, pitched by atomic number (so C is consistent, H is high, heavy atoms low).
- **Hover whoosh.** A barely-audible filtered noise sweep when sweeping the camera fast.
- **Loading "settling" sound.** When the entry animation plays, a brief reverberant tone.

Keep all audio behind a single mute toggle that defaults to off and persists in localStorage.

## 10. Sharing & export

The URL already encodes cid+style. Push further.

- **Camera state in the URL.** Encode camera position/target/zoom so a shared link reproduces the exact framing the sender saw.
- **Animated GIF / WebM export.** "Record 3 seconds" button that spins the molecule and captures frames to a video. Big crowd-pleaser for social sharing.
- **PNG with metadata.** When exporting a screenshot, embed the CID + style + camera state in the PNG metadata so the file is "openable" back into the app via drag-and-drop.
- **OpenGraph card.** Server-generated would need a backend (out of scope per requirements.md), but a static fallback OG image + JSON-LD with the molecule name still helps Discord/Slack/Twitter previews.

## 11. Mobile & input

Requirements say mobile is not optimized, but a few cheap wins go a long way.

- **Two-finger rotate, pinch zoom** with `OrbitControls` mobile defaults verified.
- **Tap-and-hold for tooltip** (mobile lacks hover, so the atom info is currently invisible on touch devices).
- **Gyroscope orbit mode.** Tilt the phone, the molecule orbits. Toggle in settings. Fun, not essential.
- **Keyboard shortcuts** on desktop: `1-4` switches style, `R` resets camera, `Space` toggles auto-rotate, `H` toggles hydrogens, `?` opens a shortcut cheatsheet.

## 12. Learning mode

Atom2 is implicitly educational; make that explicit for users who want it.

- **Guided tour.** First-load overlay that walks through: "this is the search bar… try aspirin… now switch to crystal style… hover an atom…" Dismissable, never reappears.
- **"Explain this molecule" card.** A side panel with name, IUPAC name, common use, and a one-paragraph description pulled from PubChem's description endpoint (CID → record description).
- **Quiz mode.** Show a molecule with element labels hidden; ask the user to identify functional groups they can see. Useful for chem students.

---

## Suggested ordering (cheap → ambitious)

| Effort | Pick |
| --- | --- |
| **S** | Idle auto-rotate, keyboard shortcuts, click-to-pin tooltip, hydrogen toggle, element labels, camera-in-URL, entry animation, screenshot mode |
| **M** | Click-to-measure distances/angles/dihedrals, functional-group legend panel, neighborhood highlight, random molecule + curated collections, sketch/CPK-photoreal styles, GIF export |
| **L** | Split-view & overlay comparison, drag-atom spring physics, rotatable dihedrals, partial-charge heatmap, learning/quiz mode |
| **XL** | Electrostatic isosurface, full force-field relaxation |

A natural next sprint: idle auto-rotate + entry animation + click-to-pin + keyboard shortcuts + hydrogen toggle. All small, all immediately felt, all stack into a much more alive product.
