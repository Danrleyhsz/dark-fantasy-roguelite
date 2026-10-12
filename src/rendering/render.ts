import { CONFIG } from '../game/config.ts';
import { TAU } from '../game/math.ts';
import type { Room } from '../game/room.ts';
import { CORPSE_TIME, type Corpse, type Enemy, type Particle, type Player, type Swing, type World } from '../game/world.ts';
import { ART } from './art.gen.ts';
import { THEME } from './theme.ts';

export type SpriteId = 'player' | 'penitent';
/** Imagens já carregadas, por id do manifesto. Ausentes caem no desenho provisório. */
export type Images = Partial<Record<string, CanvasImageSource>>;
export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement;

export interface Renderer {
  /** Tamanho do canvas em pixels do dispositivo. */
  resize(pixelW: number, pixelH: number): void;
  draw(w: World): void;
}

const T = CONFIG.tile, VW = CONFIG.view.w, VH = CONFIG.view.h;
/** Lado, em px lógicos, de uma repetição das texturas de parede e piso (múltiplos de T). */
const WALL_TILE = 6 * T;
const FLOOR_TILE = 8 * T;
/** Altura na tela (px lógicos) da pose mais alta de cada folha. */
const HEIGHT: Record<SpriteId, number> = { player: 68, penitent: 64 };
const PARTICLE_COLOR = { spark: THEME.ivory, bone: THEME.bone, blood: THEME.blood };

/** Coluna da sala: desenhada na camada dinâmica para ser ordenada por profundidade com os personagens. */
interface Pillar { pillar: true; x: number; y: number; r: number }
const PROP = { window: 0, doorClosed: 1, doorOpen: 2, column: 3 };

