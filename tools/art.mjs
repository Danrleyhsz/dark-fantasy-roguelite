// Converte a arte bruta gerada no Gemini (art/raw) em recursos do jogo (public/assets)
// e escreve o manifesto src/rendering/art.gen.ts. Uso: npm run art
//
// Folhas de sprites: fundo magenta chapado (#FF00FF) vira transparência, cada pose é
// localizada por componentes conexos dentro da sua célula da grade e alinhada pela base.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * fit 'height': escala única na folha (a pose mais alta mede `size`), âncora nos pés.
 * fit 'box': cada célula cabe num quadrado `size`x`size`, âncora no centro.
 */
const JOBS = [
  // Isométrico: linha de cima de frente (sudeste), linha de baixo de costas (nordeste).
  { id: 'hero', src: 'art/raw/iso/hero-sheet.jpg', out: 'characters/hero.png', grid: [4, 2], gridLines: true, frames: ['idleF', 'runF', 'slashF', 'dodgeF', 'idleB', 'runB', 'slashB', 'dodgeB'], fit: 'height', size: 224 },
  // Inimigos isométricos: uma linha por inimigo na mesma imagem (todos de frente, sudeste).
  { id: 'penitent', src: 'art/raw/iso/enemies-a.jpg', out: 'enemies/penitent.png', grid: [4, 2], gridLines: true, cells: [0, 1, 2, 3], frames: ['pray', 'walk', 'windup', 'attack'], fit: 'height', size: 208 },
  { id: 'acolyte', src: 'art/raw/iso/enemies-a.jpg', out: 'enemies/acolyte.png', grid: [4, 2], gridLines: true, cells: [4, 5, 6, 7], frames: ['idle', 'walk', 'windup', 'throw'], fit: 'height', size: 208 },
  { id: 'brute', src: 'art/raw/iso/enemies-b.jpg', out: 'enemies/brute.png', grid: [4, 2], gridLines: true, cells: [0, 1, 2, 3], frames: ['idle', 'windup', 'charge', 'stun'], fit: 'height', size: 240 },
  { id: 'angel', src: 'art/raw/iso/enemies-b.jpg', out: 'bosses/angel.png', grid: [4, 2], gridLines: true, cells: [4, 5, 6, 7], frames: ['idle', 'windup', 'thrust', 'wings'], fit: 'height', size: 320 },
  // Props: linha de cima frontal (aplicada nas faces das paredes), de baixo isométrica.
  // No modo 'box' cada prop cabe numa célula quadrada; os altos ocupam a altura inteira (base embaixo).
  { id: 'props', src: 'art/raw/iso/props-a.jpg', out: 'environment/props.png', grid: [4, 2], gridLines: true, frames: ['window', 'doorClosed', 'doorOpen', 'plaque', 'column', 'brazier', 'statue', 'candelabra'], fit: 'box', size: 224 },
  // Ícones (UI-002): 8 bênçãos, cinzas, arma/armadura/relíquia, golpe/esquiva/habilidade, nível.
  {
    id: 'icons', src: 'art/raw/iso/icons.jpg', out: 'ui/icons.png', grid: [4, 4], gridLines: true, fit: 'box', size: 96,
    frames: ['vigor', 'reach', 'swift', 'shadowStep', 'lifesteal', 'thorns', 'holyWave', 'deflect', 'ash', 'weapon', 'armor', 'relic', 'attack', 'dodge', 'skill', 'level'],
  },
  // Efeitos (FX-003): fundo preto, desenhados com mistura aditiva (preto = nada); sem recorte de cor.
  {
    id: 'fx', additive: true, src: 'art/raw/iso/fx-a.jpg', out: 'fx/fx.jpg', grid: [4, 2], size: 192,
    frames: ['ember', 'feather', 'wave', 'impact', 'slash', 'fireRing', 'shockwave', 'motes'],
  },
  // Ilustração do menu (não é cenário jogável).
  { id: 'keyArt', texture: true, src: 'art/raw/iso/key-art.jpg', out: 'ui/key-art.jpg', width: 1600, height: 893 },
  // Texturas: só redimensionadas (cobrindo o quadro) e comprimidas.
  // Ladrilháveis: 512 px = FLOOR_TILE (256) e 384 px = WALL_TILE (192) px lógicos no render.
  // linear [a, b] = a*v + b: comprime o contraste e clareia as lajes escuras (leitura dos personagens).
  { id: 'floor', texture: true, src: 'art/raw/iso/floor-painted.jpg', out: 'environment/floor.jpg', width: 512, height: 512, linear: [0.82, 0] },
  { id: 'wall', texture: true, src: 'art/raw/iso/wall-painted.jpg', out: 'environment/wall.jpg', width: 384, height: 384, linear: [0.85, 0] },
];

