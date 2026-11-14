import { Data } from '../data/registry';
import { BALANCE } from '../data/balance';
import type { Modifier, SkillDef, Tag } from '../data/types';
import type { Buff, ItemInstance, Profile } from './types';

interface Agg { add: number; inc: number; more: number }

export interface WeaponStats { min: number; max: number; aps: number; crit: number }

const UNARMED: WeaponStats = { min: 2, max: 4, aps: 1.1, crit: 0.04 };

/**
 * Aggregated stats of the player. Always rebuilt from scratch (never incremental)
 * so equip/unequip can never double-apply a modifier (SPEC 10).
 */
export class StatSheet {
  private agg = new Map<string, Agg>();
  weapon: WeaponStats = UNARMED;

  addMod(m: Modifier): void {
    let a = this.agg.get(m.stat);
    if (!a) { a = { add: 0, inc: 0, more: 1 }; this.agg.set(m.stat, a); }
    if (m.op === 'add') a.add += m.value;
    else if (m.op === 'inc') a.inc += m.value;
    else a.more *= 1 + m.value;
  }

  raw(stat: string): Agg {
    return this.agg.get(stat) ?? { add: 0, inc: 0, more: 1 };
  }

  /** Summed 'add' part – used for percent stats such as dmg.* . */
  sum(stat: string): number { return this.raw(stat).add; }

  /** Product of 'more' modifiers. */
  more(stat: string): number { return this.raw(stat).more; }

  /** Final value: add * (1+inc) * more, capped. Resistances include res.all. */
  get(stat: string): number {
    const a = this.raw(stat);
    let v = a.add * (1 + a.inc) * a.more;
    if (stat.startsWith('res.') && stat !== 'res.all') v += this.raw('res.all').add;
    const cap = Data.stats.get(stat)?.cap;
    if (cap !== undefined) v = Math.min(v, cap);
    return v;
  }
}

export function itemMods(item: ItemInstance): Modifier[] {
  const mods: Modifier[] = [...item.implicits];
  for (const a of item.affixes) {
    const def = Data.affix(a.id);
    mods.push({ stat: def.stat, op: def.op, value: a.value });
  }
  return mods;
}

/** Builds the full stat sheet for a profile (+ optional buffs, + optional item override for comparisons). */
export function buildStats(p: Profile, buffs: readonly Buff[] = [], override?: { slot: string; item: ItemInstance | undefined }): StatSheet {
  const cls = Data.cls(p.classId);
  const sh = new StatSheet();
  const lvl = p.level - 1;
  sh.addMod({ stat: 'life.max', op: 'add', value: cls.base.life + cls.base.lifePerLevel * lvl });
  sh.addMod({ stat: 'armor', op: 'add', value: cls.base.armor });
  sh.addMod({ stat: 'evasion', op: 'add', value: cls.base.evasion });
  sh.addMod({ stat: 'crit.chance', op: 'add', value: cls.base.critChance });
  sh.addMod({ stat: 'crit.multi', op: 'add', value: cls.base.critMulti });
  sh.addMod({ stat: 'move.speed', op: 'add', value: cls.base.moveSpeed });
  sh.addMod({ stat: 'resource.max', op: 'add', value: cls.resource.max });
  sh.addMod({ stat: 'resource.regen', op: 'add', value: cls.resource.regen });
  sh.addMod({ stat: 'block.power', op: 'add', value: 0.5 });
  sh.addMod({ stat: 'life.regen', op: 'add', value: BALANCE.player.baseLifeRegen + BALANCE.player.lifeRegenPerLevel * lvl });
  sh.addMod({ stat: 'dmg.all', op: 'add', value: BALANCE.player.dmgIncPerLevel * lvl });

  for (const [slot, equipped] of Object.entries(p.equipment)) {
    const item = override && override.slot === slot ? override.item : equipped;
    if (!item) continue;
    for (const m of itemMods(item)) sh.addMod(m);
    if (item.weapon) sh.weapon = item.weapon;
  }
  if (override && !(override.slot in p.equipment) && override.item) {
    for (const m of itemMods(override.item)) sh.addMod(m);
    if (override.item.weapon) sh.weapon = override.item.weapon;
  }
  for (const b of buffs) for (const m of b.mods) sh.addMod(m);
  return sh;
}

const LEVEL_TAGS: readonly Tag[] = ['melee', 'warcry'];

export function isUnlocked(p: Profile, skill: SkillDef): boolean {
  return p.level >= skill.unlockLevel;
}

/** Effective skill level: 1 + invested points + gear bonuses. */
export function skillLevel(p: Profile, sh: StatSheet, skill: SkillDef): number {
  if (!isUnlocked(p, skill)) return 0;
  let lvl = 1 + (p.skillInvest[skill.id] ?? 0) + Math.floor(sh.get('skill.level.all'));
  for (const tag of LEVEL_TAGS) if (skill.tags.includes(tag)) lvl += Math.floor(sh.get(`skill.level.${tag}`));
  return lvl;
}

/** Skill parameters at a given level, applying the skill's own level rules only. */
export function skillParams(skill: SkillDef, level: number): SkillDef['params'] {
  const p = { ...skill.params } as Record<string, number>;
  const n = Math.max(0, level - 1);
  for (const r of skill.levelRules) {
    const v = p[r.param] ?? 0;
    p[r.param] = r.mode === 'add' ? v + r.perLevel * n : v * Math.pow(1 + r.perLevel, n);
  }
  return p as SkillDef['params'];
}