export function createRenderer(ctx: CanvasRenderingContext2D, makeCanvas: MakeCanvas, images: Images = {}): Renderer {
  let pw = 1, ph = 1, scale = 1, ox = 0, oy = 0;
  let roomLayer: HTMLCanvasElement | null = null, roomOf: Room | null = null;
  let shade: HTMLCanvasElement | null = null, hurtShade: HTMLCanvasElement | null = null;
  let pillars: Pillar[] = [];
  const tints = new Map<string, HTMLCanvasElement>();
  const order: (Player | Enemy | Pillar)[] = [];

  function resize(w: number, h: number): void {
    pw = Math.max(1, Math.round(w));
    ph = Math.max(1, Math.round(h));
    scale = Math.min(pw / VW, ph / VH);
    ox = (pw - VW * scale) / 2;
    oy = (ph - VH * scale) / 2;
    roomLayer = shade = hurtShade = null;
  }

  function draw(w: World): void {
    if (!roomLayer || roomOf !== w.room) {
      roomLayer = buildRoom(w.room);
      roomOf = w.room;
      pillars = [];
      w.room.tiles.forEach((row, ty) => {
        for (let tx = 0; tx < row.length; tx++) if (row[tx] === 'o') pillars.push({ pillar: true, x: (tx + 0.5) * T, y: (ty + 1) * T, r: 0 });
      });
    }
    if (!shade || !hurtShade) {
      shade = buildShade(THEME.charcoal, 0.2, 0.7);
      hurtShade = buildShade(THEME.blood, 0.35, 0.85);
    }
    const sx = w.shake ? Math.sin(w.time * 97) * w.shake : 0;
    const sy = w.shake ? Math.cos(w.time * 89) * w.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = THEME.charcoal;
    ctx.fillRect(0, 0, pw, ph);
    ctx.drawImage(roomLayer, sx * scale, sy * scale);
    ctx.setTransform(scale, 0, 0, scale, ox + sx * scale, oy + sy * scale);

    for (const e of w.enemies) drawDanger(e);
    for (const c of w.corpses) drawCorpse(c);
    order.length = 0;
    order.push(w.player);
    for (const e of w.enemies) order.push(e);
    for (const p of pillars) order.push(p);
    // Ordena pela base (pés); colunas têm r = 0 e y já na base.
    order.sort((a, b) => a.y + a.r - (b.y + b.r));
    for (const b of order) if (!('pillar' in b)) drawShadow(b.x, b.y + b.r, b.r);
    for (const b of order) {
      if (b === w.player) drawPlayer(w.player, w);
      else if ('pillar' in b) drawPillar(ctx, b.x, b.y);
      else drawEnemy(b as Enemy, w);
    }
    if (w.player.swing) drawSlash(w.player, w.player.swing);
    drawParticles(w.particles);
    for (const e of w.enemies) if (e.state === 'windup') drawAlert(e, w.time);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(shade, 0, 0);
    if (w.player.flash > 0) {
      ctx.globalAlpha = Math.min(1, w.player.flash * 3);
      ctx.drawImage(hurtShade, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- cenário (camada estática) ----------

  function buildRoom(room: Room): HTMLCanvasElement {
    const c = makeCanvas(pw, ph);
    const g = c.getContext('2d')!;
    g.setTransform(scale, 0, 0, scale, ox, oy);
    const floor = images.floor;
    if (floor) {
      for (let y = 0; y < VH; y += FLOOR_TILE) for (let x = 0; x < VW; x += FLOOR_TILE) g.drawImage(floor, x, y, FLOOR_TILE, FLOOR_TILE);
    } else {
      g.fillStyle = THEME.stone;
      g.fillRect(0, 0, VW, VH);
      g.strokeStyle = THEME.ivory;
      g.globalAlpha = 0.07;
      g.lineWidth = 1;
      g.beginPath();
      for (let y = 0; y <= VH; y += T) { g.moveTo(0, y); g.lineTo(VW, y); }
      for (let y = 0; y < VH; y += T) for (let x = (y / T) % 2 ? T : 0; x <= VW; x += 2 * T) { g.moveTo(x, y); g.lineTo(x, y + T); }
      g.stroke();
      g.globalAlpha = 1;
    }
    // Sombra hachurada no piso junto às paredes (oclusão em estilo de gravura).
    for (let ty = 0; ty < room.rows; ty++) {
      for (let tx = 0; tx < room.cols; tx++) {
        if (room.tiles[ty][tx] !== '.') continue;
        const up = room.tiles[ty - 1]?.[tx] !== '.', left = room.tiles[ty][tx - 1] !== '.', right = room.tiles[ty][tx + 1] !== '.';
        if (up) hatch(g, tx * T, ty * T, T, T * 0.45, 4, 0.45);
        if (left) hatch(g, tx * T, ty * T, T * 0.3, T, 4, 0.3);
        if (right) hatch(g, tx * T + T * 0.7, ty * T, T * 0.3, T, 4, 0.3);
      }
    }
    // Paredes: face da parede do fundo (vista 3/4) e topo das demais.
    const wall = images.wall;
    for (let ty = 0; ty < room.rows; ty++) {
      for (let tx = 0; tx < room.cols; tx++) {
        const ch = room.tiles[ty][tx];
        if (ch === '#') {
          const face = room.tiles[ty + 1]?.[tx] === '.' || (ty < 3 && room.tiles[3]?.[tx] === '.');
          drawWallTile(g, tx * T, ty * T, face, wall);
        }
      }
    }
    // Rodapé da parede do fundo e aresta interna das laterais.
    g.strokeStyle = THEME.ivory;
    g.globalAlpha = 0.35;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let ty = 0; ty < room.rows; ty++) {
      for (let tx = 0; tx < room.cols; tx++) {
        if (room.tiles[ty][tx] !== '#') continue;
        if (room.tiles[ty + 1]?.[tx] === '.') { g.moveTo(tx * T, (ty + 1) * T); g.lineTo((tx + 1) * T, (ty + 1) * T); }
        if (room.tiles[ty][tx + 1] === '.') { g.moveTo((tx + 1) * T, ty * T); g.lineTo((tx + 1) * T, (ty + 1) * T); }
        if (room.tiles[ty][tx - 1] === '.') { g.moveTo(tx * T, ty * T); g.lineTo(tx * T, (ty + 1) * T); }
        if (room.tiles[ty - 1]?.[tx] === '.') { g.moveTo(tx * T, ty * T); g.lineTo((tx + 1) * T, ty * T); }
      }
    }
    g.stroke();
    g.globalAlpha = 1;
    // Parede do fundo: vitrais quebrados e a porta selada no centro.
    const wallBottom = 3 * T;
    for (const fx of [0.16, 0.34, 0.66, 0.84]) drawProp(g, PROP.window, VW * fx, wallBottom - 4, 86);
    drawProp(g, PROP.doorClosed, VW / 2, wallBottom + 3, 98);
    return c;
  }

  /** Desenha um quadro da folha de props com a base em (x, bottom); células são quadradas. */
  function drawProp(g: CanvasRenderingContext2D, frame: number, x: number, bottom: number, size: number): boolean {
    const img = images.props;
    if (!img) return false;
    const def = ART.props;
    g.drawImage(img, frame * def.frameW, 0, def.frameW, def.frameH, x - size / 2, bottom - size, size, size);
    return true;
  }

  function drawWallTile(g: CanvasRenderingContext2D, x: number, y: number, face: boolean, tex: CanvasImageSource | undefined): void {
    if (tex) {
      const k = ART.wall.width / WALL_TILE;
      g.drawImage(tex, (x % WALL_TILE) * k, (y % WALL_TILE) * k, T * k, T * k, x, y, T, T);
    } else {
      g.fillStyle = face ? THEME.stone : THEME.stoneDark;
      g.fillRect(x, y, T, T);
    }
    if (face && !tex) {
      // Fiadas de tijolo na face visível.
      g.strokeStyle = THEME.charcoal;
      g.globalAlpha = 0.55;
      g.lineWidth = 1;
      g.beginPath();
      for (let r = 0; r < 4; r++) {
        const yy = y + r * (T / 4);
        g.moveTo(x, yy); g.lineTo(x + T, yy);
        const off = (r + x / T) % 2 ? T / 2 : 0;
        g.moveTo(x + off, yy); g.lineTo(x + off, yy + T / 4);
      }
      g.stroke();
      g.globalAlpha = 1;
    } else if (!face) {
      // Topo das paredes laterais/inferior: mais escuro que a face, para ler como altura.
      g.fillStyle = THEME.charcoal;
      g.globalAlpha = tex ? 0.55 : 0.25;
      g.fillRect(x, y, T, T);
      g.globalAlpha = 1;
      hatch(g, x, y, T, T, 5, 0.25);
    }
  }

  /** Coluna com a base em (cx, base): sprite da folha de props ou desenho provisório. */
  function drawPillar(g: CanvasRenderingContext2D, cx: number, base: number): void {
    g.fillStyle = THEME.charcoal;
    g.globalAlpha = 0.5;
    g.beginPath();
    g.ellipse(cx + 4, base - 4, T * 0.75, T * 0.32, 0, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    if (drawProp(g, PROP.column, cx, base + 6, 72)) return;
    const x = cx - T / 2, y = base - T, cy = y + T / 2;
    g.fillStyle = THEME.stoneDark;
    g.fillRect(x + 2, y + 2, T - 4, T - 4);
    g.fillStyle = THEME.stone;
    g.beginPath();
    g.arc(cx, cy - 4, T * 0.4, 0, TAU);
    g.fill();
    g.strokeStyle = THEME.ivory;
    g.globalAlpha = 0.5;
    g.lineWidth = 1.2;
    g.stroke();
    g.globalAlpha = 1;
    hatch(g, x + 2, y + T / 2, T - 4, T / 2 - 2, 3, 0.5);
  }

  function hatch(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gap: number, alpha: number): void {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.strokeStyle = THEME.charcoal;
    g.globalAlpha = alpha;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = -h; i < w; i += gap) { g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); }
    g.stroke();
    g.restore();
  }

  function buildShade(color: string, inner: number, alpha: number): HTMLCanvasElement {
    const c = makeCanvas(pw, ph);
    const g = c.getContext('2d')!;
    const r = Math.hypot(pw, ph) / 2;
    const grad = g.createRadialGradient(pw / 2, ph / 2, r * inner, pw / 2, ph / 2, r);
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(1, rgba(color, alpha));
    g.fillStyle = grad;
    g.fillRect(0, 0, pw, ph);
    return c;
  }

  // ---------- personagens ----------

  /** Desenha um quadro da folha com os pés em (x, y). Retorna false se a imagem não carregou. */
  function drawSprite(
    id: SpriteId, frame: number, x: number, y: number, flip: boolean,
    lift = 0, tilt = 0, squash = 1, tint = THEME.ivory, tintAmt = 0,
  ): boolean {
    const img = images[id];
    if (!img) return false;
    const def = ART[id], s = HEIGHT[id] / def.frameH;
    ctx.save();
    ctx.translate(x, y - lift);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(flip ? -s : s, s * squash);
    const sxp = frame * def.frameW;
    ctx.drawImage(img, sxp, 0, def.frameW, def.frameH, -def.anchorX, -def.anchorY, def.frameW, def.frameH);
    if (tintAmt > 0) {
      ctx.globalAlpha *= Math.min(1, tintAmt);
      ctx.drawImage(tinted(id, tint), sxp, 0, def.frameW, def.frameH, -def.anchorX, -def.anchorY, def.frameW, def.frameH);
    }
    ctx.restore();
    return true;
  }

  /** Silhueta da folha numa cor só (brilho de dano / aviso), gerada uma vez. */
  function tinted(id: SpriteId, color: string): HTMLCanvasElement {
    const key = id + color;
    let c = tints.get(key);
    if (!c) {
      const def = ART[id];
      c = makeCanvas(def.frameW * def.frames.length, def.frameH);
      const g = c.getContext('2d')!;
      g.drawImage(images[id]!, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      tints.set(key, c);
    }
    return c;
  }

  function drawPlayer(p: Player, w: World): void {
    const flip = Math.cos(p.face) < 0;
    let frame = 0, lift = 0, tilt = 0, squash = 1;
    if (p.hp <= 0) {
      const k = Math.min(1, (CONFIG.defeatDelay - w.outcomeTimer) / 0.35);
      tilt = (flip ? -1 : 1) * k * 1.45;
      ctx.globalAlpha = 1 - k * 0.35;
    } else if (p.swing) frame = 2;
    else if (p.moving) {
      frame = 1;
      const t = w.time * 13;
      lift = Math.abs(Math.sin(t)) * 3;
      tilt = Math.sin(t) * 0.04;
    } else squash = 1 + Math.sin(w.time * 2.4) * 0.012;
    // Piscar durante a invulnerabilidade (GDD: estado de invulnerabilidade reconhecível).
    if (p.invuln > 0 && p.hp > 0 && Math.floor(p.invuln * 15) % 2 === 0) ctx.globalAlpha = 0.35;
    const hurt = p.flash > 0 ? p.flash / 0.25 : 0;
    if (!drawSprite('player', frame, p.x, p.y + p.r, flip, lift, tilt, squash, THEME.blood, hurt)) {
      drawPlaceholder(p.x, p.y, p.r, THEME.wine, p.face, hurt);
    }
    ctx.globalAlpha = 1;
  }

  function drawEnemy(e: Enemy, w: World): void {
    const def = CONFIG.enemies[e.kind];
    const flip = Math.cos(e.face) < 0;
    const t = w.time * 9 + e.id;
    let frame = 1, lift = 0, tilt = 0, squash = 1, x = e.x, glow = 0;
    switch (e.state) {
      case 'idle': frame = 0; squash = 1 + Math.sin(w.time * 2 + e.id) * 0.015; break;
      case 'chase': lift = Math.abs(Math.sin(t)) * 2.5; tilt = Math.sin(t) * 0.06; break;
      case 'windup': {
        const k = Math.min(1, e.t / def.windup);
        frame = 2;
        x += Math.sin(w.time * 70) * k * 1.5;
        glow = 0.2 + 0.4 * k;
        break;
      }
      case 'attack': frame = 3; break;
      case 'recover': frame = 3; squash = 0.95; break;
      case 'stagger': tilt = flip ? 0.2 : -0.2; break;
    }
    const flash = e.flash > 0 ? e.flash / 0.12 : 0;
    const drawn = drawSprite(e.kind, frame, x, e.y + e.r, flip, lift, tilt, squash,
      flash > 0 ? THEME.ivory : THEME.blood, flash > 0 ? flash : glow);
    if (!drawn) drawPlaceholder(x, e.y, e.r, THEME.bone, e.face, flash);
    if (e.hp < e.maxHp) drawPips(e.x, e.y + e.r - HEIGHT[e.kind] - 8, e.hp, e.maxHp);
  }

  function drawCorpse(c: Corpse): void {
    const k = Math.min(1, c.t / CORPSE_TIME);
    const flip = Math.cos(c.face) < 0;
    ctx.globalAlpha = 1 - k;
    if (!drawSprite(c.kind, 1, c.x, c.y + c.r, flip, 0, (flip ? -1 : 1) * k * 1.3, 1 - k * 0.3, THEME.ivory, 1 - k)) {
      drawPlaceholder(c.x, c.y, c.r, THEME.bone, c.face, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Desenho provisório (identificado) para quando a folha de sprites não carregou. */
  function drawPlaceholder(x: number, y: number, r: number, color: string, face: number, flash: number): void {
    ctx.fillStyle = flash > 0 ? THEME.ivory : color;
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - r, r * 1.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + Math.cos(face) * r * 2, y - r + Math.sin(face) * r * 2);
    ctx.stroke();
  }

  function drawShadow(x: number, y: number, r: number): void {
    ctx.fillStyle = THEME.charcoal;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPips(x: number, y: number, hp: number, max: number): void {
    const w = 6, gap = 2, total = max * w + (max - 1) * gap;
    for (let i = 0; i < max; i++) {
      const px = x - total / 2 + i * (w + gap);
      ctx.fillStyle = i < hp ? THEME.blood : THEME.charcoal;
      ctx.fillRect(px, y, w, 4);
      ctx.strokeStyle = THEME.ivory;
      ctx.lineWidth = 0.75;
      ctx.strokeRect(px, y, w, 4);
    }
  }

  // ---------- combate e efeitos ----------

  /** Área de perigo no chão: setor com hachura (não depende só da cor) e preenchimento que avança até o golpe. */
  function drawDanger(e: Enemy): void {
    if (e.state !== 'windup' && e.state !== 'attack') return;
    const d = CONFIG.enemies[e.kind];
    const k = e.state === 'windup' ? Math.min(1, e.t / d.windup) : 1;
    const a0 = e.aim - d.arc / 2, a1 = e.aim + d.arc / 2;
    ctx.save();
    sector(e.x, e.y, d.reach, a0, a1);
    ctx.fillStyle = THEME.blood;
    ctx.globalAlpha = e.state === 'attack' ? 0.5 : 0.16;
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = THEME.blood;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const R = d.reach;
    for (let i = 0; i < 4 * R; i += 7) { ctx.moveTo(e.x - R + i, e.y - R); ctx.lineTo(e.x - R + i - 2 * R, e.y + R); }
    ctx.stroke();
    sector(e.x, e.y, R * k, a0, a1);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = THEME.blood;
    ctx.fill();
    ctx.restore();
  }

  function sector(x: number, y: number, r: number, a0: number, a1: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, a0, a1);
    ctx.closePath();
  }

  /** Ícone "!" acima da cabeça durante a preparação. */
  function drawAlert(e: Enemy, time: number): void {
    const x = e.x, y = e.y + e.r - HEIGHT[e.kind] - 18, s = 7 * (1 + Math.sin(time * 18) * 0.12);
    ctx.fillStyle = THEME.blood;
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = THEME.ivory;
    ctx.fillRect(x - 1, y - s * 0.55, 2, s * 0.7);
    ctx.fillRect(x - 1, y + s * 0.3, 2, 2);
  }

  function drawSlash(p: Player, s: Swing): void {
    const a = CONFIG.player.attack;
    const sweep = Math.min(1, s.t / (a.windup + a.active));
    const fade = s.t > a.windup + a.active ? 1 - (s.t - a.windup - a.active) / a.trail : 1;
    const start = s.dir - a.arc / 2, end = start + a.arc * sweep;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85 * Math.max(0, fade);
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, a.range - 8, start, end);
    ctx.stroke();
    ctx.strokeStyle = THEME.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, a.range - 2, start, end);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(list: Particle[]): void {
    for (const q of list) {
      ctx.globalAlpha = q.life / q.max;
      ctx.fillStyle = PARTICLE_COLOR[q.kind];
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  }

  return { resize, draw };
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
