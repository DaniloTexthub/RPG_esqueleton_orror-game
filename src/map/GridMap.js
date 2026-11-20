// GridMap — Mapa baseado em grid com collision, FOV, pathfinding futuro
// Serializável para JSON (save/load, editor)

import { GRID_WIDTH, GRID_HEIGHT, TILE_TYPE } from '../utils/constants.js';
import { inBounds } from '../utils/math.js';
import { isWalkable, getTileDef, TILE_DEFINITIONS } from './TileType.js';

export class GridMap {
  constructor(width = GRID_WIDTH, height = GRID_HEIGHT, data = null) {
    this.width = width;
    this.height = height;

    // Grid 1D para performance (y * width + x)
    if (data) {
      this.tiles = new Uint8Array(data);
    } else {
      this.tiles = new Uint8Array(width * height);
      this.fill(TILE_TYPE.FLOOR);
    }

    // Entidades estáticas no mapa (portas, armadilhas, items)
    // Key: `${x},${y}` -> { type, entityId, state }
    this.features = new Map();

    // Spawn points
    this.playerSpawn = { x: 1, y: 1 };
    this.enemySpawns = [];
    this.stairsDown = [];
    this.stairsUp = [];
  }

  // Index 1D
  idx(x, y) {
    return y * this.width + x;
  }

  // Get tile type
  get(x, y) {
    if (!inBounds(x, y, this.width, this.height)) return TILE_TYPE.WALL;
    return this.tiles[this.idx(x, y)];
  }

  // Set tile type
  set(x, y, type) {
    if (!inBounds(x, y, this.width, this.height)) return false;
    this.tiles[this.idx(x, y)] = type;
    return true;
  }

  // Fill all
  fill(type) {
    this.tiles.fill(type);
  }

  // Walkable check (tile + features)
  isWalkable(x, y) {
    if (!inBounds(x, y, this.width, this.height)) return false;
    const tileType = this.get(x, y);
    if (!isWalkable(tileType)) return false;

    // Check features (porta fechada, etc)
    const key = `${x},${y}`;
    const feature = this.features.get(key);
    if (feature && feature.type === 'door' && feature.state === 'closed') return false;

    return true;
  }

  // Transparent check (para FOV futuro)
  isTransparent(x, y) {
    if (!inBounds(x, y, this.width, this.height)) return false;
    return getTileDef(this.get(x, y)).transparent;
  }

  // Interactable at position
  getInteractable(x, y) {
    const key = `${x},${y}`;
    const feature = this.features.get(key);
    if (feature && feature.interactable) return feature;

    const tileType = this.get(x, y);
    if (getTileDef(tileType).interactable) {
      return { type: 'tile', action: getTileDef(tileType).action, tileType };
    }
    return null;
  }

  // Add feature (door, trap, item)
  addFeature(x, y, feature) {
    const key = `${x},${y}`;
    this.features.set(key, { ...feature, x, y });
    // Update spawn lists
    if (feature.type === 'stairs_down') this.stairsDown.push({ x, y });
    if (feature.type === 'stairs_up') this.stairsUp.push({ x, y });
    if (feature.type === 'enemy_spawn') this.enemySpawns.push({ x, y });
  }

  // Remove feature
  removeFeature(x, y) {
    this.features.delete(`${x},${y}`);
  }

  // Set player spawn
  setPlayerSpawn(x, y) {
    this.playerSpawn = { x, y };
  }

  // Serialização para save/JSON
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      tiles: Array.from(this.tiles),
      features: Object.fromEntries(this.features),
      playerSpawn: this.playerSpawn,
      enemySpawns: this.enemySpawns,
      stairsDown: this.stairsDown,
      stairsUp: this.stairsUp
    };
  }

  // Carrega de JSON
  static fromJSON(json) {
    const map = new GridMap(json.width, json.height, new Uint8Array(json.tiles));
    map.features = new Map(Object.entries(json.features || {}));
    map.playerSpawn = json.playerSpawn || { x: 1, y: 1 };
    map.enemySpawns = json.enemySpawns || [];
    map.stairsDown = json.stairsDown || [];
    map.stairsUp = json.stairsUp || [];
    return map;
  }

  // Gera mapa simples para teste (rooms + corridors)
  static generateTestMap(width = GRID_WIDTH, height = GRID_HEIGHT) {
    const map = new GridMap(width, height);
    map.fill(TILE_TYPE.WALL);

    // Sala central
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const roomW = 12, roomH = 8;

    for (let y = cy - roomH/2; y < cy + roomH/2; y++) {
      for (let x = cx - roomW/2; x < cx + roomW/2; x++) {
        if (inBounds(x, y, width, height)) map.set(x, y, TILE_TYPE.FLOOR);
      }
    }

    // Corredores nas 4 direções
    const corridors = [
      { x: cx, y: 0, dx: 0, dy: 1, len: cy - roomH/2 },      // Norte
      { x: cx, y: cy + roomH/2, dx: 0, dy: 1, len: height - (cy + roomH/2) }, // Sul
      { x: 0, y: cy, dx: 1, dy: 0, len: cx - roomW/2 },      // Oeste
      { x: cx + roomW/2, y: cy, dx: 1, dy: 0, len: width - (cx + roomW/2) }   // Leste
    ];

    corridors.forEach(c => {
      for (let i = 0; i < c.len; i++) {
        const x = c.x + c.dx * i;
        const y = c.y + c.dy * i;
        if (inBounds(x, y, width, height)) map.set(x, y, TILE_TYPE.FLOOR);
      }
    });

    // Salas nas extremidades
    const rooms = [
      { x: cx, y: 2 },           // Norte
      { x: cx, y: height - 3 },  // Sul
      { x: 2, y: cy },           // Oeste
      { x: width - 3, y: cy }    // Leste
    ];

    rooms.forEach(r => {
      for (let y = r.y - 2; y <= r.y + 2; y++) {
        for (let x = r.x - 3; x <= r.x + 3; x++) {
          if (inBounds(x, y, width, height)) map.set(x, y, TILE_TYPE.FLOOR);
        }
      }
    });

    // Porta no centro (sul da sala central)
    map.addFeature(cx, cy + roomH/2, { type: 'door', state: 'closed', interactable: true });

    // Escada baixo (sala sul)
    map.addFeature(cx, height - 3, { type: 'stairs_down', interactable: true });

    // Escada cima (sala norte) - para andar anterior
    map.addFeature(cx, 2, { type: 'stairs_up', interactable: true });

    // Spawn player (sala central)
    map.setPlayerSpawn(cx, cy);

    // Enemy spawns
    map.enemySpawns.push({ x: cx - 2, y: cy - 1 });
    map.enemySpawns.push({ x: cx + 2, y: cy + 1 });
    map.enemySpawns.push({ x: 2, y: cy });
    map.enemySpawns.push({ x: width - 3, y: cy });

    return map;
  }
}