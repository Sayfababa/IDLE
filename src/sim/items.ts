import { BALANCE } from '../data/balance';
import { Data } from '../data/registry';
import { NAME_FIRST, NAME_SECOND } from '../data/names';
import { AFFIXES } from '../data/affixes';
import { BASE_ITEMS } from '../data/items';
import { RARITIES, SLOTS, type AffixDef, type ClassId, type RarityId, type SlotId } from '../data/types';
import type { Rng } from '../core/rng';
import type { ItemInstance, RolledAffix } from './types';

export const rarityIndex = (r: RarityId): number => RARITIES.indexOf(r);

/** Highest affix tier (1..8) allowed for an item level. */
export function maxTierForItemLevel(ilvl: number): number {
  const table = BALANCE.items.tierItemLevel;
  let t = 0;
  for (let i = 0; i < table.length; i++) if (ilvl >= (table[i] ?? Infinity)) t = i + 1;
  return Math.max(1, t);
}

/** [min, max] roll range of an affix at a tier. */
export function tierRange(a: AffixDef, tier: number): [number, number] {
  const o = a.tierOverrides?.[tier - 1];
  if (o) return [o[0], o[1]];
  const mid = a.tiers.base * Math.pow(a.tiers.growth, tier - 1);
  const f = Math.pow(10, a.tiers.decimals);
  let lo = Math.round(mid * (1 - a.tiers.spread) * f) / f;
  let hi = Math.round(mid * (1 + a.tiers.spread) * f) / f;
  if (a.tiers.decimals === 0) { lo = Math.max(1, lo); hi = Math.max(lo, hi); }
  return [lo, hi];
}

export function rollAffixValue(a: AffixDef, tier: number, rng: Rng): number {
  const [lo, hi] = tierRange(a, tier);
  if (a.tiers.decimals === 0 || a.tierOverrides) return rng.int(Math.round(lo), Math.round(hi));
  const f = Math.pow(10, a.tiers.decimals);
  return Math.min(hi, Math.max(lo, Math.round(rng.range(lo, hi) * f) / f));
}

export function rollRarity(rng: Rng, bonus: number, minRarity: RarityId = 'normal'): RarityId {
  const min = rarityIndex(minRarity);
  const w = BALANCE.rarity.weights;
  const pick = rng.weighted(RARITIES.filter((r) => rarityIndex(r) >= min), (r) => (r === 'normal' ? w[r] : w[r] * (1 + bonus)));
  return pick ?? minRarity;
}

function eligibleAffixes(slot: SlotId, ilvl: number, cls: ClassId, rarity: RarityId, used: Set<string>, kind: AffixDef['kind']): AffixDef[] {
  return AFFIXES.filter((a) =>
    a.kind === kind && a.slots.includes(slot) && ilvl >= a.minItemLevel && !used.has(a.group) &&
    (!a.classes || a.classes.includes(cls)) && (!a.minRarity || rarityIndex(rarity) >= rarityIndex(a.minRarity)));
}

export interface GenOptions {
  ilvl: number;
  classId: ClassId;
  uid: string;
  slot?: SlotId;
  base?: string;
  rarity?: RarityId;
  minRarity?: RarityId;
  rarityBonus?: number;
}

export function generateItem(rng: Rng, o: GenOptions): ItemInstance {
  const cls = Data.cls(o.classId);
  const bases = BASE_ITEMS.filter((b) =>
    (o.base ? b.id === o.base : true) && (o.slot ? b.slot === o.slot : true) && o.ilvl >= b.minItemLevel &&
    (b.slot !== 'weapon' || cls.weaponBases.includes(b.id)));
  // Pick slot uniformly first (so weapons are not starved), then base by weight.
  const slots = SLOTS.filter((s) => bases.some((b) => b.slot === s));
  const slot = o.slot ?? rng.pick(slots);
  const base = rng.weighted(bases.filter((b) => b.slot === slot), (b) => b.dropWeight);
  if (!base) throw new Error(`No base item for slot ${slot} ilvl ${o.ilvl}`);

  const rarity = o.rarity ?? rollRarity(rng, o.rarityBonus ?? 0, o.minRarity);
  const scale = 1 + BALANCE.items.implicitScaling * (o.ilvl - 1);
  const implicits = base.implicits.map((m) => {
    const unit = Data.stat(m.stat).unit;
    const value = unit === 'number' ? Math.round(m.value * scale) : m.value;
    return { ...m, value };
  });
  let weapon: ItemInstance['weapon'];
  if (base.weapon) {
    const ws = 1 + BALANCE.items.weaponScaling * (o.ilvl - 1);
    weapon = {
      min: Math.round(base.weapon.min * ws * rng.range(0.9, 1.1)),
      max: Math.round(base.weapon.max * ws * rng.range(0.9, 1.1)),
      aps: base.weapon.aps,
      crit: base.weapon.crit,
    };
    if (weapon.max <= weapon.min) weapon.max = weapon.min + 1;
  }

  const [cmin, cmax] = BALANCE.rarity.affixCount[rarity];
  const count = rng.int(cmin, cmax);
  const affixes: RolledAffix[] = [];
  const used = new Set<string>();
  let prefixes = 0, suffixes = 0;
  const maxTier = maxTierForItemLevel(o.ilvl);
  for (let i = 0; i < count; i++) {
    const kinds: AffixDef['kind'][] = [];
    if (prefixes < BALANCE.items.maxPrefixes && eligibleAffixes(slot, o.ilvl, o.classId, rarity, used, 'prefix').length) kinds.push('prefix');
    if (suffixes < BALANCE.items.maxSuffixes && eligibleAffixes(slot, o.ilvl, o.classId, rarity, used, 'suffix').length) kinds.push('suffix');
    if (kinds.length === 0) break;
    const kind = rng.pick(kinds);
    const pool = eligibleAffixes(slot, o.ilvl, o.classId, rarity, used, kind);
    const def = rng.weighted(pool, (a) => a.weight * (base.affixWeightMods?.[a.group] ?? 1));
    if (!def) break;
    const tiers = Array.from({ length: maxTier }, (_, k) => k + 1);
    const tier = rng.weighted(tiers, (t) => Math.pow(BALANCE.items.tierWeightFalloff, t - 1)) ?? 1;
    affixes.push({ id: def.id, tier, value: rollAffixValue(def, tier, rng) });
    used.add(def.group);
    if (kind === 'prefix') prefixes++; else suffixes++;
  }

  let name: string | undefined;
  if (rarityIndex(rarity) >= rarityIndex('rare')) {
    name = rng.pick(NAME_FIRST) + rng.pick(NAME_SECOND[slot] ?? ['stück']);
  }
  return { uid: o.uid, base: base.id, slot, rarity, ilvl: o.ilvl, name, implicits, affixes, weapon };
}

export function sellValue(item: ItemInstance): number {
  const b = BALANCE.items;
  return Math.max(1, Math.round(b.sellBase * BALANCE.rarity.sellMult[item.rarity] * (1 + item.ilvl * b.sellPerItemLevel)));
}
