import type { RarityId } from '../types';

/** Central balancing configuration (SPEC Teil 20). No balancing numbers in logic files. */
export const BALANCE = {
  sim: { tickRate: 30 },
  player: {
    dmgIncPerLevel: 0.04,
    baseLifeRegen: 2,
    lifeRegenPerLevel: 0.2,
    respawnTime: 3,
    rageOnHitTaken: 3,
    outOfCombatDelay: 2.5,
    maxSkillLevel: 20,
    skillPointsPerLevel: 1,
    activeSkillSlots: 4,
  },
  xp: {
    /** xpToNext(level) = round(base * growth^(level-1)) */
    base: 50,
    growth: 1.2,
    maxLevel: 100,
  },
  enemyScaling: {
    life: 1.14,
    damage: 1.1,
    xp: 1.13,
    gold: 1.1,
    armor: 1.08,
  },
  combat: {
    armorK: 5,
    /** evasion chance = ev / (ev + evasionBase + evasionPerLevel * attackerLevel) */
    evasionBase: 60,
    evasionPerLevel: 12,
    evasionCap: 0.75,
    bleedTick: 0.5,
    bleedMaxStacks: 1,
    minDamage: 1,
    aggroRange: 7,
    spawnMinDist: 6,
    spawnMaxDist: 9,
    spawnInterval: 2.5,
    corpseTime: 1.2,
  },
  items: {
    implicitScaling: 0.06,
    weaponScaling: 0.09,
    /** Minimum item level per tier T1..T8. */
    tierItemLevel: [1, 5, 20, 28, 36, 50, 62, 80],
    tierWeightFalloff: 0.75,
    maxPrefixes: 3,
    maxSuffixes: 3,
    sellBase: 2,
    sellPerItemLevel: 0.1,
  },
  rarity: {
    affixCount: {
      normal: [0, 0], magic: [1, 2], rare: [3, 4], epic: [5, 6], legendary: [4, 6], mythic: [6, 6],
    } as Record<RarityId, [number, number]>,
    /** Base drop weights. Epic+ are 0 until their milestones. */
    weights: { normal: 70, magic: 25, rare: 5, epic: 0, legendary: 0, mythic: 0 } as Record<RarityId, number>,
    sellMult: { normal: 1, magic: 3, rare: 8, epic: 20, legendary: 60, mythic: 150 } as Record<RarityId, number>,
  },
  loot: {
    goldSpread: 0.3,
    inventorySize: 40,
  },
  stage: {
    autoAdvanceDefault: true,
  },
  save: {
    autosaveInterval: 15,
  },
} as const;

export const xpToNext = (level: number): number =>
  Math.round(BALANCE.xp.base * Math.pow(BALANCE.xp.growth, level - 1));
