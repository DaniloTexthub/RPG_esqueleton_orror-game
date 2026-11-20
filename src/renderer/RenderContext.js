// RenderContext — Contexto passado para renderer cada frame
// Camera, alpha (interpolação), debug flags, tempo

export class RenderContext {
  constructor() {
    this.camera = { x: 0, y: 0 };  // Top-left do mundo visível
    this.alpha = 0;                 // Interpolação 0..1 (fixed timestep)
    this.time = 0;                  // Tempo total do jogo (ms)
    this.dt = 0;                    // Delta time do frame
    this.debug = false;             // Debug render flags
    this.showGrid = false;
    this.showColliders = false;
    this.showEntityIds = false;
  }

  // Atualiza camera para seguir entity
  follow(entity, canvasWidth, canvasHeight, tileSize) {
    if (!entity) return;
    const pos = entity.get('Position');
    if (!pos) return;

    const screenX = pos.x * tileSize;
    const screenY = pos.y * tileSize;

    this.camera.x = screenX - canvasWidth / 2;
    this.camera.y = screenY - canvasHeight / 2;
  }

  // Clamp camera aos limites do mapa
  clamp(mapWidth, mapHeight, canvasWidth, canvasHeight, tileSize) {
    const maxX = mapWidth * tileSize - canvasWidth;
    const maxY = mapHeight * tileSize - canvasHeight;
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));
  }
}