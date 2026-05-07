import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

function makeMaterial({ baseColor, hotColor, glow, alphaFloor, alphaScale }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uBase: { value: new THREE.Color(baseColor) },
      uHot: { value: new THREE.Color(hotColor) },
      uGlow: { value: glow },
      uAlphaFloor: { value: alphaFloor },
      uAlphaScale: { value: alphaScale },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstColor;
      void main() {
        #ifdef USE_INSTANCING
          mat4 mv = viewMatrix * modelMatrix * instanceMatrix;
        #else
          mat4 mv = viewMatrix * modelMatrix;
        #endif
        vec4 mvPos = mv * vec4(position, 1.0);
        vNormalView = normalize(mat3(mv) * normal);
        vViewDir = normalize(-mvPos.xyz);
        #ifdef USE_INSTANCING_COLOR
          vInstColor = instanceColor;
        #else
          vInstColor = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      uniform vec3 uHot;
      uniform float uGlow;
      uniform float uAlphaFloor;
      uniform float uAlphaScale;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstColor;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.5);
        vec3 hot = mix(uBase, uHot, fres);
        vec3 col = hot * uGlow * fres + vInstColor * 0.18;
        float a = clamp(uAlphaFloor + fres * uAlphaScale, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = makeMaterial({
    baseColor: 0x300000,
    hotColor: 0xff8030,
    glow: 2.2,
    alphaFloor: 0.05,
    alphaScale: 0.9,
  });
  bondMaterial = makeMaterial({
    baseColor: 0x200800,
    hotColor: 0xffaa40,
    glow: 2.5,
    alphaFloor: 0.05,
    alphaScale: 1.0,
  });
  ringMaterial = makeMaterial({
    baseColor: 0x401000,
    hotColor: 0xffcc60,
    glow: 3.0,
    alphaFloor: 0.1,
    alphaScale: 1.0,
  });
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 1.6, 0.7, 0.0);
  return bloomPass;
}

export const xray = {
  id: 'xray',
  name: 'X-ray',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x000000));
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
