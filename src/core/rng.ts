/** Seedable deterministic RNG (sfc32). State is serializable for saves. */
export type RngState = [number, number, number, number];

export class Rng {
  private s: RngState;

  constructor(seed: number | RngState = 1) {
    if (Array.isArray(seed)) {
      this.s = [...seed] as RngState;
    } else {
      const x = seed >>> 0;
      this.s = [0x9e3779b9, 0x243f6a88, 0xb7e15162, x];
      for (let i = 0; i < 15; i++) this.next();
    }
  }

  /** Float in [0, 1). */
  next(): number {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.s = [a, b, c, d];
    return (t >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[Math.floor(this.next() * arr.length)] as T;
  }

  /** Weighted pick; returns undefined if total weight is 0. */
  weighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  getState(): RngState {
    return [...this.s] as RngState;
  }
}
