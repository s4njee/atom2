import * as THREE from 'three';

const LABEL_BG = 'rgba(20, 24, 32, 0.9)';
const LENGTH_LABEL_HEIGHT = 0.34;
const ANGLE_LABEL_HEIGHT = 0.30;
const ARC_RADIUS = 0.5;
const ARC_SEGMENTS = 24;

function makeLabel(text, worldHeight, color = '#ffffff', borderColor = 'rgba(120,145,180,0.6)') {
  const dpr = 2;
  const fontPx = 30 * dpr;
  const padX = 12 * dpr;
  const padY = 6 * dpr;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + padX * 2;
  canvas.height = fontPx + padY * 2;
  ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = LABEL_BG;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2 * dpr;
  roundedRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, 7 * dpr);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
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

// items: [{ bondIdx, color, prefix }]
export function buildLengthLabels(molecule, items) {
  const group = new THREE.Group();
  group.name = 'length-labels';
  const { atoms, bonds } = molecule;
  for (const item of items) {
    const b = bonds[item.bondIdx];
    if (!b) continue;
    const a = atoms[b.a].position;
    const c = atoms[b.b].position;
    const len = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
    const text = `${item.prefix}  ${len.toFixed(2)} Å`;
    const label = makeLabel(text, LENGTH_LABEL_HEIGHT, item.color, item.color);
    label.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
    group.add(label);
  }
  return group;
}

// items: [{ triple: [i, center, k], color, prefix }]
export function buildAngleArcs(molecule, items) {
  const group = new THREE.Group();
  group.name = 'angle-arcs';
  const { atoms } = molecule;

  for (const item of items) {
    const [iA, iC, iK] = item.triple;
    const center = new THREE.Vector3(atoms[iC].position.x, atoms[iC].position.y, atoms[iC].position.z);
    const v1 = new THREE.Vector3().subVectors(toVec(atoms[iA].position), center);
    const v2 = new THREE.Vector3().subVectors(toVec(atoms[iK].position), center);
    if (v1.lengthSq() < 1e-6 || v2.lengthSq() < 1e-6) continue;
    const n1 = v1.clone().normalize();
    const n2 = v2.clone().normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(n1.dot(n2), -1, 1));
    if (!isFinite(angle) || angle < 0.05) continue;
    const axis = new THREE.Vector3().crossVectors(n1, n2);
    if (axis.lengthSq() < 1e-6) continue;
    axis.normalize();

    const points = [];
    for (let s = 0; s <= ARC_SEGMENTS; s++) {
      const t = s / ARC_SEGMENTS;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle * t);
      const pt = n1.clone().applyQuaternion(q).multiplyScalar(ARC_RADIUS).add(center);
      points.push(pt);
    }
    const arcGeom = new THREE.BufferGeometry().setFromPoints(points);
    const arcMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(item.color),
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.renderOrder = 998;
    group.add(arc);

    const midQ = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.5);
    const midDir = n1.clone().applyQuaternion(midQ);
    const labelPos = midDir.clone().multiplyScalar(ARC_RADIUS * 1.5).add(center);
    const deg = (angle * 180) / Math.PI;
    const text = `${deg.toFixed(1)}°`;
    const label = makeLabel(text, ANGLE_LABEL_HEIGHT, item.color, item.color);
    label.position.copy(labelPos);
    group.add(label);
  }
  return group;
}

function toVec(p) { return new THREE.Vector3(p.x, p.y, p.z); }

export function disposeMeasurementGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
}
