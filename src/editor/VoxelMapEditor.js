import { VOXEL_TYPES } from '../map/VoxelMap.js';
import {
  getLanguage,
  LANGUAGES,
  setLanguage,
  subscribeLanguage,
  t,
} from '../i18n.js';

const TOOL_LABELS = {
  block: 'tool.block',
  stairs: 'tool.stairs',
  archDoor: 'tool.archDoor',
  erase: 'tool.erase',
};

const STAIR_DIRECTIONS = [
  { value: 'north', labelKey: 'direction.north', icon: '↑' },
  { value: 'east', labelKey: 'direction.east', icon: '→' },
  { value: 'south', labelKey: 'direction.south', icon: '↓' },
  { value: 'west', labelKey: 'direction.west', icon: '←' },
];

const ARCH_DOOR_DIRECTIONS = [
  { value: 'north-south', labelKey: 'direction.northSouth', icon: '↕' },
  { value: 'east-west', labelKey: 'direction.eastWest', icon: '↔' },
];

const TOOL_SHORTCUTS = {
  Digit1: 'block',
  Digit2: 'stairs',
  Digit3: 'archDoor',
  Digit4: 'erase',
};

const ARROW_MOVEMENT = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export class VoxelMapEditor {
  constructor(container, voxelMap) {
    this.container = container;
    this.map = voxelMap;
    this.level = 0;
    this.tool = 'block';
    this.stairsDirectionIndex = 0;
    this.archDoorDirectionIndex = 0;
    this.cursorX = 10;
    this.cursorY = 10;
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
        <h2>Voxel Path</h2>
        <div class="level-controls">
          <button type="button" data-level="down">−</button>
          <strong><span data-level-title></span> <span data-level-label>0</span></strong>
          <button type="button" data-level="up">+</button>
        </div>
      </div>
      <div class="history-controls">
        <button type="button" data-undo></button>
        <button type="button" data-redo></button>
        <div class="more-menu">
          <button type="button" data-more aria-expanded="false" aria-haspopup="menu"></button>
          <div class="more-options" role="menu" data-more-options hidden>
            <label class="language-control">
              <span data-language-label></span>
              <select data-language></select>
            </label>
            <button id="load-map-option" type="button" role="menuitem"></button>
            <button id="export-json-option" type="button" role="menuitem"></button>
            <button id="export-stl-option" type="button" role="menuitem" data-export-stl></button>
            <button id="camera-mode" type="button" role="menuitem"></button>
            <span class="more-divider" aria-hidden="true"></span>
            <button type="button" role="menuitem" data-clear-layer></button>
            <button type="button" role="menuitem" data-clear-all></button>
          </div>
        </div>
      </div>
      <div class="editor-tools" role="toolbar"></div>
      <button class="direction-control" type="button" data-direction-control></button>
      <div class="editor-grid" role="grid"></div>
      <p class="editor-hint"><span data-hint-primary></span><br><span data-hint-keyboard></span></p>
      <div class="export-controls">
        <button class="export-map" type="button" data-save-map></button>
        <button class="export-map" type="button" data-export-stl></button>
      </div>
    `;

    this.levelLabel = this.container.querySelector('[data-level-label]');
    this.levelTitle = this.container.querySelector('[data-level-title]');
    this.levelDown = this.container.querySelector('[data-level="down"]');
    this.levelUp = this.container.querySelector('[data-level="up"]');
    this.undoButton = this.container.querySelector('[data-undo]');
    this.redoButton = this.container.querySelector('[data-redo]');
    this.moreButton = this.container.querySelector('[data-more]');
    this.moreOptions = this.container.querySelector('[data-more-options]');
    this.clearLayerButton = this.container.querySelector('[data-clear-layer]');
    this.clearAllButton = this.container.querySelector('[data-clear-all]');
    this.toolsElement = this.container.querySelector('.editor-tools');
    this.directionButton = this.container.querySelector('[data-direction-control]');
    this.saveMapButton = this.container.querySelector('[data-save-map]');
    this.exportJsonOption = this.container.querySelector('#export-json-option');
    this.gridElement = this.container.querySelector('.editor-grid');
    this.languageSelect = this.container.querySelector('[data-language]');

    for (const { code, label } of LANGUAGES) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = label;
      this.languageSelect.appendChild(option);
    }

    for (const tool of [...VOXEL_TYPES, 'erase']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tool = tool;
      button.textContent = t(TOOL_LABELS[tool]);
      button.addEventListener('click', () => this.selectTool(tool));
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
        cell.setAttribute('aria-label', t('editor.cell', { x, y }));
        this.gridElement.appendChild(cell);
        this.cells.push(cell);
      }
    }

    this.levelDown.addEventListener('click', () => this.setLevel(this.level - 1));
    this.levelUp.addEventListener('click', () => this.setLevel(this.level + 1));
    this.undoButton.addEventListener('click', () => this.map.undo());
    this.redoButton.addEventListener('click', () => this.map.redo());
    this.moreButton.addEventListener('click', () => this.toggleMoreMenu());
    this.languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));
    this.clearLayerButton.addEventListener('click', () => {
      if (window.confirm(t('editor.clearLayerConfirm', { level: this.level }))) {
        this.map.clearLayer(this.level);
      }
      this.closeMoreMenu();
    });
    this.clearAllButton.addEventListener('click', () => {
      if (window.confirm(t('editor.clearAllConfirm'))) {
        this.map.clearAll();
      }
      this.closeMoreMenu();
    });
    this.directionButton.addEventListener('click', () => this.rotateCurrentTool());
    this.saveMapButton.addEventListener('click', () => this.saveMap());
    this.exportJsonOption.addEventListener('click', () => {
      this.saveMap();
      this.closeMoreMenu();
    });

    this.gridElement.addEventListener('pointerdown', (event) => {
      const cell = event.target.closest('.editor-cell');
      if (!cell) return;
      this.setCursorFromCell(cell);

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
        this.setCursorFromCell(cell);
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
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.more-menu')) this.closeMoreMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeMoreMenu();
      this.handleKeyboard(event);
    });

    this.renderLanguage();
    this.unsubscribeLanguage = subscribeLanguage(() => {
      this.renderLanguage();
      this.render();
    });
  }

  setLevel(level) {
    this.level = Math.max(0, Math.min(this.map.levels - 1, level));
    this.render();
  }

  selectTool(tool) {
    this.tool = tool;
    this.renderTools();
  }

  rotateCurrentTool() {
    if (this.tool === 'stairs') {
      this.stairsDirectionIndex = (this.stairsDirectionIndex + 1) % STAIR_DIRECTIONS.length;
    } else if (this.tool === 'archDoor') {
      this.archDoorDirectionIndex = (this.archDoorDirectionIndex + 1)
        % ARCH_DOOR_DIRECTIONS.length;
    }
    this.renderTools();
  }

  setCursorFromCell(cell) {
    this.cursorX = Number(cell.dataset.x);
    this.cursorY = Number(cell.dataset.y);
    this.renderCursor();
  }

  moveCursor(deltaX, deltaY) {
    this.cursorX = Math.max(0, Math.min(this.map.width - 1, this.cursorX + deltaX));
    this.cursorY = Math.max(0, Math.min(this.map.height - 1, this.cursorY + deltaY));
    this.renderCursor();
  }

  renderCursor() {
    this.cells.forEach((cell) => cell.classList.remove('is-cursor'));
    this.cells[this.cursorY * this.map.width + this.cursorX]?.classList.add('is-cursor');
  }

  handleKeyboard(event) {
    const target = event.target;
    if (
      document.pointerLockElement
      || target.matches('input, textarea, select')
    ) return;

    if (event.ctrlKey && event.code === 'KeyZ') {
      event.preventDefault();
      this.map.undo();
      return;
    }

    if (event.ctrlKey && event.code === 'KeyX') {
      event.preventDefault();
      this.map.redo();
      return;
    }

    if (TOOL_SHORTCUTS[event.code]) {
      event.preventDefault();
      this.selectTool(TOOL_SHORTCUTS[event.code]);
      return;
    }

    if (ARROW_MOVEMENT[event.code]) {
      event.preventDefault();
      this.moveCursor(...ARROW_MOVEMENT[event.code]);
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      const cell = this.cells[this.cursorY * this.map.width + this.cursorX];
      this.applyTool(cell, this.tool);
    } else if (event.code === 'PageDown') {
      event.preventDefault();
      this.setLevel(this.level + 1);
    } else if (event.code === 'PageUp') {
      event.preventDefault();
      this.setLevel(this.level - 1);
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      this.rotateCurrentTool();
    }
  }

  finishPainting() {
    if (!this.isPainting) return;
    this.isPainting = false;
    this.map.endTransaction();
    this.renderHistoryControls();
  }

  toggleMoreMenu() {
    const willOpen = this.moreOptions.hidden;
    this.moreOptions.hidden = !willOpen;
    this.moreButton.setAttribute('aria-expanded', String(willOpen));
  }

  closeMoreMenu() {
    this.moreOptions.hidden = true;
    this.moreButton.setAttribute('aria-expanded', 'false');
  }

  renderLanguage() {
    this.levelTitle.textContent = t('editor.level');
    this.levelDown.setAttribute('aria-label', t('editor.levelDown'));
    this.levelUp.setAttribute('aria-label', t('editor.levelUp'));
    this.container.querySelector('.history-controls')
      .setAttribute('aria-label', t('editor.history'));
    this.undoButton.textContent = t('editor.undo');
    this.redoButton.textContent = t('editor.redo');
    this.moreButton.textContent = t('editor.more');
    this.container.querySelector('#load-map-option').textContent = t('editor.loadJson');
    this.exportJsonOption.textContent = t('editor.exportJson');
    this.container.querySelector('#export-stl-option').textContent = t('editor.exportStl');
    this.container.querySelector('.export-controls [data-export-stl]').textContent = t('editor.exportStl');
    this.clearLayerButton.textContent = t('editor.clearLayer');
    this.clearAllButton.textContent = t('editor.clearAll');
    this.container.querySelector('[data-language-label]').textContent = t('language.label');
    this.languageSelect.setAttribute('aria-label', t('language.label'));
    this.languageSelect.value = getLanguage();
    this.toolsElement.setAttribute('aria-label', t('editor.tools'));
    this.gridElement.setAttribute('aria-label', t('editor.grid'));
    this.container.querySelector('[data-hint-primary]').textContent = t('editor.hintPrimary');
    this.container.querySelector('[data-hint-keyboard]').textContent = t('editor.hintKeyboard');
    this.saveMapButton.textContent = t('editor.exportJson');

    for (const button of this.toolsElement.children) {
      button.textContent = t(TOOL_LABELS[button.dataset.tool]);
    }

    for (const cell of this.cells) {
      cell.setAttribute('aria-label', t('editor.cell', {
        x: cell.dataset.x,
        y: cell.dataset.y,
      }));
    }
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
          cell.title += ` · ${t('editor.stairsToward', {
            direction: t(direction.labelKey).toLowerCase(),
          })}`;
        } else if (voxel.type === 'archDoor') {
          const direction = ARCH_DOOR_DIRECTIONS.find(({ value }) => value === voxel.direction)
            ?? ARCH_DOOR_DIRECTIONS[0];
          cell.textContent = direction.icon;
          cell.title += ` · ${t('editor.archDoorDirection', {
            direction: t(direction.labelKey),
          })}`;
        }
      } else if (voxelBelow) {
        cell.classList.add('has-voxel-below');
        cell.title += ` · ${t('editor.voxelBelow', {
          type: t(TOOL_LABELS[voxelBelow.type] ?? voxelBelow.type),
        })}`;
        delete cell.dataset.type;
      } else {
        delete cell.dataset.type;
      }

      if (x === this.cursorX && y === this.cursorY) {
        cell.classList.add('is-cursor');
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
      this.directionButton.textContent = t('editor.rotateStairs', {
        icon: direction.icon,
        direction: t(direction.labelKey),
      });
      this.directionButton.style.visibility = 'visible';
      this.directionButton.setAttribute('aria-hidden', 'false');
    } else if (this.tool === 'archDoor') {
      const direction = ARCH_DOOR_DIRECTIONS[this.archDoorDirectionIndex];
      this.directionButton.textContent = t('editor.orientDoor', {
        icon: direction.icon,
        direction: t(direction.labelKey),
      });
      this.directionButton.style.visibility = 'visible';
      this.directionButton.setAttribute('aria-hidden', 'false');
    } else {
      this.directionButton.textContent = t('editor.directionControl');
      this.directionButton.style.visibility = 'hidden';
      this.directionButton.setAttribute('aria-hidden', 'true');
    }
  }

  renderHistoryControls() {
    this.undoButton.disabled = !this.map.canUndo;
    this.redoButton.disabled = !this.map.canRedo;
  }
}
