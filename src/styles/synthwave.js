import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let sunMaterial = null;
let sunMesh = null;
let gridHelper = null;
let bloomPass = null;

function ensureMaterials() {
  if (atomMaterial) return;

  atomMaterial = new THREE.MeshBasicMaterial({
    color: 0xff007f, // Neon Hot Pink
    wireframe: true,
  });

  bondMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff, // Neon Cyan
    wireframe: true,
  });

  ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd24a, // Neon Golden Yellow
    wireframe: true,
  });

  sunMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColorTop: { value: new THREE.Color(0xff007f) },     // Neon Pink
      uColorBottom: { value: new THREE.Color(0xffaa00) },  // Neon Orange/Yellow
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorTop;
      uniform vec3 uColorBottom;
      varying vec2 vUv;
      void main() {
        // Centered coordinates from -1 to 1
        vec2 uv = vUv * 2.0 - 1.0;
        float dist = length(uv);
        if (dist > 1.0) discard;

        // Gap pattern: horizontal strips
        // High frequency at the bottom, wider gaps
        // y runs from -1 (bottom) to 1 (top)
        float val = uv.y * 6.0;
        float gapWidth = 0.15 + (1.0 - uv.y) * 0.18; // wider gaps at the bottom
        float f = fract(val);
        if (uv.y < 0.25 && f < gapWidth) discard;

        // Gradient color from bottom to top
        vec3 col = mix(uColorBottom, uColorTop, (uv.y + 1.0) * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sunMaterial);
  sunMesh.name = 'synthwave-sun';
}

function ensureGrid() {
  if (gridHelper) return gridHelper;
  // Size = 200, divisions = 50, colorCenterLine = magenta, colorGrid = dark purple
  gridHelper = new THREE.GridHelper(200, 50, 0xff007f, 0x1e033b);
  gridHelper.name = 'synthwave-grid';
  return gridHelper;
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 1.5, 0.6, 0.1);
  return bloomPass;
}

export const synthwave = {
  id: 'synthwave',
  name: 'Retro Synthwave',

  apply(viewer, meshes) {
    ensureMaterials();
    ensureGrid();

    // Outrun dark purple background
    viewer.setBackground(new THREE.Color(0x0a0512));
    viewer.setEnvironment(null);
    viewer.setLights([]); // basic wireframe materials are unlit

    viewer.scene.add(gridHelper);

    // Add camera to scene and mount sun mesh to camera to act as a locked sky element
    viewer.scene.add(viewer.camera);
    viewer.camera.add(sunMesh);

    viewer.setPostProcessing([ensureBloom(viewer)]);

    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;

    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;

    // Calculate geometry bounds to place grid and sun appropriately
    const box = new THREE.Box3();
    if (meshes.atoms) box.expandByObject(meshes.atoms);

    if (!box.isEmpty()) {
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      
      // Place grid helper just below the molecule
      gridHelper.position.set(sphere.center.x, box.min.y - 1.5, sphere.center.z);

      // Compute dynamic distance and scale for background sun
      const fov = (viewer.camera.fov * Math.PI) / 180;
      const distance = sphere.radius / Math.sin(fov / 2) * 1.4;

      // Position sun far behind center (in camera local space)
      const sunZ = -distance * 2.5;
      sunMesh.position.set(0, 0, sunZ);

      // Scale sun to fit nicely in camera frustum (e.g. 60% of vertical height)
      const frustumHeight = 2.0 * Math.abs(sunZ) * Math.tan(fov / 2.0);
      const sunScale = frustumHeight * 0.6;
      sunMesh.scale.set(sunScale, sunScale, 1.0);
    }
  },

  dispose(viewer) {
    if (gridHelper && gridHelper.parent) {
      gridHelper.parent.remove(gridHelper);
    }
    if (sunMesh && sunMesh.parent) {
      sunMesh.parent.remove(sunMesh);
    }
    viewer.setPostProcessing([]);
  },
};
