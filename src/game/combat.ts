import { CONFIG } from './config.ts';
import type { Enemy, EnemyState, FloaterKind, ParticleKind, ProjectileKind, World } from './world.ts';

export function floater(w: World, x: number, y: number, text: string, kind: FloaterKind, z = 70): void {
  if (w.floaters.length < 40) w.floaters.push({ x, y, z, text, t: 0, kind });
}

export function setState(e: Enemy, state: EnemyState): void {
  e.state = state;
  e.t = 0;
}

/** Partículas em leque ao redor de `dir` (spread em radianos; TAU = todas as direções). */
export function burst(w: World, x: number, y: number, dir: number, n: number, kind: ParticleKind, spread = 1.8): void {
  for (let i = 0; i < n && w.particles.length < CONFIG.maxParticles; i++) {
    const a = dir + (w.rng() - 0.5) * spread, s = 60 + w.rng() * 160, life = 0.35 + w.rng() * 0.5;
    w.particles.push({
      x, y, z: 22 + w.rng() * 16, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 40 + w.rng() * 120,
      life, max: life, size: 1.5 + w.rng() * 2.5, kind,
    });
  }
}

export function spawnProjectile(
  w: World, x: number, y: number, dir: number, speed: number,
  kind: ProjectileKind, damage: number, hostile: boolean,
): void {
  const wave = kind === 'wave';
  w.projectiles.push({
    x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
    r: wave ? CONFIG.holyWave.radius : 6, life: wave ? CONFIG.holyWave.life : 3, damage, kind, hostile,
  });
}

/** Aplica dano; a recompensa do abate (experiência, saque) é processada em world.ts. */
export function damageEnemy(w: World, e: Enemy, dmg: number, dir: number, knock: number = CONFIG.player.attack.knockback, crit = false): void {
  if (e.hp <= 0 || e.spawn > 0) return;
  const def = CONFIG.enemies[e.kind];
  e.hp -= dmg;
  e.flash = 0.12;
  floater(w, e.x, e.y, crit ? `${dmg}!` : String(dmg), crit ? 'crit' : 'dmg', 60 + e.r * 2);
  // Durante preparação/ataque o inimigo não é interrompido: o jogador precisa respeitar o aviso.
  const armored = e.state === 'windup' || e.state === 'act';
  const kb = knock * def.knockback * (armored ? 0.25 : 1);
  e.vx += Math.cos(dir) * kb;
  e.vy += Math.sin(dir) * kb;
  if (!armored && e.state !== 'stun') {
    if (def.stagger > 0) setState(e, 'stagger');
    else if (e.state === 'idle') setState(e, 'chase');
  }
  w.hitstop = Math.max(w.hitstop, CONFIG.hitstop);
  w.shake = Math.max(w.shake, 2);
  burst(w, e.x, e.y, dir, 6, 'spark');
  if (def.boss && e.phase === 1 && e.hp > 0 && e.hp <= def.hp * CONFIG.bossPhase2) {
    e.phase = 2;
    w.shake = 8;
    burst(w, e.x, e.y, 0, 24, 'blood', Math.PI * 2);
  }
  if (e.hp <= 0) {
    w.corpses.push({ kind: e.kind, x: e.x, y: e.y, r: e.r, face: e.face, t: 0 });
    burst(w, e.x, e.y, dir, 18, 'bone');
  }
}

export function heal(w: World, amount: number): void {
  const p = w.player;
  if (p.hp <= 0) return;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  burst(w, p.x, p.y, -Math.PI / 2, 8, 'holy', Math.PI * 2);
  floater(w, p.x, p.y, `+${amount}`, 'heal');
}

/** Retorna true se o dano foi aplicado (false durante invulnerabilidade/esquiva). A armadura reduz o dano. */
export function hurtPlayer(w: World, rawDmg: number, fromX: number, fromY: number): boolean {
  const p = w.player;
  if (p.invuln > 0 || p.dodge > 0 || p.hp <= 0 || w.outcome) return false;
  const dmg = Math.max(1, Math.round(rawDmg * (1 - p.stats.armorPct)));
  p.hp = Math.max(0, p.hp - dmg);
  w.stats.damageTaken += dmg;
  floater(w, p.x, p.y, `-${dmg}`, 'hurt');
  p.invuln = CONFIG.player.iframes;
  p.flash = 0.25;
  const a = Math.atan2(p.y - fromY, p.x - fromX);
  p.vx += Math.cos(a) * CONFIG.player.hurtKnockback;
  p.vy += Math.sin(a) * CONFIG.player.hurtKnockback;
  w.shake = 6;
  w.hitstop = 0.08;
  burst(w, p.x, p.y, a, 10, 'blood');
  if (w.upgrades.includes('thorns')) {
    for (const e of w.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) <= CONFIG.thorns.radius + e.r) {
        damageEnemy(w, e, CONFIG.thorns.damage, Math.atan2(e.y - p.y, e.x - p.x));
      }
    }
  }
  if (p.hp === 0) {
    w.outcome = 'defeat';
    w.outcomeTimer = CONFIG.defeatDelay;
    p.swing = null;
  }
  return true;
}
