/** Pooled visual effects: particles, damage numbers, skill shapes, loot labels, decals. */

export interface Particle {
  active: boolean;
  /** Screen-space world position (iso px, before camera). */
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
  kind: 'dot' | 'ember' | 'dust' | 'spark';
}

export interface DamageNumber {
  active: boolean;
  x: number; y: number;
  text: string;
  color: string;
  size: number;
  life: number; maxLife: number;
  vx: number;
}

export interface Shape {
  kind: 'arc' | 'ring' | 'whirl' | 'shock' | 'crack' | 'telegraph' | 'beam';
  x: number; y: number;
  /** Angle in screen space for arcs. */
  angle: number;
  radius: number;
  life: number; maxLife: number;
  color: string;
}

export interface Label { x: number; y: number; text: string; color: string; life: number; maxLife: number; beam: boolean }

export interface Decal { x: number; y: number; r: number; life: number; maxLife: number; seed: number }

export class Pool<T extends { active: boolean }> {
  items: T[];
  private cursor = 0;
  constructor(size: number, make: () => T) { this.items = Array.from({ length: size }, make); }
  /** Always returns an item – recycles the oldest when full. */
  get(): T {
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this.cursor + i) % this.items.length;
      const it = this.items[idx]!;
      if (!it.active) { this.cursor = idx + 1; it.active = true; return it; }
    }
    const it = this.items[this.cursor % this.items.length]!;
    this.cursor++;
    it.active = true;
    return it;
  }
}

export class Fx {
  particles = new Pool<Particle>(260, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 1, color: '#fff', gravity: 0, kind: 'dot' }));
  numbers = new Pool<DamageNumber>(48, () => ({ active: false, x: 0, y: 0, text: '', color: '#fff', size: 12, life: 0, maxLife: 1, vx: 0 }));
  shapes: Shape[] = [];
  labels: Label[] = [];
  decals: Decal[] = [];
  reduced = false;

  burst(x: number, y: number, z: number, n: number, color: string, speed: number, opts: Partial<Particle> = {}): void {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const p = this.particles.get();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.5; p.vz = 30 + Math.random() * speed;
      p.maxLife = p.life = 0.35 + Math.random() * 0.45;
      p.size = 1.2 + Math.random() * 1.6;
      p.color = color; p.gravity = 260; p.kind = 'dot';
      Object.assign(p, opts);
    }
  }

  number(x: number, y: number, text: string, color: string, size: number): void {
    const n = this.numbers.get();
    n.x = x + (Math.random() - 0.5) * 14; n.y = y; n.text = text; n.color = color; n.size = size;
    n.maxLife = n.life = 0.9; n.vx = (Math.random() - 0.5) * 16;
  }

  shape(s: Omit<Shape, 'life'>): void {
    this.shapes.push({ ...s, life: s.maxLife });
    if (this.shapes.length > 40) this.shapes.shift();
  }

  label(l: Omit<Label, 'life'>): void {
    this.labels.push({ ...l, life: l.maxLife });
    if (this.labels.length > 8) this.labels.shift();
  }

  decal(x: number, y: number, r: number): void {
    this.decals.push({ x, y, r, life: 18, maxLife: 18, seed: Math.random() });
    if (this.decals.length > 40) this.decals.shift();
  }

  update(dt: number): void {
    for (const p of this.particles.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vz -= p.gravity * dt;
      if (p.z < 0 && p.gravity > 0) { p.z = 0; p.vz *= -0.2; p.vx *= 0.5; p.vy *= 0.5; }
    }
    for (const n of this.numbers.items) {
      if (!n.active) continue;
      n.life -= dt;
      if (n.life <= 0) n.active = false;
      n.x += n.vx * dt;
    }
    for (const s of this.shapes) s.life -= dt;
    this.shapes = this.shapes.filter((s) => s.life > 0);
    for (const l of this.labels) l.life -= dt;
    this.labels = this.labels.filter((l) => l.life > 0);
    for (const d of this.decals) d.life -= dt;
    this.decals = this.decals.filter((d) => d.life > 0);
  }
}

/** Compact number formatting (SPEC 14.4). */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a < 1000) return String(Math.round(n));
  const units = ['K', 'M', 'B', 'T'];
  let u = -1, v = a;
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return `${n < 0 ? '-' : ''}${v < 10 ? v.toFixed(1) : Math.round(v)}${units[u]}`;
}
