// MovementSystem — Movimento em grid WASD com colisão de paredes
// Opera sobre entities com Position + Velocity + Collider (solid)

import { System } from '../core/System.js';
import { Position } from '../components/Position.js';
import { Velocity } from '../components/Velocity.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { MOVE_DURATION, TILE_TYPE, DIRS, KEYS } from '../utils/constants.js';
import { isWalkable, getTileDef } from '../map/TileType.js';
import { eventBus } from '../core/EventBus.js';
import { INTERACT_KEY } from './InputSystem.js';

export class MovementSystem extends System {
  constructor() {
    super(200); // Depois do InputSystem
    this.requiredComponents = ['Position', 'Velocity'];
    this.pendingMoves = new Map(); // entityId -> { targetX, targetY, resolve }
  }

  onAdd(game) {
    this.engine = game;
    this.inputSystem = game.getSystem?.('InputSystem');
  }

  // Obtém gridMap da cena atual
  get gridMap() {
    return this.engine?.currentScene?.gridMap;
  }

  // Tenta mover entity para direção
  tryMove(entity, dirX, dirY) {
    const pos = entity.get(Position);
    const vel = entity.get(Velocity);
    const collider = entity.get(Collider);

    // DEBUG
    console.log(`🔧 tryMove: dir=(${dirX},${dirY}) | pos=(${pos?.x},${pos?.y}) | vel.moving=${vel?.moving} | gridMap=${!!this.gridMap} | collider=${!!collider}`);

    if (!pos || !vel || vel.moving) return false; // Já está movendo

    const targetX = pos.x + dirX;
    const targetY = pos.y + dirY;

    // Verifica colisão com mapa
    const mapColl = this.checkMapCollision(targetX, targetY, collider);
    console.log(`   checkMapCollision(${targetX},${targetY}) = ${mapColl}`);
    if (!mapColl) return false; // Bloqueado por parede/porta

    // Verifica colisão com outras entities (solid)
    const entColl = this.checkEntityCollision(entity, targetX, targetY);
    console.log(`   checkEntityCollision = ${entColl}`);
    if (!entColl) return false; // Bloqueado por outra entity

    // Inicia movimento suave
    vel.moveTo(targetX, targetY, MOVE_DURATION);
    pos.previousX = pos.x;
    pos.previousY = pos.y;

    // Commit da posição lógica (para colisão de outros)
    pos.x = targetX;
    pos.y = targetY;

    console.log(`✅ Movimento iniciado para (${targetX},${targetY})`);
    return true;
  }

  // Colisão com tiles do mapa
  checkMapCollision(x, y, collider) {
    if (!collider || !collider.solid) return true; // Ghost mode

    // DEBUG
    console.log(`   🔍 checkMapCollision: gridMap=${!!this.gridMap} | x=${x},y=${y}`);

    if (!this.gridMap) {
      console.warn('⚠️ checkMapCollision: gridMap é undefined!');
      return false;
    }

    // Verifica tile principal
    const tileType = this.gridMap.get(x, y);
    const walkable = isWalkable(tileType);
    console.log(`   Tile (${x},${y}) = type ${tileType} | walkable=${walkable}`);
    if (!walkable) return false;

    // Se entity > 1 tile, verifica todos
    if (collider.width > 1 || collider.height > 1) {
      const halfW = Math.floor(collider.width / 2);
      const halfH = Math.floor(collider.height / 2);
      for (let dy = -halfH; dy <= halfH; dy++) {
        for (let dx = -halfW; dx <= halfW; dx++) {
          const tx = x + dx;
          const ty = y + dy;
          const t = this.gridMap.get(tx, ty);
          if (!isWalkable(t)) return false;
        }
      }
    }

    return true;
  }

  // Colisão com outras entities
  checkEntityCollision(movingEntity, targetX, targetY) {
    const movingCollider = movingEntity.get(Collider);
    if (!movingCollider || !movingCollider.solid) return true;

    const movingPos = movingEntity.get('Position');
    if (!movingPos) return true;

    // Verifica todas outras entities com collider solid
    for (const entity of this.engine.currentScene.entities) {
      if (entity === movingEntity || !entity.active) continue;
      const otherCollider = entity.get(Collider);
      const otherPos = entity.get(Position);
      if (!otherCollider || !otherCollider.solid || !otherPos) continue;

      // AABB check
      if (movingCollider.checkAABB(
        { x: targetX + movingCollider.offsetX, y: targetY + movingCollider.offsetY },
        { x: otherPos.x + otherCollider.offsetX, y: otherPos.y + otherCollider.offsetY },
        otherCollider
      )) {
        // Player encostou em inimigo → inicia combate
        const isPlayer = movingEntity.hasTag('player');
        const isEnemy = entity.hasTag('enemy');
        if (isPlayer && isEnemy) {
          console.log('⚔️ Player encostou em inimigo — iniciando combate!');
          eventBus.emit('combatStart', { player: movingEntity, enemy: entity });
          return false; // Bloqueia movimento, combate assume
        }

        // Trigger genérico (portas, itens, etc)
        if (otherCollider.trigger && otherCollider.onEnter) {
          otherCollider.onEnter(movingEntity, entity);
        }
        return false; // Bloqueado
      }
    }

    return true;
  }

