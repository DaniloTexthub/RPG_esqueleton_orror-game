// MenuScene — Menu principal, seleção de personagem, customização
// Gerencia navegação entre telas: Main → Character Select → Customization

import { Scene } from '../core/Scene.js';
import { eventBus } from '../core/EventBus.js';
import { CHARACTER_CLASSES, getAvailableClasses } from '../data/characters.js';
import { GAME_STATE } from '../utils/constants.js';

export class MenuScene extends Scene {
  constructor() {
    super('MenuScene');
    this.currentScreen = 'main'; // 'main' | 'characterSelect' | 'customization' | 'settings'
    this.selectedCharacterId = 'skeleton_warrior';
    this.menuIndex = 0;
    this.charSelectIndex = 0;
    this.customizeIndex = 0;
    this.saveData = this.loadSaveData();
    this.particles = []; // Partículas de fundo
  }

  init(game) {
    super.init(game);
    this.createMenuUI();
    this.bindKeys();
    this.startBackgroundAnimation();
  }

  onEnter() {
    this.currentScreen = 'main';
    this.menuIndex = 0;
    this.updateMenuHighlight();
    this.showScreen('main');
  }

  onExit() {
    super.onExit();
    this.stopBackgroundAnimation();
    this.menuUI?.remove();
    this.menuUI = null;
    window.removeEventListener('keydown', this.keyHandler);
  }

  // ========== CRIAÇÃO DA UI ==========

