# RPG Skeleton Dungeon — Horror Turn-Based RPG

> **Protótipo 2D em JavaScript vanilla (Vite) com arquitetura ECS escalável**
> **Stack:** HTML5 Canvas + ES6 Modules + Vite | **Arquitetura:** ECS leve, Renderer abstraído (2D→3D ready)

---

## 🎯 Visão Geral

Jogo de masmorra com terror, protagonista esqueleto, movimento em grid (WASD), combate por turnos ao encostar em inimigos.

---

## 📅 Histórico de Desenvolvimento — 2026-11-19

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

### Implementação: Estrutura Base (Commit 1)

```
src/
├── main.js                    # Entry point
├── core/
│   ├── Engine.js              # Game loop, fixed timestep, scene mgmt
│   ├── Entity.js              # ECS Entity (id, components Map, tags)
│   ├── Component.js           # Base Component
│   ├── System.js              # Base System (priority, requiredComponents)
│   ├── EventBus.js            # Pub/Sub desacoplado
│   └── Scene.js               # Container entities + systems
├── systems/
│   ├── InputSystem.js         # Teclado → engine.input.justPressed
│   ├── MovementSystem.js      # WASD + grid collision + lerp
│   └── RenderSystem.js        # Draw map + entities (zIndex sort)
├── components/
│   ├── Position.js            # Grid coords (x, y)
│   ├── Velocity.js            # Lerp target + progress
│   ├── Sprite.js              # Color/image/spritesheet + animação
│   ├── Collider.js            # Solid/trigger + AABB
│   └── PlayerTag.js           # Stats (HP, AP, atk, def, inventory)
├── map/
│   ├── GridMap.js             # Tiles Uint8Array + features + proc gen
│   └── TileType.js            # Definições walkable/interactable
├── renderer/
│   ├── CanvasRenderer.js      # Canvas 2D impl (abstraído p/ WebGL)
│   └── RenderContext.js       # Camera, alpha, debug flags
├── scenes/
│   └── DungeonScene.js        # Mapa proc, spawn player/enemies, floor transition
├── entities/
│   ├── createPlayer.js        # Factory: esqueleto verde neon
│   └── createEnemy.js         # Factory: zumbi, esqueleto, fantasma, morcego
└── utils/
    ├── constants.js           # TILE_SIZE, KEYS, DIRS, COLORS, Z_INDEX
    └── math.js                # lerp, clamp, manhattan, grid↔screen
```

---

### Bugs Encontrados & Corrigidos

| # | Bug | Causa | Fix |
|---|-----|-------|-----|
| 1 | **Tela preta** | Systems não adicionados à Scene | `DungeonScene.init()` cria `InputSystem` + `MovementSystem` via `addSystem()` |
| 2 | **RenderSystem não desenha** | `onAdd()` nunca chamado (criado global, não na scene) | `renderSystem.onAdd(engine)` manual no `main.js` |
| 3 | **MovementSystem não roda** | `Scene.update()` filtra por `requiredComponents` e pula systems sem match | Adicionado `else if (requiredComponents.length === 0)` para InputSystem |
| 4 | **Input consumido antes do MovementSystem** | `Engine.fixedUpdate()` limpava `justPressed` **antes** de `scene.update()` | Movido `clear()` para **depois** do `scene.update()`; InputSystem guarda `lastDirection` no seu `update()` |
| 5 | **Inimigos "tremendo"** | `MovementSystem.update()` processava lerp de TODAS entities com Velocity | Guard `if (!vel.moving) continue` — só processa quem está movendo |

---

### Estado Atual (Final da Sessão)

#### ✅ Funcionando
- [x] Vite dev server + HMR
- [x] Engine: fixed timestep (60Hz) + interpolação render
- [x] Scene system com priority-based systems
- [x] ECS leve: Entity + Component + System
- [x] InputSystem: captura WASD/Setas → `lastDirection`
- [x] GridMap procedural: salas + corredores + portas + escadas
- [x] RenderSystem: mapa neon + entities ordenadas por zIndex
- [x] Camera follow + clamp
- [x] UI: HP/AP/Floor overlay
- [x] Debug: F1 (FPS), F2 (grid), F3 (colliders), R (regen floor)

#### ⚠️ Pendente (Bug Final)
- **Movimento não executa**: `InputSystem.update()` loga direção, mas `MovementSystem.update()` não recebe/processa
- **Suspeita**: ordem de prioridade ou `getSystem()` não encontra InputSystem no momento certo
- **Logs mostram**: Scene roda, InputSystem.update chamado, mas MovementSystem não loga `tryMove`

#### 🎨 Visual (Debug Neon)
- **Background**: `#001100` (verde escuro)
- **Floor**: `#003300` + grid lines `#00ff00`
- **Walls**: `#330000` + borda vermelha
- **Player**: Quadrado **verde neon `#00ff00`** brilhante + olhos brancos
- **Enemies**: Quadrado **vermelho neon `#ff0044`** + X branco
- **Porta**: Amarelo/magenta pulsante com letra
- **Escadas**: Triângulos coloridos `>` `<`

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
| **F1** | Toggle debug (FPS, entity count) |
| **F2** | Toggle grid visual |
| **F3** | Toggle colliders |
| **R** | Regenera andar atual |

---

## 🏗️ Próximos Passos (Roadmap)

1. **Corrigir movimento** — debug prioridade InputSystem → MovementSystem
2. **Commit limpo** — "feat: movement system functional"
3. **Combate por turnos** — CombatScene, iniciativa, ações (atacar, item, fugir)
4. **Sprites reais** — substituir neon por spritesheet do esqueleto
5. **Save/Load** — localStorage → IndexedDB → MySQL sync
6. **Procedural melhor** — BSP rooms, chaves/portas, loot, boss
7. **3D Ready** — trocar CanvasRenderer por Three.jsRenderer (mesma interface)

---

## 📝 Convenções (ver AGENT.md)

- **Comentários**: máx 2 linhas, português-BR
- **Nomes**: funções/variáveis em português, termos técnicos em inglês
- **Commits**: `feat:`, `fix:`, `refactor:`, `docs:`
- **Arquitetura**: desacoplada, testável, expansível 2D→3D

---

## 🔗 Git

```bash
git log --oneline -10
# Ver histórico de commits desta sessão
```

---

*Última atualização: 2026-11-19 — Sessão de fundação da arquitetura e movimento*