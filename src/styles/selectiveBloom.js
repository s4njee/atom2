import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

// Halogen CPK colors (from src/chem/elements.js).
// Encoded as floats so they can be diff'd against the per-instance color in the fragment.
const HALOGENS = [
  [0x90 / 255, 0xe0 / 255, 0x50 / 255], // F
  [0x1f / 255, 0xf0 / 255, 0x1f / 255], // Cl
  [0xa6 / 255, 0x29 / 255, 0x29 / 255], // Br
  [0x94 / 255, 0x00 / 255, 0x94 / 255], // I
];

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uHalogens: { value: HALOGENS.flat() },     // length 12, four RGB triples
      uMatchTol: { value: 0.06 },
      uDimColor: { value: new THREE.Color(0x2a3142) },
      uDimMix: { value: 0.55 },                  // how much the original color is muted
      uGlowBoost: { value: 4.5 },                // halogen brightness multiplier (drives bloom)
      uLightDir: { value: new THREE.Vector3(0.3, 0.7, 0.6).normalize() },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vInstColor;
      void main() {
        #ifdef USE_INSTANCING
          mat4 mv = viewMatrix * modelMatrix * instanceMatrix;
        #else
          mat4 mv = viewMatrix * modelMatrix;
        #endif
        vec4 mvPos = mv * vec4(position, 1.0);
        vNormalView = normalize(mat3(mv) * normal);
        #ifdef USE_INSTANCING_COLOR
          vInstColor = instanceColor;
        #else
          vInstColor = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uHalogens[12];
      uniform float uMatchTol;
      uniform vec3 uDimColor;
      uniform float uDimMix;
      uniform float uGlowBoost;
      uniform vec3 uLightDir;
      varying vec3 vNormalView;
      varying vec3 vInstColor;

      bool isHalogen(vec3 c) {
        for (int k = 0; k < 4; k++) {
          vec3 h = vec3(uHalogens[k*3], uHalogens[k*3+1], uHalogens[k*3+2]);
          if (distance(c, h) < uMatchTol) return true;
        }
        return false;
      }

      void main() {
        float NdotL = max(dot(normalize(vNormalView), normalize(uLightDir)), 0.0);
        if (isHalogen(vInstColor)) {
          // Hot color → UnrealBloom catches the brightness.
          gl_FragColor = vec4(vInstColor * uGlowBoost, 1.0);
        } else {
          vec3 muted = mix(vInstColor, uDimColor, uDimMix);
          vec3 lit = muted * (0.2 + 0.8 * NdotL);
          gl_FragColor = vec4(lit, 1.0);
        }
      }
    `,
  });
  // Bonds and rings stay dark/subdued — they don't get to bloom.
  bondMaterial = new THREE.MeshBasicMaterial({ color: 0x232a3a });
  ringMaterial = new THREE.MeshBasicMaterial({ color: 0x2d3548 });
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 1.4, 0.85, 0.35);
  return bloomPass;
}

export const selectiveBloom = {
  id: 'selectiveBloom',
  name: 'Halogen glow',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x05070d));
    viewer.setEnvironment(null);
    viewer.setLights([]);
    viewer.setPostProcessing([ensureBloom(viewer)]);
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
