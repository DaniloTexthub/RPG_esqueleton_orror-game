// Base Scene — Container de entities e systems para um estado do jogo
// Ex: DungeonScene, CombatScene, MenuScene

import { System } from './System.js';
import { Entity } from './Entity.js';
import { EventBus } from './EventBus.js';

export class Scene {
  constructor(name) {
    this.name = name;
    this.entities = [];
    this.systems = [];
    this.eventBus = new EventBus(); // EventBus local da cena
    this.game = null; // Referência ao Engine (setado no add)
    this.initialized = false;
  }

  // Inicialização — chamada uma vez ao entrar na cena
  init(game) {
    this.game = game;
    this.initialized = true;
    this.systems.forEach(s => s.onAdd(game));
  }

  // Adiciona entity à cena
  addEntity(entity) {
    this.entities.push(entity);
    return entity;
  }

  // Remove entity
  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
  }

  // Adiciona system (ordem por priority)
  addSystem(system) {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    if (this.initialized) system.onAdd(this.game);
    return system;
  }

  // Update de todos systems
  update(dt) {
    // Filtra entities ativas uma vez por frame
    const activeEntities = this.entities.filter(e => e.active);

    for (const system of this.systems) {
      if (!system.enabled) continue;
      const matching = system.filter(activeEntities);

      if (matching.length > 0) {
        system.update(dt, matching, this.game);
      }
      // Systems sem requiredComponents TAMBÉM precisam update
      else if (system.requiredComponents.length === 0) {
        system.update(dt, [], this.game);
      }
    }

    // Cleanup entities mortas
    this.entities = this.entities.filter(e => e.active);
  }

  // Render — delega para systems que têm método render (ex: RenderSystem)
  render(renderer, camera, alpha) {
    for (const system of this.systems) {
      if (system.enabled && typeof system.render === 'function') {
        system.render(renderer, camera, alpha);
      }
    }
  }

  // Entrada na cena
  onEnter(data = {}) { }

  // Saída da cena
  onExit() {
    this.systems.forEach(s => s.onRemove(this.game));
    this.eventBus.clear();
  }

  // Helper: busca entities por tag
  getByTag(tag) {
    return this.entities.filter(e => e.active && e.hasTag(tag));
  }

  // Helper: primeira entity com tag
  getFirstByTag(tag) {
    return this.entities.find(e => e.active && e.hasTag(tag));
  }
}