// Character Data — Classes jogáveis com atributos e golpes exclusivos
// Expansível: adicione novas classes aqui sem tocar no código de UI

export const CHARACTER_CLASSES = {
  // Esqueleto Guerreiro — Equilibrado
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: 'Esqueleto Guerreiro',
    title: 'O Balanço Perfeito',
    description: 'Um esqueleto antigo que empunha espada e escudo. Versátil em qualquer situação.',
    icon: '⚔️',
    color: '#6bff6b',
    accentColor: '#27ae60',
    locked: false, // Inicial desbloqueado
    unlockRequirement: null,

    // Stats base
    baseStats: {
      maxHP: 100,
      attack: 12,
      defense: 8,
      speed: 5,
      maxAP: 5,
      xpToNext: 100
    },

    // Golpes exclusivos (desbloqueados por nível)
    moves: [
      { id: 'bone_slash', name: 'Corte Ósseo', type: 'FÍSICO', power: 45, pp: 15, maxPP: 15, desc: 'Corte preciso com lâmina de osso.', unlockLevel: 1 },
      { id: 'shield_bash', name: 'Golpe de Escudo', type: 'FÍSICO', power: 35, pp: 10, maxPP: 10, desc: 'Atordoa o inimigo (chance de pular turno).', unlockLevel: 3 },
      { id: 'bone_barrier', name: 'Barreira Óssea', type: 'STATUS', power: 0, pp: 8, maxPP: 8, desc: 'Aumenta defesa drasticamente por 2 turnos.', unlockLevel: 5 },
      { id: 'skeleton_waltz', name: 'Valsa dos Ossos', type: 'FÍSICO', power: 60, pp: 5, maxPP: 5, desc: 'Ataque múltiplo: 2-3 golpes rápidos.', unlockLevel: 8 },
      { id: 'reaper_scythe', name: 'Foice do Ceifador', type: 'ESPECIAL', power: 90, pp: 3, maxPP: 3, desc: 'Crítico garantido se HP < 30%.', unlockLevel: 12 }
    ],

    // Passiva única
    passive: {
      id: 'undead_resilience',
      name: 'Resistência Morta-Viva',
      desc: 'Imune a veneno e sangramento. Cura 5% HP ao derrotar inimigo.'
    }
  },

  // Necromante — Mago/Summoner
  necromancer: {
    id: 'necromancer',
    name: 'Necromante',
    title: 'Senhor dos Mortos',
    description: 'Manipula energia necrótica e invoca servos. Frágil mas devastador à distância.',
    icon: '👑',
    color: '#bb86fc',
    accentColor: '#8e44ad',
    locked: true,
    unlockRequirement: { type: 'floor', value: 5 }, // Desbloqueia no andar 5

    baseStats: {
      maxHP: 70,
      attack: 8,
      defense: 3,
      speed: 6,
      maxAP: 6,
      xpToNext: 100
    },

    moves: [
      { id: 'shadow_bolt', name: 'Projétil Sombrio', type: 'ESPECIAL', power: 50, pp: 20, maxPP: 20, desc: 'Dispara energia necrótica. Nunca erra.', unlockLevel: 1 },
      { id: 'life_drain', name: 'Drenar Vida', type: 'ESPECIAL', power: 40, pp: 10, maxPP: 10, desc: 'Cura 50% do dano causado.', unlockLevel: 3 },
      { id: 'summon_skelly', name: 'Invocar Esqueleto', type: 'STATUS', power: 0, pp: 5, maxPP: 5, desc: 'Invoca aliado temporário (1 turno).', unlockLevel: 5 },
      { id: 'curse_weakness', name: 'Maldição da Fraqueza', type: 'STATUS', power: 0, pp: 8, maxPP: 8, desc: 'Reduz ATK e DEF do inimigo em 30%.', unlockLevel: 7 },
      { id: 'apocalypse', name: 'Apocalipse', type: 'ESPECIAL', power: 120, pp: 2, maxPP: 2, desc: 'Dano massivo a todos. Custa todo AP.', unlockLevel: 12 }
    ],

    passive: {
      id: 'soul_siphon',
      name: 'Sifão de Almas',
      desc: 'Ganha 1 AP ao matar. Inimigos mortos podem virar aliados permanentes (baixa chance).'
    }
  },

  // Carniceiro — Tank/Berserker
  butcher: {
    id: 'butcher',
    name: 'Carniceiro',
    title: 'A Mão que Fere',
    description: 'Grande, lento e brutal. Quanto mais ferido, mais forte fica.',
    icon: '🔪',
    color: '#ff6b6b',
    accentColor: '#c0392b',
    locked: true,
    unlockRequirement: { type: 'enemies_killed', value: 100 }, // 100 inimigos mortos

    baseStats: {
      maxHP: 150,
      attack: 18,
      defense: 5,
      speed: 3,
      maxAP: 4,
      xpToNext: 120
    },

    moves: [
      { id: 'cleaver_chop', name: 'Talhada Brutal', type: 'FÍSICO', power: 55, pp: 12, maxPP: 12, desc: 'Alta chance de crítico. Ignora 20% DEF.', unlockLevel: 1 },
      { id: 'meat_hook', name: 'Gancho de Carne', type: 'FÍSICO', power: 40, pp: 10, maxPP: 10, desc: 'Puxa inimigo (sempre acerta primeiro no próximo turno).', unlockLevel: 3 },
      { id: 'blood_frenzy', name: 'Fúria Sanguinária', type: 'STATUS', power: 0, pp: 6, maxPP: 6, desc: '+50% ATK, -30% DEF por 3 turnos.', unlockLevel: 5 },
      { id: 'tenderize', name: 'Amaciar', type: 'FÍSICO', power: 30, pp: 15, maxPP: 15, desc: '3-5 golpes fracos. Cada acerto aumenta próximo dano.', unlockLevel: 7 },
      { id: 'executioner', name: 'Executor', type: 'FÍSICO', power: 150, pp: 2, maxPP: 2, desc: 'Mata instantaneamente se HP inimigo < 20%.', unlockLevel: 12 }
    ],

    passive: {
      id: 'bloodlust',
      name: 'Sede de Sangue',
      desc: 'A cada 10% HP perdido: +10% ATK, +5% Crítico. Em 1 HP: dano triplicado.'
    }
  },

  // Assassino Sombrio — Speed/Crit
  shadow_assassin: {
    id: 'shadow_assassin',
    name: 'Assassino Sombrio',
    title: 'Lâmina na Noite',
    description: 'Rápido, letal, evasivo. Ataca primeiro e foge das sombras.',
    icon: '🗡️',
    color: '#00d4ff',
    accentColor: '#0099cc',
    locked: true,
    unlockRequirement: { type: 'speed_runs', value: 3 }, // 3 speedruns (vitória < 10 min)

    baseStats: {
      maxHP: 80,
      attack: 15,
      defense: 4,
      speed: 10,
      maxAP: 6,
      xpToNext: 110
    },

    moves: [
      { id: 'shadow_strike', name: 'Golpe Sombrio', type: 'FÍSICO', power: 50, pp: 18, maxPP: 18, desc: 'Sempre acerta primeiro. +30% crítico.', unlockLevel: 1 },
      { id: 'vanish', name: 'Desvanecer', type: 'STATUS', power: 0, pp: 8, maxPP: 8, desc: 'Evade próximo ataque. Próximo golpe = crítico.', unlockLevel: 3 },
      { id: 'poison_blade', name: 'Lâmina Envenenada', type: 'ESPECIAL', power: 35, pp: 12, maxPP: 12, desc: 'Aplica veneno (5% HP/turno por 4 turnos).', unlockLevel: 5 },
      { id: 'phantom_dance', name: 'Dança Fantasma', type: 'FÍSICO', power: 40, pp: 6, maxPP: 6, desc: '4 golpes. Cada acerto concede evasão temporária.', unlockLevel: 8 },
      { id: 'one_shot', name: 'Tiro Certo', type: 'ESPECIAL', power: 200, pp: 1, maxPP: 1, desc: 'Uma chance. Crítico garantido. Falha = turno perdido.', unlockLevel: 12 }
    ],

    passive: {
      id: 'shadow_step',
      name: 'Passo Sombrio',
      desc: '25% chance de evitar dano completamente. Contra-ataque automático ao esquivar.'
    }
  },

  // Clérigo Corrompido — Healer/Support
  corrupted_cleric: {
    id: 'corrupted_cleric',
    name: 'Clérigo Corrompido',
    title: 'Fé Distorcida',
    description: 'Cura a si mesmo corrompendo outros. Equilíbrio entre vida e morte.',
    icon: '⛧',
    color: '#ffd700',
    accentColor: '#f39c12',
    locked: true,
    unlockRequirement: { type: 'healing_done', value: 500 }, // 500 HP curados total

    baseStats: {
      maxHP: 90,
      attack: 10,
      defense: 7,
      speed: 4,
      maxAP: 5,
      xpToNext: 100
    },

    moves: [
      { id: 'dark_mend', name: 'Reparo Sombrio', type: 'STATUS', power: 0, pp: 10, maxPP: 10, desc: 'Cura 40% HP. Custa 10% HP máximo.', unlockLevel: 1 },
      { id: 'smite', name: 'Flagelo', type: 'ESPECIAL', power: 55, pp: 12, maxPP: 12, desc: 'Dano sagrado. Dobro contra mortos-vivos.', unlockLevel: 3 },
      { id: 'pain_share', name: 'Compartilhar Dor', type: 'ESPECIAL', power: 0, pp: 8, maxPP: 8, desc: 'Inimigo recebe dano = HP que você curou.', unlockLevel: 5 },
      { id: 'blessing_decay', name: 'Bênção da Decomposição', type: 'STATUS', power: 0, pp: 6, maxPP: 6, desc: 'Próximos 3 ataques: cura 20% do dano.', unlockLevel: 7 },
      { id: 'divine_judgment', name: 'Julgamento Divino', type: 'ESPECIAL', power: 100, pp: 3, maxPP: 3, desc: 'Dano = HP máximo - HP atual. Cura total.', unlockLevel: 12 }
    ],

    passive: {
      id: 'corrupted_faith',
      name: 'Fé Corrompida',
      desc: 'Cura recebida aumentada 50%. Ao curar acima do máximo: ganha escudo temporário.'
    }
  }
};

