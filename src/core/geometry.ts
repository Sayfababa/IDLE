/** 4 diagonal facings in isometric screen space (SPEC 14.1). */
export type Facing = 'NE' | 'NW' | 'SE' | 'SW';

/** Converts a world-space direction into one of 4 iso facings. */
export function facingFromVector(dx: number, dy: number, prev: Facing): Facing {
  const sx = dx - dy;
  const sy = (dx + dy) / 2;
  if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) return prev;
  return `${sy >= 0 ? 'S' : 'N'}${sx >= 0 ? 'E' : 'W'}` as Facing;
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
