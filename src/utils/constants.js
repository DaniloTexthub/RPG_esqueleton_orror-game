// Constantes globais do jogo — centralizadas para fácil ajuste

export const TILE_SIZE = 32;              // Tamanho do tile em pixels (32x32)
export const GRID_WIDTH = 45;             // Largura do mapa em tiles
export const GRID_HEIGHT = 33;            // Altura do mapa em tiles
export const VIEW_WIDTH = 25;             // Largura visível em tiles
export const VIEW_HEIGHT = 18;            // Altura visível em tiles
export const CANVAS_WIDTH = TILE_SIZE * VIEW_WIDTH;   // 800px
export const CANVAS_HEIGHT = TILE_SIZE * VIEW_HEIGHT; // 576px

export const MOVE_DURATION = 120;         // ms para mover 1 tile (lerp)
export const TURN_DELAY = 150;            // ms entre ações de turno

export const TILE_TYPE = {
  FLOOR: 0,       // Chão andável
  WALL: 1,        // Parede sólida
  DOOR_CLOSED: 2, // Porta fechada (precisa chave/ação)
  DOOR_OPEN: 3,   // Porta aberta
  STAIRS_DOWN: 4, // Escada próximo andar
  STAIRS_UP: 5,   // Escada andar anterior
  TRAP: 6,        // Armadilha
  ITEM: 7         // Item no chão
};

export const KEYS = {
  W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD',
  ARROW_UP: 'ArrowUp', ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft', ARROW_RIGHT: 'ArrowRight',
  SPACE: 'Space', ENTER: 'Enter', ESC: 'Escape',
  E: 'KeyE', I: 'KeyI' // Interagir, Inventário
};

export const DIRS = {
  UP: { x: 0, y: -1, key: ['KeyW', 'ArrowUp'] },
  DOWN: { x: 0, y: 1, key: ['KeyS', 'ArrowDown'] },
  LEFT: { x: -1, y: 0, key: ['KeyA', 'ArrowLeft'] },
  RIGHT: { x: 1, y: 0, key: ['KeyD', 'ArrowRight'] }
};

export const COLORS = {
  // Tema horror — vermelho sangue, preto, cinzas
  BG: '#0a0a0a',
  WALL: '#1a1a1a',
  WALL_HIGHLIGHT: '#2a0a0a',
  FLOOR: '#151515',
  FLOOR_ALT: '#121212',
  PLAYER: '#e0e0e0',
  PLAYER_ACCENT: '#8b0000',
  ENEMY: '#ff3333',
  ENEMY_ACCENT: '#660000',
  DOOR: '#4a2a1a',
  STAIRS: '#3a3a1a',
  UI_TEXT: '#e0e0e0',
  UI_ACCENT: '#8b0000',
  HP_HIGH: '#228b22',
  HP_MID: '#daa520',
  HP_LOW: '#8b0000',
  DEBUG_GRID: 'rgba(139, 0, 0, 0.15)',
  DEBUG_COLLISION: 'rgba(255, 0, 0, 0.3)'
};

export const Z_INDEX = {
  FLOOR: 0,
  ITEM: 1,
  ENTITY: 10,
  PLAYER: 20,
  EFFECT: 30,
  UI: 100
};

export const GAME_STATE = {
  PLAYING: 'playing',
  COMBAT: 'combat',
  PAUSED: 'paused',
  MENU: 'menu',
  GAME_OVER: 'game_over'
};