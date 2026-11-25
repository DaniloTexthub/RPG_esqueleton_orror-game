# RPG Skeleton Dungeon — Horror Turn-Based RPG

> **Protótipo 2D em JavaScript vanilla (Vite) com arquitetura ECS escalável**
> **Stack:** HTML5 Canvas + ES6 Modules + Vite | **Arquitetura:** ECS leve, Renderer abstraído (2D→3D ready)
> **Fase atual:** Persistência, progressão e inventário implementados; sincronização MySQL é opcional e não incluída.

---

## 🎯 Visão Geral

Jogo de masmorra com terror, protagonista esqueleto, movimento em grid (WASD), combate por turnos ao encostar em inimigos. 5 classes jogáveis com stats/moves/passivas exclusivas, menu com seleção de personagem, achievements e customização (bloqueada).

---

## 📅 Histórico de Desenvolvimento

### Sessão Inicial: Estrutura & AGENT.md
- **Definição de stack**: HTML/CSS/JS vanilla + MySQL opcional
- **Regras AGENT.md**: comentários máx 2 linhas, português-BR, permissão para grandes mudanças
- **Arquitetura aprovada**: Engine com fixed timestep, ECS leve, Scene system, Renderer abstraction

### 7 Perguntas Técnicas Respondidas
| # | Decisão |
|---|---------|
| 1 | Tile size: **32×32px** |
| 2 | Movimento: **lerp suave** (120ms/tile) |
| 3 | Mapa: **JSON próprio** (migra pra Tiled depois) |
| 4 | ECS: **Leve** (Map<ComponentType, Component>) |
| 5 | Combate: **Cena separada** (transição dramática) |
| 6 | Player: **Sprite único** (partes separadas no futuro) |
| 7 | Build: **Vite** (HMR, tree-shaking, produção) |

---

### Fase 1 — Combate por Turnos (CONCLUÍDA)

**Arquivos criados/modificados:**
- `src/components/Combatant.js` — Stats unificados (hp, atk, def, spd, AP, XP, status effects, factories)
- `src/systems/CombatSystem.js` — Turnos, iniciativa por speed, ações player, IA inimigo, eventos
- `src/ui/CombatUI.js` — Pokémon-style: painéis inimigo/player, caixa msg typing, menu 4 ações, submenu golpes, números dano, shake, barras animadas, animação vitória/derrota/fuga, XP animado
- `src/scenes/CombatScene.js` — Gerencia fluxo, migração PlayerTag↔Combatant, fade transitions, animação entrada combate (flash+shake)
- `src/renderer/RenderContext.js` — `fadeIn`, `fadeOut`, `updateFade`, `drawFade`, `flash`, `updateFlash`, `drawFlash`
- `src/core/Engine.js` — Loop de render chama updateFade/drawFade/updateFlash/drawFlash
- `src/systems/MovementSystem.js` — Trigger combate em colisão, interação tecla E (portas), escadas
- `src/systems/InputSystem.js` — INTERACT_KEY (E), getInteractPressed/consumeInteract
- `src/scenes/DungeonScene.js` — Handle retorno combate, onEnter com characterId/floor/isNewGame, replacePlayerWithClass, reanexa InputSystem
- `src/main.js` — Registra CombatScene/MenuScene, handlers combatStart/menuStartGame
- `src/data/characters.js` — 5 classes jogáveis com stats/moves/passivas exclusivas + unlock requirements
- `src/scenes/MenuScene.js` — Menu principal com seleção de personagem, achievements, customização (bloqueada)
- `src/entities/createPlayer.js` — Aceita characterId, usa stats/cores da classe

---

### Interações Dungeon (CONCLUÍDA)
- **Inimigo morto removido** ao vencer combate (`active=false` + event `enemyDefeated`)
- **Escadas funcionando** — pisar em `>` desce, `<` sobe andar
- **Porta interativa com E** — abre/fecha porta adjacente na direção que o player está virado

### Fase 2 — Sprites & Visual (CONCLUÍDA)
- Estrutura de spritesheet e animações nomeadas mantida com fallback visual
- Spritesheets carregadas com cache lazy load e sem requisições repetidas após falha
- Tiles procedurais para chão, parede, porta e escada
- Animações centralizadas no `AnimationSystem`, sem atualização duplicada no render
- Partículas simples de impacto e poeira ligadas aos eventos de combate/movimento

### Fase 3 — Persistência & Progressão (CONCLUÍDA)
- Três slots locais em IndexedDB, com espelho/fallback em localStorage e metadados de data/classe/andar
- Saves restauram seed, mapa, portas, inimigos ativos, posição, atributos, inventário, equipamento e habilidades
- Progresso de nível concede pontos; árvore de habilidades aplica bônus persistentes
- Inventário abre com `I`, permite usar poções, equipar arma/armadura e consome a chave em uma porta trancada
- O save legado de progresso continua disponível para migração; sincronização MySQL permanece opcional

