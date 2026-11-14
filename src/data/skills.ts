import type { SkillDef } from './types';

const P = {
  weaponMult: 1, baseDamage: 0, timeMult: 1, cooldown: 0, cost: 0, range: 1.1, radius: 0, critBonus: 0,
  bleedChance: 0, bleedPower: 0, bleedDuration: 0, buffDuration: 0, buffDamageMore: 0, buffAttackSpeedInc: 0, resourceOnHit: 0,
};

/** Warrior M1 set. Remaining skills per SPEC 3.4 follow later (see BACKLOG). */
export const SKILLS: readonly SkillDef[] = [
  {
    id: 'skill.warrior.slash', name: 'skill.warrior.slash', classId: 'warrior', tags: ['attack', 'melee', 'physical'],
    damageTypes: ['physical'], unlockLevel: 1, basic: true, priority: 0,
    params: { ...P, weaponMult: 1, resourceOnHit: 9 },
    levelRules: [], conditions: [], visual: 'slash', supportSlots: 0,
  },
  {
    id: 'skill.warrior.rend', name: 'skill.warrior.rend', classId: 'warrior', tags: ['attack', 'melee', 'bleed', 'physical'],
    damageTypes: ['physical'], unlockLevel: 1, priority: 2,
    params: { ...P, weaponMult: 1.25, cooldown: 2.5, cost: 15, bleedChance: 1, bleedPower: 0.6, bleedDuration: 4 },
    levelRules: [
      { param: 'weaponMult', perLevel: 0.06, mode: 'add' },
      { param: 'bleedPower', perLevel: 0.04, mode: 'add' },
    ],
    conditions: [], visual: 'rend', supportSlots: 1,
  },
  {
    id: 'skill.warrior.whirlwind', name: 'skill.warrior.whirlwind', classId: 'warrior', tags: ['attack', 'melee', 'aoe', 'physical'],
    damageTypes: ['physical'], unlockLevel: 3, priority: 3,
    params: { ...P, weaponMult: 0.9, cooldown: 4, cost: 25, range: 1.4, radius: 1.8, timeMult: 1.2 },
    levelRules: [
      { param: 'weaponMult', perLevel: 0.05, mode: 'add' },
      { param: 'radius', perLevel: 0.03, mode: 'add' },
    ],
    conditions: [{ type: 'enemiesInRadius', value: 2 }], visual: 'whirlwind', supportSlots: 1,
  },
  {
    id: 'skill.warrior.smash', name: 'skill.warrior.smash', classId: 'warrior', tags: ['attack', 'melee', 'physical'],
    damageTypes: ['physical'], unlockLevel: 5, priority: 4,
    params: { ...P, weaponMult: 2.6, cooldown: 6, cost: 30, timeMult: 1.4, critBonus: 0.1 },
    levelRules: [{ param: 'weaponMult', perLevel: 0.12, mode: 'add' }],
    conditions: [], visual: 'smash', supportSlots: 1,
  },
  {
    id: 'skill.warrior.warcry', name: 'skill.warrior.warcry', classId: 'warrior', tags: ['warcry'],
    damageTypes: [], unlockLevel: 8, priority: 5,
    params: { ...P, weaponMult: 0, cooldown: 14, cost: 0, range: 3, radius: 3, timeMult: 0.8, buffDuration: 6, buffDamageMore: 0.25, buffAttackSpeedInc: 0.15 },
    levelRules: [
      { param: 'buffDamageMore', perLevel: 0.012, mode: 'add' },
      { param: 'buffDuration', perLevel: 0.1, mode: 'add' },
    ],
    conditions: [{ type: 'buffInactive', value: 0, ref: 'buff.warcry' }, { type: 'enemiesInRadius', value: 1 }],
    visual: 'warcry', supportSlots: 1,
  },
];
