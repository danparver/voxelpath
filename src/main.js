import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { VoxelMap } from './map/VoxelMap.js';
import { VoxelMapEditor } from './editor/VoxelMapEditor.js';
import { World } from './world/World.js';
import { createCardinalMarkers } from './world/createCardinalMarkers.js';
import worldMap from './world/map.json';
import './style.css';

const app = document.querySelector('#app');
const mapFileInput = document.querySelector('#map-file');
const editorElement = document.querySelector('#voxel-editor');
const cameraTopButton = document.querySelector('#camera-top');
const cameraNorthButton = document.querySelector('#camera-north');
const cameraRotateButton = document.querySelector('#camera-rotate');
const cameraToolbarButtons = [cameraTopButton, cameraNorthButton, cameraRotateButton];
const initialWidth = Math.max(1, app.clientWidth);
const initialHeight = Math.max(1, app.clientHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141f);

const camera = new THREE.PerspectiveCamera(
  60,
  initialWidth / initialHeight,
  0.1,
  100,
);
camera.position.set(8, 7, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(initialWidth, initialHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xc8dcff, 0x202638, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
sunLight.position.set(7, 10, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 40;
sunLight.shadow.camera.left = -12;
sunLight.shadow.camera.right = 12;
sunLight.shadow.camera.top = 12;
sunLight.shadow.camera.bottom = -12;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x171d2a, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(20, 20, 0x6173a1, 0x2d374f);
grid.position.y = 0.002;
scene.add(grid);
scene.add(createCardinalMarkers(20));

let world;
const voxelMap = new VoxelMap(worldMap);
const editor = new VoxelMapEditor(editorElement, voxelMap);
const loadMapButton = document.querySelector('#load-map-option');
const fileStatus = document.querySelector('#file-status');
const cameraModeButton = document.querySelector('#camera-mode');
const cameraHelp = document.querySelector('#camera-help');

loadMapButton.addEventListener('click', () => {
  editor.closeMoreMenu();
  mapFileInput.click();
});

function rebuildWorld() {
  const nextWorld = new World(voxelMap);

  if (world) {
    scene.remove(world);
    world.dispose();
  }

  world = nextWorld;
  scene.add(world);
}

voxelMap.subscribe(rebuildWorld);
rebuildWorld();

mapFileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const map = JSON.parse(await file.text());
    voxelMap.replaceFromJSON(map);
    fileStatus.textContent = `${file.name} cargado`;
    fileStatus.classList.remove('error');
  } catch (error) {
    fileStatus.textContent = `No se pudo cargar: ${error.message}`;
    fileStatus.classList.add('error');
  } finally {
    event.target.value = '';
    if (editor.moreOptions.hidden) editor.toggleMoreMenu();
  }
});

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 1, 0);

const exploreControls = new PointerLockControls(camera, renderer.domElement);
const pressedKeys = new Set();
const movement = new THREE.Vector3();
const clock = new THREE.Clock();
const savedOrbitPosition = new THREE.Vector3();
const savedOrbitQuaternion = new THREE.Quaternion();
const savedOrbitTarget = new THREE.Vector3();
const cameraRotationAxis = new THREE.Vector3(0, 1, 0);
const cameraTransitionDuration = 800;
let cameraMode = 'orbit';
let cameraTransition = null;

function startCameraTransition(endPosition, endTarget) {
  const startPosition = camera.position.clone();
  const startTarget = orbitControls.target.clone();

  orbitControls.enabled = false;
  cameraTransition = {
    startTime: performance.now(),
    update(progress) {
      camera.position.lerpVectors(startPosition, endPosition, progress);
      orbitControls.target.lerpVectors(startTarget, endTarget, progress);
      camera.lookAt(orbitControls.target);
    },
  };
}

function startCameraRotation() {
  const target = orbitControls.target.clone();
  const startOffset = camera.position.clone().sub(target);

  orbitControls.enabled = false;
  cameraTransition = {
    startTime: performance.now(),
    update(progress) {
      const offset = startOffset.clone()
        .applyAxisAngle(cameraRotationAxis, -Math.PI / 2 * progress);
      camera.position.copy(target).add(offset);
      orbitControls.target.copy(target);
      camera.lookAt(target);
    },
  };
}

