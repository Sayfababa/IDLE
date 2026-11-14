import { hash2, TILE_H, TILE_W, toScreen } from './iso';

/**
 * Procedural ground: worn flagstones, ash and dirt, cached per chunk of tiles
 * into offscreen canvases (drawn once, blitted every frame).
 */
const CHUNK = 8;

export type PropKind = 'grave' | 'graveCross' | 'stump' | 'bones' | 'pillar' | 'brazier' | 'candles';
export interface Prop { kind: PropKind; x: number; y: number; seed: number }

export class Ground {
  private cache = new Map<string, HTMLCanvasElement>();
  private dpr: number;

  constructor(dpr: number) { this.dpr = dpr; }

  private chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = `${cx},${cy}`;
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    const w = CHUNK * TILE_W + TILE_W, h = CHUNK * TILE_H + TILE_H;
    c.width = Math.ceil(w * this.dpr); c.height = Math.ceil(h * this.dpr);
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    // origin of chunk tile (cx*CHUNK, cy*CHUNK) – top vertex placed at (w/2, 0)
    const ox = (CHUNK * TILE_W) / 2 + TILE_W / 2;
    for (let ty = 0; ty < CHUNK; ty++) for (let tx = 0; tx < CHUNK; tx++) {
      const wx = cx * CHUNK + tx, wy = cy * CHUNK + ty;
      const { sx, sy } = toScreen(tx, ty);
      drawTile(g, ox + sx, sy, wx, wy);
    }
    if (this.cache.size > 80) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, c);
    return c;
  }

  /** Draw all chunks overlapping the view. camX/camY = screen-space camera center. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number): void {
    const w = CHUNK * TILE_W + TILE_W, h = CHUNK * TILE_H + TILE_H;
    // Determine tile range visible (generous)
    const corners = [[-vw / 2, -vh / 2], [vw / 2, -vh / 2], [-vw / 2, vh / 2], [vw / 2, vh / 2]] as const;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [dx, dy] of corners) {
      const sx = camX + dx, sy = camY + dy;
      const a = sx / (TILE_W / 2), b = sy / (TILE_H / 2);
      const x = (a + b) / 2, y = (b - a) / 2;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const c0x = Math.floor(minX / CHUNK) - 1, c1x = Math.floor(maxX / CHUNK) + 1;
    const c0y = Math.floor(minY / CHUNK) - 1, c1y = Math.floor(maxY / CHUNK) + 1;
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      const { sx, sy } = toScreen(cx * CHUNK, cy * CHUNK);
      const px = sx - (CHUNK * TILE_W) / 2 - TILE_W / 2 - camX + vw / 2;
      const py = sy - camY + vh / 2 - TILE_H / 2;
      if (px > vw || py > vh || px + w < 0 || py + h < 0) continue;
      ctx.drawImage(this.chunk(cx, cy), px, py, w, h);
    }
  }

  /** Decorative props near a world position (deterministic per tile). */
  propsAround(x: number, y: number, r: number): Prop[] {
    const out: Prop[] = [];
    const x0 = Math.floor(x - r), x1 = Math.ceil(x + r), y0 = Math.floor(y - r), y1 = Math.ceil(y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const h = hash2(tx, ty, 7);
      if (h > 0.045) continue;
      const k = hash2(tx, ty, 8);
      const kind: PropKind = k < 0.28 ? 'grave' : k < 0.45 ? 'graveCross' : k < 0.6 ? 'bones' : k < 0.72 ? 'stump' : k < 0.82 ? 'pillar' : k < 0.92 ? 'candles' : 'brazier';
      out.push({ kind, x: tx + 0.5, y: ty + 0.5, seed: hash2(tx, ty, 9) });
    }
    return out;
  }
}

