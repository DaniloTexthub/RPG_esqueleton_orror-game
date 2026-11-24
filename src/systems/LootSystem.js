// LootSystem — Tabelas de recompensa com peso, andar e raridade

const LOOT_TABLES = {
  default: {
    chance: 0.28,
    entries: [
      { itemId: 'small_potion', rarity: 'comum', weight: 55, minFloor: 1 },
      { itemId: 'large_potion', rarity: 'incomum', weight: 20, minFloor: 3 },
      { itemId: 'leather_armor', rarity: 'rara', weight: 12, minFloor: 2 },
      { itemId: 'rusty_sword', rarity: 'rara', weight: 10, minFloor: 4 }
    ]
  },
  zombie: {
    chance: 0.34,
    entries: [
      { itemId: 'small_potion', rarity: 'comum', weight: 65, minFloor: 1 },
      { itemId: 'leather_armor', rarity: 'incomum', weight: 18, minFloor: 2 },
      { itemId: 'large_potion', rarity: 'rara', weight: 12, minFloor: 4 }
    ]
  },
  ghost: {
    chance: 0.36,
    entries: [
      { itemId: 'large_potion', rarity: 'incomum', weight: 30, minFloor: 2 },
      { itemId: 'small_potion', rarity: 'comum', weight: 45, minFloor: 1 },
      { itemId: 'rusty_sword', rarity: 'rara', weight: 15, minFloor: 3 }
    ]
  },
  giant_bat: {
    chance: 0.3,
    entries: [
      { itemId: 'small_potion', rarity: 'comum', weight: 60, minFloor: 1 },
      { itemId: 'leather_armor', rarity: 'incomum', weight: 22, minFloor: 2 },
      { itemId: 'large_potion', rarity: 'rara', weight: 14, minFloor: 4 }
    ]
  },
  skeleton_enemy: {
    chance: 0.32,
    entries: [
      { itemId: 'small_potion', rarity: 'comum', weight: 50, minFloor: 1 },
      { itemId: 'rusty_sword', rarity: 'incomum', weight: 24, minFloor: 2 },
      { itemId: 'leather_armor', rarity: 'rara', weight: 18, minFloor: 4 }
    ]
  },
  boss: {
    chance: 1,
    entries: [
      { itemId: 'large_potion', rarity: 'incomum', weight: 50, minFloor: 1 },
      { itemId: 'rusty_sword', rarity: 'rara', weight: 25, minFloor: 1 },
      { itemId: 'leather_armor', rarity: 'rara', weight: 25, minFloor: 1 }
    ]
  }
};

export class LootSystem {
  roll(enemyData, floor, random = Math.random) {
    const table = LOOT_TABLES[enemyData?.isBoss ? 'boss' : enemyData?.spriteId] || LOOT_TABLES.default;
    if (random() >= table.chance) return null;

    const entries = table.entries.filter(entry => floor >= entry.minFloor);
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight === 0) return null;

    let choice = random() * totalWeight;
    for (const entry of entries) {
      choice -= entry.weight;
      if (choice < 0) return { ...entry, quantity: 1 };
    }
    return { ...entries[entries.length - 1], quantity: 1 };
  }
}
