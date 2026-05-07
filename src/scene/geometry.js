import * as THREE from 'three';

// Created lazily and shared across the app's lifetime.
let cache = null;

export function getSharedGeometry() {
  if (cache) return cache;
  cache = {
    sphere: new THREE.SphereGeometry(1, 24, 16),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true),
    torus: new THREE.TorusGeometry(1, 0.06, 12, 48),
  };
  return cache;
}
