import type { Facing } from '../core/geometry';
import type { RngState } from '../core/rng';
import type { EnemyArchetype, Modifier, RarityId, SlotId } from '../data/types';

export interface RolledAffix { id: string; tier: number; value: number }

export interface ItemInstance {
  uid: string;
  base: string;
  slot: SlotId;
  rarity: RarityId;
  ilvl: number;
  /** Generated display name for rare+ items (base name otherwise). */
  name?: string;
  implicits: Modifier[];
  affixes: RolledAffix[];
  weapon?: { min: number; max: number; aps: number; crit: number };
  locked?: boolean;
}

export interface Settings {
  damageNumbers: boolean;
  screenShake: boolean;
  reducedParticles: boolean;
}

/** Persistent part of the game – exactly what is saved. */
export interface Profile {
  version: number;
  classId: 'warrior' | 'assassin' | 'hunter' | 'mage';
  level: number;
  xp: number;
  gold: number;
  skillPoints: number;
  /** Invested points per skill (effective base level = 1 + points). */
  skillInvest: Record<string, number>;
  equipment: Partial<Record<SlotId, ItemInstance>>;
  inventory: ItemInstance[];
  lootFilter: RarityId;
  zone: string;
  stage: number;
  maxStage: number;
  stageKills: number;
  autoAdvance: boolean;
  settings: Settings;
  stats: { kills: number; bossKills: number; deaths: number; playTime: number; itemsFound: number };
  rng: RngState;
  nextUid: number;
  lastSeen: number;
}

export type CombatState = 'searching' | 'moving' | 'attacking' | 'dead';

export interface Buff { id: string; remaining: number; mods: Modifier[] }

export interface Action {
  skillId: string;
  t: number;
  duration: number;
  hitAt: number;
  hitDone: boolean;
  targetId: number;
}

export interface PlayerRt {
  id: 0;
  x: number; y: number; facing: Facing; radius: number;
  life: number; resource: number;
  state: CombatState;
  targetId: number | null;
  action: Action | null;
  cooldowns: Record<string, number>;
  buffs: Buff[];
  respawnT: number;
  sinceCombat: number;
  moving: boolean;
  hitFlash: number;
}

export interface Bleed { dps: number; remaining: number; tick: number }

export interface EnemyRt {
  id: number;
  defId: string;
  archetype: EnemyArchetype;
  level: number;
  x: number; y: number; facing: Facing; radius: number;
  life: number; maxLife: number;
  damage: number; armor: number;
  attackCd: number;
  /** Attack animation timer (seconds since attack started, -1 = none). */
  attackAnim: number;
  bleed: Bleed | null;
  dead: boolean;
  corpseT: number;
  moving: boolean;
  hitFlash: number;
  slamCd: number;
  slamWindup: number;
}

export type GameEvent =
  | { type: 'hit'; targetId: number; x: number; y: number; amount: number; crit: boolean; dtype: 'physical' | 'bleed' }
  | { type: 'playerHit'; amount: number; x: number; y: number }
  | { type: 'evade' | 'block'; x: number; y: number }
  | { type: 'swing'; skillId: string; x: number; y: number; facing: Facing; radius: number; tx: number; ty: number }
  | { type: 'enemyAttack'; id: number }
  | { type: 'death'; id: number; x: number; y: number; boss: boolean }
  | { type: 'loot'; item: ItemInstance; kept: boolean; x: number; y: number }
  | { type: 'gold'; amount: number; x: number; y: number }
  | { type: 'levelUp'; level: number }
  | { type: 'skillUnlocked'; skillId: string }
  | { type: 'stage'; stage: number }
  | { type: 'bossSpawn'; id: number }
  | { type: 'slamWarn'; id: number; x: number; y: number; radius: number; windup: number }
  | { type: 'slam'; x: number; y: number; radius: number }
  | { type: 'playerDeath' }
  | { type: 'respawn' };
