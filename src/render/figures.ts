import type { Facing } from '../core/geometry';
import { mix } from './iso';
import type { PropKind } from './ground';

/**
 * Procedural figures drawn with canvas paths – stylised, hand-shaped silhouettes
 * (no sprites yet, SPEC 14.1). Origin = feet on ground; -y is up.
 * Only 4 facings: E/W via mirroring, N shows the back.
 */
export interface Pose {
  facing: Facing;
  /** Walk cycle time (s). */
  walk: number;
  moving: boolean;
  /** Attack progress 0..1 or -1. */
  attack: number;
  /** Hit flash 0..1. */
  flash: number;
  /** Death collapse 0..1 (0 = alive). */
  death: number;
  t: number;
}

const tone = (c: string, f: number) => (f > 0 ? mix(c, '#f4e6d0', Math.min(0.3, f * 0.3)) : c);

function begin(ctx: CanvasRenderingContext2D, pose: Pose, scale: number): boolean {
  ctx.save();
  const east = pose.facing.endsWith('E');
  ctx.scale(east ? scale : -scale, scale);
  if (pose.death > 0) {
    ctx.globalAlpha *= 1 - pose.death * 0.8;
    ctx.rotate(-pose.death * 1.2);
    ctx.translate(0, pose.death * 6);
  }
  return pose.facing.startsWith('S');
}

