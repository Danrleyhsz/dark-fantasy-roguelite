import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hurtPlayer } from '../src/game/combat.ts';
import { createGame, startRun } from '../src/game/game.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { createWorld, stepWorld } from '../src/game/world.ts';
import { ART } from '../src/rendering/art.gen.ts';
import { createRenderer, type Images } from '../src/rendering/render.ts';
import { STEP, fighter, idle, mockCanvas, mockContext, playRun } from './helpers.ts';

/** Desenha cada quadro de uma luta completa; o contexto falso falha com NaN/Infinity. */
function playAndRender(images: Images): void {
  const r = createRenderer(mockContext(), mockCanvas, images);
  r.resize(1280, 725);
  const w = createWorld(FIRST_ROOM, 11);
  for (let i = 0; i < 60 * 40 && !(w.outcome && w.outcomeTimer <= 0); i++) {
    stepWorld(w, fighter(w), STEP);
    r.draw(w);
  }
  assert.equal(w.outcome, 'victory');
  hurtPlayer(w, 0, 0, 0);
  r.resize(0, 0); // tamanho degenerado não pode quebrar
  r.draw(w);
  const p = r.toWorld(640, 360);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
}

function fakeImages(): Images {
  const fake = mockCanvas(64, 64) as unknown as CanvasImageSource;
  const images: Images = {};
  for (const id of Object.keys(ART)) images[id] = fake;
  return images;
}

test('renderiza uma luta inteira sem imagens (desenho provisório)', () => {
  playAndRender({});
});

test('renderiza uma luta inteira com as folhas de sprites', () => {
  playAndRender(fakeImages());
});

test('renderiza a incursão inteira (todas as salas, projéteis, chefe) com efeitos reduzidos', () => {
  const r = createRenderer(mockContext(), mockCanvas, fakeImages(), { reduceMotion: true });
  r.resize(960, 544);
  const g = createGame();
  startRun(g, 42);
  let frames = 0;
  const origDraw = r.draw;
  // Desenha a cada 4 passos para manter o teste rápido.
  for (let i = 0; i < 400 && g.screen !== 'victory' && g.screen !== 'defeat'; i++) {
    playRun(g, 4 * STEP);
    if (g.world) { origDraw(g.world); frames++; }
  }
  assert.ok(frames > 100);
});

test('derrota: animação de queda renderiza', () => {
  const r = createRenderer(mockContext(), mockCanvas, {});
  r.resize(960, 544);
  const w = createWorld(FIRST_ROOM, 1);
  hurtPlayer(w, 999, 0, 0);
  for (let i = 0; i < 120; i++) {
    stepWorld(w, idle(), STEP);
    r.draw(w);
  }
});

test('toWorld inverte a câmera: o centro da tela cai perto do jogador', () => {
  const r = createRenderer(mockContext(), mockCanvas, {});
  r.resize(960, 544);
  const w = createWorld(FIRST_ROOM, 1);
  w.player.x = 480; w.player.y = 300;
  for (let i = 0; i < 120; i++) r.draw(w);
  const p = r.toWorld(480, 272);
  assert.ok(Math.hypot(p.x - w.player.x, p.y - w.player.y) < 80, `centro em ${p.x},${p.y}`);
});

test('todo arquivo do manifesto de arte existe', async () => {
  const { access } = await import('node:fs/promises');
  for (const def of Object.values(ART)) await access(`public/${def.src}`);
});
