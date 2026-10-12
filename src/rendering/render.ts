import { CONFIG } from '../game/config.ts';
import { currentAttack, dangers, windupTime, type Danger } from '../game/enemies.ts';
import { TAU, mulberry32 } from '../game/math.ts';
import type { Point, Room } from '../game/room.ts';
import { CORPSE_TIME, FLOATER_TIME, type Corpse, type Enemy, type Floater, type Player, type Projectile, type World } from '../game/world.ts';
import { RARITY } from '../game/items.ts';
import { ART } from './art.gen.ts';
import { isoX, isoY, screenToWorld, worldAngleToScreen } from './iso.ts';
import { THEME } from './theme.ts';

/** Imagens já carregadas, por id do manifesto. Ausentes caem no desenho provisório. */
export type Images = Partial<Record<string, CanvasImageSource>>;
export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement;
export interface RenderSettings { reduceMotion: boolean }

export interface Renderer {
  /** Tamanho do canvas em pixels do dispositivo. */
  resize(pixelW: number, pixelH: number): void;
  draw(w: World): void;
  /** Ponto do canvas (px do dispositivo) projetado no chão do mundo. */
  toWorld(px: number, py: number): Point;
}

interface SheetDef { src: string; frameW: number; frameH: number; anchorX: number; anchorY: number; frames: readonly string[]; width: number }
const SHEETS = ART as unknown as Partial<Record<string, SheetDef>>;

const T = CONFIG.tile, VW = CONFIG.view.w, VH = CONFIG.view.h;
/** Largura de mundo visível em telas em retrato (celular em pé). */
const PORTRAIT_W = 560;
/** Altura das paredes do fundo e das muretas da frente (baixas para não esconder a luta). */
const WALL_H = 104, PARAPET_H = 12, PILLAR_H = 120;
/** Lado, em unidades de mundo, de uma repetição das texturas de piso e parede. */
const FLOOR_TILE = 8 * T, WALL_TILE = 6 * T;
/** Altura na tela da pose mais alta de cada folha. */
const HEIGHT: Record<string, number> = { hero: 104, player: 92, penitent: 92, acolyte: 98, brute: 126, angel: 210 };
const PARTICLE_COLOR = { spark: '#f3e3b8', bone: THEME.bone, blood: THEME.blood, holy: THEME.gold, ember: '#ffb347' };
const FLOATER_COLOR = { dmg: '#f3e3b8', crit: '#ffcf5a', heal: '#9fe28f', hurt: '#ff6b6b', info: THEME.gold, level: THEME.gold };
const PROP = { window: 0, doorClosed: 1, doorOpen: 2, plaque: 3, column: 4, brazier: 5, statue: 6, candelabra: 7 };
/** Tamanho (px de tela) da célula do prop isométrico desenhado sobre cada tile sólido de decoração. */
const PROP_SIZE: Record<string, number> = { o: 158, b: 84, s: 118, c: 112 };
const PROP_FRAME: Record<string, number> = { o: PROP.column, b: PROP.brazier, s: PROP.statue, c: PROP.candelabra };
/**
 * Folha de efeitos (FX-003, fundo preto, mistura aditiva). Geometria medida no quadro de 200 px:
 * centro e raio da borda externa do corte, dos anéis e o ângulo da pena (ajuste de círculo nos pixels acesos).
 * Se a arte for refeita, medir de novo.
 */
const FX = { ember: 0, feather: 1, wave: 2, impact: 3, slash: 4, fireRing: 5, shockwave: 6, motes: 7 };
const FX_SLASH = { cx: 93, cy: 104, r: 93, bisector: -0.634 };
const FX_RING = { cx: 99, cy: 105, r: 75 };
const FX_SHOCK = { cx: 102, cy: 103, r: 76 };
const FX_FEATHER_AXIS = -0.70;
const IMPACT_TIME = 0.14;
/** Posições na folha de ícones (UI-002): 8 bênçãos, cinzas, depois arma/armadura/relíquia e ações. */
export const ICON = { ash: 8, weapon: 9, armor: 10, relic: 11, attack: 12, dodge: 13, skill: 14, level: 15 };

interface Face { tx: number; ty: number; side: 'S' | 'E' }
interface Pillar { pillar: true; x: number; y: number; r: number; kind: 'o' | 'b' | 's' | 'c' }
interface Geometry {
  /** Tamanho da sala em unidades de mundo. */
  worldW: number;
  worldH: number;
  spans: { ty: number; x0: number; x1: number }[];
  back: Face[];
  backTops: { tx: number; ty: number }[];
  /** Muretas sul/leste: só a face voltada para a câmera é desenhada. */
  front: Face[];
  pillars: Pillar[];
  bounds: { x0: number; x1: number; y0: number; y1: number };
  windows: Face[];
  plaques: Face[];
  door: Face | null;
}

