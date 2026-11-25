// CanvasRenderer — Implementação 2D via Canvas API
// Abstração: Engine chama renderer.draw(entity, context), renderer não conhece game logic

import { RenderContext } from './RenderContext.js';
import { TILE_SIZE, COLORS, Z_INDEX, TILE_TYPE } from '../utils/constants.js';
import { getTileDef } from '../map/TileType.js';
import { lerp } from '../utils/math.js';
import { eventBus } from '../core/EventBus.js';
import { Renderer } from './Renderer.js';

export class CanvasRenderer extends Renderer {
  constructor() {
    super();
    this.canvas = null;
    this.ctx = null;
    this.engine = null;
    this.context = new RenderContext();
    this.tileSize = TILE_SIZE;

    // Cache de imagens carregadas
    this.imageCache = new Map();
    this.loadingImages = new Set();
    this.failedImages = new Set();
    this.particles = [];

    // Efeitos visuais curtos: sangue, poeira e impacto
    this.unsubscribeParticles = eventBus.on('combatAction', data => {
      if (data.action === 'attack' && data.target?.entity) {
        const pos = data.target.entity.get('Position');
        if (pos) this.emitParticles(pos.x, pos.y, 'hit', data.damage || 4);
      }
    });
    this.unsubscribeDust = eventBus.on('entityMoved', data => {
      if (data.entity?.hasTag?.('player')) {
        this.emitParticles(data.x, data.y, 'dust', 3);
      }
    });

    // Debug
    this.debug = false;
  }

