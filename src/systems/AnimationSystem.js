// AnimationSystem — Gerencia animações de sprites baseado no estado da entity
// Toca idle/walk/attack/hit/death automaticamente

import { System } from '../core/System.js';
import { Sprite } from '../components/Sprite.js';
import { Velocity } from '../components/Velocity.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { Combatant } from '../components/Combatant.js';
import { eventBus } from '../core/EventBus.js';

export class AnimationSystem extends System {
  constructor() {
    super(300); // Depois do MovementSystem
    this.requiredComponents = ['Sprite', 'Velocity'];
  }

  onAdd(game) {
    this.engine = game;

    // Escuta eventos de combate para animações
    this.unsubAttack = eventBus.on('combatAction', (data) => this.onCombatAction(data));
    this.unsubCombatEnd = eventBus.on('combatEnded', (data) => this.onCombatEnd(data));
  }

  onRemove() {
    this.unsubAttack?.();
    this.unsubCombatEnd?.();
  }

  update(dt, entities, game) {
    for (const entity of entities) {
      const sprite = entity.get(Sprite);
      const vel = entity.get(Velocity);
      if (!sprite || !vel) continue;

      // Atualiza timer da animação
      sprite.update(dt);

      // Determina animação baseada no estado
      this.updateAnimation(entity, sprite, vel);
    }
  }

  updateAnimation(entity, sprite, vel) {
    const isPlayer = entity.hasTag('player');
    const isEnemy = entity.hasTag('enemy');

    // Se está em animação que não deve ser interrompida (attack, hit, death)
    if (sprite.currentAnimation && ['attack', 'hit', 'death'].includes(sprite.currentAnimation)) {
      if (sprite.playing) return; // Deixa terminar
    }

    // Morte
    if (isPlayer) {
      const tag = entity.get(PlayerTag);
      const combatant = entity.get(Combatant);
      const hp = combatant?.hp ?? tag?.hp ?? 1;
      if (hp <= 0 && sprite.currentAnimation !== 'death') {
        sprite.playAnimation('death');
        return;
      }
    } else if (isEnemy) {
      const combatant = entity.get(Combatant);
      if (combatant && combatant.hp <= 0 && sprite.currentAnimation !== 'death') {
        sprite.playAnimation('death');
        return;
      }
    }

    // Movimento
    if (vel.moving) {
      if (sprite.currentAnimation !== 'walk') {
        sprite.playAnimation('walk');
      }
      // Atualiza facing baseado na direção do movimento
      if (vel.targetX > vel.startX) sprite.facing = 'right';
      else if (vel.targetX < vel.startX) sprite.facing = 'left';
      else if (vel.targetY > vel.startY) sprite.facing = 'down';
      else if (vel.targetY < vel.startY) sprite.facing = 'up';
    } else {
      // Parado - idle
      if (sprite.currentAnimation !== 'idle' && sprite.currentAnimation !== 'walk') {
        sprite.playAnimation('idle');
      }
    }
  }

  // Eventos de combate
  onCombatAction(data) {
    const { actor, target, action } = data;
    const targetSprite = target?.entity?.get(Sprite);
    const actorSprite = actor?.entity?.get(Sprite);

    if (action === 'attack' && targetSprite) {
      // Alvo: animação de hit
      targetSprite.playAnimation('hit');
    }
    if (action === 'attack' && actorSprite) {
      // Ator: animação de attack
      actorSprite.playAnimation('attack');
    }
    if (action === 'defend' && actorSprite) {
      actorSprite.playAnimation('idle'); // Ou defesa se tiver
    }
  }

  onCombatEnd(data) {
    const { victory, player, enemy } = data;
    const playerSprite = player?.entity?.get(Sprite);
    const enemySprite = enemy?.entity?.get(Sprite);

    if (!victory && playerSprite) {
      playerSprite.playAnimation('death');
    }
    if (victory && enemySprite) {
      enemySprite.playAnimation('death');
    }
  }
}