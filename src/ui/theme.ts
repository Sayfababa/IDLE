import type { RarityId } from '../data/types';

/** Shared colour tokens for canvas + DOM. */
export const RARITY_COLOR: Record<RarityId, string> = {
  normal: '#a8a294',
  magic: '#7896e0',
  rare: '#e6cb5c',
  epic: '#b076e0',
  legendary: '#e48b2a',
  mythic: '#de3b2c',
};

export const DMG_COLOR = {
  normal: '#f2ece0',
  crit: '#ffd34d',
  bleed: '#d8392b',
  poison: '#7fc24a',
  arcane: '#b98cff',
  player: '#ff5a48',
} as const;
