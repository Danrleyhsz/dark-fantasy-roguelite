export const TAU = Math.PI * 2;

/** Menor diferença com sinal entre dois ângulos, em (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  const d = (((a - b) % TAU) + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
}

/** PRNG determinístico (mulberry32): partidas e testes reproduzíveis a partir de uma semente. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Círculo (tx, ty, tr) toca o setor de raio `radius` e abertura `arc` centrado em `dir`? */
export function inSector(
  ox: number, oy: number, dir: number, radius: number, arc: number,
  tx: number, ty: number, tr: number,
): boolean {
  const dx = tx - ox, dy = ty - oy, d = Math.hypot(dx, dy);
  if (d > radius + tr) return false;
  if (d <= tr) return true;
  // Tolerância angular pelo raio do alvo: basta parte do corpo estar dentro do setor.
  return Math.abs(angleDiff(Math.atan2(dy, dx), dir)) <= arc / 2 + Math.asin(Math.min(1, tr / d));
}
