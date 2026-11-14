import type { StatDef } from './types';

/**
 * Stat catalog – every stat exists exactly once (SPEC Teil 7).
 * Final value = sum(add) * (1 + sum(inc)) * prod(1 + more), then capped.
 * Percent stats store fractions (0.25 = 25 %).
 */
const s = (id: string, unit: StatDef['unit'], cap?: number): StatDef => ({ id, unit, cap, name: `stat.${id}` });

export const STATS: readonly StatDef[] = [
  // Core defensive
  s('life.max', 'number'),
  s('life.regen', 'number'),
  s('life.onKill', 'number'),
  s('leech.life', 'percent', 0.2),
  s('armor', 'number'),
  s('evasion', 'number'),
  s('block.chance', 'percent', 0.75),
  s('block.power', 'percent', 1),
  s('dr.physical', 'percent', 0.5),
  s('res.fire', 'percent', 0.75),
  s('res.cold', 'percent', 0.75),
  s('res.lightning', 'percent', 0.75),
  s('res.arcane', 'percent', 0.75),
  s('res.poison', 'percent', 0.75),
  s('res.all', 'percent'),
  s('critTaken.reduction', 'percent', 0.5),
  // Resource
  s('resource.max', 'number'),
  s('resource.regen', 'number'),
  s('resource.costReduction', 'percent', 0.5),
  s('cdr', 'percent', 0.4),
  // Offense – generic
  s('weapon.flat', 'number'),
  s('attack.speed', 'percent'),
  s('cast.speed', 'percent'),
  s('crit.chance', 'percent', 1),
  s('crit.multi', 'number'),
  s('move.speed', 'number'),
  s('move.speed.inc', 'percent'),
  // Offense – increased damage by type/tag
  s('dmg.all', 'percent'),
  s('dmg.physical', 'percent'),
  s('dmg.elemental', 'percent'),
  s('dmg.fire', 'percent'),
  s('dmg.cold', 'percent'),
  s('dmg.lightning', 'percent'),
  s('dmg.arcane', 'percent'),
  s('dmg.poison', 'percent'),
  s('dmg.bleed', 'percent'),
  s('dmg.dot', 'percent'),
  s('dmg.melee', 'percent'),
  s('dmg.projectile', 'percent'),
  s('dmg.aoe', 'percent'),
  s('dmg.minion', 'percent'),
  s('dmg.totem', 'percent'),
  s('dmg.trap', 'percent'),
  s('dmg.vs.boss', 'percent'),
  s('dmg.vs.elite', 'percent'),
  s('dmg.vs.normal', 'percent'),
  s('dmg.vs.bleeding', 'percent'),
  // Ailments
  s('bleed.chance', 'percent', 1),
  s('bleed.duration', 'percent'),
  s('poison.chance', 'percent', 1),
  s('poison.duration', 'percent'),
  // Skills
  s('skill.level.all', 'number'),
  s('skill.level.melee', 'number'),
  s('skill.level.warcry', 'number'),
  s('buff.duration', 'percent'),
  s('aoe.radius', 'percent', 1),
  // Find (capped +100 %)
  s('find.gold', 'percent', 1),
  s('find.xp', 'percent', 1),
  s('find.rarity', 'percent', 1),
  s('find.quantity', 'percent', 1),
];

export const STAT_IDS = new Set(STATS.map((x) => x.id));
