// Base Component — ECS leve
// Componentes são apenas dados (sem lógica)

export class Component {
  constructor() {
    this.enabled = true;
  }

  // Clone para serialização/factory
  clone() {
    const c = new this.constructor();
    Object.assign(c, this);
    return c;
  }
}