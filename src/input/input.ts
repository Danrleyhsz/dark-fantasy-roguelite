import type { Point } from '../game/room.ts';
import type { InputState } from '../game/world.ts';

const CODES = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'KeyZ'],
  dodge: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyK', 'KeyX'],
  pause: ['Escape', 'KeyP'],
};
const GAME_KEYS = new Set(Object.values(CODES).flat());
/** Raio do joystick de toque, em px de tela. */
const STICK_R = 56;

export interface Input {
  state: InputState;
  /** Esc/P pressionado desde a última leitura. */
  pause: boolean;
  /** Recalcula o vetor de movimento (teclas + joystick). Uma vez por quadro. */
  poll(): void;
  /** Solta teclas e joystick (perda de foco, troca de tela). */
  reset(): void;
}

export function createInput(canvas: HTMLCanvasElement, toWorld: (clientX: number, clientY: number) => Point): Input {
  const held = new Set<string>();
  const state: InputState = { moveX: 0, moveY: 0, attack: false, aimAt: null, dodge: false };
  const stick = document.getElementById('stick')!, knob = document.getElementById('knob')!;
  let stickId: number | null = null, ox = 0, oy = 0, sx = 0, sy = 0;
  const input: Input = { state, pause: false, poll, reset };

  const targetIs = (e: Event, selector: string) => !!(e.target as Element | null)?.closest?.(selector);

  window.addEventListener('keydown', (e) => {
    if (CODES.pause.includes(e.code)) {
      if (!e.repeat) input.pause = true;
      e.preventDefault();
      return;
    }
    // Com um botão de menu focado, Enter/Espaço continuam acionando o botão.
    if (targetIs(e, 'button')) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    held.add(e.code);
    if (!e.repeat && CODES.attack.includes(e.code)) attack(null);
    if (!e.repeat && CODES.dodge.includes(e.code)) state.dodge = true;
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  // Teclas soltas fora da janela nunca geram keyup: limpa ao perder o foco.
  window.addEventListener('blur', reset);

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button === 0) attack(toWorld(e.clientX, e.clientY));
    else if (e.button === 2) state.dodge = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Toque: metade esquerda = joystick flutuante; metade direita (fora de botões) = atacar.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    document.body.classList.add('touch');
    if (targetIs(e, 'button, .overlay')) return;
    if (e.clientX < window.innerWidth / 2) {
      if (stickId !== null) return;
      stickId = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      stick.style.left = `${ox}px`;
      stick.style.top = `${oy}px`;
      stick.classList.add('active');
    } else attack(null);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let vx = (e.clientX - ox) / STICK_R, vy = (e.clientY - oy) / STICK_R;
    const m = Math.hypot(vx, vy);
    if (m > 1) { vx /= m; vy /= m; }
    const dead = m < 0.15;
    sx = dead ? 0 : vx;
    sy = dead ? 0 : vy;
    knob.style.transform = `translate(${vx * STICK_R}px, ${vy * STICK_R}px)`;
  });
  const release = (e: PointerEvent) => { if (e.pointerId === stickId) releaseStick(); };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.getElementById('t-attack')!.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    attack(null);
  });
  document.getElementById('t-dodge')!.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.dodge = true;
  });

  function attack(aimAt: Point | null): void {
    state.attack = true;
    state.aimAt = aimAt;
  }

  function releaseStick(): void {
    stickId = null;
    sx = sy = 0;
    stick.classList.remove('active');
    stick.style.left = stick.style.top = knob.style.transform = '';
  }

  function poll(): void {
    const has = (codes: string[]) => codes.some((c) => held.has(c));
    let x = sx + (has(CODES.right) ? 1 : 0) - (has(CODES.left) ? 1 : 0);
    let y = sy + (has(CODES.down) ? 1 : 0) - (has(CODES.up) ? 1 : 0);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    state.moveX = x;
    state.moveY = y;
  }

  function reset(): void {
    held.clear();
    releaseStick();
    state.moveX = state.moveY = 0;
    state.attack = state.dodge = false;
    state.aimAt = null;
  }

  return input;
}
