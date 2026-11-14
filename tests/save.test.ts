import { describe, expect, it } from 'vitest';
import { exportSave, importSave, loadProfile, serializeProfile } from '../src/save/save';
import { Game } from '../src/sim/game';
import { newProfile } from '../src/sim/profile';

describe('save', () => {
  it('roundtrips a played profile', () => {
    const g = new Game(newProfile('warrior', 3));
    for (let i = 0; i < 6000; i++) g.tick(1 / 30);
    const p = g.profile;
    const loaded = loadProfile(serializeProfile(p));
    expect(loaded.level).toBe(p.level);
    expect(loaded.equipment).toEqual(p.equipment);
    expect(loaded.inventory).toEqual(p.inventory);
    expect(loaded.skillInvest).toEqual(p.skillInvest);
    expect(loaded.rng).toEqual(p.rng);
  });
  it('survives garbage and drops invalid entries', () => {
    expect(loadProfile('not json').level).toBe(1);
    expect(loadProfile(null).level).toBe(1);
    const p = newProfile('warrior', 1);
    const raw = JSON.parse(serializeProfile(p));
    raw.inventory = [{ uid: 'a', base: 'base.unknown' }, 5, null];
    raw.level = 'x';
    raw.skillInvest = { 'skill.nope': 3 };
    const l = loadProfile(JSON.stringify(raw));
    expect(l.inventory).toEqual([]);
    expect(l.level).toBe(1);
    expect(l.skillInvest).toEqual({});
  });
  it('rejects saves from future versions', () => {
    const raw = JSON.parse(serializeProfile(newProfile('warrior', 1)));
    raw.version = 999; raw.level = 50;
    expect(loadProfile(JSON.stringify(raw)).level).toBe(1);
  });
  it('export/import text', () => {
    const p = newProfile('warrior', 9);
    p.gold = 1234;
    expect(importSave(exportSave(p))?.gold).toBe(1234);
    expect(importSave('###')).toBeNull();
  });
});