function updateCameraTransition(time) {
  if (!cameraTransition) return false;

  const elapsed = Math.min(1, (time - cameraTransition.startTime) / cameraTransitionDuration);
  const eased = elapsed * elapsed * (3 - 2 * elapsed);
  cameraTransition.update(eased);

  if (elapsed === 1) {
    cameraTransition = null;
    orbitControls.enabled = cameraMode === 'orbit';
    orbitControls.update();
  }

  return true;
}

function enterExploreMode() {
  cameraTransition = null;
  savedOrbitPosition.copy(camera.position);
  savedOrbitQuaternion.copy(camera.quaternion);
  savedOrbitTarget.copy(orbitControls.target);

  cameraMode = 'explore';
  orbitControls.enabled = false;
  cameraToolbarButtons.forEach((button) => { button.disabled = true; });
  camera.position.set(0, 0.55, 6);
  camera.lookAt(0, 0.55, 0);
  cameraModeButton.textContent = 'Volver a Orbit (Esc)';
  cameraHelp.textContent = 'Explore: WASD/flechas, Espacio sube, Shift izquierdo baja y el mouse mira.';
}

function enterOrbitMode() {
  cameraMode = 'orbit';
  pressedKeys.clear();
  camera.position.copy(savedOrbitPosition);
  camera.quaternion.copy(savedOrbitQuaternion);
  orbitControls.target.copy(savedOrbitTarget);
  orbitControls.enabled = true;
  cameraToolbarButtons.forEach((button) => { button.disabled = false; });
  orbitControls.update();
  cameraModeButton.textContent = 'Cambiar a Explore';
  cameraHelp.textContent = 'Orbit: arrastra para rotar y usa la rueda para acercar.';
}

cameraModeButton.addEventListener('click', () => {
  editor.closeMoreMenu();
  if (cameraMode === 'orbit') {
    exploreControls.lock();
  } else {
    exploreControls.unlock();
  }
});

exploreControls.addEventListener('lock', enterExploreMode);
exploreControls.addEventListener('unlock', enterOrbitMode);

cameraTopButton.addEventListener('click', () => {
  if (cameraMode !== 'orbit') return;
  startCameraTransition(
    new THREE.Vector3(0, 20, 0.001),
    new THREE.Vector3(0, 0, 0),
  );
});

cameraNorthButton.addEventListener('click', () => {
  if (cameraMode !== 'orbit') return;
  startCameraTransition(
    new THREE.Vector3(0, 4, 18),
    new THREE.Vector3(0, 2, 0),
  );
});

cameraRotateButton.addEventListener('click', () => {
  if (cameraMode !== 'orbit') return;
  startCameraRotation();
});

window.addEventListener('keydown', (event) => {
  if (cameraMode !== 'explore') return;
  pressedKeys.add(event.code);

  if (
    event.code.startsWith('Arrow')
    || event.code === 'Space'
    || event.code === 'ShiftLeft'
  ) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => pressedKeys.clear());

function updateExploreMovement(delta) {
  if (cameraMode !== 'explore' || !exploreControls.isLocked) return;

  movement.set(
    Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight'))
      - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')),
    Number(pressedKeys.has('Space'))
      - Number(pressedKeys.has('ShiftLeft')),
    Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'))
      - Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')),
  );

  if (movement.lengthSq() > 0) movement.normalize();

  const distance = 4 * delta;
  exploreControls.moveRight(movement.x * distance);
  camera.position.y += movement.y * distance;
  exploreControls.moveForward(movement.z * distance);
}

function resize() {
  const width = Math.max(1, app.clientWidth);
  const height = Math.max(1, app.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(app);

function animate(time) {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (cameraMode === 'orbit') {
    if (!updateCameraTransition(time)) orbitControls.update();
  } else {
    updateExploreMovement(delta);
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
