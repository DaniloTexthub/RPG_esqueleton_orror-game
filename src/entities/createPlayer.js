// Player Factory — Cria entidade do jogador (esqueleto)

import { Entity } from '../core/Entity.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { COLORS, TILE_SIZE } from '../utils/constants.js';

export function createPlayer(x, y) {
  const entity = new Entity();

  // Posição no grid
  entity.add(new Position(x, y));

  // Velocidade (movimento suave)
  entity.add(new Velocity());

  // Sprite - esqueleto procedural
  entity.add(new Sprite({
    type: 'color',
    color: COLORS.PLAYER,
    accentColor: COLORS.PLAYER_ACCENT,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    zIndex: 20
  }));

  // Collider - sólido, 1x1 tile
  entity.add(new Collider({
    solid: true,
    trigger: false,
    layer: 'player',
    collidesWith: ['default', 'enemy', 'wall'],
    width: 1,
    height: 1
  }));

  // PlayerTag - stats e dados
  entity.add(new PlayerTag({
    name: 'Skeleton',
    maxHP: 100,
    hp: 100,
    attack: 12,
    defense: 5,
    speed: 8,
    maxAP: 5,
    ap: 5,
    level: 1,
    floor: 1
  }));

  return entity;
}