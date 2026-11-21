// Collider — Colisão e triggers
// Solid = bloqueia movimento, Trigger = detecta overlap (inimigos, itens)

import { Component } from '../core/Component.js';

export class Collider extends Component {
  constructor(config = {}) {
    super();
    this.solid = config.solid !== false;     // Bloqueia movimento
    this.trigger = config.trigger || false;  // Apenas detecta (não bloqueia)
    this.layer = config.layer || 'default';  // Layer de colisão
    this.collidesWith = config.collidesWith || ['default']; // Layers que colide
    this.width = config.width || 1;          // Largura em tiles (padrão 1x1)
    this.height = config.height || 1;        // Altura em tiles
    this.offsetX = config.offsetX || 0;      // Offset do centro
    this.offsetY = config.offsetY || 0;

    // Callbacks para triggers
    this.onEnter = config.onEnter || null;   // (otherEntity, self) => void
    this.onExit = config.onExit || null;
    this.onStay = config.onStay || null;
  }

  // Verifica se colide com outro collider (layer check)
  canCollide(other) {
    if (!other.enabled) return false;
    return this.collidesWith.includes(other.layer);
  }

  // AABB check em coordenadas de grid
  checkAABB(posA, posB, other) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const otherHalfW = other.width / 2;
    const otherHalfH = other.height / 2;

    const leftA = posA.x + this.offsetX - halfW;
    const rightA = posA.x + this.offsetX + halfW;
    const topA = posA.y + this.offsetY - halfH;
    const bottomA = posA.y + this.offsetY + halfH;

    const leftB = posB.x + other.offsetX - otherHalfW;
    const rightB = posB.x + other.offsetX + otherHalfW;
    const topB = posB.y + other.offsetY - otherHalfH;
    const bottomB = posB.y + other.offsetY + otherHalfH;

    return leftA < rightB && rightA > leftB && topA < bottomB && bottomA > topB;
  }
}