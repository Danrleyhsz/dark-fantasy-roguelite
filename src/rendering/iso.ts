// Projeção isométrica 2:1. O jogo inteiro (colisão, combate, IA) roda em coordenadas de mundo
// (x, y no chão, z para cima); só o desenho e a entrada passam por aqui.
// Um tile de mundo T x T vira um losango de 2T x T na tela.

/** x de tela de um ponto do mundo. */
export function isoX(x: number, y: number): number {
  return x - y;
}

/** y de tela de um ponto do mundo na altura z. */
export function isoY(x: number, y: number, z = 0): number {
  return (x + y) / 2 - z;
}

/** Ponto da tela (no plano do chão, z = 0) de volta para o mundo. */
export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return { x: sy + sx / 2, y: sy - sx / 2 };
}

/**
 * Direção na tela (u para a direita, v para baixo) convertida em direção de mundo com o mesmo módulo.
 * Assim W/setas/joystick movem o personagem "para cima na tela", como esperado num jogo isométrico.
 */
export function screenDirToWorld(u: number, v: number): { x: number; y: number } {
  const m = Math.hypot(u, v);
  if (m === 0) return { x: 0, y: 0 };
  const wx = u / 2 + v, wy = v - u / 2, wm = Math.hypot(wx, wy);
  return { x: (wx / wm) * m, y: (wy / wm) * m };
}

/** Direção de tela (não normalizada) de um ângulo de mundo: útil para escolher sprite de frente/costas. */
export function worldAngleToScreen(a: number): { u: number; v: number } {
  const c = Math.cos(a), s = Math.sin(a);
  return { u: c - s, v: (c + s) / 2 };
}
