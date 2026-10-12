import { CONFIG } from '../game/config.ts';
import type { Game, Screen } from '../game/game.ts';
import { attributesFor, xpToNext } from '../game/hero.ts';
import { RARITY, describeMods } from '../game/items.ts';
import type { Room } from '../game/room.ts';
import { META, UPGRADES, type MetaId, type UpgradeId } from '../game/upgrades.ts';
import type { World } from '../game/world.ts';
import { ART } from '../rendering/art.gen.ts';
import { isoX, isoY } from '../rendering/iso.ts';
import { ICON } from '../rendering/render.ts';

export interface UIHandlers {
  start(): void;
  resume(): void;
  restart(): void;
  menu(): void;
  pause(): void;
  pick(id: UpgradeId): void;
  buy(id: MetaId): void;
  reduceMotion(on: boolean): void;
  volume(v: number): void;
}

export interface UI {
  show(screen: Screen): void;
  /** Atualiza o HUD; só mexe no DOM quando algo mudou. */
  hud(world: World | null): void;
}

/** Duração das dicas de controle no início da incursão (tutorial curto do GDD). */
const HINT_TIME = 9;
const TOAST_TIME = 3.2;
const ROOM_NAMES = ['Nave em Ruínas', 'Corredor dos Penitentes', 'Cripta Profanada', 'Claustro Queimado', 'Altar do Anjo Caído'];
const art: Partial<Record<string, { src: string; frames?: readonly string[] }>> = ART;

