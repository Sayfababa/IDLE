import { Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import { Data } from '../data/registry';
import type { ClassId } from '../data/types';
import { generateItem } from './items';
import type { Profile } from './types';

export const SAVE_VERSION = 1;

export function newProfile(classId: ClassId = 'warrior', seed = Date.now() >>> 0): Profile {
  const rng = new Rng(seed);
  const cls = Data.cls(classId);
  const p: Profile = {
    version: SAVE_VERSION,
    classId,
    level: 1,
    xp: 0,
    gold: 0,
    skillPoints: 0,
    skillInvest: {},
    equipment: {},
    inventory: [],
    lootFilter: 'normal',
    zone: 'zone.ashyard',
    stage: 1,
    maxStage: 1,
    stageKills: 0,
    autoAdvance: BALANCE.stage.autoAdvanceDefault,
    settings: { damageNumbers: true, screenShake: true, reducedParticles: false },
    stats: { kills: 0, bossKills: 0, deaths: 0, playTime: 0, itemsFound: 0 },
    rng: rng.getState(),
    nextUid: 1,
    lastSeen: Date.now(),
  };
  const weaponBase = cls.weaponBases[0];
  if (weaponBase) {
    p.equipment.weapon = generateItem(rng, { ilvl: 1, classId, uid: `i${p.nextUid++}`, base: weaponBase, rarity: 'normal' });
  }
  p.rng = rng.getState();
  return p;
}
