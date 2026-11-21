// Combatant — Stats unificados de combate (player e inimigos)
// Substitui dados espalhados em PlayerTag e collider.enemyData

import { Component } from '../core/Component.js';

export class Combatant extends Component {
  constructor(config = {}) {
    super();

    // Identidade
    this.name = config.name || 'Combatente';
    this.isPlayer = config.isPlayer || false;

    // Stats base
    this.maxHP = config.maxHP || 10;
    this.hp = config.hp !== undefined ? config.hp : this.maxHP;
    this.attack = config.attack || 5;
    this.defense = config.defense || 0;
    this.speed = config.speed || 5;      // Iniciativa (maior = primeiro)
    this.maxAP = config.maxAP || 5;      // Action Points por turno
    this.ap = config.ap !== undefined ? config.ap : this.maxAP;

    // XP/Progressão (só player)
    this.xp = config.xp || 0;
    this.xpToNext = config.xpToNext || 100;
    this.level = config.level || 1;

    // Estado de combate
    this.isDefending = false;
    this.statusEffects = []; // [{ type, duration, value }]

    // Referência visual (para UI)
    this.spriteColor = config.spriteColor || '#ffffff';
    this.spriteAccent = config.spriteAccent || '#888888';
  }

  // --- Dano & Cura ---

  takeDamage(amount, attacker = null) {
    let finalDamage = Math.max(1, amount - this.defense);

    if (this.isDefending) {
      finalDamage = Math.ceil(finalDamage * 0.5);
      this.isDefending = false; // Defesa dura 1 ataque
    }

    this.hp = Math.max(0, this.hp - finalDamage);
    return { damage: finalDamage, killed: this.hp <= 0 };
  }

  heal(amount) {
    const oldHP = this.hp;
    this.hp = Math.min(this.maxHP, this.hp + amount);
    return this.hp - oldHP;
  }

  // --- Action Points ---

  useAP(amount) {
    if (this.ap >= amount) {
      this.ap -= amount;
      return true;
    }
    return false;
  }

  resetAP() {
    this.ap = this.maxAP;
    this.isDefending = false;
  }

  // --- Status Effects ---

  addStatusEffect(type, duration, value = 0) {
    this.statusEffects.push({ type, duration, value, startTurn: Date.now() });
  }

  updateStatusEffects() {
    this.statusEffects = this.statusEffects.filter(effect => {
      effect.duration--;
      return effect.duration > 0;
    });
  }

  hasStatusEffect(type) {
    return this.statusEffects.some(e => e.type === type);
  }

  // --- Utilitários ---

  isAlive() {
    return this.hp > 0;
  }

  getHPRatio() {
    return this.maxHP > 0 ? this.hp / this.maxHP : 0;
  }

  getAPRatio() {
    return this.maxAP > 0 ? this.ap / this.maxAP : 0;
  }

  // XP (só player)
  gainXP(amount) {
    if (!this.isPlayer) return false;
    this.xp += amount;
    if (this.xp >= this.xpToNext) {
      this.levelUp();
      return true;
    }
    return false;
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);

    // Aumento de stats por level
    this.maxHP += 10;
    this.hp = this.maxHP; // Cura cheia no level up
    this.attack += 2;
    this.defense += 1;
    this.speed += 1;
    this.maxAP += (this.level % 3 === 0) ? 1 : 0; // +1 AP a cada 3 levels
    this.ap = this.maxAP;

    return { level: this.level, maxHP: this.maxHP, attack: this.attack, defense: this.defense };
  }

  // Factory para player
  static createPlayer(config = {}) {
    return new Combatant({
      name: config.name || 'Esqueleto',
      isPlayer: true,
      maxHP: config.maxHP || 100,
      hp: config.hp || 100,
      attack: config.attack || 10,
      defense: config.defense || 5,
      speed: config.speed || 5,
      maxAP: config.maxAP || 5,
      ap: config.ap || 5,
      xp: config.xp || 0,
      xpToNext: config.xpToNext || 100,
      level: config.level || 1,
      spriteColor: '#00ff00',
      spriteAccent: '#ffffff'
    });
  }

  // Factory para inimigo (dados vêm de ENEMY_TYPES)
  static createEnemy(typeData) {
    return new Combatant({
      name: typeData.name,
      isPlayer: false,
      maxHP: typeData.maxHP,
      hp: typeData.maxHP,
      attack: typeData.attack,
      defense: typeData.defense,
      speed: typeData.speed,
      maxAP: 3, // Inimigos têm menos AP
      ap: 3,
      xp: typeData.xp,
      spriteColor: typeData.color,
      spriteAccent: typeData.accentColor
    });
  }
}