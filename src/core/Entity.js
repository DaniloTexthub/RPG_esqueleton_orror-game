// Entity — Container de componentes (ECS leve)
// Cada entidade tem ID único e Map<ComponentType, Component>

import { generateId } from '../utils/math.js';

export class Entity {
  constructor(id = null) {
    this.id = id || generateId();
    this.components = new Map();
    this.active = true;
    this.tags = new Set(); // Para queries rápidas (ex: 'player', 'enemy')
  }

  // Adiciona componente
  add(component) {
    const type = component.constructor.name;
    this.components.set(type, component);
    return this; // Encadeamento
  }

  // Remove componente
  remove(componentType) {
    const type = componentType.name || componentType;
    this.components.delete(type);
    return this;
  }

  // Obtém componente
  get(componentType) {
    const type = componentType.name || componentType;
    return this.components.get(type);
  }

  // Verifica se tem componente
  has(componentType) {
    const type = componentType.name || componentType;
    return this.components.has(type);
  }

  // Adiciona tag para query
  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  // Remove tag
  removeTag(tag) {
    this.tags.delete(tag);
    return this;
  }

  // Verifica tag
  hasTag(tag) {
    return this.tags.has(tag);
  }

  // Serialização básica (para save)
  toJSON() {
    const comps = {};
    for (const [type, comp] of this.components) {
      comps[type] = { ...comp };
    }
    return {
      id: this.id,
      active: this.active,
      tags: [...this.tags],
      components: comps
    };
  }
}