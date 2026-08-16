export const VOXEL_TYPES = ['block', 'stairs', 'archDoor'];

const TYPE_SET = new Set(VOXEL_TYPES);
const HISTORY_LIMIT = 10;

export class VoxelMap {
  static WIDTH = 20;
  static HEIGHT = 20;
  static LEVELS = 8;

  constructor(data = { voxels: [] }) {
    this.width = VoxelMap.WIDTH;
    this.height = VoxelMap.HEIGHT;
    this.levels = VoxelMap.LEVELS;
    this.name = 'VoxelMap';
    this.voxelData = new Map();
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.transaction = null;
    this.replaceFromJSON(data, false);
  }

  get voxels() {
    return Array.from(this.voxelData.values(), (voxel) => ({ ...voxel }));
  }

  getVoxel(x, y, z) {
    return this.voxelData.get(this.key(x, y, z)) ?? null;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  setVoxel(x, y, z, type, properties = {}) {
    this.assertCoordinates(x, y, z);

    if (type === 'erase') {
      return this.eraseVoxel(x, y, z);
    }

    if (!TYPE_SET.has(type)) {
      throw new Error(`Tipo de voxel desconocido: ${type}`);
    }

    const key = this.key(x, y, z);
    const nextVoxel = { ...properties, type, x, y, z };
    const currentVoxel = this.voxelData.get(key);

    if (JSON.stringify(currentVoxel) === JSON.stringify(nextVoxel)) return false;

    const previousState = this.transaction ? null : this.captureState();
    this.voxelData.set(key, nextVoxel);
    this.recordChange(previousState);
    this.emit({ action: 'set', voxel: { ...nextVoxel } });
    return true;
  }

  eraseVoxel(x, y, z) {
    this.assertCoordinates(x, y, z);
    const key = this.key(x, y, z);
    if (!this.voxelData.has(key)) return false;

    const previousState = this.transaction ? null : this.captureState();
    this.voxelData.delete(key);
    this.recordChange(previousState);
    this.emit({ action: 'erase', x, y, z });
    return true;
  }

  replaceFromJSON(data, notify = true) {
    if (!data || !Array.isArray(data.voxels)) {
      throw new Error('El JSON debe contener un arreglo "voxels".');
    }

    const nextVoxels = new Map();

    for (const sourceVoxel of data.voxels) {
      const voxel = { ...sourceVoxel };
      voxel.type = voxel.type === 'ramp' ? 'stairs' : voxel.type;

      this.assertCoordinates(voxel.x, voxel.y, voxel.z);
      if (!TYPE_SET.has(voxel.type)) continue;

      nextVoxels.set(this.key(voxel.x, voxel.y, voxel.z), voxel);
    }

    const previousState = notify && !this.transaction ? this.captureState() : null;
    this.name = typeof data.name === 'string' ? data.name : 'VoxelMap';
    this.voxelData = nextVoxels;
    if (notify) {
      this.recordChange(previousState);
      this.emit({ action: 'replace' });
    }
  }

  beginTransaction() {
    if (this.transaction) return;
    this.transaction = { previousState: this.captureState(), changed: false };
  }

  endTransaction() {
    if (!this.transaction) return false;
    const { previousState, changed } = this.transaction;
    this.transaction = null;

    if (changed) {
      this.pushLimited(this.undoStack, previousState);
      this.redoStack = [];
    }

    return changed;
  }

  undo() {
    if (!this.canUndo) return false;

    const currentState = this.captureState();
    const previousState = this.undoStack.pop();
    this.pushLimited(this.redoStack, currentState);
    this.restoreState(previousState);
    this.emit({ action: 'undo' });
    return true;
  }

  redo() {
    if (!this.canRedo) return false;

    const currentState = this.captureState();
    const nextState = this.redoStack.pop();
    this.pushLimited(this.undoStack, currentState);
    this.restoreState(nextState);
    this.emit({ action: 'redo' });
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toJSON() {
    return {
      name: this.name,
      size: { x: this.width, y: this.height, z: this.levels },
      voxels: this.voxels,
    };
  }

  key(x, y, z) {
    return `${x},${y},${z}`;
  }

  captureState() {
    return {
      name: this.name,
      voxels: this.voxels,
    };
  }

  restoreState(state) {
    this.name = state.name;
    this.voxelData = new Map(
      state.voxels.map((voxel) => [this.key(voxel.x, voxel.y, voxel.z), { ...voxel }]),
    );
  }

  recordChange(previousState) {
    if (this.transaction) {
      this.transaction.changed = true;
      return;
    }

    this.pushLimited(this.undoStack, previousState);
    this.redoStack = [];
  }

  pushLimited(stack, state) {
    stack.push(state);
    if (stack.length > HISTORY_LIMIT) stack.shift();
  }

  assertCoordinates(x, y, z) {
    const valid = Number.isInteger(x)
      && Number.isInteger(y)
      && Number.isInteger(z)
      && x >= 0 && x < this.width
      && y >= 0 && y < this.height
      && z >= 0 && z < this.levels;

    if (!valid) {
      throw new Error(
        `Coordenadas fuera del mapa: (${x}, ${y}, ${z}). `
        + `Se esperaba x=0–${this.width - 1}, y=0–${this.height - 1}, z=0–${this.levels - 1}.`,
      );
    }
  }

  emit(change) {
    this.listeners.forEach((listener) => listener(change, this));
  }
}
