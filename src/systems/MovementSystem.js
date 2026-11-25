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
    this.enemyMoveAccumulator = 0;
    this.enemyAttackCooldowns = new Map();
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
          if (this.engine.renderer?.firstPerson) return false;
          eventBus.emit('combatStart', { player: movingEntity, enemy: entity });
          return false; // Bloqueia movimento, combate assume
        }
        if (movingEntity.hasTag('enemy') && isPlayer) {
          if (this.engine.renderer?.firstPerson) {
            eventBus.emit('actionEnemyAttack', { enemy: movingEntity });
            return false;
          }
          eventBus.emit('combatStart', { player: entity, enemy: movingEntity });
          return false;
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

    if (this.engine.renderer?.firstPerson) {
      const player = entities.find(entity => entity.hasTag('player'));
      for (const entity of entities) {
        entity.get(Velocity)?.stop();
      }
      if (player) this.updateFreeMovement(dt, entities, player, inputSystem);
      inputSystem.lastDirection = null;
      if (inputSystem.getInteractPressed?.() && player) {
        this.handleInteractionAt(player);
        inputSystem.consumeInteract?.();
      }
      this.updateFreeEnemyAI(dt, entities, player);
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

    this.updateMovingEntities(dt, entities);

    // Inimigos patrulham e perseguem o jogador em um raio curto
    const player = entities.find(entity => entity.hasTag('player'));
    this.updateEnemyAI(dt, entities, player);
  }

  updateMovingEntities(dt, entities) {
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

  updateEnemyAI(dt, entities, player) {
    if (!player) return;
    this.enemyMoveAccumulator += dt;
    if (this.enemyMoveAccumulator >= 720) {
      this.enemyMoveAccumulator = 0;
      this.moveEnemies(entities, player);
    }
  }

  updateFreeMovement(dt, entities, player, inputSystem) {
    const renderer = this.engine.renderer;
    const position = player.get(Position);
    if (!position) return;
    const keys = this.engine.input.keys;
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) -
      Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) -
      Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const length = Math.hypot(forward, strafe);
    const yaw = renderer.yaw;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.5 : 4;
    const step = length ? speed * dt / 1000 / length : 0;
    const dx = (Math.sin(yaw) * forward - Math.cos(yaw) * strafe) * step;
    const dy = (Math.cos(yaw) * forward + Math.sin(yaw) * strafe) * step;
    const nextX = position.x + dx;
    const nextY = position.y + dy;
    const canOccupy = (x, y) => {
      const radius = 0.2;
      for (const [offsetX, offsetY] of [
        [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]
      ]) {
        if (!this.gridMap.isWalkable(
          Math.floor(x + offsetX + 0.5),
          Math.floor(y + offsetY + 0.5)
        )) return false;
      }
      return !entities.some(entity => {
        if (!entity.active || !entity.hasTag('enemy')) return false;
        const other = entity.get(Position);
        return other && Math.hypot(x - other.x, y - other.y) < 0.58;
      });
    };

    let resolvedX = position.x;
    let resolvedY = position.y;
    if (canOccupy(nextX, position.y)) resolvedX = nextX;
    if (canOccupy(resolvedX, nextY)) resolvedY = nextY;
    if (resolvedX !== position.x || resolvedY !== position.y) {
      const oldCellX = Math.floor(position.x + 0.5);
      const oldCellY = Math.floor(position.y + 0.5);
      position.set(resolvedX, resolvedY);
      if (oldCellX !== Math.floor(resolvedX + 0.5) ||
          oldCellY !== Math.floor(resolvedY + 0.5)) {
        this.onTileEntered(player);
      }
    }

    const facingX = Math.sin(yaw);
    const facingY = Math.cos(yaw);
    inputSystem.facing = Math.abs(facingX) > Math.abs(facingY)
      ? { x: Math.sign(facingX), y: 0, name: facingX > 0 ? 'RIGHT' : 'LEFT' }
      : { x: 0, y: Math.sign(facingY), name: facingY > 0 ? 'DOWN' : 'UP' };
  }

  moveEnemies(entities, player) {
    const playerPos = player.get(Position);
    if (!playerPos) return;
    for (const enemy of entities) {
      if (!enemy.active || !enemy.hasTag('enemy')) continue;
      const enemyPos = enemy.get(Position);
      const velocity = enemy.get(Velocity);
      if (!enemyPos || !velocity || velocity.moving) continue;
      const distance = Math.abs(enemyPos.x - playerPos.x) + Math.abs(enemyPos.y - playerPos.y);
      if (distance > 8) continue;

      const horizontal = Math.sign(playerPos.x - enemyPos.x);
      const vertical = Math.sign(playerPos.y - enemyPos.y);
      const first = Math.random() < 0.55
        ? { x: horizontal, y: 0 }
        : { x: 0, y: vertical };
      const second = first.x !== 0 ? { x: 0, y: vertical } : { x: horizontal, y: 0 };
      if (this.tryMove(enemy, first.x, first.y)) continue;
      this.tryMove(enemy, second.x, second.y);
    }
  }

  updateFreeEnemyAI(dt, entities, player) {
    const playerPos = player?.get(Position);
    if (!playerPos || !this.gridMap) return;

    for (const enemy of entities) {
    if (!enemy.active || !enemy.hasTag('enemy')) continue;
    const enemyPos = enemy.get(Position);
    if (!enemyPos) continue;

    const dx = playerPos.x - enemyPos.x;
    const dy = playerPos.y - enemyPos.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) continue;

    const cooldown = Math.max(0, (this.enemyAttackCooldowns.get(enemy.id) || 0) - dt);
    this.enemyAttackCooldowns.set(enemy.id, cooldown);
    if (distance <= 0.86) {
      if (cooldown === 0) {
        eventBus.emit('actionEnemyAttack', { enemy });
        this.enemyAttackCooldowns.set(enemy.id, 1250);
      }
      continue;
    }

    const enemyData = enemy.get(Collider)?.enemyData;
    const speed = 1.15 + (enemyData?.speed || 4) * 0.075;
    const step = Math.min(distance - 0.68, speed * dt / 1000);
    const moveX = dx / distance * step;
    const moveY = dy / distance * step;
    const canOccupy = (x, y) => {
      const radius = 0.22;
      for (const [offsetX, offsetY] of [
        [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]
      ]) {
        if (!this.gridMap.isWalkable(
          Math.floor(x + offsetX + 0.5),
          Math.floor(y + offsetY + 0.5)
        )) return false;
      }
      return !entities.some(other => {
        if (!other.active || other === enemy ||
            (!other.hasTag('enemy') && !other.hasTag('player'))) return false;
        const otherPos = other.get(Position);
        return otherPos && Math.hypot(x - otherPos.x, y - otherPos.y) < 0.58;
      });
    };

    let nextX = enemyPos.x + moveX;
    let nextY = enemyPos.y;
    if (!canOccupy(nextX, nextY)) nextX = enemyPos.x;
    nextY = enemyPos.y + moveY;
    if (!canOccupy(nextX, nextY)) nextY = enemyPos.y;
    if (nextX !== enemyPos.x || nextY !== enemyPos.y) {
      enemyPos.set(nextX, nextY);
    }
    }
  }

  // Chamado quando entity chega no tile alvo
  onTileEntered(entity) {
    const pos = entity.get(Position);
    if (!pos) return;

    // Evento para outros systems (combate, etc)
    eventBus.emit('entityMoved', {
      entity,
      x: Math.floor(pos.x + 0.5),
      y: Math.floor(pos.y + 0.5)
    });
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
      case 'destroy_crate': {
        eventBus.emit('actionCrate', { x, y });
        break;
      }
    }
  }

  // Interação via tecla E (porta adjacente ou tile atual)
  handleInteractionAt(entity) {
    const pos = entity.get(Position);
    if (!pos) return;
    const tileX = Math.floor(pos.x + 0.5);
    const tileY = Math.floor(pos.y + 0.5);

    // 1. Tenta interagir com tile atual (escadas)
    let interactable = this.gridMap.getInteractable(tileX, tileY);
    if (interactable) {
      this.handleInteraction(entity, interactable, tileX, tileY);
      return;
    }

    // 2. Olha na direção persistente do player
    const inputSystem = this.engine.getSystem?.('InputSystem');
    const facing = inputSystem?.facing || { x: 0, y: 1 };
    const adjX = tileX + facing.x;
    const adjY = tileY + facing.y;

    interactable = this.gridMap.getInteractable(adjX, adjY);
    if (interactable && ['open', 'close', 'reveal', 'pickup', 'event', 'destroy_crate'].includes(interactable.action)) {
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