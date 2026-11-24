// CombatSystem — Lógica de combate por turnos
// Iniciativa por speed, ações: Atacar, Defender, Item, Fugir

import { System } from '../core/System.js';
import { Combatant } from '../components/Combatant.js';
import { eventBus } from '../core/EventBus.js';

export class CombatSystem extends System {
  constructor() {
    super(50); // Prioridade média
    this.requiredComponents = ['Combatant']; // Opera sobre combatentes

    // Estado do combate
    this.combatants = [];      // Array ordenado por iniciativa
    this.currentTurnIndex = 0;
    this.currentCombatant = null;
    this.turnPhase = 'idle';   // 'idle' | 'playerAction' | 'enemyAction' | 'resolve' | 'ended'
    this.combatLog = [];
    this.playerEntity = null;
    this.enemyEntity = null;
    this.onCombatEnd = null;   // Callback (victory, data)
    this.enemyTurnTimer = null;
  }

  onRemove() {
    clearTimeout(this.enemyTurnTimer);
    this.enemyTurnTimer = null;
  }

  scheduleEnemyTurn() {
    clearTimeout(this.enemyTurnTimer);
    this.enemyTurnTimer = setTimeout(() => {
      this.enemyTurnTimer = null;
      this.executeEnemyAI();
    }, 800);
  }

  // Inicia novo combate
  startCombat(playerEntity, enemyEntity, onEndCallback) {
    clearTimeout(this.enemyTurnTimer);
    this.enemyTurnTimer = null;
    this.playerEntity = playerEntity;
    this.enemyEntity = enemyEntity;
    this.onCombatEnd = onEndCallback;

    const playerCombatant = playerEntity.get(Combatant);
    const enemyCombatant = enemyEntity.get(Combatant);

    if (!playerCombatant || !enemyCombatant) {
      console.error('CombatSystem: Combatant component missing!');
      return false;
    }

    // Reset AP
    playerCombatant.resetAP();
    enemyCombatant.resetAP();

    // Determina ordem por speed (maior primeiro)
    this.combatants = [
      { entity: playerEntity, combatant: playerCombatant },
      { entity: enemyEntity, combatant: enemyCombatant }
    ].sort((a, b) => b.combatant.speed - a.combatant.speed);

    this.currentTurnIndex = 0;
    this.currentCombatant = this.combatants[0];
    this.turnPhase = this.currentCombatant.combatant.isPlayer ? 'playerAction' : 'enemyAction';
    this.combatLog = [];

    this.log(`${this.currentCombatant.combatant.name} inicia o combate! (Speed: ${this.currentCombatant.combatant.speed})`);

    // Notifica UI
    eventBus.emit('combatStarted', {
      combatants: this.combatants.map(c => c.combatant),
      firstTurn: this.currentCombatant.combatant
    });
    eventBus.emit('turnStarted', {
      combatant: this.currentCombatant.combatant,
      isPlayer: this.currentCombatant.combatant.isPlayer
    });
    if (!this.currentCombatant.combatant.isPlayer) this.scheduleEnemyTurn();

    return true;
  }

  // Próximo turno
  nextTurn() {
    // Atualiza status effects do combatante atual
    this.currentCombatant.combatant.updateStatusEffects();

    // Avança índice
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.combatants.length;
    this.currentCombatant = this.combatants[this.currentTurnIndex];

    // Reset AP do novo combatante
    this.currentCombatant.combatant.resetAP();

    // Verifica fim de combate
    if (!this.checkCombatEnd()) {
      this.turnPhase = this.currentCombatant.combatant.isPlayer ? 'playerAction' : 'enemyAction';
      this.log(`Turno de ${this.currentCombatant.combatant.name} (AP: ${this.currentCombatant.combatant.ap}/${this.currentCombatant.combatant.maxAP})`);

      eventBus.emit('turnStarted', {
        combatant: this.currentCombatant.combatant,
        isPlayer: this.currentCombatant.combatant.isPlayer
      });

      // Se é inimigo, executa IA após delay
      if (!this.currentCombatant.combatant.isPlayer) {
        this.scheduleEnemyTurn();
      }
    }
  }

  // Verifica se combate acabou
  checkCombatEnd() {
    const player = this.playerEntity.get(Combatant);
    const enemy = this.enemyEntity.get(Combatant);

    if (!player.isAlive()) {
      this.endCombat(false); // Derrota
      return true;
    }
    if (!enemy.isAlive()) {
      this.endCombat(true); // Vitória
      return true;
    }
    return false;
  }

  // Finaliza combate
  endCombat(victory, extraData = {}) {
    clearTimeout(this.enemyTurnTimer);
    this.enemyTurnTimer = null;
    this.turnPhase = 'ended';

    const player = this.playerEntity.get(Combatant);
    const enemy = this.enemyEntity.get(Combatant);
    const fled = extraData.fled === true;

    if (victory) {
      this.log(`🏆 Vitória! ${enemy.name} derrotado!`);
      player.gainXP(enemy.xp);
      this.log(`+${enemy.xp} XP`);
      if (player.level > 1) { // Se levelou up agora
        this.log(`⬆ Level Up! Nível ${player.level}`);
      }
    } else if (fled) {
      this.log(`🏃 Fuga bem-sucedida!`);
    } else {
      this.log(`💀 Derrota... ${player.name} caiu.`);
    }

    eventBus.emit('combatEnded', {
      victory,
      fled,
      player,
      enemy,
      xpGained: victory ? enemy.xp : 0,
      goldGained: victory ? Math.floor(enemy.xp * 0.5) : 0,
      leveledUp: victory && player.level > 1
    });

    // Marca inimigo como morto para remoção (se vitória)
    if (victory && this.enemyEntity) {
      this.enemyEntity.active = false;
      eventBus.emit('enemyDefeated', { enemy: this.enemyEntity });
    }

    // Callback para scene trocar de volta
    if (this.onCombatEnd) {
      setTimeout(() => this.onCombatEnd(victory, {
        player,
        enemy,
        xpGained: victory ? enemy.xp : 0,
        goldGained: victory ? Math.floor(enemy.xp * 0.5) : 0,
        fled,
        leveledUp: victory && player.level > 1
      }), 1500);
    }
  }

