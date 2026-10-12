import { CONFIG } from './config.ts';
import type { Item, Slot } from './items.ts';
import { META, type MetaLevels, type UpgradeId } from './upgrades.ts';

/** Atributos finais do jogador: sempre derivados de nível, equipamento, bênçãos e Relicário. */
export interface PlayerStats {
  damage: number;
  range: number;
  arc: number;
  cooldown: number;
  dodgeCooldown: number;
  critChance: number;
  maxHp: number;
  /** Fração do dano recebido que é ignorada. */
  armorPct: number;
  maxFe: number;
  feRegen: number;
  skillCooldown: number;
  skillDamage: number;
}

export interface Attributes { strength: number; vitality: number; dexterity: number }
export type Gear = Record<Slot, Item | null>;

export const EMPTY_GEAR: Gear = { weapon: null, armor: null, relic: null };

/** Cada nível acima do 1 soma +1 em Força, Vitalidade e Destreza. */
export function attributesFor(level: number): Attributes {
  const v = CONFIG.attributes.base + level - 1;
  return { strength: v, vitality: v, dexterity: v };
}

/** Experiência para passar do nível `level` ao seguinte. */
export function xpToNext(level: number): number {
  return CONFIG.levels.first + CONFIG.levels.step * (level - 1);
}

export function deriveStats(level: number, gear: Gear, upgrades: UpgradeId[], meta: MetaLevels): PlayerStats {
  const P = CONFIG.player, A = CONFIG.attributes, at = attributesFor(level);
  let dmgPct = (at.strength - A.base) * A.strengthDamage;
  let crit = P.critChance + (at.dexterity - A.base) * A.dexterityCrit;
  let hp = P.maxHp + (at.vitality - A.base) * A.vitalityHp + meta.vigor * META.vigor.perLevel;
  let armor = 0, feRegen = P.fe.regen, skillCdPct = 0;
  for (const it of Object.values(gear)) {
    if (!it) continue;
    dmgPct += it.mods.damagePct ?? 0;
    crit += it.mods.critChance ?? 0;
    hp += it.mods.hpFlat ?? 0;
    armor += it.mods.armorPct ?? 0;
    feRegen += it.mods.feRegen ?? 0;
    skillCdPct += it.mods.skillCdPct ?? 0;
  }
  hp += upgrades.filter((u) => u === 'vigor').length * CONFIG.vigorHp;
  const speed = 1 + (at.dexterity - A.base) * A.dexteritySpeed;
  return {
    damage: P.attack.damage * (1 + dmgPct),
    range: P.attack.range * (upgrades.includes('reach') ? 1.35 : 1),
    arc: P.attack.arc,
    cooldown: (P.attack.cooldown / speed) * (1 - meta.edge * META.edge.perLevel) * (upgrades.includes('swift') ? 0.7 : 1),
    dodgeCooldown: P.dodge.cooldown * (1 - meta.breath * META.breath.perLevel),
    critChance: Math.min(0.75, crit),
    maxHp: Math.round(hp),
    armorPct: Math.min(0.6, armor),
    maxFe: P.fe.max,
    feRegen,
    skillCooldown: P.skill.cooldown * (1 - Math.min(0.5, skillCdPct)),
    skillDamage: P.skill.damage * (1 + dmgPct),
  };
}
