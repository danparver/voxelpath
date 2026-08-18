const catalogs = {
  en: {
    'app.title': '3D Maze',
    'language.label': 'Language',
    'viewer.mode': 'Mode:',
    'viewer.toggleMode': 'Toggle camera mode',
    'viewer.information': '3D view information',
    'viewer.closeMapStatus': 'Close map status',
    'viewer.closeCameraHelp': 'Close camera help',
    'viewer.cameraControls': '3D camera controls',
    'viewer.top': 'TOP VIEW',
    'viewer.north': 'ALIGN WITH 2D',
    'viewer.rotate': 'ROTATE 90°',
    'donation.button': 'DONATE',
    'donation.selectRegion': 'Select donation region',
    'donation.argentina': 'Argentina',
    'donation.worldwide': 'Rest of the world',
    'donation.notConfigured': 'This donation link has not been configured yet.',
    'status.exampleLoaded': 'Example map loaded',
    'status.fileLoaded': '{file} loaded',
    'status.loadFailed': 'Could not load: {message}',
    'camera.switchExplore': 'Switch to Explore',
    'camera.switchOrbit': 'Return to Orbit (Esc)',
    'camera.orbitHelp': 'Orbit: drag to rotate and use the wheel to zoom.',
    'camera.exploreHelp': 'Esc: exit Explore.\nWASD moves · Space goes up · Shift goes down · Mouse looks around.',
    'editor.level': 'Level Z:',
    'editor.levelDown': 'Lower level',
    'editor.levelUp': 'Raise level',
    'editor.history': 'Edit history',
    'editor.undo': 'Undo',
    'editor.redo': 'Redo',
    'editor.more': 'MENU',
    'editor.loadJson': 'Load JSON map',
    'editor.exportJson': 'Export JSON',
    'editor.exportStl': 'Export STL',
    'editor.clearLayer': 'Clear current layer',
    'editor.clearAll': 'Clear all',
    'editor.tools': 'Tools',
    'editor.grid': '20 by 20 voxel map',
    'editor.hintPrimary': 'Drag to paint · Right click to erase',
    'editor.hintKeyboard': 'Arrows move · Space places · 1–4 selects',
    'editor.cell': 'Cell {x}, {y}',
    'editor.clearLayerConfirm': 'Clear every element from layer Z {level}?',
    'editor.clearAllConfirm': 'Clear every element from the map?',
    'editor.stairsToward': 'Stairs facing {direction}',
    'editor.archDoorDirection': 'Arch door {direction}',
    'editor.voxelBelow': '{type} at Z-1',
    'editor.rotateStairs': 'Rotate stairs: {icon} {direction}',
    'editor.orientDoor': 'Orient door: {icon} {direction}',
    'editor.directionControl': 'Direction control',
    'tool.block': 'Block',
    'tool.stairs': 'Stairs',
    'tool.archDoor': 'Arch door',
    'tool.erase': 'Erase',
    'direction.north': 'North',
    'direction.east': 'East',
    'direction.south': 'South',
    'direction.west': 'West',
    'direction.northSouth': 'N–S',
    'direction.eastWest': 'E–W',
    'direction.westShort': 'W',
    'export.sizePrompt': 'What size should each block be, in mm?',
    'export.invalidSize': 'Enter a block size greater than 0 mm.',
    'export.emptyMap': 'The map is empty. Add at least one element before exporting.',
    'error.unknownVoxel': 'Unknown voxel type: {type}',
    'error.invalidJson': 'The JSON must contain a "voxels" array.',
    'error.coordinates': 'Coordinates outside the map: ({x}, {y}, {z}). Expected x=0–{maxX}, y=0–{maxY}, z=0–{maxZ}.',
  },
  es: {
    'app.title': 'Laberinto 3D',
    'language.label': 'Idioma',
    'viewer.mode': 'Modo:',
    'viewer.toggleMode': 'Alternar modo de cámara',
    'viewer.information': 'Información de la vista 3D',
    'viewer.closeMapStatus': 'Cerrar estado del mapa',
    'viewer.closeCameraHelp': 'Cerrar ayuda de cámara',
    'viewer.cameraControls': 'Controles de cámara 3D',
    'viewer.top': 'VISTA TOP',
    'viewer.north': 'ALINEAR CON 2D',
    'viewer.rotate': 'ROTAR 90°',
    'donation.button': 'DONATE',
    'donation.selectRegion': 'Seleccionar región para donar',
    'donation.argentina': 'Argentina',
    'donation.worldwide': 'Resto del mundo',
    'donation.notConfigured': 'Este enlace de donación aún no está configurado.',
    'status.exampleLoaded': 'Mapa de ejemplo cargado',
    'status.fileLoaded': '{file} cargado',
    'status.loadFailed': 'No se pudo cargar: {message}',
    'camera.switchExplore': 'Cambiar a Explore',
    'camera.switchOrbit': 'Volver a Orbit (Esc)',
    'camera.orbitHelp': 'Orbit: arrastra para rotar y usa la rueda para acercar.',
    'camera.exploreHelp': 'Esc: salir de Explore.\nWASD mueve · Espacio sube · Shift baja · El mouse permite mirar.',
    'editor.level': 'Nivel Z:',
    'editor.levelDown': 'Bajar nivel',
    'editor.levelUp': 'Subir nivel',
    'editor.history': 'Historial de edición',
    'editor.undo': 'Deshacer',
    'editor.redo': 'Rehacer',
    'editor.more': 'MENU',
    'editor.loadJson': 'Cargar mapa JSON',
    'editor.exportJson': 'Exportar JSON',
    'editor.exportStl': 'Exportar STL',
    'editor.clearLayer': 'Borrar capa actual',
    'editor.clearAll': 'Borrar todo',
    'editor.tools': 'Herramientas',
    'editor.grid': 'Mapa de voxeles 20 por 20',
    'editor.hintPrimary': 'Arrastra para pintar · Click derecho para borrar',
    'editor.hintKeyboard': 'Flechas mueven · Espacio coloca · 1–4 selecciona',
    'editor.cell': 'Celda {x}, {y}',
    'editor.clearLayerConfirm': '¿Borrar todos los elementos de la capa Z {level}?',
    'editor.clearAllConfirm': '¿Borrar todos los elementos del mapa?',
    'editor.stairsToward': 'Escalera hacia {direction}',
    'editor.archDoorDirection': 'Puerta de arco {direction}',
    'editor.voxelBelow': '{type} en Z-1',
    'editor.rotateStairs': 'Rotar escalera: {icon} {direction}',
    'editor.orientDoor': 'Orientar puerta: {icon} {direction}',
    'editor.directionControl': 'Control de dirección',
    'tool.block': 'Bloque',
    'tool.stairs': 'Escalera',
    'tool.archDoor': 'Puerta arco',
    'tool.erase': 'Borrar',
    'direction.north': 'Norte',
    'direction.east': 'Este',
    'direction.south': 'Sur',
    'direction.west': 'Oeste',
    'direction.northSouth': 'N–S',
    'direction.eastWest': 'E–O',
    'direction.westShort': 'O',
    'export.sizePrompt': '¿Qué tamaño debe tener cada bloque, en mm?',
    'export.invalidSize': 'Ingresa un tamaño de bloque mayor que 0 mm.',
    'export.emptyMap': 'El mapa está vacío. Agrega al menos un elemento antes de exportar.',
    'error.unknownVoxel': 'Tipo de voxel desconocido: {type}',
    'error.invalidJson': 'El JSON debe contener un arreglo "voxels".',
    'error.coordinates': 'Coordenadas fuera del mapa: ({x}, {y}, {z}). Se esperaba x=0–{maxX}, y=0–{maxY}, z=0–{maxZ}.',
  },
};

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const listeners = new Set();
const savedLanguage = window.localStorage.getItem('voxel-path-language');
let currentLanguage = Object.hasOwn(catalogs, savedLanguage) ? savedLanguage : 'en';

document.documentElement.lang = currentLanguage;

export function getLanguage() {
  return currentLanguage;
}

export function t(key, values = {}) {
  const template = catalogs[currentLanguage][key] ?? catalogs.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

export function setLanguage(language) {
  if (!Object.hasOwn(catalogs, language) || language === currentLanguage) return;
  currentLanguage = language;
  document.documentElement.lang = language;
  window.localStorage.setItem('voxel-path-language', language);
  listeners.forEach((listener) => listener(language));
}

export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
