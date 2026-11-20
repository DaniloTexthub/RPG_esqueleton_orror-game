// Sprite — Configuração visual da entity
// Suporta: cor sólida, imagem, spritesheet, animações futuras

import { Component } from '../core/Component.js';
import { TILE_SIZE, COLORS } from '../utils/constants.js';

export class Sprite extends Component {
  constructor(config = {}) {
    super();
    // Tipo de render: 'color', 'image', 'spritesheet', 'skeleton'
    this.type = config.type || 'color';

    // Cor sólida (fallback/debug)
    this.color = config.color || COLORS.PLAYER;
    this.accentColor = config.accentColor || COLORS.PLAYER_ACCENT;

    // Imagem única
    this.image = config.image || null; // HTMLImageElement
    this.imageSrc = config.imageSrc || null; // Path para lazy load

    // Spritesheet
    this.sheet = config.sheet || null; // HTMLImageElement
    this.sheetSrc = config.sheetSrc || null;
    this.frameWidth = config.frameWidth || TILE_SIZE;
    this.frameHeight = config.frameHeight || TILE_SIZE;
    this.framesPerRow = config.framesPerRow || 1;
    this.currentFrame = config.currentFrame || 0;
    this.frameCount = config.frameCount || 1;
    this.frameDuration = config.frameDuration || 200; // ms
    this.frameTimer = 0;
    this.playing = config.playing || false;
    this.loop = config.loop !== false;

    // Offset de render (para centralizar, etc)
    this.offsetX = config.offsetX || 0;
    this.offsetY = config.offsetY || 0;
    this.scale = config.scale || 1;

    // Skeleton (futuro: partes separadas)
    this.parts = config.parts || null; // { head, torso, arms, legs }

    // Z-index para layering
    this.zIndex = config.zIndex || 10;
  }

  // Atualiza animação
  update(dt) {
    if (!this.playing || this.frameCount <= 1) return;

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      this.currentFrame++;
      if (this.currentFrame >= this.frameCount) {
        if (this.loop) this.currentFrame = 0;
        else {
          this.currentFrame = this.frameCount - 1;
          this.playing = false;
        }
      }
    }
  }

  // Inicia animação
  play(frameCount, frameDuration, loop = true) {
    this.frameCount = frameCount;
    this.frameDuration = frameDuration;
    this.loop = loop;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.playing = true;
  }

  // Para animação
  stop() {
    this.playing = false;
    this.currentFrame = 0;
  }

  // Calcula source rect do spritesheet
  getFrameRect() {
    const col = this.currentFrame % this.framesPerRow;
    const row = Math.floor(this.currentFrame / this.framesPerRow);
    return {
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      w: this.frameWidth,
      h: this.frameHeight
    };
  }
}