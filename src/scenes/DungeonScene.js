// DungeonScene — Cena principal de exploração da masmorra
// GridMap, player, inimigos, spawn, transição de andares

import { Scene } from '../core/Scene.js';
import { Entity } from '../core/Entity.js';
import { GridMap } from '../map/GridMap.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Sprite } from '../components/Sprite.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { createPlayer } from '../entities/createPlayer.js';
import { createEnemy } from '../entities/createEnemy.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { TILE_TYPE, COLORS, MOVE_DURATION } from '../utils/constants.js';
import { eventBus } from '../core/EventBus.js';

export class DungeonScene extends Scene {
  constructor() {
    super('DungeonScene');
    this.gridMap = null;
    this.floor = 1;
    this.player = null;
  }

  init(game) {
    super.init(game);

    // Cria mapa (teste procedural)
    this.gridMap = GridMap.generateTestMap();
    this.floor = 1;

    // Adiciona systems à CENA (essencial!)
    this.addSystem(new InputSystem());
    this.addSystem(new MovementSystem());
    // RenderSystem é global no engine, não precisa aqui

    // Spawn player
    this.spawnPlayer();

    // Spawn inimigos
    this.spawnEnemies();

    // Subscreve eventos
    this.unsubFloorChange = eventBus.on('changeFloor', this.onFloorChange.bind(this));
    this.unsubDoorOpen = eventBus.on('doorOpened', this.onDoorOpen.bind(this));
    this.unsubEntityMoved = eventBus.on('entityMoved', this.onEntityMoved.bind(this));
  }

  onEnter(data = {}) {
    // Se veio de mudança de andar, reposiciona player
    if (data.floor) {
      this.floor = data.floor;
      this.regenerateFloor();
    }
  }

  onExit() {
    super.onExit();
    this.unsubFloorChange?.();
    this.unsubDoorOpen?.();
    this.unsubEntityMoved?.();
  }

  // Spawn do player na posição definida no mapa
  spawnPlayer() {
    const spawn = this.gridMap.playerSpawn;
    this.player = createPlayer(spawn.x, spawn.y);
    this.addEntity(this.player);
    this.player.addTag('player');

    // Camera segue player
    this.engine.renderer.context.follow(this.player, this.engine.canvas.width, this.engine.canvas.height, 32);
  }

  // Spawn inimigos nos pontos definidos
  spawnEnemies() {
    this.gridMap.enemySpawns.forEach((spawn, i) => {
      const enemy = createEnemy(spawn.x, spawn.y, i + 1);
      this.addEntity(enemy);
      enemy.addTag('enemy');
    });
  }

  // Regenera andar (nova dungeon)
  regenerateFloor() {
    // Remove entities antigas (exceto player)
    this.entities = this.entities.filter(e => e.hasTag('player'));
    this.player = this.getFirstByTag('player');

    // Gera novo mapa
    this.gridMap = GridMap.generateTestMap();

    // Reposiciona player na entrada (escada cima) ou spawn padrão
    const pos = this.player.get(Position);
    if (this.gridMap.stairsUp.length > 0) {
      const stair = this.gridMap.stairsUp[0];
      if (pos) pos.set(stair.x, stair.y);
    } else if (pos) {
      pos.set(this.gridMap.playerSpawn.x, this.gridMap.playerSpawn.y);
    }

    // Novos inimigos
    this.spawnEnemies();

    // Atualiza UI
    this.updateFloorUI();
  }

  // Eventos
  onFloorChange({ direction }) {
    if (direction === 'down') this.floor++;
    else if (direction === 'up') this.floor = Math.max(1, this.floor - 1);

    this.regenerateFloor();
    this.updateFloorUI();
  }

  onDoorOpen({ x, y }) {
    // Porta aberta - tile já atualizado no MovementSystem
  }

  onEntityMoved({ entity, x, y }) {
    // Player pisou em escada?
    if (entity.hasTag('player')) {
      const feature = this.gridMap.getInteractable(x, y);
      if (feature?.type === 'stairs_down' || feature?.type === 'stairs_up') {
        // Auto-trigger ao pisar
        this.engine.eventBus.emit('changeFloor', {
          direction: feature.type === 'stairs_down' ? 'down' : 'up'
        });
      }
    }
  }

  updateFloorUI() {
    const el = document.getElementById('floor-display');
    if (el) el.textContent = this.floor;
  }

  // Update UI do player (HP/AP)
  updatePlayerUI() {
    if (!this.player) return;
    const tag = this.player.get('PlayerTag');
    if (!tag) return;

    const hpEl = document.getElementById('hp-display');
    const apEl = document.getElementById('ap-display');
    if (hpEl) hpEl.textContent = `${tag.hp}/${tag.maxHP}`;
    if (apEl) apEl.textContent = `${tag.ap}/${tag.maxAP}`;

    // Cor do HP
    if (hpEl) {
      const ratio = tag.hp / tag.maxHP;
      hpEl.style.color = ratio > 0.6 ? COLORS.HP_HIGH : ratio > 0.3 ? COLORS.HP_MID : COLORS.HP_LOW;
    }
  }

  // Override update para UI
  update(dt) {
    super.update(dt);
    this.updatePlayerUI();

    // Camera follow
    if (this.player && this.engine.renderer) {
      this.engine.renderer.context.follow(
        this.player,
        this.engine.canvas.width,
        this.engine.canvas.height,
        32
      );
      this.engine.renderer.context.clamp(
        this.gridMap.width, this.gridMap.height,
        this.engine.canvas.width, this.engine.canvas.height,
        32
      );
    }
  }
}