  createMenuUI() {
    this.menuUI = document.createElement('div');
    this.menuUI.id = 'menu-ui';
    this.menuUI.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #0a0a0a; z-index: 2000;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      color: #e0e0e0; overflow: hidden;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    this.menuUI.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        #menu-ui * { font-family: 'Press Start 2P', 'Courier New', monospace; }
        .menu-btn { transition: all 0.1s; cursor: pointer; }
        .menu-btn.selected { background: #444 !important; box-shadow: inset 0 0 15px #888; transform: scale(1.02); }
        .menu-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .screen { display: none; flex-direction: column; align-items: center; gap: 16px; width: 100%; max-width: 800px; padding: 20px; box-sizing: border-box; }
        .screen.active { display: flex; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .title { font-size: 28px; color: #8b0000; text-shadow: 0 0 20px #8b0000; margin-bottom: 8px; letter-spacing: 2px; }
        .subtitle { font-size: 10px; color: #888; margin-bottom: 24px; }
        .menu-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 500px; }
        .menu-btn {
          padding: 18px 24px; font-size: 14px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
          border: 3px solid #333; border-radius: 8px;
          text-shadow: 1px 1px 0 #000;
        }
        .menu-btn:hover:not(:disabled) { border-color: #8b0000; background: linear-gradient(135deg, #2a0a0a, #1a0505); }
        .menu-btn.start-btn { grid-column: span 2; background: linear-gradient(135deg, #8b0000, #5a0000); border-color: #ff3333; font-size: 18px; }
        .menu-btn.start-btn:hover { background: linear-gradient(135deg, #a00000, #700000); box-shadow: 0 0 30px #8b0000; }

        /* Character Select */
        .char-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; max-width: 900px; }
        .char-card {
          background: linear-gradient(135deg, #151515, #0a0a0a);
          border: 3px solid #333; border-radius: 12px; padding: 16px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          transition: all 0.2s; position: relative; min-height: 320px;
        }
        .char-card.selected { border-color: #8b0000; box-shadow: 0 0 30px rgba(139,0,0,0.5); transform: scale(1.02); }
        .char-card.locked { opacity: 0.5; filter: grayscale(0.8); }
        .char-card.locked::after {
          content: '🔒'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-size: 48px; pointer-events: none; z-index: 10;
        }
        .char-icon { font-size: 48px; }
        .char-name { font-size: 14px; font-weight: bold; text-align: center; }
        .char-title { font-size: 9px; color: #888; text-align: center; }
        .char-desc { font-size: 8px; color: #aaa; text-align: center; line-height: 1.4; flex: 1; }
        .char-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; width: 100%; font-size: 8px; }
        .stat { text-align: center; }
        .stat-label { color: #666; display: block; }
        .stat-value { color: #fff; font-weight: bold; }
        .char-moves { width: 100%; font-size: 7px; color: #888; }
        .move-item { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #222; }
        .move-item.unlocked { color: #6bff6b; }
        .move-item.locked { color: #555; }
        .unlock-hint { font-size: 8px; color: #f39c12; text-align: center; margin-top: 8px; }
        .select-btn { width: 100%; margin-top: auto; padding: 12px; font-size: 12px; background: linear-gradient(135deg, #8b0000, #5a0000); border: 2px solid #ff3333; border-radius: 6px; color: #fff; }
        .select-btn:disabled { background: #333; border-color: #555; color: #888; }

        /* Customization (Locked) */
        .customize-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 600px; }
        .customize-btn { padding: 16px; font-size: 12px; background: linear-gradient(135deg, #1a1a1a, #0d0d0d); border: 3px solid #333; border-radius: 8px; color: #fff; text-align: center; }
        .customize-btn.locked { opacity: 0.4; cursor: not-allowed; }
        .coming-soon { font-size: 9px; color: #f39c12; margin-top: 16px; text-align: center; }

        /* Back button */
        .back-btn { margin-top: 24px; padding: 12px 32px; font-size: 12px; background: linear-gradient(135deg, #333, #1a1a1a); border: 2px solid #555; border-radius: 6px; color: #aaa; width: 200px; }
        .back-btn:hover { border-color: #888; color: #fff; background: linear-gradient(135deg, #444, #2a2a2a); }

        /* Background particles canvas */
        #menu-bg-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
      </style>

      <!-- Tela Principal -->
      <div id="screen-main" class="screen active">
        <div class="title">RPG SKELETON DUNGEON</div>
        <div class="subtitle">Horror Turn-Based Dungeon Crawler</div>
        <div class="menu-grid">
          <button class="menu-btn start-btn" data-action="start" id="btn-start">⚔ INICIAR JOGO</button>
          <button class="menu-btn" data-action="continue" id="btn-continue">📜 CONTINUAR</button>
          <button class="menu-btn" data-action="customize" id="btn-customize">⚙ CUSTOMIZAÇÃO</button>
          <button class="menu-btn" data-action="settings" id="btn-settings">🔧 CONFIGURAÇÕES</button>
        </div>
      </div>

      <!-- Seleção de Personagem -->
      <div id="screen-characterSelect" class="screen">
        <div class="title" style="font-size: 20px;">ESCOLHA SUA CLASSE</div>
        <div class="subtitle">Use ← → ↑ ↓ para navegar | Enter para selecionar | ESC para voltar</div>
        <div class="char-grid" id="char-grid"></div>
        <button class="back-btn" data-action="back">← VOLTAR</button>
      </div>

      <!-- Customização (Bloqueada) -->
      <div id="screen-customize" class="screen">
        <div class="title" style="font-size: 20px;">CUSTOMIZAÇÃO</div>
        <div class="subtitle">Funcionalidades futuras — bloqueadas no momento</div>
        <div class="customize-grid">
          <button class="customize-btn locked" data-action="appearance">🎨 APARÊNCIA</button>
          <button class="customize-btn locked" data-action="loadout">🎒 LOADOUT INICIAL</button>
          <button class="customize-btn locked" data-action="colors">🌈 CORES</button>
          <button class="customize-btn locked" data-action="name">✏️ NOME</button>
        </div>
        <div class="coming-soon">🔒 Disponível em atualizações futuras</div>
        <button class="back-btn" data-action="back">← VOLTAR</button>
      </div>

      <!-- Configurações (Placeholder) -->
      <div id="screen-settings" class="screen">
        <div class="title" style="font-size: 20px;">CONFIGURAÇÕES</div>
        <div class="subtitle">Em desenvolvimento</div>
        <div class="customize-grid">
          <button class="customize-btn locked">🔊 ÁUDIO</button>
          <button class="customize-btn locked">🎮 CONTROLES</button>
          <button class="customize-btn locked">📺 VÍDEO</button>
          <button class="customize-btn locked">♿ ACESSIBILIDADE</button>
        </div>
        <div class="coming-soon">🔧 Em desenvolvimento</div>
        <button class="back-btn" data-action="back">← VOLTAR</button>
      </div>
    `;

    document.body.appendChild(this.menuUI);

    // Cache elements
    this.screens = {
      main: document.getElementById('screen-main'),
      characterSelect: document.getElementById('screen-characterSelect'),
      customize: document.getElementById('screen-customize'),
      settings: document.getElementById('screen-settings')
    };
    this.charGrid = document.getElementById('char-grid');
    this.menuButtons = this.screens.main.querySelectorAll('.menu-btn');
    this.backButtons = this.menuUI.querySelectorAll('.back-btn');

    // Render character cards
    this.renderCharacterGrid();

    // Add click handlers
    this.menuUI.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this.onAction(btn.dataset.action));
    });
  }

  renderCharacterGrid() {
    const classes = getAvailableClasses(this.saveData);
    this.charGrid.innerHTML = '';

    classes.forEach((charClass, index) => {
      const card = document.createElement('div');
      card.className = `char-card ${charClass.locked ? 'locked' : ''} ${index === this.charSelectIndex ? 'selected' : ''}`;
      card.dataset.charId = charClass.id;

      const unlockedMoves = charClass.moves.filter(m => m.unlockLevel === 1).length;
      const totalMoves = charClass.moves.length;

      card.innerHTML = `
        <div class="char-icon">${charClass.icon}</div>
        <div class="char-name" style="color: ${charClass.color}">${charClass.name}</div>
        <div class="char-title">${charClass.title}</div>
        <div class="char-desc">${charClass.description}</div>
        <div class="char-stats">
          <div class="stat"><div class="stat-label">HP</div><div class="stat-value">${charClass.baseStats.maxHP}</div></div>
          <div class="stat"><div class="stat-label">ATK</div><div class="stat-value">${charClass.baseStats.attack}</div></div>
          <div class="stat"><div class="stat-label">SPD</div><div class="stat-value">${charClass.baseStats.speed}</div></div>
          <div class="stat"><div class="stat-label">DEF</div><div class="stat-value">${charClass.baseStats.defense}</div></div>
          <div class="stat"><div class="stat-label">AP</div><div class="stat-value">${charClass.baseStats.maxAP}</div></div>
          <div class="stat"><div class="stat-label">XP</div><div class="stat-value">${charClass.baseStats.xpToNext}</div></div>
        </div>
        <div class="char-moves">
          ${charClass.moves.map(m => `
            <div class="move-item ${m.unlockLevel === 1 ? 'unlocked' : 'locked'}">
              <span>${m.name}</span>
              <span>${m.unlockLevel === 1 ? '✓' : `Lv.${m.unlockLevel}`}</span>
            </div>
          `).join('')}
        </div>
        ${charClass.unlockRequirement ? `
          <div class="unlock-hint">
            🔒 Desbloqueia: ${this.getUnlockText(charClass.unlockRequirement)}
          </div>
        ` : ''}
        <button class="select-btn" ${charClass.locked ? 'disabled' : ''} data-action="selectChar" data-char-id="${charClass.id}">
          ${charClass.locked ? 'BLOQUEADO' : 'SELECIONAR'}
        </button>
      `;

      this.charGrid.appendChild(card);
    });

    // Add click handlers for select buttons
    this.charGrid.querySelectorAll('.select-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => this.selectCharacter(btn.dataset.charId));
    });

    // Card click = select
    this.charGrid.querySelectorAll('.char-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => this.selectCharacter(card.dataset.charId));
    });
  }

  getUnlockText(req) {
    const texts = {
      floor: `Chegar ao andar ${req.value}`,
      enemies_killed: `Matar ${req.value} inimigos`,
      speed_runs: `Completar ${req.value} speedruns (<10 min)`,
      healing_done: `Curar ${req.value} HP total`
    };
    return texts[req.type] || 'Desconhecido';
  }

  // ========== NAVEGAÇÃO ==========

  showScreen(screenName) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[screenName]?.classList.add('active');
    this.currentScreen = screenName;
  }

  onAction(action) {
    switch (action) {
      case 'start':
        this.showScreen('characterSelect');
        this.charSelectIndex = 0;
        this.updateCharSelection();
        break;
      case 'continue':
        this.continueGame();
        break;
      case 'customize':
        this.showScreen('customize');
        break;
      case 'settings':
        this.showScreen('settings');
        break;
      case 'selectChar':
        // Handled by click on select button
        break;
      case 'back':
        this.goBack();
        break;
    }
  }

  goBack() {
    if (this.currentScreen === 'characterSelect') {
      this.showScreen('main');
      this.menuIndex = 0;
      this.updateMenuHighlight();
    } else if (this.currentScreen === 'customize' || this.currentScreen === 'settings') {
      this.showScreen('main');
      this.menuIndex = this.currentScreen === 'customize' ? 2 : 3;
      this.updateMenuHighlight();
    }
  }

  continueGame() {
    if (this.saveData?.lastFloor) {
      this.startGame(this.saveData.lastCharacter || 'skeleton_warrior', this.saveData.lastFloor);
    } else {
      this.showScreen('characterSelect');
    }
  }

  selectCharacter(charId) {
    this.selectedCharacterId = charId;
    this.startGame(charId, 1);
  }

  startGame(characterId, floor) {
    // Salva seleção
    this.saveData.lastCharacter = characterId;
    this.saveData.lastFloor = floor;
    this.saveSaveData(this.saveData);

    // Esconde menu
    this.menuUI.style.display = 'none';

    // Emite evento para engine trocar para DungeonScene
    eventBus.emit('menuStartGame', { characterId, floor });
  }

  // ========== TECLADO ==========

  bindKeys() {
    this.keyHandler = (e) => {
      if (!this.menuUI || this.menuUI.style.display === 'none') return;

      switch (this.currentScreen) {
        case 'main':
          this.handleMainKeys(e);
          break;
        case 'characterSelect':
          this.handleCharSelectKeys(e);
          break;
        case 'customize':
        case 'settings':
          if (e.key === 'Escape' || e.key === 'x') this.goBack();
          break;
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  handleMainKeys(e) {
    const cols = 2;
    let newIndex = this.menuIndex;

    switch (e.key) {
      case 'ArrowRight':
        if (this.menuIndex % cols < cols - 1) newIndex++;
        break;
      case 'ArrowLeft':
        if (this.menuIndex % cols > 0) newIndex--;
        break;
      case 'ArrowDown':
        if (Math.floor(this.menuIndex / cols) < 1) newIndex += cols;
        break;
      case 'ArrowUp':
        if (Math.floor(this.menuIndex / cols) > 0) newIndex -= cols;
        break;
      case 'Enter':
      case 'z':
      case ' ':
        this.menuButtons[this.menuIndex]?.click();
        return;
      case 'Escape':
      case 'x':
        return;
    }

    if (newIndex !== this.menuIndex) {
      this.menuIndex = Math.max(0, Math.min(3, newIndex));
      this.updateMenuHighlight();
    }
  }

  handleCharSelectKeys(e) {
    const cols = 3;
    const totalChars = Object.keys(CHARACTER_CLASSES).length;
    let newIndex = this.charSelectIndex;

    switch (e.key) {
      case 'ArrowRight':
        if (this.charSelectIndex % cols < cols - 1 && this.charSelectIndex + 1 < totalChars) newIndex++;
        break;
      case 'ArrowLeft':
        if (this.charSelectIndex % cols > 0) newIndex--;
        break;
      case 'ArrowDown':
        if (this.charSelectIndex + cols < totalChars) newIndex += cols;
        break;
      case 'ArrowUp':
        if (this.charSelectIndex - cols >= 0) newIndex -= cols;
        break;
      case 'Enter':
      case 'z':
      case ' ':
        // Seleciona o personagem atual se não bloqueado
        const classes = getAvailableClasses(this.saveData);
        if (classes[this.charSelectIndex] && !classes[this.charSelectIndex].locked) {
          this.selectCharacter(classes[this.charSelectIndex].id);
        }
        return;
      case 'Escape':
      case 'x':
        this.goBack();
        return;
    }

    if (newIndex !== this.charSelectIndex) {
      this.charSelectIndex = Math.max(0, Math.min(totalChars - 1, newIndex));
      this.updateCharSelection();
    }
  }

  updateMenuHighlight() {
    this.menuButtons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.menuIndex);
    });
  }

  updateCharSelection() {
    this.charGrid.querySelectorAll('.char-card').forEach((card, i) => {
      card.classList.toggle('selected', i === this.charSelectIndex);
    });
    // Scroll into view if needed
    const selectedCard = this.charGrid.querySelector('.char-card.selected');
    selectedCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  // ========== BACKGROUND ANIMATION ==========

  startBackgroundAnimation() {
    // Cria canvas de fundo para partículas
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.id = 'menu-bg-canvas';
    document.body.appendChild(this.bgCanvas);
    this.bgCtx = this.bgCanvas.getContext('2d');
    this.resizeBgCanvas();

    window.addEventListener('resize', () => this.resizeBgCanvas());

    // Inicializa partículas
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push(this.createParticle());
    }

    this.animateBackground();
  }

  resizeBgCanvas() {
    this.bgCanvas.width = window.innerWidth;
    this.bgCanvas.height = window.innerHeight;
  }

  createParticle() {
    return {
      x: Math.random() * this.bgCanvas.width,
      y: Math.random() * this.bgCanvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      color: ['#8b0000', '#ff3333', '#ff6b6b', '#ffffff'][Math.floor(Math.random() * 4)]
    };
  }

  animateBackground() {
    if (!this.bgCtx) return;

    this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    // Fundo gradiente sutil
    const grad = this.bgCtx.createRadialGradient(
      this.bgCanvas.width / 2, this.bgCanvas.height / 2, 0,
      this.bgCanvas.width / 2, this.bgCanvas.height / 2, Math.max(this.bgCanvas.width, this.bgCanvas.height)
    );
    grad.addColorStop(0, '#1a0505');
    grad.addColorStop(1, '#050000');
    this.bgCtx.fillStyle = grad;
    this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    // Partículas
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = this.bgCanvas.width;
      if (p.x > this.bgCanvas.width) p.x = 0;
      if (p.y < 0) p.y = this.bgCanvas.height;
      if (p.y > this.bgCanvas.height) p.y = 0;

      this.bgCtx.beginPath();
      this.bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.bgCtx.fillStyle = p.color;
      this.bgCtx.globalAlpha = p.alpha;
      this.bgCtx.fill();
      this.bgCtx.globalAlpha = 1;
    });

    // Linhas conectando partículas próximas (efeito teia)
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          this.bgCtx.beginPath();
          this.bgCtx.moveTo(this.particles[i].x, this.particles[i].y);
          this.bgCtx.lineTo(this.particles[j].x, this.particles[j].y);
          this.bgCtx.strokeStyle = '#8b0000';
          this.bgCtx.globalAlpha = (1 - dist / 120) * 0.1;
          this.bgCtx.lineWidth = 0.5;
          this.bgCtx.stroke();
          this.bgCtx.globalAlpha = 1;
        }
      }
    }

    this.bgAnimationId = requestAnimationFrame(() => this.animateBackground());
  }

  stopBackgroundAnimation() {
    if (this.bgAnimationId) cancelAnimationFrame(this.bgAnimationId);
    this.bgCanvas?.remove();
    this.bgCanvas = null;
    this.bgCtx = null;
  }

  // ========== SAVE DATA ==========

  loadSaveData() {
    try {
      const data = localStorage.getItem('skeleton_dungeon_save');
      return data ? JSON.parse(data) : { highestFloor: 1, totalEnemiesKilled: 0, speedRuns: 0, totalHealingDone: 0 };
    } catch {
      return { highestFloor: 1, totalEnemiesKilled: 0, speedRuns: 0, totalHealingDone: 0 };
    }
  }

  saveSaveData(data) {
    try {
      localStorage.setItem('skeleton_dungeon_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }
}