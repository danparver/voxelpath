import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { VoxelMap } from './map/VoxelMap.js';
import { VoxelMapEditor } from './editor/VoxelMapEditor.js';
import { World } from './world/World.js';
import { createCardinalMarkers } from './world/createCardinalMarkers.js';
import { getLanguage, subscribeLanguage, t } from './i18n.js';
import worldMap from './world/map.json';
import './style.css';

const app = document.querySelector('#app');
const mapFileInput = document.querySelector('#map-file');
const editorElement = document.querySelector('#voxel-editor');
const cameraTopButton = document.querySelector('#camera-top');
const cameraNorthButton = document.querySelector('#camera-north');
const cameraRotateButton = document.querySelector('#camera-rotate');
const donationControl = document.querySelector('.donation-control');
const donationToggle = document.querySelector('#donation-toggle');
const donationOptions = document.querySelector('#donation-options');
const donationRegionButtons = document.querySelectorAll('[data-donation-region]');
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

let cardinalMarkers;

function rebuildCardinalMarkers() {
  if (cardinalMarkers?.userData.language === getLanguage()) return;

  if (cardinalMarkers) {
    scene.remove(cardinalMarkers);
    cardinalMarkers.traverse((object) => {
      object.userData.texture?.dispose();
      object.material?.dispose();
    });
  }

  cardinalMarkers = createCardinalMarkers(20, t('direction.westShort'));
  cardinalMarkers.userData.language = getLanguage();
  scene.add(cardinalMarkers);
}

rebuildCardinalMarkers();

let world;
const voxelMap = new VoxelMap(worldMap);
const editor = new VoxelMapEditor(editorElement, voxelMap);
const loadMapButton = document.querySelector('#load-map-option');
const exportStlButtons = document.querySelectorAll('[data-export-stl]');
const fileStatus = document.querySelector('#file-status');
const cameraModeButton = document.querySelector('#camera-mode');
const cameraModeToggle = document.querySelector('#camera-mode-toggle');
const cameraModePrefix = document.querySelector('#camera-mode-prefix');
const cameraModeLabel = document.querySelector('#camera-mode-label');
const cameraHelp = document.querySelector('#camera-help');
const viewerNotices = document.querySelector('.viewer-notices');
const cameraToolbar = document.querySelector('.camera-toolbar');
const closeFileStatusButton = document.querySelector('#close-file-status');
const closeCameraHelpButton = document.querySelector('#close-camera-help');
let fileStatusMessage = { key: 'status.exampleLoaded', values: {} };

document.querySelectorAll('[data-close-notice]').forEach((button) => {
  button.addEventListener('click', () => {
    button.closest('[data-viewer-notice]').hidden = true;
  });
});

function showNotice(element) {
  element.closest('[data-viewer-notice]').hidden = false;
}

let fileStatusTimeout;
let cameraHelpTimeout;

function showFileStatusTemporarily() {
  showNotice(fileStatus);
  window.clearTimeout(fileStatusTimeout);
  fileStatusTimeout = window.setTimeout(() => {
    fileStatus.closest('[data-viewer-notice]').hidden = true;
  }, 5000);
}

function showCameraHelpTemporarily() {
  showNotice(cameraHelp);
  window.clearTimeout(cameraHelpTimeout);
  cameraHelpTimeout = window.setTimeout(() => {
    cameraHelp.closest('[data-viewer-notice]').hidden = true;
  }, 5000);
}

showFileStatusTemporarily();
showCameraHelpTemporarily();

loadMapButton.addEventListener('click', () => {
  editor.closeMoreMenu();
  mapFileInput.click();
});