export function createRenderer(ctx: CanvasRenderingContext2D, makeCanvas: MakeCanvas, images: Images = {}, settings: RenderSettings = { reduceMotion: false }): Renderer {
  let pw = 1, ph = 1, scale = 1, ox = 0, oy = 0;
  let geo: Geometry | null = null, geoRoom: Room | null = null;
  let camX = 0, camY = 0, camTime = -1;
  let light: HTMLCanvasElement | null = null, hurtShade: HTMLCanvasElement | null = null;
  const tints = new Map<string, HTMLCanvasElement>();
  const order: (Player | Enemy | Pillar | Corpse)[] = [];
  const fog = Array.from({ length: 7 }, (_, i) => {
    const r = mulberry32(99 + i);
    return { x: r() * 1400 - 500, y: r() * 700, r: 160 + r() * 200, speed: 6 + r() * 10, phase: r() * TAU };
  });
  let wallShade: CanvasGradient | null = null;

  function resize(w: number, h: number): void {
    pw = Math.max(1, Math.round(w));
    ph = Math.max(1, Math.round(h));
    // Paisagem: cabe a vista de referência (960x544). Retrato: escala pela largura (mostra mais altura).
    scale = pw >= ph ? Math.min(pw / VW, ph / VH) : pw / PORTRAIT_W;
    light = hurtShade = null;
  }

  function toWorld(px: number, py: number): Point {
    return screenToWorld((px - ox) / scale, (py - oy) / scale);
  }

  function draw(w: World): void {
    if (geoRoom !== w.room || !geo) {
      geo = buildGeometry(w.room);
      geoRoom = w.room;
      camTime = -1;
    }
    if (!light || !hurtShade) {
      light = makeCanvas(Math.ceil(pw / 2), Math.ceil(ph / 2));
      hurtShade = buildVignette(THEME.blood, 0.35, 0.85);
    }
    updateCamera(w, geo);
    const shake = settings.reduceMotion ? 0 : w.shake;
    ox = pw / 2 - camX * scale + (shake ? Math.sin(w.time * 97) * shake * scale : 0);
    oy = ph / 2 - camY * scale + (shake ? Math.cos(w.time * 89) * shake * scale : 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = THEME.charcoal;
    ctx.fillRect(0, 0, pw, ph);

    drawFloor(geo);
    ground();
    for (const b of [w.player as { x: number; y: number; r: number }, ...w.enemies]) shadow(b.x, b.y, b.r);
    for (const e of w.enemies) for (const d of dangers(e)) drawDanger(d, e, w.time);
    for (const e of w.enemies) drawShockwave(e);
    if (w.player.swing) drawSlash(w.player);
    if (w.player.spin > 0) drawSkillRing(w.player);
    drawBackWalls(geo, w);
    screen();
    for (const l of w.loot) drawLoot(l, w.time);

    order.length = 0;
    for (const p of geo.pillars) order.push(p);
    for (const c of w.corpses) order.push(c);
    for (const e of w.enemies) order.push(e);
    order.push(w.player);
    order.sort((a, b) => a.x + a.y - (b.x + b.y));
    screen();
    let afterPlayer = false, occluded = false;
    for (const o of order) {
      if ('pillar' in o) drawPillar(o, w.time);
      else if ('state' in o) drawEnemy(o, w);
      else if ('kind' in o) drawCorpse(o);
      else drawPlayer(o, w);
      if (o === w.player) afterPlayer = true;
      else if (afterPlayer && !occluded) occluded = covers(o as Pillar | Enemy | Corpse, w.player);
    }
    // Jogador encoberto por algo desenhado depois (coluna, chefe): silhueta por cima, sempre legível.
    if (occluded && w.player.hp > 0) {
      ctx.globalAlpha = 0.4;
      drawPlayer(w.player, w);
      ctx.globalAlpha = 1;
    }
    for (const q of w.projectiles) drawProjectile(q, w.time);
    for (const f of w.floaters) drawImpact(f);
    drawParticles(w);
    drawFront(geo);
    drawFog(w.time);
    drawLighting(w, geo);
    screen();
    for (const e of w.enemies) {
      if (e.state === 'windup') drawAlert(e, w.time);
      if (e.hp < e.maxHp && !CONFIG.enemies[e.kind].boss) drawPips(e);
    }
    for (const f of w.floaters) drawFloater(f);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (w.player.flash > 0) {
      ctx.globalAlpha = Math.min(1, w.player.flash * (settings.reduceMotion ? 1.5 : 3));
      ctx.drawImage(hurtShade, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- transformações ----------

  /** Coordenadas de mundo no plano do chão. */
  function ground(): void {
    ctx.setTransform(scale, scale / 2, -scale, scale / 2, ox, oy);
  }

  /** Coordenadas isométricas de tela (antes da escala). */
  function screen(): void {
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  }

  /** Face vertical de parede: u ao longo da aresta (eixo x para 'S', y para 'E'), v para baixo a partir do topo. */
  function face(f: { tx: number; ty: number; side: 'S' | 'E' }, h: number): void {
    const ax = f.side === 'S' ? f.tx * T : (f.tx + 1) * T, ay = f.side === 'S' ? (f.ty + 1) * T : f.ty * T;
    const e = ox + scale * isoX(ax, ay), fy = oy + scale * isoY(ax, ay, h);
    if (f.side === 'S') ctx.setTransform(scale, scale / 2, 0, scale, e, fy);
    else ctx.setTransform(-scale, scale / 2, 0, scale, e, fy);
  }

  function updateCamera(w: World, g: Geometry): void {
    const p = w.player, tx = isoX(p.x, p.y), ty = isoY(p.x, p.y, 36);
    if (camTime < 0 || w.time < camTime) {
      camX = tx;
      camY = ty;
    } else {
      const a = 1 - Math.exp(-7 * Math.min(0.1, w.time - camTime));
      camX += (tx - camX) * a;
      camY += (ty - camY) * a;
    }
    camTime = w.time;
    const hw = pw / scale / 2, hh = ph / scale / 2, b = g.bounds;
    camX = b.x1 - b.x0 <= 2 * hw ? (b.x0 + b.x1) / 2 : Math.min(b.x1 - hw, Math.max(b.x0 + hw, camX));
    camY = b.y1 - b.y0 <= 2 * hh ? (b.y0 + b.y1) / 2 : Math.min(b.y1 - hh, Math.max(b.y0 + hh, camY));
  }

  // ---------- cenário ----------

  function buildGeometry(room: Room): Geometry {
    const floor = (tx: number, ty: number) => room.tiles[ty]?.[tx] === '.';
    const spans: Geometry['spans'] = [], back: Face[] = [], backTops: Geometry['backTops'] = [], front: Face[] = [], pillars: Pillar[] = [];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let ty = 0; ty < room.rows; ty++) {
      let start = -1;
      for (let tx = 0; tx <= room.cols; tx++) {
        if (tx < room.cols && floor(tx, ty)) {
          if (start < 0) start = tx;
          for (const [cx, cy] of [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]]) {
            x0 = Math.min(x0, isoX(cx * T, cy * T)); x1 = Math.max(x1, isoX(cx * T, cy * T));
            y0 = Math.min(y0, isoY(cx * T, cy * T, WALL_H)); y1 = Math.max(y1, isoY(cx * T, cy * T));
          }
        } else if (start >= 0) {
          spans.push({ ty, x0: start, x1: tx });
          start = -1;
        }
      }
    }
    for (let ty = 0; ty < room.rows; ty++) {
      for (let tx = 0; tx < room.cols; tx++) {
        const ch = room.tiles[ty][tx];
        if (ch === 'o' || ch === 'b' || ch === 's' || ch === 'c') {
          pillars.push({ pillar: true, x: (tx + 0.5) * T, y: (ty + 0.5) * T, r: 0, kind: ch });
          continue;
        }
        if (ch !== '#') continue;
        const s = floor(tx, ty + 1), e = floor(tx + 1, ty), n = floor(tx, ty - 1), wst = floor(tx - 1, ty);
        if (s) back.push({ tx, ty, side: 'S' });
        if (e) back.push({ tx, ty, side: 'E' });
        if (n) front.push({ tx, ty, side: 'S' });
        if (wst) front.push({ tx, ty, side: 'E' });
        if (!n && !wst && (s || e || floor(tx + 1, ty + 1) || floor(tx - 1, ty + 1) || floor(tx + 1, ty - 1))) backTops.push({ tx, ty });
      }
    }
    back.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
    backTops.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
    front.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
    // Vitrais e porta na parede norte; vitrais também na oeste.
    const mid = Math.floor(room.cols / 2) - 1;
    const northRow = back.filter((f) => f.side === 'S');
    const westCol = back.filter((f) => f.side === 'E');
    const windows = northRow.filter((f) => [4, 9, 19, 24].includes(f.tx));
    for (const f of westCol) if (f.ty === 5 || f.ty === 12) windows.push(f);
    const plaques = westCol.filter((f) => f.ty === 8);
    const door = northRow.find((f) => f.tx === mid) ?? null;
    return {
      worldW: room.cols * T, worldH: room.rows * T, spans, back, backTops, front, pillars, windows, plaques, door,
      bounds: { x0: x0 - 40, x1: x1 + 40, y0: y0 - 20, y1: y1 + 40 },
    };
  }

  function drawFloor(g: Geometry): void {
    ground();
    ctx.save();
    ctx.beginPath();
    for (const s of g.spans) ctx.rect(s.x0 * T, s.ty * T, (s.x1 - s.x0) * T, T);
    ctx.clip();
    const tex = images.floor;
    if (tex) {
      for (let y = 0; y < g.worldH; y += FLOOR_TILE) for (let x = 0; x < g.worldW; x += FLOOR_TILE) ctx.drawImage(tex, x, y, FLOOR_TILE, FLOOR_TILE);
    } else {
      ctx.fillStyle = THEME.stone;
      ctx.fillRect(0, 0, g.worldW, g.worldH);
    }
    // Penumbra junto às paredes do fundo (norte e oeste): profundidade sem custo de luz.
    const gn = ctx.createLinearGradient(0, 3 * T, 0, 6 * T);
    gn.addColorStop(0, 'rgba(8,8,12,0.55)');
    gn.addColorStop(1, 'rgba(8,8,12,0)');
    ctx.fillStyle = gn;
    ctx.fillRect(0, 3 * T, g.worldW, 3 * T);
    const gw = ctx.createLinearGradient(T, 0, 4 * T, 0);
    gw.addColorStop(0, 'rgba(8,8,12,0.5)');
    gw.addColorStop(1, 'rgba(8,8,12,0)');
    ctx.fillStyle = gw;
    ctx.fillRect(T, 0, 3 * T, g.worldH);
    ctx.restore();
  }

  function wallTexture(f: Face, h: number, dark: number): void {
    const tex = images.wall, along = f.side === 'S' ? f.tx * T : f.ty * T;
    if (tex) {
      const k = (SHEETS.wall?.width ?? 384) / WALL_TILE;
      // A base da face cai logo abaixo da moldura entalhada da textura (~80% da altura).
      const v0 = Math.max(0, 0.8 * WALL_TILE - h);
      ctx.drawImage(tex, (along % WALL_TILE) * k, v0 * k, T * k, h * k, 0, 0, T, h);
    } else {
      ctx.fillStyle = THEME.stone;
      ctx.fillRect(0, 0, T, h);
    }
    if (!wallShade) {
      wallShade = ctx.createLinearGradient(0, 0, 0, WALL_H);
      wallShade.addColorStop(0, 'rgba(10,10,16,0.15)');
      wallShade.addColorStop(1, 'rgba(10,10,16,0.6)');
    }
    ctx.fillStyle = wallShade;
    ctx.fillRect(0, 0, T, h);
    if (dark) {
      ctx.fillStyle = `rgba(6,6,10,${dark})`;
      ctx.fillRect(0, 0, T, h);
    }
  }

  function drawBackWalls(g: Geometry, w: World): void {
    for (const f of g.back) {
      face(f, WALL_H);
      wallTexture(f, WALL_H, f.side === 'E' ? 0.28 : 0.1);
    }
    // Decoração nas faces: vitrais e a porta (aberta quando a sala foi limpa).
    for (const f of g.windows) {
      face(f, WALL_H);
      drawPropOnFace(PROP.window, T, WALL_H - 10, 92); // centrado na junção com o tile seguinte: vitral de 2 tiles
    }
    for (const f of g.plaques) {
      face(f, WALL_H);
      drawPropOnFace(PROP.plaque, T, WALL_H - 22, 58);
    }
    if (g.door) {
      face(g.door, WALL_H);
      const open = w.phase === 'exit';
      drawPropOnFace(open ? PROP.doorOpen : PROP.doorClosed, T * 1.0, WALL_H + 4, 104);
      if (open) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(w.time * 4);
        ctx.fillStyle = THEME.gold;
        ctx.fillRect(T * 0.3, WALL_H - 70, T * 1.4, 70);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    screen();
    for (const t of g.backTops) drawTop(t.tx, t.ty, WALL_H, THEME.ink);
  }

  /** Quadro da folha de props desenhado na face atual (coordenadas locais da face). */
  function drawPropOnFace(frame: number, centerU: number, bottomV: number, size: number): void {
    const img = images.props, def = SHEETS.props;
    if (!img || !def) return;
    ctx.drawImage(img, frame * def.frameW, 0, def.frameW, def.frameH, centerU - size / 2, bottomV - size, size, size);
  }

  function drawTop(tx: number, ty: number, h: number, color: string): void {
    const pts: [number, number][] = [[tx * T, ty * T], [(tx + 1) * T, ty * T], [(tx + 1) * T, (ty + 1) * T], [tx * T, (ty + 1) * T]];
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(isoX(x, y), isoY(x, y, h)) : ctx.moveTo(isoX(x, y), isoY(x, y, h))));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,220,192,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function drawFront(g: Geometry): void {
    for (const f of g.front) {
      face(f, PARAPET_H);
      wallTexture(f, PARAPET_H, f.side === 'E' ? 0.45 : 0.3);
      screen();
      drawTop(f.tx, f.ty, PARAPET_H, THEME.stoneDark);
    }
  }

  /** O retângulo de tela de `o` (desenhado depois) cobre o corpo do jogador? */
  function covers(o: Pillar | Enemy | Corpse, p: Player): boolean {
    const h = 'pillar' in o ? PROP_SIZE[o.kind] * 0.85 : HEIGHT[o.kind] ?? 90;
    const halfW = 'pillar' in o ? PROP_SIZE[o.kind] * 0.3 : h * 0.35;
    const ox = isoX(o.x, o.y), oy = isoY(o.x, o.y), px = isoX(p.x, p.y), py = isoY(p.x, p.y);
    return Math.abs(ox - px) < halfW + 18 && py - 80 < oy && py > oy - h;
  }

  /** Coluna, braseiro, estátua ou candelabro: sprite isométrico da folha de props, base no tile. */
  function drawPillar(p: Pillar, time: number): void {
    const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
    const img = images.props, def = SHEETS.props;
    if (img && def) {
      const size = PROP_SIZE[p.kind];
      ctx.drawImage(img, PROP_FRAME[p.kind] * def.frameW, 0, def.frameW, def.frameH, sx - size / 2, sy + 14 - size, size, size);
      if (p.kind === 'b') drawFlame(sx, sy - size * 0.55, time, 0.8);
      if (p.kind === 'c') drawFlame(sx, sy - size * 0.78, time, 0.35);
      return;
    }
    if (p.kind === 'b' || p.kind === 'c') {
      drawBrazier(sx, sy, time);
      return;
    }
    const tx = p.x / T - 0.5, ty = p.y / T - 0.5;
    for (const side of ['S', 'E'] as const) {
      face({ tx, ty, side }, PILLAR_H);
      wallTexture({ tx, ty, side }, PILLAR_H, side === 'E' ? 0.35 : 0.1);
    }
    screen();
    drawTop(tx, ty, PILLAR_H, THEME.stone);
  }

  /** Chama tremulante aditiva sobre o fogo pintado do sprite (dá vida à imagem estática). */
  function drawFlame(x: number, y: number, time: number, size: number): void {
    const f = settings.reduceMotion ? 1 : 1 + Math.sin(time * 13 + x) * 0.1 + Math.sin(time * 7.3 + y) * 0.07;
    ctx.globalCompositeOperation = 'lighter';
    const r = 30 * size * f;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,200,110,0.55)');
    grad.addColorStop(0.5, 'rgba(255,120,40,0.25)');
    grad.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Braseiro provisório (sem a folha de props): tripé de ferro com chama tremulante. */
  function drawBrazier(sx: number, sy: number, time: number): void {
    ctx.strokeStyle = '#2a2622';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy + 4); ctx.lineTo(sx - 4, sy - 30);
    ctx.moveTo(sx + 12, sy + 4); ctx.lineTo(sx + 4, sy - 30);
    ctx.moveTo(sx, sy + 8); ctx.lineTo(sx, sy - 30);
    ctx.stroke();
    ctx.fillStyle = '#3a332c';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 34, 18, 8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = THEME.gold;
    ctx.lineWidth = 1;
    ctx.stroke();
    const f = settings.reduceMotion ? 1 : 1 + Math.sin(time * 13) * 0.08 + Math.sin(time * 7.3) * 0.06;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,140,40,0.85)';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 44 * f, 11, 16 * f, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,140,0.9)';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 40, 5, 9 * f, 0, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function buildVignette(color: string, inner: number, alpha: number): HTMLCanvasElement {
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

  // ---------- luz e atmosfera ----------

  function drawFog(time: number): void {
    screen();
    for (const f of fog) {
      const x = f.x + Math.sin(time * 0.05 * f.speed + f.phase) * 60, y = f.y + Math.cos(time * 0.04 * f.speed + f.phase) * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, f.r);
      grad.addColorStop(0, 'rgba(120,135,160,0.10)');
      grad.addColorStop(1, 'rgba(120,135,160,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
    }
  }

  /** Escuridão ambiente com "furos" de luz (braseiros, jogador, projéteis) e brilho quente aditivo. */
  function drawLighting(w: World, g: Geometry): void {
    if (!light) return;
    const lg = light.getContext('2d')!, lw = light.width, lh = light.height, k = 0.5;
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, lw, lh);
    lg.fillStyle = 'rgba(6,8,16,0.5)';
    lg.fillRect(0, 0, lw, lh);
    lg.globalCompositeOperation = 'destination-out';
    const flick = settings.reduceMotion ? 0 : Math.sin(w.time * 11) * 0.04;
    const hole = (x: number, y: number, z: number, r: number, a: number) => {
      const cx = (ox + scale * isoX(x, y)) * k, cy = (oy + scale * isoY(x, y, z)) * k, rr = r * scale * k;
      const grad = lg.createRadialGradient(cx, cy, 0, cx, cy, rr);
      grad.addColorStop(0, `rgba(0,0,0,${a})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = grad;
      lg.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    };
    hole(w.player.x, w.player.y, 30, 190, 0.85);
    for (const p of g.pillars) {
      if (p.kind === 'b') hole(p.x, p.y, 40, 260 * (1 + flick), 1);
      else if (p.kind === 'c') hole(p.x, p.y, 60, 150 * (1 + flick), 0.85);
    }
    if (w.player.spin > 0) hole(w.player.x, w.player.y, 20, 220, 1);
    for (const l of w.loot) hole(l.x, l.y, 10, 60 + 20 * l.item.rarity, 0.7);
    for (const q of w.projectiles) hole(q.x, q.y, 26, 70, 0.7);
    for (const e of w.enemies) if (CONFIG.enemies[e.kind].boss) hole(e.x, e.y, 80, 160, 0.6);
    if (g.door && w.phase === 'exit') hole((g.door.tx + 1) * T, (g.door.ty + 1) * T, 40, 150, 0.9);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(light, 0, 0, pw, ph);
    // Brilho quente aditivo nas fontes de fogo.
    ctx.globalCompositeOperation = 'lighter';
    screen();
    for (const p of g.pillars) {
      if (p.kind !== 'b' && p.kind !== 'c') continue;
      const x = isoX(p.x, p.y), y = isoY(p.x, p.y, 40), r = (p.kind === 'b' ? 130 : 80) * (1 + flick);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,150,60,0.22)');
      grad.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- personagens ----------

  /** Desenha um quadro da folha com os pés no ponto de mundo (x, y). Retorna false se não carregou. */
  function drawSprite(
    id: string, frame: number, x: number, y: number, flip: boolean,
    lift = 0, tilt = 0, squash = 1, tint = THEME.ivory, tintAmt = 0,
  ): boolean {
    const img = images[id], def = SHEETS[id];
    if (!img || !def) return false;
    const s = (HEIGHT[id] ?? 96) / def.frameH;
    ctx.save();
    ctx.translate(isoX(x, y), isoY(x, y, lift));
    if (tilt) ctx.rotate(tilt);
    ctx.scale(flip ? -s : s, s * squash);
    const sx = frame * def.frameW;
    ctx.drawImage(img, sx, 0, def.frameW, def.frameH, -def.anchorX, -def.anchorY, def.frameW, def.frameH);
    if (tintAmt > 0) {
      ctx.globalAlpha *= Math.min(1, tintAmt);
      ctx.drawImage(tinted(id, tint), sx, 0, def.frameW, def.frameH, -def.anchorX, -def.anchorY, def.frameW, def.frameH);
    }
    ctx.restore();
    return true;
  }

  /** Silhueta da folha numa cor só (brilho de dano / aviso), gerada uma vez. */
  function tinted(id: string, color: string): HTMLCanvasElement {
    const key = id + color;
    let c = tints.get(key);
    if (!c) {
      const def = SHEETS[id]!;
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
    const { u, v } = worldAngleToScreen(p.dodge > 0 ? p.dodgeDir : p.face);
    const flip = u < 0, back = v < -0.12;
    let pose = 0, lift = 0, tilt = 0, squash = 1;
    if (p.hp <= 0) {
      const k = Math.min(1, (CONFIG.defeatDelay - w.outcomeTimer) / 0.35);
      tilt = (flip ? -1 : 1) * k * 1.45;
      ctx.globalAlpha = 1 - k * 0.35;
    } else if (p.dodge > 0) pose = 3;
    else if (p.swing) pose = 2;
    else if (p.moving) {
      pose = 1;
      const t = w.time * 13;
      lift = Math.abs(Math.sin(t)) * 3;
      tilt = Math.sin(t) * 0.03;
    } else squash = 1 + Math.sin(w.time * 2.4) * 0.012;
    if (p.dodge > 0) drawAfterimages(p, back, flip);
    // Piscar durante a invulnerabilidade (GDD: estado de invulnerabilidade reconhecível).
    if (p.invuln > 0 && p.hp > 0 && Math.floor(p.invuln * 15) % 2 === 0) ctx.globalAlpha = 0.35;
    const hurt = p.flash > 0 ? p.flash / 0.25 : 0;
    const drawn = images.hero
      ? drawSprite('hero', (back ? 4 : 0) + pose, p.x, p.y, flip, lift, tilt, squash, THEME.blood, hurt)
      : drawSprite('player', pose, p.x, p.y, flip, lift, tilt, squash, THEME.blood, hurt);
    if (!drawn) drawPlaceholder(p.x, p.y, p.r, THEME.wine, hurt);
    ctx.globalAlpha = 1;
  }

  /** Rastro fantasmagórico da esquiva (FX-002, discreto). */
  function drawAfterimages(p: Player, back: boolean, flip: boolean): void {
    if (!images.hero) return;
    for (let i = 1; i <= 3; i++) {
      const d = i * 16;
      ctx.globalAlpha = 0.18 / i;
      drawSprite('hero', (back ? 4 : 0) + 3, p.x - Math.cos(p.dodgeDir) * d, p.y - Math.sin(p.dodgeDir) * d, flip, 0, 0, 1, THEME.ivory, 0.8);
    }
    ctx.globalAlpha = 1;
  }

  /** Quadro da folha de cada inimigo conforme o estado (e o tipo de ataque, no chefe). */
  function enemyFrame(e: Enemy): number {
    const atk = currentAttack(e).kind;
    switch (e.kind) {
      case 'brute': return e.state === 'windup' ? 1 : e.state === 'act' ? 2 : e.state === 'stun' ? 3 : 0;
      case 'angel': return e.state === 'windup' ? (atk === 'volley' ? 3 : 1) : e.state === 'act' ? (atk === 'volley' ? 3 : 2) : 0;
      default: return e.state === 'idle' ? 0 : e.state === 'windup' ? 2 : e.state === 'act' || e.state === 'recover' ? 3 : 1;
    }
  }

  function drawEnemy(e: Enemy, w: World): void {
    const { u } = worldAngleToScreen(e.face);
    const flip = u < 0, t = w.time * 9 + e.id, boss = CONFIG.enemies[e.kind].boss;
    const frame = enemyFrame(e);
    let lift = boss ? 10 + Math.sin(w.time * 2) * 5 : 0, tilt = 0, squash = 1, x = e.x, glow = 0;
    switch (e.state) {
      case 'idle': squash = 1 + Math.sin(w.time * 2 + e.id) * 0.015; break;
      case 'chase': if (!boss) { lift = Math.abs(Math.sin(t)) * 2.5; tilt = Math.sin(t) * 0.05; } break;
      case 'windup': {
        const k = Math.min(1, e.t / windupTime(e));
        if (!settings.reduceMotion) x += Math.sin(w.time * 70) * k * 1.5;
        glow = 0.2 + 0.4 * k;
        break;
      }
      case 'recover': squash = 0.95; break;
      case 'stagger': tilt = flip ? 0.2 : -0.2; break;
      case 'stun': tilt = Math.sin(w.time * 6) * 0.08; break;
    }
    const flash = e.flash > 0 ? e.flash / 0.12 : 0;
    // Surgindo de uma onda: sobe do chão em silhueta vermelha (aviso antes de poder agir).
    const rising = e.spawn > 0 ? e.spawn / CONFIG.run.spawnTime : 0;
    if (rising > 0) {
      ctx.globalAlpha = 1 - rising * 0.7;
      lift -= rising * 30;
      glow = 1;
    }
    const drawn = drawSprite(e.kind, frame, x, e.y, flip, lift, tilt, squash, flash > 0 ? THEME.ivory : THEME.blood, flash > 0 ? flash : glow);
    ctx.globalAlpha = 1;
    if (!drawn) drawPlaceholder(x, e.y, e.r, e.kind === 'angel' ? THEME.gold : THEME.bone, flash);
    if (e.state === 'stun') drawStunStars(e, w.time);
  }

  function drawCorpse(c: Corpse): void {
    const k = Math.min(1, c.t / CORPSE_TIME);
    const flip = worldAngleToScreen(c.face).u < 0;
    ctx.globalAlpha = 1 - k;
    if (!drawSprite(c.kind, 1, c.x, c.y, flip, 0, (flip ? -1 : 1) * k * 1.3, 1 - k * 0.3, THEME.ivory, 1 - k)) {
      drawPlaceholder(c.x, c.y, c.r, THEME.bone, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Desenho provisório (identificado) para quando a folha de sprites não carregou. */
  function drawPlaceholder(x: number, y: number, r: number, color: string, flash: number): void {
    const sx = isoX(x, y), sy = isoY(x, y);
    ctx.fillStyle = flash > 0 ? THEME.ivory : color;
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy - r * 2.2, r * 1.2, r * 2.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  function shadow(x: number, y: number, r: number): void {
    ctx.fillStyle = 'rgba(5,5,8,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r * 1.6, 0, 0, TAU);
    ctx.fill();
  }

  function drawPips(e: Enemy): void {
    const max = e.maxHp, w = Math.min(6, 60 / max), gap = 1.5, total = max * w + (max - 1) * gap;
    const x = isoX(e.x, e.y), y = isoY(e.x, e.y) - (HEIGHT[e.kind] ?? 90) - 10;
    for (let i = 0; i < max; i++) {
      const px = x - total / 2 + i * (w + gap);
      ctx.fillStyle = i < e.hp ? THEME.blood : THEME.charcoal;
      ctx.fillRect(px, y, w, 4);
      ctx.strokeStyle = THEME.ivory;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(px, y, w, 4);
    }
  }

  function drawStunStars(e: Enemy, time: number): void {
    const x = isoX(e.x, e.y), y = isoY(e.x, e.y) - (HEIGHT[e.kind] ?? 90) - 4;
    ctx.fillStyle = THEME.gold;
    for (let i = 0; i < 3; i++) {
      const a = time * 5 + (i * TAU) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 5, 2.5, 0, TAU);
      ctx.fill();
    }
  }

  // ---------- combate e efeitos ----------

  /** Área de perigo no chão: hachura (não depende só da cor) e preenchimento que avança até o golpe. */
  function drawDanger(d: Danger, e: Enemy, time: number): void {
    const k = e.state === 'windup' ? Math.min(1, e.t / windupTime(e)) : 1;
    const active = e.state === 'act';
    ctx.save();
    dangerPath(d, 1);
    ctx.fillStyle = THEME.blood;
    ctx.globalAlpha = active ? 0.5 : 0.18 + 0.06 * Math.sin(time * 12);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#e0303f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = THEME.ivory;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const R = 'radius' in d ? d.radius : d.length;
    for (let i = -2 * R; i < 2 * R; i += 9) {
      ctx.moveTo(d.x + i, d.y - 2 * R);
      ctx.lineTo(d.x + i + 4 * R, d.y + 2 * R);
    }
    ctx.stroke();
    if (!active) {
      dangerPath(d, k);
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = THEME.blood;
      ctx.fill();
    }
    ctx.restore();
  }

  function dangerPath(d: Danger, k: number): void {
    ctx.beginPath();
    if (d.shape === 'sector') {
      ctx.moveTo(d.x, d.y);
      ctx.arc(d.x, d.y, d.radius * k, d.dir - d.arc / 2, d.dir + d.arc / 2);
      ctx.closePath();
    } else if (d.shape === 'circle') {
      ctx.arc(d.x, d.y, d.radius * k, 0, TAU);
    } else {
      const c = Math.cos(d.dir), s = Math.sin(d.dir), hw = d.width / 2, len = d.length * k;
      ctx.moveTo(d.x - s * hw, d.y + c * hw);
      ctx.lineTo(d.x - s * hw + c * len, d.y + c * hw + s * len);
      ctx.lineTo(d.x + s * hw + c * len, d.y - c * hw + s * len);
      ctx.lineTo(d.x + s * hw, d.y - c * hw);
      ctx.closePath();
    }
  }

  /** Ícone "!" acima da cabeça durante a preparação. */
  function drawAlert(e: Enemy, time: number): void {
    const x = isoX(e.x, e.y), y = isoY(e.x, e.y) - (HEIGHT[e.kind] ?? 90) - 18, s = 8 * (1 + Math.sin(time * 18) * 0.12);
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

  /** Rastro do golpe no chão: mostra exatamente o alcance e a abertura que acertam, no formato da arma. */
  function drawSlash(p: Player): void {
    const s = p.swing!, st = p.stats, range = st.range, hitEnd = st.windup + st.active;
    const sweep = Math.min(1, s.t / hitEnd);
    const fade = Math.max(0, s.t > hitEnd ? 1 - (s.t - hitEnd) / st.trail : 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9 * fade;
    if (CONFIG.weapons[st.weapon].shape === 'thrust') {
      // Estoque: lâmina de luz que avança em linha até a ponta do alcance.
      const len = range * (0.3 + 0.7 * sweep), c = Math.cos(s.dir), n = Math.sin(s.dir), hw = 8;
      ctx.strokeStyle = 'rgba(255,170,90,0.45)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(p.x + c * 10, p.y + n * 10);
      ctx.lineTo(p.x + c * len, p.y + n * len);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,214,140,0.85)';
      ctx.beginPath();
      ctx.moveTo(p.x - n * hw, p.y + c * hw);
      ctx.lineTo(p.x + c * len, p.y + n * len);
      ctx.lineTo(p.x + n * hw, p.y - c * hw);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = THEME.ivory;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x + c * 10, p.y + n * 10);
      ctx.lineTo(p.x + c * len, p.y + n * len);
      ctx.stroke();
    } else {
      // Espada e Montante: arco; o Montante é mais largo, grosso e em brasa.
      const heavy = st.weapon === 'greatsword', start = s.dir - st.arc / 2, end = start + st.arc * sweep;
      if (images.fx) {
        // Corte pintado, recortado ao setor já varrido: cobre exatamente a área que acerta.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, range + 8, start, end);
        ctx.closePath();
        ctx.clip();
        const k = range / FX_SLASH.r, rot = s.dir - FX_SLASH.bisector;
        drawFx(FX.slash, p.x, p.y, rot, k, fade, FX_SLASH.cx, FX_SLASH.cy);
        if (heavy) drawFx(FX.fireRing, p.x, p.y, rot, (range - 8) / FX_RING.r, 0.7 * fade, FX_RING.cx, FX_RING.cy);
        ctx.restore();
      } else {
        ctx.strokeStyle = heavy ? 'rgba(255,140,60,0.9)' : 'rgba(255,214,140,0.9)';
        ctx.lineWidth = heavy ? 16 : 9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, range - (heavy ? 14 : 10), start, end);
        ctx.stroke();
      }
      ctx.strokeStyle = THEME.ivory;
      ctx.lineWidth = heavy ? 3 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, range - 2, start, end);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Ira Flamejante: anel de fogo que se expande no chão até o raio de dano. */
  function drawSkillRing(p: Player): void {
    const sk = CONFIG.player.skill, k = 1 - p.spin / sk.duration, r = sk.radius * (0.35 + 0.65 * k);
    if (drawFx(FX.fireRing, p.x, p.y, k * 1.4, r / FX_RING.r, 1 - k * 0.5, FX_RING.cx, FX_RING.cy)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k * 0.6;
    const grad = ctx.createRadialGradient(p.x, p.y, r * 0.55, p.x, p.y, r + 10);
    grad.addColorStop(0, 'rgba(255,120,40,0)');
    grad.addColorStop(0.7, 'rgba(255,140,50,0.75)');
    grad.addColorStop(0.9, 'rgba(255,230,160,0.9)');
    grad.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 10, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** Equipamento no chão: feixe e brilho na cor da raridade (o texto da raridade aparece ao pegar). */
  function drawLoot(l: { x: number; y: number; t: number; item: { rarity: number; slot: string } }, time: number): void {
    const x = isoX(l.x, l.y), y = isoY(l.x, l.y), color = RARITY[l.item.rarity as 0].color;
    const bob = Math.sin(time * 3 + l.x) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, y, 0, y - 90);
    beam.addColorStop(0, rgba(color, 0.55));
    beam.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = beam;
    ctx.fillRect(x - 6, y - 90, 12, 90);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(5,5,8,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 6, 0, 0, TAU);
    ctx.fill();
    const img = images.icons, def = SHEETS.icons;
    const icon = l.item.slot === 'weapon' ? ICON.weapon : l.item.slot === 'armor' ? ICON.armor : ICON.relic;
    if (img && def) {
      ctx.drawImage(img, icon * def.frameW, 0, def.frameW, def.frameH, x - 16, y - 40 + bob, 32, 32);
    } else {
      ctx.fillStyle = color;
      ctx.strokeStyle = THEME.ivory;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 34 + bob); ctx.lineTo(x + 9, y - 22 + bob); ctx.lineTo(x, y - 10 + bob); ctx.lineTo(x - 9, y - 22 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Quadro da folha de efeitos com mistura aditiva (preto = nada), centrado em (cx, cy) do quadro. */
  function drawFx(frame: number, x: number, y: number, rot: number, s: number, alpha: number, cx = 100, cy = 100): boolean {
    const img = images.fx, def = SHEETS.fx;
    if (!img || !def || alpha <= 0) return !!img;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.drawImage(img, frame * def.frameW, 0, def.frameW, def.frameH, -cx, -cy, def.frameW, def.frameH);
    ctx.restore();
    return true;
  }

  /** Clarão no corpo do inimigo atingido (número de dano recém-criado); centelhas sagradas ao subir de nível. */
  function drawImpact(f: Floater): void {
    if (f.kind === 'level') {
      const k = f.t / FLOATER_TIME;
      drawFx(FX.motes, isoX(f.x, f.y), isoY(f.x, f.y, 52 + k * 26), 0, 0.55, Math.min(1, (1 - k) * 2));
      return;
    }
    if ((f.kind !== 'dmg' && f.kind !== 'crit') || f.t >= IMPACT_TIME) return;
    const crit = f.kind === 'crit', k = f.t / IMPACT_TIME;
    drawFx(FX.impact, isoX(f.x, f.y), isoY(f.x, f.y, f.z * 0.6), (f.x * 7 + f.y * 3) % TAU, (crit ? 0.42 : 0.3) * (0.8 + 0.4 * k), 1 - k);
  }

  /** Impacto do chefe no chão: onda dourada que se abre até o raio do golpe. */
  function drawShockwave(e: Enemy): void {
    const atk = currentAttack(e);
    if (atk.kind !== 'slam' || (e.state !== 'act' && (e.state !== 'recover' || e.t > 0.3))) return;
    const t = e.state === 'act' ? e.t : 0.15 + e.t, k = Math.min(1, t / 0.45);
    drawFx(FX.shockwave, e.x, e.y, 0, (atk.radius * (0.45 + 0.6 * k)) / FX_SHOCK.r, 1 - k, FX_SHOCK.cx, FX_SHOCK.cy);
  }

  function drawProjectile(q: Projectile, time: number): void {
    const x = isoX(q.x, q.y), y = isoY(q.x, q.y, 26);
    const ang = Math.atan2(isoY(q.vx, q.vy) , isoX(q.vx, q.vy));
    // Brasa com a cabeça (núcleo) na posição; pena girada pelo próprio eixo; onda centrada.
    if (q.kind === 'ember' && drawFx(FX.ember, x, y, ang, 0.3, 1, 155, 100)) return;
    if (q.kind === 'feather' && drawFx(FX.feather, x, y, ang - FX_FEATHER_AXIS, 0.22, 1)) return;
    if (q.kind === 'wave' && drawFx(FX.wave, x, y, ang, 0.24, 0.95, 124, 101)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (q.kind === 'ember') {
      const r = 9 + Math.sin(time * 30) * 1.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      grad.addColorStop(0, 'rgba(255,230,160,1)');
      grad.addColorStop(0.35, 'rgba(255,110,40,0.9)');
      grad.addColorStop(1, 'rgba(180,30,40,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    } else {
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = q.kind === 'wave' ? 'rgba(255,214,120,0.85)' : 'rgba(240,230,210,0.95)';
      ctx.beginPath();
      if (q.kind === 'wave') ctx.arc(0, 0, 14, -1.2, 1.2);
      else ctx.ellipse(0, 0, 14, 3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(w: World): void {
    screen();
    for (const q of w.particles) {
      const a = q.life / q.max;
      ctx.globalAlpha = q.kind === 'ember' ? Math.min(1, a * 2) * 0.9 : a;
      if (q.kind === 'ember' || q.kind === 'spark' || q.kind === 'holy') ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = PARTICLE_COLOR[q.kind];
      const x = isoX(q.x, q.y), y = isoY(q.x, q.y, q.z);
      ctx.fillRect(x - q.size / 2, y - q.size / 2, q.size, q.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  function drawFloater(f: Floater): void {
    const k = f.t / FLOATER_TIME;
    const x = isoX(f.x, f.y), y = isoY(f.x, f.y, f.z + k * 30);
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `bold ${f.kind === 'crit' ? 20 : 15}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = THEME.charcoal;
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = FLOATER_COLOR[f.kind];
    ctx.fillText(f.text, x, y);
    ctx.globalAlpha = 1;
  }

  return { resize, draw, toWorld };
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
