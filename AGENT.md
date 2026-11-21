# AGENT.md — Instruções para Agentes de IA

## Visão Geral
**Projeto**: RPG_esceleton_dangeon (horror RPG — web)
**Stack**: HTML, CSS, JavaScript (vanilla) + MySQL (se necessário backend)
**Status**: Início — estrutura a ser definida

---

## Regras Obrigatórias

### 📝 Comentários no Código
- **Todo agente deve comentar a estrutura do código** explicando cada parte
- **Máximo 2 linhas por bloco/componente** — seja conciso
- Comente: propósito da função, fluxo principal, variáveis chave, regras de negócio
- Exemplo:
  ```js
  // Inicializa o jogo, carrega assets e inicia game loop
  function initGame() { ... }
  ```

### 🔐 Permissão para Grandes Alterações
- **Toda grande alteração requer permissão explícita do usuário** antes de executar
- Consideram-se "grandes alterações":
  - Nova arquitetura de pastas / restructure
  - Nova dependência/biblioteca
  - Mudança no schema do banco (MySQL)
  - Refatoração > 50 linhas
  - Alteração na API/contratos de dados

### 🌐 Idioma
- **Português (Brasil) obrigatório** em:
  - Comentários no código
  - Mensagens de commit
  - Documentação (README, AGENT.md, docs/)
  - Respostas ao usuário
- **Exceções**: termos técnicos, nomes próprios, nomenclatura de código (nomes de funções, variáveis, classes, tabelas SQL)

### 📈 Escalabilidade Alta (Obrigatório)
- **Arquitetura ECS (Entity-Component-System)** — sistemas desacoplados, components como data-only
- **Interfaces/Abstrações** — `Renderer` interface permite swap Canvas2D ↔ WebGL ↔ Three.js sem mudar game logic
- **EventBus global** — comunicação pub/sub entre sistemas/cenas, sem dependências diretas
- **Scene System** — cada cena encapsula seus systems/entities; `engine.changeScene()` gerencia ciclo de vida
- **Fixed Timestep** — lógica determinística (60Hz) separada do render (interpolação alpha)
- **Component Composition** — entidades = bag of components; behavior em systems, não herança
- **Dependency Inversion** — systems dependem de abstrações (Component, System base), não concreções
- **Open/Closed** — novos systems/components não exigem modificar código existente
- **Single Responsibility** — cada system faz uma coisa (Input, Movement, Combat, Render)
- **Data-Driven** — stats, enemy types, moves em factories/config, não hardcoded
- **No Circular Deps** — imports unidirecionais: core → systems → components → entities → scenes

---

## Stack & Convenções

### Frontend
- **HTML5** semântico
- **CSS3** — variáveis CSS, flex/grid, mobile-first
- **JavaScript ES6+** (modules, async/await, classes)
- **Sem frameworks** — vanilla JS apenas (a menos que autorizado)

### Backend (se MySQL)
- **Node.js** (Express/Fastify) ou **PHP** — confirmar antes
- **MySQL** — prepared statements obrigatórios
- **API REST** ou **GraphQL** — definir antes de criar

### Estrutura de Pastas (sugerida)
```
RPG_esceleton dangeon/
├── index.html           # Entry point
├── css/
│   ├── variables.css    # Design tokens (cores, spacing, fonts)
│   ├── base.css         # Reset, tipografia, utilitários
│   ├── components.css   # UI reutilizáveis (botões, cards, modais)
│   ├── screens.css      # Telas específicas (menu, jogo, inventário)
│   └── theme.css        # Tema horror (escuro, sangue, etc.)
├── js/
│   ├── main.js          # Bootstrap, roteamento simples
│   ├── core/
│   │   ├── Game.js      # Game loop, estado global
│   │   ├── SceneManager.js  # Troca de cenas/telas
│   │   └── EventBus.js      # Pub/sub desacoplado
│   ├── systems/
│   │   ├── CombatSystem.js
│   │   ├── InventorySystem.js
│   │   ├── DialogueSystem.js
│   │   └── SaveSystem.js      # localStorage / IndexedDB / API
│   ├── entities/
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   ├── Item.js
│   │   └── NPC.js
│   ├── ui/
│   │   ├── HUD.js
│   │   ├── InventoryUI.js
│   │   └── DialogueUI.js
│   └── utils/
│       ├── helpers.js   # Funções puras (rand, clamp, format)
│       ├── constants.js # Enums, configuração de jogo
│       └── api.js       # Fetch wrapper p/ backend (se houver)
├── assets/
│   ├── images/
│   ├── audio/
│   └── fonts/
├── sql/                 # (se MySQL)
│   ├── schema.sql
│   ├── seeds.sql
│   └── migrations/
├── docs/
│   ├── architecture.md
│   ├── database.md
│   └── api.md
├── AGENT.md
├── README.md
└── style.css            # (legacy — migrar para css/)
```

---

## Padrões de Código

### JavaScript
- **Modules ES6** (`type="module"` no HTML)
- **Classes** para sistemas/entidades, **funções puras** para utils
- **Event-driven** — `EventBus` para comunicação entre sistemas
- **State management** — objeto único `Game.state` (source of truth)
- **Async/await** — sem callbacks hell
- **Error handling** — `try/catch` em async, validação de entrada

### CSS
- **Variáveis CSS** em `:root` (cores, spacing, z-index, breakpoints)
- **BEM leve** para componentes (`.inventory__slot--active`)
- **Mobile-first** — `@media (min-width: ...)`
- **Animações** — `prefers-reduced-motion` respeitado

### MySQL (se usado)
- **snake_case** para tabelas/colunas
- **Prepared statements** sempre
- **Índices** em FKs e colunas de busca
- **Soft delete** (`deleted_at`) em entidades principais

---

## Checklist de Qualidade (antes de commitar)
- [ ] Código comentado (máx 2 linhas/bloco)
- [ ] Nomes em português (funções, variáveis, comentários)
- [ ] Termos técnicos em inglês mantidos (ex: `gameLoop`, `hitPoints`, `JSON`)
- [ ] Sem `console.log` de debug em produção
- [ ] Testado no navegador (Chrome/Firefox)
- [ ] Responsivo (mobile + desktop)
- [ ] Acessibilidade básica (alt, aria-labels, foco visível)

---

## Prompts Úteis
> "Crie a estrutura inicial de pastas e arquivos base (index.html, css/, js/)"
> "Implemente o Game.js com game loop fixo (requestAnimationFrame + delta time)"
> "Crie o EventBus para comunicação entre sistemas"
> "Monte o schema MySQL para: player, enemy, item, save_game"
> "Impleva SaveSystem com localStorage (fallback) e API (se backend)"

---

## Lembrete
> **Projeto em português (BR). Comentários máx 2 linhas. Grandes mudanças = pedir permissão. Vanilla JS first.**