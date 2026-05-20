import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let crtPass = null;
let afterimagePass = null;

const CRT_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    void main() {
      // Barrel distortion
      vec2 uv = vUv * 2.0 - 1.0;
      float d = length(uv);
      uv *= 1.0 + 0.1 * d * d;
      uv = (uv + 1.0) * 0.5;

      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Chromatic aberration
      float off = 0.002;
      float r = texture2D(tDiffuse, uv + vec2(off, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(off, 0.0)).b;

      vec3 col = vec3(r, g, b);

      // Scanlines
      float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.1 + 0.9;
      col *= scanline;

      // Flickering
      col *= 0.95 + 0.05 * sin(uTime * 50.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function ensureMaterials() {
  if (atomMaterial) return;
  const color = 0x00ff44; // Phosphor green
  atomMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  bondMaterial = new THREE.MeshBasicMaterial({ color });
  ringMaterial = new THREE.MeshBasicMaterial({ color, wireframe: true });
}

function ensurePasses(viewer) {
  if (!afterimagePass) {
    afterimagePass = new AfterimagePass(0.92);
  }
  if (!crtPass) {
    crtPass = new ShaderPass(CRT_SHADER);
    const size = viewer.renderer.getSize(new THREE.Vector2());
    crtPass.uniforms.uResolution.value.set(size.x, size.y);
  }
  return [afterimagePass, crtPass];
}

export const oscilloscope = {
  id: 'oscilloscope',
  name: 'Oscilloscope',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x000500));
    viewer.setEnvironment(null);
    viewer.setLights([]);
    viewer.setPostProcessing(ensurePasses(viewer));
    viewer.addUpdateCallback(this.update.bind(this));
    this.onMoleculeChanged(viewer, meshes);
  },

  update() {
    const time = Date.now() * 0.001;
    if (crtPass) crtPass.uniforms.uTime.value = time;
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) {
      meshes.atoms.material = atomMaterial;
      if (viewer.currentMolecule) {
        const color = new THREE.Color();
        const atoms = viewer.currentMolecule.atoms;
        for (let i = 0; i < atoms.length; i++) {
          const el = atoms[i].element;
          if (el === 'O') color.setHex(0xff0000);
          else if (el === 'N') color.setHex(0x3366ff);
          else color.setHex(0x00ff44); // Phosphor green
          meshes.atoms.setColorAt(i, color);
        }
        meshes.atoms.instanceColor.needsUpdate = true;
      }
    }
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setPostProcessing([]);
    viewer.removeUpdateCallback(this.update.bind(this));
  },
};
