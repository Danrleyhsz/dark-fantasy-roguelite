import { CONFIG } from './game/config.ts';
import { buyMeta, createGame, pickReward, quitToMenu, setPaused, setReduceMotion, startRun, updateGame, type Screen } from './game/game.ts';
import { FIRST_ROOM } from './game/rooms.ts';
import { createWorld } from './game/world.ts';
import { createInput } from './input/input.ts';
import type { StorageLike } from './persistence/save.ts';
import { loadImages } from './rendering/assets.ts';
import { createRenderer } from './rendering/render.ts';
import { THEME } from './rendering/theme.ts';
import { createUI } from './ui/ui.ts';

const fatal = document.getElementById('fatal')!;
function showFatal(message: string): void {
  fatal.textContent = `Erro: ${message}. Recarregue a página.`;
  fatal.hidden = false;
}
window.addEventListener('error', (e) => showFatal(e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason)));

for (const [name, value] of Object.entries(THEME)) document.documentElement.style.setProperty(`--${name}`, value);

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D indisponível neste navegador');

// Acessar localStorage pode lançar erro (modo privado, cookies bloqueados): segue sem salvar.
let storage: StorageLike | null = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

const game = createGame(storage);
const backdrop = createWorld(FIRST_ROOM, 1); // cena parada atrás do menu
const input = createInput(canvas, (clientX, clientY) => {
  const r = canvas.getBoundingClientRect();
  return renderer.toWorld(((clientX - r.left) * canvas.width) / r.width, ((clientY - r.top) * canvas.height) / r.height);
});
const images = await loadImages();
const renderer = createRenderer(ctx, (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), images, game.save.settings);

const begin = () => {
  input.reset();
  startRun(game, Date.now());
};
const ui = createUI(game, {
  start: begin,
  restart: begin,
  resume: () => setPaused(game, false),
  pause: () => setPaused(game, true),
  menu: () => quitToMenu(game),
  pick: (id) => pickReward(game, id),
  buy: (id) => {
    if (buyMeta(game, id)) ui.show('menu');
  },
  reduceMotion: (on) => setReduceMotion(game, on),
});

function resize(): void {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  renderer.resize(canvas.width, canvas.height);
}
new ResizeObserver(resize).observe(canvas);
resize();

// Trocar de aba ou janela pausa a partida (e o input já foi limpo no blur).
window.addEventListener('blur', () => setPaused(game, true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(game, true);
});

let last = performance.now(), acc = 0, shown: Screen | null = null;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, CONFIG.maxFrame);
  last = now;
  input.poll();
  if (input.pause) {
    input.pause = false;
    setPaused(game, game.screen === 'playing');
  }
  if (game.screen === 'playing') {
    acc += dt;
    while (acc >= CONFIG.step && game.screen === 'playing') {
      updateGame(game, input.state, CONFIG.step);
      input.state.attack = input.state.dodge = false;
      acc -= CONFIG.step;
    }
  } else {
    acc = 0;
    input.state.attack = input.state.dodge = false;
  }
  if (game.screen !== shown) {
    shown = game.screen;
    if (shown !== 'playing') input.reset();
    ui.show(shown);
  }
  renderer.draw(game.world ?? backdrop);
  ui.hud(game.world);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposto para os testes de fumaça no navegador (docs/TEST_PLAN.md).
(window as unknown as { __game: typeof game }).__game = game;
