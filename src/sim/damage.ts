import { BALANCE } from '../data/balance';
import { ELEMENTAL, type DamageType, type EnemyArchetype, type SkillDef, type Tag } from '../data/types';
import type { Rng } from '../core/rng';
import type { StatSheet } from './stats';

/** Tags that have their own "increased damage" stat. */
const DAMAGE_TAGS: readonly Tag[] = ['melee', 'projectile', 'aoe', 'minion', 'totem', 'trap'];

export interface TargetInfo {
  archetype: EnemyArchetype;
  armor: number;
  resist: Partial<Record<DamageType, number>>;
  bleeding: boolean;
}

/** Sum of all "increased" modifiers applying to this hit (SPEC 10, step 2). */
export function increasedFor(sh: StatSheet, types: readonly DamageType[], tags: readonly Tag[], target?: TargetInfo): number {
  let inc = sh.sum('dmg.all');
  for (const t of types) {
    inc += sh.sum(`dmg.${t}`);
    if (ELEMENTAL.includes(t)) inc += sh.sum('dmg.elemental');
  }
  for (const tag of tags) if (DAMAGE_TAGS.includes(tag)) inc += sh.sum(`dmg.${tag}`);
  if (target) {
    if (target.archetype === 'boss') inc += sh.sum('dmg.vs.boss');
    else if (target.archetype === 'elite') inc += sh.sum('dmg.vs.elite');
    else inc += sh.sum('dmg.vs.normal');
    if (target.bleeding) inc += sh.sum('dmg.vs.bleeding');
  }
  return inc;
}

export function armorReduction(armor: number, damage: number): number {
  if (armor <= 0 || damage <= 0) return 0;
  return armor / (armor + BALANCE.combat.armorK * damage);
}

export interface HitResult {
  /** Final damage after mitigation. */
  amount: number;
  crit: boolean;
  /** Damage before increased/more/crit/mitigation – base for ailments. */
  base: number;
  /** Damage before target mitigation. */
  preMitigation: number;
}

/**
 * Central hit calculation. Fixed order (SPEC 10):
 * 1 base · 2 ×(1+Σinc) · 3 ×Πmore · 4 crit · 5 target mitigation · 6 round/min.
 */
export function computeHit(
  sh: StatSheet,
  skill: SkillDef,
  params: SkillDef['params'],
  target: TargetInfo,
  rng: Rng,
): HitResult {
  const w = sh.weapon;
  const weaponRoll = rng.range(w.min, w.max) + sh.get('weapon.flat');
  const base = weaponRoll * params.weaponMult + params.baseDamage;

  const inc = increasedFor(sh, skill.damageTypes, skill.tags, target);
  const more = sh.more('dmg.all');
  let dmg = base * Math.max(0, 1 + inc) * more;

  const critChance = Math.min(1, w.crit + sh.get('crit.chance') + params.critBonus);
  const crit = rng.chance(critChance);
  if (crit) dmg *= Math.max(1, sh.get('crit.multi'));
  const preMitigation = dmg;

  const type = skill.damageTypes[0] ?? 'physical';
  if (type === 'physical') dmg *= 1 - armorReduction(target.armor, dmg);
  else dmg *= 1 - Math.min(0.75, target.resist[type] ?? 0);

  return { amount: Math.max(BALANCE.combat.minDamage, Math.round(dmg)), crit, base, preMitigation };
}

/** Bleed damage per second. Uses base hit, bleed/dot/physical increases; ignores armor; never crits. */
export function bleedDps(sh: StatSheet, skill: SkillDef, params: SkillDef['params'], baseHit: number, target: TargetInfo): number {
  const power = params.bleedPower > 0 ? params.bleedPower : 0.35;
  const inc = increasedFor(sh, ['physical'], [], target) + sh.sum('dmg.bleed') + sh.sum('dmg.dot');
  void skill;
  return baseHit * power * Math.max(0, 1 + inc) * sh.more('dmg.all');
}

export function bleedDuration(sh: StatSheet, params: SkillDef['params']): number {
  const base = params.bleedDuration > 0 ? params.bleedDuration : 3;
  return base * (1 + sh.sum('bleed.duration'));
}

/** Expected damage per second of a skill vs. an unarmored normal target (UI only). */
export function estimateDps(sh: StatSheet, skill: SkillDef, params: SkillDef['params']): number {
  const w = sh.weapon;
  const avg = ((w.min + w.max) / 2 + sh.get('weapon.flat')) * params.weaponMult + params.baseDamage;
  const inc = increasedFor(sh, skill.damageTypes, skill.tags, { archetype: 'normal', armor: 0, resist: {}, bleeding: false });
  const critChance = Math.min(1, w.crit + sh.get('crit.chance') + params.critBonus);
  const critFactor = 1 + critChance * (Math.max(1, sh.get('crit.multi')) - 1);
  const aps = w.aps * (1 + sh.get('attack.speed')) / params.timeMult;
  return avg * (1 + inc) * sh.more('dmg.all') * critFactor * aps;
}
