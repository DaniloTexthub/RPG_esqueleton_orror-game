// Main Entry Point — Inicializa engine, systems, cena e inicia game loop

import { createEngine } from './core/Engine.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { eventBus } from './core/EventBus.js';
import { GAME_STATE } from './utils/constants.js';

// ============ INICIALIZAÇÃO ============

// 1. Engine
const engine = createEngine('game-canvas');

// 2. Renderer
const renderer = new CanvasRenderer();
renderer.init(engine.canvas);
engine.setRenderer(renderer);

// 3. Cena (cria seus próprios systems no init)
const dungeonScene = new DungeonScene();
engine.addScene('dungeon', dungeonScene);

// 4. RenderSystem global - inicializa manualmente (não está na cena)
const renderSystem = new RenderSystem(renderer);
renderSystem.onAdd(engine); // IMPORTANTE: seta this.engine
engine.renderSystem = renderSystem;

// 5. Eventos globais
eventBus.on('combatStart', ({ player, enemy }) => {
  console.log('⚔️ Combate iniciado!', enemy.get('Collider')?.enemyData?.name);
  // TODO: Trocar para CombatScene
  engine.gameState = GAME_STATE.COMBAT;
  alert(`Combate contra ${enemy.get('Collider')?.enemyData?.name}! (TODO: CombatScene)`);
  engine.gameState = GAME_STATE.PLAYING;
});

eventBus.on('changeFloor', ({ direction }) => {
  console.log(`📍 Mudança de andar: ${direction}`);
  // DungeonScene trata via listener próprio
});

eventBus.on('doorOpened', ({ x, y }) => {
  console.log(`🚪 Porta aberta em (${x}, ${y})`);
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

engine.changeScene('dungeon');
engine.start();

console.log('🎮 RPG Skeleton Dungeon iniciado!');
console.log('Controles: WASD / Setas = Mover | F1 = Debug | F2 = Grid | F3 = Colliders | R = Novo andar');

// Exporta para console debugging
window.engine = engine;
window.renderer = renderer;
window.eventBus = eventBus;