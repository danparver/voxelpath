import * as THREE from 'three';

function createLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  context.fillStyle = 'rgba(16, 20, 31, 0.9)';
  context.beginPath();
  context.arc(64, 64, 48, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 7;
  context.strokeStyle = color;
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '700 64px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 67);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(0.9);
  sprite.userData.texture = texture;
  return sprite;
}

export function createCardinalMarkers(gridSize = 20, westLabel = 'W') {
  const markers = new THREE.Group();
  const distance = gridSize / 2 + 0.7;
  const definitions = [
    { label: 'N', color: '#ef6461', position: [0, 0.55, -distance] },
    { label: 'S', color: '#64a8ef', position: [0, 0.55, distance] },
    { label: 'E', color: '#64a8ef', position: [distance, 0.55, 0] },
    { label: westLabel, color: '#64a8ef', position: [-distance, 0.55, 0] },
  ];

  markers.name = 'CardinalMarkers';
  for (const definition of definitions) {
    const marker = createLabel(definition.label, definition.color);
    marker.position.set(...definition.position);
    marker.name = `Cardinal-${definition.label}`;
    markers.add(marker);
  }

  return markers;
}
