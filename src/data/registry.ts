import { AFFIXES } from './affixes';
import { CLASSES } from './classes';
import { ENEMIES, ZONES } from './enemies';
import { BASE_ITEMS } from './items';
import { SKILLS } from './skills';
import { STATS, STAT_IDS } from './stats';
import { DE } from './i18n/de';
import type { AffixDef, BaseItemDef, ClassDef, ClassId, EnemyDef, SkillDef, StatDef, ZoneDef } from './types';
import { SLOTS } from './types';

function indexById<T extends { id: string }>(list: readonly T[], kind: string): ReadonlyMap<string, T> {
  const m = new Map<string, T>();
  for (const x of list) {
    if (m.has(x.id)) throw new Error(`Duplicate ${kind} id: ${x.id}`);
    m.set(x.id, x);
  }
  return m;
}

/** Single access point for all game data. */
export const Data = {
  stats: indexById<StatDef>(STATS, 'stat'),
  affixes: indexById<AffixDef>(AFFIXES, 'affix'),
  baseItems: indexById<BaseItemDef>(BASE_ITEMS, 'baseItem'),
  skills: indexById<SkillDef>(SKILLS, 'skill'),
  classes: indexById<ClassDef>(CLASSES, 'class'),
  enemies: indexById<EnemyDef>(ENEMIES, 'enemy'),
  zones: indexById<ZoneDef>(ZONES, 'zone'),

  stat(id: string): StatDef { return need(this.stats, id, 'stat'); },
  affix(id: string): AffixDef { return need(this.affixes, id, 'affix'); },
  baseItem(id: string): BaseItemDef { return need(this.baseItems, id, 'baseItem'); },
  skill(id: string): SkillDef { return need(this.skills, id, 'skill'); },
  cls(id: ClassId): ClassDef { return need(this.classes, id, 'class'); },
  enemy(id: string): EnemyDef { return need(this.enemies, id, 'enemy'); },
  zone(id: string): ZoneDef { return need(this.zones, id, 'zone'); },
};

function need<T>(m: ReadonlyMap<string, T>, id: string, kind: string): T {
  const v = m.get(id);
  if (!v) throw new Error(`Unknown ${kind}: ${id}`);
  return v;
}

/** Validates referential integrity of all data. Returns list of problems (empty = ok). */
export function validateData(): string[] {
  const errs: string[] = [];
  const text = (key: string, where: string) => { if (!(key in DE)) errs.push(`Missing text ${key} (${where})`); };

  for (const s of STATS) text(s.name, s.id);
  for (const a of AFFIXES) {
    if (!STAT_IDS.has(a.stat)) errs.push(`Affix ${a.id}: unknown stat ${a.stat}`);
    if (a.slots.length === 0) errs.push(`Affix ${a.id}: no slots`);
    for (const sl of a.slots) if (!SLOTS.includes(sl)) errs.push(`Affix ${a.id}: bad slot ${sl}`);
    if (a.weight <= 0) errs.push(`Affix ${a.id}: weight <= 0`);
    if (a.tierOverrides && a.tierOverrides.length !== 8) errs.push(`Affix ${a.id}: tierOverrides must have 8 entries`);
    if (a.tiers.growth < 1) errs.push(`Affix ${a.id}: growth < 1`);
  }
  // Every slot must be able to roll enough prefixes and suffixes for the biggest rarity.
  for (const sl of SLOTS) {
    const pre = new Set(AFFIXES.filter((a) => a.kind === 'prefix' && a.slots.includes(sl)).map((a) => a.group));
    const suf = new Set(AFFIXES.filter((a) => a.kind === 'suffix' && a.slots.includes(sl)).map((a) => a.group));
    if (pre.size < 3) errs.push(`Slot ${sl}: only ${pre.size} prefix groups`);
    if (suf.size < 3) errs.push(`Slot ${sl}: only ${suf.size} suffix groups`);
  }
  for (const b of BASE_ITEMS) {
    text(b.name, b.id);
    for (const m of b.implicits) if (!STAT_IDS.has(m.stat)) errs.push(`Base ${b.id}: unknown stat ${m.stat}`);
    if (b.slot === 'weapon' && !b.weapon) errs.push(`Base ${b.id}: weapon without weapon data`);
  }
  for (const c of CLASSES) {
    text(c.name, c.id);
    if (!Data.skills.has(c.basicAttack)) errs.push(`Class ${c.id}: unknown basic ${c.basicAttack}`);
    for (const s of c.skills) if (!Data.skills.has(s)) errs.push(`Class ${c.id}: unknown skill ${s}`);
    for (const w of c.weaponBases) if (!Data.baseItems.has(w)) errs.push(`Class ${c.id}: unknown weapon ${w}`);
  }
  for (const s of SKILLS) {
    text(s.name, s.id);
    for (const r of s.levelRules) if (!(r.param in s.params)) errs.push(`Skill ${s.id}: unknown param ${r.param}`);
  }
  for (const e of ENEMIES) text(e.name, e.id);
  for (const z of ZONES) {
    text(z.name, z.id);
    for (const e of z.enemies) if (!Data.enemies.has(e.id)) errs.push(`Zone ${z.id}: unknown enemy ${e.id}`);
    if (!Data.enemies.has(z.boss)) errs.push(`Zone ${z.id}: unknown boss ${z.boss}`);
  }
  return errs;
}
