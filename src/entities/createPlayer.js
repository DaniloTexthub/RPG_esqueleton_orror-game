// Player Factory — Cria entidade do jogador baseado na classe escolhida

import { Entity } from '../core/Entity.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { COLORS, TILE_SIZE } from '../utils/constants.js';
import { getCharacterClass } from '../data/characters.js';

export function createPlayer(x, y, characterId = 'skeleton_warrior') {
  const entity = new Entity();
  const charClass = getCharacterClass(characterId);

  // Stats base da classe (ou default se não encontrar)
  const stats = charClass?.baseStats || {
    maxHP: 100, attack: 12, defense: 5, speed: 8, maxAP: 5, xpToNext: 100
  };
  const colors = charClass ? { color: charClass.color, accent: charClass.accentColor }
    : { color: COLORS.PLAYER, accent: COLORS.PLAYER_ACCENT };

  // Posição no grid
  entity.add(new Position(x, y));

  // Velocidade (movimento suave)
  entity.add(new Velocity());

  // Sprite - usa cores da classe
  entity.add(new Sprite({
    type: 'color',
    color: colors.color,
    accentColor: colors.accent,
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

  // PlayerTag - stats da classe escolhida
  entity.add(new PlayerTag({
    name: charClass?.name || 'Skeleton',
    characterId: characterId,
    maxHP: stats.maxHP,
    hp: stats.maxHP,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    maxAP: stats.maxAP,
    ap: stats.maxAP,
    level: 1,
    floor: 1,
    xp: 0,
    xpToNext: stats.xpToNext
  }));

  return entity;
}