function drawTile(g: CanvasRenderingContext2D, cx: number, top: number, wx: number, wy: number): void {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  const v = hash2(wx, wy);
  const ash = (Math.sin(wx * 0.31 + wy * 0.17) + Math.sin(wx * 0.07 - wy * 0.23) * 1.3) * 0.5; // large-scale variation
  const path = () => { g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + hw, top + hh); g.lineTo(cx, top + TILE_H); g.lineTo(cx - hw, top + hh); g.closePath(); };

  // Base stone color: cold grey-brown, darker in "ash" areas
  const l = 17 + v * 6 + ash * 3;
  const sat = 6 + v * 4;
  path();
  g.fillStyle = `hsl(${28 + v * 10}, ${sat}%, ${l}%)`;
  g.fill();

  g.save();
  path();
  g.clip();
  // Flagstone subdivision: split some tiles into 2-4 stones with seams
  const split = hash2(wx, wy, 1);
  g.strokeStyle = 'rgba(8,6,5,0.75)';
  g.lineWidth = 1.2;
  if (split < 0.5) {
    g.beginPath();
    g.moveTo(cx - hw / 2, top + hh / 2); g.lineTo(cx + hw / 2, top + hh * 1.5);
    g.stroke();
  } else if (split < 0.75) {
    g.beginPath();
    g.moveTo(cx + hw / 2, top + hh / 2); g.lineTo(cx - hw / 2, top + hh * 1.5);
    g.stroke();
  }
  // Grit speckles
  const n = 14;
  for (let i = 0; i < n; i++) {
    const rx = (hash2(wx * 31 + i, wy, 2) - 0.5) * TILE_W;
    const ry = (hash2(wx, wy * 17 + i, 3) - 0.5) * TILE_H;
    const d = hash2(wx + i, wy - i, 4);
    g.fillStyle = d < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(150,135,115,0.08)';
    g.fillRect(cx + rx, top + hh + ry, 1.5, 1.2);
  }
  // Cracks
  if (hash2(wx, wy, 5) < 0.18) {
    g.strokeStyle = 'rgba(5,4,3,0.7)';
    g.lineWidth = 0.9;
    g.beginPath();
    let px = cx + (hash2(wx, wy, 11) - 0.5) * hw, py = top + hh + (hash2(wx, wy, 12) - 0.5) * hh;
    g.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      px += (hash2(wx + i, wy, 13) - 0.5) * 18; py += (hash2(wx, wy + i, 14) - 0.5) * 9;
      g.lineTo(px, py);
    }
    g.stroke();
  }
  // Ash / dirt patches & dried moss
  const p = hash2(wx, wy, 6);
  if (p < 0.12) {
    const grd = g.createRadialGradient(cx, top + hh, 2, cx, top + hh, hw);
    grd.addColorStop(0, 'rgba(70,62,52,0.35)');
    grd.addColorStop(1, 'rgba(70,62,52,0)');
    g.fillStyle = grd; g.fillRect(cx - hw, top, TILE_W, TILE_H);
  } else if (p < 0.17) {
    g.fillStyle = 'rgba(52,58,34,0.35)';
    for (let i = 0; i < 6; i++) g.fillRect(cx + (hash2(wx, i, 15) - 0.5) * hw, top + hh + (hash2(i, wy, 16) - 0.5) * hh, 3, 1);
  } else if (p > 0.985) {
    // old blood stain
    g.fillStyle = 'rgba(70,10,8,0.45)';
    g.beginPath(); g.ellipse(cx, top + hh, 10, 4, 0.2, 0, Math.PI * 2); g.fill();
  }
  // Top-left edge highlight, bottom-right shade → bevel
  g.restore();
  g.strokeStyle = 'rgba(160,140,115,0.06)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx - hw, top + hh); g.lineTo(cx, top); g.lineTo(cx + hw, top + hh); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.beginPath(); g.moveTo(cx - hw, top + hh); g.lineTo(cx, top + TILE_H); g.lineTo(cx + hw, top + hh); g.stroke();
}
