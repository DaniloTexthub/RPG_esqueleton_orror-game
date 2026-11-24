// Player Factory — Cria entidade do jogador baseado na classe escolhida

import { Entity } from '../core/Entity.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { COLORS, TILE_SIZE } from '../utils/constants.js';
import { getCharacterClass } from '../data/characters.js';

export function createPlayer(x, y, characterId = 'skeleton_warrior', playerData = {}) {
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

  // Sprite - usa spritesheet com animações (placeholder para assets reais)
  const sprite = new Sprite({
    type: 'spritesheet',
    sheetSrc: `/assets/sprites/characters/${characterId}.png`, // Placeholder path
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    framesPerRow: 6,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    zIndex: 20,
    // Fallback cor da classe (enquanto não tem spritesheet)
    color: colors.color,
    accentColor: colors.accent,
    // Animações padrão do esqueleto
    animations: Sprite.createSkeletonAnimations(),
    currentAnimation: 'idle'
  });
  // Inicia animação idle
  sprite.playAnimation('idle');
  entity.add(sprite);

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
    name: playerData.name || charClass?.name || 'Skeleton',
    characterId: characterId,
    maxHP: playerData.maxHP ?? stats.maxHP,
    hp: playerData.hp ?? stats.maxHP,
    attack: playerData.attack ?? stats.attack,
    defense: playerData.defense ?? stats.defense,
    speed: playerData.speed ?? stats.speed,
    maxAP: playerData.maxAP ?? stats.maxAP,
    ap: playerData.ap ?? stats.maxAP,
    level: playerData.level ?? 1,
    floor: playerData.floor ?? 1,
    xp: playerData.xp ?? 0,
    xpToNext: playerData.xpToNext ?? stats.xpToNext,
    skillPoints: playerData.skillPoints ?? 0,
    gold: playerData.gold ?? 20,
    unlockedSkills: playerData.unlockedSkills ||
      charClass?.moves.filter(move => move.unlockLevel === 1).map(move => move.id) || [],
    inventory: playerData.inventory || [
      { id: 'small_potion', quantity: 2 },
      { id: 'rusty_sword', quantity: 1 },
      { id: 'leather_armor', quantity: 1 }
    ],
    equipped: playerData.equipped || { weapon: null, armor: null, accessory: null }
  }));

  return entity;
}