// MerchantUI — Loja simples ligada ao ouro e ao inventário do jogador

import { ITEM_CATALOG } from '../systems/InventorySystem.js';

export class MerchantUI {
  constructor(engine) {
    this.engine = engine;
    this.visible = false;
    this.createElement();
    this.keyHandler = this.onKeyDown.bind(this);
    this.clickHandler = this.onClick.bind(this);
    window.addEventListener('keydown', this.keyHandler, true);
    this.element.addEventListener('click', this.clickHandler);
  }

  createElement() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed; inset: 0; z-index: 1600; display: none;
      align-items: center; justify-content: center;
      background: rgba(0,0,0,.82); color: #eee;
      font: 11px 'Press Start 2P', 'Courier New', monospace;
    `;
    this.element.innerHTML = `
      <div style="width:min(560px,92vw); max-height:80vh; overflow:auto; padding:22px;
        background:#15120d; border:3px solid #b58b3b; box-sizing:border-box;">
        <header style="display:flex;justify-content:space-between;align-items:center">
          <strong style="color:#e2c36d">COMERCIANTE</strong>
          <button data-action="close">FECHAR (ESC)</button>
        </header>
        <p data-gold style="color:#e2c36d"></p>
        <div data-offers style="display:grid;gap:8px"></div>
        <p data-message aria-live="polite" style="min-height:14px;color:#8fd18f"></p>
      </div>
      <style>
        .merchant-offer { display:flex;justify-content:space-between;align-items:center;
          gap:12px;padding:12px;background:#201c15;border:1px solid #55472b; }
        #merchant-ui button { padding:9px;color:#eee;background:#302818;border:1px solid #8a713d;
          cursor:pointer;font:inherit;font-size:9px; }
        #merchant-ui button:disabled { opacity:.45;cursor:default; }
      </style>
    `;
    this.element.id = 'merchant-ui';
    document.body.appendChild(this.element);
    this.goldLabel = this.element.querySelector('[data-gold]');
    this.offersElement = this.element.querySelector('[data-offers]');
    this.messageElement = this.element.querySelector('[data-message]');
  }

  onKeyDown(event) {
    if (!this.visible) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE'].includes(event.code)) {
      event.preventDefault();
      this.engine?.input?.justPressed?.delete(event.code);
    }
  }

  async onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'close') {
      this.hide();
      return;
    }

    const offer = this.offers.find(entry => entry.itemId === button.dataset.itemId);
    if (!offer) return;
    button.disabled = true;
    try {
      const result = await this.onPurchase(offer.itemId, offer.price);
      this.messageElement.textContent = result.message;
      this.messageElement.style.color = result.success ? '#8fd18f' : '#f08080';
      this.render();
    } catch (error) {
      console.error('Falha na compra:', error);
      this.render();
      this.messageElement.textContent = 'Falha ao concluir a compra.';
      this.messageElement.style.color = '#f08080';
    }
  }

  render() {
    const tag = this.entity.get('PlayerTag');
    this.goldLabel.textContent = `Ouro: ${tag.gold}`;
    this.offersElement.innerHTML = '';
    this.offers.forEach(offer => {
      const item = ITEM_CATALOG[offer.itemId];
      const row = document.createElement('div');
      row.className = 'merchant-offer';
      const name = document.createElement('span');
      name.textContent = `${item.name} — ${offer.price} ouro`;
      const buy = document.createElement('button');
      buy.dataset.action = 'buy';
      buy.dataset.itemId = offer.itemId;
      buy.textContent = 'COMPRAR';
      buy.disabled = tag.gold < offer.price;
      row.append(name, buy);
      this.offersElement.appendChild(row);
    });
  }

  show(entity, offers, onPurchase) {
    this.entity = entity;
    this.offers = offers;
    this.onPurchase = onPurchase;
    this.visible = true;
    this.messageElement.textContent = '';
    this.render();
    this.element.style.display = 'flex';
  }

  hide() {
    this.visible = false;
    this.element.style.display = 'none';
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler, true);
    this.element.removeEventListener('click', this.clickHandler);
    this.element.remove();
  }
}
