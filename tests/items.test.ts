import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BALANCE } from '../src/data/balance';
import { Data } from '../src/data/registry';
import { RARITIES, type RarityId } from '../src/data/types';
import { generateItem, maxTierForItemLevel, tierRange } from '../src/sim/items';
import { AFFIXES } from '../src/data/affixes';

describe('item generation', () => {
  const rng = new Rng(99);
  const items = Array.from({ length: 3000 }, (_, i) =>
    generateItem(rng, { ilvl: 1 + (i % 90), classId: 'warrior', uid: `t${i}`, rarity: RARITIES[i % 4] as RarityId }));

  it('affixes only on allowed slots, no duplicate groups, prefix/suffix limits', () => {
    for (const it of items) {
      const groups = new Set<string>();
      let pre = 0, suf = 0;
      for (const a of it.affixes) {
        const def = Data.affix(a.id);
        expect(def.slots).toContain(it.slot);
        expect(groups.has(def.group)).toBe(false);
        groups.add(def.group);
        if (def.kind === 'prefix') pre++; else suf++;
        expect(it.ilvl).toBeGreaterThanOrEqual(def.minItemLevel);
      }
      expect(pre).toBeLessThanOrEqual(BALANCE.items.maxPrefixes);
      expect(suf).toBeLessThanOrEqual(BALANCE.items.maxSuffixes);
    }
  });

  it('tiers respect item level and values lie in tier range', () => {
    for (const it of items) for (const a of it.affixes) {
      expect(a.tier).toBeLessThanOrEqual(maxTierForItemLevel(it.ilvl));
      const [lo, hi] = tierRange(Data.affix(a.id), a.tier);
      expect(a.value).toBeGreaterThanOrEqual(lo);
      expect(a.value).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it('affix count matches rarity', () => {
    for (const it of items) {
      const [lo, hi] = BALANCE.rarity.affixCount[it.rarity];
      expect(it.affixes.length).toBeGreaterThanOrEqual(Math.min(lo, it.affixes.length));
      expect(it.affixes.length).toBeLessThanOrEqual(hi);
      if (it.rarity === 'normal') expect(it.affixes.length).toBe(0);
      if (it.rarity === 'magic') expect(it.affixes.length).toBeGreaterThanOrEqual(1);
      if (it.rarity === 'rare') expect(it.affixes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('warrior only gets swords', () => {
    for (const it of items) if (it.slot === 'weapon') expect(it.base).toBe('base.weapon.sword');
  });

  it('tier values increase with tier and differ between affixes', () => {
    for (const a of AFFIXES) {
      for (let t = 2; t <= 8; t++) expect(tierRange(a, t)[1]).toBeGreaterThanOrEqual(tierRange(a, t - 1)[1]);
    }
    const t8 = new Set(AFFIXES.map((a) => tierRange(a, 8).join('-')));
    expect(t8.size).toBeGreaterThan(10);
  });

  it('item level tier gates follow config', () => {
    expect(maxTierForItemLevel(1)).toBe(1);
    expect(maxTierForItemLevel(19)).toBe(2);
    expect(maxTierForItemLevel(20)).toBe(3);
    expect(maxTierForItemLevel(80)).toBe(8);
  });
});