  // Update: processa input E movimento suave (lerp)
  update(dt, entities, game) {
    const inputSystem = this.engine.getSystem?.('InputSystem');
    if (!inputSystem) return;

    // 1. Verifica input para iniciar movimento (apenas player)
    if (inputSystem.lastDirection) {
      const dir = inputSystem.lastDirection;
      const player = entities.find(e => e.hasTag('player'));
      if (player) {
        const moved = this.tryMove(player, dir.x, dir.y);
        if (moved) console.log(`🚶 Player moveu: ${dir.name} (${dir.x},${dir.y})`);
      }
      inputSystem.lastDirection = null;
    }

    // 2. Verifica tecla E para interagir (portas, escadas, etc)
    if (inputSystem.getInteractPressed?.()) {
      const player = entities.find(e => e.hasTag('player'));
      if (player) this.handleInteractionAt(player);
      inputSystem.consumeInteract?.();
    }

    // 2. Processa movimento suave (lerp) APENAS para entities que estão movendo
    for (const entity of entities) {
      const vel = entity.get(Velocity);
      if (!vel || !vel.moving) continue; // Pula inimigos parados

      const completed = vel.update(dt);

      // Movimento completado - verifica triggers no tile final
      if (completed) {
        this.onTileEntered(entity);
      }
    }
  }

  // Chamado quando entity chega no tile alvo
  onTileEntered(entity) {
    const pos = entity.get(Position);
    if (!pos) return;

    // Verifica feature interativa (porta, escada, armadilha)
    const interactable = this.gridMap.getInteractable(pos.x, pos.y);
    if (interactable) {
      this.handleInteraction(entity, interactable, pos.x, pos.y);
    }

    // Evento para outros systems (combate, etc)
    this.engine?.eventBus.emit('entityMoved', { entity, x: pos.x, y: pos.y });
  }

  handleInteraction(entity, interactable, x, y) {
    const playerTag = entity.get(PlayerTag);
    if (!playerTag) return; // Só player interage por enquanto

    switch (interactable.action) {
      case 'open':
        this.openDoor(x, y);
        break;
      case 'close':
        this.closeDoor(x, y);
        break;
      case 'descend':
        this.engine.eventBus.emit('changeFloor', { direction: 'down' });
        break;
      case 'ascend':
        this.engine.eventBus.emit('changeFloor', { direction: 'up' });
        break;
    }
  }

  // Interação via tecla E (porta adjacente ou tile atual)
  handleInteractionAt(entity) {
    const pos = entity.get(Position);
    if (!pos) return;

    // 1. Tenta interagir com tile atual (escadas)
    let interactable = this.gridMap.getInteractable(pos.x, pos.y);
    if (interactable) {
      this.handleInteraction(entity, interactable, pos.x, pos.y);
      return;
    }

    // 2. Tenta porta adjacente (olha na direção que o player está virado)
    const inputSystem = this.engine.getSystem?.('InputSystem');
    const lastDir = inputSystem?.lastDirection || { x: 0, y: 1 }; // default baixo
    const adjX = pos.x + lastDir.x;
    const adjY = pos.y + lastDir.y;

    interactable = this.gridMap.getInteractable(adjX, adjY);
    if (interactable && (interactable.action === 'open' || interactable.action === 'close')) {
      this.handleInteraction(entity, interactable, adjX, adjY);
      return;
    }
  }

  openDoor(x, y) {
    const key = `${x},${y}`;
    const feature = this.gridMap.features.get(key);
    if (feature && feature.type === 'door') {
      feature.state = 'open';
      this.gridMap.set(x, y, TILE_TYPE.DOOR_OPEN);
      this.engine.eventBus.emit('doorOpened', { x, y });
    }
  }

  closeDoor(x, y) {
    const key = `${x},${y}`;
    const feature = this.gridMap.features.get(key);
    if (feature && feature.type === 'door') {
      feature.state = 'closed';
      this.gridMap.set(x, y, TILE_TYPE.DOOR_CLOSED);
      this.engine.eventBus.emit('doorClosed', { x, y });
    }
  }

  // Helper para systems externos (ex: knockback, teleport)
  teleport(entity, x, y) {
    const pos = entity.get(Position);
    const vel = entity.get(Velocity);
    if (!pos || !vel) return false;

    if (!this.checkMapCollision(x, y, entity.get(Collider))) return false;
    if (!this.checkEntityCollision(entity, x, y)) return false;

    vel.stop();
    pos.set(x, y);
    return true;
  }
}