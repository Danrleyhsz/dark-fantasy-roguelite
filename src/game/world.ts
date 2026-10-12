import { CONFIG, type EnemyKind } from './config.ts';
import { burst, damageEnemy, floater, heal, hurtPlayer, spawnProjectile } from './combat.ts';
import { updateEnemy } from './enemies.ts';
import { EMPTY_GEAR, deriveStats, xpToNext, type Gear, type PlayerStats } from './hero.ts';
import { RARITY, itemPower, rollItem, type Item } from './items.ts';
import { inSector, mulberry32 } from './math.ts';
import { computeFlowField, moveAndCollide, solidAtPoint, type Point, type Room } from './room.ts';
import { BOSS_ROOM, ROOM_POOL, START_ROOM } from './rooms.ts';
import { NO_META, UPGRADES, type MetaLevels, type UpgradeId } from './upgrades.ts';

export type { PlayerStats } from './hero.ts';

export interface InputState {
  /** Vetor de movimento (no mundo) com módulo ≤ 1. */
  moveX: number;
  moveY: number;
  /** Ataque pressionado desde o último passo. */
  attack: boolean;
  /** Alvo do ataque (mouse) em coordenadas do mundo; null usa a direção em que o jogador olha. */
  aimAt: Point | null;
  /** Esquiva pressionada desde o último passo. */
  dodge: boolean;
  /** Habilidade pressionada desde o último passo. */
  skill?: boolean;
}

export interface Swing { t: number; dir: number; serial: number }

export interface Player {
  x: number; y: number; r: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  face: number;
  moving: boolean;
  /** Derivado de nível, equipamento, bênçãos e Relicário (hero.ts). */
  stats: PlayerStats;
  level: number;
  xp: number;
  gear: Gear;
  meta: MetaLevels;
  fe: number;
  swing: Swing | null;
  cooldown: number;
  buffer: number;
  bufferAim: number | null;
  invuln: number;
  flash: number;
  /** Tempo restante da esquiva em curso (invulnerável enquanto > 0). */
  dodge: number;
  dodgeCd: number;
  dodgeDir: number;
  dodgeBuffer: number;
  dodgeSerial: number;
  skillCd: number;
  skillBuffer: number;
  /** Tempo restante do efeito visual da Ira Flamejante. */
  spin: number;
}

export type EnemyState = 'idle' | 'chase' | 'windup' | 'act' | 'recover' | 'stagger' | 'stun';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number; y: number; r: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  state: EnemyState;
  /** Tempo no estado atual. */
  t: number;
  face: number;
  /** Direção travada do ataque. */
  aim: number;
  moving: boolean;
  /** Índice do ataque em curso em CONFIG.enemies[kind].attacks. */
  attack: number;
  /** Próximo ataque do ciclo (chefe). */
  next: number;
  /** Espera até poder atacar de novo. */
  cd: number;
  phase: 1 | 2;
  /** Este ataque já acertou o jogador (um dano por ataque). */
  struck: boolean;
  flash: number;
  /** Último golpe do jogador que acertou (um dano por golpe). */
  lastSwing: number;
  /** Última esquiva (Passo Sombrio) que acertou. */
  lastDodge: number;
  /** Tempo restante surgindo (onda nova): inativo e intocável. */
  spawn: number;
}

export type ProjectileKind = 'ember' | 'feather' | 'wave';
export interface Projectile { x: number; y: number; vx: number; vy: number; r: number; life: number; damage: number; kind: ProjectileKind; hostile: boolean }

