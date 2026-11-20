// TileType — Definição de tipos de tile e propriedades
// Extensível para novos tipos (lava, água, grama, etc.)

import { TILE_TYPE, COLORS } from '../utils/constants.js';

export const TILE_DEFINITIONS = {
  [TILE_TYPE.FLOOR]: {
    name: 'Chão',
    walkable: true,
    transparent: true,
    color: COLORS.FLOOR,
    colorAlt: COLORS.FLOOR_ALT,
    char: '.'
  },
  [TILE_TYPE.WALL]: {
    name: 'Parede',
    walkable: false,
    transparent: false,
    color: COLORS.WALL,
    colorAlt: COLORS.WALL_HIGHLIGHT,
    char: '#'
  },
  [TILE_TYPE.DOOR_CLOSED]: {
    name: 'Porta Fechada',
    walkable: false,
    transparent: false,
    color: COLORS.DOOR,
    colorAlt: COLORS.DOOR,
    char: '+',
    interactable: true,
    action: 'open'
  },
  [TILE_TYPE.DOOR_OPEN]: {
    name: 'Porta Aberta',
    walkable: true,
    transparent: true,
    color: COLORS.DOOR,
    colorAlt: COLORS.DOOR,
    char: '-',
    interactable: true,
    action: 'close'
  },
  [TILE_TYPE.STAIRS_DOWN]: {
    name: 'Escada Baixo',
    walkable: true,
    transparent: true,
    color: COLORS.STAIRS,
    colorAlt: COLORS.STAIRS,
    char: '>',
    interactable: true,
    action: 'descend'
  },
  [TILE_TYPE.STAIRS_UP]: {
    name: 'Escada Cima',
    walkable: true,
    transparent: true,
    color: COLORS.STAIRS,
    colorAlt: COLORS.STAIRS,
    char: '<',
    interactable: true,
    action: 'ascend'
  },
  [TILE_TYPE.TRAP]: {
    name: 'Armadilha',
    walkable: true,
    transparent: true,
    color: COLORS.FLOOR,
    colorAlt: COLORS.FLOOR,
    char: '^',
    dangerous: true,
    damage: 10
  },
  [TILE_TYPE.ITEM]: {
    name: 'Item',
    walkable: true,
    transparent: true,
    color: '#ffd700',
    colorAlt: '#ffd700',
    char: '*',
    collectible: true
  }
};

export function getTileDef(type) {
  return TILE_DEFINITIONS[type] || TILE_DEFINITIONS[TILE_TYPE.FLOOR];
}

export function isWalkable(type) {
  return getTileDef(type).walkable;
}

export function isInteractable(type) {
  return getTileDef(type).interactable === true;
}

export function getTileChar(type) {
  return getTileDef(type).char;
}