// Base System — Lógica que opera sobre entities com componentes específicos
// Systems são stateless (idealmente) e processam entities por query

export class System {
  constructor(priority = 0) {
    this.priority = priority; // Ordem de execução (menor = primeiro)
    this.enabled = true;
    this.requiredComponents = []; // Nomes dos componentes obrigatórios
  }

  // Verifica se entity tem todos componentes necessários
  matches(entity) {
    return this.requiredComponents.every(comp => entity.has(comp));
  }

  // Filtra entities que matcham
  filter(entities) {
    return entities.filter(e => e.active && this.matches(e));
  }

  // Update principal — sobrescrever nas subclasses
  // dt = delta time em ms
  update(dt, entities, game) {
    // Implementar nas subclasses
  }

  // Chamado quando system é adicionado ao engine
  onAdd(game) { }

  // Chamado quando system é removido
  onRemove(game) { }
}