function exportStl() {
  editor.closeMoreMenu();

  const requestedSize = window.prompt(t('export.sizePrompt'), '5');
  if (requestedSize === null) return;

  const blockSizeMm = Number(requestedSize.trim().replace(',', '.'));
  if (!Number.isFinite(blockSizeMm) || blockSizeMm <= 0) {
    window.alert(t('export.invalidSize'));
    return;
  }

  if (world.children.length === 0) {
    window.alert(t('export.emptyMap'));
    return;
  }

  const exportRoot = new THREE.Group();
  world.children.forEach((child) => exportRoot.add(child.clone(true)));
  exportRoot.rotation.x = Math.PI / 2;
  exportRoot.scale.setScalar(blockSizeMm);
  exportRoot.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const stl = exporter.parse(exportRoot, { binary: true });
  const blob = new Blob([stl], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = voxelMap.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'voxel-map';

  link.href = url;
  link.download = `${safeName}-${blockSizeMm}mm.stl`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

exportStlButtons.forEach((button) => button.addEventListener('click', exportStl));

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
    fileStatusMessage = { key: 'status.fileLoaded', values: { file: file.name } };
    fileStatus.textContent = t(fileStatusMessage.key, fileStatusMessage.values);
    fileStatus.classList.remove('error');
    showFileStatusTemporarily();
  } catch (error) {
    fileStatusMessage = { key: 'status.loadFailed', values: { message: error.message } };
    fileStatus.textContent = t(fileStatusMessage.key, fileStatusMessage.values);
    fileStatus.classList.add('error');
    showFileStatusTemporarily();
  } finally {
    event.target.value = '';
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

function renderMainLanguage() {
  document.title = t('app.title');
  cameraModePrefix.textContent = t('viewer.mode');
  cameraModeToggle.setAttribute('aria-label', t('viewer.toggleMode'));
  viewerNotices.setAttribute('aria-label', t('viewer.information'));
  closeFileStatusButton.setAttribute('aria-label', t('viewer.closeMapStatus'));
  closeCameraHelpButton.setAttribute('aria-label', t('viewer.closeCameraHelp'));
  cameraToolbar.setAttribute('aria-label', t('viewer.cameraControls'));
  cameraTopButton.textContent = t('viewer.top');
  cameraNorthButton.textContent = t('viewer.north');
  cameraRotateButton.textContent = t('viewer.rotate');
  donationToggle.textContent = t('donation.button');
  donationToggle.setAttribute('aria-label', t('donation.selectRegion'));
  donationRegionButtons.forEach((button) => {
    button.textContent = t(`donation.${button.dataset.donationRegion}`);
  });
  cameraModeLabel.textContent = cameraMode === 'orbit' ? 'Orbit' : 'Explore';
  cameraModeButton.textContent = t(
    cameraMode === 'orbit' ? 'camera.switchExplore' : 'camera.switchOrbit',
  );
  cameraHelp.textContent = t(
    cameraMode === 'orbit' ? 'camera.orbitHelp' : 'camera.exploreHelp',
  );
  fileStatus.textContent = t(fileStatusMessage.key, fileStatusMessage.values);
  rebuildCardinalMarkers();
}

renderMainLanguage();
subscribeLanguage(renderMainLanguage);

function closeDonationMenu() {
  donationOptions.hidden = true;
  donationToggle.setAttribute('aria-expanded', 'false');
}

function getDonationUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function setupDonations() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}donations.json`, {
      cache: 'no-store',
    });
    if (!response.ok) return;

    const config = await response.json();
    let configuredRegions = 0;

    donationRegionButtons.forEach((button) => {
      const url = getDonationUrl(config[button.dataset.donationRegion]);
      button.hidden = !url;
      if (!url) return;

      configuredRegions += 1;
      button.addEventListener('click', () => {
        closeDonationMenu();
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });

    if (configuredRegions === 0) return;

    donationToggle.addEventListener('click', () => {
      const willOpen = donationOptions.hidden;
      donationOptions.hidden = !willOpen;
      donationToggle.setAttribute('aria-expanded', String(willOpen));
    });
    donationControl.hidden = false;
  } catch {
    // The donation configuration is optional.
  }
}

setupDonations();

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.donation-control')) closeDonationMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDonationMenu();
});

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
  renderMainLanguage();
  showCameraHelpTemporarily();
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
  renderMainLanguage();
  showCameraHelpTemporarily();
}

function toggleCameraMode() {
  editor.closeMoreMenu();
  if (cameraMode === 'orbit') {
    exploreControls.lock();
  } else {
    exploreControls.unlock();
  }
}

cameraModeButton.addEventListener('click', toggleCameraMode);
cameraModeToggle.addEventListener('click', toggleCameraMode);

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
  if (![
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
    'ShiftLeft',
    'ShiftRight',
  ].includes(event.code)) return;
  pressedKeys.add(event.code);
  event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => pressedKeys.clear());

function updateExploreMovement(delta) {
  if (cameraMode !== 'explore' || !exploreControls.isLocked) return;

  movement.set(
    Number(pressedKeys.has('KeyD')) - Number(pressedKeys.has('KeyA')),
    Number(pressedKeys.has('Space'))
      - Number(pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')),
    Number(pressedKeys.has('KeyW')) - Number(pressedKeys.has('KeyS')),
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
