import { VOXEL_TYPES } from '../map/VoxelMap.js';

const TOOL_LABELS = {
  block: 'Block',
  stairs: 'Stairs',
  archDoor: 'Puerta arco',
  erase: 'Erase',
};

const STAIR_DIRECTIONS = [
  { value: 'north', label: 'Norte', icon: '↑' },
  { value: 'east', label: 'Este', icon: '→' },
  { value: 'south', label: 'Sur', icon: '↓' },
  { value: 'west', label: 'Oeste', icon: '←' },
];

const ARCH_DOOR_DIRECTIONS = [
  { value: 'north-south', label: 'N–S', icon: '↕' },
  { value: 'east-west', label: 'E–O', icon: '↔' },
];

export class VoxelMapEditor {
  constructor(container, voxelMap) {
    this.container = container;
    this.map = voxelMap;
    this.level = 0;
    this.tool = 'block';
    this.stairsDirectionIndex = 0;
    this.archDoorDirectionIndex = 0;
    this.isPainting = false;
    this.cells = [];

    this.build();
    this.unsubscribe = this.map.subscribe(() => this.render());
    this.render();
  }

  build() {
    this.container.classList.add('voxel-editor');
    this.container.innerHTML = `
      <div class="editor-header">
        <h2>Editor 2D</h2>
        <div class="level-controls">
          <button type="button" data-level="down" aria-label="Bajar nivel">−</button>
          <strong>Nivel Z: <span data-level-label>0</span></strong>
          <button type="button" data-level="up" aria-label="Subir nivel">+</button>
        </div>
      </div>
      <div class="history-controls" aria-label="Historial de edición">
        <button type="button" data-undo>ATRÁS</button>
        <button type="button" data-redo>ADELANTE</button>
      </div>
      <div class="editor-tools" role="toolbar" aria-label="Herramientas"></div>
      <button class="direction-control" type="button" data-direction-control></button>
      <div class="editor-grid" role="grid" aria-label="Mapa de voxeles 20 por 20"></div>
      <p class="editor-hint">Arrastra para pintar · Click derecho para borrar</p>
      <button class="save-map" type="button" data-save-map>Guardar JSON</button>
    `;

    this.levelLabel = this.container.querySelector('[data-level-label]');
    this.levelDown = this.container.querySelector('[data-level="down"]');
    this.levelUp = this.container.querySelector('[data-level="up"]');
    this.undoButton = this.container.querySelector('[data-undo]');
    this.redoButton = this.container.querySelector('[data-redo]');
    this.toolsElement = this.container.querySelector('.editor-tools');
    this.directionButton = this.container.querySelector('[data-direction-control]');
    this.saveMapButton = this.container.querySelector('[data-save-map]');
    this.gridElement = this.container.querySelector('.editor-grid');

    for (const tool of [...VOXEL_TYPES, 'erase']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tool = tool;
      button.textContent = TOOL_LABELS[tool];
      button.addEventListener('click', () => {
        this.tool = tool;
        this.renderTools();
      });
      this.toolsElement.appendChild(button);
    }

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'editor-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Celda ${x}, ${y}`);
        this.gridElement.appendChild(cell);
        this.cells.push(cell);
      }
    }

    this.levelDown.addEventListener('click', () => this.setLevel(this.level - 1));
    this.levelUp.addEventListener('click', () => this.setLevel(this.level + 1));
    this.undoButton.addEventListener('click', () => this.map.undo());
    this.redoButton.addEventListener('click', () => this.map.redo());
    this.directionButton.addEventListener('click', () => {
      if (this.tool === 'stairs') {
        this.stairsDirectionIndex = (this.stairsDirectionIndex + 1) % STAIR_DIRECTIONS.length;
      } else if (this.tool === 'archDoor') {
        this.archDoorDirectionIndex = (this.archDoorDirectionIndex + 1)
          % ARCH_DOOR_DIRECTIONS.length;
      }
      this.renderTools();
    });
    this.saveMapButton.addEventListener('click', () => this.saveMap());

    this.gridElement.addEventListener('pointerdown', (event) => {
      const cell = event.target.closest('.editor-cell');
      if (!cell) return;

      if (event.button === 0) {
        this.isPainting = true;
        this.map.beginTransaction();
        this.applyTool(cell, this.tool);
      } else if (event.button === 2) {
        this.applyTool(cell, 'erase');
      }
    });

    this.gridElement.addEventListener('pointerover', (event) => {
      const cell = event.target.closest('.editor-cell');
      if (cell && this.isPainting && (event.buttons & 1) === 1) {
        this.applyTool(cell, this.tool);
      }
    });

    this.gridElement.addEventListener('contextmenu', (event) => {
      const cell = event.target.closest('.editor-cell');
      if (!cell) return;
      event.preventDefault();
      this.applyTool(cell, 'erase');
    });

    this.gridElement.addEventListener('dragstart', (event) => event.preventDefault());
    window.addEventListener('pointerup', () => this.finishPainting());
    window.addEventListener('pointercancel', () => this.finishPainting());
  }

  setLevel(level) {
    this.level = Math.max(0, Math.min(this.map.levels - 1, level));
    this.render();
  }

  finishPainting() {
    if (!this.isPainting) return;
    this.isPainting = false;
    this.map.endTransaction();
    this.renderHistoryControls();
  }

  saveMap() {
    const json = JSON.stringify(this.map.toJSON(), null, 2);
    const blob = new Blob([`${json}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = this.map.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'voxel-map';

    link.href = url;
    link.download = `${safeName}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  applyTool(cell, tool) {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);

    if (tool === 'erase') {
      this.map.eraseVoxel(x, y, this.level);
    } else {
      let properties = {};
      if (tool === 'stairs') {
        properties = { direction: STAIR_DIRECTIONS[this.stairsDirectionIndex].value };
      } else if (tool === 'archDoor') {
        properties = { direction: ARCH_DOOR_DIRECTIONS[this.archDoorDirectionIndex].value };
      }
      this.map.setVoxel(x, y, this.level, tool, properties);
    }
  }

  render() {
    this.levelLabel.textContent = this.level;
    this.levelDown.disabled = this.level === 0;
    this.levelUp.disabled = this.level === this.map.levels - 1;
    this.renderHistoryControls();
    this.renderTools();

    for (const cell of this.cells) {
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      const voxel = this.map.getVoxel(x, y, this.level);
      const voxelBelow = this.level > 0
        ? this.map.getVoxel(x, y, this.level - 1)
        : null;

      cell.className = 'editor-cell';
      cell.textContent = '';
      cell.title = `x: ${x}, y: ${y}, z: ${this.level}`;

      if (voxel) {
        cell.classList.add(`is-${voxel.type}`);
        cell.dataset.type = voxel.type;
        if (voxel.type === 'stairs') {
          const direction = STAIR_DIRECTIONS.find(({ value }) => value === voxel.direction)
            ?? STAIR_DIRECTIONS[0];
          cell.textContent = direction.icon;
          cell.title += ` · Escalera hacia ${direction.label.toLowerCase()}`;
        } else if (voxel.type === 'archDoor') {
          const direction = ARCH_DOOR_DIRECTIONS.find(({ value }) => value === voxel.direction)
            ?? ARCH_DOOR_DIRECTIONS[0];
          cell.textContent = direction.icon;
          cell.title += ` · Puerta de arco ${direction.label}`;
        }
      } else if (voxelBelow) {
        cell.classList.add('has-voxel-below');
        cell.title += ` · ${voxelBelow.type} en Z-1`;
        delete cell.dataset.type;
      } else {
        delete cell.dataset.type;
      }
    }
  }

  renderTools() {
    for (const button of this.toolsElement.children) {
      const active = button.dataset.tool === this.tool;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }

    if (this.tool === 'stairs') {
      const direction = STAIR_DIRECTIONS[this.stairsDirectionIndex];
      this.directionButton.textContent = `Rotar escalera: ${direction.icon} ${direction.label}`;
      this.directionButton.style.visibility = 'visible';
      this.directionButton.setAttribute('aria-hidden', 'false');
    } else if (this.tool === 'archDoor') {
      const direction = ARCH_DOOR_DIRECTIONS[this.archDoorDirectionIndex];
      this.directionButton.textContent = `Orientar puerta: ${direction.icon} ${direction.label}`;
      this.directionButton.style.visibility = 'visible';
      this.directionButton.setAttribute('aria-hidden', 'false');
    } else {
      this.directionButton.textContent = 'Control de dirección';
      this.directionButton.style.visibility = 'hidden';
      this.directionButton.setAttribute('aria-hidden', 'true');
    }
  }

  renderHistoryControls() {
    this.undoButton.disabled = !this.map.canUndo;
    this.redoButton.disabled = !this.map.canRedo;
  }
}