export function shadow(ctx: CanvasRenderingContext2D, rx: number, ry: number, alpha = 0.55): void {
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: number[], fill: string | CanvasGradient, stroke?: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// ---------------------------------------------------------------- Warrior
export function drawWarrior(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const front = begin(ctx, pose, 1);
  const f = pose.flash;
  const step = pose.moving ? Math.sin(pose.walk * 10) : 0;
  const bob = pose.moving ? Math.abs(Math.sin(pose.walk * 10)) * -1.5 : Math.sin(pose.t * 2) * 0.4;
  const steel = tone('#5b5d63', f), steelDark = tone('#2e2f34', f), steelLight = tone('#9a9ca3', f);
  const cloth = tone('#5a1712', f), leather = tone('#3b2a1e', f);

  // Sword arm angle: rest low, swing from raised back to forward-down.
  const a = pose.attack;
  const swing = a < 0 ? 0.5 : a < 0.45 ? 0.5 - (a / 0.45) * 2.3 : -1.8 + ((a - 0.45) / 0.55) * 3.1;

  const drawSword = () => {
    ctx.save();
    ctx.translate(7, -22 + bob);
    ctx.rotate(swing);
    ctx.fillStyle = leather; ctx.fillRect(-1.5, -2, 3, 6); // grip
    ctx.fillStyle = tone('#8a6a3b', f); ctx.fillRect(-5, 3, 10, 2); // crossguard
    const g = ctx.createLinearGradient(-2, 0, 2, 0);
    g.addColorStop(0, steelLight); g.addColorStop(0.5, tone('#d9dbe0', f)); g.addColorStop(1, steel);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-1.8, 5); ctx.lineTo(1.8, 5); ctx.lineTo(1.2, 27); ctx.lineTo(0, 31); ctx.lineTo(-1.2, 27); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // Cape behind (front view) / over back (back view)
  const capeSway = Math.sin(pose.t * 1.7) * 1.2 + (pose.moving ? -2 : 0);
  const cape = () => poly(ctx, [-7, -30 + bob, 7, -30 + bob, 9 + capeSway, -4, 2, -2, -9 + capeSway, -5], cloth, tone('#2a0806', f));

  if (front) cape();
  if (!front) drawSword();
  // Legs
  poly(ctx, [-5, -14 + bob, -1, -14 + bob, -1.5 + step * 2, 0, -5.5 + step * 2, 0], steelDark);
  poly(ctx, [1, -14 + bob, 5, -14 + bob, 5.5 - step * 2, 0, 1.5 - step * 2, 0], steelDark);
  // Torso plate
  const tg = ctx.createLinearGradient(-8, 0, 8, 0);
  tg.addColorStop(0, steelDark); tg.addColorStop(0.45, steel); tg.addColorStop(1, steelDark);
  poly(ctx, [-8, -31 + bob, 8, -31 + bob, 6, -14 + bob, -6, -14 + bob], tg, tone('#18181b', f));
  // Belt
  ctx.fillStyle = leather; ctx.fillRect(-6.5, -16.5 + bob, 13, 2.5);
  ctx.fillStyle = tone('#8a6a3b', f); ctx.fillRect(-1, -16.5 + bob, 2, 2.5);
  if (front) {
    // Tabard
    poly(ctx, [-3, -29 + bob, 3, -29 + bob, 2.5, -10 + bob, 0, -8 + bob, -2.5, -10 + bob], cloth);
  } else cape();
  // Pauldrons
  ctx.fillStyle = steel;
  ctx.beginPath(); ctx.ellipse(-8, -30 + bob, 4.2, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, -30 + bob, 4.2, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = steelLight; ctx.fillRect(-10, -32 + bob, 4, 1); ctx.fillRect(6, -32 + bob, 4, 1);
  // Helm
  const hg = ctx.createLinearGradient(-5, -42, 5, -32);
  hg.addColorStop(0, steelLight); hg.addColorStop(1, steelDark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-5, -32 + bob); ctx.lineTo(-5.5, -39 + bob); ctx.quadraticCurveTo(0, -45 + bob, 5.5, -39 + bob); ctx.lineTo(5, -32 + bob); ctx.closePath();
  ctx.fill();
  if (front) {
    ctx.fillStyle = '#060505'; ctx.fillRect(-4, -38.5 + bob, 8, 1.6); // visor slit
    ctx.fillRect(-0.6, -38.5 + bob, 1.2, 5);
  }
  ctx.fillStyle = steelLight; ctx.fillRect(-0.5, -44 + bob, 1, 6); // crest ridge
  if (front) drawSword();
  ctx.restore();
}

// ---------------------------------------------------------------- Ghoul
export function drawGhoul(ctx: CanvasRenderingContext2D, pose: Pose, big = 1): void {
  const front = begin(ctx, pose, big);
  const f = pose.flash;
  const skin = tone('#59604f', f), skinDark = tone('#33382d', f), rag = tone('#2c2620', f);
  const lurch = pose.moving ? Math.sin(pose.walk * 7) : 0;
  const reach = pose.attack >= 0 ? Math.sin(Math.min(1, pose.attack * 2) * Math.PI) : 0;
  // legs
  poly(ctx, [-4, -12, -1, -12, -2 + lurch * 2, 0, -5 + lurch * 2, 0], skinDark);
  poly(ctx, [1, -12, 4, -12, 5 - lurch * 2, 0, 2 - lurch * 2, 0], skinDark);
  // hunched torso leaning forward
  ctx.save();
  ctx.translate(0, -12);
  ctx.rotate(0.35 + lurch * 0.05);
  poly(ctx, [-6, 0, 6, 0, 7, -14, 1, -18, -6, -13], skin, tone('#20241c', f));
  // ribs
  ctx.strokeStyle = 'rgba(20,22,16,0.7)'; ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4, -4 - i * 3); ctx.lineTo(3, -5 - i * 3); ctx.stroke(); }
  poly(ctx, [-6, 0, 6, 0, 5, -4, -5, -3], rag);
  // head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(4, -19, 4, 3.6, 0.3, 0, Math.PI * 2); ctx.fill();
  if (front) {
    ctx.fillStyle = '#d6c35a';
    ctx.fillRect(4.5, -20, 1.4, 1); ctx.fillRect(6.8, -19.6, 1.2, 1);
    ctx.fillStyle = '#120d0a'; ctx.fillRect(4.5, -17.4, 3, 0.9);
  }
  // arms – long, clawed
  ctx.strokeStyle = skin; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(9 + reach * 6, -4 + reach * -3); ctx.lineTo(10 + reach * 9, 3 - reach * 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, -13); ctx.lineTo(-3, -4); ctx.lineTo(-2, 3); ctx.stroke();
  ctx.strokeStyle = tone('#c9c3a8', f); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(10 + reach * 9, 3 - reach * 6); ctx.lineTo(12 + reach * 9, 5 - reach * 6); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Carrion runner
export function drawCarrion(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const front = begin(ctx, pose, 1);
  const f = pose.flash;
  const hide = tone('#4a3527', f), bone = tone('#b9ae92', f), dark = tone('#22170f', f);
  const run = pose.moving ? pose.walk * 16 : 0;
  const lunge = pose.attack >= 0 ? Math.sin(Math.min(1, pose.attack * 2) * Math.PI) * 4 : 0;
  ctx.translate(lunge, 0);
  // four legs
  ctx.strokeStyle = dark; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (const [x, ph] of [[-6, 0], [-3, Math.PI], [4, Math.PI / 2], [7, Math.PI * 1.5]] as const) {
    const s = Math.sin(run + ph) * 2.5;
    ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x + s, -3); ctx.lineTo(x + s * 0.5, 0); ctx.stroke();
  }
  // body (low, long)
  ctx.fillStyle = hide;
  ctx.beginPath(); ctx.ellipse(0, -10, 9, 4.2, -0.08, 0, Math.PI * 2); ctx.fill();
  // spine spikes
  ctx.fillStyle = bone;
  for (let i = -6; i <= 5; i += 3) poly(ctx, [i - 1, -13.5, i + 1, -13.5, i + 0.3, -16.5], bone);
  // skull head
  ctx.beginPath(); ctx.ellipse(10, -11, 3.6, 2.8, 0.2, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [11, -9.5, 15.5, -9, 11, -8], bone);
  if (front) { ctx.fillStyle = '#8f1a12'; ctx.fillRect(10, -12, 1.3, 1.1); }
  ctx.restore();
}