export type ParticleKind = 'spark' | 'bone' | 'blood' | 'holy' | 'ember';
/** z = altura acima do chão; faíscas caem e ficam no chão, brasas sobem. */
export interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; kind: ParticleKind }
export type FloaterKind = 'dmg' | 'crit' | 'heal' | 'hurt' | 'info';
/** Número/texto flutuante (dano, cura, nível) que sobe e some. */
export interface Floater { x: number; y: number; z: number; text: string; t: number; kind: FloaterKind }
export const FLOATER_TIME = 0.9;
/** Inimigo derrotado, mantido só para a animação de morte. */
export interface Corpse { kind: EnemyKind; x: number; y: number; r: number; face: number; t: number }
export const CORPSE_TIME = 0.6;
/** Equipamento caído no chão. */
export interface Loot { x: number; y: number; item: Item; t: number }
/** Último item pego (a interface mostra um aviso). */
export interface LootNotice { item: Item; equipped: boolean; ashes: number; time: number }

/** fight: há inimigos; reward: sala limpa, recompensa sendo oferecida; exit: porta aberta. */
export type RoomPhase = 'fight' | 'reward' | 'exit';

export interface World {
  room: Room;
  /** Índice da sala atual na incursão (0 = primeira). */
  depth: number;
  totalRooms: number;
  phase: RoomPhase;
  phaseTimer: number;
  /** Bênçãos oferecidas agora (o jogo pausa até a escolha). */
  offer: UpgradeId[] | null;
  upgrades: UpgradeId[];
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  corpses: Corpse[];
  floaters: Floater[];
  loot: Loot[];
  lastLoot: LootNotice | null;
  time: number;
  hitstop: number;
  shake: number;
  outcome: 'victory' | 'defeat' | null;
  /** Tempo da animação final antes de mostrar a tela de vitória/derrota. */
  outcomeTimer: number;
  rng: () => number;
  serial: number;
  nextId: number;
  flowDist: Int16Array;
  flowQueue: Int32Array;
  flowTile: number;
  stats: { kills: number; damageTaken: number; roomsCleared: number; xpGained: number; levelsGained: number };
  /** Cinzas de equipamentos convertidos nesta incursão. */
  runAshes: number;
  /** Abates já recompensados (conta para o Cálice de Sangue). */
  rewarded: number;
  /** Ondas que ainda vão surgir nesta sala. */
  waves: EnemyKind[][];
}

const P = CONFIG.player;

export interface Hero { level: number; xp: number }

function createPlayer(at: Point, meta: MetaLevels, hero: Hero): Player {
  const stats = deriveStats(hero.level, EMPTY_GEAR, [], meta);
  return {
    x: at.x, y: at.y, r: P.radius, vx: 0, vy: 0, hp: stats.maxHp, maxHp: stats.maxHp, face: -Math.PI / 2, moving: false,
    stats, level: hero.level, xp: hero.xp, gear: { ...EMPTY_GEAR }, meta, fe: stats.maxFe,
    swing: null, cooldown: 0, buffer: 0, bufferAim: null, invuln: 0, flash: 0,
    dodge: 0, dodgeCd: 0, dodgeDir: 0, dodgeBuffer: 0, dodgeSerial: 0, skillCd: 0, skillBuffer: 0, spin: 0,
  };
}

function emptyWorld(room: Room, seed: number, totalRooms: number, meta: MetaLevels, hero: Hero): World {
  const cells = room.cols * room.rows;
  return {
    room, depth: 0, totalRooms, phase: 'fight', phaseTimer: 0, offer: null, upgrades: [],
    player: createPlayer(room.playerSpawn, meta, hero),
    enemies: [], projectiles: [], particles: [], corpses: [], floaters: [], loot: [], lastLoot: null,
    time: 0, hitstop: 0, shake: 0, outcome: null, outcomeTimer: 0,
    rng: mulberry32(seed), serial: 0, nextId: 1,
    flowDist: new Int16Array(cells), flowQueue: new Int32Array(cells), flowTile: -1,
    stats: { kills: 0, damageTaken: 0, roomsCleared: 0, xpGained: 0, levelsGained: 0 },
    runAshes: 0,
    rewarded: 0,
    waves: [],
  };
}

