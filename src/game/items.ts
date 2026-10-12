// Equipamentos com raridade (GDD/VISUAL_DIRECTION: equipamentos, raridades e builds).
// Cada item tem um slot e modificadores; o mais forte é equipado ao pegar, o resto vira cinzas.

export type Slot = 'weapon' | 'armor' | 'relic';
export type Rarity = 0 | 1 | 2 | 3;

export interface ItemMods {
  /** Dano extra (fração: 0.2 = +20%). */
  damagePct?: number;
  critChance?: number;
  hpFlat?: number;
  /** Redução do dano recebido (fração). */
  armorPct?: number;
  /** Fé regenerada por segundo. */
  feRegen?: number;
  /** Redução da recarga da habilidade (fração). */
  skillCdPct?: number;
}

export interface Item {
  slot: Slot;
  rarity: Rarity;
  name: string;
  mods: ItemMods;
}

export const RARITY = [
  { name: 'Comum', color: '#c9bc9c', ashes: 1 },
  { name: 'Mágico', color: '#6f9be6', ashes: 2 },
  { name: 'Raro', color: '#e8b84a', ashes: 4 },
  { name: 'Lendário', color: '#ff7a3d', ashes: 8 },
] as const;

const BASES: Record<Slot, string[]> = {
  weapon: ['Espada Longa', 'Lâmina Penitente', 'Montante Sagrado'],
  armor: ['Cota de Malha', 'Placas do Cruzado', 'Manto do Peregrino'],
  relic: ['Relicário de Osso', 'Rosário de Brasas', 'Fragmento de Auréola'],
};
const SUFFIX = ['', ' Benta', ' do Mártir', ' do Anjo Caído'];

/** Sorteia a raridade; salas mais fundas e inimigos fortes puxam para cima. */
export function rollRarity(rng: () => number, depth: number, minRarity: Rarity = 0): Rarity {
  const r = rng() + depth * 0.05;
  const rolled: Rarity = r > 0.97 ? 3 : r > 0.85 ? 2 : r > 0.58 ? 1 : 0;
  return Math.max(rolled, minRarity) as Rarity;
}

export function rollItem(rng: () => number, depth: number, minRarity: Rarity = 0): Item {
  const slot = (['weapon', 'armor', 'relic'] as const)[Math.floor(rng() * 3)];
  const rarity = rollRarity(rng, depth, minRarity);
  const tier = 1 + 0.15 * depth, q = rarity;
  const mods: ItemMods = {};
  if (slot === 'weapon') {
    mods.damagePct = round2((0.08 + 0.07 * q) * tier);
    if (q >= 2) mods.critChance = round2(0.03 + 0.02 * q);
  } else if (slot === 'armor') {
    mods.hpFlat = Math.round((10 + 8 * q) * tier);
    mods.armorPct = round2(0.03 + 0.03 * q);
  } else {
    mods.feRegen = round2((1 + 1.2 * q) * tier);
    if (q >= 1) mods.skillCdPct = round2(0.06 + 0.04 * q);
  }
  const base = BASES[slot][Math.floor(rng() * BASES[slot].length)];
  return { slot, rarity, name: base + SUFFIX[rarity], mods };
}

/** Poder do item, para decidir se vale trocar o equipado. */
export function itemPower(item: Item | null): number {
  if (!item) return -1;
  const m = item.mods;
  return (m.damagePct ?? 0) * 100 + (m.critChance ?? 0) * 150 + (m.hpFlat ?? 0) + (m.armorPct ?? 0) * 200
    + (m.feRegen ?? 0) * 6 + (m.skillCdPct ?? 0) * 120;
}

/** Texto curto dos modificadores, para a interface. */
export function describeMods(m: ItemMods): string {
  const parts: string[] = [];
  if (m.damagePct) parts.push(`+${Math.round(m.damagePct * 100)}% dano`);
  if (m.critChance) parts.push(`+${Math.round(m.critChance * 100)}% crítico`);
  if (m.hpFlat) parts.push(`+${m.hpFlat} vida`);
  if (m.armorPct) parts.push(`-${Math.round(m.armorPct * 100)}% dano sofrido`);
  if (m.feRegen) parts.push(`+${m.feRegen.toFixed(1)} Fé/s`);
  if (m.skillCdPct) parts.push(`-${Math.round(m.skillCdPct * 100)}% recarga da habilidade`);
  return parts.join(' · ');
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