// ---------------------------------------------------------------- Brute
export function drawBrute(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const front = begin(ctx, pose, 1);
  const f = pose.flash;
  const flesh = tone('#6b5244', f), fleshDark = tone('#3f2d24', f), stitch = tone('#1d130e', f), stone = tone('#55524c', f);
  const step = pose.moving ? Math.sin(pose.walk * 5) : 0;
  const a = pose.attack;
  const club = a < 0 ? 0.4 : a < 0.5 ? 0.4 - (a / 0.5) * 2.2 : -1.8 + ((a - 0.5) / 0.5) * 2.6;
  const drawClub = () => {
    ctx.save();
    ctx.translate(12, -30);
    ctx.rotate(club);
    ctx.fillStyle = fleshDark; ctx.fillRect(-1.5, 0, 3, 14);
    poly(ctx, [-5, 12, 5, 12, 6, 24, -6, 25], stone, '#2a2824');
    ctx.restore();
  };
  if (!front) drawClub();
  poly(ctx, [-9, -18, -2, -18, -3 + step * 2, 0, -10 + step * 2, 0], fleshDark);
  poly(ctx, [2, -18, 9, -18, 10 - step * 2, 0, 3 - step * 2, 0], fleshDark);
  // gut + chest
  ctx.fillStyle = flesh;
  ctx.beginPath(); ctx.ellipse(0, -28, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = stitch; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(4, -20); ctx.stroke();
  for (let i = 0; i < 5; i++) { const x = -6 + i * 2.5, y = -36 + i * 4; ctx.beginPath(); ctx.moveTo(x - 1.5, y + 1); ctx.lineTo(x + 1.5, y - 1); ctx.stroke(); }
  // loincloth
  poly(ctx, [-10, -20, 10, -20, 7, -13, -7, -13], tone('#2b2119', f));
  // small head sunk in shoulders
  ctx.fillStyle = flesh;
  ctx.beginPath(); ctx.ellipse(2, -42, 5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  if (front) { ctx.fillStyle = '#c8b04a'; ctx.fillRect(1, -43, 1.3, 1); ctx.fillRect(4, -43, 1.3, 1); }
  // arms
  ctx.fillStyle = flesh;
  ctx.beginPath(); ctx.ellipse(-13, -30, 4, 9, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, -32, 4, 8, -0.3, 0, Math.PI * 2); ctx.fill();
  if (front) drawClub();
  ctx.restore();
}

// ---------------------------------------------------------------- Boss: Bone Warden
export function drawBoneWarden(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const front = begin(ctx, pose, 1.15);
  const f = pose.flash;
  const bone = tone('#c7bc9f', f), boneDark = tone('#857a62', f), iron = tone('#2b2a2c', f), robe = tone('#1c1416', f);
  const step = pose.moving ? Math.sin(pose.walk * 5) : 0;
  const a = pose.attack;
  const axe = a < 0 ? 0.3 : a < 0.5 ? 0.3 - (a / 0.5) * 2.4 : -2.1 + ((a - 0.5) / 0.5) * 2.9;
  const drawAxe = () => {
    ctx.save();
    ctx.translate(11, -40);
    ctx.rotate(axe);
    ctx.fillStyle = boneDark; ctx.fillRect(-1.3, -4, 2.6, 34);
    ctx.fillStyle = iron;
    ctx.beginPath(); ctx.moveTo(1, 22); ctx.quadraticCurveTo(14, 24, 13, 36); ctx.quadraticCurveTo(6, 31, 1, 33); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone('#6d6a66', f); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
  };
  if (!front) drawAxe();
  // tattered robe
  const sway = Math.sin(pose.t * 1.3) * 1.5;
  poly(ctx, [-10, -44, 10, -44, 13 + sway, 0, 7, -3, 3 + sway, 1, -3, -2, -8 + sway, 1, -13 + sway, -1], robe, '#0b0708');
  // legs bones peeking
  ctx.strokeStyle = bone; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-4 + step * 2, 0); ctx.moveTo(4, -8); ctx.lineTo(4 - step * 2, 0); ctx.stroke();
  // ribcage armour
  ctx.fillStyle = iron;
  poly(ctx, [-11, -50, 11, -50, 8, -30, -8, -30], iron, '#121112');
  ctx.strokeStyle = bone; ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-7, -46 + i * 4); ctx.quadraticCurveTo(0, -44 + i * 4, 7, -46 + i * 4); ctx.stroke(); }
  // shoulder skulls
  ctx.fillStyle = bone;
  ctx.beginPath(); ctx.arc(-12, -50, 4, 0, Math.PI * 2); ctx.arc(12, -50, 4, 0, Math.PI * 2); ctx.fill();
  // skull head + crown of horns
  ctx.beginPath(); ctx.ellipse(0, -58, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = boneDark;
  poly(ctx, [-5, -62, -9, -72, -3, -64], boneDark);
  poly(ctx, [5, -62, 9, -72, 3, -64], boneDark);
  poly(ctx, [-1.5, -63, 0, -70, 1.5, -63], boneDark);
  if (front) {
    const glow = 0.7 + Math.sin(pose.t * 4) * 0.3;
    ctx.fillStyle = `rgba(230,60,30,${glow})`;
    ctx.fillRect(-3.5, -59.5, 2.2, 1.8); ctx.fillRect(1.3, -59.5, 2.2, 1.8);
    ctx.fillStyle = '#16100c'; ctx.fillRect(-2.5, -55, 5, 1.2);
  }
  if (front) drawAxe();
  ctx.restore();
}

