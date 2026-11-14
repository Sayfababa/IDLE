import { Data } from '../data/registry';
import { RARITIES, SLOTS } from '../data/types';
import { newProfile, SAVE_VERSION } from '../sim/profile';
import type { ItemInstance, Profile } from '../sim/types';

export const SAVE_KEY = 'idle-arpg.save';

type Json = Record<string, unknown>;

/** Migrations: index n migrates a save from version n to n+1. */
const MIGRATIONS: ((s: Json) => Json)[] = [
  // v0 -> v1: no v0 saves exist; placeholder keeps the chain explicit.
  (s) => ({ ...s, version: 1 }),
];

function isObj(x: unknown): x is Json { return typeof x === 'object' && x !== null && !Array.isArray(x); }
const num = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const bool = (x: unknown, d: boolean): boolean => (typeof x === 'boolean' ? x : d);

function validItem(x: unknown): ItemInstance | null {
  if (!isObj(x)) return null;
  const it = x as unknown as ItemInstance;
  if (typeof it.uid !== 'string' || !Data.baseItems.has(it.base)) return null;
  if (!SLOTS.includes(it.slot) || !RARITIES.includes(it.rarity)) return null;
  if (!Array.isArray(it.affixes) || !Array.isArray(it.implicits)) return null;
  const affixes = it.affixes.filter((a) => isObj(a) && Data.affixes.has(a.id) && Number.isFinite(a.value));
  const implicits = it.implicits.filter((m) => isObj(m) && Data.stats.has(m.stat) && Number.isFinite(m.value));
  return { ...it, ilvl: Math.max(1, num(it.ilvl, 1)), affixes, implicits };
}

/** Parses + migrates + validates. Never throws; falls back to defaults for missing/invalid data. */
export function loadProfile(raw: string | null): Profile {
  if (!raw) return newProfile();
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return newProfile(); }
  if (!isObj(data)) return newProfile();
  let s: Json = data;
  let v = num(s.version, 0);
  if (v > SAVE_VERSION) return newProfile(); // from the future – refuse rather than corrupt
  while (v < SAVE_VERSION) { s = MIGRATIONS[v]!(s); v++; }

  const d = newProfile('warrior', num(s.nextUid, 1) + 12345);
  const classId = typeof s.classId === 'string' && Data.classes.has(s.classId) ? (s.classId as Profile['classId']) : d.classId;
  const equipment: Profile['equipment'] = {};
  if (isObj(s.equipment)) {
    for (const slot of SLOTS) {
      const it = validItem(s.equipment[slot]);
      if (it && it.slot === slot) equipment[slot] = it;
    }
  }
  const inventory = Array.isArray(s.inventory) ? s.inventory.map(validItem).filter((x): x is ItemInstance => !!x) : [];
  const skillInvest: Record<string, number> = {};
  if (isObj(s.skillInvest)) for (const [k, val] of Object.entries(s.skillInvest)) if (Data.skills.has(k)) skillInvest[k] = Math.max(0, Math.floor(num(val, 0)));
  const st = isObj(s.stats) ? s.stats : {};
  const se = isObj(s.settings) ? s.settings : {};
  const rng = Array.isArray(s.rng) && s.rng.length === 4 && s.rng.every((n) => Number.isFinite(n)) ? (s.rng as Profile['rng']) : d.rng;
  const stage = Math.max(1, Math.floor(num(s.stage, 1)));

  return {
    version: SAVE_VERSION,
    classId,
    level: Math.max(1, Math.floor(num(s.level, 1))),
    xp: Math.max(0, num(s.xp, 0)),
    gold: Math.max(0, Math.floor(num(s.gold, 0))),
    skillPoints: Math.max(0, Math.floor(num(s.skillPoints, 0))),
    skillInvest,
    equipment: Object.keys(equipment).length ? equipment : d.equipment,
    inventory,
    lootFilter: RARITIES.includes(s.lootFilter as Profile['lootFilter']) ? (s.lootFilter as Profile['lootFilter']) : 'normal',
    zone: typeof s.zone === 'string' && Data.zones.has(s.zone) ? s.zone : d.zone,
    stage,
    maxStage: Math.max(stage, Math.floor(num(s.maxStage, 1))),
    stageKills: Math.max(0, Math.floor(num(s.stageKills, 0))),
    autoAdvance: bool(s.autoAdvance, true),
    settings: {
      damageNumbers: bool(se.damageNumbers, true),
      screenShake: bool(se.screenShake, true),
      reducedParticles: bool(se.reducedParticles, false),
    },
    stats: {
      kills: num(st.kills, 0), bossKills: num(st.bossKills, 0), deaths: num(st.deaths, 0),
      playTime: num(st.playTime, 0), itemsFound: num(st.itemsFound, 0),
    },
    rng,
    nextUid: Math.max(1, Math.floor(num(s.nextUid, 1))),
    lastSeen: num(s.lastSeen, Date.now()),
  };
}

export function serializeProfile(p: Profile): string {
  return JSON.stringify({ ...p, lastSeen: Date.now() });
}

/** Export as compact text (base64 of UTF-8 JSON). */
export function exportSave(p: Profile): string {
  const bytes = new TextEncoder().encode(serializeProfile(p));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(text: string): Profile | null {
  try {
    const bin = atob(text.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    JSON.parse(json);
    return loadProfile(json);
  } catch {
    return null;
  }
}
