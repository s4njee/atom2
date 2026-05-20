import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export function createViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Tracked so they can be cleared on style change.
  let activeLights = [];
  let activeExtraPasses = [];

  function setLights(lights) {
    for (const l of activeLights) scene.remove(l);
    activeLights = lights;
    for (const l of activeLights) scene.add(l);
  }

  function setBackground(value) {
    scene.background = value ?? null;
  }

  function setEnvironment(envTexture) {
    scene.environment = envTexture ?? null;
  }

  function setPostProcessing(passes) {
    for (const p of activeExtraPasses) composer.removePass(p);
    activeExtraPasses = passes;
    for (const p of activeExtraPasses) composer.addPass(p);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const updateCallbacks = new Set();
  let raf = null;
  function start() {
    if (raf != null) return;
    const tick = () => {
      controls.update();
      for (const cb of updateCallbacks) {
        try { cb(); } catch (err) { console.error(err); }
      }
      if (activeExtraPasses.length === 0) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    scene, camera, renderer, controls, composer,
    setLights, setBackground, setEnvironment, setPostProcessing,
    addUpdateCallback: (cb) => updateCallbacks.add(cb),
    removeUpdateCallback: (cb) => updateCallbacks.delete(cb),
    resize, start, stop,
    currentMolecule: null,
  };
}
