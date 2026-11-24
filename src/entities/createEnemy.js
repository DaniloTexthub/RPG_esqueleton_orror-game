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
    xp: 10,
    spriteId: 'zombie'
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
    xp: 20,
    spriteId: 'skeleton_enemy'
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
    xp: 25,
    spriteId: 'ghost'
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
    xp: 15,
    spriteId: 'giant_bat'
  }
};

export function createEnemy(x, y, typeId = 1, options = {}) {
  // Seleciona tipo baseado no ID (cicla)
  const types = Object.values(ENEMY_TYPES);
  const type = types[(typeId - 1) % types.length];
  const isBoss = options.isBoss === true;
  const floor = Math.max(1, Math.floor(options.floor || 1));
  const bossTier = Math.max(1, Math.floor(floor / 5));
  const scale = isBoss ? 2 + (bossTier - 1) * 0.5 : 1;
  const enemyData = {
    name: isBoss ? `Tirano ${type.name}` : type.name,
    maxHP: Math.floor(type.maxHP * scale),
    hp: Math.floor(type.maxHP * scale),
    attack: isBoss ? type.attack + floor : type.attack,
    defense: isBoss ? type.defense + bossTier : type.defense,
    speed: type.speed,
    xp: isBoss ? type.xp * 3 + floor * 2 : type.xp,
    spriteId: type.spriteId,
    typeId,
    isBoss,
    bossEnraged: false
  };

  const entity = new Entity();

  entity.add(new Position(x, y));
  entity.add(new Velocity());

  // Sprite - usa spritesheet com animações (placeholder para assets reais)
  const sprite = new Sprite({
    type: 'spritesheet',
    sheetSrc: `/assets/sprites/enemies/${type.spriteId}.png`, // Placeholder path
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    framesPerRow: 4,
    scale: 0.9,
    zIndex: 15,
    // Fallback cor do tipo (enquanto não tem spritesheet)
    color: type.color,
    accentColor: type.accentColor,
    enemyType: type.spriteId,
    // Animações padrão de inimigos
    animations: Sprite.createEnemyAnimations(),
    currentAnimation: 'idle'
  });
  sprite.playAnimation('idle');
  entity.add(sprite);

  entity.add(new Collider({
    solid: true,
    trigger: false, // Combate agora tratado no MovementSystem
    layer: 'enemy',
    collidesWith: ['player'],
    width: 1,
    height: 1
  }));

  // Dados do inimigo (armazenados no collider para simplicidade agora)
  const collider = entity.get('Collider');
  collider.enemyData = enemyData;

  entity.addTag('enemy');

  return entity;
}