/** Sala avulsa (vence ao limpar): testes e fundo do menu. Inimigos nos pontos 'E', na ordem. */
export function createWorld(room: Room, seed: number, kinds: EnemyKind[] = ['penitent']): World {
  const w = emptyWorld(room, seed, 1, NO_META, { level: 1, xp: 0 });
  room.enemySpawns.forEach((at, i) => spawnEnemy(w, kinds[i % kinds.length], at));
  return w;
}

/** Incursão completa: salas em sequência (CONFIG.run.encounters) terminando no chefe. */
export function createRun(seed: number, meta: MetaLevels = NO_META, hero: Hero = { level: 1, xp: 0 }): World {
  const w = emptyWorld(START_ROOM, seed, CONFIG.run.encounters.length, meta, hero);
  enterRoom(w, 0);
  return w;
}

/** Cria um inimigo; vida escala com a profundidade da sala. `spawn` > 0 = surgindo de uma onda. */
export function spawnEnemy(w: World, kind: EnemyKind, at: Point, spawn = 0): Enemy {
  const d = CONFIG.enemies[kind], hp = Math.round(d.hp * (1 + CONFIG.run.hpPerDepth * w.depth));
  const e: Enemy = {
    id: w.nextId++, kind, x: at.x, y: at.y, r: d.radius, vx: 0, vy: 0, hp, maxHp: hp,
    state: d.boss || spawn > 0 ? 'chase' : 'idle', t: 0, face: Math.PI / 2, aim: 0, moving: false,
    attack: 0, next: 0, cd: d.boss ? 1 : 0, phase: 1, struck: false, flash: 0, lastSwing: -1, lastDodge: -1, spawn,
  };
  w.enemies.push(e);
  return e;
}

/** Recalcula os atributos; ganhos de vida máxima também curam a diferença. */
export function recomputeStats(w: World): void {
  const p = w.player;
  p.stats = deriveStats(p.level, p.gear, w.upgrades, p.meta);
  const delta = p.stats.maxHp - p.maxHp;
  p.maxHp = p.stats.maxHp;
  if (delta > 0 && p.hp > 0) p.hp += delta;
  p.hp = Math.min(p.hp, p.maxHp);
  p.fe = Math.min(p.fe, p.stats.maxFe);
}

export function gainXp(w: World, amount: number): void {
  const p = w.player;
  w.stats.xpGained += amount;
  if (p.level >= CONFIG.levels.max) return;
  p.xp += amount;
  while (p.level < CONFIG.levels.max && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    w.stats.levelsGained++;
    recomputeStats(w);
    if (p.hp > 0) heal(w, Math.round(p.maxHp * CONFIG.levels.heal));
    floater(w, p.x, p.y, `Nível ${p.level}!`, 'info', 95);
    burst(w, p.x, p.y, 0, 20, 'holy', Math.PI * 2);
  }
  if (p.level >= CONFIG.levels.max) p.xp = 0;
}

/** Entra na sala `depth` da incursão (também usado pelo atalho de depuração `?debug`). */
export function enterRoom(w: World, depth: number): void {
  const last = depth === w.totalRooms - 1;
  let room = depth === 0 ? START_ROOM : last ? BOSS_ROOM : ROOM_POOL[Math.floor(w.rng() * ROOM_POOL.length)];
  // Evita repetir a mesma sala intermediária em seguida.
  if (!last && depth > 0 && room === w.room) room = ROOM_POOL[(ROOM_POOL.indexOf(room) + 1) % ROOM_POOL.length];
  w.room = room;
  w.depth = depth;
  w.phase = 'fight';
  w.offer = null;
  w.enemies = [];
  w.projectiles = [];
  w.particles = [];
  w.corpses = [];
  w.floaters = [];
  w.loot = [];
  w.flowTile = -1;
  const p = w.player;
  p.x = room.playerSpawn.x;
  p.y = room.playerSpawn.y;
  p.vx = p.vy = 0;
  p.swing = null;
  p.dodge = 0;
  p.face = -Math.PI / 2;
  const options = CONFIG.run.encounters[depth];
  const waves = options[Math.floor(w.rng() * options.length)].map((wave) => wave.slice());
  const spots = shuffle(room.enemySpawns.slice(), w.rng);
  waves[0].forEach((kind, i) => spawnEnemy(w, kind, spots[i % spots.length]));
  w.waves = waves.slice(1);
}

