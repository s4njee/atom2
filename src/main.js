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
