// DungeonScene — Cena principal de exploração da masmorra
// GridMap, player, inimigos, spawn, transição de andares

import { Scene } from '../core/Scene.js';
import { GridMap } from '../map/GridMap.js';
import { Position } from '../components/Position.js';
import { Collider } from '../components/Collider.js';
import { PlayerTag } from '../components/PlayerTag.js';
import { Combatant } from '../components/Combatant.js';
import { createPlayer } from '../entities/createPlayer.js';
import { createEnemy } from '../entities/createEnemy.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { LootSystem } from '../systems/LootSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { MerchantUI } from '../ui/MerchantUI.js';
import { SAVE_SLOTS, SaveSystem } from '../systems/SaveSystem.js';
import { TILE_TYPE, COLORS, GRID_WIDTH, GRID_HEIGHT } from '../utils/constants.js';
import { eventBus } from '../core/EventBus.js';
import { lerp } from '../utils/math.js';

export class DungeonScene extends Scene {
  constructor(saveSystem = new SaveSystem()) {
    super('DungeonScene');
    this.saveSystem = saveSystem;
    this.inventorySystem = new InventorySystem();
    this.lootSystem = new LootSystem();
    this.skillSystem = new SkillSystem();
    this.gridMap = null;
    this.floor = 1;
    this.player = null;
    this.characterId = 'skeleton_warrior';
    this.isNewGame = true;
    this.slotId = SAVE_SLOTS[0];
    this.seed = null;
    this.defeatedEnemySpawns = new Set();
    this.collectedItems = new Set();
    this.saveTimer = null;
    this.toastTimer = null;
  }

  init(game) {
    super.init(game);

    // Cria um mapa procedural conectado
    this.gridMap = GridMap.generateDungeon();
    this.seed = this.gridMap.seed;
    this.floor = 1;

    // Adiciona systems à CENA (essencial!)
    this.addSystem(new InputSystem());
    this.addSystem(new MovementSystem());
    this.addSystem(new AnimationSystem());
    this.inventoryUI = new InventoryUI(
      this.inventorySystem,
      this.skillSystem,
      () => this.saveGame(),
      this.engine
    );
    this.merchantUI = new MerchantUI(this.engine);
    this.toast = document.createElement('div');
    this.toast.style.cssText = `
      position: fixed; top: 72px; left: 50%; transform: translateX(-50%);
      z-index: 1200; display: none; padding: 10px 14px; color: #eee;
      background: rgba(15, 15, 15, .95); border: 1px solid #8b0000;
      font: 10px 'Press Start 2P', 'Courier New', monospace;
    `;
    document.body.appendChild(this.toast);

    // Spawn player (será sobrescrito no onEnter se vier do menu)
    this.spawnPlayer();

    // Spawn inimigos
    this.spawnEnemies();

  }