export function createUI(game: Game, h: UIHandlers): UI {
  const $ = (id: string) => document.getElementById(id)!;
  const menu = $('menu'), pause = $('pause'), reward = $('reward'), end = $('end');
  const hint = $('hint'), blessings = $('blessings'), boss = $('boss'), bossFill = $('boss-fill');
  const minimap = $('minimap') as HTMLCanvasElement, mm = minimap.getContext('2d');
  $('btn-start').addEventListener('click', h.start);
  $('btn-resume').addEventListener('click', h.resume);
  $('btn-restart').addEventListener('click', h.restart);
  $('btn-quit').addEventListener('click', h.menu);
  $('btn-again').addEventListener('click', h.restart);
  $('btn-menu').addEventListener('click', h.menu);
  $('btn-pause').addEventListener('click', h.pause);
  const motion = $('opt-motion') as HTMLInputElement, volume = $('opt-volume') as HTMLInputElement;
  motion.addEventListener('change', () => h.reduceMotion(motion.checked));
  volume.addEventListener('input', () => h.volume(Number(volume.value)));
  // Atalhos 1-3 na escolha de bênção.
  window.addEventListener('keydown', (e) => {
    if (game.screen !== 'reward' || !game.world?.offer) return;
    const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (i >= 0 && game.world.offer[i]) h.pick(game.world.offer[i]);
  });
  // Ilustração de capa atrás do menu e das telas finais (caminho relativo: funciona em subpastas).
  // URL absoluta: url() relativa numa variável CSS seria resolvida a partir do arquivo de estilo.
  const keyArt = art.keyArt?.src;
  if (keyArt) for (const el of [menu, end]) el.style.setProperty('--key-art', `url("${new URL(keyArt, document.baseURI).href}")`);
  paintIcon($('slot-attack').querySelector('.slot-icon')!, ICON.attack);
  paintIcon($('slot-dodge').querySelector('.slot-icon')!, ICON.dodge);
  paintIcon($('slot-skill').querySelector('.slot-icon')!, ICON.skill);

  const shown = new Map<string, string | number | boolean>();
  /** Escreve no DOM só quando o valor muda (o HUD roda a cada quadro). */
  const set = (key: string, value: string | number | boolean, apply: () => void) => {
    if (shown.get(key) === value) return;
    shown.set(key, value);
    apply();
  };
  let mapRoom: Room | null = null, mapLayer: HTMLCanvasElement | null = null;

  function show(screen: Screen): void {
    document.body.dataset.screen = screen;
    menu.hidden = screen !== 'menu';
    pause.hidden = screen !== 'paused';
    reward.hidden = screen !== 'reward';
    end.hidden = screen !== 'victory' && screen !== 'defeat';
    if (screen === 'menu') fillMenu();
    if (screen === 'paused') fillCharacter();
    if (screen === 'reward') fillReward();
    if (screen === 'victory' || screen === 'defeat') fillEnd(screen);
    if (screen === 'playing') shown.clear();
    const focus = { menu: 'btn-start', paused: 'btn-resume', victory: 'btn-again', defeat: 'btn-again', reward: null, playing: null }[screen];
    if (focus) $(focus).focus();
    else if (screen === 'reward') (reward.querySelector('button') as HTMLButtonElement | null)?.focus();
    else (document.activeElement as HTMLElement | null)?.blur?.();
  }

  function fillMenu(): void {
    const s = game.save;
    paintIcon($('ash-icon'), ICON.ash);
    $('ashes').textContent = String(s.ashes);
    $('hero-line').textContent = `Cavaleiro nível ${s.hero.level} · ${s.hero.xp}/${xpToNext(s.hero.level)} de experiência`;
    $('record').textContent = s.best.runs
      ? `Incursões: ${s.best.runs} · Vitórias: ${s.best.wins} · Sala mais funda: ${s.best.depth}/${CONFIG.run.encounters.length}`
      : 'Nenhuma incursão ainda.';
    motion.checked = s.settings.reduceMotion;
    volume.value = String(s.settings.volume);
    $('relics').replaceChildren(...(Object.keys(META) as MetaId[]).map((id) => {
      const m = META[id], level = s.meta[id], cost = m.costs[level];
      const li = document.createElement('li');
      const info = document.createElement('span');
      info.innerHTML = '<b></b> <span class="level"></span><br><small></small>';
      info.querySelector('b')!.textContent = m.name;
      info.querySelector('.level')!.textContent = `${'◆'.repeat(level)}${'◇'.repeat(m.costs.length - level)}`;
      info.querySelector('small')!.textContent = m.text;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.textContent = cost === undefined ? 'Máximo' : `${cost} cinzas`;
      buy.disabled = cost === undefined || s.ashes < cost;
      buy.setAttribute('aria-label', cost === undefined ? `${m.name}: nível máximo` : `Comprar ${m.name} por ${cost} cinzas`);
      buy.addEventListener('click', () => h.buy(id));
      li.append(info, buy);
      return li;
    }));
    $('save-warning').hidden = game.saved;
  }

  /** Painel do personagem (pausa): nível, atributos, atributos derivados, equipamento e bênçãos. */
  function fillCharacter(): void {
    const w = game.world, panel = $('character');
    if (!w) {
      panel.replaceChildren();
      return;
    }
    const p = w.player, s = p.stats, at = attributesFor(p.level);
    const row = (label: string, value: string) => `<tr><th>${label}</th><td>${value}</td></tr>`;
    panel.innerHTML = `<h2>Cavaleiro · nível ${p.level}</h2>
      <p class="note">${p.level >= CONFIG.levels.max ? 'Nível máximo' : `${p.xp}/${xpToNext(p.level)} de experiência`}</p>
      <div class="char-cols">
        <table>${row('Força', String(at.strength))}${row('Vitalidade', String(at.vitality))}${row('Destreza', String(at.dexterity))}</table>
        <table>${row('Dano', s.damage.toFixed(1))}${row('Crítico', `${Math.round(s.critChance * 100)}%`)}${row('Vida', `${p.hp}/${p.maxHp}`)}${row('Armadura', `${Math.round(s.armorPct * 100)}%`)}${row('Golpes/s', (1 / s.cooldown).toFixed(2))}</table>
      </div>
      <h3>Equipamento</h3><ul class="gear"></ul><h3>Bênçãos</h3><ul class="blessing-list"></ul>`;
    const names = { weapon: 'Arma', armor: 'Armadura', relic: 'Relíquia' } as const;
    panel.querySelector('.gear')!.replaceChildren(...(Object.keys(names) as (keyof typeof names)[]).map((slot) => {
      const li = document.createElement('li'), it = p.gear[slot];
      li.append(icon(ICON[slot], 'mini-icon'));
      const text = document.createElement('span');
      if (it) {
        text.innerHTML = '<b></b> <small></small>';
        const b = text.querySelector('b')!;
        b.textContent = `${it.name} (${RARITY[it.rarity].name})`;
        b.style.color = RARITY[it.rarity].color;
        text.querySelector('small')!.textContent = describeMods(it.mods);
      } else text.textContent = `${names[slot]}: nada equipado`;
      li.append(text);
      return li;
    }));
    panel.querySelector('.blessing-list')!.replaceChildren(...(w.upgrades.length ? w.upgrades : []).map((id) => {
      const li = document.createElement('li');
      li.append(icon(UPGRADES[id].icon, 'mini-icon'), UPGRADES[id].name);
      li.title = UPGRADES[id].text;
      return li;
    }));
  }

  function fillReward(): void {
    const offer = game.world?.offer ?? [];
    $('choices').replaceChildren(...offer.map((id, i) => {
      const u = UPGRADES[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.append(icon(u.icon, 'card-icon'));
      const name = document.createElement('b');
      name.textContent = `${i + 1}. ${u.name}`;
      const text = document.createElement('span');
      text.textContent = u.text;
      card.append(name, text);
      card.addEventListener('click', () => h.pick(id));
      return card;
    }));
  }

  function fillEnd(screen: 'victory' | 'defeat'): void {
    const w = game.world, r = game.result;
    $('end-title').textContent = screen === 'victory' ? 'O Anjo Caído tombou' : 'Você tombou';
    $('end-text').textContent = screen === 'victory'
      ? 'A ruína silencia. Por ora, a maldição recua.'
      : 'A maldição reclama mais uma alma. Levante-se e tente outra vez.';
    if (!w) return;
    const s = Math.floor(w.time), time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('end-stats').textContent =
      `Sala ${w.depth + 1}/${w.totalRooms} · Inimigos ${w.stats.kills} · Dano sofrido ${w.stats.damageTaken} · Nível ${w.player.level}` +
      `${r?.levelsGained ? ` (+${r.levelsGained})` : ''} · Tempo ${time}`;
    $('end-blessings').replaceChildren(...w.upgrades.map((id) => {
      const li = document.createElement('li');
      li.append(icon(UPGRADES[id].icon, 'mini-icon'), UPGRADES[id].name);
      return li;
    }));
    $('end-ashes').textContent = r
      ? `+${r.ashes} cinzas (total ${game.save.ashes})${r.newBest ? ' · novo recorde de profundidade!' : ''}`
      : '';
    $('end-warning').hidden = game.saved;
  }

  function icon(index: number, cls: string): HTMLElement {
    const el = document.createElement('span');
    el.className = `${cls} icon`;
    el.setAttribute('aria-hidden', 'true');
    return paintIcon(el, index);
  }

  /** Ícone da folha UI-002 (CSS sprite); sem a folha, um losango provisório. */
  function paintIcon(el: HTMLElement, index: number): HTMLElement {
    const sheet = art.icons;
    if (sheet?.frames) {
      const n = sheet.frames.length;
      el.style.backgroundImage = `url(${sheet.src})`;
      el.style.backgroundSize = `${n * 100}% 100%`;
      el.style.backgroundPosition = `${(index / (n - 1)) * 100}% 0`;
    } else el.classList.add('icon-placeholder');
    return el;
  }

  function hud(w: World | null): void {
    if (!w) return;
    const p = w.player, s = p.stats;
    set('hp', `${p.hp}/${p.maxHp}`, () => {
      const pct = `${(p.hp / p.maxHp) * 100}%`;
      $('hp-fill').style.height = pct;
      $('hp-cfill').style.width = pct;
      $('hp-text').textContent = $('hp-ctext').textContent = `${p.hp}/${p.maxHp}`;
      $('hp').setAttribute('aria-label', `Vida: ${p.hp} de ${p.maxHp}`);
    });
    const fe = Math.floor(p.fe);
    set('fe', fe, () => {
      const pct = `${(fe / s.maxFe) * 100}%`;
      $('fe-fill').style.height = pct;
      $('fe-cfill').style.width = pct;
      $('fe-text').textContent = String(fe);
      $('fe').setAttribute('aria-label', `Fé: ${fe} de ${s.maxFe}`);
    });
    cooldown('attack', p.cooldown / s.cooldown, false);
    cooldown('dodge', p.dodgeCd / (CONFIG.player.dodge.duration + s.dodgeCooldown), false);
    cooldown('skill', p.skillCd / s.skillCooldown, p.fe < CONFIG.player.skill.cost);
    const need = xpToNext(p.level), maxed = p.level >= CONFIG.levels.max;
    set('xp', `${p.level}:${p.xp}`, () => {
      $('xp-fill').style.width = maxed ? '100%' : `${(p.xp / need) * 100}%`;
      $('level').textContent = maxed ? `Nível ${p.level} (máximo)` : `Nível ${p.level} · ${p.xp}/${need}`;
      $('xp').setAttribute('aria-label', `Nível ${p.level}, experiência ${p.xp} de ${need}`);
    });
    objective(w);
    set('blessings', w.upgrades.length, () => blessings.replaceChildren(...w.upgrades.map((id) => {
      const el = icon(UPGRADES[id].icon, 'mini-icon');
      el.title = `${UPGRADES[id].name}: ${UPGRADES[id].text}`;
      return el;
    })));
    const b = w.enemies.find((e) => CONFIG.enemies[e.kind].boss);
    set('boss', b ? `${b.hp}/${b.maxHp}` : '', () => {
      boss.hidden = !b;
      if (b) {
        $('boss-name').textContent = CONFIG.enemies[b.kind].name;
        bossFill.style.width = `${(Math.max(0, b.hp) / b.maxHp) * 100}%`;
        boss.setAttribute('aria-label', `${CONFIG.enemies[b.kind].name}: ${b.hp} de ${b.maxHp}`);
      }
    });
    set('hint', w.depth === 0 && w.time < HINT_TIME && !w.outcome, () => hint.classList.toggle('visible', shown.get('hint') === true));
    toast(w);
    drawMinimap(w);
  }

  function cooldown(slot: string, frac: number, blocked: boolean): void {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 20) * 5;
    set(`cd-${slot}`, `${pct}:${blocked}`, () => {
      const el = $(`slot-${slot}`);
      (el.querySelector('.cd') as HTMLElement).style.height = `${pct}%`;
      el.classList.toggle('blocked', blocked);
    });
  }

  function objective(w: World): void {
    const last = w.depth === w.totalRooms - 1;
    const title = `Sala ${w.depth + 1}/${w.totalRooms} · ${w.totalRooms === 1 ? 'Nave' : ROOM_NAMES[w.depth] ?? 'Ruínas'}`;
    const text = w.phase === 'exit' ? 'Siga pela porta ao norte'
      : w.phase === 'reward' ? 'Sala purificada'
        : last ? 'Derrote o Anjo Caído'
          : `Purifique a sala · ${w.enemies.length} ${w.enemies.length === 1 ? 'inimigo restante' : 'inimigos restantes'}`;
    set('obj', title + text, () => {
      $('obj-title').textContent = title;
      $('obj-text').textContent = text;
      $('objective').classList.toggle('exit', w.phase === 'exit');
    });
  }

  function toast(w: World): void {
    const l = w.lastLoot, visible = !!l && w.time - l.time < TOAST_TIME;
    set('toast', visible ? `${l!.time}` : '', () => {
      const el = $('loot-toast');
      el.classList.toggle('visible', visible);
      if (!visible || !l) return;
      const r = RARITY[l.item.rarity];
      el.innerHTML = '<b></b><small></small>';
      const b = el.querySelector('b')!;
      b.textContent = `${l.equipped ? 'Equipado' : 'Convertido em cinzas'}: ${l.item.name}`;
      b.style.color = r.color;
      el.querySelector('small')!.textContent = l.equipped ? `${r.name} · ${describeMods(l.item.mods)}` : `${r.name} · +${l.ashes} cinzas (o equipado é melhor)`;
    });
  }

  /** Minimapa isométrico: camada da sala em cache + pontos de jogador, inimigos, saque e porta. */
  function drawMinimap(w: World): void {
    if (!mm) return;
    const T = CONFIG.tile, W = minimap.width, H = minimap.height, room = w.room;
    const x0 = isoX(0, room.rows * T), x1 = isoX(room.cols * T, 0), y1 = isoY(room.cols * T, room.rows * T);
    const k = Math.min((W - 8) / (x1 - x0), (H - 8) / y1), ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - y1 * k) / 2;
    const px = (x: number, y: number) => ox + isoX(x, y) * k, py = (x: number, y: number) => oy + isoY(x, y) * k;
    if (mapRoom !== room || !mapLayer) {
      mapRoom = room;
      mapLayer = document.createElement('canvas');
      mapLayer.width = W;
      mapLayer.height = H;
      const g = mapLayer.getContext('2d')!;
      for (let ty = 0; ty < room.rows; ty++) {
        for (let tx = 0; tx < room.cols; tx++) {
          const ch = room.tiles[ty][tx];
          if (ch === '#' && !near(room, tx, ty)) continue;
          g.fillStyle = ch === '.' ? 'rgba(120,130,150,0.45)' : ch === '#' ? 'rgba(220,205,170,0.55)' : 'rgba(196,154,69,0.7)';
          g.beginPath();
          g.moveTo(px(tx * T, ty * T), py(tx * T, ty * T));
          g.lineTo(px((tx + 1) * T, ty * T), py((tx + 1) * T, ty * T));
          g.lineTo(px((tx + 1) * T, (ty + 1) * T), py((tx + 1) * T, (ty + 1) * T));
          g.lineTo(px(tx * T, (ty + 1) * T), py(tx * T, (ty + 1) * T));
          g.closePath();
          g.fill();
        }
      }
    }
    mm.clearRect(0, 0, W, H);
    mm.drawImage(mapLayer, 0, 0);
    const dot = (x: number, y: number, r: number, color: string) => {
      mm.fillStyle = color;
      mm.beginPath();
      mm.arc(px(x, y), py(x, y), r, 0, Math.PI * 2);
      mm.fill();
    };
    if (w.phase === 'exit') dot(CONFIG.view.w / 2, 3 * T, 4, '#f3c75a');
    for (const l of w.loot) dot(l.x, l.y, 2.5, RARITY[l.item.rarity].color);
    for (const e of w.enemies) dot(e.x, e.y, CONFIG.enemies[e.kind].boss ? 4 : 2.5, '#e0303f');
    dot(w.player.x, w.player.y, 3.5, '#f3e3b8');
  }

  return { show, hud };
}

/** Tile de parede que encosta no piso (o resto da parede não aparece no minimapa). */
function near(room: Room, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (room.tiles[ty + dy]?.[tx + dx] === '.') return true;
  return false;
}
