import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.ts';
import { clearPath, computeFlowField, flowAngle, moveAndCollide, parseRoom, solidAt, solidAtPoint } from '../src/game/room.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';

const T = CONFIG.tile;

test('primeira sala: tamanho da vista, fechada por paredes e spawns no piso', () => {
  const r = FIRST_ROOM;
  assert.equal(r.cols * T, CONFIG.view.w);
  assert.equal(r.rows * T, CONFIG.view.h);
  for (let x = 0; x < r.cols; x++) assert.ok(solidAt(r, x, 0) && solidAt(r, x, r.rows - 1), `borda vertical aberta em x=${x}`);
  for (let y = 0; y < r.rows; y++) assert.ok(solidAt(r, 0, y) && solidAt(r, r.cols - 1, y), `borda lateral aberta em y=${y}`);
  for (const s of [r.playerSpawn, ...r.enemySpawns]) assert.ok(!solidAtPoint(r, s.x, s.y));
  assert.equal(r.enemySpawns.length, 1);
});

test('primeira sala: centro livre para o combate', () => {
  const r = FIRST_ROOM;
  for (let y = 6; y <= 12; y++) for (let x = 6; x <= 23; x++) assert.ok(!solidAt(r, x, y), `obstáculo no centro (${x},${y})`);
});

test('parseRoom rejeita linhas desiguais, tiles desconhecidos e sala sem jogador', () => {
  assert.throws(() => parseRoom(['###', '#P', '###']));
  assert.throws(() => parseRoom(['###', '#X#', '###']));
  assert.throws(() => parseRoom(['###', '#.#', '###']));
});

test('corpo para encostado na parede e nunca fica dentro de tile sólido', () => {
  const r = FIRST_ROOM;
  const b = { x: r.playerSpawn.x, y: r.playerSpawn.y, r: 10 };
  for (let i = 0; i < 600; i++) {
    moveAndCollide(r, b, -7, 0);
    assert.ok(!overlapsSolid(r, b), `dentro da parede no passo ${i}`);
  }
  assert.equal(b.x, T + 10);
});

test('movimento rápido não atravessa paredes (subpassos)', () => {
  const r = FIRST_ROOM;
  const b = { x: r.playerSpawn.x, y: r.playerSpawn.y, r: 10 };
  const hit = moveAndCollide(r, b, -2000, 0);
  assert.ok(hit);
  assert.equal(b.x, T + 10);
});

test('desliza ao longo da parede em movimento diagonal', () => {
  const r = FIRST_ROOM;
  const b = { x: 2 * T, y: 9 * T, r: 10 };
  moveAndCollide(r, b, -100, 0);
  const y0 = b.y;
  moveAndCollide(r, b, -5, 5);
  assert.equal(b.x, T + 10);
  assert.ok(b.y > y0, 'devia deslizar para baixo');
});

test('corpo do tamanho de um tile desliza ao raspar a quina de uma coluna em vez de travar', () => {
  const r = FIRST_ROOM; // coluna em (3,4)
  // Raio 16 (Flagelante) passando logo abaixo da coluna, raspando 0,5 na quina.
  const b = { x: 6 * T, y: 5 * T + 16 - 0.5, r: 16 };
  for (let i = 0; i < 60; i++) {
    moveAndCollide(r, b, -3, 0);
    assert.ok(!overlapsSolid(r, b), `dentro da coluna no passo ${i}`);
  }
  assert.equal(b.x, T + 16, 'devia passar pela coluna e parar na parede oeste');
});

test('linha de visão bloqueada por pilar; campo de fluxo contorna o pilar', () => {
  const r = FIRST_ROOM; // pilar em (3,4)
  const a = { x: 3.5 * T, y: 3.5 * T }, b = { x: 3.5 * T, y: 5.5 * T };
  assert.equal(clearPath(r, a.x, a.y, b.x, b.y, 0), false);
  const dist = new Int16Array(r.cols * r.rows), queue = new Int32Array(r.cols * r.rows);
  computeFlowField(r, b.x, b.y, dist, queue);
  // Seguir o fluxo a partir de cima do pilar deve chegar ao alvo.
  const body = { x: a.x, y: a.y, r: 11 };
  for (let i = 0; i < 400 && Math.hypot(body.x - b.x, body.y - b.y) > 8; i++) {
    const ang = clearPath(r, body.x, body.y, b.x, b.y, body.r) ? Math.atan2(b.y - body.y, b.x - body.x) : flowAngle(r, dist, body.x, body.y);
    assert.ok(!Number.isNaN(ang), 'sem caminho');
    moveAndCollide(r, body, Math.cos(ang) * 2, Math.sin(ang) * 2);
  }
  assert.ok(Math.hypot(body.x - b.x, body.y - b.y) <= 8, 'não contornou o pilar');
});

function overlapsSolid(r: typeof FIRST_ROOM, b: { x: number; y: number; r: number }): boolean {
  const e = 1e-6;
  for (let y = Math.floor((b.y - b.r) / T); y <= Math.floor((b.y + b.r - e) / T); y++)
    for (let x = Math.floor((b.x - b.r) / T); x <= Math.floor((b.x + b.r - e) / T); x++) if (solidAt(r, x, y)) return true;
  return false;
}
