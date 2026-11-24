// CombatScene — Cena de combate por turnos
// Transição dramática, gerencia CombatSystem + CombatUI

import { Scene } from '../core/Scene.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { CombatUI } from '../ui/CombatUI.js';
import { Combatant } from '../components/Combatant.js';
import { eventBus } from '../core/EventBus.js';
import { GAME_STATE } from '../utils/constants.js';

export class CombatScene extends Scene {
  constructor() {
    super('CombatScene');
    this.combatSystem = null;
    this.combatUI = null;
    this.playerEntity = null;
    this.enemyEntity = null;
    this.returnData = null; // Dados para voltar ao dungeon
    this.lootDrops = [];
  }

  init(game) {
    super.init(game);
    this.combatSystem = new CombatSystem();
    this.addSystem(this.combatSystem);
    this.addSystem(new AnimationSystem());

    // Cria UI (precisa do renderer)
    // Será inicializado no onEnter quando renderer estiver pronto
  }

  onEnter(data = {}) {
    this.lootDrops = [];
    this.playerEntity = data.playerEntity;
    this.enemyEntity = data.enemyEntity;
    this.returnData = data.returnData || {};

    if (!this.playerEntity || !this.enemyEntity) {
      console.error('CombatScene: Missing player or enemy entity');
      this.exitCombat(false);
      return;
    }

    // Garante que ambos têm Combatant component
    this.ensureCombatantComponents();
    const playerCombatant = this.playerEntity.get(Combatant);
    const enemyCombatant = this.enemyEntity.get(Combatant);
    if (!playerCombatant || !enemyCombatant) {
      console.error('CombatScene: Não foi possível criar os combatentes.');
      this.exitCombat(false);
      return;
    }
    playerCombatant.entity = this.playerEntity;
    enemyCombatant.entity = this.enemyEntity;
    this.entities = [];
    this.addEntity(this.playerEntity);
    this.addEntity(this.enemyEntity);

    // Inicializa UI com renderer
    if (this.engine?.renderer && !this.combatUI) {
      this.combatUI = new CombatUI(this.engine.renderer, this.combatSystem);
    }

    // ===== ANIMAÇÃO DE ENTRADA DE COMBATE =====
    // 1. Flash branco rápido (screen flash)
    this.engine.renderer.context.flash(0.15, '#ffffff');
    // 2. Shake forte da tela
    this.combatUI?.shake(15, 300);
    // 3. Fade in dramático
    this.engine.renderer.context.fadeIn(400);

    // Inicia combate após breve delay para animação
    setTimeout(() => {
      this.combatUI?.show(playerCombatant, enemyCombatant);
      this.unsubAction = eventBus.on('combatAction', data => this.onCombatAction(data));
      this.unsubTurn = eventBus.on('turnStarted', data => this.onTurnStarted(data));
      this.unsubLoot = eventBus.on('lootDropped', data => this.onLootDropped(data));
      this.unsubBoss = eventBus.on('bossEnraged', data => this.onBossEnraged(data));

      const started = this.combatSystem.startCombat(
        this.playerEntity,
        this.enemyEntity,
        (victory, combatData) => this.onCombatEnd(victory, combatData)
      );

      if (!started) {
        this.exitCombat(false);
        return;
      }

    }, 400);
  }

  onExit() {
    super.onExit();
    this.unsubAction?.();
    this.unsubTurn?.();
    this.unsubLoot?.();
    this.unsubBoss?.();
    this.combatUI?.hide();
    this.combatUI?.destroy();
    this.combatUI = null;
  }

  // Garante Combatant components (migra de PlayerTag/collider se necessário)
  ensureCombatantComponents() {
    // Player: migra de PlayerTag se não tem Combatant
    if (!this.playerEntity.has('Combatant')) {
      const playerTag = this.playerEntity.get('PlayerTag');
      if (playerTag) {
        const combatant = Combatant.createPlayer({
          name: playerTag.name,
          maxHP: playerTag.maxHP,
          hp: playerTag.hp,
          attack: playerTag.attack,
          defense: playerTag.defense,
          speed: playerTag.speed,
          maxAP: playerTag.maxAP,
          ap: playerTag.ap,
          xp: playerTag.xp,
          xpToNext: playerTag.xpToNext,
          level: playerTag.level,
          skillPoints: playerTag.skillPoints,
          unlockedSkills: playerTag.unlockedSkills
        });
        combatant.entity = this.playerEntity;
        this.playerEntity.add(combatant);
        // Sincroniza de volta ao PlayerTag
        this.syncPlayerTag(combatant);
      }
    }

    // Enemy: migra de collider.enemyData se não tem Combatant
    if (!this.enemyEntity.has('Combatant')) {
      const collider = this.enemyEntity.get('Collider');
      if (collider?.enemyData) {
        const combatant = Combatant.createEnemy(collider.enemyData);
        combatant.entity = this.enemyEntity;
        this.enemyEntity.add(combatant);
      }
    }
  }

