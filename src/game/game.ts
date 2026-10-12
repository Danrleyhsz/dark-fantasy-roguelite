import { loadSave, writeSave, type SaveData, type StorageLike } from '../persistence/save.ts';
import { CONFIG, type WeaponKind } from './config.ts';
import { META, type MetaId, type UpgradeId } from './upgrades.ts';
import { chooseUpgrade, createRun, stepWorld, type InputState, type World } from './world.ts';

/** Estados explícitos de tela (TECHNICAL_DESIGN). A simulação só avança em 'playing'. */
export type Screen = 'menu' | 'playing' | 'paused' | 'reward' | 'victory' | 'defeat';

export interface RunResult { victory: boolean; ashes: number; newBest: boolean; levelsGained: number }

export interface Game {
  screen: Screen;
  world: World | null;
  save: SaveData;
  storage: StorageLike | null;
  /** Resumo da última incursão encerrada. */
  result: RunResult | null;
  /** false se a última gravação falhou (a interface avisa, o jogo continua). */
  saved: boolean;
}

export function createGame(storage: StorageLike | null = null): Game {
  return { screen: 'menu', world: null, save: loadSave(storage), storage, result: null, saved: true };
}

/** Nova incursão: o mundo anterior é descartado inteiro (entidades, timers e efeitos vivem nele). */
export function startRun(g: Game, seed: number): void {
  g.world = createRun(seed, g.save.meta, g.save.hero, g.save.weapon);
  g.result = null;
  g.screen = 'playing';
}

export function setPaused(g: Game, paused: boolean): void {
  if (paused && g.screen === 'playing') g.screen = 'paused';
  else if (!paused && g.screen === 'paused') g.screen = 'playing';
}

/** Abandonar a incursão não rende cinzas, mas a experiência do herói é mantida. */
export function quitToMenu(g: Game): void {
  if (g.world && (g.screen === 'paused' || g.screen === 'playing' || g.screen === 'reward')) keepHero(g, g.world);
  g.world = null;
  g.screen = 'menu';
}

export function updateGame(g: Game, input: InputState, dt: number): void {
  if (g.screen !== 'playing' || !g.world) return;
  const w = g.world;
  stepWorld(w, input, dt);
  if (w.offer) g.screen = 'reward';
  else if (w.outcome && w.outcomeTimer <= 0) finishRun(g, w, w.outcome);
}

export function pickReward(g: Game, id: UpgradeId): void {
  if (g.screen !== 'reward' || !g.world) return;
  chooseUpgrade(g.world, id);
  if (!g.world.offer) g.screen = 'playing';
}

/** Cinzas da incursão: abates + salas limpas + equipamentos convertidos + bônus de vitória. */
export function ashesFor(w: World): number {
  const R = CONFIG.run;
  return w.stats.kills * R.ashesPerKill + w.stats.roomsCleared * R.ashesPerRoom + w.runAshes + (w.outcome === 'victory' ? R.ashesVictory : 0);
}

function keepHero(g: Game, w: World): void {
  g.save.hero = { level: w.player.level, xp: w.player.xp };
  g.saved = writeSave(g.storage, g.save);
}

function finishRun(g: Game, w: World, outcome: 'victory' | 'defeat'): void {
  const s = g.save, ashes = ashesFor(w), reached = w.depth + 1;
  s.ashes += ashes;
  s.best.runs++;
  if (outcome === 'victory') s.best.wins++;
  const newBest = reached > s.best.depth;
  s.best.depth = Math.max(s.best.depth, reached);
  g.result = { victory: outcome === 'victory', ashes, newBest, levelsGained: w.stats.levelsGained };
  keepHero(g, w);
  g.screen = outcome;
}

/** Compra um nível no Relicário (só no menu). */
export function buyMeta(g: Game, id: MetaId): boolean {
  const cost = META[id].costs[g.save.meta[id]];
  if (g.screen !== 'menu' || cost === undefined || g.save.ashes < cost) return false;
  g.save.ashes -= cost;
  g.save.meta[id]++;
  g.saved = writeSave(g.storage, g.save);
  return true;
}

/** Escolhe a arma da próxima incursão (só no menu). */
export function setWeapon(g: Game, weapon: WeaponKind): void {
  if (g.screen !== 'menu' || !Object.hasOwn(CONFIG.weapons, weapon)) return;
  g.save.weapon = weapon;
  g.saved = writeSave(g.storage, g.save);
}

export function setReduceMotion(g: Game, on: boolean): void {
  g.save.settings.reduceMotion = on;
  g.saved = writeSave(g.storage, g.save);
}

export function setVolume(g: Game, volume: number): void {
  g.save.settings.volume = Math.min(1, Math.max(0, volume));
  g.saved = writeSave(g.storage, g.save);
}