/** Próxima onda: surge nos pontos mais longe do jogador, com aviso. */
function spawnWave(w: World): void {
  const p = w.player, kinds = w.waves.shift()!;
  const spots = w.room.enemySpawns.slice().sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
  kinds.forEach((kind, i) => {
    const at = spots[i % Math.max(1, Math.min(spots.length, 4))];
    spawnEnemy(w, kind, at, CONFIG.run.spawnTime);
    burst(w, at.x, at.y, -Math.PI / 2, 16, 'blood', Math.PI * 2);
  });
  floater(w, p.x, p.y, 'Uma nova onda surge!', 'info', 100);
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Aplica a bênção escolhida e abre a porta da sala. */
export function chooseUpgrade(w: World, id: UpgradeId): void {
  if (!w.offer?.includes(id)) return;
  w.upgrades.push(id);
  recomputeStats(w);
  w.offer = null;
  w.phase = 'exit';
}

function rollOffer(w: World): UpgradeId[] {
  const pool = (Object.keys(UPGRADES) as UpgradeId[]).filter((id) => UPGRADES[id].stack || !w.upgrades.includes(id));
  return shuffle(pool, w.rng).slice(0, 3);
}

/** Pega o equipamento: equipa se for melhor que o atual, senão converte em cinzas. */
export function pickUp(w: World, loot: Loot): void {
  const p = w.player, item = loot.item;
  const better = itemPower(item) > itemPower(p.gear[item.slot]);
  let ashes = 0;
  if (better) {
    p.gear[item.slot] = item;
    recomputeStats(w);
  } else {
    ashes = RARITY[item.rarity].ashes;
    w.runAshes += ashes;
  }
  w.lastLoot = { item, equipped: better, ashes, time: w.time };
  floater(w, p.x, p.y, better ? item.name : `+${ashes} cinzas`, 'info', 90);
  burst(w, loot.x, loot.y, -Math.PI / 2, 10, 'holy', Math.PI * 2);
  w.loot.splice(w.loot.indexOf(loot), 1);
}

/** Jogador encostado na porta aberta da parede do fundo? */
export function atDoor(w: World): boolean {
  const T = CONFIG.tile, p = w.player, mid = CONFIG.view.w / 2;
  return w.phase === 'exit' && Math.abs(p.x - mid) <= T && p.y - p.r <= 3 * T + 2;
}

export function stepWorld(w: World, input: InputState, dt: number): void {
  const p = w.player;
  // Guarda os comandos antes do hitstop, para não perder entradas durante a pausa de impacto.
  if (input.attack) {
    p.buffer = P.attack.buffer;
    p.bufferAim = input.aimAt ? Math.atan2(input.aimAt.y - p.y, input.aimAt.x - p.x) : null;
  }
  if (input.dodge) p.dodgeBuffer = P.dodge.buffer;
  if (input.skill) p.skillBuffer = P.dodge.buffer;
  if (w.hitstop > 0) {
    w.hitstop = Math.max(0, w.hitstop - dt);
    return;
  }
  w.time += dt;
  w.shake = Math.max(0, w.shake - dt * 30);
  updateParticles(w, dt);
  if (w.outcome) {
    w.outcomeTimer -= dt;
    return;
  }
  updatePlayer(w, input, dt);
  updateFlowField(w);
  for (const e of w.enemies) updateEnemy(w, e, dt);
  updateProjectiles(w, dt);
  if (w.enemies.some((e) => e.hp <= 0)) {
    for (const e of w.enemies) if (e.hp <= 0) rewardKill(w, e);
    w.enemies = w.enemies.filter((e) => e.hp > 0);
  }
  separateBodies(w);
  for (const l of w.loot) l.t += dt;
  const near = w.loot.find((l) => Math.hypot(l.x - p.x, l.y - p.y) <= CONFIG.pickupRadius + p.r);
  if (near && p.hp > 0) pickUp(w, near);

  if (w.phase === 'fight' && w.enemies.length === 0 && w.waves.length && !w.outcome) {
    spawnWave(w);
  } else if (w.phase === 'fight' && w.enemies.length === 0 && !w.outcome) {
    w.stats.roomsCleared++;
    w.projectiles = [];
    if (w.depth >= w.totalRooms - 1) {
      w.outcome = 'victory';
      w.outcomeTimer = CONFIG.victoryDelay;
    } else {
      w.phase = 'reward';
      w.phaseTimer = CONFIG.rewardDelay;
    }
  } else if (w.phase === 'reward' && !w.offer) {
    w.phaseTimer -= dt;
    if (w.phaseTimer <= 0) w.offer = rollOffer(w);
  } else if (atDoor(w)) {
    enterRoom(w, w.depth + 1);
  }
}

function updatePlayer(w: World, input: InputState, dt: number): void {
  const p = w.player, s = p.stats, a = P.attack;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  p.dodgeBuffer = Math.max(0, p.dodgeBuffer - dt);
  p.skillCd = Math.max(0, p.skillCd - dt);
  p.skillBuffer = Math.max(0, p.skillBuffer - dt);
  p.spin = Math.max(0, p.spin - dt);
  p.fe = Math.min(s.maxFe, p.fe + s.feRegen * dt);
  p.moving = input.moveX !== 0 || input.moveY !== 0;

  if (p.dodge > 0) {
    p.dodge = Math.max(0, p.dodge - dt);
    moveAndCollide(w.room, p, (Math.cos(p.dodgeDir) * P.dodge.speed + p.vx) * dt, (Math.sin(p.dodgeDir) * P.dodge.speed + p.vy) * dt);
    damp(p, dt);
    if (w.upgrades.includes('shadowStep')) {
      for (const e of w.enemies) {
        if (e.lastDodge !== p.dodgeSerial && Math.hypot(e.x - p.x, e.y - p.y) <= e.r + p.r + 6) {
          e.lastDodge = p.dodgeSerial;
          damageEnemy(w, e, CONFIG.shadowStepDamage, p.dodgeDir, 120);
        }
      }
    }
    return;
  }
  if (p.dodgeBuffer > 0 && p.dodgeCd === 0) {
    p.dodgeDir = p.moving ? Math.atan2(input.moveY, input.moveX) : p.face;
    p.face = p.dodgeDir;
    p.dodge = P.dodge.duration;
    p.dodgeCd = P.dodge.duration + s.dodgeCooldown;
    p.dodgeBuffer = 0;
    p.dodgeSerial++;
    p.swing = null;
    burst(w, p.x, p.y + p.r, p.dodgeDir + Math.PI, 6, 'spark');
    return;
  }
  if (p.skillBuffer > 0 && p.skillCd === 0 && p.fe >= P.skill.cost) castSkill(w);

  if (p.buffer > 0 && p.cooldown === 0 && !p.swing) {
    const dir = p.bufferAim ?? (p.moving ? Math.atan2(input.moveY, input.moveX) : p.face);
    p.swing = { t: 0, dir, serial: ++w.serial };
    p.face = dir;
    p.cooldown = s.cooldown;
    p.buffer = 0;
    p.bufferAim = null;
    if (w.upgrades.includes('holyWave')) {
      const hw = CONFIG.holyWave;
      spawnProjectile(w, p.x + Math.cos(dir) * 12, p.y + Math.sin(dir) * 12, dir, hw.speed, 'wave', hw.damage, false);
    }
  } else if (!p.swing && p.moving) {
    p.face = Math.atan2(input.moveY, input.moveX);
  }

  const speed = P.speed * (p.swing ? P.swingMoveFactor : 1);
  moveAndCollide(w.room, p, (input.moveX * speed + p.vx) * dt, (input.moveY * speed + p.vy) * dt);
  damp(p, dt);

  const sw = p.swing;
  if (sw) {
    sw.t += dt;
    if (sw.t >= a.windup && sw.t <= a.windup + a.active) swingHits(w, sw);
    if (sw.t >= a.windup + a.active + a.trail) p.swing = null;
  }
}

/** Recompensa de cada abate: experiência, chance de equipamento e a bênção Cálice de Sangue. */
function rewardKill(w: World, e: Enemy): void {
  const def = CONFIG.enemies[e.kind];
  w.rewarded++;
  gainXp(w, def.xp);
  if (w.rng() < def.drop) w.loot.push({ x: e.x, y: e.y, item: rollItem(w.rng, w.depth, def.dropMin), t: 0 });
  if (w.upgrades.includes('lifesteal') && w.rewarded % CONFIG.lifestealEvery === 0) heal(w, CONFIG.lifestealHeal);
}

/** Ira Flamejante: giro de fogo que fere e empurra todos ao redor e queima projéteis inimigos. */
function castSkill(w: World): void {
  const p = w.player, sk = P.skill;
  p.fe -= sk.cost;
  p.skillCd = p.stats.skillCooldown;
  p.skillBuffer = 0;
  p.spin = sk.duration;
  p.swing = null;
  for (const e of w.enemies) {
    if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= sk.radius + e.r) {
      const crit = w.rng() < p.stats.critChance;
      damageEnemy(w, e, Math.round(p.stats.skillDamage * (crit ? P.critMult : 1)), Math.atan2(e.y - p.y, e.x - p.x), sk.knockback, crit);
    }
  }
  w.projectiles = w.projectiles.filter((q) => !q.hostile || Math.hypot(q.x - p.x, q.y - p.y) > sk.radius);
  burst(w, p.x, p.y, 0, 30, 'ember', Math.PI * 2);
  w.shake = Math.max(w.shake, 4);
}

