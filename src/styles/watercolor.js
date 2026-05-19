import * as THREE from 'three';

let atomMaterial = null;
let bondMaterial = null;
let ringMaterial = null;
let outlineMaterial = null;
let paperTexture = null;
let outlines = [];

// Particle Star Field (Watercolor paint splatters / ink specks)
let particleMaterial = null;
let particleTexture = null;
let particleSystem = null;
let initialPositions = null;
const particleCount = 150;

function ensurePaperTexture() {
  if (paperTexture) return paperTexture;

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Base dark charcoal color (dark mode watercolor paper)
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, 0, size, size);

  // Apply subtle texture noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 5; // light grain
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // CanvasTexture with linear filtering
  paperTexture = new THREE.CanvasTexture(canvas);
  paperTexture.minFilter = THREE.LinearFilter;
  paperTexture.magFilter = THREE.LinearFilter;
  paperTexture.wrapS = THREE.RepeatWrapping;
  paperTexture.wrapT = THREE.RepeatWrapping;
  paperTexture.repeat.set(2, 2);
  return paperTexture;
}

function makeWashMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {},
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
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstColor;

      // Pseudo-random noise for pigment granulation
      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        // Fresnel calculation
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.5);
        
        // Base watercolor wash (mix color with dark background to make it look diluted/transparent)
        vec3 baseWash = mix(vInstColor, vec3(0.08, 0.08, 0.10), 0.35);
        
        // Brighter edge rim representing concentrated pigment dried on dark paper
        float edge = smoothstep(0.65, 0.97, fresnel);
        vec3 brightEdge = mix(vInstColor, vec3(1.0), 0.25);
        
        vec3 col = mix(baseWash, brightEdge, edge);
        
        // Add subtle light granulation noise to final color
        float grain = rand(vNormalView.xy * 120.0) * 0.04;
        col = clamp(col + vec3(grain), 0.0, 1.0);
        
        // Soft alpha transparency that becomes slightly solid at the silhouette
        float alpha = mix(0.75, 0.95, edge);
        
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

function ensureMaterials() {
  if (atomMaterial) return;

  atomMaterial = makeWashMaterial();
  bondMaterial = makeWashMaterial();
  ringMaterial = makeWashMaterial();

  outlineMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: true,
    uniforms: {},
    vertexShader: `
      void main() {
        #ifdef USE_INSTANCING
          mat4 mv = viewMatrix * modelMatrix * instanceMatrix;
        #else
          mat4 mv = viewMatrix * modelMatrix;
        #endif
        
        // Wobble scale offset based on vertex coordinate frequencies
        float wobble = sin(position.x * 15.0) * cos(position.y * 15.0) * sin(position.z * 15.0);
        wobble += sin(position.y * 28.0) * 0.35;
        
        float scale = 1.05 + 0.04 * wobble;
        vec4 mvPos = mv * vec4(position * scale, 1.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      void main() {
        // Soft sketchy white chalk outline
        gl_FragColor = vec4(0.85, 0.85, 0.88, 0.8);
      }
    `
  });
}

function ensureParticleMaterial() {
  if (particleMaterial) return;

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  // Draw radial gradient representing a soft light speck / paint splatter
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(235, 233, 240, 0.65)');
  grad.addColorStop(0.5, 'rgba(235, 233, 240, 0.25)');
  grad.addColorStop(1, 'rgba(235, 233, 240, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);

  particleTexture = new THREE.CanvasTexture(canvas);

  particleMaterial = new THREE.PointsMaterial({
    size: 0.5,
    map: particleTexture,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // Glowy floating particles in dark mode
  });
}

function ensureParticleSystem() {
  if (particleSystem) return;

  ensureParticleMaterial();
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleSystem = new THREE.Points(geometry, particleMaterial);
  particleSystem.name = 'watercolor-splatters';

  initialPositions = new Float32Array(particleCount * 3);
}

function animateParticles() {
  if (!particleSystem || !initialPositions) return;

  const posAttr = particleSystem.geometry.attributes.position;
  const time = Date.now() * 0.001;

  for (let i = 0; i < particleCount; i++) {
    const phase = i * 0.17;
    // Gentle floating waves simulating paint particles suspended in water
    const dx = Math.sin(time * 0.15 + phase) * 0.8;
    const dy = Math.cos(time * 0.22 + phase) * 0.8;
    const dz = Math.sin(time * 0.12 + phase) * 0.8;

    posAttr.setX(i, initialPositions[i * 3] + dx);
    posAttr.setY(i, initialPositions[i * 3 + 1] + dy);
    posAttr.setZ(i, initialPositions[i * 3 + 2] + dz);
  }
  posAttr.needsUpdate = true;
}

function clearOutlines(viewer) {
  for (const o of outlines) {
    if (o.parent) o.parent.remove(o);
    o.dispose();
  }
  outlines = [];
}

function buildOutlines(viewer, meshes) {
  clearOutlines(viewer);
  if (!meshes) return;

  for (const m of [meshes.atoms, meshes.bonds, meshes.rings]) {
    if (!m) continue;
    const o = new THREE.InstancedMesh(m.geometry, outlineMaterial, m.count);
    o.name = m.name + '-watercolor-outline';

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, matrix);
      o.setMatrixAt(i, matrix);
    }
    o.instanceMatrix.needsUpdate = true;
    
    viewer.scene.add(o);
    outlines.push(o);
  }
}

export const watercolor = {
  id: 'watercolor',
  name: 'Watercolor',

  apply(viewer, meshes) {
    ensureMaterials();
    ensureParticleSystem();
    
    // Set dark paper texture
    viewer.setBackground(ensurePaperTexture());
    viewer.setEnvironment(null);
    viewer.setLights([]); // Flat unlit watercolor washes
    
    viewer.scene.add(particleSystem);
    viewer.addUpdateCallback(animateParticles);

    viewer.setPostProcessing([]); // No bloom/post needed

    this.onMoleculeChanged(viewer, meshes);
  },

  onMoleculeChanged(viewer, meshes) {
    if (!meshes) return;

    if (meshes.atoms) meshes.atoms.material = atomMaterial;
    if (meshes.bonds) meshes.bonds.material = bondMaterial;
    if (meshes.rings) meshes.rings.material = ringMaterial;

    buildOutlines(viewer, meshes);

    // Update particle field size and distribution dynamically
    const box = new THREE.Box3();
    if (meshes.atoms) box.expandByObject(meshes.atoms);
    
    if (!box.isEmpty() && particleSystem) {
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      particleSystem.position.copy(sphere.center);

      const posAttr = particleSystem.geometry.attributes.position;
      const count = posAttr.count;
      const rMin = sphere.radius * 1.5;
      const rMax = sphere.radius * 4.5;

      for (let i = 0; i < count; i++) {
        // Distribute particles in a spherical shell around the molecule
        const r = rMin + Math.random() * (rMax - rMin);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        const px = r * Math.sin(phi) * Math.cos(theta);
        const py = r * Math.sin(phi) * Math.sin(theta);
        const pz = r * Math.cos(phi);

        posAttr.setXYZ(i, px, py, pz);

        initialPositions[i * 3] = px;
        initialPositions[i * 3 + 1] = py;
        initialPositions[i * 3 + 2] = pz;
      }
      posAttr.needsUpdate = true;

      // Scale particle sizes relative to molecule scale
      particleMaterial.size = sphere.radius * 0.08;
    }
  },

  dispose(viewer) {
    clearOutlines(viewer);
    if (particleSystem && particleSystem.parent) {
      particleSystem.parent.remove(particleSystem);
    }
    viewer.removeUpdateCallback(animateParticles);
  },
};
