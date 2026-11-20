// InputSystem — Captura teclado e preenche engine.input
// Separa input da lógica de movimento

import { System } from '../core/System.js';
import { KEYS, DIRS } from '../utils/constants.js';

export class InputSystem extends System {
  constructor() {
    super(100); // Prioridade alta - roda primeiro
    this.requiredComponents = []; // Não opera sobre entities
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  onAdd(game) {
    this.engine = game;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  onRemove() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  onKeyDown(e) {
    if (!this.engine) return;
    const code = e.code;
    this.engine.input.keys.add(code);
    this.engine.input.justPressed.add(code);

    // DEBUG: só loga teclas de direção
    const dirKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (dirKeys.includes(code)) {
      console.log(`⌨️ KeyDown: ${code}`);
    }

    // Previne scroll com setas/espaço
    if ([KEYS.SPACE, KEYS.ARROW_UP, KEYS.ARROW_DOWN, KEYS.ARROW_LEFT, KEYS.ARROW_RIGHT].includes(code)) {
      e.preventDefault();
    }
  }

  // Consome input e guarda última direção pressionada (chamado no update da scene)
  update(dt, entities, game) {
    console.log(`🎮 InputSystem.update CHAMADO | justPressed: [${[...this.engine.input.justPressed].join(', ')}]`);

    // Processa justPressed ANTES que o Engine limpe
    this.lastDirection = null;

    for (const [dirName, dir] of Object.entries(DIRS)) {
      for (const key of dir.key) {
        if (this.engine.input.justPressed.has(key)) {
          this.lastDirection = { name: dirName, ...dir };
          console.log(`   ✅ Detectou: ${dirName} via ${key}`);
          break;
        }
      }
      if (this.lastDirection) break;
    }

    if (this.lastDirection) {
      console.log(`🎮 InputSystem.update: direção consumida = ${this.lastDirection.name}`);
    }
  }

  onKeyUp(e) {
    if (!this.engine) return;
    const code = e.code;
    this.engine.input.keys.delete(code);
    this.engine.input.justReleased.add(code);
  }

  // Verifica se direção foi pressionada agora
  getDirectionPressed() {
    if (!this.engine) return null;

    for (const [dirName, dir] of Object.entries(DIRS)) {
      for (const key of dir.key) {
        if (this.engine.input.justPressed.has(key)) {
          return { name: dirName, ...dir };
        }
      }
    }
    return null;
  }

  // Verifica se tecla específica foi pressionada
  wasPressed(keyCode) {
    return this.engine?.input.justPressed.has(keyCode) || false;
  }

  // Verifica se tecla está segurada
  isHeld(keyCode) {
    return this.engine?.input.keys.has(keyCode) || false;
  }

  update(dt, entities, game) {
    // InputSystem não processa entities - apenas atualiza estado interno
    // Outros systems usam getDirectionPressed(), wasPressed(), isHeld()
  }
}