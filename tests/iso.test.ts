import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoX, isoY, screenDirToWorld, screenToWorld, worldAngleToScreen } from '../src/rendering/iso.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('projeção e inversa voltam ao mesmo ponto do chão', () => {
  for (const [x, y] of [[0, 0], [123, 45], [960, 544], [-30, 700]]) {
    const p = screenToWorld(isoX(x, y), isoY(x, y));
    assert.ok(close(p.x, x) && close(p.y, y), `${x},${y} -> ${p.x},${p.y}`);
  }
});

test('tile de mundo vira losango 2:1 e altura sobe na tela', () => {
  assert.equal(isoX(32, 0) - isoX(0, 0), 32);
  assert.equal(isoY(32, 0) - isoY(0, 0), 16);
  assert.equal(isoY(0, 0, 10), -10);
});

test('direções de tela viram direções de mundo que andam para o mesmo lado na tela', () => {
  for (const [u, v] of [[1, 0], [0, -1], [-1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2]]) {
    const d = screenDirToWorld(u, v);
    assert.ok(close(Math.hypot(d.x, d.y), 1), 'módulo preservado');
    const su = isoX(d.x, d.y), sv = isoY(d.x, d.y);
    assert.ok(su * u >= -1e-9 && sv * v >= -1e-9, `(${u},${v}) foi para (${su},${sv})`);
    assert.ok(Math.abs(Math.atan2(sv, su) - Math.atan2(v, u)) < 1e-9 || (u === 0 && v === 0));
  }
  assert.deepEqual(screenDirToWorld(0, 0), { x: 0, y: 0 });
  const half = screenDirToWorld(0.5, 0);
  assert.ok(close(Math.hypot(half.x, half.y), 0.5), 'joystick parcial mantém intensidade');
});

test('olhar para cima na tela = de costas para a câmera', () => {
  assert.ok(worldAngleToScreen(-Math.PI * 0.75).v < 0); // mundo (-1,-1) = topo da tela
  assert.ok(worldAngleToScreen(Math.PI / 4).v > 0); // mundo (1,1) = base da tela
});
