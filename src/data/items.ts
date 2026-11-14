import type { BaseItemDef } from './types';

const add = (stat: string, value: number) => ({ stat, op: 'add' as const, value });

export const BASE_ITEMS: readonly BaseItemDef[] = [
  // Weapons (class-bound)
  { id: 'base.weapon.sword', name: 'item.base.sword', slot: 'weapon', classes: ['warrior'], minItemLevel: 1, dropWeight: 100, implicits: [], weapon: { min: 5, max: 9, aps: 1.25, crit: 0.05 } },
  { id: 'base.weapon.dagger', name: 'item.base.dagger', slot: 'weapon', classes: ['assassin'], minItemLevel: 1, dropWeight: 100, implicits: [], weapon: { min: 3, max: 5, aps: 1.6, crit: 0.07 } },
  { id: 'base.weapon.crossbow', name: 'item.base.crossbow', slot: 'weapon', classes: ['hunter'], minItemLevel: 1, dropWeight: 100, implicits: [], weapon: { min: 6, max: 10, aps: 0.9, crit: 0.06 } },
  { id: 'base.weapon.staff', name: 'item.base.staff', slot: 'weapon', classes: ['mage'], minItemLevel: 1, dropWeight: 100, implicits: [], weapon: { min: 5, max: 9, aps: 1.0, crit: 0.06 } },
  // Rings
  { id: 'base.ring.plain', name: 'item.base.ringPlain', slot: 'ring', minItemLevel: 1, dropWeight: 100, implicits: [add('life.max', 5)] },
  { id: 'base.ring.gem', name: 'item.base.ringGem', slot: 'ring', minItemLevel: 1, dropWeight: 80, implicits: [add('res.all', 0.03)] },
  { id: 'base.ring.power', name: 'item.base.ringPower', slot: 'ring', minItemLevel: 5, dropWeight: 70, implicits: [add('dmg.physical', 0.05)] },
  // Amulets
  { id: 'base.amulet.bone', name: 'item.base.amuletBone', slot: 'amulet', minItemLevel: 1, dropWeight: 100, implicits: [add('life.regen', 1)] },
  { id: 'base.amulet.magic', name: 'item.base.amuletMagic', slot: 'amulet', minItemLevel: 1, dropWeight: 80, implicits: [add('resource.max', 5)] },
  { id: 'base.amulet.rune', name: 'item.base.amuletRune', slot: 'amulet', minItemLevel: 8, dropWeight: 60, implicits: [add('crit.chance', 0.01)] },
  // Helmets
  { id: 'base.helmet.hood', name: 'item.base.helmetHood', slot: 'helmet', minItemLevel: 1, dropWeight: 100, implicits: [add('evasion', 8)] },
  { id: 'base.helmet.iron', name: 'item.base.helmetIron', slot: 'helmet', minItemLevel: 1, dropWeight: 100, implicits: [add('armor', 10)] },
  { id: 'base.helmet.mage', name: 'item.base.helmetMage', slot: 'helmet', minItemLevel: 3, dropWeight: 70, implicits: [add('resource.max', 5)] },
  // Chest
  { id: 'base.chest.leather', name: 'item.base.chestLeather', slot: 'chest', minItemLevel: 1, dropWeight: 100, implicits: [add('evasion', 15)] },
  { id: 'base.chest.chain', name: 'item.base.chestChain', slot: 'chest', minItemLevel: 1, dropWeight: 100, implicits: [add('armor', 10), add('evasion', 8)] },
  { id: 'base.chest.plate', name: 'item.base.chestPlate', slot: 'chest', minItemLevel: 6, dropWeight: 80, implicits: [add('armor', 22)] },
  { id: 'base.chest.robe', name: 'item.base.chestRobe', slot: 'chest', minItemLevel: 1, dropWeight: 70, implicits: [add('resource.max', 10)] },
  // Boots
  { id: 'base.boots.leather', name: 'item.base.bootsLeather', slot: 'boots', minItemLevel: 1, dropWeight: 100, implicits: [add('evasion', 6)] },
  { id: 'base.boots.travel', name: 'item.base.bootsTravel', slot: 'boots', minItemLevel: 3, dropWeight: 80, implicits: [add('move.speed.inc', 0.05)] },
  { id: 'base.boots.battle', name: 'item.base.bootsBattle', slot: 'boots', minItemLevel: 1, dropWeight: 100, implicits: [add('armor', 8)] },
  // Gloves
  { id: 'base.gloves.leather', name: 'item.base.glovesLeather', slot: 'gloves', minItemLevel: 1, dropWeight: 100, implicits: [add('evasion', 5)] },
  { id: 'base.gloves.gauntlet', name: 'item.base.glovesGauntlet', slot: 'gloves', minItemLevel: 1, dropWeight: 100, implicits: [add('armor', 7)] },
  { id: 'base.gloves.magic', name: 'item.base.glovesMagic', slot: 'gloves', minItemLevel: 4, dropWeight: 70, implicits: [add('cast.speed', 0.04)] },
];
