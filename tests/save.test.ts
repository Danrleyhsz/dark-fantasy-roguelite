import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setReduceMotion } from '../src/game/game.ts';
import { defaultSave, loadSave, writeSave } from '../src/persistence/save.ts';
import { META } from '../src/game/upgrades.ts';
import { memoryStorage } from './helpers.ts';

const KEY = 'dark-fantasy-roguelite/save';

test('sem armazenamento ou sem dados: valores padrão', () => {
  assert.deepEqual(loadSave(null), defaultSave());
  assert.deepEqual(loadSave(memoryStorage()), defaultSave());
});

test('JSON corrompido ou de outro formato não impede jogar', () => {
  for (const bad of ['{', 'null', '42', '"texto"', '[]', '{"ashes":"muitas","meta":{"vigor":-5,"edge":9e99,"breath":null}}']) {
    const s = loadSave(memoryStorage({ [KEY]: bad }));
    assert.equal(s.ashes, 0, bad);
    assert.ok(s.meta.vigor >= 0 && s.meta.edge <= META.edge.costs.length && s.meta.breath === 0, bad);
  }
});

test('valores válidos são lidos e limitados aos máximos', () => {
  const raw = { ashes: 37.9, meta: { vigor: 2, edge: 99, breath: 1 }, best: { runs: 4, wins: 9, depth: 3 }, settings: { reduceMotion: true } };
  const s = loadSave(memoryStorage({ [KEY]: JSON.stringify(raw) }));
  assert.equal(s.ashes, 37);
  assert.deepEqual(s.meta, { vigor: 2, edge: META.edge.costs.length, breath: 1 });
  assert.deepEqual(s.best, { runs: 4, wins: 4, depth: 3 });
  assert.equal(s.settings.reduceMotion, true);
});

test('getItem que lança erro (modo privado) cai no padrão', () => {
  const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
  assert.deepEqual(loadSave(throwing), defaultSave());
});

test('gravação: ida e volta, e falha de escrita retorna false sem lançar', () => {
  const store = memoryStorage();
  const s = defaultSave();
  s.ashes = 12;
  assert.equal(writeSave(store, s), true);
  assert.equal(loadSave(store).ashes, 12);
  assert.equal(writeSave(memoryStorage({}, true), s), false);
  assert.equal(writeSave(null, s), false);
});

test('jogo avisa (saved=false) quando não consegue gravar, mas segue funcionando', () => {
  const g = createGame(memoryStorage({}, true));
  setReduceMotion(g, true);
  assert.equal(g.saved, false);
  assert.equal(g.save.settings.reduceMotion, true);
});
