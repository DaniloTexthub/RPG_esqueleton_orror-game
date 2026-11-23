// RenderSystem — Desenha entities e mapa via renderer
// Ordena por zIndex, suporta interpolação (alpha)

import { System } from '../core/System.js';
import { Position } from '../components/Position.js';
import { Sprite } from '../components/Sprite.js';
import { Velocity } from '../components/Velocity.js';
import { Z_INDEX } from '../utils/constants.js';

export class RenderSystem extends System {
  constructor(renderer) {
    super(1000); // Prioridade baixa - roda por último
    this.requiredComponents = ['Position', 'Sprite'];
    this.renderer = renderer;
  }

  onAdd(game) {
    this.engine = game;
  }

  update(dt, entities, game) {
    // RenderSystem não faz lógica no fixed update
    // O render acontece no render loop com alpha
  }

  // Chamado pelo engine no render loop (com alpha para interpolação)
  render(renderer, camera, alpha) {
    const scene = this.engine?.currentScene;
    if (!scene) return;

    const context = renderer.context;
    context.camera = camera;
    context.alpha = alpha;

    // 1. Desenha mapa
    if (scene.gridMap) {
      renderer.drawMap(scene.gridMap);
    }

    // 2. Debug grid
    if (context.showGrid && scene.gridMap) {
      renderer.drawDebugGrid(scene.gridMap);
    }

    // 3. Coleta entities renderizáveis e ordena por zIndex
    const renderables = [];
    for (const entity of scene.entities) {
      if (!entity.active) continue;
      const sprite = entity.get(Sprite);
      const pos = entity.get(Position);
      if (sprite && pos) {
        renderables.push({ entity, sprite, pos, z: sprite.zIndex });
      }
    }

    // Ordena por zIndex (menor = atrás)
    renderables.sort((a, b) => a.z - b.z);

    // 4. Desenha cada entity
    for (const { entity, sprite, pos } of renderables) {
      renderer.drawEntity(entity);
    }

    renderer.updateParticles?.(this.engine.lastFrameDt || 16);
    renderer.drawParticles?.();
  }
}