import type { AffixDef, SlotId, TierFormula } from './types';

const W: SlotId = 'weapon', R: SlotId = 'ring', A: SlotId = 'amulet', H: SlotId = 'helmet',
  C: SlotId = 'chest', B: SlotId = 'boots', G: SlotId = 'gloves';

const tf = (base: number, growth: number, decimals: number, spread = 0.2): TierFormula => ({ base, growth, spread, decimals });

type Opt = Partial<Pick<AffixDef, 'weight' | 'minItemLevel' | 'tierOverrides' | 'classes' | 'minRarity' | 'op' | 'group'>>;

const pre = (id: string, stat: string, slots: SlotId[], tiers: TierFormula, o: Opt = {}): AffixDef => ({
  id: `affix.${id}`, stat, op: o.op ?? 'add', kind: 'prefix', slots, group: o.group ?? stat,
  weight: o.weight ?? 100, minItemLevel: o.minItemLevel ?? 1, tiers, tierOverrides: o.tierOverrides,
  classes: o.classes, minRarity: o.minRarity,
});
const suf = (id: string, stat: string, slots: SlotId[], tiers: TierFormula, o: Opt = {}): AffixDef => ({
  ...pre(id, stat, slots, tiers, o), kind: 'suffix',
});

const SKILL_LEVEL_TIERS = [[1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [2, 2], [2, 3], [3, 3]] as const;

/** M1 affix subset (~34). Full catalog follows in M2 (SPEC Teil 7). */
export const AFFIXES: readonly AffixDef[] = [
  // ---- Prefixes
  pre('life.max', 'life.max', [R, H, C, B], tf(10, 1.42, 0)),
  pre('armor', 'armor', [H, C, B, G], tf(12, 1.45, 0)),
  pre('evasion', 'evasion', [H, C, B], tf(12, 1.45, 0)),
  pre('weapon.flat', 'weapon.flat', [W], tf(2, 1.45, 0)),
  pre('dmg.physical', 'dmg.physical', [W, R, A, G], tf(0.08, 1.3, 2)),
  pre('dmg.melee', 'dmg.melee', [W, R, G], tf(0.07, 1.3, 2)),
  pre('dmg.aoe', 'dmg.aoe', [W, R, G], tf(0.07, 1.3, 2)),
  pre('dmg.bleed', 'dmg.bleed', [W, R, A, G], tf(0.09, 1.3, 2)),
  pre('dmg.dot', 'dmg.dot', [W, R, A, G], tf(0.07, 1.3, 2)),
  pre('dr.physical', 'dr.physical', [H, C, B], tf(0.02, 1.25, 3), { weight: 60 }),
  pre('resource.max', 'resource.max', [R, H, C], tf(4, 1.3, 0)),
  pre('skill.level.all', 'skill.level.all', [W, A], tf(1, 1, 0), { weight: 15, minItemLevel: 20, tierOverrides: SKILL_LEVEL_TIERS }),
  pre('skill.level.melee', 'skill.level.melee', [W, A], tf(1, 1, 0), { weight: 25, minItemLevel: 10, tierOverrides: SKILL_LEVEL_TIERS }),
  pre('move.speed', 'move.speed.inc', [B], tf(0.03, 1.25, 3)),
  // ---- Suffixes
  suf('attack.speed', 'attack.speed', [W, R, B, G], tf(0.03, 1.2, 3)),
  suf('crit.chance', 'crit.chance', [W, R, A, G], tf(0.01, 1.22, 3)),
  suf('crit.multi', 'crit.multi', [W, R, A, G], tf(0.06, 1.25, 2)),
  suf('life.regen', 'life.regen', [R, A, H, C, B], tf(1, 1.5, 1)),
  suf('leech.life', 'leech.life', [W, R, G], tf(0.004, 1.2, 3), { weight: 60 }),
  suf('res.fire', 'res.fire', [H, C, B], tf(0.04, 1.2, 2)),
  suf('res.cold', 'res.cold', [H, C, B], tf(0.04, 1.2, 2)),
  suf('res.lightning', 'res.lightning', [H, C, B], tf(0.04, 1.2, 2)),
  suf('res.all', 'res.all', [H, C, B], tf(0.02, 1.2, 2), { weight: 40 }),
  suf('block.chance', 'block.chance', [H, C, B], tf(0.02, 1.2, 3)),
  suf('bleed.chance', 'bleed.chance', [R, G], tf(0.04, 1.25, 2)),
  suf('bleed.duration', 'bleed.duration', [R], tf(0.06, 1.25, 2)),
  suf('dmg.vs.boss', 'dmg.vs.boss', [W, R, A], tf(0.06, 1.3, 2)),
  suf('dmg.vs.elite', 'dmg.vs.elite', [W, R], tf(0.06, 1.3, 2)),
  suf('cdr', 'cdr', [R, A, H, B], tf(0.015, 1.2, 3), { weight: 50 }),
  suf('find.gold', 'find.gold', [R, B], tf(0.05, 1.3, 2)),
  suf('find.xp', 'find.xp', [R, B], tf(0.03, 1.25, 2)),
  suf('find.rarity', 'find.rarity', [R, A], tf(0.04, 1.3, 2), { weight: 50 }),
  suf('life.onKill', 'life.onKill', [C], tf(1, 1.5, 0)),
  suf('resource.regen', 'resource.regen', [A, H, B], tf(0.3, 1.3, 1)),
];
