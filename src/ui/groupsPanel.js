import { GROUP_COLORS } from '../chem/functionalGroups.js';

const GROUP_LABELS = {
  amide: 'Amide',
  ester: 'Ester',
  carboxyl: 'Carboxylic acid',
  carbonyl: 'Carbonyl',
  hydroxyl: 'Hydroxyl',
  ether: 'Ether',
  amine: 'Amine',
  imine: 'Imine',
  halide: 'Halide',
  nitrile: 'Nitrile',
  nitro: 'Nitro',
  thiol: 'Thiol',
  alkene: 'Alkene',
  alkyne: 'Alkyne',
  phosphate: 'Phosphate',
  sulfonyl: 'Sulfonyl',
};

// Display order: keep the same priority as the detector so the panel is stable.
const DISPLAY_ORDER = [
  'amide', 'carboxyl', 'ester', 'carbonyl',
  'hydroxyl', 'ether', 'amine', 'imine',
  'nitrile', 'nitro', 'sulfonyl', 'phosphate',
  'thiol', 'halide', 'alkene', 'alkyne',
];

export function createGroupsPanel(container, { onFocusChange }) {
  container.innerHTML = '';
  container.classList.add('groups-panel');

  const header = document.createElement('div');
  header.className = 'groups-panel-header';

  const title = document.createElement('h3');
  title.className = 'sidebar-heading';
  title.textContent = 'Functional groups';
  header.appendChild(title);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'groups-panel-clear';
  clearBtn.textContent = 'Show all';
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('click', () => setFocus(null));
  header.appendChild(clearBtn);

  container.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'sidebar-list groups-list';
  container.appendChild(list);

  const empty = document.createElement('div');
  empty.className = 'groups-panel-empty';
  empty.textContent = 'No molecule loaded.';
  container.appendChild(empty);

  let currentInstances = [];
  let hasMolecule = false;
  let focusedGroup = null;

  function setFocus(group) {
    if (focusedGroup === group) return;
    focusedGroup = group;
    clearBtn.style.display = group ? '' : 'none';
    render();
    onFocusChange?.(focusedGroup);
  }

  function render() {
    list.innerHTML = '';
    if (currentInstances.length === 0) {
      empty.style.display = '';
      empty.textContent = hasMolecule ? 'No functional groups detected.' : 'No molecule loaded.';
      return;
    }
    empty.style.display = 'none';

    const counts = new Map();
    for (const inst of currentInstances) {
      counts.set(inst.group, (counts.get(inst.group) || 0) + 1);
    }

    const groups = DISPLAY_ORDER.filter((g) => counts.has(g));
    for (const g of groups) {
      const li = document.createElement('li');
      li.className = 'groups-item';
      if (focusedGroup === g) li.classList.add('is-focused');

      const swatch = document.createElement('span');
      swatch.className = 'groups-swatch';
      swatch.style.background = GROUP_COLORS[g] || '#888';
      li.appendChild(swatch);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'groups-item-name';
      btn.textContent = GROUP_LABELS[g] || g;
      btn.addEventListener('click', () => setFocus(focusedGroup === g ? null : g));
      li.appendChild(btn);

      const count = document.createElement('span');
      count.className = 'groups-count';
      count.textContent = String(counts.get(g));
      li.appendChild(count);

      list.appendChild(li);
    }
  }

  function setInstances(instances) {
    currentInstances = instances || [];
    hasMolecule = true;
    if (focusedGroup && !currentInstances.some((i) => i.group === focusedGroup)) {
      focusedGroup = null;
      clearBtn.style.display = 'none';
      onFocusChange?.(null);
    }
    render();
  }

  function clear() {
    currentInstances = [];
    hasMolecule = false;
    focusedGroup = null;
    clearBtn.style.display = 'none';
    render();
  }

  render();

  return { setInstances, clear, getFocus: () => focusedGroup };
}