  onEnter(data = {}) {
    this.subscribeEvents();
    // Reanexa listeners do InputSystem (necessário ao voltar de outras cenas)
    const inputSystem = this.systems.find(s => s.constructor.name === 'InputSystem');
    if (inputSystem) inputSystem.onAdd(this.engine);

    this.slotId = data.slotId || this.slotId;
    if (data.savedGame) {
      this.restoreSavedGame(data.savedGame);
      this.engine.renderer.context.fadeIn(400);
      return;
    }

    // Veio do MENU — novo jogo ou save legado
    if (data.characterId) {
      this.characterId = data.characterId;
      this.floor = data.floor || 1;
      this.isNewGame = data.isNewGame !== false;

      // Fade in ao entrar na masmorra (novo jogo ou continue)
      this.engine.renderer.context.fadeIn(400);

      // Regenera player com a classe escolhida
      this.replacePlayerWithClass(this.characterId);

      // Se novo jogo, regenera andar do zero
      if (this.isNewGame) {
        this.floor = 1;
        this.regenerateFloor(this.createSeed());
        this.scheduleAutoSave();
      } else {
        this.regenerateFloor();
        this.player.get(PlayerTag).floor = this.floor;
        this.scheduleAutoSave();
      }
      return;
    }

    // Veio de combate — restaura estado do player, NÃO regenera andar
    if (data.victory !== undefined) {
      const isFlee = data.combatData?.fled === true;
      const resultText = data.victory ? 'Vitória' : (isFlee ? 'Fuga' : 'Derrota');
      console.log(`📍 Voltando do combate: ${resultText}`);

      // Fade in para tirar a tela preta do fadeOut do combate
      this.engine.renderer.context.fadeIn(400);

      // Reanexa listeners do InputSystem (foram removidos no onExit ao ir pro combate)
      const inputSystem = this.systems.find(s => s.constructor.name === 'InputSystem');
      if (inputSystem) inputSystem.onAdd(this.engine);

      this.player = this.getFirstByTag('player');
      if (this.player) {
        const combatant = this.player.get('Combatant');
        if (combatant) {
          // HP/AP já sincronizados via CombatScene, mas garante UI
          this.updatePlayerUI();
        }
        // Reposiciona player se tiver posição de retorno
        if (data.returnData?.playerPos) {
          const pos = this.player.get('Position');
          if (pos) pos.set(data.returnData.playerPos.x, data.returnData.playerPos.y);
        }
      }
      // Atualiza floor display
      this.updateFloorUI();

      // Se morreu no combate (derrota, não fuga), game over
      if (!data.victory && !isFlee) {
        this.gameOver();
      } else {
        this.scheduleAutoSave();
      }
      return;
    }

    // Se veio de mudança de andar, reposiciona player
    if (data.floor) {
      this.floor = data.floor;
      this.regenerateFloor();
      // Fade in ao mudar de andar
      this.engine.renderer.context.fadeIn(400);
    }
  }

  subscribeEvents() {
    this.unsubscribers?.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [
      eventBus.on('changeFloor', this.onFloorChange.bind(this)),
      eventBus.on('doorOpened', this.onDoorOpen.bind(this)),
      eventBus.on('doorClosed', this.onDoorOpen.bind(this)),
      eventBus.on('doorLocked', this.onDoorLocked.bind(this)),
      eventBus.on('entityMoved', this.onEntityMoved.bind(this)),
      eventBus.on('enemyDefeated', this.onEnemyDefeated.bind(this)),
      eventBus.on('playerHealed', this.onPlayerHealed.bind(this)),
      eventBus.on('itemPickedUp', this.onItemPickedUp.bind(this)),
      eventBus.on('dungeonEventInteract', this.onDungeonEventInteract.bind(this)),
      eventBus.on('secretFound', this.onSecretFound.bind(this))
    ];
  }

  createSeed() {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
  }

  restoreSavedGame(state) {
    if (!state.player || !Number.isInteger(state.seed) || !Number.isInteger(state.floor)) {
      throw new Error('O save está incompleto ou corrompido.');
    }

    this.floor = Math.max(1, state.floor);
    this.seed = state.seed >>> 0;
    this.characterId = state.characterId || state.player.characterId || 'skeleton_warrior';
    this.gridMap = GridMap.generateDungeon(GRID_WIDTH, GRID_HEIGHT, this.seed);
    this.entities = [];

    this.collectedItems = new Set(state.collectedItems || []);
    for (const key of this.collectedItems) {
      const [x, y] = key.split(',').map(Number);
      this.gridMap.removeFeature(x, y);
    }
    for (const savedFeature of state.featureStates || state.doors || []) {
      const feature = this.gridMap.features.get(`${savedFeature.x},${savedFeature.y}`);
      if (!feature) continue;
      Object.assign(feature, savedFeature);
      if (['door', 'secret_door'].includes(feature.type)) {
        const hidden = feature.type === 'secret_door' && feature.state === 'hidden';
        this.gridMap.set(feature.x, feature.y, hidden ? TILE_TYPE.WALL :
          feature.state === 'open' ? TILE_TYPE.DOOR_OPEN : TILE_TYPE.DOOR_CLOSED);
      }
    }

    const savedPlayer = state.player;
    const spawn = Number.isInteger(savedPlayer.x) && Number.isInteger(savedPlayer.y) &&
      this.gridMap.isWalkable(savedPlayer.x, savedPlayer.y)
      ? { x: savedPlayer.x, y: savedPlayer.y }
      : this.gridMap.playerSpawn;
    this.player = createPlayer(spawn.x, spawn.y, this.characterId, savedPlayer);
    this.player.get(PlayerTag).floor = this.floor;
    this.addEntity(this.player);
    this.player.addTag('player');

    this.defeatedEnemySpawns = new Set(state.defeatedEnemies || []);
    if (Array.isArray(state.enemies)) {
      for (const savedEnemy of state.enemies) {
        if (!this.gridMap.isWalkable(savedEnemy.x, savedEnemy.y)) continue;
        const enemy = createEnemy(savedEnemy.x, savedEnemy.y, savedEnemy.typeId || 1, {
          isBoss: savedEnemy.enemyData?.isBoss,
          floor: this.floor
        });
        const collider = enemy.get(Collider);
        collider.enemyData = { ...collider.enemyData, ...savedEnemy.enemyData };
        this.addEntity(enemy);
      }
    } else {
      this.spawnEnemies();
    }

    this.engine.renderer.context.follow(
      this.player, this.engine.canvas.width, this.engine.canvas.height, 32
    );
    this.updateFloorUI();
  }

