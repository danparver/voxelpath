import * as THREE from 'three';

const BLOCK_SIZE = 1;
const RAMP_ROTATIONS = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

function createRampGeometry() {
  const half = BLOCK_SIZE / 2;
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      -half, 0, half,
      half, 0, half,
      -half, 0, -half,
      half, 0, -half,
      -half, BLOCK_SIZE, -half,
      half, BLOCK_SIZE, -half,
    ], 3),
  );
  geometry.setIndex([
    0, 2, 3, 0, 3, 1,
    2, 4, 5, 2, 5, 3,
    0, 4, 2,
    1, 3, 5,
    0, 1, 5, 0, 5, 4,
  ]);
  const rampGeometry = geometry.toNonIndexed();
  rampGeometry.computeVertexNormals();
  geometry.dispose();

  return rampGeometry;
}

function createArchGeometry() {
  const innerRadius = 0.3;
  const springHeight = 0.55;
  const shape = new THREE.Shape();

  shape.moveTo(-innerRadius, springHeight);
  shape.absarc(0, springHeight, innerRadius, Math.PI, 0, true);
  shape.lineTo(innerRadius, BLOCK_SIZE);
  shape.lineTo(-innerRadius, BLOCK_SIZE);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BLOCK_SIZE,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -BLOCK_SIZE / 2);
  return geometry;
}

function createArchDoor(pillarGeometry, archGeometry, material) {
  const door = new THREE.Group();
  const leftPillar = new THREE.Mesh(pillarGeometry, material);
  const rightPillar = new THREE.Mesh(pillarGeometry, material);
  const arch = new THREE.Mesh(archGeometry, material);

  leftPillar.position.set(-0.4, 0.5, 0);
  rightPillar.position.set(0.4, 0.5, 0);
  door.add(leftPillar, rightPillar, arch);

  return door;
}

export class World extends THREE.Group {
  constructor(map) {
    super();
    this.name = 'World';

    const mapWidth = map.width ?? map.size?.x ?? 20;
    const mapHeight = map.height ?? map.size?.y ?? 20;
    const offsetX = (mapWidth - 1) / 2;
    const offsetY = (mapHeight - 1) / 2;

    const blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      roughness: 0.75,
      metalness: 0.05,
    });
    const rampGeometry = createRampGeometry();
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2a65a,
      roughness: 0.8,
      metalness: 0.02,
    });
    const doorPillarGeometry = new THREE.BoxGeometry(0.2, BLOCK_SIZE, BLOCK_SIZE);
    const doorArchGeometry = createArchGeometry();
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9826b,
      roughness: 0.9,
      metalness: 0,
    });
    this.resources = [
      blockGeometry,
      blockMaterial,
      rampGeometry,
      rampMaterial,
      doorPillarGeometry,
      doorArchGeometry,
      doorMaterial,
    ];

    for (const voxel of map.voxels ?? []) {
      let element;
      const worldX = voxel.x - offsetX;
      const worldY = voxel.z;
      const worldZ = voxel.y - offsetY;

      if (voxel.type === 'block') {
        element = new THREE.Mesh(blockGeometry, blockMaterial);
        element.position.set(worldX, worldY + BLOCK_SIZE / 2, worldZ);
      } else if (voxel.type === 'stairs' || voxel.type === 'ramp') {
        element = new THREE.Mesh(rampGeometry, rampMaterial);
        element.position.set(worldX, worldY, worldZ);
        element.rotation.y = RAMP_ROTATIONS[voxel.direction] ?? RAMP_ROTATIONS.north;
        element.userData.direction = voxel.direction ?? 'north';
      } else if (voxel.type === 'archDoor') {
        element = createArchDoor(doorPillarGeometry, doorArchGeometry, doorMaterial);
        element.position.set(worldX, worldY, worldZ);
        element.rotation.y = voxel.direction === 'east-west' ? Math.PI / 2 : 0;
        element.userData.direction = voxel.direction ?? 'north-south';
      } else {
        continue;
      }

      element.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      element.name = `${voxel.type}-${voxel.x}-${voxel.y}-${voxel.z}`;
      this.add(element);
    }
  }

  dispose() {
    this.resources.forEach((resource) => resource.dispose());
    this.clear();
  }
}
