// CombatUI — Interface estilo Pokémon
// Tela dividida: inimigo topo-direita, player base-esquerda
// Menu 4 ações, caixa de mensagens, seleção de golpes

export class CombatUI {
  constructor(renderer, combatSystem) {
    this.renderer = renderer;
    this.combatSystem = combatSystem;
    this.container = null;
    this.messageBox = null;
    this.messageQueue = [];
    this.currentMessage = '';
    this.messageIndex = 0;
    this.messageCharIndex = 0;
    this.typingSpeed = 20; // ms por caractere
    this.waitingForInput = false;
    this.visible = false;

    // Estado do menu
    this.menuState = 'main'; // 'main' | 'moves' | 'items' | 'party'
    this.selectedIndex = 0;
    this.moveButtons = [];

    // Animações
    this.damageNumbers = [];
    this.screenShake = { intensity: 0, time: 0, start: 0 };
    this.hpAnimations = new Map(); // combatantId -> { from, to, start, duration }
    this.spriteAnimations = new Map(); // combatantId -> { type, start, duration }

    // Referências dos combatentes
    this.playerCombatant = null;
    this.enemyCombatant = null;

    this.createElements();
    this.bindEvents();
  }

  // ========== CRIAÇÃO DO DOM ==========

  createElements() {
    this.container = document.createElement('div');
    this.container.id = 'combat-ui';
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #0a0a0a; display: none;
      font-family: 'Press Start 2P', 'Courier New', monospace;
      color: #e0e0e0; z-index: 1000; overflow: hidden;
      image-rendering: pixelated;
    `;
    this.container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        #combat-ui * { font-family: 'Press Start 2P', 'Courier New', monospace; }
        .hp-bar-fill { transition: width 0.5s ease; }
        .exp-bar-fill { transition: width 0.5s ease; }
        .menu-btn { transition: all 0.1s; }
        .menu-btn.selected { background: #444 !important; box-shadow: inset 0 0 10px #888; }
        .message-box { animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .hp-critical { animation: blink 0.5s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .shake { animation: shake 0.1s infinite; }
        @keyframes shake { 0% { transform: translate(-2px, 0); } 25% { transform: translate(2px, 0); } 50% { transform: translate(0, -2px); } 75% { transform: translate(0, 2px); } 100% { transform: translate(0, 0); } }
      </style>

      <!-- PAINEL DO INIMIGO (Topo-Direita) -->
      <div id="enemy-panel" class="combatant-panel" style="
        position: absolute; top: 20px; right: 20px; width: 300px;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 3px solid #0f3460; border-radius: 8px;
        padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.8);
      ">
        <div id="enemy-name" style="
          font-size: 14px; font-weight: bold; color: #ff6b6b;
          text-shadow: 1px 1px 0 #000; margin-bottom: 8px;
        ">INIMIGO</div>
        <div id="enemy-level" style="
          font-size: 10px; color: #888; margin-bottom: 8px;
        ">Lv. 5</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="
            flex: 1; height: 14px; background: #0d1b2a; border: 2px solid #0f3460;
            border-radius: 4px; overflow: hidden; position: relative;
          ">
            <div id="enemy-hp-fill" class="hp-bar-fill" style="
              height: 100%; width: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60);
              border-radius: 2px;
            "></div>
          </div>
          <div id="enemy-hp-text" style="
            font-size: 10px; color: #fff; min-width: 60px; text-align: right;
            text-shadow: 1px 1px 0 #000;
          ">30/30</div>
        </div>
        <div id="enemy-status" style="margin-top: 8px; min-height: 16px; display: flex; gap: 4px;"></div>
        <div id="enemy-sprite" style="
          margin-top: 16px; width: 120px; height: 120px;
          background: radial-gradient(circle at 30% 30%, #2c3e50, #1a1a2e);
          border: 3px solid #0f3460; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 60px; margin-left: auto; box-shadow: inset 0 0 30px rgba(0,0,0,0.5);
        ">👁</div>
      </div>

      <!-- PAINEL DO PLAYER (Base-Esquerda) -->
      <div id="player-panel" class="combatant-panel" style="
        position: absolute; bottom: 160px; left: 20px; width: 340px;
        background: linear-gradient(135deg, #1a2e1a, #163e16);
        border: 3px solid #27ae60; border-radius: 8px;
        padding: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.8);
      ">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <div id="player-name" style="
            font-size: 14px; font-weight: bold; color: #6bff6b;
            text-shadow: 1px 1px 0 #000;
          ">ESQUELETO</div>
          <div id="player-level" style="
            font-size: 10px; color: #888;
          ">Lv. 1</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <div style="
            flex: 1; height: 14px; background: #0d2a0d; border: 2px solid #27ae60;
            border-radius: 4px; overflow: hidden;
          ">
            <div id="player-hp-fill" class="hp-bar-fill" style="
              height: 100%; width: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60);
              border-radius: 2px;
            "></div>
          </div>
          <div id="player-hp-text" style="
            font-size: 10px; color: #fff; min-width: 70px; text-align: right;
            text-shadow: 1px 1px 0 #000;
          ">100/100</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="font-size: 9px; color: #888; min-width: 24px;">AP</div>
          <div style="
            flex: 1; height: 10px; background: #0d1a0d; border: 1px solid #27ae60;
            border-radius: 3px; overflow: hidden;
          ">
            <div id="player-ap-fill" style="
              height: 100%; width: 100%; background: linear-gradient(90deg, #3498db, #2980b9);
              border-radius: 2px; transition: width 0.3s ease;
            "></div>
          </div>
          <div id="player-ap-text" style="
            font-size: 10px; color: #3498db; min-width: 40px; text-align: right;
            text-shadow: 1px 1px 0 #000;
          ">5/5</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-size: 9px; color: #888; min-width: 24px;">XP</div>
          <div style="
            flex: 1; height: 8px; background: #1a0d2a; border: 1px solid #8e44ad;
            border-radius: 3px; overflow: hidden;
          ">
            <div id="player-exp-fill" class="exp-bar-fill" style="
              height: 100%; width: 0%; background: linear-gradient(90deg, #9b59b6, #8e44ad);
              border-radius: 2px;
            "></div>
          </div>
        </div>
        <div id="player-status" style="margin-top: 8px; min-height: 16px; display: flex; gap: 4px;"></div>
        <div id="player-sprite" style="
          margin-top: 16px; width: 100px; height: 100px;
          background: radial-gradient(circle at 30% 30%, #2e4a2e, #1a2e1a);
          border: 3px solid #27ae60; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 50px; box-shadow: inset 0 0 30px rgba(0,0,0,0.5);
        ">☠</div>
      </div>

      <!-- CAIXA DE MENSAGENS (Base) -->
      <div id="message-box" class="message-box" style="
        position: absolute; bottom: 20px; left: 20px; right: 20px; height: 120px;
        background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
        border: 3px solid #333; border-radius: 8px;
        padding: 16px 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; justify-content: center;
      ">
        <div id="message-text" style="
          font-size: 13px; line-height: 1.8; color: #ddd;
          text-shadow: 1px 1px 0 #000; min-height: 36px;
        "></div>
        <div id="message-arrow" style="
          width: 0; height: 0; border-left: 6px solid transparent;
          border-right: 6px solid transparent; border-top: 10px solid #888;
          align-self: flex-end; margin-top: 8px; opacity: 0;
          animation: bounce 1s infinite;
        "></div>
      </div>

      <!-- MENU DE AÇÕES (Direita-Baixo) -->
      <div id="action-menu" style="
        position: absolute; bottom: 20px; right: 20px; width: 240px; height: 120px;
        background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
        border: 3px solid #333; border-radius: 8px;
        padding: 12px; box-shadow: 0 -4px 20px rgba(0,0,0,0.8);
        display: none; grid-template-columns: 1fr 1fr; gap: 8px;
      ">
        <button class="menu-btn" data-action="fight" style="
          padding: 12px; font-size: 12px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #c0392b, #8b0000);
          border: 2px solid #e74c3c; border-radius: 6px; cursor: pointer;
          text-shadow: 1px 1px 0 #000;
        ">⚔ LUTAR</button>
        <button class="menu-btn" data-action="bag" style="
          padding: 12px; font-size: 12px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #27ae60, #1e8a49);
          border: 2px solid #2ecc71; border-radius: 6px; cursor: pointer;
          text-shadow: 1px 1px 0 #000;
        ">🎒 BOLSA</button>
        <button class="menu-btn" data-action="party" style="
          padding: 12px; font-size: 12px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #2980b9, #1f618d);
          border: 2px solid #3498db; border-radius: 6px; cursor: pointer;
          text-shadow: 1px 1px 0 #000;
        ">👥 TIME</button>
        <button class="menu-btn" data-action="run" style="
          padding: 12px; font-size: 12px; font-weight: bold; color: #fff;
          background: linear-gradient(135deg, #7f8c8d, #5d6d7e);
          border: 2px solid #95a5a6; border-radius: 6px; cursor: pointer;
          text-shadow: 1px 1px 0 #000;
        ">🏃 FUGIR</button>
      </div>

      <!-- MENU DE GOLPES (Substitui menu de ações) -->
      <div id="moves-menu" style="
        position: absolute; bottom: 20px; right: 20px; width: 460px; height: 120px;
        background: linear-gradient(135deg, #1a1a1a, #0d0d0d);
        border: 3px solid #333; border-radius: 8px;
        padding: 12px; box-shadow: 0 -4px 20px rgba(0,0,0,0.8);
        display: none; grid-template-columns: 1fr 1fr; gap: 8px;
      ">
        <!-- Botões de golpes criados dinamicamente -->
      </div>

      <!-- INFO DO GOLPE SELECIONADO -->
      <div id="move-info" style="
        position: absolute; bottom: 150px; right: 20px; width: 240px;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #0f3460; border-radius: 6px;
        padding: 10px; font-size: 9px; color: #ccc;
        display: none;
      ">
        <div id="move-type" style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">TIPO: FÍSICO</div>
        <div id="move-pp" style="color: #3498db;">PP: 10/10</div>
        <div id="move-desc" style="margin-top: 4px; color: #888;">Um ataque básico.</div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Cache de elementos
    this.cacheElements();
  }

  cacheElements() {
    this.enemyPanel = document.getElementById('enemy-panel');
    this.enemyName = document.getElementById('enemy-name');
    this.enemyLevel = document.getElementById('enemy-level');
    this.enemyHPFill = document.getElementById('enemy-hp-fill');
    this.enemyHPText = document.getElementById('enemy-hp-text');
    this.enemyStatus = document.getElementById('enemy-status');
    this.enemySprite = document.getElementById('enemy-sprite');

    this.playerPanel = document.getElementById('player-panel');
    this.playerName = document.getElementById('player-name');
    this.playerLevel = document.getElementById('player-level');
    this.playerHPFill = document.getElementById('player-hp-fill');
    this.playerHPText = document.getElementById('player-hp-text');
    this.playerAPFill = document.getElementById('player-ap-fill');
    this.playerAPText = document.getElementById('player-ap-text');
    this.playerExpFill = document.getElementById('player-exp-fill');
    this.playerStatus = document.getElementById('player-status');
    this.playerSprite = document.getElementById('player-sprite');

    this.messageBox = document.getElementById('message-box');
    this.messageText = document.getElementById('message-text');
    this.messageArrow = document.getElementById('message-arrow');

    this.actionMenu = document.getElementById('action-menu');
    this.movesMenu = document.getElementById('moves-menu');
    this.moveInfo = document.getElementById('move-info');

    this.menuButtons = this.actionMenu.querySelectorAll('.menu-btn');
  }

  bindEvents() {
    // Menu principal
    this.menuButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => this.onMainAction(i));
      btn.addEventListener('mouseenter', () => this.selectMenuIndex(i));
    });

    // Teclado
    this.keyHandler = (e) => {
      if (!this.visible) return;

      if (this.menuState === 'main') {
        this.handleMainMenuKeys(e);
      } else if (this.menuState === 'moves') {
        this.handleMovesMenuKeys(e);
      } else if (this.waitingForInput) {
        if (e.key === 'Enter' || e.key === 'z' || e.key === ' ') {
          this.advanceMessage();
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  // ========== MENU PRINCIPAL ==========

  handleMainMenuKeys(e) {
    const cols = 2;
    const rows = 2;
    let newIndex = this.selectedIndex;

    switch (e.key) {
      case 'ArrowRight':
        if (this.selectedIndex % cols < cols - 1) newIndex++;
        break;
      case 'ArrowLeft':
        if (this.selectedIndex % cols > 0) newIndex--;
        break;
      case 'ArrowDown':
        if (Math.floor(this.selectedIndex / cols) < rows - 1) newIndex += cols;
        break;
      case 'ArrowUp':
        if (Math.floor(this.selectedIndex / cols) > 0) newIndex -= cols;
        break;
      case 'Enter':
      case 'z':
      case ' ':
        this.onMainAction(this.selectedIndex);
        return;
      case 'Escape':
      case 'x':
        // Não faz nada no menu principal
        return;
    }

    if (newIndex !== this.selectedIndex) {
      this.selectMenuIndex(newIndex);
    }
  }

  selectMenuIndex(index) {
    this.selectedIndex = Math.max(0, Math.min(3, index));
    this.menuButtons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  onMainAction(index) {
    const actions = ['fight', 'bag', 'party', 'run'];
    const action = actions[index];

    switch (action) {
      case 'fight':
        this.showMovesMenu();
        break;
      case 'bag':
        this.queueMessage('A bolsa está vazia...');
        break;
      case 'party':
        this.queueMessage('Não há outros membros no time.');
        break;
      case 'run':
        this.onFleePressed();
        break;
    }
  }

  // Tenta fugir e informa o resultado antes de passar o turno
  onFleePressed() {
    if (this.combatSystem.turnPhase !== 'playerAction') return;
    const result = this.combatSystem.playerFlee();
    if (result?.success === true) {
      this.queueMessage('Você conseguiu escapar da batalha!');
      this.hideMenus();
    } else if (result?.success === false) {
      this.queueMessage('Não conseguiu fugir! O inimigo prepara um contra-ataque.');
      this.hideMenus();
    }
  }

  // ========== MENU DE GOLPES ==========

  showMovesMenu() {
    this.menuState = 'moves';
    this.selectedIndex = 0;

    const moves = this.getPlayerMoves();
    this.movesMenu.innerHTML = '';

    moves.forEach((move, i) => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn move-btn';
      btn.dataset.moveIndex = i;
      btn.innerHTML = `
        <div style="font-size: 11px; font-weight: bold; color: ${move.typeColor};">${move.name}</div>
        <div style="font-size: 8px; color: #888;">PP ${move.pp}/${move.maxPP}</div>
      `;
      btn.style.cssText = `
        padding: 10px; font-family: inherit; color: #fff;
        background: linear-gradient(135deg, ${move.bgColor}44, ${move.bgColor}66);
        border: 2px solid ${move.borderColor}; border-radius: 6px; cursor: pointer;
        text-shadow: 1px 1px 0 #000; display: flex; flex-direction: column; gap: 2px;
        transition: all 0.1s;
      `;
      btn.onmouseenter = () => this.selectMoveIndex(i);
      btn.onclick = () => this.onMoveSelected(i);
      this.movesMenu.appendChild(btn);
    });

    this.actionMenu.style.display = 'none';
    this.movesMenu.style.display = 'grid';
    this.moveInfo.style.display = 'block';
    this.updateMoveInfo(0);
  }

  getPlayerMoves() {
    // Golpes do esqueleto - estilo Pokémon
    return [
      { name: 'OSSO CLUB', type: 'FÍSICO', typeColor: '#e74c3c', bgColor: '#c0392b', borderColor: '#e74c3c', pp: 15, maxPP: 15, power: 40, desc: 'Ataca com osso.' },
      { name: 'SOMBRA', type: 'ESPECIAL', typeColor: '#8e44ad', bgColor: '#8e44ad', borderColor: '#9b59b6', pp: 10, maxPP: 10, power: 60, desc: 'Ataque sombrio.' },
      { name: 'DEFESA ÓSSEA', type: 'STATUS', typeColor: '#3498db', bgColor: '#2980b9', borderColor: '#3498db', pp: 10, maxPP: 10, power: 0, desc: 'Aumenta defesa.' },
      { name: 'RUGIDO', type: 'STATUS', typeColor: '#f39c12', bgColor: '#d35400', borderColor: '#f39c12', pp: 20, maxPP: 20, power: 0, desc: 'Baixa atk inimigo.' }
    ];
  }

  selectMoveIndex(index) {
    this.selectedIndex = Math.max(0, Math.min(3, index));
    const btns = this.movesMenu.querySelectorAll('.move-btn');
    btns.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.selectedIndex);
    });
    this.updateMoveInfo(this.selectedIndex);
  }

  updateMoveInfo(index) {
    const moves = this.getPlayerMoves();
    const move = moves[index];
    if (!move) return;

    document.getElementById('move-type').textContent = `TIPO: ${move.type}`;
    document.getElementById('move-type').style.color = move.typeColor;
    document.getElementById('move-pp').textContent = `PP: ${move.pp}/${move.maxPP}`;
    document.getElementById('move-desc').textContent = move.desc;
  }

  handleMovesMenuKeys(e) {
    const cols = 2;
    const rows = 2;
    let newIndex = this.selectedIndex;

    switch (e.key) {
      case 'ArrowRight':
        if (this.selectedIndex % cols < cols - 1) newIndex++;
        break;
      case 'ArrowLeft':
        if (this.selectedIndex % cols > 0) newIndex--;
        break;
      case 'ArrowDown':
        if (Math.floor(this.selectedIndex / cols) < rows - 1) newIndex += cols;
        break;
      case 'ArrowUp':
        if (Math.floor(this.selectedIndex / cols) > 0) newIndex -= cols;
        break;
      case 'Enter':
      case 'z':
      case ' ':
        this.onMoveSelected(this.selectedIndex);
        return;
      case 'Escape':
      case 'x':
        this.backToMainMenu();
        return;
    }

    if (newIndex !== this.selectedIndex) {
      this.selectMoveIndex(newIndex);
    }
  }

  onMoveSelected(index) {
    const moves = this.getPlayerMoves();
    const move = moves[index];

    if (move.pp <= 0) {
      this.queueMessage('Sem PP para este golpe!');
      return;
    }

    this.backToMainMenu();

    // Executa ação baseada no golpe
    if (move.type === 'STATUS') {
      if (move.name === 'DEFESA ÓSSEA') {
        this.combatSystem.playerDefend();
        this.queueMessage(`${this.playerCombatant.name} usou ${move.name}! Defesa aumentou!`);
      } else if (move.name === 'RUGIDO') {
        this.combatSystem.playerAttack(); // Usa attack como base mas efeito diferente
        this.queueMessage(`${this.playerCombatant.name} usou ${move.name}! Atk do inimigo caiu!`);
      }
    } else {
      this.combatSystem.playerAttack();
      this.queueMessage(`${this.playerCombatant.name} usou ${move.name}!`);
      // Animação de ataque
      this.triggerAttackAnimation(true);
    }
  }

  backToMainMenu() {
    this.menuState = 'main';
    this.selectedIndex = 0;
    this.movesMenu.style.display = 'none';
    this.moveInfo.style.display = 'none';
    this.actionMenu.style.display = 'grid';
    this.selectMenuIndex(0);
  }

  // ========== CAIXA DE MENSAGENS ==========

  queueMessage(message, isBattleLog = false) {
    if (isBattleLog) {
      // Adiciona direto sem animação de digitação
      this.messageText.textContent += (this.messageText.textContent ? '\n' : '') + message;
      this.messageText.scrollTop = this.messageText.scrollHeight;
    } else {
      this.messageQueue.push(message);
      if (!this.waitingForInput) this.processMessageQueue();
    }
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) {
      this.waitingForInput = false;
      this.messageArrow.style.opacity = '0';
      return;
    }

    this.waitingForInput = true;
    this.currentMessage = this.messageQueue.shift();
    this.messageCharIndex = 0;
    this.messageText.textContent = '';
    this.messageArrow.style.opacity = '0';
    this.typeMessage();
  }

  typeMessage() {
    if (this.messageCharIndex < this.currentMessage.length) {
      this.messageText.textContent += this.currentMessage[this.messageCharIndex];
      this.messageCharIndex++;
      setTimeout(() => this.typeMessage(), this.typingSpeed);
    } else {
      this.messageArrow.style.opacity = '1';
    }
  }

  advanceMessage() {
    this.processMessageQueue();
  }

  clearMessages() {
    this.messageQueue = [];
    this.messageText.textContent = '';
    this.messageArrow.style.opacity = '0';
  }

  // ========== ATUALIZAÇÃO VISUAL ==========

  show(playerCombatant, enemyCombatant) {
    this.visible = true;
    this.container.style.display = 'block';
    this.playerCombatant = playerCombatant;
    this.enemyCombatant = enemyCombatant;

    this.updateCombatantPanels();
    this.selectMenuIndex(0);
    this.clearMessages();
    this.actionMenu.style.display = 'grid';
    this.movesMenu.style.display = 'none';
    this.moveInfo.style.display = 'none';
    this.menuState = 'main';

    // Mensagem inicial
    this.queueMessage(`Um ${enemyCombatant.name} selvagem apareceu!`);
    this.queueMessage(`Vá, ${playerCombatant.name}!`);
  }

  hide() {
    this.visible = false;
    this.container.style.display = 'none';
  }

  updateCombatantPanels() {
    this.updatePanel('enemy', this.enemyCombatant);
    this.updatePanel('player', this.playerCombatant);
  }

  updatePanel(side, combatant) {
    if (!combatant) return;

    const isPlayer = side === 'player';
    const nameEl = isPlayer ? this.playerName : this.enemyName;
    const levelEl = isPlayer ? this.playerLevel : this.enemyLevel;
    const hpFill = isPlayer ? this.playerHPFill : this.enemyHPFill;
    const hpText = isPlayer ? this.playerHPText : this.enemyHPText;
    const statusEl = isPlayer ? this.playerStatus : this.enemyStatus;
    const spriteEl = isPlayer ? this.playerSprite : this.enemySprite;

    if (isPlayer) {
      this.playerLevel.textContent = `Lv. ${combatant.level}`;
      this.playerAPFill.style.width = `${combatant.getAPRatio() * 100}%`;
      this.playerAPText.textContent = `${combatant.ap}/${combatant.maxAP}`;
      this.playerExpFill.style.width = `${(combatant.xp / combatant.xpToNext) * 100}%`;
    } else {
      this.enemyLevel.textContent = `Lv. ${Math.max(1, Math.floor(combatant.maxHP / 10))}`;
    }

    nameEl.textContent = combatant.name.toUpperCase();
    nameEl.style.color = isPlayer ? '#6bff6b' : '#ff6b6b';

    const hpRatio = combatant.getHPRatio();
    hpFill.style.width = `${hpRatio * 100}%`;
    hpText.textContent = `${combatant.hp}/${combatant.maxHP}`;

    // Cor da barra HP
    if (hpRatio > 0.5) {
      hpFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
      hpFill.classList.remove('hp-critical');
    } else if (hpRatio > 0.2) {
      hpFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
      hpFill.classList.remove('hp-critical');
    } else {
      hpFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      hpFill.classList.add('hp-critical');
    }

    // Status effects
    statusEl.innerHTML = '';
    combatant.statusEffects.forEach(effect => {
      const el = document.createElement('span');
      el.textContent = effect.type.toUpperCase().slice(0, 3);
      el.style.cssText = `
        font-size: 8px; padding: 2px 6px; border-radius: 3px;
        background: ${this.getStatusColor(effect.type)};
        color: white; font-weight: bold;
      `;
      statusEl.appendChild(el);
    });

    // Sprite
    spriteEl.style.background = `radial-gradient(circle at 30% 30%, ${combatant.spriteColor}44, ${combatant.spriteAccent}22)`;
    spriteEl.style.borderColor = combatant.spriteAccent;
    spriteEl.textContent = isPlayer ? '☠' : '👁';
  }

  getStatusColor(type) {
    const colors = {
      poison: '#8e44ad', burn: '#e74c3c', paralysis: '#f39c12',
      sleep: '#3498db', frozen: '#1abc9c', defense_up: '#27ae60',
      attack_down: '#c0392b', speed_down: '#7f8c8d'
    };
    return colors[type] || '#95a5a6';
  }

  // ========== ANIMAÇÕES ==========

  triggerAttackAnimation(isPlayer) {
    const spriteEl = isPlayer ? this.playerSprite : this.enemySprite;
    const targetEl = isPlayer ? this.enemySprite : this.playerSprite;

    // Atacante: pula para frente
    spriteEl.style.transform = 'translateX(' + (isPlayer ? '20px' : '-20px') + ')';
    spriteEl.style.boxShadow = '0 0 30px ' + (isPlayer ? '#2ecc71' : '#e74c3c');

    // Alvo: pisca
    targetEl.classList.add('shake');

    setTimeout(() => {
      spriteEl.style.transform = 'translateX(0)';
      spriteEl.style.boxShadow = 'inset 0 0 30px rgba(0,0,0,0.5)';
      targetEl.classList.remove('shake');
    }, 200);
  }

  showDamageNumber(x, y, value, isHeal = false, isCrit = false) {
    this.damageNumbers.push({
      x, y, value,
      color: isHeal ? '#2ecc71' : (isCrit ? '#f39c12' : '#e74c3c'),
      time: Date.now(), duration: 1000,
      vy: -1, alpha: 1, scale: isCrit ? 1.5 : 1
    });
  }

  shake(intensity = 8, duration = 300) {
    this.screenShake = { intensity, time: duration, start: Date.now() };
    this.container.style.animation = `shake ${duration}ms ease-out`;
    setTimeout(() => this.container.style.animation = '', duration);
  }

  animateHPChange(combatant, oldHP, newHP) {
    const id = combatant.isPlayer ? 'player' : 'enemy';
    this.hpAnimations.set(id, {
      from: oldHP, to: newHP, maxHP: combatant.maxHP,
      start: Date.now(), duration: 500
    });
  }

  // ========== UPDATE/RENDER LOOP ==========

  update(dt) {
    // Damage numbers
    const now = Date.now();
    this.damageNumbers = this.damageNumbers.filter(dn => {
      dn.y += dn.vy;
      dn.alpha = 1 - (now - dn.time) / dn.duration;
      return dn.alpha > 0;
    });

    // HP animations
    this.hpAnimations.forEach((anim, id) => {
      const progress = Math.min(1, (now - anim.start) / anim.duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = Math.round(anim.from + (anim.to - anim.from) * eased);

      if (id === 'player') {
        this.playerHPText.textContent = `${current}/${anim.maxHP}`;
        this.playerHPFill.style.width = `${(current / anim.maxHP) * 100}%`;
      } else {
        this.enemyHPText.textContent = `${current}/${anim.maxHP}`;
        this.enemyHPFill.style.width = `${(current / anim.maxHP) * 100}%`;
      }

      if (progress >= 1) this.hpAnimations.delete(id);
    });
  }

  getShakeOffset() {
    if (this.screenShake.time <= 0) return { x: 0, y: 0 };
    const elapsed = Date.now() - this.screenShake.start;
    if (elapsed >= this.screenShake.time) {
      this.screenShake = { intensity: 0, time: 0, start: 0 };
      return { x: 0, y: 0 };
    }
    const progress = elapsed / this.screenShake.time;
    const currentIntensity = this.screenShake.intensity * (1 - progress);
    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2
    };
  }

  renderDamageNumbers(ctx, camera) {
    this.damageNumbers.forEach(dn => {
      ctx.save();
      ctx.globalAlpha = dn.alpha;
      ctx.font = `bold ${Math.round(20 * dn.scale)}px 'Press Start 2P', monospace`;
      ctx.fillStyle = dn.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const screenX = (dn.x - camera.x) * 32 + 16;
      const screenY = (dn.y - camera.y) * 32 + 16;
      ctx.strokeText(dn.value, screenX, screenY);
      ctx.fillText(dn.value, screenX, screenY);
      ctx.restore();
    });
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler);
    this.container?.remove();
  }

  // ========== VITÓRIA/DERROTA ==========

  onCombatEnd(victory, combatData = {}) {
    return new Promise((resolve) => {
      this.clearMessages();
      this.hideMenus();

      // Overlay de resultado
      const resultOverlay = document.createElement('div');
      resultOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        z-index: 100; pointer-events: none;
      `;

      const isPlayerVictory = victory && !combatData.fled;
      const text = isPlayerVictory ? '✨ VITÓRIA! ✨' : (combatData.fled ? '💨 FUGA!' : '☠ DERROTA ☠');
      const color = isPlayerVictory ? '#2ecc71' : (combatData.fled ? '#f39c12' : '#e74c3c');
      const subText = isPlayerVictory
        ? `XP +${combatData.xpGained || 0}  Ouro +${combatData.goldGained || 0}`
        : (combatData.fled ? 'Você escapou com vida...' : 'Seus ossos jazem na masmorra...');

      resultOverlay.innerHTML = `
        <div id="result-text" style="
          font-size: 36px; font-weight: bold; color: ${color};
          text-shadow: 3px 3px 0 #000, 0 0 30px ${color};
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: scale(0); opacity: 0;
        ">${text}</div>
        <div id="result-subtext" style="
          font-size: 12px; color: #aaa; margin-top: 16px;
          text-shadow: 1px 1px 0 #000; opacity: 0;
          animation: fadeIn 0.3s ease 0.5s forwards;
        ">${subText}</div>
        <style>
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn { to { opacity: 1; } }
        </style>
      `;

      this.container.appendChild(resultOverlay);

      // Screen shake na vitória/derrota
      if (isPlayerVictory) {
        this.shake(12, 600);
        // Flash verde
        this.renderer.context?.flash(0.3, '#2ecc71');
      } else {
        this.shake(20, 800);
        // Flash vermelho
        this.renderer.context?.flash(0.4, '#e74c3c');
      }

      // Anima XP bar se vitória
      if (isPlayerVictory && combatData.xpGained > 0) {
        setTimeout(() => this.animateXPGain(combatData.xpGained), 800);
      }

      // Resolve após delay
      setTimeout(() => {
        resultOverlay.remove();
        resolve();
      }, isPlayerVictory ? 2000 : 1500);
    });
  }

  hideMenus() {
    this.actionMenu.style.display = 'none';
    this.movesMenu.style.display = 'none';
    this.moveInfo.style.display = 'none';
  }

  animateXPGain(xpGained) {
    if (!this.playerCombatant) return;
    const startXP = this.playerCombatant.xp - xpGained;
    const endXP = this.playerCombatant.xp;
    const xpToNext = this.playerCombatant.xpToNext;

    const animate = () => {
      const now = Date.now();
      if (!this.xpAnimStart) this.xpAnimStart = now;
      const progress = Math.min(1, (now - this.xpAnimStart) / 1000);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startXP + (endXP - startXP) * eased);
      this.playerExpFill.style.width = `${(current / xpToNext) * 100}%`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.xpAnimStart = null;
        // Check level up
        if (this.playerCombatant.xp >= this.playerCombatant.xpToNext) {
          this.queueMessage(`🎉 ${this.playerCombatant.name} subiu para Nv. ${this.playerCombatant.level}!`);
          this.shake(8, 400);
        }
      }
    };
    animate();
  }
}