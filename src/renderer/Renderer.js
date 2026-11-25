// Contrato para renderers: Canvas2D hoje, Three.js no futuro
export class Renderer {
  init(canvas) {
    throw new Error('Renderer.init deve ser implementado.');
  }

  resize(width, height) {
    throw new Error('Renderer.resize deve ser implementado.');
  }

  clear() {
    throw new Error('Renderer.clear deve ser implementado.');
  }

  drawMap(gridMap) {
    throw new Error('Renderer.drawMap deve ser implementado.');
  }

  drawEntity(entity) {
    throw new Error('Renderer.drawEntity deve ser implementado.');
  }

  render(scene) {
    throw new Error('Renderer.render deve ser implementado.');
  }

  dispose() {}
}