const ROOT = 'public/assets/';
const LO = 50, HI = 160; // "magentice" (min(R,B) - G) abaixo de LO é opaco, acima de HI é fundo

async function main() {
  const manifest = {};
  for (const job of JOBS) {
    manifest[job.id] = job.texture ? await processTexture(job) : job.additive ? await processAdditive(job) : await processSheet(job);
    const m = manifest[job.id];
    console.log(job.texture ? `${job.id}: ${m.width}x${m.height}` : `${job.id}: ${m.frameW}x${m.frameH} x${job.frames.length}`);
  }
  const body = JSON.stringify(manifest, null, 2);
  await mkdir('src/rendering', { recursive: true });
  await writeFile('src/rendering/art.gen.ts',
    `// Gerado por tools/art.mjs a partir de art/raw. Não editar à mão: rode \`npm run art\`.\n` +
    `export const ART = ${body} as const;\n`);
}

async function processSheet(job) {
  const { data, info } = await sharp(job.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  keyMagenta(data);
  if (job.gridLines) removeGridLines(data, w, h, job.grid[0], job.grid[1]);
  const labels = labelComponents(data, w, h);
  const comps = componentStats(labels, w, h);
  const [gx, gy] = job.grid;
  const cellW = w / gx, cellH = h / gy;

  const frames = [];
  for (let i = 0; i < job.frames.length; i++) {
    // job.cells escolhe quais células da grade usar (várias folhas na mesma imagem).
    const cell = job.cells ? job.cells[i] : i;
    const cx = cell % gx, cy = Math.floor(cell / gx);
    const inCell = comps.filter((c) => c.mx >= cx * cellW && c.mx < (cx + 1) * cellW && c.my >= cy * cellH && c.my < (cy + 1) * cellH);
    if (!inCell.length) throw new Error(`${job.id}: célula ${i} (${job.frames[i]}) vazia`);
    frames.push(pickFrame(inCell, labels, data, w, cellW * 0.08));
  }

  const scaleOf = (f) => (job.fit === 'height'
    ? job.size / Math.max(...frames.map((g) => g.h))
    : Math.min(job.size / f.w, job.size / f.h));
  const pad = 2;
  // Célula comum: largura simétrica em torno da âncora, para a pose não "pular" ao trocar de quadro.
  let frameW, frameH;
  if (job.fit === 'height') {
    frameW = Math.ceil(Math.max(...frames.map((f) => 2 * Math.max(f.ax - f.x0, f.x0 + f.w - f.ax) * scaleOf(f)))) + 2 * pad;
    frameH = job.size + 2 * pad;
  } else {
    frameW = frameH = job.size + 2 * pad;
  }

  const layers = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], s = scaleOf(f);
    const tw = Math.max(1, Math.round(f.w * s)), th = Math.max(1, Math.round(f.h * s));
    const input = await sharp(f.rgba, { raw: { width: f.w, height: f.h, channels: 4 } })
      .resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
    const left = job.fit === 'height' ? Math.round(frameW / 2 - (f.ax - f.x0) * s) : Math.round((frameW - tw) / 2);
    const top = job.fit === 'height' ? frameH - pad - th : Math.round((frameH - th) / 2);
    layers.push({ input, left: i * frameW + left, top });
  }
  const file = ROOT + job.out;
  await mkdir(dirname(file), { recursive: true });
  await sharp({ create: { width: frameW * frames.length, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers).png({ palette: true, quality: 100, effort: 10 }).toFile(file);
  return {
    src: 'assets/' + job.out, frameW, frameH,
    anchorX: frameW / 2, anchorY: job.fit === 'height' ? frameH - pad : frameH / 2,
    frames: job.frames,
  };
}

/**
 * Folha de efeitos sobre preto: cada célula é recortada pela caixa dos pixels acesos e cabe num
 * quadrado `size` (centro = centro do efeito). O preto do fundo é zerado (ponto preto) para a mistura
 * aditiva não somar o ruído do JPEG.
 */
async function processAdditive(job) {
  const { data, info } = await sharp(job.src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const FLOOR = 14, LIT = 40;
  for (let i = 0; i < data.length; i++) data[i] = data[i] <= FLOOR ? 0 : Math.round(((data[i] - FLOOR) * 255) / (255 - FLOOR));
  const [gx, gy] = job.grid, cellW = w / gx, cellH = h / gy, pad = 4;
  const frameW = job.size + 2 * pad, layers = [];
  for (let i = 0; i < job.frames.length; i++) {
    const cx = i % gx, cy = Math.floor(i / gx);
    const x0c = Math.round(cx * cellW), x1c = Math.round((cx + 1) * cellW), y0c = Math.round(cy * cellH), y1c = Math.round((cy + 1) * cellH);
    let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
    for (let y = y0c; y < y1c; y++) {
      for (let x = x0c; x < x1c; x++) {
        const o = (y * w + x) * 3;
        if (Math.max(data[o], data[o + 1], data[o + 2]) < LIT) continue;
        if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
        if (y < by0) by0 = y; if (y > by1) by1 = y;
      }
    }
    if (bx1 < 0) throw new Error(`${job.id}: célula ${i} (${job.frames[i]}) vazia`);
    // Folga para o brilho fraco ao redor, sem passar da célula.
    const m = 10;
    bx0 = Math.max(x0c, bx0 - m); by0 = Math.max(y0c, by0 - m); bx1 = Math.min(x1c - 1, bx1 + m); by1 = Math.min(y1c - 1, by1 + m);
    const fw = bx1 - bx0 + 1, fh = by1 - by0 + 1, s = Math.min(job.size / fw, job.size / fh);
    const tw = Math.max(1, Math.round(fw * s)), th = Math.max(1, Math.round(fh * s));
    const input = await sharp(data, { raw: { width: w, height: h, channels: 3 } })
      .extract({ left: bx0, top: by0, width: fw, height: fh }).resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
    layers.push({ input, left: i * frameW + Math.round((frameW - tw) / 2), top: Math.round((frameW - th) / 2) });
  }
  const file = ROOT + job.out;
  await mkdir(dirname(file), { recursive: true });
  await sharp({ create: { width: frameW * job.frames.length, height: frameW, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite(layers).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(file);
  return { src: 'assets/' + job.out, frameW, frameH: frameW, anchorX: frameW / 2, anchorY: frameW / 2, frames: job.frames, additive: true };
}

async function processTexture(job) {
  const file = ROOT + job.out;
  await mkdir(dirname(file), { recursive: true });
  let img = sharp(job.src).resize(job.width, job.height, { fit: 'cover' });
  if (job.linear) img = img.linear(...job.linear);
  await img.jpeg({ quality: 80, mozjpeg: true }).toFile(file);
  return { src: 'assets/' + job.out, width: job.width, height: job.height };
}

/** Fundo magenta -> alfa, removendo o "vazamento" de magenta das bordas (artefatos do JPEG). */
function keyMagenta(d) {
  for (let o = 0; o < d.length; o += 4) {
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const m = Math.min(r, b) - g;
    const a = m <= LO ? 1 : m >= HI ? 0 : 1 - (m - LO) / (HI - LO);
    if (a > 0 && a < 1) {
      // C = a*F + (1-a)*K, com K = (255, 0, 255)  =>  F = (C - (1-a)K) / a
      d[o] = clamp((r - (1 - a) * 255) / a);
      d[o + 1] = clamp(g / a);
      d[o + 2] = clamp((b - (1 - a) * 255) / a);
    }
    if (a > 0) {
      // Despill: o magenta refletido na arte (vermelho E azul acima do verde) puxa os dois de volta ao verde.
      // Só nos tons claros (verde alto: marfim, brilhos, penas): o carmesim-vinho escuro da capa leva azul
      // de propósito e não pode virar marrom. Dourados têm azul baixo e não mudam.
      const spill = Math.min(d[o], d[o + 2]) - d[o + 1];
      const k = Math.min(1, Math.max(0, (d[o + 1] - 60) / 80));
      if (spill > 0 && k > 0) {
        d[o] = clamp(d[o] - spill * k);
        d[o + 2] = clamp(d[o + 2] - spill * k);
      }
    }
    d[o + 3] = Math.round(a * 255);
  }
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * O Gemini às vezes desenha linhas de grade entre as células (job.gridLines). Só procura perto das
 * divisas esperadas entre células (a arte fica no centro delas): uma linha/coluna ali 90% opaca é
 * grade e vira fundo, com folga de 4 px. Fora das divisas, props altos alinhados não são tocados.
 */
function removeGridLines(d, w, h, gx, gy) {
  const nearBoundary = (v, size, cells) => {
    for (let k = 1; k < cells; k++) if (Math.abs(v - (k * size) / cells) <= size * 0.025) return true;
    return false;
  };
  const rows = [], cols = [];
  for (let y = 0; y < h; y++) {
    if (!nearBoundary(y, h, gy)) continue;
    let n = 0;
    for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 127) n++;
    if (n > w * 0.9) rows.push(y);
  }
  for (let x = 0; x < w; x++) {
    if (!nearBoundary(x, w, gx)) continue;
    let n = 0;
    for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 127) n++;
    if (n > h * 0.9) cols.push(x);
  }
  for (const y0 of rows) for (let y = Math.max(0, y0 - 4); y <= Math.min(h - 1, y0 + 4); y++) for (let x = 0; x < w; x++) d[(y * w + x) * 4 + 3] = 0;
  for (const x0 of cols) for (let x = Math.max(0, x0 - 4); x <= Math.min(w - 1, x0 + 4); x++) for (let y = 0; y < h; y++) d[(y * w + x) * 4 + 3] = 0;
}

/** Rotula componentes 4-conexos de pixels opacos (alfa > 127). 0 = fundo. */
function labelComponents(d, w, h) {
  const labels = new Int32Array(w * h);
  const parent = [0];
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i * 4 + 3] <= 127) continue;
      const up = y > 0 ? labels[i - w] : 0, left = x > 0 ? labels[i - 1] : 0;
      if (!up && !left) {
        labels[i] = parent.length;
        parent.push(parent.length);
      } else if (up && left) {
        const a = find(up), b = find(left);
        labels[i] = Math.min(a, b);
        parent[Math.max(a, b)] = Math.min(a, b);
      } else labels[i] = up || left;
    }
  }
  for (let i = 0; i < labels.length; i++) if (labels[i]) labels[i] = find(labels[i]);
  return labels;
}

