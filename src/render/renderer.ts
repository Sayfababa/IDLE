import { Data } from '../data/registry';
import type { Game } from '../sim/game';
import type { EnemyRt, GameEvent } from '../sim/types';
import { DMG_COLOR, RARITY_COLOR } from '../ui/theme';
import { t } from '../data/i18n/de';
import { drawBoneWarden, drawBrute, drawCarrion, drawGhoul, drawProp, drawWarrior, propLight, shadow, type Pose } from './figures';
import { compact, Fx } from './fx';
import { Ground } from './ground';
import { toScreen } from './iso';

interface Drawable { depth: number; draw: () => void }

/** World zoom for phone screens. */
const ZOOM = 1.3;

/**
 * Canvas 2D renderer. Reads sim state, never writes it (SPEC 2.2).
 * Fixed isometric camera, smooth follow, optional light shake.
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private ground: Ground;
  readonly fx = new Fx();
  private w = 0;
  private h = 0;
  private dpr = 1;
  private camX = 0;
  private camY = 0;
  private shake = 0;
  private time = 0;
  private walk = new Map<number, number>();
  private attackT = new Map<number, number>();

  constructor(private canvas: HTMLCanvasElement, private game: Game) {
    this.ctx = canvas.getContext('2d')!;
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d')!;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.ground = new Ground(this.dpr * ZOOM);
    this.resize();
    const p = toScreen(game.player.x, game.player.y);
    this.camX = p.sx; this.camY = p.sy;
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.light.width = Math.round(this.w / 2);
    this.light.height = Math.round(this.h / 2);
  }

  // ------------------------------------------------------------ events → fx
  onEvents(events: GameEvent[]): void {
    const s = this.game.profile.settings;
    this.fx.reduced = s.reducedParticles;
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const { sx, sy } = toScreen(e.x, e.y);
          if (e.dtype === 'bleed') {
            this.fx.burst(sx, sy, 14, 2, '#7a0f0a', 30);
            if (s.damageNumbers) this.fx.number(sx, sy - 34, compact(e.amount), DMG_COLOR.bleed, 11);
          } else {
            this.fx.burst(sx, sy, 16, e.crit ? 10 : 5, '#8a120c', e.crit ? 90 : 60);
            if (e.crit) this.fx.burst(sx, sy, 18, 6, '#ffd890', 110, { kind: 'spark', gravity: 0, maxLife: 0.25, life: 0.25 });
            if (s.damageNumbers) this.fx.number(sx, sy - 40, compact(e.amount), e.crit ? DMG_COLOR.crit : DMG_COLOR.normal, e.crit ? 17 : 12);
            if (e.crit && s.screenShake) this.shake = Math.max(this.shake, 2.5);
          }
          this.attackT.set(e.targetId, 0);
          break;
        }
        case 'playerHit': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.burst(sx, sy, 22, 3, '#6d0d09', 50);
          if (s.damageNumbers) this.fx.number(sx, sy - 52, compact(e.amount), DMG_COLOR.player, 11);
          break;
        }
        case 'evade': case 'block': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.number(sx, sy - 52, e.type === 'evade' ? 'Ausgewichen' : 'Geblockt', '#bdb4a2', 10);
          if (e.type === 'block') this.fx.burst(sx, sy, 24, 5, '#e6d6a8', 70, { kind: 'spark', gravity: 0 });
          break;
        }
        case 'swing': {
          const { sx, sy } = toScreen(e.x, e.y);
          const tp = toScreen(e.tx, e.ty);
          const ang = Math.atan2(tp.sy - sy, tp.sx - sx);
          const skill = Data.skill(e.skillId);
          const R = e.radius * 40;
          if (skill.visual === 'whirlwind') {
            this.fx.shape({ kind: 'whirl', x: sx, y: sy, angle: 0, radius: R, maxLife: 0.4, color: '#d8d2c4' });
            this.fx.burst(sx, sy, 2, 10, '#5a5048', 80, { kind: 'dust', gravity: 0, maxLife: 0.6, life: 0.6 });
          } else if (skill.visual === 'warcry') {
            this.fx.shape({ kind: 'shock', x: sx, y: sy, angle: 0, radius: R * 1.2, maxLife: 0.6, color: '#e0903a' });
            if (s.screenShake) this.shake = Math.max(this.shake, 3);
          } else if (skill.visual === 'smash') {
            this.fx.shape({ kind: 'arc', x: sx, y: sy - 18, angle: ang, radius: 34, maxLife: 0.25, color: '#efe6d0' });
            this.fx.shape({ kind: 'crack', x: (sx + tp.sx) / 2, y: (sy + tp.sy) / 2, angle: ang, radius: 26, maxLife: 0.9, color: '#000' });
            this.fx.burst(tp.sx, tp.sy, 2, 12, '#4f463d', 100, { kind: 'dust', gravity: 0, maxLife: 0.7, life: 0.7 });
            if (s.screenShake) this.shake = Math.max(this.shake, 5);
          } else {
            this.fx.shape({ kind: 'arc', x: sx, y: sy - 18, angle: ang, radius: 26, maxLife: 0.2, color: skill.visual === 'rend' ? '#e05040' : '#e9e3d6' });
          }
          break;
        }
        case 'death': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.burst(sx, sy, 14, e.boss ? 40 : 12, '#7a0d09', e.boss ? 140 : 80);
          this.fx.decal(sx, sy, e.boss ? 22 : 11);
          if (e.boss && s.screenShake) this.shake = 8;
          break;
        }
        case 'loot': {
          const { sx, sy } = toScreen(e.x, e.y);
          const base = Data.baseItem(e.item.base);
          const name = e.item.name ?? t(base.name);
          const color = RARITY_COLOR[e.item.rarity];
          if (e.kept || e.item.rarity !== 'normal') {
            this.fx.label({ x: sx, y: sy, text: name, color, maxLife: e.item.rarity === 'normal' ? 1.4 : 2.6, beam: e.item.rarity !== 'normal' });
          }
          break;
        }
        case 'gold': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.burst(sx, sy, 10, 4, '#e8c060', 40, { kind: 'spark', gravity: 120 });
          break;
        }
        case 'slamWarn': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.shape({ kind: 'telegraph', x: sx, y: sy, angle: 0, radius: e.radius * 32, maxLife: e.windup, color: '#c0281f' });
          break;
        }
        case 'slam': {
          const { sx, sy } = toScreen(e.x, e.y);
          this.fx.shape({ kind: 'shock', x: sx, y: sy, angle: 0, radius: e.radius * 36, maxLife: 0.5, color: '#b02a1c' });
          this.fx.burst(sx, sy, 2, 24, '#4a3f36', 160, { kind: 'dust', gravity: 0, maxLife: 0.9, life: 0.9 });
          if (s.screenShake) this.shake = 7;
          break;
        }
        case 'levelUp': {
          const { sx, sy } = toScreen(this.game.player.x, this.game.player.y);
          this.fx.shape({ kind: 'beam', x: sx, y: sy, angle: 0, radius: 26, maxLife: 1.2, color: '#e8c070' });
          this.fx.burst(sx, sy, 10, 24, '#f0c868', 70, { kind: 'ember', gravity: -40, maxLife: 1.4, life: 1.4 });
          break;
        }
        default: break;
      }
    }
  }

  // ------------------------------------------------------------ frame
  render(dt: number): void {
    this.time += dt;
    this.fx.update(dt);
    const g = this.game;
    const ctx = this.ctx;
    const pl = g.player;
    const pp = toScreen(pl.x, pl.y);
    const k = 1 - Math.pow(0.002, dt);
    this.camX += (pp.sx - this.camX) * k;
    this.camY += (pp.sy - 10 - this.camY) * k;
    this.shake = Math.max(0, this.shake - dt * 22);
    const shx = this.shake > 0 && g.profile.settings.screenShake ? (Math.random() - 0.5) * this.shake : 0;
    const shy = this.shake > 0 && g.profile.settings.screenShake ? (Math.random() - 0.5) * this.shake : 0;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#070606';
    ctx.fillRect(0, 0, this.w, this.h);
    const camX = this.camX + shx, camY = this.camY + shy;
    const vw = this.w / ZOOM, vh = this.h / ZOOM;
    ctx.setTransform(this.dpr * ZOOM, 0, 0, this.dpr * ZOOM, 0, 0);
    this.ground.draw(ctx, camX, camY, vw, vh);

    // world transform: iso px → screen
    ctx.save();
    ctx.translate(vw / 2 - camX, vh / 2 - camY);

    this.drawDecals(ctx);
    this.drawGroundShapes(ctx);

    // depth sorted entities + props
    const list: Drawable[] = [];
    const props = this.ground.propsAround(pl.x, pl.y, 14);
    const lights: { x: number; y: number; r: number }[] = [];
    for (const pr of props) {
      // keep the immediate combat area clear of tall props visually by fading them
      const { sx, sy } = toScreen(pr.x, pr.y);
      const lr = propLight(pr.kind);
      if (lr) lights.push({ x: sx, y: sy - 16, r: lr });
      list.push({ depth: sy, draw: () => { ctx.save(); ctx.translate(sx, sy); drawProp(ctx, pr.kind, pr.seed, this.time); ctx.restore(); } });
    }
    for (const e of g.enemies) {
      const { sx, sy } = toScreen(e.x, e.y);
      list.push({ depth: sy, draw: () => this.drawEnemy(ctx, e, sx, sy, dt) });
    }
    list.push({ depth: pp.sy, draw: () => this.drawPlayer(ctx, pp.sx, pp.sy, dt) });
    list.sort((a, b) => a.depth - b.depth);
    for (const d of list) d.draw();

    this.drawShapesTop(ctx);
    this.drawParticles(ctx);
    ctx.restore();

    // lighting
    lights.push({ x: pp.sx, y: pp.sy - 20, r: 185 });
    for (const sh of this.fx.shapes) if (sh.kind === 'shock' || sh.kind === 'beam') lights.push({ x: sh.x, y: sh.y, r: 120 * (sh.life / sh.maxLife) });
    this.drawLighting(ctx, lights, camX, camY);
    this.drawFog(ctx);
    this.drawVignette(ctx);

    // overlays in world space (labels, numbers, bars)
    ctx.setTransform(this.dpr * ZOOM, 0, 0, this.dpr * ZOOM, 0, 0);
    ctx.save();
    ctx.translate(vw / 2 - camX, vh / 2 - camY);
    this.drawLabels(ctx);
    this.drawNumbers(ctx);
    this.drawBars(ctx);
    ctx.restore();
  }

  private pose(id: number, moving: boolean, facing: Pose['facing'], attack: number, flash: number, death: number, dt: number): Pose {
    const w = (this.walk.get(id) ?? 0) + (moving ? dt : 0);
    this.walk.set(id, w);
    return { facing, walk: w, moving, attack, flash, death, t: this.time + id * 0.37 };
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, sx: number, sy: number, dt: number): void {
    const pl = this.game.player;
    ctx.save();
    ctx.translate(sx, sy);
    shadow(ctx, 16, 7);
    if (pl.buffs.some((b) => b.id === 'buff.warcry')) {
      ctx.strokeStyle = `rgba(224,144,58,${0.25 + Math.sin(this.time * 6) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const a = pl.action ? pl.action.t / pl.action.duration : -1;
    const dead = pl.state === 'dead' ? Math.min(1, (3 - pl.respawnT) / 0.6) : 0;
    drawWarrior(ctx, this.pose(0, pl.moving, pl.facing, a, pl.hitFlash / 0.15, dead, dt));
    ctx.restore();
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyRt, sx: number, sy: number, dt: number): void {
    ctx.save();
    ctx.translate(sx, sy);
    const def = Data.enemy(e.defId);
    const death = e.dead ? 1 - Math.max(0, e.corpseT) / 1.2 : 0;
    const pose = this.pose(e.id, e.moving, e.facing, e.attackAnim >= 0 ? e.attackAnim / 0.5 : -1, e.hitFlash / 0.12, death, dt);
    const r = e.radius * 40;
    shadow(ctx, r, r * 0.45, 0.6 * (1 - death));
    if (e.bleed && Math.random() < dt * 6) this.fx.burst(sx, sy, 10 + Math.random() * 14, 1, '#6a0a07', 10);
    switch (def.visual) {
      case 'ghoul': drawGhoul(ctx, pose); break;
      case 'carrion': drawCarrion(ctx, pose); break;
      case 'brute': drawBrute(ctx, pose); break;
      case 'bonewarden': {
        if (!e.dead) {
          const gl = ctx.createRadialGradient(0, -30, 5, 0, -30, 50);
          gl.addColorStop(0, 'rgba(150,30,20,0.18)'); gl.addColorStop(1, 'rgba(150,30,20,0)');
          ctx.fillStyle = gl; ctx.fillRect(-50, -80, 100, 100);
        }
        drawBoneWarden(ctx, pose);
        break;
      }
      default: drawGhoul(ctx, pose);
    }
    ctx.restore();
  }

  private drawBars(ctx: CanvasRenderingContext2D): void {
    for (const e of this.game.enemies) {
      if (e.dead || e.archetype === 'boss' || e.life >= e.maxLife) continue;
      const { sx, sy } = toScreen(e.x, e.y);
      const top = e.archetype === 'big' ? 62 : e.archetype === 'fast' ? 26 : 36;
      const w = e.archetype === 'big' ? 34 : 24;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(sx - w / 2 - 1, sy - top - 1, w + 2, 4);
      ctx.fillStyle = '#9a1c14';
      ctx.fillRect(sx - w / 2, sy - top, w * (e.life / e.maxLife), 2);
    }
  }

  private drawDecals(ctx: CanvasRenderingContext2D): void {
    for (const d of this.fx.decals) {
      const a = Math.min(1, d.life / 4) * 0.55;
      ctx.fillStyle = `rgba(60,6,4,${a})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.45, d.seed, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(d.x + d.r * 0.7, d.y + 2, d.r * 0.35, d.r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawGroundShapes(ctx: CanvasRenderingContext2D): void {
    for (const s of this.fx.shapes) {
      const p = 1 - s.life / s.maxLife;
      if (s.kind === 'telegraph') {
        ctx.strokeStyle = 'rgba(192,40,31,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(150,20,12,${0.12 + p * 0.22})`;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.radius * p, s.radius * 0.5 * p, 0, 0, Math.PI * 2); ctx.fill();
      } else if (s.kind === 'crack') {
        ctx.strokeStyle = `rgba(0,0,0,${0.8 * (s.life / s.maxLife)})`; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = s.angle + (i - 2) * 0.6;
          ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * s.radius * (0.6 + (i % 2) * 0.4), s.y + Math.sin(a) * s.radius * 0.5);
        }
        ctx.stroke();
      } else if (s.kind === 'shock') {
        const r = s.radius * (0.3 + p * 0.9);
        ctx.strokeStyle = s.color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 3 * (1 - p) + 1;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawShapesTop(ctx: CanvasRenderingContext2D): void {
    for (const s of this.fx.shapes) {
      const p = 1 - s.life / s.maxLife;
      if (s.kind === 'arc') {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(1, 0.6);
        ctx.globalAlpha = 1 - p;
        const a0 = s.angle - 1.1, a1 = s.angle + 1.1 * (p * 2 - 1);
        ctx.strokeStyle = s.color; ctx.lineWidth = 5 * (1 - p) + 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, s.radius, a0, Math.max(a0 + 0.1, a1)); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, s.radius - 3, a0, Math.max(a0 + 0.1, a1)); ctx.stroke();
        ctx.restore();
      } else if (s.kind === 'whirl') {
        ctx.save();
        ctx.translate(s.x, s.y - 12);
        ctx.scale(1, 0.5);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = s.color; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const st = p * 10 + i * 2.1;
          ctx.beginPath(); ctx.arc(0, 0, s.radius * (0.6 + i * 0.2), st, st + 1.6); ctx.stroke();
        }
        ctx.restore();
      } else if (s.kind === 'beam') {
        const a = Math.sin(p * Math.PI);
        const g = ctx.createLinearGradient(0, s.y - 120, 0, s.y);
        g.addColorStop(0, 'rgba(232,192,112,0)'); g.addColorStop(1, `rgba(232,192,112,${0.45 * a})`);
        ctx.fillStyle = g;
        ctx.fillRect(s.x - s.radius / 2, s.y - 120, s.radius, 120);
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.fx.particles.items) {
      if (!p.active) continue;
      const a = p.life / p.maxLife;
      ctx.globalAlpha = p.kind === 'dust' ? a * 0.5 : a;
      ctx.fillStyle = p.color;
      if (p.kind === 'dust') {
        ctx.beginPath(); ctx.arc(p.x, p.y - p.z * 0.2, p.size * 4 * (1.5 - a), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.fillRect(p.x, p.y - p.z, 1.4, 1.4);
      } else {
        ctx.fillRect(p.x, p.y - p.z, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawLighting(ctx: CanvasRenderingContext2D, lights: { x: number; y: number; r: number }[], camX: number, camY: number): void {
    const l = this.lctx;
    const W = this.light.width, H = this.light.height;
    const sc = W / this.w;
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = 'rgba(3,3,7,0.93)';
    l.fillRect(0, 0, W, H);
    l.globalCompositeOperation = 'destination-out';
    for (const li of lights) {
      const x = ((li.x - camX) * ZOOM + this.w / 2) * sc, y = ((li.y - camY) * ZOOM + this.h / 2) * sc;
      const flick = 1 + Math.sin(this.time * 9 + li.x) * 0.02;
      const r = li.r * ZOOM * sc * flick;
      if (x < -r || y < -r || x > W + r || y > H + r) continue;
      const g = l.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.beginPath(); l.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2); l.fill();
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.light, 0, 0, this.w, this.h);
    // warm tint around lights
    ctx.globalCompositeOperation = 'soft-light';
    for (const li of lights) {
      const x = (li.x - camX) * ZOOM + this.w / 2, y = (li.y - camY) * ZOOM + this.h / 2;
      const r = li.r * ZOOM;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.9);
      g.addColorStop(0, 'rgba(255,150,60,0.45)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawFog(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.game.profile.settings.reducedParticles) return;
    for (let i = 0; i < 4; i++) {
      const x = ((this.time * (6 + i * 2) + i * 160) % (this.w + 300)) - 150;
      const y = this.h * (0.2 + i * 0.2) + Math.sin(this.time * 0.2 + i) * 20;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 160);
      g.addColorStop(0, 'rgba(120,120,130,0.07)');
      g.addColorStop(1, 'rgba(120,120,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 160, y - 160, 320, 320);
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawLabels(ctx: CanvasRenderingContext2D): void {
    ctx.font = '600 11px "EB Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let stack = 0;
    for (const l of this.fx.labels) {
      const a = Math.min(1, l.life / 0.4, (l.maxLife - l.life) / 0.15 + 0.2);
      ctx.globalAlpha = a;
      if (l.beam) {
        const g = ctx.createLinearGradient(0, l.y - 70, 0, l.y);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, l.color);
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = g;
        ctx.fillRect(l.x - 3, l.y - 70, 6, 70);
        ctx.globalAlpha = a;
      }
      const y = l.y - 24 - stack * 4;
      const w = ctx.measureText(l.text).width + 12;
      ctx.fillStyle = 'rgba(8,6,5,0.85)';
      ctx.fillRect(l.x - w / 2, y - 8, w, 16);
      ctx.strokeStyle = 'rgba(120,96,60,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(l.x - w / 2 + 0.5, y - 7.5, w - 1, 15);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, l.x, y + 0.5);
      stack++;
    }
    ctx.globalAlpha = 1;
  }

  private drawNumbers(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of this.fx.numbers.items) {
      if (!n.active) continue;
      const p = 1 - n.life / n.maxLife;
      const y = n.y - p * 26;
      const scale = p < 0.12 ? 1 + (0.12 - p) * 4 : 1;
      ctx.globalAlpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
      ctx.font = `700 ${Math.round(n.size * scale)}px "Cinzel", Georgia, serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(n.text, n.x, y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, y);
    }
    ctx.globalAlpha = 1;
  }
}

