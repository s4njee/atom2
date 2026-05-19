import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;

function makeMaterial({ k, ambient, tintMix }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uK: { value: k },
      uAmbient: { value: ambient },
      uTintMix: { value: tintMix },
      uLightDir: { value: new THREE.Vector3(0.4, 0.6, 0.7).normalize() },
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
      uniform float uK;
      uniform float uAmbient;
      uniform float uTintMix;
      uniform vec3 uLightDir;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstColor;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        // Light direction is given in view space (camera-relative).
        vec3 L = normalize(uLightDir);
        float NdotL = max(dot(N, L), 0.0);
        float NdotV = max(dot(N, V), 0.0);
        // Minnaert: (N.L * N.V)^(k-1) * N.L
        float minnaert = pow(NdotL * NdotV + 1e-4, uK - 1.0) * NdotL;
        // Rim brightening at grazing angles for the suede feel.
        float rim = pow(1.0 - NdotV, 2.0);
        vec3 tint = mix(vec3(1.0), vInstColor, uTintMix);
        vec3 col = tint * (uAmbient + minnaert + rim * 0.25);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = makeMaterial({ k: 1.6, ambient: 0.18, tintMix: 0.85 });
  bondMaterial = makeMaterial({ k: 1.6, ambient: 0.20, tintMix: 0.30 });
  ringMaterial = makeMaterial({ k: 1.5, ambient: 0.25, tintMix: 0.30 });
}

export const velvet = {
  id: 'velvet',
  name: 'Velvet',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x1a1620));
    viewer.setEnvironment(null);
    viewer.setLights([]);
    viewer.setPostProcessing([]);
    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(_viewer, meshes) {
    if (!meshes) return;
    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;
  },

  dispose() {},
};
