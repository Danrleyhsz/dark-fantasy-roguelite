import { CONFIG, type WeaponKind } from '../game/config.ts';
import { META, type MetaId, type MetaLevels } from '../game/upgrades.ts';

/** Só o necessário (TECHNICAL_DESIGN): progressão permanente, recordes e configurações. */
export interface SaveData {
  version: 1;
  ashes: number;
  meta: MetaLevels;
  /** Nível e experiência do herói: a progressão RPG persiste entre incursões. */
  hero: { level: number; xp: number };
  /** Arma escolhida no menu para a próxima incursão. */
  weapon: WeaponKind;
  best: { runs: number; wins: number; depth: number };
  settings: { reduceMotion: boolean; volume: number };
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'dark-fantasy-roguelite/save';

export function defaultSave(): SaveData {
  return {
    version: 1,
    ashes: 0,
    meta: { vigor: 0, edge: 0, breath: 0 },
    hero: { level: 1, xp: 0 },
    weapon: 'sword',
    best: { runs: 0, wins: 0, depth: 0 },
    settings: { reduceMotion: false, volume: 0.6 },
  };
}

/** Lê o progresso. Ausente, corrompido, de outro formato ou armazenamento indisponível: valores padrão. */
export function loadSave(storage: StorageLike | null): SaveData {
  const save = defaultSave();
  let raw: unknown = null;
  try {
    const text = storage?.getItem(KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    return save;
  }
  if (!raw || typeof raw !== 'object') return save;
  const r = raw as {
    ashes?: unknown; meta?: Record<string, unknown>; hero?: Record<string, unknown>; weapon?: unknown;
    best?: Record<string, unknown>; settings?: Record<string, unknown>;
  };
  save.ashes = int(r.ashes, 1_000_000);
  for (const id of Object.keys(META) as MetaId[]) save.meta[id] = int(r.meta?.[id], META[id].costs.length);
  save.hero.level = Math.max(1, int(r.hero?.level, CONFIG.levels.max));
  save.hero.xp = int(r.hero?.xp, 1_000_000);
  if (typeof r.weapon === 'string' && Object.hasOwn(CONFIG.weapons, r.weapon)) save.weapon = r.weapon as WeaponKind;
  save.best.runs = int(r.best?.runs, 1_000_000);
  save.best.wins = Math.min(int(r.best?.wins, 1_000_000), save.best.runs);
  save.best.depth = int(r.best?.depth, 100);
  save.settings.reduceMotion = r.settings?.reduceMotion === true;
  const vol = r.settings?.volume;
  save.settings.volume = typeof vol === 'number' && vol >= 0 && vol <= 1 ? vol : save.settings.volume;
  return save;
}

/** Inteiro entre 0 e max; qualquer outra coisa vira 0. */
function int(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;
}

/** Grava o progresso. Retorna false se o armazenamento falhar ou não existir (o jogo segue sem salvar). */
export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
