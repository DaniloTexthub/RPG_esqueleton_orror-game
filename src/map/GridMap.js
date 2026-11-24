// GridMap — Mapa baseado em grid com collision, FOV, pathfinding futuro
// Serializável para JSON (save/load, editor)

import { GRID_WIDTH, GRID_HEIGHT, TILE_TYPE } from '../utils/constants.js';
import { inBounds } from '../utils/math.js';
import { isWalkable, getTileDef } from './TileType.js';

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(min, max, random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i, random);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function carveSecretRoom(map, rooms, random) {
  const directions = shuffled(['left', 'right', 'up', 'down'], random);
  for (const room of shuffled(rooms.slice(1), random)) {
    for (const direction of directions) {
      const positions = [];
      if (direction === 'left' || direction === 'right') {
        for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
          positions.push({ x: direction === 'left' ? room.x - 1 : room.x + room.width, y });
        }
      } else {
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
          positions.push({ x, y: direction === 'up' ? room.y - 1 : room.y + room.height });
        }
      }

      for (const door of shuffled(positions, random)) {
        let bounds;
        if (direction === 'left') bounds = { x: door.x - 4, y: door.y - 2, width: 4, height: 5 };
        else if (direction === 'right') bounds = { x: door.x + 1, y: door.y - 2, width: 4, height: 5 };
        else if (direction === 'up') bounds = { x: door.x - 2, y: door.y - 4, width: 5, height: 4 };
        else bounds = { x: door.x - 2, y: door.y + 1, width: 5, height: 4 };

        const tiles = [];
        for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
          for (let x = bounds.x; x < bounds.x + bounds.width; x++) tiles.push({ x, y });
        }
        if (!inBounds(door.x, door.y, map.width, map.height) ||
            map.get(door.x, door.y) !== TILE_TYPE.WALL ||
            map.features.has(`${door.x},${door.y}`) ||
            tiles.some(({ x, y }) => !inBounds(x, y, map.width, map.height) ||
              map.get(x, y) !== TILE_TYPE.WALL)) {
          continue;
        }

        tiles.forEach(({ x, y }) => map.set(x, y, TILE_TYPE.FLOOR));
        map.addFeature(door.x, door.y, {
          type: 'secret_door', state: 'hidden', interactable: true
        });
        const cache = tiles[Math.floor(tiles.length / 2)];
        map.addFeature(cache.x, cache.y, {
          type: 'item', itemId: 'large_potion', interactable: true
        });
        map.secretRooms.push({ door, bounds });
        return true;
      }
    }
  }
  return false;
}

export class GridMap {
  constructor(width = GRID_WIDTH, height = GRID_HEIGHT, data = null) {
    this.width = width;
    this.height = height;
    this.seed = null;

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
    this.secretRooms = [];
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
    if (feature?.interactable) {
      if (feature.type === 'door') {
        return {
          ...feature,
          action: feature.state === 'closed' ? 'open' : 'close'
        };
      }
      if (feature.type === 'secret_door') {
        return { ...feature, action: feature.state === 'hidden' ? 'reveal' : 'close' };
      }
      if (feature.type === 'item') return { ...feature, action: 'pickup' };
      if (feature.type === 'sanctuary' || feature.type === 'merchant') {
        return { ...feature, action: 'event' };
      }
      if (feature.type === 'stairs_down') {
        return { ...feature, action: 'descend' };
      }
      if (feature.type === 'stairs_up') {
        return { ...feature, action: 'ascend' };
      }
      return feature;
    }

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
      stairsUp: this.stairsUp,
      seed: this.seed,
      secretRooms: this.secretRooms
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
    map.seed = json.seed ?? null;
    map.secretRooms = json.secretRooms || [];
    return map;
  }

