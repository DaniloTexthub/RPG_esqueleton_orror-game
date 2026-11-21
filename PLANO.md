# PLANO.md — Roadmap & Tarefas do RPG Skeleton Dungeon

> **Atualizado:** 2026-11-20 | **Status atual:** Fase 1 (Combate) ✅ + Interações Dungeon ✅ | Próximo: Fase 2 — Sprites & Visual

---

## ✅ Concluído (Fundação)

| ID | Tarefa | Status | Commit |
|----|--------|--------|--------|
| F01 | Estrutura base: Vite + ECS + Engine (fixed timestep) | ✅ | feat: engine base |
| F02 | Scene system + EventBus desacoplado | ✅ | feat: scene system |
| F03 | InputSystem (WASD/setas → lastDirection) | ✅ | feat: input system |
| F04 | MovementSystem (grid + lerp 120ms + colisão mapa) | ✅ | feat: movement |
| F05 | GridMap procedural (salas, corredores, portas, escadas) | ✅ | feat: proc gen |
| F06 | RenderSystem (Canvas2D, zIndex, camera follow/clamp) | ✅ | feat: render |
| F07 | Entities: Player (neon verde) + Enemies (neon vermelho) | ✅ | feat: entities |
| F08 | UI overlay: HP/AP/Andar + Debug (F1/F2/F3/R) | ✅ | feat: ui |
| F09 | **Bugfix: InputSystem.update duplicado** | ✅ | fix: input update |
| F10 | **Bugfix: Collider.checkAABB parâmetro 'other'** | ✅ | fix: collider aabb |

---

## 🎯 Fase 1 — Combate por Turnos (CONCLUÍDA)

| ID | Tarefa | Prioridade | Estimativa | Dependências | Status |
|----|--------|------------|------------|--------------|--------|
| C01 | Criar `CombatScene` (nova cena, transição dramática) | 🔴 Alta | 3h | F02, F04 | ✅ |
| C02 | Sistema de iniciativa (player vs inimigo, speed) | 🔴 Alta | 2h | C01 | ✅ |
| C03 | Ações de combate: Atacar, Defender, Item, Fugir | 🔴 Alta | 3h | C02 | ✅ |
| C04 | Cálculo de dano (atk/def, crítico, defesa) | 🟡 Média | 2h | C03 | ✅ |
| C05 | UI de combate estilo Pokémon (log typing, menus 2x2, HP/AP/XP) | 🟡 Média | 2h | C01 | ✅ |
| C06 | Morte/vitória: XP, level up, retorno ao DungeonScene | 🟡 Média | 2h | C04 | ✅ |
| C07 | Transição suave DungeonScene ↔ CombatScene (fade in/out) | 🟢 Baixa | 1h | C01 | ✅ |
| C08 | **Animação de entrada no combate** (flash + shake + fade dramático) | 🟢 Baixa | 1h | C01 | ✅ |
| C09 | **Sinalização vitória/derrota/fuga** (overlay animado, XP animado, level up) | 🟢 Baixa | 1h | C06 | ✅ |
| C10 | **Fix: carregamento de andar ao voltar do combate** (characterId, floor, isNewGame) | 🔴 Alta | 1h | C06 | ✅ |
| C11 | **Inimigo morto removido do mapa** (active=false + event enemyDefeated) | 🟢 Baixa | 0.5h | C06 | ✅ |
| C12 | **Sistema de escadas funcionando** (pisar em >/< muda andar) | 🟢 Baixa | 0.5h | F05 | ✅ |
| C13 | **Porta interativa com tecla E** (abre/fecha porta adjacente) | 🟢 Baixa | 0.5h | F04 | ✅ |