// Helper: pega classe por ID
export function getCharacterClass(id) {
  return CHARACTER_CLASSES[id] || null;
}

// Helper: lista classes desbloqueadas
export function getUnlockedClasses(saveData = {}) {
  return Object.values(CHARACTER_CLASSES).filter(c => {
    if (!c.locked) return true;
    if (!c.unlockRequirement) return false;
    const req = c.unlockRequirement;
    if (req.type === 'floor') return (saveData.highestFloor || 1) >= req.value;
    if (req.type === 'enemies_killed') return (saveData.totalEnemiesKilled || 0) >= req.value;
    if (req.type === 'speed_runs') return (saveData.speedRuns || 0) >= req.value;
    if (req.type === 'healing_done') return (saveData.totalHealingDone || 0) >= req.value;
    return false;
  });
}

// Helper: classes disponíveis (desbloqueadas + próximas a desbloquear)
export function getAvailableClasses(saveData = {}) {
  return Object.values(CHARACTER_CLASSES).map(c => ({
    ...c,
    progress: c.locked && c.unlockRequirement ? getUnlockProgress(c.unlockRequirement, saveData) : 100
  }));
}

function getUnlockProgress(req, saveData) {
  if (req.type === 'floor') return Math.min(100, ((saveData.highestFloor || 1) / req.value) * 100);
  if (req.type === 'enemies_killed') return Math.min(100, ((saveData.totalEnemiesKilled || 0) / req.value) * 100);
  if (req.type === 'speed_runs') return Math.min(100, ((saveData.speedRuns || 0) / req.value) * 100);
  if (req.type === 'healing_done') return Math.min(100, ((saveData.totalHealingDone || 0) / req.value) * 100);
  return 0;
}