  // Gera salas em setores e liga todas por uma árvore de corredores
  static generateDungeon(width = GRID_WIDTH, height = GRID_HEIGHT, seed = Math.floor(Math.random() * 0x100000000)) {
    if (width < 31 || height < 20) {
      throw new RangeError('O mapa precisa ter pelo menos 31x20 tiles.');
    }

    const random = createRandom(seed);
    const map = new GridMap(width, height);
    map.seed = seed >>> 0;
    map.fill(TILE_TYPE.WALL);

    const columns = 3;
    const rows = 2;
    const cellWidth = Math.floor((width - 4) / columns);
    const cellHeight = Math.floor((height - 4) / rows);
    const rooms = [];

    // Cada setor recebe uma sala com tamanho e posição limitados
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const left = 2 + column * cellWidth;
        const top = 2 + row * cellHeight;
        const right = column === columns - 1 ? width - 2 : left + cellWidth;
        const bottom = row === rows - 1 ? height - 2 : top + cellHeight;
        const roomWidth = randomInt(7, Math.min(11, right - left - 2), random);
        const roomHeight = randomInt(6, Math.min(10, bottom - top - 2), random);
        const x = randomInt(left + 1, right - roomWidth - 1, random);
        const y = randomInt(top + 1, bottom - roomHeight - 1, random);
        const room = {
          x, y, width: roomWidth, height: roomHeight,
          centerX: x + Math.floor(roomWidth / 2),
          centerY: y + Math.floor(roomHeight / 2)
        };
        rooms.push(room);

        for (let tileY = y; tileY < y + roomHeight; tileY++) {
          for (let tileX = x; tileX < x + roomWidth; tileX++) {
            map.set(tileX, tileY, TILE_TYPE.FLOOR);
          }
        }
      }
    }

    const carveCorridor = (start, end, horizontalFirst) => {
      const points = [{ x: start.centerX, y: start.centerY }];
      let x = start.centerX;
      let y = start.centerY;
      const carveTo = (targetX, targetY) => {
        while (x !== targetX) {
          x += Math.sign(targetX - x);
          map.set(x, y, TILE_TYPE.FLOOR);
          points.push({ x, y });
        }
        while (y !== targetY) {
          y += Math.sign(targetY - y);
          map.set(x, y, TILE_TYPE.FLOOR);
          points.push({ x, y });
        }
      };

      if (horizontalFirst) {
        carveTo(end.centerX, start.centerY);
        carveTo(end.centerX, end.centerY);
      } else {
        carveTo(start.centerX, end.centerY);
        carveTo(end.centerX, end.centerY);
      }
      return points;
    };

    // Percorre os setores com DFS aleatória: conexão garantida, traçado variável
    const connections = [];
    const visited = new Set([0]);
    const stack = [0];
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const column = current % columns;
      const row = Math.floor(current / columns);
      const neighbors = shuffled([
        column > 0 ? current - 1 : -1,
        column < columns - 1 ? current + 1 : -1,
        row > 0 ? current - columns : -1,
        row < rows - 1 ? current + columns : -1
      ].filter(index => index >= 0 && !visited.has(index)), random);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const next = neighbors[0];
      connections.push(carveCorridor(rooms[current], rooms[next], random() < 0.5));
      visited.add(next);
      stack.push(next);
    }

    // Algumas conexões ganham portas, sempre em trechos acessíveis de corredor
    const doorColors = ['red', 'blue', 'green'];
    const lockedDoors = [];
    shuffled(connections, random)
      .filter(path => path.length >= 9)
      .slice(0, doorColors.length)
      .forEach((path, index) => {
        const door = path[Math.floor(path.length / 2)];
        map.addFeature(door.x, door.y, {
          type: 'door',
          state: 'closed',
          locked: true,
          keyColor: doorColors[index],
          interactable: true
        });
        map.set(door.x, door.y, TILE_TYPE.DOOR_CLOSED);
        lockedDoors.push({ ...door, keyColor: doorColors[index] });
      });

    const startRoom = rooms[0];
    const start = { x: startRoom.centerX, y: startRoom.centerY };
    const endRoom = rooms.slice(1).sort((a, b) => {
      const distanceA = Math.abs(a.centerX - start.x) + Math.abs(a.centerY - start.y);
      const distanceB = Math.abs(b.centerX - start.x) + Math.abs(b.centerY - start.y);
      return distanceB - distanceA;
    })[0];
    const end = { x: endRoom.centerX, y: endRoom.centerY };
    map.setPlayerSpawn(start.x, start.y);
    map.addFeature(start.x, start.y, { type: 'stairs_up', interactable: true });
    map.addFeature(end.x, end.y, { type: 'stairs_down', interactable: true });
    const spawnDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    // Chaves aparecem na sala inicial e cada cor abre apenas sua porta.
    const startRoomTiles = [];
    for (let y = startRoom.y + 1; y < startRoom.y + startRoom.height - 1; y++) {
      for (let x = startRoom.x + 1; x < startRoom.x + startRoom.width - 1; x++) {
        if (!map.features.has(`${x},${y}`) && spawnDistance({ x, y }, start) >= 2) {
          startRoomTiles.push({ x, y });
        }
      }
    }
    shuffled(startRoomTiles, random).slice(0, lockedDoors.length).forEach((position, index) => {
      map.addFeature(position.x, position.y, {
        type: 'item',
        itemId: `key_${lockedDoors[index].keyColor}`,
        interactable: true
      });
    });

    carveSecretRoom(map, rooms, random);

    // Eventos e armadilhas ocupam o interior das salas, longe das escadas.
    const eventPositions = shuffled(rooms.flatMap(room => {
      const positions = [];
      for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
          const position = { x, y };
          if (map.get(x, y) === TILE_TYPE.FLOOR && !map.features.has(`${x},${y}`) &&
              spawnDistance(position, start) >= 4 && spawnDistance(position, end) >= 3) {
            positions.push(position);
          }
        }
      }
      return positions;
    }), random);
    for (let i = 0; i < 2 && eventPositions.length; i++) {
      const position = eventPositions.shift();
      map.addFeature(position.x, position.y, { type: 'trap', damage: 10, activated: false });
    }
    if (random() < 0.7 && eventPositions.length) {
      const position = eventPositions.shift();
      map.addFeature(position.x, position.y, { type: 'sanctuary', used: false, interactable: true });
    }
    if (random() < 0.7 && eventPositions.length) {
      const position = eventPositions.shift();
      map.addFeature(position.x, position.y, { type: 'merchant', interactable: true });
    }

    // Spawns ficam dentro das salas, afastados das escadas e uns dos outros.
    const candidates = shuffled(rooms.flatMap(room => {
      const positions = [];
      for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
          const key = `${x},${y}`;
          if (map.get(x, y) === TILE_TYPE.FLOOR && !map.features.has(key)) {
            positions.push({ x, y });
          }
        }
      }
      return positions;
    }), random);

    for (const candidate of candidates) {
      if (map.enemySpawns.length >= 8) break;
      if (spawnDistance(candidate, start) < 4 || spawnDistance(candidate, end) < 3) continue;
      if (map.enemySpawns.some(spawn => spawnDistance(candidate, spawn) < 4)) continue;
      map.enemySpawns.push(candidate);
    }

    return map;
  }

  static generateTestMap(width = GRID_WIDTH, height = GRID_HEIGHT) {
    return GridMap.generateDungeon(width, height);
  }
}