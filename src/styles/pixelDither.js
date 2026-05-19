import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let ditherPass = null;

function ensureMaterials() {
  if (atomMaterial) return;
  // Built-in materials auto-multiply instanceColor on InstancedMesh — no vertexColors flag needed.
  atomMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  bondMaterial = new THREE.MeshLambertMaterial({ color: 0xc8c8c8 });
  ringMaterial = new THREE.MeshLambertMaterial({ color: 0xb0b0b0 });
}

const DITHER_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPixelSize: { value: 4.0 },      // chunky-pixel block in display pixels
    uLevels: { value: 4.0 },         // quantization levels per channel
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
    uniform vec2 uResolution;
    uniform float uPixelSize;
    uniform float uLevels;
    varying vec2 vUv;

    // 4x4 Bayer matrix (0..15) normalized to 0..1, biased to -0.5..0.5.
    float bayer(ivec2 p) {
      int x = p.x & 3;
      int y = p.y & 3;
      int i = y * 4 + x;
      float m[16];
      m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
      m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
      m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
      m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
      return m[i] / 16.0 - 0.5;
    }

    void main() {
      // Snap to a low-res grid so the result reads as chunky pixels.
      vec2 cellSize = uPixelSize / uResolution;
      vec2 cellUv = (floor(vUv / cellSize) + 0.5) * cellSize;
      vec3 col = texture2D(tDiffuse, cellUv).rgb;

      // Ordered dither + palette quantization.
      ivec2 p = ivec2(floor(vUv * uResolution / uPixelSize));
      float d = bayer(p) / uLevels;
      vec3 q = floor(col * uLevels + d + 0.5) / uLevels;
      gl_FragColor = vec4(clamp(q, 0.0, 1.0), 1.0);
    }
  `,
};

function ensurePass(viewer) {
  if (ditherPass) return ditherPass;
  ditherPass = new ShaderPass(DITHER_SHADER);
  const size = viewer.renderer.getSize(new THREE.Vector2());
  ditherPass.uniforms.uResolution.value.set(size.x, size.y);
  // Track resize via composer.setSize → ShaderPass.setSize.
  const origSetSize = ditherPass.setSize.bind(ditherPass);
  ditherPass.setSize = (w, h) => {
    origSetSize(w, h);
    ditherPass.uniforms.uResolution.value.set(w, h);
  };
  return ditherPass;
}

export const pixelDither = {
  id: 'pixelDither',
  name: 'Pixel dither',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x101820));
    viewer.setEnvironment(null);
    viewer.setLights([
      new THREE.AmbientLight(0xffffff, 0.45),
      new THREE.DirectionalLight(0xffffff, 0.9),
    ]);
    viewer.setPostProcessing([ensurePass(viewer)]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose(viewer) {
    viewer.setPostProcessing([]);
  },
};
