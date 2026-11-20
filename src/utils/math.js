// Utilitários matemáticos puros — sem dependências externas

// Interpolação linear
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Interpolação linear para vetores
export function lerpVec(start, end, t) {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t)
  };
}

// Limita valor entre min e max
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Distância Manhattan (grid)
export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Distância Euclidiana
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Normaliza vetor
export function normalize(vec) {
  const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: vec.x / len, y: vec.y / len };
}

// Converte coordenadas de tela para grid
export function screenToGrid(screenX, screenY, tileSize, camera) {
  return {
    x: Math.floor((screenX + camera.x) / tileSize),
    y: Math.floor((screenY + camera.y) / tileSize)
  };
}

// Converte grid para tela (centro do tile)
export function gridToScreen(gridX, gridY, tileSize, camera) {
  return {
    x: gridX * tileSize - camera.x + tileSize / 2,
    y: gridY * tileSize - camera.y + tileSize / 2
  };
}

// Verifica se posição está dentro dos limites
export function inBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

// Gera ID único simples
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Embaralha array (Fisher-Yates)
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}