  // Inicializa com canvas do engine
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  dispose() {
    this.unsubscribeParticles?.();
    this.unsubscribeDust?.();
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
    if (this.failedImages.has(src)) return null;
    if (this.loadingImages.has(src)) return null;
    this.loadingImages.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadingImages.delete(src);
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingImages.delete(src);
        this.failedImages.add(src);
        reject(new Error(`Falha ao carregar imagem: ${src}`));
      };
      img.src = src;
    });
  }

  // Cria partículas simples sem entidade ECS dedicada
  emitParticles(gridX, gridY, type = 'hit', count = 5) {
    const colors = type === 'dust'
      ? ['#8a8175', '#b1a38f']
      : type === 'blood'
        ? ['#8b0000', '#d20a20']
        : ['#d8d0b4', '#8b0000'];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: gridX * this.tileSize + this.tileSize / 2,
        y: gridY * this.tileSize + this.tileSize / 2,
        vx: (Math.random() - 0.5) * (type === 'dust' ? 24 : 48),
        vy: (Math.random() - 0.75) * (type === 'dust' ? 12 : 40),
        life: type === 'dust' ? 260 : 420,
        maxLife: type === 'dust' ? 260 : 420,
        size: type === 'dust' ? 3 : 2 + Math.random() * 2,
        color: colors[i % colors.length]
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt / 1000;
      particle.y += particle.vy * dt / 1000;
      particle.vy += (particle.color === '#8a8175' ? 8 : 28) * dt / 1000;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  drawParticles() {
    if (this.particles.length === 0) return;
    this.ctx.save();
    for (const particle of this.particles) {
      const screenX = particle.x - this.context.camera.x;
      const screenY = particle.y - this.context.camera.y;
      this.ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        Math.round(screenX - particle.size / 2),
        Math.round(screenY - particle.size / 2),
        particle.size,
        particle.size
      );
    }
    this.ctx.restore();
  }

  // Início do frame
  beginFrame(context) {
    this.context = context;
    this.clear();
  }

  // Limpa tela usando o fundo escuro do tema
  clear() {
    this.ctx.fillStyle = '#090909';
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
    this.drawTorchLight();
  }

  drawTorchLight() {
    const player = this.engine?.currentScene?.getFirstByTag('player');
    const pos = player?.get('Position');
    if (!pos) return;

    const x = pos.x * this.tileSize - this.context.camera.x + this.tileSize / 2;
    const y = pos.y * this.tileSize - this.context.camera.y + this.tileSize / 2;
    const radius = this.tileSize * 7;
    const flicker = Math.sin(performance.now() / 95) * 0.012;
    const glow = this.ctx.createRadialGradient(x, y, 4, x, y, radius);
    glow.addColorStop(0, `rgba(255, 170, 95, ${0.12 + flicker})`);
    glow.addColorStop(0.55, 'rgba(255, 135, 62, 0.045)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
    this.ctx.save();
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  // Desenha um tile com acabamento visual discreto
  drawTile(gx, gy, type) {
    const screenX = gx * this.tileSize - this.context.camera.x;
    const screenY = gy * this.tileSize - this.context.camera.y;
    const definition = getTileDef(type);
    const variant = ((gx * 17 + gy * 31) & 3);

    this.ctx.fillStyle = variant === 0 ? definition.colorAlt : definition.color;
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

    if (type === TILE_TYPE.FLOOR) {
      this.ctx.fillStyle = variant === 1 ? '#1d1d1d' : '#111111';
      if (variant === 1) this.ctx.fillRect(screenX + 7, screenY + 9, 2, 2);
      if (variant === 2) this.ctx.fillRect(screenX + 21, screenY + 24, 3, 1);
    }

    if (type === TILE_TYPE.WALL) {
      this.ctx.fillStyle = '#151515';
      this.ctx.fillRect(screenX + 1, screenY + 1, this.tileSize - 2, 4);
      this.ctx.fillStyle = '#242424';
      this.ctx.fillRect(screenX + 3, screenY + 8, this.tileSize - 6, 9);
      this.ctx.fillRect(screenX + 1, screenY + 20, this.tileSize - 2, 9);
      this.ctx.strokeStyle = '#0b0b0b';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX + 0.5, screenY + 0.5, this.tileSize - 1, this.tileSize - 1);
    }
  }

  // Desenha portas e escadas com formas legíveis
  drawFeature(gx, gy, feature) {
    const screenX = gx * this.tileSize - this.context.camera.x;
    const screenY = gy * this.tileSize - this.context.camera.y;

    this.ctx.save();
    switch (feature.type) {
      case 'door':
      case 'secret_door':
        if (feature.type === 'secret_door' && feature.state === 'hidden') break;
        this.ctx.fillStyle = feature.type === 'secret_door'
          ? (feature.state === 'open' ? '#17112a' : '#30204a')
          : feature.state === 'closed'
            ? ({ red: '#642323', blue: '#233e64', green: '#285333' }[feature.keyColor] || '#4a2a1a')
            : '#251a12';
        this.ctx.fillRect(screenX + 4, screenY + 3, this.tileSize - 8, this.tileSize - 6);
        this.ctx.strokeStyle = feature.type === 'secret_door'
          ? '#a58bd1'
          : ({ red: '#d36b6b', blue: '#6b9bd3', green: '#79bd7b' }[feature.keyColor] || '#7a4a2a');
        this.ctx.strokeRect(screenX + 6.5, screenY + 5.5, this.tileSize - 13, this.tileSize - 11);
        this.ctx.fillStyle = '#c0a070';
        this.ctx.fillRect(screenX + this.tileSize - 10, screenY + 15, 2, 2);
        break;
      case 'item': {
        const keyColors = { key_red: '#f04b4b', key_blue: '#4b8ff0', key_green: '#57c66a' };
        this.ctx.fillStyle = keyColors[feature.itemId] || '#e5c34b';
        this.ctx.fillRect(screenX + 12, screenY + 10, 9, 12);
        this.ctx.fillRect(screenX + 17, screenY + 18, 7, 3);
        break;
      }
      case 'trap':
        if (!feature.activated) {
          this.ctx.fillStyle = '#b34b4b';
          this.ctx.font = 'bold 22px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('^', screenX + this.tileSize / 2, screenY + 24);
        }
        break;
      case 'sanctuary':
        this.ctx.fillStyle = feature.used ? '#3d5244' : '#69c99a';
        this.ctx.beginPath();
        this.ctx.arc(screenX + 16, screenY + 16, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#10251a';
        this.ctx.fillRect(screenX + 14, screenY + 10, 4, 12);
        this.ctx.fillRect(screenX + 10, screenY + 14, 12, 4);
        break;
      case 'merchant':
        this.ctx.fillStyle = '#d5a846';
        this.ctx.fillRect(screenX + 7, screenY + 8, 18, 17);
        this.ctx.strokeStyle = '#f1d27b';
        this.ctx.strokeRect(screenX + 8.5, screenY + 9.5, 15, 14);
        this.ctx.fillStyle = '#201809';
        this.ctx.font = 'bold 12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('$', screenX + 16, screenY + 21);
        break;
      case 'crate':
        if (feature.state === 'destroyed') break;
        this.ctx.fillStyle = '#8a5a2b';
        this.ctx.fillRect(screenX + 6, screenY + 7, 20, 18);
        this.ctx.strokeStyle = '#d0a46a';
        this.ctx.strokeRect(screenX + 7.5, screenY + 8.5, 17, 15);
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + 7, screenY + 8);
        this.ctx.lineTo(screenX + 25, screenY + 24);
        this.ctx.moveTo(screenX + 25, screenY + 8);
        this.ctx.lineTo(screenX + 7, screenY + 24);
        this.ctx.stroke();
        break;
      case 'stairs_down':
        this.ctx.strokeStyle = '#77745f';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const y = screenY + 7 + i * 5;
          this.ctx.beginPath();
          this.ctx.moveTo(screenX + 6, y);
          this.ctx.lineTo(screenX + this.tileSize - 6, y);
          this.ctx.stroke();
        }
        this.ctx.fillStyle = '#d6c36f';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DESCER', screenX + 16, screenY + 30);
        break;
      case 'stairs_up':
        this.ctx.strokeStyle = '#77745f';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const y = screenY + 25 - i * 5;
          this.ctx.beginPath();
          this.ctx.moveTo(screenX + 6, y);
          this.ctx.lineTo(screenX + this.tileSize - 6, y);
          this.ctx.stroke();
        }
        this.ctx.fillStyle = '#9fd0a6';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUBIR', screenX + 16, screenY + 30);
        break;
    }
    this.ctx.restore();
  }

  // Desenha entity (chamado por RenderSystem)
  drawEntity(entity) {
    const pos = entity.get('Position');
    const vel = entity.get('Velocity');
    const sprite = entity.get('Sprite');
    const collider = entity.get('Collider');

    if (!pos || !sprite) return;

    // Lazy-load com cache; falha mantém o fallback sem repetir a requisição
    if (sprite.sheetSrc && !sprite.sheet) {
      this.loadImage(sprite.sheetSrc).then(img => {
        if (img) sprite.sheet = img;
      }).catch(error => console.warn(error.message));
    }
    if (sprite.imageSrc && !sprite.image) {
      this.loadImage(sprite.imageSrc).then(img => {
        if (img) sprite.image = img;
      }).catch(error => console.warn(error.message));
    }

    // Posição interpolada
    let renderX = pos.x;
    let renderY = pos.y;

    if (vel && vel.moving) {
      renderX = lerp(pos.previousX, pos.x, vel.progress);
      renderY = lerp(pos.previousY, pos.y, vel.progress);
    }

    // Sempre centraliza a arte no centro do tile
    const screenX = renderX * this.tileSize - this.context.camera.x + this.tileSize / 2 + sprite.offsetX;
    const screenY = renderY * this.tileSize - this.context.camera.y + this.tileSize / 2 + sprite.offsetY;

    this.ctx.save();
    this.ctx.translate(screenX, screenY);
    this.ctx.scale(sprite.scale, sprite.scale);

    // Desenha baseado no tipo
    switch (sprite.type) {
      case 'image':
        if (sprite.image) {
          this.ctx.drawImage(
            sprite.image,
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize
          );
        }
        break;
      case 'spritesheet':
        if (sprite.sheet) {
          const frame = sprite.getFrameRect();
          this.ctx.drawImage(
            sprite.sheet,
            frame.x, frame.y, frame.w, frame.h,
            -frame.w / 2,
            -frame.h / 2,
            frame.w,
            frame.h
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
    if (this.context.showColliders && collider) {
      this.drawColliderDebug(pos, vel, collider);
    }
  }

  // Sprite fallback discreto para assets ainda não carregados
  drawDefaultSprite(sprite, entity) {
    const isPlayer = entity.hasTag('player');
    const half = this.tileSize / 2;
    if (!isPlayer && sprite.enemyType) {
      this.drawEnemySprite(sprite.enemyType, sprite, half);
      return;
    }

    this.ctx.fillStyle = sprite.color || (isPlayer ? COLORS.PLAYER : COLORS.ENEMY);
    this.ctx.fillRect(-half + 5, -half + 4, this.tileSize - 10, this.tileSize - 8);
    this.ctx.fillStyle = sprite.accentColor || (isPlayer ? COLORS.PLAYER_ACCENT : COLORS.ENEMY_ACCENT);
    this.ctx.fillRect(-half + 8, -half + 7, 4, 4);
    this.ctx.fillRect(half - 12, -half + 7, 4, 4);
  }

  drawEnemySprite(type, sprite, half) {
    if (type === 'ghost') {
      this.drawGhostSprite();
      return;
    }

    const body = sprite.color || COLORS.ENEMY;
    const accent = sprite.accentColor || COLORS.ENEMY_ACCENT;
    this.ctx.fillStyle = body;
    if (type === 'zombie') {
      this.ctx.fillRect(-8, -7, 16, 16);
      this.ctx.fillRect(-6, -14, 12, 8);
      this.ctx.fillRect(-13, -5, 5, 12);
      this.ctx.fillRect(8, -4, 5, 11);
      this.ctx.fillRect(-7, 8, 5, 8);
      this.ctx.fillRect(2, 8, 5, 8);
      this.ctx.fillStyle = '#ead95b';
      this.ctx.fillRect(-4, -11, 2, 2);
      this.ctx.fillRect(3, -11, 2, 2);
    } else if (type === 'skeleton_enemy') {
      this.ctx.fillStyle = '#d7cfb2';
      this.ctx.beginPath();
      this.ctx.arc(0, -8, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = accent;
      this.ctx.fillRect(-4, -10, 3, 3);
      this.ctx.fillRect(2, -10, 3, 3);
      this.ctx.fillStyle = '#d7cfb2';
      this.ctx.fillRect(-2, 0, 4, 15);
      for (const y of [-1, 3, 7]) this.ctx.fillRect(-7, y, 14, 2);
      this.ctx.fillRect(-9, 0, 3, 12);
      this.ctx.fillRect(6, 0, 3, 12);
      this.ctx.fillRect(-6, 13, 4, 5);
      this.ctx.fillRect(2, 13, 4, 5);
    } else if (type === 'giant_bat') {
      this.ctx.fillStyle = body;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -2);
      this.ctx.lineTo(-half + 2, -12);
      this.ctx.lineTo(-10, 1);
      this.ctx.lineTo(-half + 3, 11);
      this.ctx.lineTo(-3, 8);
      this.ctx.lineTo(3, 8);
      this.ctx.lineTo(half - 3, 11);
      this.ctx.lineTo(10, 1);
      this.ctx.lineTo(half - 2, -12);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = accent;
      this.ctx.fillRect(-5, -4, 3, 3);
      this.ctx.fillRect(2, -4, 3, 3);
      this.ctx.fillStyle = body;
      this.ctx.fillRect(-3, -8, 6, 16);
    } else {
      this.ctx.fillRect(-8, -10, 16, 20);
      this.ctx.fillRect(-12, -5, 4, 11);
      this.ctx.fillRect(8, -5, 4, 11);
      this.ctx.fillRect(-6, 9, 4, 7);
      this.ctx.fillRect(2, 9, 4, 7);
      this.ctx.fillStyle = accent;
      this.ctx.fillRect(-5, -6, 3, 3);
      this.ctx.fillRect(2, -6, 3, 3);
    }
  }

  // Fallback translúcido para o fantasma quando o spritesheet não existe
  drawGhostSprite() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.78;
    this.ctx.fillStyle = '#b9c5ff';
    this.ctx.shadowColor = '#899cff';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.ellipse(0, -2, 10, 12, 0, Math.PI, 0);
    this.ctx.lineTo(10, 8);
    this.ctx.quadraticCurveTo(6, 5, 3, 10);
    this.ctx.quadraticCurveTo(0, 6, -3, 10);
    this.ctx.quadraticCurveTo(-6, 5, -10, 8);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#252b52';
    this.ctx.fillRect(-5, -4, 3, 4);
    this.ctx.fillRect(2, -4, 3, 4);
    this.ctx.restore();
  }

  // Skeleton avançado (partes separadas - futuro)
  drawSkeleton(sprite) {
    // TODO: implementar com sprite.parts
    this.drawDefaultSprite(sprite, { hasTag: () => false });
  }

  // Debug collider (alinhado com o centro do sprite renderizado)
  drawColliderDebug(pos, vel, collider) {
    let renderX = pos.x;
    let renderY = pos.y;
    if (vel?.moving) {
      renderX = lerp(pos.previousX, pos.x, vel.progress);
      renderY = lerp(pos.previousY, pos.y, vel.progress);
    }

    const screenX = renderX * this.tileSize - this.context.camera.x + this.tileSize / 2;
    const screenY = renderY * this.tileSize - this.context.camera.y + this.tileSize / 2;
    const w = collider.width * this.tileSize;
    const h = collider.height * this.tileSize;
    const ox = collider.offsetX * this.tileSize;
    const oy = collider.offsetY * this.tileSize;

    this.ctx.save();
    this.ctx.strokeStyle = collider.solid ? '#ff0000' : '#ffff00';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    // Centro alinhado com o sprite (screenX + ox)
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