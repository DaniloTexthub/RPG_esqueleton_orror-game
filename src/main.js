// Main Entry Point — Inicializa engine, systems, cena e inicia game loop

import { createEngine } from './core/Engine.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { CombatScene } from './scenes/CombatScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { eventBus } from './core/EventBus.js';
import { GAME_STATE } from './utils/constants.js';

// ============ INICIALIZAÇÃO ============

// 1. Engine
const engine = createEngine('game-canvas');

// 2. Renderer
const renderer = new CanvasRenderer();
renderer.init(engine.canvas);
engine.setRenderer(renderer);

// 3. Cenas
const dungeonScene = new DungeonScene();
const combatScene = new CombatScene();
const menuScene = new MenuScene();
engine.addScene('dungeon', dungeonScene);
engine.addScene('combat', combatScene);
engine.addScene('menu', menuScene);

// 4. RenderSystem global - inicializa manualmente (não está na cena)
const renderSystem = new RenderSystem(renderer);
renderSystem.onAdd(engine); // IMPORTANTE: seta this.engine
engine.renderSystem = renderSystem;

// 5. Eventos globais
eventBus.on('combatStart', ({ player, enemy }) => {
  console.log('⚔️ Combate iniciado!', enemy.get('Collider')?.enemyData?.name);
  // Troca para CombatScene com dados necessários
  const playerEntity = player;
  const enemyEntity = enemy;
  const returnData = {
    floor: dungeonScene.floor,
    playerPos: playerEntity.get('Position')?.clone?.() || { x: 0, y: 0 }
  };
  engine.changeScene('combat', { playerEntity, enemyEntity, returnData });
});

eventBus.on('changeFloor', ({ direction }) => {
  console.log(`📍 Mudança de andar: ${direction}`);
  // DungeonScene trata via listener próprio
});

eventBus.on('doorOpened', ({ x, y }) => {
  console.log(`🚪 Porta aberta em (${x}, ${y})`);
});

// Menu start game event
eventBus.on('menuStartGame', ({ characterId, floor }) => {
  console.log(`🎮 Iniciando jogo: ${characterId} no andar ${floor}`);
  // Prepara dados para DungeonScene
  const startData = { characterId, floor, isNewGame: floor === 1 };
  engine.changeScene('dungeon', startData);
});

// Debug keys
window.addEventListener('keydown', (e) => {
  if (e.code === 'F1') engine.toggleDebug();
  if (e.code === 'F2') renderer.context.showGrid = !renderer.context.showGrid;
  if (e.code === 'F3') renderer.context.showColliders = !renderer.context.showColliders;
  if (e.code === 'KeyR') {
    // Regenera andar atual
    engine.eventBus.emit('changeFloor', { direction: 'down' });
  }
});

// ============ START ============

// Inicia no MenuScene
engine.changeScene('menu');
engine.start();

console.log('🎮 RPG Skeleton Dungeon iniciado!');
console.log('Controles: WASD / Setas = Mover | F1 = Debug | F2 = Grid | F3 = Colliders | R = Novo andar');
console.log('Combate: 1=Atacar 2=Defender 3=Item 4=Fugir');
console.log('Menu: Setas = Navegar | Enter/Z = Selecionar | ESC = Voltar');

// Exporta para console debugging
window.engine = engine;
window.renderer = renderer;
window.eventBus = eventBus;