function swingHits(w: World, sw: Swing): void {
  const p = w.player, s = p.stats;
  for (const e of w.enemies) {
    if (e.lastSwing === sw.serial || e.hp <= 0 || !inSector(p.x, p.y, sw.dir, s.range, s.arc, e.x, e.y, e.r)) continue;
    e.lastSwing = sw.serial;
    const crit = w.rng() < s.critChance;
    damageEnemy(w, e, Math.round(s.damage * (crit ? P.critMult : 1)), sw.dir, P.attack.knockback, crit);
    p.fe = Math.min(s.maxFe, p.fe + P.fe.perHit);
  }
  // O golpe também rebate (Auréola Partida) ou destrói projéteis inimigos.
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i];
    if (!q.hostile || !inSector(p.x, p.y, sw.dir, s.range, s.arc, q.x, q.y, q.r)) continue;
    burst(w, q.x, q.y, sw.dir, 4, 'spark');
    if (w.upgrades.includes('deflect')) {
      const sp = Math.hypot(q.vx, q.vy) * 1.4;
      q.vx = Math.cos(sw.dir) * sp;
      q.vy = Math.sin(sw.dir) * sp;
      q.hostile = false;
      q.life = 2;
    } else removeAt(w.projectiles, i);
  }
}

function updateProjectiles(w: World, dt: number): void {
  const p = w.player;
  for (let i = w.projectiles.length - 1; i >= 0; i--) {
    const q = w.projectiles[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
    let dead = q.life <= 0 || solidAtPoint(w.room, q.x, q.y);
    if (!dead && q.hostile) {
      // Durante a invulnerabilidade o projétil atravessa o jogador.
      if (Math.hypot(q.x - p.x, q.y - p.y) <= q.r + p.r && hurtPlayer(w, q.damage, q.x - q.vx, q.y - q.vy)) dead = true;
    } else if (!dead) {
      for (const e of w.enemies) {
        if (e.hp > 0 && Math.hypot(q.x - e.x, q.y - e.y) <= q.r + e.r) {
          damageEnemy(w, e, q.kind === 'wave' ? Math.round(q.damage * (p.stats.damage / P.attack.damage)) : q.damage, Math.atan2(q.vy, q.vx), 150);
          dead = true;
          break;
        }
      }
    }
    if (dead) {
      burst(w, q.x, q.y, Math.atan2(-q.vy, -q.vx), 4, q.hostile ? 'blood' : 'holy');
      removeAt(w.projectiles, i);
    }
  }
}

function removeAt<T>(list: T[], i: number): void {
  list[i] = list[list.length - 1];
  list.pop();
}

function updateFlowField(w: World): void {
  const T = CONFIG.tile, p = w.player;
  const tile = Math.floor(p.y / T) * w.room.cols + Math.floor(p.x / T);
  if (tile === w.flowTile) return;
  w.flowTile = tile;
  computeFlowField(w.room, p.x, p.y, w.flowDist, w.flowQueue);
}

/** Empurra corpos sobrepostos. O jogador atravessa inimigos durante a esquiva. */
function separateBodies(w: World): void {
  const n = w.enemies.length;
  for (let i = w.player.dodge > 0 ? 0 : -1; i < n; i++) {
    const a = i < 0 ? w.player : w.enemies[i];
    for (let j = i + 1; j < n; j++) {
      const b = w.enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min) continue;
      const nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0, push = (min - d) / 2;
      moveAndCollide(w.room, a, -nx * push, -ny * push);
      moveAndCollide(w.room, b, nx * push, ny * push);
    }
  }
}

