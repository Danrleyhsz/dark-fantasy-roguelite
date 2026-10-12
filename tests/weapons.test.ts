import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageEnemy } from '../src/game/combat.ts';
import { CONFIG, type ChargeAttack, type SweepAttack, type WeaponKind } from '../src/game/config.ts';
import { createGame, setWeapon, startRun } from '../src/game/game.ts';
import { deriveStats, EMPTY_GEAR } from '../src/game/hero.ts';
import { rollItem } from '../src/game/items.ts';
import { mulberry32 } from '../src/game/math.ts';
import { parseRoom } from '../src/game/room.ts';
import { FIRST_ROOM } from '../src/game/rooms.ts';
import { NO_META } from '../src/game/upgrades.ts';
import { createWorld, spawnEnemy, stepWorld, type World } from '../src/game/world.ts';
import { createRenderer } from '../src/rendering/render.ts';
import { STEP, idle, memoryStorage, mockCanvas, mockContext, playRun, run } from './helpers.ts';

const WEAPONS = Object.keys(CONFIG.weapons) as WeaponKind[];
const SWEEP = CONFIG.enemies.penitent.attacks[0] as SweepAttack;
const attackRight = () => ({ ...idle(), attack: true, aimAt: { x: 9999, y: 300 } });

/** Jogador no centro com a arma pedida e um inimigo em (ex, ey); sem críticos aleatórios. */
function arena(weapon: WeaponKind, kind: 'penitent' | 'brute', ex: number, ey = 300): World {
  const w = createWorld(FIRST_ROOM, 5, ['penitent'], weapon);
  w.enemies = [];
  w.player.x = 480; w.player.y = 300;
  w.player.stats.critChance = 0;
  spawnEnemy(w, kind, { x: ex, y: ey });
  return w;
}

test('arquétipos mudam o golpe: Montante pesado e largo, Estoque longo, estreito e rápido', () => {
  const [sword, great, estoc] = WEAPONS.map((k) => deriveStats(1, EMPTY_GEAR, [], NO_META, k));
  assert.deepEqual(WEAPONS, ['sword', 'greatsword', 'estoc']);
  assert.ok(great.damage > sword.damage && great.cooldown > sword.cooldown && great.arc > sword.arc);
  assert.ok(great.windup > sword.windup && great.knockback > sword.knockback && great.breaksGuard && !sword.breaksGuard);
  assert.ok(estoc.range > sword.range && estoc.arc < sword.arc && estoc.cooldown < sword.cooldown);
  assert.ok(estoc.critChance > sword.critChance);
  assert.ok(sword.fePerHit > great.fePerHit && sword.fePerHit > estoc.fePerHit, 'a Espada rende mais Fé');
});

test('Montante quebra a guarda: interrompe a preparação do Penitente; a Espada não', () => {
  for (const weapon of ['sword', 'greatsword'] as const) {
    const w = arena(weapon, 'penitent', 520);
    const e = w.enemies[0];
    e.state = 'chase';
    stepWorld(w, idle(), STEP);
    assert.equal(e.state, 'windup');
    stepWorld(w, attackRight(), STEP);
    run(w, SWEEP.windup + SWEEP.active); // até quando o golpe dele cairia
    if (weapon === 'greatsword') assert.equal(w.player.hp, w.player.maxHp, 'Montante devia interromper a preparação');
    else assert.ok(w.player.hp < w.player.maxHp, 'Espada não interrompe: o golpe do Penitente devia acertar');
    assert.ok(e.hp < e.maxHp);
  }
});

test('quebra de guarda não vale para o Flagelante nem para o chefe', () => {
  const w = arena('greatsword', 'brute', 540);
  const angel = spawnEnemy(w, 'angel', { x: 300, y: 300 });
  for (const e of w.enemies) {
    e.state = 'windup';
    damageEnemy(w, e, 5, 0, 300, false, true);
    assert.equal(e.state, 'windup', `${e.kind} foi interrompido`);
  }
  assert.ok(angel.hp < angel.maxHp);
});

test('Estoque alcança mais longe em linha, mas erra o que está ao lado', () => {
  const sword = deriveStats(1, EMPTY_GEAR, [], NO_META, 'sword');
  const estoc = deriveStats(1, EMPTY_GEAR, [], NO_META, 'estoc');
  const r = CONFIG.enemies.penitent.radius;
  const far = (sword.range + estoc.range) / 2 + r; // fora do alcance da Espada, dentro do Estoque
  const side = { x: 480 + 35 * Math.cos(1.05), y: 300 + 35 * Math.sin(1.05) }; // 60° fora da linha
  for (const [weapon, hitsFar, hitsSide] of [['sword', false, true], ['estoc', true, false]] as const) {
    const a = arena(weapon, 'penitent', 480 + far);
    a.enemies[0].state = 'stun'; // parado: não se aproxima durante o golpe
    stepWorld(a, attackRight(), STEP);
    run(a, 0.3);
    assert.equal(a.enemies[0].hp < a.enemies[0].maxHp, hitsFar, `${weapon}: alvo distante`);
    const b = arena(weapon, 'penitent', side.x, side.y);
    b.enemies[0].state = 'stun';
    stepWorld(b, attackRight(), STEP);
    run(b, 0.3);
    assert.equal(b.enemies[0].hp < b.enemies[0].maxHp, hitsSide, `${weapon}: alvo ao lado`);
  }
});

