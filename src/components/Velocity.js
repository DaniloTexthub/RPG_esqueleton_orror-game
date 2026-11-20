// Velocity — Movimento suave (lerp) entre tiles
// Target = próximo tile alvo, progress = 0..1

import { Component } from '../core/Component.js';

export class Velocity extends Component {
  constructor() {
    super();
    this.targetX = 0;     // Grid X alvo
    this.targetY = 0;     // Grid Y alvo
    this.progress = 0;    // 0 = no tile atual, 1 = no target
    this.duration = 120;  // ms para completar movimento
    this.moving = false;  // Flag de movimento ativo
  }

  // Inicia movimento para tile alvo
  moveTo(targetX, targetY, duration = 120) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.duration = duration;
    this.progress = 0;
    this.moving = true;
  }

  // Atualiza progresso (chamado por MovementSystem)
  update(dt) {
    if (!this.moving) return false;

    this.progress += dt / this.duration;
    if (this.progress >= 1) {
      this.progress = 1;
      this.moving = false;
      return true; // Movimento completado
    }
    return false;
  }

  // Para movimento instantaneamente
  stop() {
    this.moving = false;
    this.progress = 0;
  }

  // Retorna posição interpolada (para render)
  getInterpolatedPosition(currentX, currentY) {
    if (!this.moving) return { x: currentX, y: currentY };
    return {
      x: currentX + (this.targetX - currentX) * this.progress,
      y: currentY + (this.targetY - currentY) * this.progress
    };
  }
}