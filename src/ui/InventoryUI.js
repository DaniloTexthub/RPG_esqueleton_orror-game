// InventoryUI — Interface de itens, equipamentos e habilidades

export class InventoryUI {
  constructor(inventorySystem, skillSystem, onSave, engine) {
    this.inventorySystem = inventorySystem;
    this.skillSystem = skillSystem;
    this.onSave = onSave;
    this.engine = engine;
    this.entity = null;
    this.tab = 'items';
    this.visible = false;
    this.createElement();
    this.keyHandler = this.onKeyDown.bind(this);
    this.clickHandler = this.onClick.bind(this);
    window.addEventListener('keydown', this.keyHandler, true);
    this.element.addEventListener('click', this.clickHandler);
  }

  createElement() {
    this.element = document.createElement('div');
    this.element.id = 'inventory-ui';
    this.element.style.cssText = `
      position: fixed; inset: 0; z-index: 1500; display: none;
      align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.78); color: #eee;
      font: 12px 'Press Start 2P', 'Courier New', monospace;
    `;
    this.element.innerHTML = `
      <style>
        #inventory-panel { width: min(680px, 92vw); max-height: 84vh; overflow: auto;
          padding: 22px; box-sizing: border-box; background: #111;
          border: 3px solid #6b2020; box-shadow: 0 0 30px #000; }
        #inventory-header, #inventory-tabs, .inventory-row { display: flex;
          align-items: center; justify-content: space-between; gap: 12px; }
        #inventory-header h2 { font-size: 15px; color: #bd4b4b; }
        #inventory-tabs { margin: 16px 0; }
        #inventory-content { display: grid; gap: 10px; }
        .inventory-row { padding: 12px; border: 1px solid #333; background: #181818; }
        .inventory-row p { margin: 8px 0 0; color: #999; font-size: 9px; line-height: 1.6; }
        .inventory-actions { display: flex; gap: 8px; }
        #inventory-ui button { cursor: pointer; padding: 10px; color: #eee;
          background: #252525; border: 1px solid #555; font: inherit; font-size: 9px; }
        #inventory-ui button:hover:not(:disabled) { border-color: #b33; background: #321919; }
        #inventory-ui button:disabled { opacity: .45; cursor: default; }
        #inventory-message { min-height: 16px; margin-top: 12px; color: #8fd18f; font-size: 9px; }
        #inventory-footer { display: flex; justify-content: space-between; margin-top: 16px; }
        @media (max-width: 520px) { .inventory-row { align-items: flex-start; flex-direction: column; } }
      </style>
      <div id="inventory-panel" role="dialog" aria-modal="true" aria-label="Inventário">
        <div id="inventory-header"><h2>INVENTÁRIO</h2><button data-action="close">FECHAR (ESC)</button></div>
        <div id="inventory-tabs">
          <button data-action="tab" data-tab="items">ITENS</button>
          <button data-action="tab" data-tab="skills">HABILIDADES</button>
        </div>
        <div id="inventory-content"></div>
        <div id="inventory-message" aria-live="polite"></div>
        <div id="inventory-footer">
          <button data-action="save">SALVAR</button>
          <button data-action="close">VOLTAR</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);
    this.content = this.element.querySelector('#inventory-content');
    this.message = this.element.querySelector('#inventory-message');
  }

  onKeyDown(event) {
    const firstPerson = this.engine?.renderer?.firstPerson === true;
    const inventoryKey = event.code === 'KeyI' ||
      (firstPerson && (event.code === 'KeyG' || event.code === 'Tab'));
    if (inventoryKey && !event.repeat) {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
      return;
    }
    if (!this.visible) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
      this.engine?.input?.justPressed?.delete(event.code);
    }
  }

  onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'close') {
      this.hide();
    } else if (action === 'tab') {
      this.tab = button.dataset.tab;
      this.render();
    } else if (action === 'save') {
      this.save();
    } else if (action === 'use' || action === 'equip') {
      const result = action === 'use'
        ? this.inventorySystem.useItem(this.entity, Number(button.dataset.index))
        : this.inventorySystem.equipItem(this.entity, Number(button.dataset.index));
      this.showMessage(result.message, result.success);
      if (result.success) {
        this.render();
        this.save();
      }
    } else if (action === 'unlock') {
      const result = this.skillSystem.unlock(this.entity, button.dataset.skillId);
      this.showMessage(result.message, result.success);
      if (result.success) {
        this.render();
        this.save();
      }
    }
  }

  async save() {
    this.showMessage('Salvando...', true);
    try {
      await this.onSave?.();
      this.showMessage('Jogo salvo.', true);
    } catch (error) {
      console.error('Falha ao salvar o jogo:', error);
      this.showMessage('Falha ao salvar. Consulte o console.', false);
    }
  }

  showMessage(text, success) {
    this.message.textContent = text;
    this.message.style.color = success ? '#8fd18f' : '#f08080';
  }

  render() {
    if (!this.entity) return;
    if (this.tab === 'skills') this.renderSkills();
    else this.renderItems();
  }

  renderItems() {
    const tag = this.entity.get('PlayerTag');
    const items = this.inventorySystem.getItems(this.entity);
    if (items.length === 0) {
      this.content.innerHTML = `<div class="inventory-row">Ouro: ${tag.gold} | Inventário vazio.</div>`;
      return;
    }
    this.content.innerHTML = `<div class="inventory-row">Ouro: ${tag.gold}</div>` + items.map((item, index) => {
      const definition = this.inventorySystem.getDefinition(item.id);
      if (!definition) return '';
      const equipped = Object.values(tag.equipped).includes(item.id);
      const action = definition.type === 'consumable' ? 'use'
        : definition.slot ? 'equip' : null;
      const label = action === 'use' ? 'USAR' : action === 'equip'
        ? (equipped ? 'EQUIPADO' : 'EQUIPAR') : '';
      return `
        <div class="inventory-row">
          <div><strong>${definition.name} x${item.quantity}</strong>${equipped ? ' (EQUIPADO)' : ''}
            <p>${definition.description}</p></div>
          ${action ? `<div class="inventory-actions"><button data-action="${action}"
            data-index="${index}" ${action === 'equip' && equipped ? 'disabled' : ''}>${label}</button></div>` : ''}
        </div>
      `;
    }).join('');
  }

  renderSkills() {
    const tag = this.entity.get('PlayerTag');
    const skills = this.skillSystem.getTree(tag);
    this.content.innerHTML = `
      <div class="inventory-row">Nível ${tag.level} | Pontos disponíveis: ${tag.skillPoints}</div>
      ${skills.map(skill => `
        <div class="inventory-row">
          <div><strong>${skill.name}${skill.unlocked ? ' (DESBLOQUEADA)' : ''}</strong>
            <p>${skill.description} Requer nível ${skill.level}${skill.requires ? ` e ${skill.requires}` : ''}.</p></div>
          <button data-action="unlock" data-skill-id="${skill.id}"
            ${skill.available ? '' : 'disabled'}>${skill.unlocked ? 'OBTIDA' : 'DESBLOQUEAR'}</button>
        </div>
      `).join('')}
    `;
  }

  show(entity) {
    this.entity = entity;
    this.visible = true;
    this.element.style.display = 'flex';
    this.message.textContent = '';
    this.render();
  }

  hide() {
    this.visible = false;
    this.element.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.hide();
    else if (this.engine?.currentScene?.player) this.show(this.engine.currentScene.player);
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    this.element.removeEventListener('click', this.clickHandler);
    this.element.remove();
  }
}