test('Espada Longa: cada golpe que acerta rende o dobro de Fé', () => {
  for (const weapon of ['sword', 'estoc'] as const) {
    const w = arena(weapon, 'penitent', 515);
    w.enemies[0].state = 'idle';
    w.player.fe = 0;
    w.player.stats.feRegen = 0;
    stepWorld(w, attackRight(), STEP);
    run(w, 0.3);
    assert.equal(w.player.fe, CONFIG.player.fe.perHit * CONFIG.weapons[weapon].feGain);
  }
});

test('armas encontradas no chão são do arquétipo em uso', () => {
  const names: Record<WeaponKind, RegExp> = { sword: /Espada|Lâmina/, greatsword: /Montante|Carrasco/, estoc: /Estoque|Agulha/ };
  for (const weapon of WEAPONS) {
    const rng = mulberry32(3);
    let weapons = 0;
    for (let i = 0; i < 60; i++) {
      const it = rollItem(rng, 2, 0, weapon);
      if (it.slot !== 'weapon') continue;
      weapons++;
      assert.match(it.name, names[weapon]);
    }
    assert.ok(weapons > 5);
  }
});

test('a arma escolhida no menu é salva e vale na incursão; valor inválido volta à Espada', () => {
  const store = memoryStorage();
  const g = createGame(store);
  setWeapon(g, 'estoc');
  const g2 = createGame(store);
  assert.equal(g2.save.weapon, 'estoc');
  startRun(g2, 1);
  assert.equal(g2.world!.player.weapon, 'estoc');
  assert.equal(g2.world!.player.stats.arc, CONFIG.weapons.estoc.arc);
  setWeapon(g2, 'greatsword'); // fora do menu não troca
  assert.equal(g2.save.weapon, 'estoc');
  for (const bad of ['machado', '__proto__', 7, null]) {
    const s = memoryStorage({ 'dark-fantasy-roguelite/save': JSON.stringify({ weapon: bad }) });
    assert.equal(createGame(s).save.weapon, 'sword');
  }
});

test('incursão completa é vencível com cada arma', () => {
  for (const weapon of WEAPONS) {
    let wins = 0;
    for (const seed of [11, 42]) {
      const g = createGame();
      g.save.weapon = weapon;
      startRun(g, seed);
      playRun(g, 900);
      assert.ok(g.screen === 'victory' || g.screen === 'defeat', `${weapon}: semente ${seed} travou em ${g.screen}`);
      if (g.screen === 'victory') wins++;
    }
    assert.ok(wins >= 1, `${weapon}: o bot não venceu nenhuma incursão`);
  }
});

test('o rastro de cada arma é desenhado sem valores inválidos', () => {
  for (const weapon of WEAPONS) {
    const r = createRenderer(mockContext(), mockCanvas, {});
    r.resize(960, 544);
    const w = arena(weapon, 'penitent', 515);
    stepWorld(w, attackRight(), STEP);
    for (let i = 0; i < 30; i++) {
      stepWorld(w, idle(), STEP);
      r.draw(w);
    }
  }
});

test('Flagelante não investe com uma coluna no caminho do corpo; ajusta a posição e investe', () => {
  // Coluna ('o') logo acima da linha entre os dois: a linha fina passa, o corpo do Flagelante não.
  const room = parseRoom([
    '##############################', '##############################', '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............o...............#',
    '#........P.......E...........#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '##############################',
  ]);
  const w = createWorld(room, 2, ['brute']);
  const e = w.enemies[0], charge = CONFIG.enemies.brute.attacks[0] as ChargeAttack;
  w.player.y = e.y = 8 * CONFIG.tile - 10 + 16; // 6 unidades abaixo da coluna
  assert.ok(Math.hypot(e.x - w.player.x, e.y - w.player.y) < charge.range, 'jogador ao alcance da investida');
  e.state = 'chase';
  stepWorld(w, idle(), STEP);
  assert.equal(e.state, 'chase', 'investiu contra a coluna');
  let charged = false, stunned = false;
  for (let t = 0; t < 8 && !charged; t += STEP) {
    stepWorld(w, idle(), STEP);
    charged ||= w.enemies[0].state === 'windup';
    stunned ||= w.enemies[0].state === 'stun';
  }
  assert.ok(charged, 'não investiu depois de sair de trás da coluna');
  assert.ok(!stunned);
});
