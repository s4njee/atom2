import * as THREE from 'three';

export function fitCamera(viewer, meshes) {
  const box = new THREE.Box3();
  if (meshes.atoms) box.expandByObject(meshes.atoms);
  if (box.isEmpty()) return;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const { camera, controls } = viewer;
  const fov = (camera.fov * Math.PI) / 180;
  const distance = sphere.radius / Math.sin(fov / 2) * 1.4;

  const dir = new THREE.Vector3(0, 0, 1);
  camera.position.copy(sphere.center).add(dir.multiplyScalar(distance));
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();

  controls.target.copy(sphere.center);
  controls.update();
}
