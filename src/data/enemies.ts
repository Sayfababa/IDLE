import type { EnemyDef, ZoneDef } from './types';

export const ENEMIES: readonly EnemyDef[] = [
  { id: 'enemy.ghoul', name: 'enemy.ghoul', archetype: 'normal', life: 20, damage: 3, attackInterval: 1.4, attackRange: 0.9, moveSpeed: 1.6, armor: 5, resist: {}, xp: 6, gold: 2, dropChance: 0.1, rarityBonus: 0, radius: 0.35, visual: 'ghoul' },
  { id: 'enemy.carrion', name: 'enemy.carrion', archetype: 'fast', life: 12, damage: 2.5, attackInterval: 0.9, attackRange: 0.8, moveSpeed: 2.8, armor: 0, resist: {}, xp: 5, gold: 1, dropChance: 0.08, rarityBonus: 0, radius: 0.3, visual: 'carrion' },
  { id: 'enemy.brute', name: 'enemy.brute', archetype: 'big', life: 55, damage: 7, attackInterval: 2.2, attackRange: 1.1, moveSpeed: 1.0, armor: 15, resist: {}, xp: 15, gold: 5, dropChance: 0.22, rarityBonus: 0.3, radius: 0.55, visual: 'brute' },
  {
    id: 'enemy.boss.bonewarden', name: 'enemy.boss.bonewarden', archetype: 'boss', life: 300, damage: 10, attackInterval: 1.8, attackRange: 1.3, moveSpeed: 1.2, armor: 25, resist: {}, xp: 120, gold: 40, dropChance: 0, rarityBonus: 1, radius: 0.8, visual: 'bonewarden',
    guaranteedDrops: { count: 2, minRarity: 'magic' },
    slam: { interval: 6, windup: 1.2, radius: 2.2, damageMult: 2 },
  },
];

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'zone.ashyard', name: 'zone.ashyard',
    enemies: [{ id: 'enemy.ghoul', weight: 60 }, { id: 'enemy.carrion', weight: 30 }, { id: 'enemy.brute', weight: 12 }],
    boss: 'enemy.boss.bonewarden', killsPerStage: 20, packSize: [2, 4], maxAlive: 6,
  },
];