  async saveGame() {
    if (!this.player || !this.slotId || !this.gridMap) return null;
    const tag = this.player.get(PlayerTag);
    const position = this.player.get(Position);
    const enemies = this.entities.filter(entity => entity.active && entity.hasTag('enemy'))
      .map(enemy => {
        const pos = enemy.get(Position);
        const data = { ...enemy.get(Collider)?.enemyData };
        const combatant = enemy.get(Combatant);
        if (combatant) {
          Object.assign(data, {
            hp: combatant.hp,
            maxHP: combatant.maxHP,
            attack: combatant.attack,
            defense: combatant.defense,
            speed: combatant.speed
          });
        }
        return { x: pos.x, y: pos.y, typeId: data.typeId || 1, enemyData: data };
      });

    const state = {
      version: 1,
      characterId: this.characterId,
      floor: this.floor,
      seed: this.seed,
      player: {
        x: position.x,
        y: position.y,
        name: tag.name,
        characterId: tag.characterId,
        level: tag.level,
        xp: tag.xp,
        xpToNext: tag.xpToNext,
        skillPoints: tag.skillPoints,
        gold: tag.gold,
        unlockedSkills: [...tag.unlockedSkills],
        hp: tag.hp,
        maxHP: tag.maxHP,
        attack: tag.attack,
        defense: tag.defense,
        speed: tag.speed,
        ap: tag.ap,
        maxAP: tag.maxAP,
        inventory: tag.inventory.map(item => ({ ...item })),
        equipped: { ...tag.equipped }
      },
      enemies,
      defeatedEnemies: [...this.defeatedEnemySpawns],
      collectedItems: [...this.collectedItems],
      featureStates: [...this.gridMap.features.values()]
        .filter(feature => ['door', 'secret_door', 'trap', 'sanctuary', 'merchant'].includes(feature.type))
        .map(({ x, y, type, state, locked, keyColor, used, activated }) => ({
          x, y, type, state, locked, keyColor, used, activated
        }))
    };
    return this.saveSystem.save(this.slotId, state);
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveGame().catch(error => console.error('Falha no autosave:', error));
    }, 350);
  }

  onEnemyDefeated({ enemy }) {
    const position = enemy.get(Position);
    this.defeatedEnemySpawns.add(`${position.x},${position.y}`);
    const enemyData = enemy.get(Collider)?.enemyData;
    const drop = this.lootSystem.roll(enemyData, this.floor);
    if (drop && this.inventorySystem.addItem(this.player, drop.itemId, drop.quantity)) {
      const item = this.inventorySystem.getDefinition(drop.itemId);
      eventBus.emit('lootDropped', {
        itemName: item.name,
        quantity: drop.quantity,
        rarity: drop.rarity,
        isBoss: enemyData?.isBoss === true
      });
    }
    this.updateProgress(progress => {
      progress.totalEnemiesKilled++;
    });
  }

  onItemPickedUp({ entity, x, y, itemId }) {
    if (!entity.hasTag('player') || !this.inventorySystem.addItem(entity, itemId)) return;
    this.gridMap.removeFeature(x, y);
    this.collectedItems.add(`${x},${y}`);
    this.showToast(`${this.inventorySystem.getDefinition(itemId).name} obtida.`);
    this.scheduleAutoSave();
  }

  onDungeonEventInteract({ entity, x, y, feature }) {
    if (!entity.hasTag('player')) return;
    if (feature.type === 'sanctuary') {
      const mapFeature = this.gridMap.features.get(`${x},${y}`);
      if (!mapFeature) return;
      if (mapFeature.used) {
        this.showToast('O santuário já foi usado.');
        return;
      }
      const tag = entity.get(PlayerTag);
      const combatant = entity.get(Combatant);
      const target = combatant || tag;
      const previousHP = target.hp;
      target.heal(Math.ceil(target.maxHP * 0.35));
      const healed = target.hp - previousHP;
      tag.hp = target.hp;
      mapFeature.used = true;
      eventBus.emit('playerHealed', { entity, amount: healed });
      this.showToast(`Santuário: recuperou ${healed} HP.`);
      this.scheduleAutoSave();
    } else if (feature.type === 'merchant') {
      this.merchantUI.show(this.player, [
        { itemId: 'small_potion', price: 8 },
        { itemId: 'large_potion', price: 18 },
        { itemId: 'rusty_sword', price: 40 },
        { itemId: 'leather_armor', price: 35 }
      ], (itemId, price) => this.purchaseItem(itemId, price));
    }
  }

  async purchaseItem(itemId, price) {
    const tag = this.player.get(PlayerTag);
    if (tag.gold < price) return { success: false, message: 'Ouro insuficiente.' };
    if (!this.inventorySystem.addItem(this.player, itemId)) {
      return { success: false, message: 'Não foi possível adicionar o item.' };
    }
    tag.gold -= price;
    try {
      await this.saveGame();
    } catch (error) {
      tag.gold += price;
      this.inventorySystem.consumeItem(this.player, itemId);
      throw error;
    }
    this.updatePlayerUI();
    return { success: true, message: `${this.inventorySystem.getDefinition(itemId).name} comprado.` };
  }

  onSecretFound() {
    this.showToast('Você encontrou uma sala secreta.');
    this.scheduleAutoSave();
  }

  triggerTrap(entity, feature) {
    feature.activated = true;
    const tag = entity.get(PlayerTag);
    const combatant = entity.get(Combatant);
    let damage;
    if (combatant) {
      damage = combatant.takeDamage(feature.damage + this.floor).damage;
      tag.hp = combatant.hp;
    } else {
      damage = Math.max(1, feature.damage + this.floor - tag.defense);
      tag.takeDamage(damage);
    }
    this.showToast(`Armadilha! Você perdeu ${damage} HP.`);
    this.updatePlayerUI();
    if (tag.hp <= 0) this.gameOver();
    else this.scheduleAutoSave();
  }

  onPlayerHealed({ entity, amount }) {
    if (!entity.hasTag('player') || amount <= 0) return;
    this.updateProgress(progress => {
      progress.totalHealingDone += amount;
    });
  }

  updateProgress(update) {
    try {
      const progress = this.saveSystem.loadProgress();
      update(progress);
      this.saveSystem.saveProgress(progress);
    } catch (error) {
      console.error('Falha ao atualizar o progresso:', error);
    }
  }

  // Substitui player existente por novo com classe escolhida
  replacePlayerWithClass(characterId) {
    const oldPlayer = this.getFirstByTag('player');
    const spawn = this.gridMap.playerSpawn;

    // Remove player antigo se existe
    if (oldPlayer) {
      this.removeEntity(oldPlayer);
    }

    // Cria novo player com a classe
    this.player = createPlayer(spawn.x, spawn.y, characterId);
    this.addEntity(this.player);
    this.player.addTag('player');

    // Camera segue player
    this.engine.renderer.context.follow(this.player, this.engine.canvas.width, this.engine.canvas.height, 32);
  }

  gameOver() {
    console.log('💀 GAME OVER');
    this.engine.gameState = 'game_over';
    // Volta para menu em vez de alert
    setTimeout(() => {
      this.engine.changeScene('menu');
    }, 1500);
  }

  onExit() {
    super.onExit();
    clearTimeout(this.saveTimer);
    clearTimeout(this.toastTimer);
    this.inventoryUI?.hide();
    this.merchantUI?.hide();
    if (this.toast) this.toast.style.display = 'none';
  }

  // Spawn do player na posição definida no mapa
  spawnPlayer() {
    const spawn = this.gridMap.playerSpawn;
    this.player = createPlayer(spawn.x, spawn.y, this.characterId);
    this.addEntity(this.player);
    this.player.addTag('player');

    // Camera segue player
    this.engine.renderer.context.follow(this.player, this.engine.canvas.width, this.engine.canvas.height, 32);
  }

  // Spawn inimigos nos pontos definidos
  spawnEnemies() {
    this.gridMap.enemySpawns.forEach((spawn, index) => {
      const enemyType = ((Math.imul((this.seed ^ (index + 1)) >>> 0, 0x9e3779b1) >>> 0) % 4) + 1;
      const isBoss = this.floor % 5 === 0 && index === 0;
      const enemy = createEnemy(spawn.x, spawn.y, enemyType, {
        isBoss,
        floor: this.floor
      });
      this.addEntity(enemy);
      enemy.addTag('enemy');
    });
  }

  // Regenera andar (nova dungeon)
  regenerateFloor(seed = this.createSeed()) {
    // Remove entities antigas (exceto player)
    this.entities = this.entities.filter(e => e.hasTag('player'));
    this.player = this.getFirstByTag('player');

    // Gera novo mapa
    this.seed = seed >>> 0;
    this.gridMap = GridMap.generateDungeon(GRID_WIDTH, GRID_HEIGHT, this.seed);
    this.defeatedEnemySpawns.clear();
    this.collectedItems.clear();

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
    if (this.player) this.player.get(PlayerTag).floor = this.floor;
  }

  // Eventos
  onFloorChange({ direction }) {
    if (direction === 'down') this.floor++;
    else if (direction === 'up') this.floor = Math.max(1, this.floor - 1);

    this.regenerateFloor();
    this.updateFloorUI();
    this.updateProgress(progress => {
      progress.highestFloor = Math.max(progress.highestFloor, this.floor);
    });
    this.scheduleAutoSave();
  }

  onDoorOpen({ x, y }) {
    // Porta aberta - tile já atualizado no MovementSystem
    this.scheduleAutoSave();
  }

  onDoorLocked() {
    this.showToast('A porta está trancada.');
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.style.display = 'none';
    }, 1800);
  }

  onEntityMoved({ entity, x, y }) {
    // Player pisou em escada?
    if (entity.hasTag('player')) {
      const mapFeature = this.gridMap.features.get(`${x},${y}`);
      if (mapFeature?.type === 'trap' && !mapFeature.activated) {
        this.triggerTrap(entity, mapFeature);
        if (entity.get(PlayerTag).hp <= 0) return;
      }
      const feature = this.gridMap.getInteractable(x, y);
      if (feature?.type === 'stairs_down' || feature?.type === 'stairs_up') {
        eventBus.emit('changeFloor', {
          direction: feature.type === 'stairs_down' ? 'down' : 'up'
        });
      }
      this.scheduleAutoSave();
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

    // Camera follow - usa posição interpolada durante movimento para evitar desync visual
    if (this.player && this.engine.renderer) {
      const vel = this.player.get('Velocity');
      const pos = this.player.get('Position');

      if (vel && vel.moving && pos) {
        // Usa posição interpolada (lerp) para câmera suave
        this.engine.renderer.context.followInterpolated(
          lerp(pos.previousX, pos.x, vel.progress),
          lerp(pos.previousY, pos.y, vel.progress),
          this.engine.canvas.width,
          this.engine.canvas.height,
          32
        );
      } else {
        // Parado: usa posição lógica normal
        this.engine.renderer.context.follow(
          this.player,
          this.engine.canvas.width,
          this.engine.canvas.height,
          32
        );
      }
      this.engine.renderer.context.clamp(
        this.gridMap.width, this.gridMap.height,
        this.engine.canvas.width, this.engine.canvas.height,
        32
      );
    }
  }
}