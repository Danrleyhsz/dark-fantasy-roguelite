import { CONFIG } from '../src/game/config.ts';
import { dangers, inDanger } from '../src/game/enemies.ts';
import { pickReward, updateGame, type Game } from '../src/game/game.ts';
import { clearPath, computeFlowField, flowAngle, type Room } from '../src/game/room.ts';
import { stepWorld, type InputState, type World } from '../src/game/world.ts';

export const STEP = CONFIG.step;

export function idle(): InputState {
  return { moveX: 0, moveY: 0, attack: false, aimAt: null, dodge: false };
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
 * Bot simples: aproxima-se do inimigo mais próximo e ataca, mas foge (ou esquiva) quando está
 * dentro de uma área de perigo. Serve para provar que o combate é vencível e para balancear.
 */
export function fighter(w: World): InputState {
  const p = w.player;
  let target = null as World['enemies'][number] | null, best = Infinity;
  for (const e of w.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) { best = d; target = e; }
  }
  // Projéteis vindo na direção do jogador: sai da linha deles.
  for (const q of w.projectiles) {
    if (!q.hostile) continue;
    const dx = p.x - q.x, dy = p.y - q.y, along = (dx * q.vx + dy * q.vy) / (Math.hypot(q.vx, q.vy) || 1);
    const across = Math.abs(dx * q.vy - dy * q.vx) / (Math.hypot(q.vx, q.vy) || 1);
    if (along > 0 && along < 140 && across < q.r + p.r + 8) {
      const s = Math.hypot(q.vx, q.vy) || 1;
      return { ...idle(), moveX: -q.vy / s, moveY: q.vx / s, dodge: along < 50 };
    }
  }
  for (const e of w.enemies) {
    for (const d of dangers(e)) {
      if (!inDanger(d, p.x, p.y, p.r + 10)) continue;
      const dx = p.x - e.x, dy = p.y - e.y, m = Math.hypot(dx, dy) || 1;
      // Em investidas (faixas), sair para o lado é melhor que recuar.
      if (d.shape === 'lane') return { ...idle(), moveX: -Math.sin(d.dir), moveY: Math.cos(d.dir), dodge: e.state === 'act' || e.t > 0.5 };
      return { ...idle(), moveX: dx / m, moveY: dy / m, dodge: e.state === 'act' };
    }
  }
  if (!target) return idle();
  const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
  const inRange = d < p.stats.range + target.r - 4;
  // Ira Flamejante quando ela pega dois ou mais inimigos.
  const sk = CONFIG.player.skill;
  const near = w.enemies.filter((e) => e.spawn <= 0 && Math.hypot(e.x - p.x, e.y - p.y) <= sk.radius + e.r).length;
  const skill = p.fe >= sk.cost && p.skillCd === 0 && near >= 2;
  if (inRange) return { ...idle(), attack: true, aimAt: { x: target.x, y: target.y }, skill };
  return { ...walkTo(w, target.x, target.y), skill };
}

/** Piloto da incursão inteira: luta, escolhe a primeira bênção e caminha até a porta aberta. */
export function playRun(g: Game, maxSeconds: number): void {
  for (let t = 0; t < maxSeconds && g.world; t += STEP) {
    if (g.screen === 'reward' && g.world.offer) {
      pickReward(g, g.world.offer[0]);
      continue;
    }
    if (g.screen !== 'playing') return;
    const w = g.world;
    updateGame(g, w.phase === 'exit' ? toDoor(w) : fighter(w), STEP);
  }
}

/** Campos de fluxo por sala e tile de destino (mesmo BFS da IA dos inimigos). */
const fields = new WeakMap<Room, Map<number, Int16Array>>();

/** Anda até (tx, ty) em linha reta se o corpo passa; senão contorna colunas e braseiros pelo campo de fluxo. */
function walkTo(w: World, tx: number, ty: number): InputState {
  const p = w.player, T = CONFIG.tile, tile = Math.floor(ty / T) * w.room.cols + Math.floor(tx / T);
  if (clearPath(w.room, p.x, p.y, tx, ty, p.r)) {
    const d = Math.hypot(tx - p.x, ty - p.y) || 1;
    return { ...idle(), moveX: (tx - p.x) / d, moveY: (ty - p.y) / d };
  }
  let byTile = fields.get(w.room);
  if (!byTile) fields.set(w.room, (byTile = new Map()));
  let dist = byTile.get(tile);
  if (!dist) {
    dist = new Int16Array(w.room.cols * w.room.rows);
    computeFlowField(w.room, tx, ty, dist, new Int32Array(dist.length));
    byTile.set(tile, dist);
  }
  const a = flowAngle(w.room, dist, p.x, p.y);
  return Number.isNaN(a) ? idle() : { ...idle(), moveX: Math.cos(a), moveY: Math.sin(a) };
}

/** Caminha até a porta norte contornando colunas e braseiros. */
export function toDoor(w: World): InputState {
  return walkTo(w, CONFIG.view.w / 2 - 1, 3 * CONFIG.tile + w.player.r);
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

/** localStorage em memória, com opção de falhar na escrita (cota cheia, modo privado). */
export function memoryStorage(initial: Record<string, string> = {}, failWrites = false) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      if (failWrites) throw new Error('QuotaExceededError');
      data[k] = v;
    },
  };
}
