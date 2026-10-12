import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hurtPlayer } from '../src/game/combat.ts';
import { CONFIG } from '../src/game/config.ts';
import { ashesFor, buyMeta, createGame, pickReward, quitToMenu, setPaused, startRun, updateGame } from '../src/game/game.ts';
import { META } from '../src/game/upgrades.ts';
import { atDoor, createRun, type InputState, type World } from '../src/game/world.ts';
import { STEP, fighter, idle, memoryStorage, playRun, toDoor } from './helpers.ts';

function tick(g: ReturnType<typeof createGame>, seconds: number, policy: (w: World) => InputState = idle) {
  for (let t = 0; t < seconds; t += STEP) updateGame(g, g.world ? policy(g.world) : idle(), STEP);
}

test('menu -> incursão começa na sala 1 com vida cheia', () => {
  const g = createGame();
  assert.deepEqual([g.screen, g.world], ['menu', null]);
  startRun(g, 1);
  assert.equal(g.screen, 'playing');
  assert.equal(g.world?.depth, 0);
  assert.equal(g.world?.player.hp, g.world?.player.maxHp);
  assert.equal(g.world?.totalRooms, CONFIG.run.encounters.length);
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

test('derrota mostra a tela de derrota, rende cinzas e a simulação para', () => {
  const store = memoryStorage();
  const g = createGame(store);
  startRun(g, 1);
  hurtPlayer(g.world!, 999, 0, 0);
  tick(g, CONFIG.defeatDelay + 0.5);
  assert.equal(g.screen, 'defeat');
  assert.equal(g.save.best.runs, 1);
  assert.equal(g.save.ashes, ashesFor(g.world!));
  assert.ok(store.data['dark-fantasy-roguelite/save'], 'progresso não foi salvo');
  const t = g.world!.time;
  tick(g, 1);
  assert.equal(g.world!.time, t);
});

test('limpar a sala oferece 3 bênçãos; escolher abre a porta; a porta leva à sala seguinte', () => {
  const g = createGame();
  startRun(g, 4);
  tick(g, 60, fighter);
  assert.equal(g.screen, 'reward');
  const offer = g.world!.offer!;
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer).size, 3);
  pickReward(g, offer[1]);
  assert.equal(g.screen, 'playing');
  assert.equal(g.world!.phase, 'exit');
  assert.ok(g.world!.upgrades.includes(offer[1]));
  const w = g.world!;
  for (let t = 0; t < 15 && w.depth === 0; t += STEP) updateGame(g, toDoor(w), STEP);
  assert.equal(w.depth, 1, 'não passou pela porta');
  assert.equal(w.phase, 'fight');
  assert.ok(w.enemies.length >= 2);
  assert.equal(w.projectiles.length + w.corpses.length, 0);
});

test('a porta só abre depois de escolher a bênção', () => {
  const g = createGame();
  startRun(g, 4);
  tick(g, 60, fighter);
  const w = g.world!;
  w.player.x = CONFIG.view.w / 2;
  w.player.y = 3 * CONFIG.tile + w.player.r;
  assert.equal(atDoor(w), false);
});

test('incursão completa: o bot atravessa as salas e derrota o chefe', () => {
  for (const seed of [11, 23, 42]) {
    const g = createGame();
    startRun(g, seed);
    playRun(g, 600);
    assert.equal(g.screen, 'victory', `semente ${seed} terminou em ${g.screen} na sala ${(g.world?.depth ?? 0) + 1}`);
    assert.equal(g.world!.stats.roomsCleared, CONFIG.run.encounters.length);
    assert.ok(g.result?.victory);
    assert.equal(g.save.best.wins, 1);
  }
});

test('reiniciar descarta todo o estado da tentativa anterior', () => {
  const g = createGame();
  startRun(g, 2);
  const old = g.world!;
  tick(g, 20, fighter);
  hurtPlayer(old, 999, 0, 0);
  tick(g, CONFIG.defeatDelay + 0.1);
  startRun(g, 2);
  const w = g.world!, fresh = createRun(2);
  assert.notEqual(w, old);
  assert.equal(g.screen, 'playing');
  assert.equal(w.player.hp, w.player.maxHp);
  assert.deepEqual(w.enemies.map((e) => [e.kind, e.hp]), fresh.enemies.map((e) => [e.kind, e.hp]));
  assert.deepEqual([w.particles.length, w.corpses.length, w.projectiles.length, w.time, w.outcome, w.stats.kills, w.upgrades.length], [0, 0, 0, 0, null, 0, 0]);
});

test('reiniciar repetidamente não acumula entidades', () => {
  const g = createGame();
  for (let i = 0; i < 50; i++) {
    startRun(g, 7);
    tick(g, 0.2, fighter);
  }
  assert.equal(g.world!.enemies.length, createRun(7).enemies.length);
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

test('Relicário: comprar exige cinzas, respeita o nível máximo e afeta a próxima incursão', () => {
  const g = createGame(memoryStorage());
  assert.equal(buyMeta(g, 'vigor'), false);
  g.save.ashes = 1000;
  for (let i = 0; i < 10; i++) buyMeta(g, 'vigor');
  assert.equal(g.save.meta.vigor, META.vigor.costs.length);
  assert.equal(g.save.ashes, 1000 - META.vigor.costs.reduce((a, b) => a + b, 0));
  startRun(g, 1);
  assert.equal(g.world!.player.maxHp, CONFIG.player.maxHp + META.vigor.costs.length * META.vigor.perLevel);
  assert.equal(buyMeta(g, 'edge'), false, 'comprou fora do menu');
});
