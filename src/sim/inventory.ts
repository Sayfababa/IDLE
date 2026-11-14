import { BALANCE } from '../data/balance';
import { Data } from '../data/registry';
import { rarityIndex, sellValue } from './items';
import type { ItemInstance, Profile } from './types';

export type InvResult = { ok: true } | { ok: false; reason: string };

export function canEquip(p: Profile, item: ItemInstance): boolean {
  const base = Data.baseItem(item.base);
  return !base.classes || base.classes.includes(p.classId);
}

export function equip(p: Profile, uid: string): InvResult {
  const idx = p.inventory.findIndex((i) => i.uid === uid);
  const item = p.inventory[idx];
  if (!item) return { ok: false, reason: 'not-found' };
  if (!canEquip(p, item)) return { ok: false, reason: 'class' };
  p.inventory.splice(idx, 1);
  const old = p.equipment[item.slot];
  p.equipment[item.slot] = item;
  if (old) p.inventory.splice(idx, 0, old);
  return { ok: true };
}

export function unequip(p: Profile, slot: ItemInstance['slot']): InvResult {
  const item = p.equipment[slot];
  if (!item) return { ok: false, reason: 'empty' };
  if (p.inventory.length >= BALANCE.loot.inventorySize) return { ok: false, reason: 'full' };
  delete p.equipment[slot];
  p.inventory.push(item);
  return { ok: true };
}

export function sell(p: Profile, uid: string): number {
  const idx = p.inventory.findIndex((i) => i.uid === uid);
  const item = p.inventory[idx];
  if (!item || item.locked) return 0;
  p.inventory.splice(idx, 1);
  const v = sellValue(item);
  p.gold += v;
  return v;
}

export function sellAllUnlocked(p: Profile): number {
  let total = 0;
  for (const it of [...p.inventory]) if (!it.locked) total += sell(p, it.uid);
  return total;
}

export function toggleLock(p: Profile, uid: string): void {
  const it = p.inventory.find((i) => i.uid === uid);
  if (it) it.locked = !it.locked;
}

const score = (i: ItemInstance) => rarityIndex(i.rarity) * 1000 + i.ilvl;

/**
 * Adds looted item respecting loot filter and inventory limit (SPEC 15).
 * Returns whether the item was kept and how much gold auto-selling produced.
 */
export function addLoot(p: Profile, item: ItemInstance): { kept: boolean; gold: number } {
  if (rarityIndex(item.rarity) < rarityIndex(p.lootFilter)) {
    const g = sellValue(item);
    p.gold += g;
    return { kept: false, gold: g };
  }
  if (p.inventory.length < BALANCE.loot.inventorySize) {
    p.inventory.push(item);
    return { kept: true, gold: 0 };
  }
  // Full: sell worst unlocked item below legendary if the new one is better, else sell new.
  const candidates = p.inventory.filter((i) => !i.locked && rarityIndex(i.rarity) < rarityIndex('legendary'));
  const worst = candidates.sort((a, b) => score(a) - score(b))[0];
  if (worst && score(worst) < score(item)) {
    const g = sell(p, worst.uid);
    p.inventory.push(item);
    return { kept: true, gold: g };
  }
  const g = sellValue(item);
  p.gold += g;
  return { kept: false, gold: g };
}
