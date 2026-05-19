import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let bloomPass = null;

function makeMaterial({ thicknessBase, thicknessVar, tintMix }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uThicknessBase: { value: thicknessBase },
      uThicknessVar: { value: thicknessVar },
      uTintMix: { value: tintMix },
      uIOR: { value: 1.33 },
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
      uniform float uThicknessBase;
      uniform float uThicknessVar;
      uniform float uTintMix;
      uniform float uIOR;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstColor;

      // Per-element thickness offset: hash the instance color so different elements
      // sit on different bands of the interference rainbow.
      float colorHash(vec3 c) {
        return fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      }

      // Three cosines at 650/550/450 nm approximate wavelength -> RGB.
      vec3 filmColor(float pathNm) {
        const float TAU = 6.2831853;
        float r = 0.5 + 0.5 * cos(TAU * pathNm / 650.0);
        float g = 0.5 + 0.5 * cos(TAU * pathNm / 550.0 + 2.0944);
        float b = 0.5 + 0.5 * cos(TAU * pathNm / 450.0 + 4.1888);
        return vec3(r, g, b);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float cosI = clamp(dot(N, V), 0.0, 1.0);

        float thickness = uThicknessBase + uThicknessVar * (colorHash(vInstColor) - 0.5);
        float path = 2.0 * thickness * uIOR * cosI;
        vec3 film = filmColor(path);

        float fres = pow(1.0 - cosI, 3.0);
        vec3 col = mix(vInstColor * uTintMix, film, 0.55 + 0.45 * fres);

        float alpha = 0.6 + 0.4 * fres;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function ensureMaterials() {
  if (atomMaterial) return;
  atomMaterial = makeMaterial({ thicknessBase: 380, thicknessVar: 260, tintMix: 0.35 });
  bondMaterial = makeMaterial({ thicknessBase: 320, thicknessVar: 80, tintMix: 0.30 });
  ringMaterial = makeMaterial({ thicknessBase: 420, thicknessVar: 60, tintMix: 0.30 });
}

function ensureBloom(viewer) {
  if (bloomPass) return bloomPass;
  const size = viewer.renderer.getSize(new THREE.Vector2());
  bloomPass = new UnrealBloomPass(size, 0.8, 0.5, 0.0);
  return bloomPass;
}

export const iridescence = {
  id: 'iridescence',
  name: 'Iridescence',

  apply(viewer, meshes) {
    ensureMaterials();
    viewer.setBackground(new THREE.Color(0x080a14));
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
