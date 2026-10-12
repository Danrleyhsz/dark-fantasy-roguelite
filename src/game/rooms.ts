import { parseRoom } from './room.ts';

// Salas de 30x17 tiles. Na vista isométrica as paredes norte (linhas 0-2) e oeste (coluna 0) mostram
// a face interna; a porta de saída fica no centro da parede norte. Pilares e braseiros ('b', fontes de
// luz) ficam junto às bordas: o centro fica livre para o combate (ASSET_MANIFEST ENV-001).
// 'P' = entrada do jogador, 'E' = pontos possíveis de inimigo (o encontro sorteia quais usar).

const WALL = '##############################';
const OPEN = '#............................#';
const LIT = '#.......b............b.......#';

/** Sala avulsa da Fase 1: usada no fundo do menu e nos testes de combate. */
export const FIRST_ROOM = parseRoom([
  WALL, WALL, WALL,
  LIT,
  '#..o......................o..#',
  OPEN, OPEN, OPEN, OPEN,
  '#....P..................E....#',
  OPEN, OPEN, OPEN, OPEN,
  '#..o......................o..#',
  OPEN,
  WALL,
]);

/** Nave: colunas nos cantos. */
const NAVE = parseRoom([
  WALL, WALL, WALL,
  LIT,
  '#..o.....E..........E.....o..#',
  OPEN,
  '#....E..................E....#',
  OPEN, OPEN,
  '#...........E....E...........#',
  OPEN, OPEN, OPEN, OPEN,
  '#..o..........P...........o..#',
  OPEN,
  WALL,
]);

/** Corredor: duas fileiras de colunas formando naves laterais. */
const AISLE = parseRoom([
  WALL, WALL, WALL,
  LIT,
  '#..E........E....E........E..#',
  '#......o..............o......#',
  OPEN,
  '#...E....................E...#',
  '#......o..............o......#',
  OPEN, OPEN,
  '#......o..............o......#',
  OPEN, OPEN,
  '#.............P..............#',
  OPEN,
  WALL,
]);

/** Cripta: blocos de colunas criando nichos nas laterais. */
const CRYPT = parseRoom([
  WALL, WALL, WALL,
  LIT,
  '#....E.......E....E.......E..#',
  OPEN,
  '#..oo....................oo..#',
  '#..oo....................oo..#',
  OPEN,
  '#.....E..............E.......#',
  OPEN,
  '#..oo....................oo..#',
  '#..oo....................oo..#',
  OPEN,
  '#.............P..............#',
  OPEN,
  WALL,
]);

/** Arena do chefe: aberta, com quatro colunas e braseiros nos cantos. */
export const BOSS_ROOM = parseRoom([
  WALL, WALL, WALL,
  '#....b..................b....#',
  OPEN,
  '#..o..........E...........o..#',
  OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN, OPEN,
  '#..o..........P...........o..#',
  '#....b..................b....#',
  WALL,
]);

export const START_ROOM = NAVE;
/** Salas intermediárias sorteadas na incursão. */
export const ROOM_POOL = [NAVE, AISLE, CRYPT];
