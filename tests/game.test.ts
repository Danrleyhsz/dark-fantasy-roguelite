import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.ts';
import { createGame, quitToMenu, setPaused, startRun, updateGame } from '../src/game/game.ts';
import { hurtPlayer, type InputState, type World } from '../src/game/world.ts';
import { STEP, fighter, idle } from './helpers.ts';

function tick(g: ReturnType<typeof createGame>, seconds: number, policy: (w: World) => InputState = idle) {
  for (let t = 0; t < seconds; t += STEP) updateGame(g, g.world ? policy(g.world) : idle(), STEP);
}

test('menu -> partida com mundo novo', () => {
  const g = createGame();
  assert.deepEqual([g.screen, g.world], ['menu', null]);
  startRun(g, 1);
  assert.equal(g.screen, 'playing');
  assert.equal(g.world?.player.hp, CONFIG.player.maxHp);
});

test('pausa congela a simulação e volta ao jogo', () => {
  const g = createGame();
  startRun(g, 1);
  tick(g, 0.5);
  const t = g.world!.time;
  setPaused(g, true);
  assert.equal(g.screen, 'paused');
  tick(g, 2);
  assert.equal(g.world!.time, t);
  setPaused(g, false);
  tick(g, 0.5);
  assert.ok(g.world!.time > t);
});

test('pausar fora da partida não muda a tela', () => {
  const g = createGame();
  setPaused(g, true);
  assert.equal(g.screen, 'menu');
});

test('derrota mostra a tela de derrota e a simulação para', () => {
  const g = createGame();
  startRun(g, 1);
  hurtPlayer(g.world!, 99, 0, 0);
  tick(g, CONFIG.defeatDelay + 0.5);
  assert.equal(g.screen, 'defeat');
  const t = g.world!.time;
  tick(g, 1);
  assert.equal(g.world!.time, t);
});

test('vitória ao derrotar o inimigo', () => {
  const g = createGame();
  startRun(g, 3);
  tick(g, 60, fighter);
  assert.equal(g.screen, 'victory');
});

test('reiniciar descarta todo o estado da tentativa anterior', () => {
  const g = createGame();
  startRun(g, 1);
  const old = g.world!;
  tick(g, 20, fighter);
  hurtPlayer(old, 99, 0, 0);
  tick(g, CONFIG.defeatDelay + 0.1);
  startRun(g, 2);
  const w = g.world!;
  assert.notEqual(w, old);
  assert.equal(g.screen, 'playing');
  assert.equal(w.player.hp, CONFIG.player.maxHp);
  assert.equal(w.enemies.length, 1);
  assert.equal(w.enemies[0].hp, CONFIG.enemies.penitent.hp);
  assert.deepEqual([w.particles.length, w.corpses.length, w.time, w.outcome, w.stats.kills], [0, 0, 0, null, 0]);
});

test('reiniciar repetidamente não acumula entidades', () => {
  const g = createGame();
  for (let i = 0; i < 50; i++) {
    startRun(g, i);
    tick(g, 0.2, fighter);
  }
  assert.equal(g.world!.enemies.length, 1);
});

test('voltar ao menu descarta a partida', () => {
  const g = createGame();
  startRun(g, 1);
  quitToMenu(g);
  assert.equal(g.screen, 'menu');
  assert.equal(g.world, null);
  tick(g, 1);
  assert.equal(g.world, null);
});