### Fase 4 — Procedural & Conteúdo (CONCLUÍDA)
- Chaves coloridas abrem portas correspondentes; salas secretas guardam itens e armadilhas ativam uma única vez
- Loot ponderado por inimigo/andar com raridades, além de ouro recebido ao vencer combates
- Chefes escaláveis aparecem a cada cinco andares e usam golpe devastador e fase de fúria
- Eventos aleatórios incluem santuários de cura e comerciantes com poções e equipamentos
- Saves preservam itens coletados, estado de portas/eventos, ouro e estado dos chefes

### Masmorras procedurais
- Mapas de 45×33 tiles com câmera mantendo a área visível original de 25×18
- Seis salas aleatórias em setores conectados por corredores; escadas em salas separadas
- Inimigos surgem dentro das salas, afastados da entrada e uns dos outros
- Fantasmas têm desenho translúcido próprio quando o spritesheet não está disponível

---

### Bugs Encontrados & Corrigidos

| # | Bug | Causa | Fix |
|---|-----|-------|-----|
| 1 | **Tela preta** | Systems não adicionados à Scene | `DungeonScene.init()` cria `InputSystem` + `MovementSystem` via `addSystem()` |
| 2 | **RenderSystem não desenha** | `onAdd()` nunca chamado | `renderSystem.onAdd(engine)` manual no `main.js` |
| 3 | **MovementSystem não roda** | `Scene.update()` filtra por `requiredComponents` | Adicionado `else if (requiredComponents.length === 0)` para InputSystem |
| 4 | **Input consumido antes do MovementSystem** | `Engine.fixedUpdate()` limpava `justPressed` antes de `scene.update()` | Movido `clear()` para **depois** do `scene.update()` |
| 5 | **Inimigos "tremendo"** | `MovementSystem.update()` processava lerp de TODAS entities | Guard `if (!vel.moving) continue` |
| 6 | **Movimento não funcionava** | `InputSystem` tinha `update()` duplicado (2º vazio sobrescrevia o real) | Removido `update()` duplicado |
| 7 | **Collider ReferenceError** | `checkAABB` referenciava `other` não no parâmetro | Adicionado parâmetro `other` + atualizado call site |
| 8 | **FadeIn not a function** | `RenderContext` não tinha fade methods | Implementado `fadeIn`/`fadeOut`/`updateFade`/`drawFade` + integrado no Engine |
| 9 | **CombatUI 60% à esquerda** | CSS conflitante `#combat-ui { left:50%; transform:translateX(-50%) }` | CSS antigo comentado/removido |
| 10 | **Tela preta ao voltar do combate** | `DungeonScene.onEnter` não chamava `fadeIn` | Adicionado `fadeIn(400)` em todos caminhos de entrada |
| 11 | **Sem movimento ao voltar do combate** | `InputSystem.onExit` remove listeners, `onEnter` não reanexava | Reanexa `InputSystem.onAdd(engine)` no `DungeonScene.onEnter` |

---

## 🚀 Como Rodar

```bash
cd "/c/Users/Danilo/OneDrive/Desktop/RPG_esceleton dangeon"
npm install       # Só na primeira vez
npm run dev       # Abre http://localhost:5173
```

### Controles

| Tecla | Ação |
|-------|------|
| **WASD / Setas** | Move player (1 tile, suave) |
| **E** | Interage (abre/fecha porta adjacente) |
| **I** | Abre/fecha inventário e árvore de habilidades |
| **1/2/3/4** | Combate: Atacar/Defender/Item/Fugir |
| **Setas + Enter/Z** | Navega menus combate |
| **ESC/X** | Volta menu golpes → ações |
| **F1** | Toggle debug (FPS, entity count) |
| **F2** | Toggle grid visual |
| **F3** | Toggle colliders |
| **F4** | Alterna para o renderer 3D WebGL |
| **W / S ou ↑ / ↓** | Avança e recua no modo 3D |
| **A / D ou ← / →** | Desloca para esquerda/direita em relação à câmera no modo 3D |
| **Mouse** | Olha ao redor no modo 3D (clique na tela para capturar) |
| **Clique do mouse** | Ataca inimigos ou quebra caixas no modo 3D |
| **G / Tab** | Abre ou fecha o inventário no modo 3D |
| **ESC** | Pausa o modo 3D e libera o mouse para escolher opções |
| **Shift** | Corre no modo 3D |
| **E** | Interage com a escada ou caixa próxima |
| **R** | Regenera andar atual |

