// EventBus — Pub/Sub desacoplado para comunicação entre systems/scenes
// Evita dependências diretas: systems emitem/listen events

export class EventBus {
  constructor() {
    this.listeners = new Map(); // eventName -> Set<callback>
    this.onceListeners = new Map(); // eventName -> Set<callback> (executa 1x)
  }

  // Subscreve a evento
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback); // Retorna função unsubscribe
  }

  // Subscreve uma única vez
  once(event, callback) {
    if (!this.onceListeners.has(event)) this.onceListeners.set(event, new Set());
    this.onceListeners.get(event).add(callback);
  }

  // Remove listener
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    this.onceListeners.get(event)?.delete(callback);
  }

  // Emite evento para todos listeners
  emit(event, data = {}) {
    // Listeners normais
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`EventBus error [${event}]:`, e); }
    });
    // Listeners once
    this.onceListeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`EventBus once error [${event}]:`, e); }
    });
    this.onceListeners.get(event)?.clear();
  }

  // Limpa tudo
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

// Instância global (singleton prático para jogo pequeno)
export const eventBus = new EventBus();