// Engine — Game loop principal, gerenciamento de cenas, renderer abstraction
// Permite trocar renderer (Canvas2D, WebGL, Three.js) sem mudar game logic

import { Scene } from './Scene.js';
import { EventBus } from './EventBus.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_STATE } from '../utils/constants.js';

export class Engine {
  constructor(canvasId = 'game-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.renderer = null; // Setado via setRenderer()

    // Config canvas
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx.imageSmoothingEnabled = false; // Pixel art sharp

    // Estado
    this.currentScene = null;
    this.scenes = new Map();
    this.gameState = GAME_STATE.PLAYING;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedTimestep = 1000 / 60; // 60 FPS fixed

    // Camera
    this.camera = { x: 0, y: 0 };

    // Global event bus
    this.eventBus = new EventBus();

    // Debug
    this.debug = false;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;

    // Input state (preenchido por InputSystem)
    this.input = {
      keys: new Set(),
      justPressed: new Set(),
      justReleased: new Set()
    };
  }

  // Define renderer (CanvasRenderer, WebGLRenderer, etc.)
  setRenderer(renderer) {
    this.renderer = renderer;
    this.renderer.engine = this;
    this.renderer.resize(this.canvas.width, this.canvas.height);
  }

  // Registra cena
  addScene(name, scene) {
    scene.engine = this;
    this.scenes.set(name, scene);
  }

  // Troca cena
  changeScene(name, data = {}) {
    if (this.currentScene) {
      this.currentScene.onExit();
    }
    this.currentScene = this.scenes.get(name);
    if (!this.currentScene) {
      console.error(`Scene '${name}' not found`);
      return;
    }
    if (!this.currentScene.initialized) {
      this.currentScene.init(this);
    }
    this.currentScene.onEnter(data);
    this.eventBus.emit('sceneChanged', { name, data });
  }

  // Helper para systems acessarem outros systems da cena atual
  getSystem(name) {
    if (!this.currentScene) return null;
    return this.currentScene.systems.find(s => s.constructor.name === name) || null;
  }

  // Game loop principal
  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.running = false;
  }

  loop(currentTime) {
    if (!this.running) return;

    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.lastFrameDt = dt; // Para animações no render

    // FPS counter
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Fixed timestep para lógica determinística
    this.accumulator += dt;
    while (this.accumulator >= this.fixedTimestep) {
      this.fixedUpdate(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }

    // Interpolação para render suave
    const alpha = this.accumulator / this.fixedTimestep;
    this.render(alpha);

    requestAnimationFrame(this.loop.bind(this));
  }

  // Update de lógica fixa (dt em ms)
  fixedUpdate(dt) {
    if (this.currentScene) {
      this.currentScene.update(dt);
    }

    // Input: limpa justPressed/justReleased APÓS scene.update (InputSystem já consumiu)
    this.input.justPressed.clear();
    this.input.justReleased.clear();

    this.eventBus.emit('fixedUpdate', { dt });
  }

  // Render com interpolação
  render(alpha) {
    if (!this.renderer) return;

    this.renderer.clear();

    // Atualiza fade (precisa do contexto do renderer)
    const context = this.renderer.context;
    if (context && typeof context.updateFade === 'function') {
      context.updateFade();
    }
    // Atualiza flash
    if (context && typeof context.updateFlash === 'function') {
      context.updateFlash();
    }

    // Usa RenderSystem global se disponível, senão fallback para scene.render()
    if (this.renderSystem && typeof this.renderSystem.render === 'function') {
      this.renderSystem.render(this.renderer, this.camera, alpha);
    } else if (this.currentScene) {
      this.currentScene.render(this.renderer, this.camera, alpha);
    }

    // Desenha overlay de fade por cima de tudo
    if (context && typeof context.drawFade === 'function') {
      context.drawFade(this.ctx, this.canvas.width, this.canvas.height);
    }
    // Desenha overlay de flash por cima de tudo (último)
    if (context && typeof context.drawFlash === 'function') {
      context.drawFlash(this.ctx, this.canvas.width, this.canvas.height);
    }

    this.renderer.flush?.();

    // Debug overlay
    if (this.debug) this.renderDebug();
  }

  renderDebug() {
    this.ctx.save();
    this.ctx.font = '10px monospace';
    this.ctx.fillStyle = '#666';
    this.ctx.fillText(`FPS: ${this.fps}`, 8, this.canvas.height - 24);
    this.ctx.fillText(`Entities: ${this.currentScene?.entities.length || 0}`, 8, this.canvas.height - 12);
    this.ctx.restore();
  }

  // Helpers
  toggleDebug() {
    this.debug = !this.debug;
  }

  // Screen shake (para horror/combat)
  shake(intensity = 4, duration = 200) {
    this.camera.shake = { intensity, time: duration, start: Date.now() };
  }
}

// Instância global (acesso fácil em systems)
export let engine = null;

export function createEngine(canvasId) {
  engine = new Engine(canvasId);
  return engine;
}