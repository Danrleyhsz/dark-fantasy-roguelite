import { CONFIG } from '../game/config.ts';
import type { Game, Screen } from '../game/game.ts';
import { META, UPGRADES, type MetaId, type UpgradeId } from '../game/upgrades.ts';
import type { World } from '../game/world.ts';
import { ART } from '../rendering/art.gen.ts';

export interface UIHandlers {
  start(): void;
  resume(): void;
  restart(): void;
  menu(): void;
  pause(): void;
  pick(id: UpgradeId): void;
  buy(id: MetaId): void;
  reduceMotion(on: boolean): void;
}

export interface UI {
  show(screen: Screen): void;
  /** Atualiza o HUD; só mexe no DOM quando algo mudou. */
  hud(world: World | null): void;
}

/** Duração das dicas de controle no início da incursão (tutorial curto do GDD). */
const HINT_TIME = 8;
/** Posição do ícone de cinzas na folha de ícones (depois das 8 bênçãos). */
const ASH_ICON = 8;
const art: Partial<Record<string, { src: string; frames?: readonly string[] }>> = ART;

export function createUI(game: Game, h: UIHandlers): UI {
  const $ = (id: string) => document.getElementById(id)!;
  const menu = $('menu'), pause = $('pause'), reward = $('reward'), end = $('end');
  const hp = $('hp'), hint = $('hint'), room = $('room'), blessings = $('blessings'), boss = $('boss'), bossFill = $('boss-fill');
  $('btn-start').addEventListener('click', h.start);
  $('btn-resume').addEventListener('click', h.resume);
  $('btn-restart').addEventListener('click', h.restart);
  $('btn-quit').addEventListener('click', h.menu);
  $('btn-again').addEventListener('click', h.restart);
  $('btn-menu').addEventListener('click', h.menu);
  $('btn-pause').addEventListener('click', h.pause);
  const motion = $('opt-motion') as HTMLInputElement;
  motion.addEventListener('change', () => h.reduceMotion(motion.checked));
  // Atalhos 1-3 na escolha de bênção.
  window.addEventListener('keydown', (e) => {
    if (game.screen !== 'reward' || !game.world?.offer) return;
    const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (i >= 0 && game.world.offer[i]) h.pick(game.world.offer[i]);
  });

  let shown = { hp: -1, max: -1, hint: null as boolean | null, room: '', blessings: -1, boss: '' };

  function show(screen: Screen): void {
    document.body.dataset.screen = screen;
    menu.hidden = screen !== 'menu';
    pause.hidden = screen !== 'paused';
    reward.hidden = screen !== 'reward';
    end.hidden = screen !== 'victory' && screen !== 'defeat';
    if (screen === 'menu') fillMenu();
    if (screen === 'reward') fillReward();
    if (screen === 'victory' || screen === 'defeat') fillEnd(screen);
    if (screen === 'playing') shown = { ...shown, hp: -1, room: '', blessings: -1, boss: '' };
    const focus = { menu: 'btn-start', paused: 'btn-resume', victory: 'btn-again', defeat: 'btn-again', reward: null, playing: null }[screen];
    if (focus) $(focus).focus();
    else if (screen === 'reward') (reward.querySelector('button') as HTMLButtonElement | null)?.focus();
    else (document.activeElement as HTMLElement | null)?.blur?.();
  }

  function fillMenu(): void {
    const s = game.save;
    paintIcon($('ash-icon'), ASH_ICON);
    $('ashes').textContent = String(s.ashes);
    $('record').textContent = s.best.runs
      ? `Incursões: ${s.best.runs} · Vitórias: ${s.best.wins} · Sala mais funda: ${s.best.depth}/${CONFIG.run.encounters.length}`
      : 'Nenhuma incursão ainda.';
    motion.checked = s.settings.reduceMotion;
    $('relics').replaceChildren(...(Object.keys(META) as MetaId[]).map((id) => {
      const m = META[id], level = s.meta[id], cost = m.costs[level];
      const li = document.createElement('li');
      const info = document.createElement('span');
      info.innerHTML = `<b></b> <span class="level"></span><br><small></small>`;
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
      `Sala ${w.depth + 1}/${w.totalRooms} · Inimigos derrotados ${w.stats.kills} · Dano sofrido ${w.stats.damageTaken} · Tempo ${time}`;
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
    const p = w.player;
    if (p.hp !== shown.hp || p.maxHp !== shown.max) {
      shown.hp = p.hp;
      shown.max = p.maxHp;
      hp.replaceChildren(...Array.from({ length: p.maxHp }, (_, i) => {
        const pip = document.createElement('span');
        pip.className = i < p.hp ? 'pip' : 'pip empty';
        return pip;
      }));
      hp.setAttribute('aria-label', `Vida: ${p.hp} de ${p.maxHp}`);
      $('hp-text').textContent = `${p.hp}/${p.maxHp}`;
    }
    const roomText = w.phase === 'exit' ? 'Siga pela porta ao norte' : `Sala ${w.depth + 1}/${w.totalRooms}`;
    if (roomText !== shown.room) {
      shown.room = roomText;
      room.textContent = roomText;
      room.classList.toggle('exit', w.phase === 'exit');
    }
    if (w.upgrades.length !== shown.blessings) {
      shown.blessings = w.upgrades.length;
      blessings.replaceChildren(...w.upgrades.map((id) => {
        const el = icon(UPGRADES[id].icon, 'mini-icon');
        el.title = `${UPGRADES[id].name}: ${UPGRADES[id].text}`;
        return el;
      }));
    }
    const b = w.enemies.find((e) => CONFIG.enemies[e.kind].boss);
    const bossKey = b ? `${b.hp}/${b.maxHp}` : '';
    if (bossKey !== shown.boss) {
      shown.boss = bossKey;
      boss.hidden = !b;
      if (b) {
        $('boss-name').textContent = CONFIG.enemies[b.kind].name;
        bossFill.style.width = `${(Math.max(0, b.hp) / b.maxHp) * 100}%`;
        boss.setAttribute('aria-label', `${CONFIG.enemies[b.kind].name}: ${b.hp} de ${b.maxHp}`);
      }
    }
    const showHint = w.depth === 0 && w.time < HINT_TIME && !w.outcome;
    if (showHint !== shown.hint) {
      shown.hint = showHint;
      hint.classList.toggle('visible', showHint);
    }
  }

  return { show, hud };
}
