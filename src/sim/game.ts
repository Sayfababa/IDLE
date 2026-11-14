import { Rng } from '../core/rng';
import { dist, facingFromVector } from '../core/geometry';
import { BALANCE, xpToNext } from '../data/balance';
import { Data } from '../data/registry';
import type { EnemyDef, SkillDef } from '../data/types';
import { armorReduction, bleedDps, bleedDuration, computeHit, type TargetInfo } from './damage';
import { addLoot, equip as invEquip, sell as invSell, sellAllUnlocked, toggleLock, unequip as invUnequip } from './inventory';
import { generateItem } from './items';
import { buildStats, isUnlocked, skillLevel, skillParams, type StatSheet } from './stats';
import type { Buff, EnemyRt, GameEvent, ItemInstance, PlayerRt, Profile } from './types';

/**
 * The headless game simulation. No DOM, deterministic for a given profile + inputs.
 * Renderer/UI read `profile`, `player`, `enemies` and drain `events`; they never mutate sim state directly.
 */
export class Game {
  readonly rng: Rng;
  readonly player: PlayerRt;
  enemies: EnemyRt[] = [];
  events: GameEvent[] = [];
  sheet!: StatSheet;
  time = 0;
  private nextId = 1;
  private spawnT = 0;
  private bossAlive = false;
  private dirty = true;

  constructor(public profile: Profile) {
    this.rng = new Rng(profile.rng);
    this.player = {
      id: 0, x: 0, y: 0, facing: 'SE', radius: 0.4, life: 1, resource: 0, state: 'searching',
      targetId: null, action: null, cooldowns: {}, buffs: [], respawnT: 0, sinceCombat: 99, moving: false, hitFlash: 0,
    };
    this.refreshStats();
    this.player.life = this.maxLife;
    const cls = Data.cls(profile.classId);
    this.player.resource = cls.resource.startsEmpty ? 0 : this.maxResource;
  }

  // ---------- Derived values ----------
  get maxLife(): number { return Math.max(1, Math.round(this.sheet.get('life.max'))); }
  get maxResource(): number { return Math.max(0, Math.round(this.sheet.get('resource.max'))); }
  get attackRate(): number { return this.sheet.weapon.aps * (1 + this.sheet.get('attack.speed')); }
  get moveSpeed(): number { return this.sheet.get('move.speed') * (1 + this.sheet.get('move.speed.inc')); }
  get xpNeeded(): number { return xpToNext(this.profile.level); }

  /** Rebuild stats from scratch. Called after any equipment/level/buff change. */
  refreshStats(): void {
    const prevMax = this.sheet ? this.maxLife : 0;
    this.sheet = buildStats(this.profile, this.player?.buffs ?? []);
    if (this.player && prevMax > 0) this.player.life = Math.min(this.player.life, this.maxLife);
    this.dirty = false;
  }

  markDirty(): void { this.dirty = true; }

  /** Active (slotted & unlocked) skills, ordered by priority (high first). */
  activeSkills(): SkillDef[] {
    const cls = Data.cls(this.profile.classId);
    return cls.skills.map((id) => Data.skill(id)).filter((s) => isUnlocked(this.profile, s)).sort((a, b) => b.priority - a.priority);
  }

  paramsFor(skill: SkillDef): SkillDef['params'] {
    return skillParams(skill, Math.max(1, skillLevel(this.profile, this.sheet, skill)));
  }

  // ---------- Commands (called by UI) ----------
  equip(uid: string): boolean { const r = invEquip(this.profile, uid); if (r.ok) this.refreshStats(); return r.ok; }
  unequip(slot: Parameters<typeof invUnequip>[1]): boolean { const r = invUnequip(this.profile, slot); if (r.ok) this.refreshStats(); return r.ok; }
  sell(uid: string): number { return invSell(this.profile, uid); }
  sellAll(): number { return sellAllUnlocked(this.profile); }
  toggleLock(uid: string): void { toggleLock(this.profile, uid); }
  spendSkillPoint(skillId: string): boolean {
    const p = this.profile;
    const skill = Data.skill(skillId);
    const invested = p.skillInvest[skillId] ?? 0;
    if (p.skillPoints <= 0 || !isUnlocked(p, skill) || skill.basic || 1 + invested >= BALANCE.player.maxSkillLevel) return false;
    p.skillInvest[skillId] = invested + 1;
    p.skillPoints--;
    return true;
  }

