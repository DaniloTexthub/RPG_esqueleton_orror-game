// Position — Posição no grid (coordenadas lógicas)
// Separado da render position (que interpola)

import { Component } from '../core/Component.js';

export class Position extends Component {
  constructor(x = 0, y = 0) {
    super();
    this.x = x; // Grid X
    this.y = y; // Grid Y
    this.previousX = x; // Para interpolação/rollback
    this.previousY = y;
  }

  // Define posição e guarda anterior
  set(x, y) {
    this.previousX = this.x;
    this.previousY = this.y;
    this.x = x;
    this.y = y;
  }

  // Copia de outra position
  copy(other) {
    this.previousX = other.x;
    this.previousY = other.y;
    this.x = other.x;
    this.y = other.y;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }

  // Cria cópia independente
  clone() {
    return new Position(this.x, this.y);
  }
}