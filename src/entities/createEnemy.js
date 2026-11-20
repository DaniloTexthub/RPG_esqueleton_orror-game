// Enemy Factory — Cria inimigos da masmorra
// Tipos variados para expansão futura

import { Entity } from '../core/Entity.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { COLORS, TILE_SIZE } from '../utils/constants.js';

const ENEMY_TYPES = {
  // Zumbi básico
  zombie: {
    name: 'Zumbi',
    color: '#4a4a2a',
    accentColor: '#8b8b00',
    maxHP: 30,
    attack: 8,
    defense: 2,
    speed: 3,
    xp: 10
  },
  // Esqueleto guerreiro
  skeleton_warrior: {
    name: 'Esqueleto Guerreiro',
    color: '#5a5a5a',
    accentColor: '#aa0000',
    maxHP: 45,
    attack: 12,
    defense: 5,
    speed: 5,
    xp: 20
  },
  // Fantasma
  ghost: {
    name: 'Fantasma',
    color: '#6a6aff',
    accentColor: '#aaaaff',
    maxHP: 25,
    attack: 15,
    defense: 1,
    speed: 7,
    xp: 25
  },
  // Morcego gigante
  giant_bat: {
    name: 'Morcego Gigante',
    color: '#2a1a1a',
    accentColor: '#8b0000',
    maxHP: 20,
    attack: 10,
    defense: 0,
    speed: 10,
    xp: 15
  }
};

export function createEnemy(x, y, typeId = 1) {
  // Seleciona tipo baseado no ID (cicla)
  const types = Object.values(ENEMY_TYPES);
  const type = types[(typeId - 1) % types.length];

  const entity = new Entity();

  entity.add(new Position(x, y));
  entity.add(new Velocity());

  entity.add(new Sprite({
    type: 'color',
    color: type.color,
    accentColor: type.accentColor,
    scale: 0.9,
    zIndex: 15
  }));

  entity.add(new Collider({
    solid: true,
    trigger: true, // Trigger para iniciar combate ao encostar
    layer: 'enemy',
    collidesWith: ['player'],
    width: 1,
    height: 1,
    onEnter: (player, enemy) => {
      // Inicia combate - emit event
      const engine = enemy.engine || (player.engine?.engine);
      if (engine) {
        engine.eventBus.emit('combatStart', { player, enemy });
      }
    }
  }));

  // Dados do inimigo (armazenados no collider para simplicidade agora)
  const collider = entity.get('Collider');
  collider.enemyData = {
    name: type.name,
    maxHP: type.maxHP,
    hp: type.maxHP,
    attack: type.attack,
    defense: type.defense,
    speed: type.speed,
    xp: type.xp
  };

  entity.addTag('enemy');

  return entity;
}