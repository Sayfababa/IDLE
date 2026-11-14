import type { ClassDef } from './types';

export const CLASSES: readonly ClassDef[] = [
  {
    id: 'warrior',
    name: 'class.warrior',
    resource: { id: 'rage', name: 'resource.rage', max: 100, regen: 0, startsEmpty: true, decayOutOfCombat: 8 },
    base: { life: 110, lifePerLevel: 12, armor: 15, evasion: 0, moveSpeed: 3.0, critChance: 0, critMulti: 1.5 },
    basicAttack: 'skill.warrior.slash',
    skills: ['skill.warrior.rend', 'skill.warrior.whirlwind', 'skill.warrior.smash', 'skill.warrior.warcry'],
    weaponBases: ['base.weapon.sword'],
  },
];
