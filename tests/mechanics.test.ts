import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageEnemy, hurtPlayer, spawnProjectile } from '../src/game/combat.ts';
import { CONFIG, type ChargeAttack, type VolleyAttack } from '../src/game/config.ts';
import { dangers, inDanger } from '../src/game/enemies.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { chooseUpgrade, createWorld, spawnEnemy, stepWorld, type World } from '../src/game/world.ts';
import { STEP, idle, run } from './helpers.ts';

/** Mundo com só o inimigo pedido, em (ex, ey), e o jogador no centro. */
function arena(kind: 'penitent' | 'acolyte' | 'brute' | 'angel', ex: number, ey = 300): World {
  const w = createWorld(FIRST_ROOM, 3);
  w.enemies = [];
  w.player.x = 480; w.player.y = 300;
  const e = spawnEnemy(w, kind, { x: ex, y: ey });
  e.state = 'chase';
  w.player.stats.critChance = 0;
  return w;
}

test('Acólito mantém distância e dispara um projétil que fere o jogador', () => {
  const w = arena('acolyte', 600);
  run(w, 3);
  assert.ok(Math.hypot(w.enemies[0].x - w.player.x, w.enemies[0].y - w.player.y) >= CONFIG.enemies.acolyte.keepAway - 30);
  const volley = CONFIG.enemies.acolyte.attacks[0] as VolleyAttack;
  assert.ok(w.player.hp < w.player.maxHp, 'projétil não acertou o jogador parado');
  assert.ok(w.stats.damageTaken % volley.damage === 0);
});

test('golpe destrói projétil inimigo; com Auréola Partida ele volta e fere o inimigo', () => {
  for (const deflect of [false, true]) {
    const w = arena('penitent', 900, 100);
    w.enemies[0].state = 'idle';
    if (deflect) w.upgrades.push('deflect');
    spawnProjectile(w, 525, 300, Math.PI, 60, 'ember', 1, true); // vindo devagar na direção do jogador
    stepWorld(w, { ...idle(), attack: true, aimAt: { x: 600, y: 300 } }, STEP);
    run(w, 0.2);
    const q = w.projectiles[0];
    if (deflect) assert.ok(q && !q.hostile && q.vx > 0, 'não foi rebatido');
    else assert.equal(w.projectiles.length, 0, 'não foi destruído');
    assert.equal(w.player.hp, w.player.maxHp);
  }
});

test('Flagelante: preparação mostra a faixa da investida; ao bater na parede fica atordoado', () => {
  const w = arena('brute', 700);
  w.player.x = 900; // o bruto investe para a direita, rumo à parede leste
  run(w, 0.1);
  const e = w.enemies[0];
  assert.equal(e.state, 'windup');
  const lane = dangers(e)[0];
  assert.equal(lane.shape, 'lane');
  assert.ok(inDanger(lane, w.player.x, w.player.y, w.player.r));
  w.player.y = 450; // sai da faixa
  const charge = CONFIG.enemies.brute.attacks[0] as ChargeAttack;
  run(w, charge.windup + charge.duration);
  assert.equal(e.state, 'stun');
  assert.equal(w.player.hp, w.player.maxHp);
});

test('chefe entra na fase 2 abaixo de metade da vida e lança mais penas', () => {
  const w = arena('angel', 600);
  const boss = w.enemies[0];
  damageEnemy(w, boss, Math.ceil(boss.maxHp * (1 - CONFIG.bossPhase2)) + 1, 0);
  assert.equal(boss.phase, 2);
  const feathers = CONFIG.enemies.angel.attacks[1] as VolleyAttack;
  boss.attack = 1;
  boss.state = 'windup';
  boss.t = 0;
  boss.aim = Math.PI;
  run(w, feathers.windup);
  assert.equal(w.projectiles.filter((q) => q.kind === 'feather').length, feathers.count + 2);
});

test('bênçãos alteram o jogo', () => {
  const w = arena('penitent', 900, 100);
  w.enemies[0].state = 'idle';
  const base = { ...w.player.stats }, hp = w.player.maxHp;
  for (const id of ['vigor', 'reach', 'swift'] as const) {
    w.offer = [id];
    chooseUpgrade(w, id);
  }
  assert.equal(w.player.maxHp, hp + CONFIG.vigorHp);
  assert.ok(w.player.stats.range > base.range && w.player.stats.cooldown < base.cooldown);
  assert.equal(w.phase, 'exit');

  // Lâmina Sagrada: o golpe lança uma onda amiga.
  w.upgrades.push('holyWave');
  stepWorld(w, { ...idle(), attack: true, aimAt: { x: 900, y: 300 } }, STEP);
  run(w, 0.05);
  assert.ok(w.projectiles.some((q) => q.kind === 'wave' && !q.hostile));

  // Coroa de Espinhos: sofrer dano fere quem está perto.
  const near = spawnEnemy(w, 'penitent', { x: 520, y: 300 });
  w.upgrades.push('thorns');
  w.player.invuln = 0;
  hurtPlayer(w, 1, 520, 300);
  assert.ok(near.hp < near.maxHp);
});

test('Sangue por Sangue cura a cada 3 abates; Passo Sombrio fere ao atravessar', () => {
  const w = arena('penitent', 900, 100);
  w.upgrades.push('lifesteal');
  w.player.hp = 1;
  for (let i = 0; i < CONFIG.lifestealEvery; i++) {
    const e = spawnEnemy(w, 'penitent', { x: 600 + i * 40, y: 400 });
    damageEnemy(w, e, 999, 0);
  }
  run(w, 0.15); // recompensas de abate são processadas no passo, depois do hitstop
  assert.equal(w.player.hp, 1 + CONFIG.lifestealHeal);

  const v = arena('penitent', 540);
  v.upgrades.push('shadowStep');
  const e = v.enemies[0];
  stepWorld(v, { ...idle(), moveX: 1, dodge: true }, STEP);
  run(v, CONFIG.player.dodge.duration + 0.1);
  assert.equal(e.hp, e.maxHp - CONFIG.shadowStepDamage);
  assert.equal(v.player.hp, v.player.maxHp);
});
