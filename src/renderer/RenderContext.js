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

    // Fade
    this.fadeAlpha = 0;             // 0 = normal, 1 = preto total
    this.fadeDirection = 0;         // 1 = fade in, -1 = fade out
    this.fadeDuration = 0;
    this.fadeStart = 0;
    this.fadeCallback = null;

    // Flash (screen flash effect)
    this.flashAlpha = 0;
    this.flashDuration = 0;
    this.flashStart = 0;
    this.flashColor = '#ffffff';
  }

  // Screen flash effect (brief white/color flash)
  flash(duration = 100, color = '#ffffff') {
    this.flashAlpha = 1;
    this.flashDuration = duration;
    this.flashStart = Date.now();
    this.flashColor = color;
  }

  // Atualiza camera para seguir entity (centro do tile)
  follow(entity, canvasWidth, canvasHeight, tileSize) {
    if (!entity) return;
    const pos = entity.get('Position');
    if (!pos) return;

    // Centro do tile = pos.x * tileSize + tileSize/2
    const screenX = pos.x * tileSize + tileSize / 2;
    const screenY = pos.y * tileSize + tileSize / 2;

    this.camera.x = screenX - canvasWidth / 2;
    this.camera.y = screenY - canvasHeight / 2;
  }

  // Camera follow com coordenadas já interpoladas (para movimento suave)
  followInterpolated(gridX, gridY, canvasWidth, canvasHeight, tileSize) {
    // Centro do tile interpolado
    const screenX = gridX * tileSize + tileSize / 2;
    const screenY = gridY * tileSize + tileSize / 2;

    this.camera.x = screenX - canvasWidth / 2;
    this.camera.y = screenY - canvasHeight / 2;
  }

  // Clamp camera aos limites do mapa (considera centro do tile)
  clamp(mapWidth, mapHeight, canvasWidth, canvasHeight, tileSize) {
    // Camera pode ir até onde o centro do tile da borda ainda é visível
    const halfTile = tileSize / 2;
    const minX = halfTile - canvasWidth / 2;
    const minY = halfTile - canvasHeight / 2;
    const maxX = mapWidth * tileSize - halfTile - canvasWidth / 2;
    const maxY = mapHeight * tileSize - halfTile - canvasHeight / 2;
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(minY, Math.min(maxY, this.camera.y));
  }

  // Fade in (preto -> normal)
  fadeIn(duration = 300, callback = null) {
    this.fadeAlpha = 1;
    this.fadeDirection = -1;
    this.fadeDuration = duration;
    this.fadeStart = Date.now();
    this.fadeCallback = callback;
  }

  // Fade out (normal -> preto)
  fadeOut(duration = 500, callback = null) {
    this.fadeAlpha = 0;
    this.fadeDirection = 1;
    this.fadeDuration = duration;
    this.fadeStart = Date.now();
    this.fadeCallback = callback;
  }

  // Atualiza fade (chamado no render loop)
  updateFade() {
    if (this.fadeDuration <= 0) return;

    const elapsed = Date.now() - this.fadeStart;
    const progress = Math.min(1, elapsed / this.fadeDuration);

    if (this.fadeDirection === 1) {
      // Fade out: 0 -> 1
      this.fadeAlpha = progress;
    } else {
      // Fade in: 1 -> 0
      this.fadeAlpha = 1 - progress;
    }

    if (progress >= 1) {
      this.fadeAlpha = this.fadeDirection === 1 ? 1 : 0;
      this.fadeDuration = 0;
      if (this.fadeCallback) {
        this.fadeCallback();
        this.fadeCallback = null;
      }
    }
  }

  // Desenha overlay de fade
  drawFade(ctx, canvasWidth, canvasHeight) {
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  // Atualiza flash (chamado no render loop)
  updateFlash() {
    if (this.flashDuration <= 0) return;

    const elapsed = Date.now() - this.flashStart;
    const progress = Math.min(1, elapsed / this.flashDuration);

    // Flash: 1 -> 0 (fade out do flash)
    this.flashAlpha = 1 - progress;

    if (progress >= 1) {
      this.flashAlpha = 0;
      this.flashDuration = 0;
    }
  }

  // Desenha overlay de flash
  drawFlash(ctx, canvasWidth, canvasHeight) {
    if (this.flashAlpha > 0) {
      // Handle hex color
      if (this.flashColor.startsWith('#')) {
        const hex = this.flashColor.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.flashAlpha})`;
      } else if (this.flashColor.startsWith('rgb')) {
        // Handle rgb/rgba color
        ctx.fillStyle = this.flashColor.replace('rgb(', 'rgba(').replace(')', `, ${this.flashAlpha})`);
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      }
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }
}