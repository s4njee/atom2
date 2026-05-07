import * as THREE from 'three';

const LABEL_COLOR = '#ffffff';
const LABEL_BG = 'rgba(20, 24, 32, 0.85)';
const LABEL_BORDER = 'rgba(120, 145, 180, 0.6)';
const LENGTH_LABEL_HEIGHT = 0.32;     // world-units tall
const ANGLE_LABEL_HEIGHT = 0.28;
const ARC_COLOR = 0x79c0ff;
const ARC_RADIUS = 0.45;
const ARC_SEGMENTS = 24;

function makeLabel(text, worldHeight) {
  const dpr = 2;
  const fontPx = 32 * dpr;
  const padX = 12 * dpr;
  const padY = 6 * dpr;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + padX * 2;
  canvas.height = fontPx + padY * 2;
  // Re-set font (canvas reset on resize)
  ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = LABEL_BG;
  ctx.strokeStyle = LABEL_BORDER;
  ctx.lineWidth = 1 * dpr;
  roundedRect(ctx, 0.5, 0.5, canvas.width - 1, canvas.height - 1, 6 * dpr);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = LABEL_COLOR;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function buildBondLengths(molecule) {
  const group = new THREE.Group();
  group.name = 'bond-lengths';
  const { atoms, bonds } = molecule;
  for (const b of bonds) {
    const a = atoms[b.a].position;
    const c = atoms[b.b].position;
    const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    const label = makeLabel(`${len.toFixed(2)} Å`, LENGTH_LABEL_HEIGHT);
    label.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
    group.add(label);
  }
  return group;
}

export function buildBondAngles(molecule) {
  const group = new THREE.Group();
  group.name = 'bond-angles';
  const { atoms, bonds } = molecule;

  // Build adjacency: for each atom, list of neighbor indices
  const neighbors = atoms.map(() => []);
  for (const b of bonds) {
    neighbors[b.a].push(b.b);
    neighbors[b.b].push(b.a);
  }

  const arcMat = new THREE.LineBasicMaterial({ color: ARC_COLOR, depthTest: false, transparent: true, opacity: 0.85 });

  for (let i = 0; i < atoms.length; i++) {
    const ns = neighbors[i];
    if (ns.length < 2) continue;
    const center = new THREE.Vector3(atoms[i].position.x, atoms[i].position.y, atoms[i].position.z);
    for (let p = 0; p < ns.length; p++) {
      for (let q = p + 1; q < ns.length; q++) {
        const a = atoms[ns[p]].position;
        const c = atoms[ns[q]].position;
        const v1 = new THREE.Vector3(a.x - center.x, a.y - center.y, a.z - center.z);
        const v2 = new THREE.Vector3(c.x - center.x, c.y - center.y, c.z - center.z);
        if (v1.lengthSq() < 1e-6 || v2.lengthSq() < 1e-6) continue;
        const n1 = v1.clone().normalize();
        const n2 = v2.clone().normalize();
        let angle = Math.acos(THREE.MathUtils.clamp(n1.dot(n2), -1, 1));
        if (!isFinite(angle) || angle < 0.05) continue;

        const axis = new THREE.Vector3().crossVectors(n1, n2);
        if (axis.lengthSq() < 1e-6) continue;
        axis.normalize();

        // Arc points
        const points = [];
        for (let s = 0; s <= ARC_SEGMENTS; s++) {
          const t = s / ARC_SEGMENTS;
          const q2 = new THREE.Quaternion().setFromAxisAngle(axis, angle * t);
          const pt = n1.clone().applyQuaternion(q2).multiplyScalar(ARC_RADIUS).add(center);
          points.push(pt);
        }
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const arc = new THREE.Line(geom, arcMat);
        arc.renderOrder = 998;
        group.add(arc);

        // Label at the arc midpoint, pushed out slightly
        const midQ = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.5);
        const midDir = n1.clone().applyQuaternion(midQ);
        const labelPos = midDir.clone().multiplyScalar(ARC_RADIUS * 1.45).add(center);
        const deg = (angle * 180) / Math.PI;
        const label = makeLabel(`${deg.toFixed(1)}°`, ANGLE_LABEL_HEIGHT);
        label.position.copy(labelPos);
        group.add(label);
      }
    }
  }

  return group;
}

export function disposeMeasurementGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
}
