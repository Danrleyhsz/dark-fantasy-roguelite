import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageEnemy, hurtPlayer, spawnProjectile } from '../src/game/combat.ts';
import { CONFIG } from '../src/game/config.ts';
import { createGame, quitToMenu, startRun, updateGame } from '../src/game/game.ts';
import { attributesFor, deriveStats, EMPTY_GEAR, xpToNext } from '../src/game/hero.ts';
import { itemPower, rollItem, rollRarity, type Item } from '../src/game/items.ts';
import { mulberry32 } from '../src/game/math.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { NO_META } from '../src/game/upgrades.ts';
import { createWorld, gainXp, pickUp, spawnEnemy, stepWorld, type World } from '../src/game/world.ts';
import { STEP, idle, memoryStorage, run } from './helpers.ts';

function world(): World {
  const w = createWorld(FIRST_ROOM, 5);
  w.enemies = [];
  spawnEnemy(w, 'penitent', { x: 900, y: 120 }); // longe e rezando: a sala não conta como limpa
  w.player.x = 480; w.player.y = 300;
  return w;
}

test('atributos e atributos derivados crescem com o nível', () => {
  assert.deepEqual(attributesFor(1), { strength: 5, vitality: 5, dexterity: 5 });
  const s1 = deriveStats(1, EMPTY_GEAR, [], NO_META), s5 = deriveStats(5, EMPTY_GEAR, [], NO_META);
  assert.ok(s5.damage > s1.damage && s5.maxHp > s1.maxHp && s5.cooldown < s1.cooldown && s5.critChance > s1.critChance);
});

test('experiência sobe de nível, recalcula atributos e cura', () => {
  const w = world(), p = w.player;
  p.hp = 10;
  const hp1 = p.maxHp;
  gainXp(w, xpToNext(1) + 5);
  assert.equal(p.level, 2);
  assert.equal(p.xp, 5);
  assert.ok(p.maxHp > hp1);
  assert.ok(p.hp > 10, 'subir de nível devia curar');
  gainXp(w, 100_000);
  assert.equal(p.level, CONFIG.levels.max);
  assert.equal(p.xp, 0);
});

test('abater inimigo dá experiência', () => {
  const w = world();
  const e = spawnEnemy(w, 'brute', { x: 600, y: 300 });
  damageEnemy(w, e, 9999, 0);
  run(w, 0.15);
  assert.equal(w.stats.xpGained, CONFIG.enemies.brute.xp);
});

test('itens: raridade sobe com a profundidade e respeita o mínimo', () => {
  const rng = mulberry32(1);
  const avg = (depth: number) => {
    let s = 0;
    for (let i = 0; i < 2000; i++) s += rollRarity(rng, depth);
    return s / 2000;
  };
  assert.ok(avg(4) > avg(0));
  for (let i = 0; i < 200; i++) assert.ok(rollRarity(rng, 0, 2) >= 2);
  for (let i = 0; i < 300; i++) {
    const it = rollItem(rng, i % 5);
    assert.ok(it.name.length > 3 && Object.keys(it.mods).length > 0);
    assert.ok(Object.values(it.mods).every((v) => Number.isFinite(v) && v > 0));
  }
});

test('pegar item melhor equipa; pior vira cinzas', () => {
  const w = world(), p = w.player;
  const weak: Item = { slot: 'weapon', rarity: 0, name: 'Espada', mods: { damagePct: 0.05 } };
  const strong: Item = { slot: 'weapon', rarity: 2, name: 'Espada do Mártir', mods: { damagePct: 0.3, critChance: 0.05 } };
  assert.ok(itemPower(strong) > itemPower(weak));
  const dmg0 = p.stats.damage;
  w.loot.push({ x: p.x, y: p.y, item: strong, t: 0 });
  stepWorld(w, idle(), STEP);
  assert.equal(p.gear.weapon, strong);
  assert.ok(p.stats.damage > dmg0);
  w.loot.push({ x: p.x, y: p.y, item: weak, t: 0 });
  pickUp(w, w.loot[0]);
  assert.equal(p.gear.weapon, strong);
  assert.ok(w.runAshes > 0);
  assert.equal(w.lastLoot?.equipped, false);
});

test('armadura reduz o dano recebido e vida extra entra na vida máxima', () => {
  const w = world(), p = w.player;
  const hp0 = p.maxHp;
  w.loot.push({ x: p.x, y: p.y, item: { slot: 'armor', rarity: 1, name: 'Cota', mods: { hpFlat: 20, armorPct: 0.25 } }, t: 0 });
  stepWorld(w, idle(), STEP);
  assert.equal(p.maxHp, hp0 + 20);
  hurtPlayer(w, 40, 0, 0);
  assert.equal(p.maxHp - p.hp, 30);
});

test('Ira Flamejante: gasta Fé, tem recarga, fere quem está no raio e queima projéteis', () => {
  const w = world(), p = w.player, sk = CONFIG.player.skill;
  p.stats.critChance = 0;
  const near = spawnEnemy(w, 'penitent', { x: p.x + 50, y: p.y });
  const far = spawnEnemy(w, 'penitent', { x: p.x + 200, y: p.y });
  spawnProjectile(w, p.x - 40, p.y, 0, 10, 'ember', 12, true);
  const fe0 = p.fe;
  stepWorld(w, { ...idle(), skill: true }, STEP);
  assert.ok(Math.abs(p.fe - (fe0 - sk.cost + p.stats.feRegen * STEP)) < 1e-6 || p.fe <= fe0 - sk.cost + 1);
  assert.ok(near.hp < near.maxHp);
  assert.equal(far.hp, far.maxHp);
  assert.equal(w.projectiles.filter((q) => q.hostile).length, 0);
  const hp = near.hp;
  stepWorld(w, { ...idle(), skill: true }, STEP);
  run(w, 0.2);
  assert.equal(near.hp, hp, 'usou de novo durante a recarga');
  p.fe = 0;
  p.skillCd = 0;
  stepWorld(w, { ...idle(), skill: true }, STEP);
  assert.equal(near.hp, hp, 'usou sem Fé suficiente');
});

test('golpe que acerta recarrega Fé; crítico mostra número destacado', () => {
  const w = world(), p = w.player;
  p.fe = 0;
  p.stats.critChance = 1;
  spawnEnemy(w, 'penitent', { x: p.x + 30, y: p.y });
  stepWorld(w, { ...idle(), attack: true, aimAt: { x: p.x + 100, y: p.y } }, STEP);
  run(w, 0.2);
  assert.ok(p.fe >= CONFIG.player.fe.perHit);
  assert.ok(w.floaters.some((f) => f.kind === 'crit'));
});

test('nível e experiência do herói persistem entre incursões (inclusive ao abandonar)', () => {
  const store = memoryStorage();
  const g = createGame(store);
  startRun(g, 1);
  gainXp(g.world!, xpToNext(1) + xpToNext(2));
  assert.equal(g.world!.player.level, 3);
  g.screen = 'paused';
  quitToMenu(g);
  const g2 = createGame(store);
  assert.equal(g2.save.hero.level, 3);
  startRun(g2, 2);
  assert.equal(g2.world!.player.level, 3);
  assert.ok(g2.world!.player.maxHp > CONFIG.player.maxHp);
  updateGame(g2, idle(), STEP);
});