No modo 3D, jogador e inimigos se movem continuamente, sem passos por tile. A tocha acompanha a câmera com luz quente e oscilação suave; no 2D há um halo simplificado. Monstros, escadas, portas, itens e caixas usam silhuetas e cores distintas.

---

## 🏗️ Arquitetura (src/)

```
src/
├── main.js                    # Entry point, registra cenas, event handlers
├── core/
│   ├── Engine.js              # Game loop, fixed timestep, scene mgmt, render loop
│   ├── Entity.js              # ECS Entity (id, components Map, tags)
│   ├── Component.js           # Base Component
│   ├── System.js              # Base System (priority, requiredComponents)
│   ├── EventBus.js            # Pub/Sub desacoplado
│   └── Scene.js               # Container entities + systems (priority sort)
├── systems/
│   ├── InputSystem.js         # Teclado → engine.input + lastDirection + lastInteract (E)
│   ├── MovementSystem.js      # WASD + grid collision + lerp + combate trigger + interação E + escadas
│   ├── CombatSystem.js        # Turnos, iniciativa speed, ações player, IA inimigo, XP/level
│   ├── InventorySystem.js     # Consumíveis, itens empilháveis e equipamento
│   ├── SkillSystem.js         # Árvore simples de habilidades e bônus
│   ├── SaveSystem.js          # Slots IndexedDB com fallback localStorage
│   └── RenderSystem.js        # Draw map + entities (zIndex sort)
├── components/
│   ├── Position.js            # Grid coords (x, y) + clone()
│   ├── Velocity.js            # Lerp target + progress + moveTo/stop/update
│   ├── Sprite.js              # Color/image/spritesheet + animação
│   ├── Collider.js            # Solid/trigger + AABB + checkAABB(posA, posB, other)
│   ├── PlayerTag.js           # Stats persistentes (HP, AP, atk, def, level, XP, floor)
│   └── Combatant.js           # Stats combate (hp, atk, def, spd, AP, XP, status, factories)
├── map/
│   ├── GridMap.js             # Tiles Uint8Array + features + proc gen + stairs/doors
│   └── TileType.js            # Definições walkable/interactable (DOOR_CLOSED/OPEN, STAIRS_UP/DOWN)
├── renderer/
│   ├── CanvasRenderer.js      # Canvas 2D impl (abstraído p/ WebGL/Three.js)
│   └── RenderContext.js       # Camera, alpha, fadeIn/out, flash, debug flags
├── scenes/
│   ├── DungeonScene.js        # Mapa proc, spawn, floor transition, combate return
│   ├── CombatScene.js         # Fade in/out, CombatSystem+CombatUI, component migration
│   └── MenuScene.js           # Main menu, character select, achievements, customize (locked)
├── ui/
│   ├── CombatUI.js            # Menus e fluxo visual de combate
│   └── InventoryUI.js         # Itens, equipamento e habilidades (tecla I)
├── entities/
│   ├── createPlayer.js        # Factory: usa characterId → stats/cores/moves da classe
│   └── createEnemy.js         # Factory: zumbi, esqueleto, fantasma, morcego
├── data/
│   └── characters.js          # 5 classes: warrior, necromancer, butcher, assassin, cleric
└── utils/
    ├── constants.js           # TILE_SIZE, KEYS, DIRS, COLORS, Z_INDEX, GAME_STATE
    └── math.js                # lerp, clamp, manhattan, grid↔screen
```

---

## 🎮 Fluxo de Jogo

```
Menu (seleção classe) → DungeonScene (exploração) 
    → encosta em inimigo → CombatScene (turn-based Pokémon-style) 
    → vitória/derrota/fuga → DungeonScene (mesmo andar, player persistido)
```

**Classes jogáveis:**
1. **Esqueleto Guerreiro** ⚔️ — Equilibrado (desbloqueado)
2. **Necromante** 👑 — Mago/summoner (andar 5)
3. **Carniceiro** 🔪 — Tank/berserker (100 kills)
4. **Assassino Sombrio** 🗡️ — Speed/crit (3 speedruns)
5. **Clérigo Corrompido** ⛧ — Healer/support (500 cura)

---

## 📝 Convenções (ver AGENT.md)

- **Comentários**: máx 2 linhas, português-BR
- **Nomes**: funções/variáveis em português, termos técnicos em inglês
- **Commits**: `feat:`, `fix:`, `refactor:`, `docs:`
- **Arquitetura**: desacoplada, testável, expansível 2D→3D (10 princípios escalabilidade)

---

## 🔗 Git

```bash
git log --oneline -10
# Ver histórico de commits desta sessão
```

---

*Última atualização: 2026-11-20 — Fase 1 Combate + Interações Dungeon concluídas*