  // ---------- Main tick ----------
  tick(dt: number): void {
    if (this.dirty) this.refreshStats();
    this.time += dt;
    this.profile.stats.playTime += dt;
    const pl = this.player;
    pl.hitFlash = Math.max(0, pl.hitFlash - dt);

    if (pl.state === 'dead') {
      pl.respawnT -= dt;
      if (pl.respawnT <= 0) this.respawn();
      this.updateEnemies(dt);
      this.cleanup(dt);
      this.saveRng();
      return;
    }

    this.updateBuffs(dt);
    this.updateResources(dt);
    this.updateSpawning(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.cleanup(dt);
    this.saveRng();
  }

  private saveRng(): void { this.profile.rng = this.rng.getState(); }

  private updateBuffs(dt: number): void {
    const pl = this.player;
    let changed = false;
    for (const b of pl.buffs) b.remaining -= dt;
    const before = pl.buffs.length;
    pl.buffs = pl.buffs.filter((b) => b.remaining > 0);
    if (pl.buffs.length !== before) changed = true;
    for (const k of Object.keys(pl.cooldowns)) pl.cooldowns[k] = Math.max(0, (pl.cooldowns[k] ?? 0) - dt);
    if (changed) this.refreshStats();
  }

  private updateResources(dt: number): void {
    const pl = this.player;
    const cls = Data.cls(this.profile.classId);
    pl.sinceCombat += dt;
    pl.life = Math.min(this.maxLife, pl.life + this.sheet.get('life.regen') * dt);
    let res = pl.resource + this.sheet.get('resource.regen') * dt;
    if (pl.sinceCombat > BALANCE.player.outOfCombatDelay) res -= cls.resource.decayOutOfCombat * dt;
    pl.resource = Math.max(0, Math.min(this.maxResource, res));
  }

  // ---------- Spawning & stages ----------
  private updateSpawning(dt: number): void {
    const p = this.profile;
    const zone = Data.zone(p.zone);
    if (this.bossAlive) return;
    if (p.stageKills >= zone.killsPerStage) {
      if (this.enemies.every((e) => e.dead)) this.spawnBoss();
      return;
    }
    this.spawnT -= dt;
    const alive = this.enemies.filter((e) => !e.dead).length;
    if (this.spawnT <= 0 && alive < zone.maxAlive) {
      this.spawnT = BALANCE.combat.spawnInterval;
      const [lo, hi] = zone.packSize;
      const n = Math.min(this.rng.int(lo, hi), zone.maxAlive - alive);
      const ang = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(BALANCE.combat.spawnMinDist, BALANCE.combat.spawnMaxDist);
      const cx = this.player.x + Math.cos(ang) * d, cy = this.player.y + Math.sin(ang) * d;
      for (let i = 0; i < n; i++) {
        const pick = this.rng.weighted(zone.enemies, (e) => e.weight);
        if (pick) this.spawnEnemy(Data.enemy(pick.id), cx + this.rng.range(-1, 1), cy + this.rng.range(-1, 1));
      }
    }
  }

  private spawnEnemy(def: EnemyDef, x: number, y: number): EnemyRt {
    const lvl = this.profile.stage;
    const s = BALANCE.enemyScaling;
    const n = lvl - 1;
    const life = Math.round(def.life * Math.pow(s.life, n));
    const e: EnemyRt = {
      id: this.nextId++, defId: def.id, archetype: def.archetype, level: lvl, x, y, facing: 'SW', radius: def.radius,
      life, maxLife: life, damage: def.damage * Math.pow(s.damage, n), armor: def.armor * Math.pow(s.armor, n),
      attackCd: this.rng.range(0.3, def.attackInterval), attackAnim: -1, bleed: null, dead: false, corpseT: 0, moving: false,
      hitFlash: 0, slamCd: def.slam ? def.slam.interval * 0.6 : 0, slamWindup: 0,
    };
    this.enemies.push(e);
    return e;
  }

  private spawnBoss(): void {
    const zone = Data.zone(this.profile.zone);
    const ang = this.rng.range(0, Math.PI * 2);
    const e = this.spawnEnemy(Data.enemy(zone.boss), this.player.x + Math.cos(ang) * 6, this.player.y + Math.sin(ang) * 6);
    this.bossAlive = true;
    this.events.push({ type: 'bossSpawn', id: e.id });
  }

  // ---------- Player AI ----------
  private findTarget(): EnemyRt | null {
    let best: EnemyRt | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(e.x, e.y, this.player.x, this.player.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private enemyById(id: number | null): EnemyRt | undefined {
    return id === null ? undefined : this.enemies.find((e) => e.id === id && !e.dead);
  }

  private enemiesNear(x: number, y: number, r: number): EnemyRt[] {
    return this.enemies.filter((e) => !e.dead && dist(e.x, e.y, x, y) <= r + e.radius);
  }

  private conditionsMet(skill: SkillDef, params: SkillDef['params'], target: EnemyRt): boolean {
    for (const c of skill.conditions) {
      if (c.type === 'enemiesInRadius' && this.enemiesNear(this.player.x, this.player.y, Math.max(params.radius, params.range)).length < c.value) return false;
      if (c.type === 'buffInactive' && this.player.buffs.some((b) => b.id === c.ref)) return false;
      if (c.type === 'targetHasNoStatus' && target.bleed) return false;
      if (c.type === 'targetLifeBelow' && target.life / target.maxLife >= c.value) return false;
    }
    return true;
  }

  private chooseSkill(target: EnemyRt): { skill: SkillDef; params: SkillDef['params'] } {
    const pl = this.player;
    const costMult = 1 - this.sheet.get('resource.costReduction');
    for (const s of this.activeSkills()) {
      const params = this.paramsFor(s);
      if ((pl.cooldowns[s.id] ?? 0) > 0) continue;
      if (pl.resource < params.cost * costMult) continue;
      if (!this.conditionsMet(s, params, target)) continue;
      return { skill: s, params };
    }
    const basic = Data.skill(Data.cls(this.profile.classId).basicAttack);
    return { skill: basic, params: this.paramsFor(basic) };
  }

  private updatePlayer(dt: number): void {
    const pl = this.player;
    pl.moving = false;

    if (pl.action) {
      this.updateAction(dt);
      return;
    }
    let target = this.enemyById(pl.targetId);
    if (!target) {
      target = this.findTarget() ?? undefined;
      pl.targetId = target ? target.id : null;
    }
    if (!target) { pl.state = 'searching'; return; }

    const { skill, params } = this.chooseSkill(target);
    const d = dist(pl.x, pl.y, target.x, target.y);
    const reach = params.range + target.radius + pl.radius * 0.5;
    if (d > reach) {
      pl.state = 'moving';
      pl.moving = true;
      const step = Math.min(d - reach * 0.9, this.moveSpeed * dt);
      const dx = (target.x - pl.x) / d, dy = (target.y - pl.y) / d;
      pl.x += dx * step; pl.y += dy * step;
      pl.facing = facingFromVector(dx, dy, pl.facing);
      return;
    }
    // Start action
    pl.state = 'attacking';
    pl.facing = facingFromVector(target.x - pl.x, target.y - pl.y, pl.facing);
    const duration = params.timeMult / Math.max(0.1, this.attackRate);
    pl.action = { skillId: skill.id, t: 0, duration, hitAt: duration * 0.45, hitDone: false, targetId: target.id };
    if (!skill.basic) {
      pl.cooldowns[skill.id] = params.cooldown * (1 - this.sheet.get('cdr'));
      pl.resource -= params.cost * (1 - this.sheet.get('resource.costReduction'));
    }
    this.events.push({ type: 'swing', skillId: skill.id, x: pl.x, y: pl.y, facing: pl.facing, radius: params.radius, tx: target.x, ty: target.y });
  }

  private updateAction(dt: number): void {
    const pl = this.player;
    const a = pl.action;
    if (!a) return;
    a.t += dt;
    if (!a.hitDone && a.t >= a.hitAt) {
      a.hitDone = true;
      this.executeSkill(Data.skill(a.skillId), a.targetId);
    }
    if (a.t >= a.duration) pl.action = null;
  }

  private targetInfo(e: EnemyRt): TargetInfo {
    const def = Data.enemy(e.defId);
    return { archetype: e.archetype, armor: e.armor, resist: def.resist, bleeding: !!e.bleed };
  }

  private executeSkill(skill: SkillDef, targetId: number): void {
    const pl = this.player;
    const params = this.paramsFor(skill);
    pl.sinceCombat = 0;

    if (skill.tags.includes('warcry')) {
      const dur = params.buffDuration * (1 + this.sheet.get('buff.duration'));
      pl.buffs = pl.buffs.filter((b) => b.id !== 'buff.warcry');
      const buff: Buff = {
        id: 'buff.warcry', remaining: dur, mods: [
          { stat: 'dmg.all', op: 'more', value: params.buffDamageMore },
          { stat: 'attack.speed', op: 'add', value: params.buffAttackSpeedInc },
        ],
      };
      pl.buffs.push(buff);
      this.refreshStats();
      return;
    }

    let targets: EnemyRt[];
    if (skill.tags.includes('aoe')) {
      targets = this.enemiesNear(pl.x, pl.y, params.radius * (1 + this.sheet.get('aoe.radius')));
    } else {
      const t = this.enemyById(targetId);
      targets = t && dist(t.x, t.y, pl.x, pl.y) <= params.range + t.radius + 0.6 ? [t] : [];
    }
    for (const e of targets) this.hitEnemy(e, skill, params);
  }

  private hitEnemy(e: EnemyRt, skill: SkillDef, params: SkillDef['params']): void {
    const pl = this.player;
    const info = this.targetInfo(e);
    const hit = computeHit(this.sheet, skill, params, info, this.rng);
    this.damageEnemy(e, hit.amount, hit.crit, 'physical');
    pl.resource = Math.min(this.maxResource, pl.resource + params.resourceOnHit);
    const leech = this.sheet.get('leech.life');
    if (leech > 0) pl.life = Math.min(this.maxLife, pl.life + hit.amount * leech);

    const bleedChance = params.bleedChance + this.sheet.get('bleed.chance');
    if (!e.dead && bleedChance > 0 && this.rng.chance(Math.min(1, bleedChance))) {
      const dps = bleedDps(this.sheet, skill, params, hit.base, info);
      const dur = bleedDuration(this.sheet, params);
      // Max 1 stack: keep stronger, refresh duration (SPEC 10.3, configurable later).
      if (!e.bleed || dps >= e.bleed.dps) e.bleed = { dps, remaining: dur, tick: e.bleed?.tick ?? BALANCE.combat.bleedTick };
      else e.bleed.remaining = Math.max(e.bleed.remaining, dur);
    }
  }

  private damageEnemy(e: EnemyRt, amount: number, crit: boolean, dtype: 'physical' | 'bleed'): void {
    if (e.dead) return;
    e.life -= amount;
    e.hitFlash = 0.12;
    this.events.push({ type: 'hit', targetId: e.id, x: e.x, y: e.y, amount, crit, dtype });
    if (e.life <= 0) this.killEnemy(e);
  }

  private killEnemy(e: EnemyRt): void {
    e.dead = true;
    e.life = 0;
    e.bleed = null;
    e.corpseT = BALANCE.combat.corpseTime;
    const p = this.profile;
    const def = Data.enemy(e.defId);
    const boss = e.archetype === 'boss';
    this.events.push({ type: 'death', id: e.id, x: e.x, y: e.y, boss });
    if (this.player.targetId === e.id) this.player.targetId = null;
    p.stats.kills++;
    const lifeOnKill = this.sheet.get('life.onKill');
    if (lifeOnKill > 0) this.player.life = Math.min(this.maxLife, this.player.life + lifeOnKill);

    const s = BALANCE.enemyScaling;
    const n = e.level - 1;
    this.gainXp(Math.round(def.xp * Math.pow(s.xp, n) * (1 + this.sheet.get('find.xp'))));
    const gold = Math.round(def.gold * Math.pow(s.gold, n) * (1 + this.sheet.get('find.gold')) * this.rng.range(1 - BALANCE.loot.goldSpread, 1 + BALANCE.loot.goldSpread));
    if (gold > 0) { p.gold += gold; this.events.push({ type: 'gold', amount: gold, x: e.x, y: e.y }); }

    const rarityBonus = def.rarityBonus + this.sheet.get('find.rarity');
    if (def.guaranteedDrops) {
      for (let i = 0; i < def.guaranteedDrops.count; i++) this.dropItem(e, rarityBonus, def.guaranteedDrops.minRarity);
    }
    if (this.rng.chance(def.dropChance * (1 + this.sheet.get('find.quantity')))) this.dropItem(e, rarityBonus);

    if (boss) {
      this.bossAlive = false;
      p.stats.bossKills++;
      p.stageKills = 0;
      p.maxStage = Math.max(p.maxStage, p.stage + 1);
      if (p.autoAdvance) {
        p.stage++;
        this.events.push({ type: 'stage', stage: p.stage });
      }
    } else if (!this.bossAlive) {
      p.stageKills = Math.min(Data.zone(p.zone).killsPerStage, p.stageKills + 1);
    }
  }

  private dropItem(e: EnemyRt, rarityBonus: number, minRarity?: Parameters<typeof generateItem>[1]['minRarity']): void {
    const p = this.profile;
    const item = generateItem(this.rng, { ilvl: e.level, classId: p.classId, uid: `i${p.nextUid++}`, rarityBonus, minRarity });
    p.stats.itemsFound++;
    const res = addLoot(p, item);
    this.events.push({ type: 'loot', item, kept: res.kept, x: e.x + this.rng.range(-0.4, 0.4), y: e.y + this.rng.range(-0.4, 0.4) });
  }

  gainXp(amount: number): void {
    const p = this.profile;
    if (p.level >= BALANCE.xp.maxLevel) return;
    p.xp += amount;
    while (p.xp >= xpToNext(p.level) && p.level < BALANCE.xp.maxLevel) {
      p.xp -= xpToNext(p.level);
      p.level++;
      p.skillPoints += BALANCE.player.skillPointsPerLevel;
      this.events.push({ type: 'levelUp', level: p.level });
      for (const id of Data.cls(p.classId).skills) {
        if (Data.skill(id).unlockLevel === p.level) this.events.push({ type: 'skillUnlocked', skillId: id });
      }
      this.refreshStats();
      this.player.life = this.maxLife;
    }
  }

  // ---------- Enemies ----------
  private updateEnemies(dt: number): void {
    const pl = this.player;
    const alive = this.enemies.filter((e) => !e.dead);
    for (const e of alive) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.attackAnim >= 0) { e.attackAnim += dt; if (e.attackAnim > 0.5) e.attackAnim = -1; }
      // Bleed ticks
      if (e.bleed) {
        e.bleed.remaining -= dt;
        e.bleed.tick -= dt;
        if (e.bleed.tick <= 0) {
          e.bleed.tick += BALANCE.combat.bleedTick;
          const amount = Math.max(1, Math.round(e.bleed.dps * BALANCE.combat.bleedTick));
          this.damageEnemy(e, amount, false, 'bleed');
          if (e.dead) continue;
        }
        if (e.bleed && e.bleed.remaining <= 0) e.bleed = null;
      }
      if (pl.state === 'dead') { e.moving = false; continue; }
      const def = Data.enemy(e.defId);
      const d = dist(e.x, e.y, pl.x, pl.y);
      e.moving = false;

      // Boss slam (telegraphed)
      if (def.slam) {
        if (e.slamWindup > 0) {
          e.slamWindup -= dt;
          if (e.slamWindup <= 0) {
            this.events.push({ type: 'slam', x: e.x, y: e.y, radius: def.slam.radius });
            if (dist(e.x, e.y, pl.x, pl.y) <= def.slam.radius + pl.radius) this.damagePlayer(e.damage * def.slam.damageMult, e);
            e.slamCd = def.slam.interval;
          }
          continue;
        }
        e.slamCd -= dt;
        if (e.slamCd <= 0 && d < def.slam.radius + 1) {
          e.slamWindup = def.slam.windup;
          this.events.push({ type: 'slamWarn', id: e.id, x: e.x, y: e.y, radius: def.slam.radius, windup: def.slam.windup });
          continue;
        }
      }

      const reach = def.attackRange + pl.radius + e.radius * 0.5;
      if (d > reach && d < BALANCE.combat.aggroRange * 3) {
        const step = Math.min(d - reach * 0.95, def.moveSpeed * dt);
        const dx = (pl.x - e.x) / d, dy = (pl.y - e.y) / d;
        e.x += dx * step; e.y += dy * step;
        e.facing = facingFromVector(dx, dy, e.facing);
        e.moving = true;
      } else if (d <= reach) {
        e.facing = facingFromVector(pl.x - e.x, pl.y - e.y, e.facing);
        e.attackCd -= dt;
        if (e.attackCd <= 0) {
          e.attackCd = def.attackInterval;
          e.attackAnim = 0;
          this.events.push({ type: 'enemyAttack', id: e.id });
          this.damagePlayer(e.damage, e);
        }
      }
    }
    // Simple separation so packs don't stack.
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i]!;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j]!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = a.radius + b.radius;
        if (d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  private damagePlayer(raw: number, from: EnemyRt): void {
    const pl = this.player;
    if (pl.state === 'dead') return;
    pl.sinceCombat = 0;
    const sh = this.sheet;
    const ev = sh.get('evasion');
    const evChance = Math.min(BALANCE.combat.evasionCap, ev / (ev + BALANCE.combat.evasionBase + BALANCE.combat.evasionPerLevel * from.level));
    if (ev > 0 && this.rng.chance(evChance)) { this.events.push({ type: 'evade', x: pl.x, y: pl.y }); return; }
    let dmg = raw;
    if (this.rng.chance(sh.get('block.chance'))) {
      dmg *= 1 - sh.get('block.power');
      this.events.push({ type: 'block', x: pl.x, y: pl.y });
    }
    dmg *= 1 - armorReduction(sh.get('armor'), dmg);
    dmg *= 1 - sh.get('dr.physical');
    const amount = Math.max(1, Math.round(dmg));
    pl.life -= amount;
    pl.hitFlash = 0.15;
    pl.resource = Math.min(this.maxResource, pl.resource + BALANCE.player.rageOnHitTaken);
    this.events.push({ type: 'playerHit', amount, x: pl.x, y: pl.y });
    if (pl.life <= 0) this.playerDeath();
  }

  private playerDeath(): void {
    const pl = this.player;
    const p = this.profile;
    pl.life = 0;
    pl.state = 'dead';
    pl.action = null;
    pl.respawnT = BALANCE.player.respawnTime;
    p.stats.deaths++;
    this.events.push({ type: 'playerDeath' });
  }

  private respawn(): void {
    const pl = this.player;
    const p = this.profile;
    p.stage = Math.max(1, p.stage - 1);
    p.stageKills = 0;
    this.enemies = [];
    this.bossAlive = false;
    pl.state = 'searching';
    pl.buffs = [];
    pl.cooldowns = {};
    pl.targetId = null;
    this.refreshStats();
    pl.life = this.maxLife;
    this.spawnT = 1;
    this.events.push({ type: 'respawn' }, { type: 'stage', stage: p.stage });
  }

  /** Player toggles: go to a stage directly (only up to maxStage). */
  setStage(stage: number): void {
    const p = this.profile;
    const s = Math.max(1, Math.min(p.maxStage, stage));
    if (s === p.stage) return;
    p.stage = s;
    p.stageKills = 0;
    this.enemies = [];
    this.bossAlive = false;
    this.player.targetId = null;
    this.player.action = null;
    this.events.push({ type: 'stage', stage: s });
  }

  private cleanup(dt: number): void {
    for (const e of this.enemies) if (e.dead) e.corpseT -= dt;
    this.enemies = this.enemies.filter((e) => !e.dead || e.corpseT > 0);
    // Drop far-away stragglers (player wandered off)
    this.enemies = this.enemies.filter((e) => e.archetype === 'boss' || dist(e.x, e.y, this.player.x, this.player.y) < 20);
  }

  drainEvents(): GameEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  /** Compare helper for UI: stats if `item` were equipped in its slot (without buffs). */
  statsWith(item: ItemInstance): StatSheet {
    return buildStats(this.profile, [], { slot: item.slot, item });
  }
}
