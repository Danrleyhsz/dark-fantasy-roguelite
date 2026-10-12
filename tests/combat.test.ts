import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { createWorld, hurtPlayer, stepWorld, type World } from '../src/game/world.ts';
import { STEP, fighter, idle, run, runUntil } from './helpers.ts';

const PEN = CONFIG.enemies.penitent;
const ATK = CONFIG.player.attack;

/** Mundo com o jogador no centro e o Penitente a `gap` px à direita, já em perseguição. */
function duel(gap: number, state: 'idle' | 'chase' = 'chase'): World {
  const w = createWorld(FIRST_ROOM, 1);
  w.player.x = 480; w.player.y = 300;
  const e = w.enemies[0];
  e.x = 480 + gap; e.y = 300; e.state = state;
  return w;
}

const attackRight = () => ({ moveX: 0, moveY: 0, attack: true, aimAt: { x: 9999, y: 300 } });

test('golpe acerta inimigo à frente, uma vez por golpe', () => {
  const w = duel(40, 'idle');
  stepWorld(w, attackRight(), STEP);
  run(w, ATK.windup + ATK.active + ATK.trail + STEP);
  assert.equal(w.enemies[0].hp, PEN.hp - 1);
  assert.equal(w.stats.kills, 0);
});

test('golpe não acerta inimigo às costas nem fora do alcance', () => {
  const behind = duel(-40, 'idle');
  stepWorld(behind, attackRight(), STEP);
  run(behind, 0.3);
  assert.equal(behind.enemies[0].hp, PEN.hp);

  const far = duel(ATK.range + PEN.radius + 20, 'idle');
  stepWorld(far, attackRight(), STEP);
  run(far, 0.3);
  assert.equal(far.enemies[0].hp, PEN.hp);
});

test('recarga limita a quantidade de golpes', () => {
  const w = duel(200, 'idle');
  const serial0 = w.serial;
  run(w, 1, attackRight);
  const swings = w.serial - serial0;
  assert.ok(swings <= Math.ceil(1 / ATK.cooldown) + 1, `golpes demais: ${swings}`);
  assert.ok(swings >= Math.floor(1 / ATK.cooldown), `golpes de menos: ${swings}`);
});

test('clique durante a recarga fica guardado (buffer) e vira golpe', () => {
  const w = duel(200, 'idle');
  stepWorld(w, attackRight(), STEP);
  run(w, ATK.cooldown - ATK.buffer / 2);
  const before = w.serial;
  stepWorld(w, attackRight(), STEP);
  run(w, ATK.buffer);
  assert.equal(w.serial, before + 1);
});

test('inimigo prepara (aviso visível) antes de causar dano', () => {
  const w = duel(PEN.attackRange);
  stepWorld(w, idle(), STEP);
  assert.equal(w.enemies[0].state, 'windup');
  run(w, PEN.windup - 2 * STEP);
  assert.equal(w.player.hp, CONFIG.player.maxHp, 'dano antes do fim da preparação');
  run(w, PEN.active + 2 * STEP);
  assert.equal(w.player.hp, CONFIG.player.maxHp - 1);
});

test('sair da área de perigo durante a preparação evita o dano', () => {
  const w = duel(PEN.attackRange);
  stepWorld(w, idle(), STEP);
  run(w, PEN.windup + PEN.active + STEP, { moveX: -1, moveY: 0, attack: false, aimAt: null });
  assert.equal(w.player.hp, CONFIG.player.maxHp);
});

test('invulnerabilidade: um evento não tira vida duas vezes', () => {
  const w = duel(300, 'idle');
  hurtPlayer(w, 1, 0, 0);
  hurtPlayer(w, 1, 0, 0);
  assert.equal(w.player.hp, CONFIG.player.maxHp - 1);
  run(w, CONFIG.player.iframes - 0.1);
  hurtPlayer(w, 1, 0, 0);
  assert.equal(w.player.hp, CONFIG.player.maxHp - 1, 'dano durante a invulnerabilidade');
  // O hitstop do impacto congela tudo, inclusive o cronômetro da invulnerabilidade.
  run(w, 0.1 + w.hitstop + 0.1);
  assert.equal(w.player.invuln, 0);
  hurtPlayer(w, 1, 0, 0);
  assert.equal(w.player.hp, CONFIG.player.maxHp - 2);
});

test('vida nunca fica negativa e a derrota encerra a simulação', () => {
  const w = duel(300, 'idle');
  hurtPlayer(w, 99, 0, 0);
  assert.equal(w.player.hp, 0);
  assert.equal(w.outcome, 'defeat');
  const enemy = { ...w.enemies[0] };
  run(w, 3, { moveX: 1, moveY: 0, attack: true, aimAt: null });
  assert.equal(w.player.hp, 0);
  assert.equal(w.enemies[0].x, enemy.x, 'inimigo continuou se movendo após a derrota');
});

test('bot vence o Penitente sem morrer (combate é vencível)', () => {
  const w = createWorld(FIRST_ROOM, 7);
  const t = runUntil(w, 60, (x) => x.outcome !== null, fighter);
  assert.ok(t < 60, 'luta não terminou');
  assert.equal(w.outcome, 'victory');
  assert.ok(w.player.hp > 0);
  assert.equal(w.stats.kills, 1);
});

test('jogador parado perto do inimigo acaba derrotado (inimigo é ameaça real)', () => {
  const w = duel(150);
  const t = runUntil(w, 30, (x) => x.outcome !== null, idle);
  assert.ok(t < 30, 'inimigo não derrotou o jogador parado');
  assert.equal(w.outcome, 'defeat');
  assert.equal(w.stats.damageTaken, CONFIG.player.maxHp);
});
