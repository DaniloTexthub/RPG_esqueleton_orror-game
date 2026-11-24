// SkillSystem — Árvore simples de bônus comprados com pontos de habilidade

export const SKILL_TREE = [
  {
    id: 'vitality', name: 'Vitalidade óssea', level: 2, requires: null,
    bonus: { maxHP: 20 }, description: '+20 HP máximo.'
  },
  {
    id: 'iron_guard', name: 'Guarda de ferro', level: 3, requires: 'vitality',
    bonus: { defense: 2 }, description: '+2 DEF.'
  },
  {
    id: 'crushing_blow', name: 'Golpe esmagador', level: 3, requires: 'vitality',
    bonus: { attack: 3 }, description: '+3 ATK.'
  },
  {
    id: 'swift_bones', name: 'Ossos velozes', level: 4, requires: 'crushing_blow',
    bonus: { speed: 2 }, description: '+2 SPD.'
  }
];

export class SkillSystem {
  getTree(playerTag) {
    return SKILL_TREE.map(skill => {
      const unlocked = playerTag.unlockedSkills.includes(skill.id);
      const available = !unlocked &&
        playerTag.level >= skill.level &&
        (!skill.requires || playerTag.unlockedSkills.includes(skill.requires)) &&
        playerTag.skillPoints > 0;
      return { ...skill, unlocked, available };
    });
  }

  unlock(entity, skillId) {
    const playerTag = entity?.get('PlayerTag');
    const skill = SKILL_TREE.find(entry => entry.id === skillId);
    if (!playerTag || !skill) return { success: false, message: 'Habilidade inválida.' };
    if (playerTag.unlockedSkills.includes(skillId)) {
      return { success: false, message: 'Essa habilidade já foi desbloqueada.' };
    }
    if (playerTag.skillPoints < 1 || playerTag.level < skill.level ||
        (skill.requires && !playerTag.unlockedSkills.includes(skill.requires))) {
      return { success: false, message: 'Requisitos da habilidade não atendidos.' };
    }

    playerTag.skillPoints--;
    playerTag.unlockedSkills.push(skillId);
    const combatant = entity.get('Combatant');
    for (const [stat, bonus] of Object.entries(skill.bonus)) {
      playerTag[stat] += bonus;
      if (stat === 'maxHP') playerTag.hp += bonus;
      if (combatant) {
        combatant[stat] += bonus;
        if (stat === 'maxHP') combatant.hp += bonus;
      }
    }
    return { success: true, message: `${skill.name} desbloqueada.` };
  }
}
