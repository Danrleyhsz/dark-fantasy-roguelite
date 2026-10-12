import { CONFIG } from '../src/game/config.ts';
import { inSector } from '../src/game/math.ts';
import { stepWorld, type InputState, type World } from '../src/game/world.ts';

export const STEP = CONFIG.step;

export function idle(): InputState {
  return { moveX: 0, moveY: 0, attack: false, aimAt: null };
}

/** Avança `seconds` de simulação; `input` pode ser fixo ou uma política (bot) chamada a cada passo. */
export function run(w: World, seconds: number, input: InputState | ((w: World) => InputState) = idle()): void {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) stepWorld(w, typeof input === 'function' ? input(w) : input, STEP);
}

export function runUntil(w: World, maxSeconds: number, done: (w: World) => boolean, policy: (w: World) => InputState): number {
  for (let t = 0; t < maxSeconds; t += STEP) {
    if (done(w)) return t;
    stepWorld(w, policy(w), STEP);
  }
  return Infinity;
}

/**
 * Bot simples: aproxima-se do inimigo mais próximo e ataca, mas sai da área de perigo
 * quando o inimigo está preparando um golpe. Serve para provar que o combate é vencível.
 */
export function fighter(w: World): InputState {
  const p = w.player;
  const e = w.enemies.reduce<World['enemies'][number] | null>(
    (best, x) => (!best || Math.hypot(x.x - p.x, x.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? x : best),
    null,
  );
  if (!e) return idle();
  const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
  const d2 = CONFIG.enemies[e.kind];
  const threatened = (e.state === 'windup' || e.state === 'attack') &&
    inSector(e.x, e.y, e.aim, d2.reach + 24, d2.arc, p.x, p.y, p.r);
  if (threatened) return { moveX: -dx / d, moveY: -dy / d, attack: false, aimAt: null };
  const inRange = d < CONFIG.player.attack.range + e.r - 4;
  return inRange
    ? { moveX: 0, moveY: 0, attack: true, aimAt: { x: e.x, y: e.y } }
    : { moveX: dx / d, moveY: dy / d, attack: false, aimAt: null };
}

/**
 * Contexto 2D falso: aceita qualquer chamada/propriedade e falha com argumentos não finitos,
 * pegando NaN/Infinity no desenho sem precisar de navegador.
 */
export function mockContext(): CanvasRenderingContext2D {
  const check = (args: unknown[]) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`argumento não finito: ${a}`);
  };
  const fake: unknown = new Proxy(function () {}, {
    get: (_t, key) => (key === 'measureText' ? () => ({ width: 10 }) : key === Symbol.toPrimitive ? () => 0 : fake),
    apply: (_t, _this, args) => {
      check(args);
      return fake;
    },
    set: (_t, _key, value) => {
      check([value]);
      return true;
    },
  });
  return fake as CanvasRenderingContext2D;
}

export function mockCanvas(width: number, height: number): HTMLCanvasElement {
  return { width, height, getContext: () => mockContext() } as unknown as HTMLCanvasElement;
}
