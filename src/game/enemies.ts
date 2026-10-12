import { CONFIG, type AttackDef, type EnemyDef } from './config.ts';
import { burst, hurtPlayer, setState, spawnProjectile } from './combat.ts';
import { inSector } from './math.ts';
import { clearPath, flowAngle, moveAndCollide } from './room.ts';
import type { Enemy, World } from './world.ts';

/** Área de perigo de um ataque (a mesma usada para desenhar o aviso e para aplicar o dano). */
export type Danger =
  | { shape: 'sector'; x: number; y: number; dir: number; radius: number; arc: number }
  | { shape: 'lane'; x: number; y: number; dir: number; length: number; width: number }
  | { shape: 'circle'; x: number; y: number; radius: number };

/** Preparação de investidas/projéteis acompanha o alvo até esta fração e depois trava. */
const TRACK_UNTIL = 0.4;

export function currentAttack(e: Enemy): AttackDef {
  return CONFIG.enemies[e.kind].attacks[e.attack];
}

/** Duração efetiva da preparação (o chefe acelera na fase 2). */
export function windupTime(e: Enemy): number {
  return currentAttack(e).windup / (e.phase === 2 ? CONFIG.bossPhase2Speed : 1);
}

export function volleyCount(e: Enemy, count: number): number {
  return count + (e.phase === 2 ? 2 : 0);
}

/** Áreas de perigo ativas (preparação ou ataque em curso); vazio fora disso. */
export function dangers(e: Enemy): Danger[] {
  if (e.state !== 'windup' && e.state !== 'act') return [];
  const a = currentAttack(e);
  switch (a.kind) {
    case 'sweep':
      return [{ shape: 'sector', x: e.x, y: e.y, dir: e.aim, radius: a.reach, arc: a.arc }];
    case 'charge':
      if (e.state === 'act') return [{ shape: 'circle', x: e.x, y: e.y, radius: e.r + 6 }];
      return [{ shape: 'lane', x: e.x, y: e.y, dir: e.aim, length: a.speed * a.duration + e.r, width: e.r * 2 + 8 }];
    case 'volley': {
      if (e.state === 'act') return [];
      const n = volleyCount(e, a.count);
      return Array.from({ length: n }, (_, i) => ({
        shape: 'lane' as const, x: e.x, y: e.y, dir: n > 1 ? e.aim - a.spread / 2 + (a.spread * i) / (n - 1) : e.aim,
        length: a.range === 9999 ? 700 : a.range, width: 14,
      }));
    }
    case 'slam':
      return [{ shape: 'circle', x: e.x, y: e.y, radius: a.radius }];
  }
}

export function inDanger(d: Danger, x: number, y: number, r: number): boolean {
  switch (d.shape) {
    case 'sector':
      return inSector(d.x, d.y, d.dir, d.radius, d.arc, x, y, r);
    case 'circle':
      return Math.hypot(x - d.x, y - d.y) <= d.radius + r;
    case 'lane': {
      const ux = Math.cos(d.dir), uy = Math.sin(d.dir), dx = x - d.x, dy = y - d.y;
      const along = dx * ux + dy * uy, across = Math.abs(dx * uy - dy * ux);
      return along >= -r && along <= d.length + r && across <= d.width / 2 + r;
    }
  }
}

/** Dano do ataque já escalado pela profundidade da sala. */
function scaled(w: World, dmg: number): number {
  return Math.round(dmg * (1 + CONFIG.run.damagePerDepth * w.depth));
}

