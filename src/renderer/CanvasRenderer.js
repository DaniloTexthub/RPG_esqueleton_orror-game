// CanvasRenderer — Implementação 2D via Canvas API
// Abstração: Engine chama renderer.draw(entity, context), renderer não conhece game logic

import { RenderContext } from './RenderContext.js';
import { TILE_SIZE, COLORS, Z_INDEX, TILE_TYPE } from '../utils/constants.js';
import { getTileDef } from '../map/TileType.js';
import { lerpVec } from '../utils/math.js';

export class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.engine = null;
    this.context = new RenderContext();
    this.tileSize = TILE_SIZE;

    // Cache de imagens carregadas
    this.imageCache = new Map();

    // Debug
    this.debug = false;
  }

  // Inicializa com canvas do engine
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  // Carrega imagem (com cache)
  async loadImage(src) {
    if (this.imageCache.has(src)) return this.imageCache.get(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Início do frame
  beginFrame(context) {
    this.context = context;
    this.clear();
  }

  // Limpa tela - COR NEON PARA DEBUG
  clear() {
    this.ctx.fillStyle = '#001100'; // Verde muito escuro - visível se tudo mais falhar
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Desenha mapa (grid)
  drawMap(gridMap) {
    const { camera, alpha } = this.context;
    const startX = Math.max(0, Math.floor(camera.x / this.tileSize) - 1);
    const startY = Math.max(0, Math.floor(camera.y / this.tileSize) - 1);
    const endX = Math.min(gridMap.width, startX + Math.ceil(this.canvas.width / this.tileSize) + 2);
    const endY = Math.min(gridMap.height, startY + Math.ceil(this.canvas.height / this.tileSize) + 2);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        this.drawTile(x, y, gridMap.get(x, y));
      }
    }

    // Features (portas, escadas, etc)
    gridMap.features.forEach((feature, key) => {
      const [fx, fy] = key.split(',').map(Number);
      if (fx >= startX && fx < endX && fy >= startY && fy < endY) {
        this.drawFeature(fx, fy, feature);
      }
    });
  }

  // Desenha um tile - CORES NEON DEBUG
  drawTile(gx, gy, type) {
    const screenX = gx * this.tileSize - this.context.camera.x;
    const screenY = gy * this.tileSize - this.context.camera.y;

    // Cores neon por tipo
    const neonColors = {
      0: '#003300',  // FLOOR - verde escuro
      1: '#330000',  // WALL - vermelho escuro
      2: '#333300',  // DOOR_CLOSED - amarelo escuro
      3: '#003333',  // DOOR_OPEN - cyan escuro
      4: '#330033',  // STAIRS_DOWN - magenta escuro
      5: '#330033',  // STAIRS_UP - magenta escuro
      6: '#331100',  // TRAP - laranja escuro
      7: '#003333'   // ITEM - cyan escuro
    };

    this.ctx.fillStyle = neonColors[type] || '#111111';
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

    // Grid lines neon
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);

    // Wall = borda grossa vermelha
    if (type === 1) {
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    }
  }

  // Desenha feature (porta, escada, etc) - NEON DEBUG
  drawFeature(gx, gy, feature) {
    const screenX = gx * this.tileSize - this.context.camera.x;
    const screenY = gy * this.tileSize - this.context.camera.y;

    switch (feature.type) {
      case 'door':
        this.ctx.fillStyle = feature.state === 'closed' ? '#ffaa00' : '#00ffaa';
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
        this.ctx.shadowBlur = 0;
        // Texto D
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('D', screenX + this.tileSize/2, screenY + this.tileSize/2 + 5);
        break;
      case 'stairs_down':
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + this.tileSize/2, screenY + 4);
        this.ctx.lineTo(screenX + this.tileSize - 4, screenY + this.tileSize - 4);
        this.ctx.lineTo(screenX + 4, screenY + this.tileSize - 4);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('>', screenX + this.tileSize/2, screenY + this.tileSize/2 + 5);
        break;
      case 'stairs_up':
        this.ctx.fillStyle = '#ffff00';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + this.tileSize/2, screenY + this.tileSize - 4);
        this.ctx.lineTo(screenX + this.tileSize - 4, screenY + 4);
        this.ctx.lineTo(screenX + 4, screenY + 4);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('<', screenX + this.tileSize/2, screenY + this.tileSize/2 + 5);
        break;
    }
  }

  // Desenha entity (chamado por RenderSystem)
  drawEntity(entity) {
    const pos = entity.get('Position');
    const vel = entity.get('Velocity');
    const sprite = entity.get('Sprite');
    const collider = entity.get('Collider');

    if (!pos || !sprite) return;

    // Lazy-load spritesheet se tem sheetSrc mas não sheet
    if (sprite.type === 'spritesheet' && sprite.sheetSrc && !sprite.sheet) {
      this.loadImage(sprite.sheetSrc).then(img => {
        sprite.sheet = img;
      }).catch(() => {
        // Falhou - usa fallback color
        sprite.type = 'color';
      });
    }

    // Posição interpolada
    let renderX = pos.x;
    let renderY = pos.y;

    if (vel && vel.moving) {
      const interp = vel.getInterpolatedPosition(pos.x, pos.y);
      renderX = interp.x;
      renderY = interp.y;
    }

    const screenX = renderX * this.tileSize - this.context.camera.x + sprite.offsetX;
    const screenY = renderY * this.tileSize - this.context.camera.y + sprite.offsetY;

    this.ctx.save();
    this.ctx.translate(screenX, screenY);
    this.ctx.scale(sprite.scale, sprite.scale);

    // Desenha baseado no tipo
    switch (sprite.type) {
      case 'image':
        if (sprite.image) {
          this.ctx.drawImage(sprite.image, -this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize);
        }
        break;
      case 'spritesheet':
        if (sprite.sheet) {
          const frame = sprite.getFrameRect();
          this.ctx.drawImage(
            sprite.sheet,
            frame.x, frame.y, frame.w, frame.h,
            -this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize
          );
        } else {
          // Spritesheet não carregado ainda - usa fallback color
          this.drawDefaultSprite(sprite, entity);
        }
        break;
      case 'skeleton':
        this.drawSkeleton(sprite);
        break;
      case 'color':
      default:
        this.drawDefaultSprite(sprite, entity);
    }

    this.ctx.restore();

    // Debug: collider box
    if (this.debug && this.context.showColliders && collider) {
      this.drawColliderDebug(pos, collider);
    }
  }

  // Sprite padrão: QUADRADOS NEON BRILHANTES para debug visual
  drawDefaultSprite(sprite, entity) {
    const isPlayer = entity.hasTag('player');
    const half = this.tileSize / 2;

    if (isPlayer) {
      // PLAYER: Quadrado VERDE NEON brilhante
      this.ctx.fillStyle = '#00ff00';
      this.ctx.shadowColor = '#00ff00';
      this.ctx.shadowBlur = 15;
      this.ctx.fillRect(-half + 2, -half + 2, this.tileSize - 4, this.tileSize - 4);

      // Olhos brancos
      this.ctx.fillStyle = '#fff';
      this.ctx.shadowBlur = 0;
      this.ctx.fillRect(-half + 6, -half + 6, 4, 4);
      this.ctx.fillRect(half - 10, -half + 6, 4, 4);
    } else {
      // INIMIGOS: Quadrado VERMELHO NEON
      this.ctx.fillStyle = '#ff0044';
      this.ctx.shadowColor = '#ff0044';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(-half + 4, -half + 4, this.tileSize - 8, this.tileSize - 8);

      // X branco
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.shadowBlur = 0;
      this.ctx.beginPath();
      this.ctx.moveTo(-half + 8, -half + 8);
      this.ctx.lineTo(half - 8, half - 8);
      this.ctx.moveTo(half - 8, -half + 8);
      this.ctx.lineTo(-half + 8, half - 8);
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;
  }

  // Skeleton avançado (partes separadas - futuro)
  drawSkeleton(sprite) {
    // TODO: implementar com sprite.parts
    this.drawDefaultSprite(sprite, { hasTag: () => false });
  }

  // Debug collider
  drawColliderDebug(pos, collider) {
    const screenX = pos.x * this.tileSize - this.context.camera.x;
    const screenY = pos.y * this.tileSize - this.context.camera.y;
    const w = collider.width * this.tileSize;
    const h = collider.height * this.tileSize;
    const ox = collider.offsetX * this.tileSize;
    const oy = collider.offsetY * this.tileSize;

    this.ctx.save();
    this.ctx.strokeStyle = collider.solid ? '#ff0000' : '#ffff00';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(
      screenX - w/2 + ox,
      screenY - h/2 + oy,
      w, h
    );
    this.ctx.restore();
  }

  // Debug grid
  drawDebugGrid(gridMap) {
    if (!this.context.showGrid) return;

    const { camera } = this.context;
    this.ctx.strokeStyle = COLORS.DEBUG_GRID;
    this.ctx.lineWidth = 0.5;

    const startX = Math.floor(camera.x / this.tileSize);
    const startY = Math.floor(camera.y / this.tileSize);
    const endX = startX + Math.ceil(this.canvas.width / this.tileSize) + 1;
    const endY = startY + Math.ceil(this.canvas.height / this.tileSize) + 1;

    for (let x = startX; x <= endX; x++) {
      const sx = x * this.tileSize - camera.x;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, 0);
      this.ctx.lineTo(sx, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = startY; y <= endY; y++) {
      const sy = y * this.tileSize - camera.y;
      this.ctx.beginPath();
      this.ctx.moveTo(0, sy);
      this.ctx.lineTo(this.canvas.width, sy);
      this.ctx.stroke();
    }
  }

  // Fim do frame
  endFrame() {
    // Flush se necessário (WebGL)
  }
}