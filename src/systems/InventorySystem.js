// InventorySystem — Itens empilháveis, consumíveis e bônus de equipamento

import { eventBus } from '../core/EventBus.js';

export const ITEM_CATALOG = {
  small_potion: {
    name: 'Poção pequena', type: 'consumable', heal: 30,
    description: 'Recupera 30 HP.'
  },
  large_potion: {
    name: 'Poção grande', type: 'consumable', heal: 60,
    description: 'Recupera 60 HP.'
  },
  rusty_sword: {
    name: 'Espada enferrujada', type: 'weapon', slot: 'weapon',
    attack: 3, description: '+3 ATK quando equipada.'
  },
  leather_armor: {
    name: 'Armadura de couro', type: 'armor', slot: 'armor',
    defense: 2, description: '+2 DEF quando equipada.'
  },
  key_red: {
    name: 'Chave vermelha', type: 'key', description: 'Abre portas vermelhas.'
  },
  key_blue: {
    name: 'Chave azul', type: 'key', description: 'Abre portas azuis.'
  },
  key_green: {
    name: 'Chave verde', type: 'key', description: 'Abre portas verdes.'
  },
  dungeon_key: {
    name: 'Chave antiga', type: 'key',
    description: 'Uma chave encontrada na masmorra.'
  }
};

function getPlayerTag(entity) {
  return entity?.get('PlayerTag') || null;
}

export class InventorySystem {
  getItems(entity) {
    return getPlayerTag(entity)?.inventory || [];
  }

  addItem(entity, itemId, quantity = 1) {
    const tag = getPlayerTag(entity);
    if (!tag || !ITEM_CATALOG[itemId] || quantity < 1) return false;
    const stack = tag.inventory.find(item => item.id === itemId);
    if (stack) stack.quantity += quantity;
    else tag.inventory.push({ id: itemId, quantity });
    return true;
  }

  consumeItem(entity, itemId) {
    const tag = getPlayerTag(entity);
    const index = tag?.inventory.findIndex(item => item.id === itemId && item.quantity > 0) ?? -1;
    if (index < 0) return false;
    tag.inventory[index].quantity--;
    if (tag.inventory[index].quantity === 0) tag.inventory.splice(index, 1);
    return true;
  }

  useItem(entity, index) {
    const tag = getPlayerTag(entity);
    const item = tag?.inventory[index];
    const definition = item && ITEM_CATALOG[item.id];
    if (!definition || definition.type !== 'consumable') {
      return { success: false, message: 'Esse item não pode ser usado agora.' };
    }

    const combatant = entity.get('Combatant');
    const hp = combatant || tag;
    if (hp.hp >= hp.maxHP) return { success: false, message: 'HP já está cheio.' };

    const oldHP = hp.hp;
    hp.heal(definition.heal);
    const healed = hp.hp - oldHP;
    if (combatant) tag.hp = combatant.hp;
    item.quantity--;
    if (item.quantity <= 0) tag.inventory.splice(index, 1);
    eventBus.emit('playerHealed', { entity, amount: healed });
    return { success: true, message: `${definition.name}: recuperou ${healed} HP.`, healed };
  }

  equipItem(entity, index) {
    const tag = getPlayerTag(entity);
    const item = tag?.inventory[index];
    const definition = item && ITEM_CATALOG[item.id];
    if (!definition?.slot) return { success: false, message: 'Esse item não pode ser equipado.' };

    const slot = definition.slot;
    const previous = ITEM_CATALOG[tag.equipped?.[slot]] || {};
    const applyBonus = (stat, previousValue = 0, nextValue = 0) => {
      const difference = nextValue - previousValue;
      tag[stat] += difference;
      const combatant = entity.get('Combatant');
      if (combatant) combatant[stat] += difference;
    };
    applyBonus('attack', previous.attack, definition.attack);
    applyBonus('defense', previous.defense, definition.defense);
    tag.equipped[slot] = item.id;
    return { success: true, message: `${definition.name} equipado.` };
  }

  getDefinition(itemId) {
    return ITEM_CATALOG[itemId] || null;
  }
}
