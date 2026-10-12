import { createSfx } from './audio/sfx.ts';
import { CONFIG } from './game/config.ts';
import { buyMeta, createGame, pickReward, quitToMenu, setPaused, setReduceMotion, setVolume, setWeapon, startRun, updateGame, type Screen } from './game/game.ts';
import { FIRST_ROOM } from './game/rooms.ts';
import { createWorld, enterRoom, type World } from './game/world.ts';
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
const sfx = createSfx(game.save.settings.volume);
// O navegador só libera áudio depois de um gesto do usuário.
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, () => sfx.unlock(), { passive: true });

const backdrop = createWorld(FIRST_ROOM, 1); // cena parada atrás do menu
const images = await loadImages();
const renderer = createRenderer(ctx, (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }), images, game.save.settings);
// Depois do renderizador: um clique durante o carregamento não pode usar toWorld antes de ele existir.
const input = createInput(canvas, (clientX, clientY) => {
  const r = canvas.getBoundingClientRect();
  return renderer.toWorld(((clientX - r.left) * canvas.width) / r.width, ((clientY - r.top) * canvas.height) / r.height);
});

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
  weapon: (kind) => setWeapon(game, kind),
  reduceMotion: (on) => setReduceMotion(game, on),
  volume: (v) => {
    setVolume(game, v);
    sfx.setVolume(v);
    sfx.play('pickup');
  },
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

/** Sons a partir das mudanças de estado entre quadros: o mundo não precisa saber de áudio. */
let prev = { world: null as World | null, serial: 0, kills: 0, hp: 0, dodge: 0, skillCd: 0, loot: -1, level: 0, phase: '', shots: 0, windups: 0, floaters: 0 };
function sounds(w: World | null): void {
  if (!w) {
    prev.world = null;
    return;
  }
  const p = w.player;
  const snap = {
    world: w, serial: w.serial, kills: w.stats.kills, hp: p.hp, dodge: p.dodgeSerial, skillCd: p.skillCd,
    loot: w.lastLoot?.time ?? -1, level: p.level, phase: w.phase,
    shots: w.projectiles.filter((q) => q.hostile).length,
    windups: w.enemies.filter((e) => e.state === 'windup').length,
    floaters: w.floaters.filter((f) => f.kind === 'dmg' || f.kind === 'crit').length,
  };
  if (prev.world === w) {
    if (snap.serial > prev.serial) sfx.play('swing');
    if (snap.kills > prev.kills) sfx.play('kill');
    else if (snap.floaters > prev.floaters) sfx.play(w.floaters.some((f) => f.kind === 'crit' && f.t < 0.05) ? 'crit' : 'hit');
    if (snap.hp < prev.hp) sfx.play('hurt');
    if (snap.dodge > prev.dodge) sfx.play('dodge');
    if (snap.skillCd > prev.skillCd + 0.5) sfx.play('skill');
    if (snap.loot !== prev.loot) sfx.play('pickup');
    if (snap.level > prev.level) sfx.play('levelup');
    if (snap.phase === 'exit' && prev.phase !== 'exit') sfx.play('door');
    if (snap.shots > prev.shots) sfx.play('shot');
    if (snap.windups > prev.windups) sfx.play('windup');
  }
  prev = snap;
}

let last = performance.now(), acc = 0, shown: Screen | null = null;
/** Um quadro: entrada, simulação em passo fixo, telas, som e desenho. */
function tick(now: number): void {
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
      input.state.attack = input.state.dodge = input.state.skill = false;
      acc -= CONFIG.step;
    }
  } else {
    acc = 0;
    input.state.attack = input.state.dodge = input.state.skill = false;
  }
  if (game.screen !== shown) {
    if (game.screen === 'victory' || game.screen === 'defeat') sfx.play(game.screen);
    shown = game.screen;
    if (shown !== 'playing') input.reset();
    ui.show(shown);
  }
  sounds(game.screen === 'playing' ? game.world : null);
  renderer.draw(game.world ?? backdrop);
  ui.hud(game.world);
}
function frame(now: number): void {
  tick(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposto para os testes de fumaça no navegador (docs/TEST_PLAN.md).
(window as unknown as { __game: typeof game }).__game = game;
// Atalhos de depuração só com ?debug na URL: __debug.room(4) pula para a sala do chefe.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __debug: unknown }).__debug = {
    room: (depth: number) => game.world && enterRoom(game.world, depth),
    /** Avança quadros sem requestAnimationFrame (painel oculto pausa o rAF). */
    frames: (n: number) => {
      for (let i = 0; i < n; i++) tick(last + 1000 / 60);
    },
  };
}
