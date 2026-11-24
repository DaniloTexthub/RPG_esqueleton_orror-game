// PlayerTag — Marker component para identificar o player
// Dados do jogador (stats, inventory) ficam aqui ou em componente separado

import { Component } from '../core/Component.js';

export class PlayerTag extends Component {
  constructor(config = {}) {
    super();
    this.name = config.name || 'Skeleton';
    this.characterId = config.characterId || 'skeleton_warrior';
    this.level = config.level || 1;
    this.xp = config.xp || 0;
    this.xpToNext = config.xpToNext || 100;
    this.skillPoints = config.skillPoints || 0;
    this.unlockedSkills = [...(config.unlockedSkills || [])];
    const gold = Number(config.gold ?? 0);
    this.gold = Number.isFinite(gold) ? Math.max(0, Math.floor(gold)) : 0;

    // Stats base
    this.maxHP = config.maxHP || 100;
    this.hp = config.hp !== undefined ? config.hp : this.maxHP;
    this.attack = config.attack || 10;
    this.defense = config.defense || 5;
    this.speed = config.speed || 5; // Iniciativa em combate

    // Action Points (por turno)
    this.maxAP = config.maxAP || 5;
    this.ap = config.ap !== undefined ? config.ap : this.maxAP;

    // Inventário e equipamento serializáveis
    this.inventory = (config.inventory || []).map(item => ({ ...item }));
    this.equipped = { ...{
      weapon: null,
      armor: null,
      accessory: null
    }, ...(config.equipped || {}) };

    // Floor atual (dungeon depth)
    this.floor = config.floor || 1;
  }

  // Dano
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0; // true se morreu
  }

  // Cura
  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  // Gasta AP
  useAP(amount) {
    if (this.ap >= amount) {
      this.ap -= amount;
      return true;
    }
    return false;
  }

  // Reseta AP (início do turno)
  resetAP() {
    this.ap = this.maxAP;
  }

  // Verifica se vivo
  isAlive() {
    return this.hp > 0;
  }
}