function componentStats(labels, w, h) {
  const map = new Map();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x];
      if (!l) continue;
      let c = map.get(l);
      if (!c) map.set(l, (c = { id: l, area: 0, sx: 0, sy: 0, x0: x, y0: y, x1: x, y1: y }));
      c.area++; c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    }
  }
  return [...map.values()].filter((c) => c.area >= 40).map((c) => ({ ...c, mx: c.sx / c.area, my: c.sy / c.area }));
}

/** Maior componente da célula + pedaços próximos (ex.: auréola solta acima do elmo). */
function pickFrame(comps, labels, d, w, maxGap) {
  comps.sort((a, b) => b.area - a.area);
  const keep = new Set([comps[0].id]);
  let box = { x0: comps[0].x0, y0: comps[0].y0, x1: comps[0].x1, y1: comps[0].y1 };
  for (let grew = true; grew;) {
    grew = false;
    for (const c of comps) {
      if (keep.has(c.id) || c.area < 80) continue;
      const gap = Math.max(box.x0 - c.x1, c.x0 - box.x1, box.y0 - c.y1, c.y0 - box.y1, 0);
      if (gap > maxGap) continue;
      keep.add(c.id);
      box = { x0: Math.min(box.x0, c.x0), y0: Math.min(box.y0, c.y0), x1: Math.max(box.x1, c.x1), y1: Math.max(box.y1, c.y1) };
      grew = true;
    }
  }
  const fw = box.x1 - box.x0 + 1, fh = box.y1 - box.y0 + 1;
  const rgba = Buffer.alloc(fw * fh * 4);
  // Âncora horizontal: centro de massa dos 20% inferiores (pés), não o centro da caixa (a espada distorce).
  let footSum = 0, footN = 0;
  const footY = box.y1 - fh * 0.2;
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * w + x;
      // Pixels semitransparentes da borda podem não ter rótulo; aceita-os se vizinhos de um pixel mantido.
      const l = labels[i];
      const ok = l ? keep.has(l) : keep.has(labels[i - 1]) || keep.has(labels[i + 1]) || keep.has(labels[i - w]) || keep.has(labels[i + w]);
      if (!ok) continue;
      d.copy(rgba, ((y - box.y0) * fw + (x - box.x0)) * 4, i * 4, i * 4 + 4);
      if (l && y >= footY) { footSum += x; footN++; }
    }
  }
  return { x0: box.x0, w: fw, h: fh, ax: footN ? footSum / footN : box.x0 + fw / 2, rgba };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
