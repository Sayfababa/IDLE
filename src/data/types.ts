/** Data definitions. Everything here is pure data – no logic. */

export type SlotId = 'weapon' | 'ring' | 'amulet' | 'helmet' | 'chest' | 'boots' | 'gloves';
export const SLOTS: readonly SlotId[] = ['weapon', 'ring', 'amulet', 'helmet', 'chest', 'boots', 'gloves'];

export type ClassId = 'assassin' | 'hunter' | 'mage' | 'warrior';

export type Tag =
  | 'melee' | 'projectile' | 'poison' | 'bleed' | 'aoe' | 'trap' | 'totem' | 'minion'
  | 'curse' | 'ranged' | 'warcry' | 'attack' | 'spell'
  | 'physical' | 'fire' | 'cold' | 'lightning' | 'arcane';

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'arcane' | 'poison';
export const DAMAGE_TYPES: readonly DamageType[] = ['physical', 'fire', 'cold', 'lightning', 'arcane', 'poison'];
export const ELEMENTAL: readonly DamageType[] = ['fire', 'cold', 'lightning'];

export type RarityId = 'normal' | 'magic' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: readonly RarityId[] = ['normal', 'magic', 'rare', 'epic', 'legendary', 'mythic'];

/** How a stat's final value is formed from its modifiers. */
export interface StatDef {
  id: string;
  /** 'number' = absolute value, 'percent' = fraction (0.25 = 25 %). */
  unit: 'number' | 'percent';
  /** Upper cap applied to the final value. */
  cap?: number;
  /** Text key in i18n. */
  name: string;
}

/** Op for a modifier on a stat. add: flat sum · inc: summed % · more: multiplied %. */
export type ModOp = 'add' | 'inc' | 'more';

export interface Modifier {
  stat: string;
  op: ModOp;
  value: number;
}

export interface TierFormula {
  /** Midpoint of T1. */
  base: number;
  /** Multiplicative growth of the midpoint per tier. */
  growth: number;
  /** +/- fraction around the midpoint for the roll range. */
  spread: number;
  /** Round rolled values to this many decimals (0 = integer). */
  decimals: number;
}

export interface AffixDef {
  id: string;
  stat: string;
  op: ModOp;
  kind: 'prefix' | 'suffix';
  slots: readonly SlotId[];
  /** Affixes of the same group cannot appear twice on one item. */
  group: string;
  weight: number;
  minItemLevel: number;
  tiers: TierFormula;
  /** Optional exact per-tier [min,max] overrides (index 0 = T1). */
  tierOverrides?: readonly (readonly [number, number])[];
  classes?: readonly ClassId[];
  minRarity?: RarityId;
}

export interface BaseItemDef {
  id: string;
  name: string;
  slot: SlotId;
  /** Restrict to class (weapons). */
  classes?: readonly ClassId[];
  minItemLevel: number;
  dropWeight: number;
  /** Implicit stats; value is scaled by item level (see balance.items.implicitScaling). */
  implicits: readonly Modifier[];
  /** Weapons: base physical damage range and attacks per second. */
  weapon?: { min: number; max: number; aps: number; crit: number };
  /** Multipliers for affix weights by group. */
  affixWeightMods?: Readonly<Record<string, number>>;
}

export interface SkillLevelRule {
  /** Field of SkillDef.params to change. */
  param: string;
  perLevel: number;
  mode: 'add' | 'mult';
}

export interface SkillCondition {
  type: 'enemiesInRadius' | 'buffInactive' | 'targetHasNoStatus' | 'targetLifeBelow';
  value: number;
  ref?: string;
}

export interface SkillDef {
  id: string;
  name: string;
  classId: ClassId;
  tags: readonly Tag[];
  damageTypes: readonly DamageType[];
  unlockLevel: number;
  /** Is this the class's basic attack (no cost, no cooldown, not slotted). */
  basic?: boolean;
  priority: number;
  /** Numeric parameters – all balancing lives here. */
  params: {
    /** Fraction of weapon damage dealt. */
    weaponMult: number;
    /** Flat added base damage. */
    baseDamage: number;
    /** Action time multiplier relative to attack interval. */
    timeMult: number;
    cooldown: number;
    cost: number;
    range: number;
    radius: number;
    /** Extra critical strike chance (absolute). */
    critBonus: number;
    /** Bleed applied on hit. */
    bleedChance: number;
    /** Bleed damage per second as fraction of hit damage. */
    bleedPower: number;
    bleedDuration: number;
    /** Buff (warcry) */
    buffDuration: number;
    buffDamageMore: number;
    buffAttackSpeedInc: number;
    /** Resource gained on hit (e.g. rage). */
    resourceOnHit: number;
  };
  levelRules: readonly SkillLevelRule[];
  conditions: readonly SkillCondition[];
  /** Visual id for renderer. */
  visual: string;
  supportSlots: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  resource: { id: string; name: string; max: number; regen: number; startsEmpty: boolean; decayOutOfCombat: number };
  base: { life: number; lifePerLevel: number; armor: number; evasion: number; moveSpeed: number; critChance: number; critMulti: number };
  basicAttack: string;
  skills: readonly string[];
  weaponBases: readonly string[];
}

export type EnemyArchetype = 'normal' | 'fast' | 'big' | 'ranged' | 'elite' | 'boss';

export interface EnemyDef {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  life: number;
  damage: number;
  attackInterval: number;
  attackRange: number;
  moveSpeed: number;
  armor: number;
  resist: Partial<Record<DamageType, number>>;
  xp: number;
  gold: number;
  /** Loot: chance to drop an item and rarity bonus. */
  dropChance: number;
  rarityBonus: number;
  /** Minimum rarity for guaranteed drops (bosses). */
  guaranteedDrops?: { count: number; minRarity: RarityId };
  radius: number;
  visual: string;
  /** Special slam (boss): telegraphed AoE. */
  slam?: { interval: number; windup: number; radius: number; damageMult: number };
}

export interface ZoneDef {
  id: string;
  name: string;
  enemies: readonly { id: string; weight: number }[];
  boss: string;
  killsPerStage: number;
  packSize: readonly [number, number];
  maxAlive: number;
}