  // Sincroniza Combatant -> PlayerTag (para persistência)
  syncPlayerTag(combatant) {
    const playerTag = this.playerEntity.get('PlayerTag');
    if (playerTag) {
      playerTag.maxHP = combatant.maxHP;
      playerTag.hp = combatant.hp;
      playerTag.attack = combatant.attack;
      playerTag.defense = combatant.defense;
      playerTag.speed = combatant.speed;
      playerTag.maxAP = combatant.maxAP;
      playerTag.ap = combatant.ap;
      playerTag.xp = combatant.xp;
      playerTag.xpToNext = combatant.xpToNext;
      playerTag.level = combatant.level;
      playerTag.skillPoints = combatant.skillPoints;
      playerTag.unlockedSkills = [...combatant.unlockedSkills];
    }
  }

  // Eventos do combat system
  onCombatAction(data) {
    const isPlayer = data.actor.isPlayer;

    // Log via queueMessage (nova UI estilo Pokémon)
    if (data.message) {
      this.combatUI?.queueMessage(data.message);
    }

    // Animação de dano
    if (['attack', 'boss_attack'].includes(data.action) && data.target) {
      const targetPos = data.target.entity?.get('Position');
      if (targetPos) {
        this.combatUI?.showDamageNumber(
          targetPos.x, targetPos.y,
          data.damage, false, data.damage > data.actor.attack * 1.5
        );
      }
      this.combatUI?.triggerAttackAnimation(isPlayer);
      this.combatUI?.shake(data.action === 'boss_attack' ? 12 : 6, 200);
    }

    // Defesa
    if (data.action === 'defend') {
      this.combatUI?.queueMessage(`🛡️ ${data.actor.name} se defende!`);
    }

    // Atualiza painéis de HP/AP
    this.updateCombatantPanels();
  }

  onLootDropped(drop) {
    this.lootDrops.push(drop);
    this.combatUI?.queueMessage(`Obteve: ${drop.itemName} (${drop.rarity}).`);
  }

  onBossEnraged({ enemy }) {
    this.combatUI?.queueMessage(`${enemy.name} ficou enfurecido!`);
    this.combatUI?.shake(10, 250);
  }

  onTurnStarted(data) {
    this.updateCombatantPanels();
    this.combatUI?.queueMessage(`▶ Turno de ${data.combatant.name}`);
    if (data.isPlayer) {
      this.combatUI?.backToMainMenu();
    } else {
      this.combatUI?.hideMenus();
    }
  }

  // Atualiza painéis de ambos combatentes
  updateCombatantPanels() {
    const playerCombatant = this.playerEntity?.get(Combatant);
    const enemyCombatant = this.enemyEntity?.get(Combatant);
    if (playerCombatant && enemyCombatant) {
      this.combatUI?.updateCombatantPanels?.();
    }
  }

  // Fim do combate
  async onCombatEnd(victory, combatData) {
    combatData.lootDrops = [...this.lootDrops];
    // Toca animação de vitória/derrota na UI
    await this.combatUI?.onCombatEnd(victory, combatData);

    // Fade out e volta para dungeon
    this.engine.renderer.context.fadeOut(500, () => {
      this.exitCombat(victory, combatData);
    });
  }

  exitCombat(victory, combatData = {}) {
    // Prepara dados de retorno
    const returnData = {
      ...this.returnData,
      victory,
      combatData,
      playerHP: this.playerEntity.get(Combatant)?.hp || 0,
      playerAP: this.playerEntity.get(Combatant)?.ap || 0
    };

    // Sincroniza stats de volta ao PlayerTag
    const combatant = this.playerEntity.get(Combatant);
    if (combatant) this.syncPlayerTag(combatant);
    const enemyCombatant = this.enemyEntity.get(Combatant);
    const enemyData = this.enemyEntity.get('Collider')?.enemyData;
    if (enemyCombatant && enemyData) {
      Object.assign(enemyData, {
        hp: enemyCombatant.hp,
        maxHP: enemyCombatant.maxHP,
        attack: enemyCombatant.attack,
        defense: enemyCombatant.defense,
        speed: enemyCombatant.speed,
        bossEnraged: enemyCombatant.bossEnraged
      });
    }

    // Volta para DungeonScene
    this.engine.changeScene('dungeon', returnData);
  }

  // Update - delega para CombatSystem e CombatUI
  update(dt) {
    super.update(dt);
    this.combatUI?.update(dt);
  }

  // Render - CombatUI renderiza damage numbers + shake
  render(renderer, camera, alpha) {
    super.render(renderer, camera, alpha);

    // Aplica screen shake
    const shake = this.combatUI?.getShakeOffset() || { x: 0, y: 0 };
    camera.x += shake.x;
    camera.y += shake.y;

    // Render damage numbers
    this.combatUI?.renderDamageNumbers(renderer.ctx, camera);
  }
}