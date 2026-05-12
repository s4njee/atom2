import * as THREE from 'three';
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
import { createAtomTooltip } from './ui/atomTooltip.js';
import { createMeasurementToggles } from './ui/measurementToggles.js';
import { createGroupsPanel } from './ui/groupsPanel.js';
import { buildLengthLabels, buildAngleArcs, disposeMeasurementGroup } from './scene/measurements.js';
import { applyGroupColors } from './scene/groupColors.js';
import { detectFunctionalGroups } from './chem/functionalGroups.js';
import { createStore } from './state/store.js';
import { readURLState, writeURLState } from './state/url.js';
import { addRecent } from './state/storage.js';

export function startApp() {
  const canvasContainer = document.getElementById('canvas-container');
  const viewer = createViewer(canvasContainer);
  viewer.start();

  const client = createPubChemClient();
  const status = createStatusBar(document.getElementById('status'));
  const tooltip = createAtomTooltip(canvasContainer);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  canvasContainer.addEventListener('mousemove', (e) => {
    const meshes = store.get().meshes;
    const molecule = store.get().molecule;
    if (!meshes?.atoms || !molecule) { tooltip.hide(); return; }

    const rect = canvasContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ndc.x = (x / rect.width) * 2 - 1;
    ndc.y = -(y / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndc, viewer.camera);
    const hits = raycaster.intersectObject(meshes.atoms, false);
    if (hits.length > 0 && hits[0].instanceId != null) {
      const atom = molecule.atoms[hits[0].instanceId];
      if (atom) { tooltip.show(atom, x, y); return; }
    }
    tooltip.hide();
  });

  canvasContainer.addEventListener('mouseleave', () => tooltip.hide());
  const initial = readURLState();
  const store = createStore({
    molecule: null,
    meshes: null,
    style: initial.style ?? 'blueprint',
  });

  let activeStyle = getStyle(store.get().style);
  activeStyle.apply(viewer, null);

  const styleSelector = createStyleSelector(document.getElementById('style-container'), {
    initial: store.get().style,
    onChange: (id) => switchStyle(id),
  });

  const sidebar = createSidebar(document.getElementById('sidebar-lists'), {
    onPick: (entry) => loadCID(entry.cid, entry.name),
  });

  let measureState = { lengths: false, angles: false };
  let focusedGroup = null;
  let lengthsGroup = null;
  let anglesGroup = null;

  const groupsPanel = createGroupsPanel(document.getElementById('groups-container'), {
    onFocusChange: (g) => {
      focusedGroup = g;
      const { molecule, meshes } = store.get();
      if (molecule && meshes) {
        const detected = detectFunctionalGroups(molecule, molecule.aromaticRings);
        applyGroupColors(meshes, molecule, detected.instances, focusedGroup);
      }
      refreshMeasurements();
    },
  });

  function clearMeasurements() {
    if (lengthsGroup) { viewer.scene.remove(lengthsGroup); disposeMeasurementGroup(lengthsGroup); lengthsGroup = null; }
    if (anglesGroup) { viewer.scene.remove(anglesGroup); disposeMeasurementGroup(anglesGroup); anglesGroup = null; }
  }

  function refreshMeasurements() {
    clearMeasurements();
    const molecule = store.get().molecule;
    if (!molecule) return;
    const groups = detectFunctionalGroups(molecule, molecule.aromaticRings);
    const filter = focusedGroup
      ? (item) => item.group === focusedGroup
      : () => true;
    // When a group is focused, show both its lengths and angles regardless of topbar toggles.
    const showLengths = focusedGroup ? true : measureState.lengths;
    const showAngles = focusedGroup ? true : measureState.angles;
    const lengthItems = groups.lengths.filter(filter);
    const angleItems = groups.angles.filter(filter);
    if (showLengths && lengthItems.length > 0) {
      lengthsGroup = buildLengthLabels(molecule, lengthItems);
      viewer.scene.add(lengthsGroup);
    }
    if (showAngles && angleItems.length > 0) {
      anglesGroup = buildAngleArcs(molecule, angleItems);
      viewer.scene.add(anglesGroup);
    }
  }

  createMeasurementToggles(document.getElementById('measurements-container'), {
    onChange: (s) => { measureState = s; refreshMeasurements(); },
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
      const detected = detectFunctionalGroups(data, data.aromaticRings);
      applyGroupColors(meshes, data, detected.instances, focusedGroup);
      groupsPanel.setInstances(detected.instances);
      refreshMeasurements();
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
