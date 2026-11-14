import { Data } from '../data/registry';
import { t } from '../data/i18n/de';
import { estimateDps } from '../sim/damage';
import type { Game } from '../sim/game';
import type { StatSheet } from '../sim/stats';
import type { ItemInstance } from '../sim/types';

const PERCENT_LIKE = new Set(['crit.multi']);

export function fmtValue(stat: string, v: number): string {
  const def = Data.stats.get(stat);
  if (def?.unit === 'percent' || PERCENT_LIKE.has(stat)) {
    const p = v * 100;
    return `${Math.abs(p) < 10 && p % 1 !== 0 ? p.toFixed(1) : Math.round(p)} %`;
  }
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export function statLine(stat: string, v: number): string {
  return t(`stat.${stat}`, fmtValue(stat, v));
}

export function itemName(it: ItemInstance): string {
  return it.name ?? t(Data.baseItem(it.base).name);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Key numbers for character sheet and comparison. */
export interface Summary {
  dps: number; life: number; armor: number; evasion: number; crit: number; aps: number; regen: number; block: number; res: number;
}

export function summarize(game: Game, sh: StatSheet): Summary {
  const basic = Data.skill(Data.cls(game.profile.classId).basicAttack);
  const params = game.paramsFor(basic);
  return {
    dps: estimateDps(sh, basic, params),
    life: Math.round(sh.get('life.max')),
    armor: Math.round(sh.get('armor')),
    evasion: Math.round(sh.get('evasion')),
    crit: Math.min(1, sh.weapon.crit + sh.get('crit.chance')),
    aps: sh.weapon.aps * (1 + sh.get('attack.speed')),
    regen: sh.get('life.regen'),
    block: sh.get('block.chance'),
    res: (sh.get('res.fire') + sh.get('res.cold') + sh.get('res.lightning')) / 3,
  };
}

export const SUMMARY_ROWS: { key: keyof Summary; label: string; fmt: (v: number) => string }[] = [
  { key: 'dps', label: 'ui.dps', fmt: (v) => v.toFixed(1) },
  { key: 'life', label: 'ui.life', fmt: (v) => String(Math.round(v)) },
  { key: 'armor', label: 'ui.armor', fmt: (v) => String(Math.round(v)) },
  { key: 'evasion', label: 'ui.evasion', fmt: (v) => String(Math.round(v)) },
  { key: 'crit', label: 'ui.critChance', fmt: (v) => `${(v * 100).toFixed(1)} %` },
  { key: 'aps', label: 'ui.attackSpeed', fmt: (v) => v.toFixed(2) },
  { key: 'regen', label: 'ui.regen', fmt: (v) => v.toFixed(1) },
  { key: 'block', label: 'ui.block', fmt: (v) => `${Math.round(v * 100)} %` },
  { key: 'res', label: 'ui.resists', fmt: (v) => `${Math.round(v * 100)} %` },
];
