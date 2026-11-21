// Sprite — Configuração visual da entity
// Suporta: cor sólida, imagem, spritesheet, animações nomeadas

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

    // --- Sistema de Animações Nomeadas ---
    // animations: { 'idle': { frames: 4, frameDuration: 200, loop: true, row: 0 }, ... }
    this.animations = config.animations || {};
    this.currentAnimation = config.currentAnimation || null;
    this.facing = config.facing || 'down'; // 'up', 'down', 'left', 'right'

    // Offset de render (para centralizar, etc)
    this.offsetX = config.offsetX || 0;
    this.offsetY = config.offsetY || 0;
    this.scale = config.scale || 1;

    // Skeleton (futuro: partes separadas)
    this.parts = config.parts || null; // { head, torso, arms, legs }

    // Z-index para layering
    this.zIndex = config.zIndex || 10;
  }

  // Define animações (formato: { nome: { frames, frameDuration, loop, row, framesPerRow? } })
  setAnimations(animations) {
    this.animations = animations;
  }

  // Toca animação por nome
  playAnimation(name, reset = true) {
    const anim = this.animations[name];
    if (!anim) {
      console.warn(`Sprite: animação "${name}" não encontrada`);
      return false;
    }
    this.currentAnimation = name;
    this.frameCount = anim.frames;
    this.frameDuration = anim.frameDuration || 200;
    this.loop = anim.loop !== false;
    this.framesPerRow = anim.framesPerRow || this.framesPerRow;
    // Row no spritesheet (para animações em linhas diferentes)
    this.animationRow = anim.row || 0;
    if (reset) {
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
    this.playing = true;
    return true;
  }

  // Para animação atual
  stopAnimation() {
    this.playing = false;
    this.currentAnimation = null;
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  // Atualiza animação (chamado pelo RenderSystem ou sistema de animação)
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

  // Calcula source rect do spritesheet (considera row da animação atual)
  getFrameRect() {
    const col = this.currentFrame % this.framesPerRow;
    const row = this.animationRow !== undefined ? this.animationRow : Math.floor(this.currentFrame / this.framesPerRow);
    return {
      x: col * this.frameWidth,
      y: row * this.frameHeight,
      w: this.frameWidth,
      h: this.frameHeight
    };
  }

  // Helper: cria sprite com animações padrão do esqueleto
  static createSkeletonAnimations() {
    return {
      idle:     { frames: 4, frameDuration: 300, loop: true,  row: 0 },
      walk:     { frames: 6, frameDuration: 120, loop: true,  row: 1 },
      attack:   { frames: 4, frameDuration: 80,  loop: false, row: 2 },
      hit:      { frames: 2, frameDuration: 100, loop: false, row: 3 },
      death:    { frames: 6, frameDuration: 150, loop: false, row: 4 }
    };
  }

  // Helper: cria sprite com animações padrão de inimigos genéricos
  static createEnemyAnimations() {
    return {
      idle:   { frames: 4, frameDuration: 300, loop: true,  row: 0 },
      walk:   { frames: 4, frameDuration: 150, loop: true,  row: 1 },
      attack: { frames: 3, frameDuration: 100, loop: false, row: 2 },
      hit:    { frames: 2, frameDuration: 100, loop: false, row: 3 },
      death:  { frames: 4, frameDuration: 200, loop: false, row: 4 }
    };
  }
}