// ---------------------------------------------------------------- Props
export function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, seed: number, t: number): void {
  const flip = seed > 0.5 ? -1 : 1;
  ctx.save();
  ctx.scale(flip, 1);
  const stone = '#3b3833', stoneLight = '#57534b', stoneDark = '#1f1d1a';
  switch (kind) {
    case 'grave': {
      shadow(ctx, 12, 5, 0.5);
      ctx.rotate((seed - 0.5) * 0.25);
      ctx.fillStyle = stone;
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7, -14); ctx.quadraticCurveTo(0, -22, 7, -14); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = stoneLight; ctx.fillRect(-7, -14, 2, 14);
      ctx.strokeStyle = stoneDark; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.moveTo(-3, -9); ctx.lineTo(2, -9); ctx.stroke();
      ctx.fillStyle = 'rgba(55,62,35,0.6)'; ctx.fillRect(-7, -2, 14, 2);
      break;
    }
    case 'graveCross': {
      shadow(ctx, 9, 4, 0.5);
      ctx.rotate((seed - 0.5) * 0.4);
      ctx.fillStyle = stone; ctx.fillRect(-1.8, -22, 3.6, 22); ctx.fillRect(-7, -17, 14, 3.4);
      ctx.fillStyle = stoneLight; ctx.fillRect(-1.8, -22, 1, 22);
      break;
    }
    case 'pillar': {
      shadow(ctx, 12, 5, 0.6);
      ctx.fillStyle = stone; ctx.fillRect(-6, -30 + seed * 10, 12, 30 - seed * 10);
      ctx.fillStyle = stoneLight; ctx.fillRect(-6, -30 + seed * 10, 3, 30 - seed * 10);
      ctx.fillStyle = stoneDark; ctx.fillRect(-8, -3, 16, 3);
      ctx.beginPath(); ctx.moveTo(-6, -30 + seed * 10); ctx.lineTo(-2, -34 + seed * 10); ctx.lineTo(3, -29 + seed * 10); ctx.lineTo(6, -31 + seed * 10); ctx.lineTo(6, -28 + seed * 10); ctx.lineTo(-6, -27 + seed * 10); ctx.fillStyle = stone; ctx.fill();
      break;
    }
    case 'stump': {
      shadow(ctx, 10, 4, 0.5);
      ctx.fillStyle = '#2a1f17';
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-4, -10); ctx.lineTo(-7, -18); ctx.lineTo(-2, -12); ctx.lineTo(0, -22); ctx.lineTo(2, -11); ctx.lineTo(7, -16); ctx.lineTo(4, -8); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#120c08'; ctx.lineWidth = 0.7; ctx.stroke();
      break;
    }
    case 'bones': {
      ctx.strokeStyle = '#8f8670'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(2, -3); ctx.moveTo(-3, 1); ctx.lineTo(5, 2); ctx.stroke();
      ctx.fillStyle = '#a49b82';
      ctx.beginPath(); ctx.ellipse(6, -2, 3.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a140f'; ctx.fillRect(5, -3, 1, 1); ctx.fillRect(7, -3, 1, 1);
      break;
    }
    case 'candles': {
      for (const [x, h] of [[-4, 6], [0, 9], [4, 5]] as const) {
        ctx.fillStyle = '#b9ad8f'; ctx.fillRect(x - 1, -h, 2, h);
        const fl = Math.sin(t * 12 + x + seed * 9) * 0.6;
        ctx.fillStyle = '#ffcf7a';
        ctx.beginPath(); ctx.ellipse(x + fl * 0.4, -h - 2, 0.9, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(185,173,143,0.5)'; ctx.fillRect(-6, -0.5, 12, 1);
      break;
    }
    case 'brazier': {
      shadow(ctx, 10, 4, 0.5);
      ctx.strokeStyle = '#1c1a18'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(0, -12); ctx.lineTo(5, 0); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
      ctx.fillStyle = '#2b2725';
      ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(8, -14); ctx.lineTo(5, -10); ctx.lineTo(-5, -10); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const fl = Math.sin(t * (9 + i * 3) + i * 2 + seed * 7);
        ctx.fillStyle = i === 0 ? '#c4401a' : i === 1 ? '#ef8a2a' : '#ffd27a';
        ctx.beginPath(); ctx.ellipse(fl * 1.2, -18 - i * 2, 5 - i * 1.4, 5 + fl, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

/** Light radius for props that emit light. */
export function propLight(kind: PropKind): number {
  return kind === 'brazier' ? 150 : kind === 'candles' ? 70 : 0;
}