export function updateEnemy(w: World, e: Enemy, dt: number): void {
  const def = CONFIG.enemies[e.kind], p = w.player;
  if (e.spawn > 0) {
    e.spawn = Math.max(0, e.spawn - dt); // surgindo: parado e intocável
    e.face = Math.atan2(p.y - e.y, p.x - e.x);
    return;
  }
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.cd = Math.max(0, e.cd - dt);
  const dist = Math.hypot(p.x - e.x, p.y - e.y), toPlayer = Math.atan2(p.y - e.y, p.x - e.x);
  const atk = currentAttack(e);
  let speed = 0, dir = 0;

  switch (e.state) {
    case 'idle':
      if (dist < def.aggroRange && clearPath(w.room, e.x, e.y, p.x, p.y, 0)) setState(e, 'chase');
      break;
    case 'stagger':
      if (e.t >= def.stagger) setState(e, 'chase');
      break;
    case 'stun':
      if (e.t >= (atk.kind === 'charge' ? atk.stun : 1)) setState(e, 'chase');
      break;
    case 'recover':
      if (e.t >= atk.recover) {
        setState(e, 'chase');
        e.cd = def.cooldown;
      }
      break;
    case 'chase': {
      e.face = toPlayer;
      const los = clearPath(w.room, e.x, e.y, p.x, p.y, 0);
      const pick = e.cd > 0 ? -1 : pickAttack(w, e, def, dist, los, p.r);
      if (pick >= 0) {
        e.attack = pick;
        setState(e, 'windup');
        e.aim = e.face = toPlayer;
        e.struck = false;
        break;
      }
      if (def.keepAway > 0 && dist < def.keepAway && los) {
        dir = toPlayer + Math.PI; // recua para manter distância
        speed = def.speed;
      } else if (dist > def.keepAway + 8 || !los) {
        dir = clearPath(w.room, e.x, e.y, p.x, p.y, e.r) ? toPlayer : flowAngle(w.room, w.flowDist, e.x, e.y);
        speed = Number.isNaN(dir) ? 0 : def.speed * (e.phase === 2 ? 1.2 : 1);
      }
      break;
    }
    case 'windup':
      if (atk.kind !== 'sweep' && e.t < windupTime(e) * TRACK_UNTIL) e.aim = toPlayer;
      e.face = e.aim;
      if (e.t >= windupTime(e)) {
        setState(e, 'act');
        startAct(w, e, atk);
      }
      break;
    case 'act':
      switch (atk.kind) {
        case 'sweep':
          if (!e.struck && inSector(e.x, e.y, e.aim, atk.reach, atk.arc, p.x, p.y, p.r)) {
            e.struck = true;
            hurtPlayer(w, scaled(w, atk.damage), e.x, e.y);
          }
          if (e.t >= atk.active) setState(e, 'recover');
          break;
        case 'charge':
          speed = atk.speed;
          dir = e.aim;
          if (!e.struck && dist <= e.r + p.r + 4 && hurtPlayer(w, scaled(w, atk.damage), e.x, e.y)) e.struck = true;
          if (e.t >= atk.duration) setState(e, 'recover');
          break;
        case 'volley':
          setState(e, 'recover');
          break;
        case 'slam':
          if (e.t >= 0.15) setState(e, 'recover');
          break;
      }
      break;
  }

  e.moving = speed > 0;
  const hitWall = moveAndCollide(w.room, e, (Math.cos(dir) * speed + e.vx) * dt, (Math.sin(dir) * speed + e.vy) * dt);
  // Investida que bate na parede deixa o inimigo atordoado: janela de contra-ataque.
  if (hitWall && e.state === 'act' && atk.kind === 'charge') {
    setState(e, 'stun');
    w.shake = Math.max(w.shake, 5);
    burst(w, e.x, e.y, e.aim + Math.PI, 10, 'spark');
  }
  const k = Math.exp(-CONFIG.damping * dt);
  e.vx = Math.abs(e.vx * k) < 1 ? 0 : e.vx * k;
  e.vy = Math.abs(e.vy * k) < 1 ? 0 : e.vy * k;
}

/**
 * Próximo ataque utilizável (o chefe alterna em ciclo); -1 se nenhum.
 * Investidas exigem caminho livre para o corpo inteiro: sem isso o inimigo batia na coluna à frente
 * e ficava num ciclo de investida e atordoamento.
 */
function pickAttack(w: World, e: Enemy, def: EnemyDef, dist: number, los: boolean, playerR: number): number {
  const n = def.attacks.length, p = w.player;
  for (let k = 0; k < n; k++) {
    const i = (e.next + k) % n, a = def.attacks[i];
    const clear = a.kind === 'slam' || (a.kind === 'charge' ? clearPath(w.room, e.x, e.y, p.x, p.y, e.r) : los);
    if (dist <= a.range + playerR && clear) {
      e.next = (i + 1) % n;
      return i;
    }
  }
  return -1;
}

function startAct(w: World, e: Enemy, atk: AttackDef): void {
  if (atk.kind === 'volley') {
    const n = volleyCount(e, atk.count);
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? e.aim - atk.spread / 2 + (atk.spread * i) / (n - 1) : e.aim;
      spawnProjectile(w, e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, a, atk.speed, atk.projectile, scaled(w, atk.damage), true);
    }
  } else if (atk.kind === 'slam') {
    const p = w.player;
    if (Math.hypot(p.x - e.x, p.y - e.y) <= atk.radius + p.r) hurtPlayer(w, scaled(w, atk.damage), e.x, e.y);
    w.shake = Math.max(w.shake, 7);
    burst(w, e.x, e.y, 0, 24, 'spark', Math.PI * 2);
  }
}
