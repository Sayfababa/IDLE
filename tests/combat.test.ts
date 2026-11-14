import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { Data } from '../src/data/registry';
import { armorReduction, bleedDps, computeHit } from '../src/sim/damage';
import { Game } from '../src/sim/game';
import { newProfile } from '../src/sim/profile';
import { buildStats, skillParams, StatSheet } from '../src/sim/stats';
import { generateItem } from '../src/sim/items';

const target = { archetype: 'normal' as const, armor: 0, resist: {}, bleeding: false };

function sheet(mods: { stat: string; op: 'add' | 'inc' | 'more'; value: number }[], weapon = { min: 10, max: 10, aps: 1, crit: 0 }) {
  const s = new StatSheet();
  s.weapon = weapon;
  s.addMod({ stat: 'crit.multi', op: 'add', value: 2 });
  for (const m of mods) s.addMod(m);
  return s;
}
const slash = Data.skill('skill.warrior.slash');
const P = skillParams(slash, 1);

describe('damage formula', () => {
  it('base damage', () => {
    expect(computeHit(sheet([]), slash, P, target, new Rng(1)).amount).toBe(10);
  });
  it('increased is additive', () => {
    const s = sheet([{ stat: 'dmg.physical', op: 'add', value: 0.5 }, { stat: 'dmg.melee', op: 'add', value: 0.5 }]);
    expect(computeHit(s, slash, P, target, new Rng(1)).amount).toBe(20);
  });
  it('more is multiplicative', () => {
    const s = sheet([{ stat: 'dmg.all', op: 'more', value: 0.5 }, { stat: 'dmg.all', op: 'more', value: 0.5 }]);
    expect(computeHit(s, slash, P, target, new Rng(1)).amount).toBe(23); // 10*1.5*1.5=22.5
  });
  it('crit multiplies', () => {
    const s = sheet([{ stat: 'crit.chance', op: 'add', value: 1 }]);
    const h = computeHit(s, slash, P, target, new Rng(1));
    expect(h.crit).toBe(true);
    expect(h.amount).toBe(20);
  });
  it('armor reduces physical, boss modifier applies', () => {
    expect(armorReduction(50, 10)).toBeCloseTo(0.5);
    const s = sheet([{ stat: 'dmg.vs.boss', op: 'add', value: 1 }]);
    expect(computeHit(s, slash, P, { ...target, archetype: 'boss' }, new Rng(1)).amount).toBe(20);
    expect(computeHit(s, slash, P, target, new Rng(1)).amount).toBe(10);
  });
  it('bleed scales with bleed/dot increases', () => {
    const rend = Data.skill('skill.warrior.rend');
    const rp = skillParams(rend, 1);
    const a = bleedDps(sheet([]), rend, rp, 10, target);
    const b = bleedDps(sheet([{ stat: 'dmg.bleed', op: 'add', value: 1 }]), rend, rp, 10, target);
    expect(b).toBeCloseTo(a * 2);
  });
  it('skill level rules only change listed params', () => {
    const rend = Data.skill('skill.warrior.rend');
    const p1 = skillParams(rend, 1), p5 = skillParams(rend, 5);
    expect(p5.weaponMult).toBeCloseTo(p1.weaponMult + 0.24);
    expect(p5.cooldown).toBe(p1.cooldown);
  });
});

describe('equipment stats', () => {
  it('equip/unequip never double applies', () => {
    const p = newProfile('warrior', 5);
    const g = new Game(p);
    const base = g.sheet.get('life.max');
    const ring = generateItem(new Rng(3), { ilvl: 10, classId: 'warrior', uid: 'x1', base: 'base.ring.plain', rarity: 'normal' });
    p.inventory.push(ring);
    g.equip('x1');
    const withRing = g.sheet.get('life.max');
    expect(withRing).toBeGreaterThan(base);
    g.equip('x1'); // not in inventory anymore – no-op
    expect(g.sheet.get('life.max')).toBe(withRing);
    g.unequip('ring');
    expect(g.sheet.get('life.max')).toBe(base);
    expect(buildStats(p).get('life.max')).toBe(base);
  });
});

describe('simulation', () => {
  it('warrior makes progress for 10 minutes without NaN', () => {
    const g = new Game(newProfile('warrior', 11));
    const used = new Set<string>();
    for (let t = 0; t < 600; t += 1 / 30) {
      g.tick(1 / 30);
      for (const e of g.drainEvents()) {
        if (e.type === 'swing') used.add(e.skillId);
        if (e.type === 'hit') expect(Number.isFinite(e.amount)).toBe(true);
      }
    }
    expect(g.profile.level).toBeGreaterThan(8);
    expect(g.profile.stats.kills).toBeGreaterThan(80);
    expect(Number.isFinite(g.player.life)).toBe(true);
    for (const id of Data.cls('warrior').skills) expect(used.has(id)).toBe(true);
  });
  it('is deterministic for the same seed', () => {
    const run = () => { const g = new Game(newProfile('warrior', 77)); for (let i = 0; i < 3000; i++) g.tick(1 / 30); return [g.profile.level, g.profile.xp, g.profile.stats.kills, g.profile.gold]; };
    expect(run()).toEqual(run());
  });
});
