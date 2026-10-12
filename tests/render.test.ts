import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { createWorld, hurtPlayer, stepWorld } from '../src/game/world.ts';
import { ART } from '../src/rendering/art.gen.ts';
import { createRenderer, type Images } from '../src/rendering/render.ts';
import { STEP, fighter, mockCanvas, mockContext } from './helpers.ts';

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
}

test('renderiza uma luta inteira sem imagens (desenho provisório)', () => {
  playAndRender({});
});

test('renderiza uma luta inteira com as folhas de sprites', () => {
  const fake = mockCanvas(64, 64) as unknown as CanvasImageSource;
  const images: Images = {};
  for (const id of Object.keys(ART)) images[id] = fake;
  playAndRender(images);
});

test('derrota: animação de queda renderiza', () => {
  const r = createRenderer(mockContext(), mockCanvas, {});
  r.resize(960, 544);
  const w = createWorld(FIRST_ROOM, 1);
  hurtPlayer(w, 99, 0, 0);
  for (let i = 0; i < 120; i++) {
    stepWorld(w, { moveX: 0, moveY: 0, attack: false, aimAt: null }, STEP);
    r.draw(w);
  }
});

test('todo arquivo do manifesto de arte existe', async () => {
  const { access } = await import('node:fs/promises');
  for (const def of Object.values(ART)) await access(`public/${def.src}`);
});