function damp(b: { vx: number; vy: number }, dt: number): void {
  const k = Math.exp(-CONFIG.damping * dt);
  b.vx = Math.abs(b.vx * k) < 1 ? 0 : b.vx * k;
  b.vy = Math.abs(b.vy * k) < 1 ? 0 : b.vy * k;
}

function updateParticles(w: World, dt: number): void {
  for (const c of w.corpses) c.t += dt;
  if (w.corpses.length && w.corpses[0].t >= CORPSE_TIME) w.corpses = w.corpses.filter((c) => c.t < CORPSE_TIME);
  for (const f of w.floaters) f.t += dt;
  if (w.floaters.length && w.floaters[0].t >= FLOATER_TIME) w.floaters = w.floaters.filter((f) => f.t < FLOATER_TIME);
  // Braseiros soltam brasas que sobem (atmosfera; deixam espaço para as partículas de combate).
  for (const b of w.room.braziers) {
    if (w.particles.length < CONFIG.maxParticles - 40 && w.rng() < dt * 7) {
      const life = 1.2 + w.rng() * 1.2;
      w.particles.push({
        x: b.x + (w.rng() - 0.5) * 14, y: b.y + (w.rng() - 0.5) * 14, z: 46, vx: (w.rng() - 0.5) * 18, vy: (w.rng() - 0.5) * 18,
        vz: 30 + w.rng() * 40, life, max: life, size: 1.5 + w.rng() * 1.5, kind: 'ember',
      });
    }
  }
  const k = Math.exp(-5 * dt);
  for (let i = w.particles.length - 1; i >= 0; i--) {
    const q = w.particles[i];
    q.life -= dt;
    if (q.life <= 0) {
      removeAt(w.particles, i);
      continue;
    }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    if (q.kind === 'ember') {
      q.vz += 10 * dt;
    } else {
      q.vz -= 420 * dt;
      if (q.z <= 0) {
        q.z = 0;
        q.vz = 0;
        q.vx *= 0.5;
        q.vy *= 0.5;
      }
      q.vx *= k;
      q.vy *= k;
    }
  }
}