**Arquivos criados/modificados na Fase 1:**
- `src/components/Combatant.js` — Stats unificados (hp, atk, def, spd, AP, XP, status effects, factories)
- `src/systems/CombatSystem.js` — Turnos, iniciativa por speed, ações player, IA inimigo, eventos, **enemyDefeated event**
- `src/ui/CombatUI.js` — Pokémon-style: painéis inimigo/player, caixa msg typing, menu 4 ações, submenu golpes, números dano, shake, barras animadas, **animação vitória/derrota/fuga, XP animado**
- `src/scenes/CombatScene.js` — Gerencia fluxo, migração PlayerTag↔Combatant, fade transitions, **animação entrada combate (flash+shake)**
- `src/renderer/RenderContext.js` — `fadeIn`, `fadeOut`, `updateFade`, `drawFade`, **`flash`, `updateFlash`, `drawFlash`**
- `src/core/Engine.js` — Loop de render chama updateFade/drawFade/**updateFlash/drawFlash**
- `src/systems/MovementSystem.js` — Trigger combate em colisão player-inimigo, **interação tecla E (portas), escadas, handleInteractionAt**
- `src/entities/createEnemy.js` — Removido trigger do collider, usa enemyData
- `src/scenes/DungeonScene.js` — Handle retorno do combate (vitória/derrota/fuga), **onEnter com characterId/floor/isNewGame, replacePlayerWithClass, reanexa InputSystem**
- `src/main.js` — Registra CombatScene, handler combatStart/**menuStartGame**
- `src/data/characters.js` — **5 classes jogáveis com stats/moves/passivas exclusivas + unlock requirements**
- `src/scenes/MenuScene.js` — **Menu principal com seleção de personagem, achievements, customização (bloqueada)**
- `src/entities/createPlayer.js` — **Aceita characterId, usa stats/cores da classe**
- `src/systems/InputSystem.js` — **INTERACT_KEY (E), getInteractPressed/consumeInteract**

---

## 🎨 Fase 2 — Sprites & Visual

| ID | Tarefa | Prioridade | Estimativa | Dependências |
|----|--------|------------|------------|--------------|
| S01 | Spritesheet do esqueleto (idle, walk, attack, hit, death) | 🔴 Alta | 4h | — |
| S02 | Spritesheets inimigos (zumbi, esqueleto, fantasma, morcego) | 🟡 Média | 4h | S01 |
| S03 | Tileset masmorra (parede, chão, porta, escada, decalques) | 🟡 Média | 3h | S01 |
| S04 | Sistema de animação no Sprite component (frames, loop, speed) | 🔴 Alta | 2h | S01 |
| S05 | Substituir neon debug por sprites reais | 🔴 Alta | 1h | S01, S04 |
| S06 | Partículas simples (sangue, poeira, hit spark) | 🟢 Baixa | 2h | S04 |

---

## 💾 Fase 3 — Persistência & Progressão

| ID | Tarefa | Prioridade | Estimativa | Dependências |
|----|--------|------------|------------|--------------|
| P01 | Save/Load no localStorage (player, floor, seed, inventário) | 🔴 Alta | 2h | C06 |
| P02 | Schema IndexedDB para saves múltiplos + metadados | 🟡 Média | 2h | P01 |
| P03 | MySQL sync (opcional): backend Node/Express + API REST | 🟢 Baixa | 6h | P02 |
| P04 | Progressão: level up, stats, árvore de habilidades simples | 🟡 Média | 3h | C06 |
| P05 | Inventário: slots, itens (poção, arma, chave), equipamento | 🟡 Média | 3h | P04 |

---

## 🏗️ Fase 4 — Procedural & Conteúdo

| ID | Tarefa | Prioridade | Estimativa | Dependências |
|----|--------|------------|------------|------------|
| G01 | BSP/Dungeon generator melhor (rooms + corridors garantidos) | 🟡 Média | 3h | F05 |
| G02 | Chaves/portas coloridas, salas secretas, armadilhas | 🟡 Média | 2h | G01 |
| G03 | Loot tables por andar/inimigo + raridade | 🟢 Baixa | 2h | P05 |
| G04 | Boss por cada 5 andares (mecânica única) | 🟢 Baixa | 4h | C06, G01 |
| G05 | Eventos aleatórios (santuário, comerciante, armadilha) | 🟢 Baixa | 2h | G01 |

---

## 🌐 Fase 5 — 3D Ready & Polish

| ID | Tarefa | Prioridade | Estimativa | Dependências |
|----|--------|------------|------------|------------|
| T01 | `Three.jsRenderer` implementando mesma interface do `CanvasRenderer` | 🟢 Baixa | 4h | F06 |
| T02 | Camera 3D (isométrica ou top-down com tilt) | 🟢 Baixa | 2h | T01 |
| T03 | Modelos low-poly (esqueleto, inimigos, tiles) | 🟢 Baixa | 6h | T01 |
| T04 | Shaders: outline, glow, fog of war | 🟢 Baixa | 3h | T01 |
| T05 | Performance: instancing, frustum culling, LOD | 🟢 Baixa | 2h | T01 |

---

## 🐛 Bugs Conhecidos / Tech Debt

| ID | Descrição | Severidade | Arquivo(s) |
|----|-----------|------------|------------|
| B01 | `checkMapCollision` retorna `false` se `gridMap` undefined (warn apenas) | 🟡 | MovementSystem.js:73 |
| B02 | Camera shake não implementado no render (apenas flag no engine) | 🟢 | CanvasRenderer.js, Engine.js:172 |
| B03 | `InputSystem` loga toda tecla de direção (muito verboso) | 🟢 | InputSystem.js:34 |
| B04 | `requiredComponents.length === 0` hack no Scene.update para InputSystem | 🟡 | Scene.js:58 |
| B05 | `eventBus` global vs cena — duplicação de listeners | 🟡 | main.js, DungeonScene.js |

---

## 📋 Como Usar

- **Iniciar tarefa:** `git checkout -b feat/C01-combat-scene`
- **Commit:** `feat: C01 - CombatScene base com transição`
- **Concluir:** Marcar ✅ na tabela acima e atualizar data
- **Bloqueador:** Adicionar nota na coluna Dependências

---

## 🎮 Próxima Sessão Sugerida

> **Foco:** `C01` + `C02` — Criar `CombatScene` e sistema de iniciativa
>
> **Arquivos a criar:**
> - `src/scenes/CombatScene.js`
> - `src/systems/CombatSystem.js`
> - `src/components/Combatant.js` (stats de combate: hp, atk, def, spd)
> - `src/ui/CombatUI.js` (log, botões, barras)
>
> **Teste manual:** Encostar em inimigo → transição → turno player → turno inimigo → volta ao dungeon