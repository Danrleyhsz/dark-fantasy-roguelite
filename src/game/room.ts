import { CONFIG } from './config.ts';

export interface Point { x: number; y: number }
/** Corpo para colisão com o cenário: caixa de meia-largura `r` centrada em (x, y). */
export interface Body { x: number; y: number; r: number }

export interface Room {
  cols: number;
  rows: number;
  /** Uma letra por tile: '#' parede, 'o' pilar, '.' piso (marcadores de spawn viram piso). */
  tiles: string[];
  solid: Uint8Array;
  playerSpawn: Point;
  enemySpawns: Point[];
}

const T = CONFIG.tile;
const EPS = 1e-6;

/** Legenda: '#' parede, 'o' pilar, '.' piso, 'P' início do jogador, 'E' ponto de inimigo. */
export function parseRoom(map: string[]): Room {
  const rows = map.length, cols = map[0].length;
  const solid = new Uint8Array(cols * rows);
  const tiles: string[] = [];
  const enemySpawns: Point[] = [];
  let playerSpawn: Point | null = null;
  for (let ty = 0; ty < rows; ty++) {
    const line = map[ty];
    if (line.length !== cols) throw new Error(`Linha ${ty} da sala tem ${line.length} colunas, esperado ${cols}`);
    let row = '';
    for (let tx = 0; tx < cols; tx++) {
      const ch = line[tx];
      const center = { x: (tx + 0.5) * T, y: (ty + 0.5) * T };
      if (ch === 'P') playerSpawn = center;
      else if (ch === 'E') enemySpawns.push(center);
      else if (ch !== '#' && ch !== 'o' && ch !== '.') throw new Error(`Tile desconhecido '${ch}' na sala`);
      const blocks = ch === '#' || ch === 'o';
      solid[ty * cols + tx] = blocks ? 1 : 0;
      row += blocks ? ch : '.';
    }
    tiles.push(row);
  }
  if (!playerSpawn) throw new Error('Sala sem início do jogador (P)');
  return { cols, rows, tiles, solid, playerSpawn, enemySpawns };
}

export function solidAt(room: Room, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= room.cols || ty >= room.rows) return true;
  return room.solid[ty * room.cols + tx] === 1;
}

export function solidAtPoint(room: Room, x: number, y: number): boolean {
  return solidAt(room, Math.floor(x / T), Math.floor(y / T));
}

/** Move o corpo deslizando nas paredes. Retorna true se encostou em algo sólido. */
export function moveAndCollide(room: Room, b: Body, dx: number, dy: number): boolean {
  // Subpassos de meio tile evitam atravessar paredes em velocidades altas.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (T / 2)));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    if (moveAxis(room, b, dx / steps, 0)) hit = true;
    if (moveAxis(room, b, 0, dy / steps)) hit = true;
  }
  return hit;
}

function moveAxis(room: Room, b: Body, dx: number, dy: number): boolean {
  if (dx === 0 && dy === 0) return false;
  b.x += dx;
  b.y += dy;
  const x0 = Math.floor((b.x - b.r) / T), x1 = Math.floor((b.x + b.r - EPS) / T);
  const y0 = Math.floor((b.y - b.r) / T), y1 = Math.floor((b.y + b.r - EPS) / T);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!solidAt(room, tx, ty)) continue;
      if (dx > 0) b.x = tx * T - b.r;
      else if (dx < 0) b.x = (tx + 1) * T + b.r;
      if (dy > 0) b.y = ty * T - b.r;
      else if (dy < 0) b.y = (ty + 1) * T + b.r;
      return true;
    }
  }
  return false;
}

/** Linha de visão para um corpo de raio r: centro e duas bordas laterais. */
export function clearPath(room: Room, ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / len) * r, ny = ((bx - ax) / len) * r;
  return segmentClear(room, ax, ay, bx, by) &&
    segmentClear(room, ax + nx, ay + ny, bx + nx, by + ny) &&
    segmentClear(room, ax - nx, ay - ny, bx - nx, by - ny);
}

function segmentClear(room: Room, ax: number, ay: number, bx: number, by: number): boolean {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / (T / 4));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solidAtPoint(room, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/** BFS a partir do tile alvo: dist[i] = passos até o alvo, -1 se inalcançável. Reusa os buffers. */
export function computeFlowField(room: Room, targetX: number, targetY: number, dist: Int16Array, queue: Int32Array): void {
  dist.fill(-1);
  const tx = Math.floor(targetX / T), ty = Math.floor(targetY / T);
  if (solidAt(room, tx, ty)) return;
  const { cols, solid } = room;
  let head = 0, tail = 0;
  const start = ty * cols + tx;
  dist[start] = 0;
  queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++], x = i % cols, d = dist[i] + 1;
    // As salas são fechadas por paredes, então vizinhos de piso nunca saem do mapa.
    if (x + 1 < cols && dist[i + 1] === -1 && !solid[i + 1]) { dist[i + 1] = d; queue[tail++] = i + 1; }
    if (x > 0 && dist[i - 1] === -1 && !solid[i - 1]) { dist[i - 1] = d; queue[tail++] = i - 1; }
    if (i + cols < solid.length && dist[i + cols] === -1 && !solid[i + cols]) { dist[i + cols] = d; queue[tail++] = i + cols; }
    if (i - cols >= 0 && dist[i - cols] === -1 && !solid[i - cols]) { dist[i - cols] = d; queue[tail++] = i - cols; }
  }
}

/** Ângulo rumo ao vizinho mais próximo do alvo no campo de fluxo; NaN se não houver caminho. */
export function flowAngle(room: Room, dist: Int16Array, x: number, y: number): number {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  const here = dist[ty * room.cols + tx];
  let best = here < 0 ? Infinity : here, bx = -1, by = -1;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if ((ox === 0 && oy === 0) || solidAt(room, tx + ox, ty + oy)) continue;
      // Diagonal só se os dois lados estiverem livres, para não raspar quinas.
      if (ox !== 0 && oy !== 0 && (solidAt(room, tx + ox, ty) || solidAt(room, tx, ty + oy))) continue;
      const d = dist[(ty + oy) * room.cols + tx + ox];
      if (d >= 0 && d < best) { best = d; bx = tx + ox; by = ty + oy; }
    }
  }
  if (bx < 0) return NaN;
  return Math.atan2((by + 0.5) * T - y, (bx + 0.5) * T - x);
}
