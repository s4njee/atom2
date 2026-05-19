import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;

function makeMaterial({ k, ambient, tintMix }) {
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: {
      uK: { value: k },
      uAmbient: { value: ambient },
      uTintMix: { value: tintMix },
      uLightDir: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
    },
    vertexShader: `
      varying vec3 vPosView;
      varying vec3 vInstColor;
      void main() {
        #ifdef USE_INSTANCING
          mat4 mv = viewMatrix * modelMatrix * instanceMatrix;
        #else
          mat4 mv = viewMatrix * modelMatrix;
        #endif
        vec4 mvPos = mv * vec4(position, 1.0);
        vPosView = mvPos.xyz;
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
      varying vec3 vPosView;
      varying vec3 vInstColor;

      void main() {
        // Flat normal from screen-space derivatives — gives true per-fragment facets,
        // then we quantize to a small set of directions for the paper-crease feel.
        vec3 N = normalize(cross(dFdx(vPosView), dFdy(vPosView)));
        N = normalize(floor(N * uK + 0.5) / uK);

        vec3 L = normalize(uLightDir);
        float NdotL = max(dot(N, L), 0.0);
        vec3 tint = mix(vec3(1.0), vInstColor, uTintMix);
        vec3 col = tint * (uAmbient + NdotL);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = makeMaterial({ k: 6.0, ambient: 0.25, tintMix: 0.85 });
  bondMaterial = makeMaterial({ k: 5.0, ambient: 0.30, tintMix: 0.20 });
  ringMaterial = makeMaterial({ k: 5.0, ambient: 0.30, tintMix: 0.20 });
}

export const origami = {
  id: 'origami',
  name: 'Origami',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0xf3ecd9));
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
