import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { facingFromVector } from '../src/core/geometry';
import { validateData } from '../src/data/registry';

describe('rng', () => {
  it('is deterministic for a seed and resumable from state', () => {
    const a = new Rng(123), b = new Rng(123);
    const seqA = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seqA);
    const c = new Rng(7); c.next(); c.next();
    const d = new Rng(c.getState());
    expect(d.next()).toBe(c.next());
  });
  it('stays in range', () => {
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('facing', () => {
  it('maps to 4 iso directions only', () => {
    expect(facingFromVector(1, 0, 'SE')).toBe('SE');   // +x = screen down-right
    expect(facingFromVector(0, 1, 'SE')).toBe('SW');   // +y = screen down-left
    expect(facingFromVector(-1, 0, 'SE')).toBe('NW');
    expect(facingFromVector(0, -1, 'SE')).toBe('NE');
    expect(facingFromVector(0, 0, 'NW')).toBe('NW');
  });
});

describe('data', () => {
  it('passes catalog validation', () => {
    expect(validateData()).toEqual([]);
  });
});