  // --- Ações do Player ---

  // Atacar
  playerAttack() {
    if (this.turnPhase !== 'playerAction') return false;
    const player = this.playerEntity.get(Combatant);
    if (!player.useAP(2)) return false; // Custa 2 AP

    const enemy = this.enemyEntity.get(Combatant);
    const result = enemy.takeDamage(player.attack, player);

    this.log(`⚔️ ${player.name} ataca ${enemy.name} por ${result.damage} de dano! (HP: ${enemy.hp}/${enemy.maxHP})`);

    eventBus.emit('combatAction', {
      actor: player,
      target: enemy,
      action: 'attack',
      damage: result.damage,
      killed: result.killed
    });

    if (result.killed) {
      this.checkCombatEnd();
    } else {
      this.nextTurn();
    }
    return true;
  }

  // Defender (gasta 1 AP, reduz próximo dano pela metade)
  playerDefend() {
    if (this.turnPhase !== 'playerAction') return false;
    const player = this.playerEntity.get(Combatant);
    if (!player.useAP(1)) return false;

    player.isDefending = true;
    this.log(`🛡️ ${player.name} assume postura defensiva!`);

    eventBus.emit('combatAction', {
      actor: player,
      action: 'defend'
    });

    this.nextTurn();
    return true;
  }

  // Usar item (placeholder - integra com inventário depois)
  playerUseItem(itemIndex) {
    if (this.turnPhase !== 'playerAction') return false;
    const player = this.playerEntity.get(Combatant);
    if (!player.useAP(2)) return false;

    // TODO: Integrar com sistema de inventário
    this.log(`🧪 ${player.name} usa item... (TODO: inventário)`);
    this.nextTurn();
    return true;
  }

  // Fugir (chance baseada em speed)
  playerFlee() {
    if (this.turnPhase !== 'playerAction') return false;
    const player = this.playerEntity.get(Combatant);
    const enemy = this.enemyEntity.get(Combatant);

    // Chance = 50% + (playerSpeed - enemySpeed) * 5%
    const fleeChance = 0.5 + (player.speed - enemy.speed) * 0.05;
    const success = Math.random() < Math.max(0.1, Math.min(0.9, fleeChance));

    if (success) {
      this.log(`🏃 ${player.name} fugiu com sucesso!`);
      eventBus.emit('combatFled', { player, enemy });
      this.endCombat(null, { fled: true }); // null = fugiu
      return { success: true };
    } else {
      this.log(`❌ ${player.name} não conseguiu fugir!`);
      eventBus.emit('combatFleeAttempt', { player, enemy, success: false });
      this.nextTurn();
      return { success: false };
    }
  }

  // --- IA do Inimigo ---

  executeEnemyAI() {
    if (this.turnPhase !== 'enemyAction') return;
    const enemy = this.enemyEntity.get(Combatant);
    const player = this.playerEntity.get(Combatant);

    // IA simples: ataca se tem AP, senão defende
    if (enemy.ap >= 2) {
      this.enemyAttack();
    } else if (enemy.ap >= 1) {
      this.enemyDefend();
    } else {
      this.nextTurn();
    }
  }

  enemyAttack() {
    const enemy = this.enemyEntity.get(Combatant);
    const player = this.playerEntity.get(Combatant);

    if (!enemy.useAP(2)) {
      this.nextTurn();
      return;
    }

    const result = player.takeDamage(enemy.attack, enemy);

    this.log(`💥 ${enemy.name} ataca ${player.name} por ${result.damage} de dano! (HP: ${player.hp}/${player.maxHP})`);

    eventBus.emit('combatAction', {
      actor: enemy,
      target: player,
      action: 'attack',
      damage: result.damage,
      killed: result.killed
    });

    if (result.killed) {
      this.checkCombatEnd();
    } else {
      this.nextTurn();
    }
  }

  enemyDefend() {
    const enemy = this.enemyEntity.get(Combatant);
    if (!enemy.useAP(1)) {
      this.nextTurn();
      return;
    }

    enemy.isDefending = true;
    this.log(`🛡️ ${enemy.name} se prepara para defender!`);

    eventBus.emit('combatAction', {
      actor: enemy,
      action: 'defend'
    });

    this.nextTurn();
  }

  // --- Log ---

  log(message) {
    const entry = { time: Date.now(), message };
    this.combatLog.push(entry);
    console.log(`[COMBAT] ${message}`);
  }

  getLog() {
    return this.combatLog;
  }

  // --- Getters para UI ---

  getCurrentCombatant() {
    return this.currentCombatant?.combatant || null;
  }

  isPlayerTurn() {
    return this.turnPhase === 'playerAction';
  }

  getCombatants() {
    return this.combatants.map(c => c.combatant);
  }
}