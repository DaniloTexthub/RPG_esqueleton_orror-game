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
import { InventorySystem } from './InventorySystem.js';

export class MovementSystem extends System {
  constructor() {
    super(200); // Depois do InputSystem
    this.requiredComponents = ['Position', 'Velocity'];
    this.pendingMoves = new Map(); // entityId -> { targetX, targetY, resolve }
    this.inventorySystem = new InventorySystem();
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

    if (!pos || !vel || vel.moving) return false; // Já está movendo

    const targetX = pos.x + dirX;
    const targetY = pos.y + dirY;

    // Verifica colisão com mapa
    const mapColl = this.checkMapCollision(targetX, targetY, collider);
    if (!mapColl) return false; // Bloqueado por parede/porta

    // Verifica colisão com outras entities (solid)
    const entColl = this.checkEntityCollision(entity, targetX, targetY);
    if (!entColl) return false; // Bloqueado por outra entity

    // Inicia movimento suave
    vel.moveTo(targetX, targetY, MOVE_DURATION);
    pos.previousX = pos.x;
    pos.previousY = pos.y;

    // Commit da posição lógica (para colisão de outros)
    pos.x = targetX;
    pos.y = targetY;

    return true;
  }

  // Colisão com tiles do mapa
  checkMapCollision(x, y, collider) {
    if (!collider || !collider.solid) return true; // Ghost mode
    if (!this.gridMap) return false;

    // Verifica tile e estado da feature na mesma posição
    if (!this.gridMap.isWalkable(x, y)) return false;

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
    if (this.engine.currentScene.inventoryUI?.visible ||
        this.engine.currentScene.merchantUI?.visible) {
      inputSystem.lastDirection = null;
      inputSystem.consumeInteract?.();
      return;
    }

    // 1. Verifica input para iniciar movimento (apenas player)
    if (inputSystem.lastDirection) {
      const dir = inputSystem.lastDirection;
      const player = entities.find(e => e.hasTag('player'));
      if (player) {
        const moved = this.tryMove(player, dir.x, dir.y);
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

    // Evento para outros systems (combate, etc)
    eventBus.emit('entityMoved', { entity, x: pos.x, y: pos.y });
  }

  handleInteraction(entity, interactable, x, y) {
    const playerTag = entity.get(PlayerTag);
    if (!playerTag) return; // Só player interage por enquanto

    switch (interactable.action) {
      case 'open': {
        const keyId = interactable.keyColor ? `key_${interactable.keyColor}` : 'dungeon_key';
        if (interactable.locked && !this.inventorySystem.consumeItem(entity, keyId)) {
          eventBus.emit('doorLocked', { x, y, keyColor: interactable.keyColor });
          break;
        }
        if (interactable.type === 'secret_door') this.openSecretDoor(x, y);
        else this.openDoor(x, y);
        break;
      }
      case 'close':
        this.closeDoor(x, y);
        break;
      case 'reveal':
        this.openSecretDoor(x, y);
        break;
      case 'pickup':
        eventBus.emit('itemPickedUp', {
          entity,
          x,
          y,
          itemId: interactable.itemId
        });
        break;
      case 'event':
        eventBus.emit('dungeonEventInteract', {
          entity,
          x,
          y,
          feature: interactable
        });
        break;
      case 'descend':
        eventBus.emit('changeFloor', { direction: 'down' });
        break;
      case 'ascend':
        eventBus.emit('changeFloor', { direction: 'up' });
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

    // 2. Olha na direção persistente do player
    const inputSystem = this.engine.getSystem?.('InputSystem');
    const facing = inputSystem?.facing || { x: 0, y: 1 };
    const adjX = pos.x + facing.x;
    const adjY = pos.y + facing.y;

    interactable = this.gridMap.getInteractable(adjX, adjY);
    if (interactable && ['open', 'close', 'reveal', 'pickup', 'event'].includes(interactable.action)) {
      this.handleInteraction(entity, interactable, adjX, adjY);
      return;
    }
  }

  openDoor(x, y) {
    const key = `${x},${y}`;
    const feature = this.gridMap.features.get(key);
    if (feature && feature.type === 'door') {
      feature.state = 'open';
      feature.locked = false;
      this.gridMap.set(x, y, TILE_TYPE.DOOR_OPEN);
      eventBus.emit('doorOpened', { x, y });
    }
  }

  openSecretDoor(x, y) {
    const feature = this.gridMap.features.get(`${x},${y}`);
    if (feature?.type !== 'secret_door') return;
    feature.state = 'open';
    this.gridMap.set(x, y, TILE_TYPE.DOOR_OPEN);
    eventBus.emit('secretFound', { x, y });
  }

  closeDoor(x, y) {
    const key = `${x},${y}`;
    const feature = this.gridMap.features.get(key);
    if (feature && ['door', 'secret_door'].includes(feature.type)) {
      feature.state = 'closed';
      this.gridMap.set(x, y, TILE_TYPE.DOOR_CLOSED);
      eventBus.emit('doorClosed', { x, y });
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