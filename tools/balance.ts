// Simula incursões completas com o bot dos testes e resume a dificuldade (Fase 4: balanceamento).
// Uso: node tools/balance.ts [incursões]
import { createGame, startRun } from '../src/game/game.ts';
import { playRun } from '../tests/helpers.ts';

const runs = Number(process.argv[2] ?? 20);
let wins = 0, totalTime = 0;
const deaths: number[] = [], hpLeft: number[] = [], levels: number[] = [], damage: number[] = [];
for (let seed = 1; seed <= runs; seed++) {
  const g = createGame();
  startRun(g, seed * 7919);
  playRun(g, 900);
  const w = g.world!;
  if (g.screen === 'victory') {
    wins++;
    hpLeft.push(w.player.hp / w.player.maxHp);
  } else deaths.push(w.depth + 1);
  totalTime += w.time;
  levels.push(w.player.level);
  damage.push(w.stats.damageTaken);
}
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
console.log(`vitórias do bot: ${wins}/${runs}`);
console.log(`mortes por sala: ${JSON.stringify(deaths.reduce<Record<number, number>>((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {}))}`);
console.log(`vida restante média nas vitórias: ${(avg(hpLeft) * 100).toFixed(0)}%`);
console.log(`dano sofrido médio: ${avg(damage).toFixed(0)} · nível final médio: ${avg(levels).toFixed(1)} · duração média: ${(totalTime / runs).toFixed(0)} s`);
