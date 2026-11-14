import { BALANCE } from '../data/balance';
import { Data } from '../data/registry';
import { t } from '../data/i18n/de';
import { type RarityId, type SlotId } from '../data/types';
import { canEquip } from '../sim/inventory';
import { sellValue, maxTierForItemLevel } from '../sim/items';
import type { Game } from '../sim/game';
import type { GameEvent, ItemInstance } from '../sim/types';
import { compact } from '../render/fx';
import { escapeHtml, fmtValue, itemName, statLine, summarize, SUMMARY_ROWS } from './format';
import { ICON } from './icons';
import { RARITY_COLOR } from './theme';

type Tab = 'combat' | 'hero' | 'loot' | 'skills' | 'settings';

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

/**
 * DOM UI: HUD, tabs, panels. Reads game state; user actions go through Game command methods.
 */
export class App {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private tab: Tab = 'combat';
  private els: Record<string, HTMLElement> = {};
  private selected: { uid?: string; slot?: SlotId } | null = null;
  private toastQueue: string[] = [];
  private toastT = 0;
  private dirtyPanel = true;
  private lastHud: Record<string, string> = {};

  constructor(root: HTMLElement, private game: Game, private actions: { save: () => void; exportSave: () => string; importSave: (s: string) => boolean; reset: () => void }) {
    this.root = root;
    root.innerHTML = this.shell();
    this.canvas = $(root, '#view');
    for (const id of ['lvl', 'zone', 'stage', 'pips', 'gold', 'xp', 'boss', 'bossName', 'bossFill', 'death', 'deathT', 'toast', 'lifeFill', 'lifeVal', 'resFill', 'resVal', 'buffs', 'sockets', 'dock', 'panels', 'sheet', 'sheetBg', 'lootDot', 'skillDot']) {
      this.els[id] = $(root, `[data-el="${id}"]`);
    }
    this.buildSockets();
    root.addEventListener('click', (e) => this.onClick(e));
  }

  private shell(): string {
    const tabs: [Tab, string, string][] = [
      ['combat', ICON.combat!, t('ui.tab.combat')], ['hero', ICON.hero!, t('ui.tab.character')],
      ['loot', ICON.loot!, t('ui.tab.inventory')], ['skills', ICON.skills!, t('ui.tab.skills')], ['settings', ICON.settings!, t('ui.tab.settings')],
    ];
    return `
    <header class="topbar stone">
      <div class="lvl"><span data-el="lvl">1</span></div>
      <div class="where"><div class="zone" data-el="zone"></div><div class="stage" data-el="stage"></div><div class="pips" data-el="pips"></div></div>
      <div class="gold">${ICON.coin}<span data-el="gold">0</span></div>
    </header>
    <div class="xpbar"><div class="fill" data-el="xp"></div></div>
    <main class="stage-wrap">
      <canvas id="view"></canvas>
      <div class="bossbar" data-el="boss"><div class="name" data-el="bossName"></div><div class="bar"><div data-el="bossFill"></div></div></div>
      <div class="death" data-el="death"><div><h2>${t('ui.dead')}</h2><p data-el="deathT"></p></div></div>
      <div class="toast" data-el="toast"></div>
      <div data-el="panels"></div>
      <div class="sheet-bg" data-el="sheetBg" data-act="closeSheet"></div>
      <div class="sheet stone frame" data-el="sheet"></div>
    </main>
    <section class="dock stone" data-el="dock">
      <div class="orb life"><div class="glass"><div class="liquid" data-el="lifeFill"></div></div><div class="shine"></div><div class="ring"></div><div class="val" data-el="lifeVal"></div></div>
      <div class="center"><div class="buffs" data-el="buffs"></div><div class="sockets" data-el="sockets"></div></div>
      <div class="orb res"><div class="glass"><div class="liquid" data-el="resFill"></div></div><div class="shine"></div><div class="ring"></div><div class="val" data-el="resVal"></div></div>
    </section>
    <nav class="tabs">${tabs.map(([id, ic, label]) => `<button class="tab${id === 'combat' ? ' on' : ''}" data-tab="${id}">${ic}<span>${label}</span>${id === 'loot' ? '<i class="dot" data-el="lootDot"></i>' : id === 'skills' ? '<i class="dot" data-el="skillDot"></i>' : ''}</button>`).join('')}</nav>`;
  }

  private buildSockets(): void {
    const cls = Data.cls(this.game.profile.classId);
    this.els.sockets!.innerHTML = cls.skills.map((id) => `<div class="socket" data-skill="${id}">${ICON[id] ?? ''}<div class="cd"></div><div class="lv"></div></div>`).join('');
  }

  // ------------------------------------------------------------ events
  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'levelUp') this.toast(t('ui.levelUp', e.level));
      else if (e.type === 'skillUnlocked') this.toast(t('ui.newSkill', t(Data.skill(e.skillId).name)));
      else if (e.type === 'stage') this.toast(t('ui.stageUp', e.stage));
      else if (e.type === 'swing') {
        const s = this.els.sockets!.querySelector(`[data-skill="${e.skillId}"]`);
        if (s) { s.classList.remove('fired'); void (s as HTMLElement).offsetWidth; s.classList.add('fired'); }
      }
      if (e.type === 'loot' || e.type === 'levelUp' || e.type === 'gold') this.dirtyPanel = true;
      if (e.type === 'loot' && e.kept && e.item.rarity !== 'normal') this.els.lootDot!.classList.add('show');
    }
  }

  toast(text: string): void { this.toastQueue.push(text); }

  // ------------------------------------------------------------ per-frame HUD
  update(dt: number): void {
    const g = this.game, p = g.profile, pl = g.player;
    const zone = Data.zone(p.zone);
    this.set('lvl', String(p.level));
    this.set('zone', t(zone.name));
    this.set('stage', `${t('ui.stage')} ${p.stage}`);
    this.set('gold', compact(p.gold));
    this.els.xp!.style.width = `${Math.min(100, (p.xp / g.xpNeeded) * 100).toFixed(1)}%`;

    const kills = p.stageKills, need = zone.killsPerStage;
    const boss = g.enemies.find((e) => e.archetype === 'boss' && !e.dead);
    const pipsKey = `${kills}/${need}/${!!boss}`;
    if (this.lastHud.pips !== pipsKey) {
      this.lastHud.pips = pipsKey;
      const n = 10, on = Math.floor((kills / need) * n);
      this.els.pips!.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('') + `<i class="boss${boss ? ' on' : ''}"></i>`;
    }
    if (boss) {
      this.els.boss!.classList.add('show');
      this.set('bossName', t(Data.enemy(boss.defId).name));
      this.els.bossFill!.style.width = `${(boss.life / boss.maxLife) * 100}%`;
    } else this.els.boss!.classList.remove('show');

    const dead = pl.state === 'dead';
    this.els.death!.classList.toggle('show', dead);
    if (dead) this.set('deathT', t('ui.respawn', Math.max(0, Math.ceil(pl.respawnT))));

    this.els.lifeFill!.style.height = `${(pl.life / g.maxLife) * 100}%`;
    this.set('lifeVal', `${Math.ceil(pl.life)}`);
    this.els.resFill!.style.height = `${g.maxResource ? (pl.resource / g.maxResource) * 100 : 0}%`;
    this.set('resVal', `${Math.floor(pl.resource)}`);

    const buffKey = pl.buffs.map((b) => `${b.id}:${Math.ceil(b.remaining)}`).join('|');
    if (this.lastHud.buffs !== buffKey) {
      this.lastHud.buffs = buffKey;
      this.els.buffs!.innerHTML = pl.buffs.map((b) => `<span class="buff">${t(b.id === 'buff.warcry' ? 'skill.warrior.warcry' : b.id)} ${Math.ceil(b.remaining)}s</span>`).join('');
    }
    for (const el of Array.from(this.els.sockets!.children) as HTMLElement[]) {
      const id = el.dataset.skill!;
      const skill = Data.skill(id);
      const unlocked = p.level >= skill.unlockLevel;
      el.classList.toggle('locked', !unlocked);
      const cd = pl.cooldowns[id] ?? 0;
      const max = g.paramsFor(skill).cooldown || 1;
      (el.querySelector('.cd') as HTMLElement).style.setProperty('--p', unlocked ? `${Math.min(100, (cd / max) * 100)}%` : '100%');
      (el.querySelector('.lv') as HTMLElement).textContent = unlocked ? String(1 + (p.skillInvest[id] ?? 0)) : `${skill.unlockLevel}`;
    }
    this.els.skillDot!.classList.toggle('show', p.skillPoints > 0);

    // toasts
    this.toastT -= dt;
    if (this.toastT <= 0) {
      const next = this.toastQueue.shift();
      if (next) {
        this.els.toast!.textContent = next;
        this.els.toast!.classList.add('show');
        this.toastT = 1.8;
      } else this.els.toast!.classList.remove('show');
    }

    if (this.tab !== 'combat' && this.dirtyPanel) this.renderPanel();
  }

  private set(id: string, v: string): void {
    if (this.lastHud[id] === v) return;
    this.lastHud[id] = v;
    this.els[id]!.textContent = v;
  }

  // ------------------------------------------------------------ input
  private onClick(e: Event): void {
    const el = (e.target as HTMLElement).closest('[data-tab],[data-act]') as HTMLElement | null;
    if (!el) return;
    if (el.dataset.tab) { this.setTab(el.dataset.tab as Tab); return; }
    const act = el.dataset.act!;
    const g = this.game, p = g.profile;
    switch (act) {
      case 'item': this.selected = { uid: el.dataset.uid }; this.renderSheet(); break;
      case 'slot': if (p.equipment[el.dataset.slot as SlotId]) { this.selected = { slot: el.dataset.slot as SlotId }; this.renderSheet(); } break;
      case 'closeSheet': this.closeSheet(); break;
      case 'equip': if (this.selected?.uid) g.equip(this.selected.uid); this.closeSheet(); break;
      case 'unequip': if (this.selected?.slot) g.unequip(this.selected.slot); this.closeSheet(); break;
      case 'sell': if (this.selected?.uid) g.sell(this.selected.uid); this.closeSheet(); break;
      case 'lock': if (this.selected?.uid) g.toggleLock(this.selected.uid); this.renderSheet(); break;
      case 'sellAll': g.sellAll(); break;
      case 'filter': p.lootFilter = el.dataset.r as RarityId; break;
      case 'point': g.spendSkillPoint(el.dataset.skill!); break;
      case 'toggle': {
        const k = el.dataset.k!;
        if (k === 'autoAdvance') p.autoAdvance = !p.autoAdvance;
        else { const s = p.settings as unknown as Record<string, boolean>; s[k] = !s[k]; }
        break;
      }
      case 'stage': g.setStage(p.stage + Number(el.dataset.d)); break;
      case 'export': {
        const s = this.actions.exportSave();
        this.dialog(`<p class="dlg-t">${t('ui.export')}</p><textarea id="save-text" readonly rows="6">${s}</textarea><div class="actions" style="grid-template-columns:1fr"><button class="btn" data-act="closeSheet">OK</button></div>`);
        const ta = this.root.querySelector('#save-text') as HTMLTextAreaElement;
        try {
          navigator.clipboard.writeText(s).then(() => this.toast(t('ui.copied')), () => ta.select());
        } catch { ta.select(); }
        return;
      }
      case 'import':
        this.dialog(`<p class="dlg-t">${t('ui.import.prompt')}</p><textarea id="import-text" rows="6"></textarea><div class="actions" style="grid-template-columns:1fr 1fr"><button class="btn ghost" data-act="closeSheet">${t('ui.cancel')}</button><button class="btn" data-act="doImport">${t('ui.import')}</button></div>`);
        return;
      case 'doImport': {
        const v = (this.root.querySelector('#import-text') as HTMLTextAreaElement | null)?.value ?? '';
        if (!v.trim() || !this.actions.importSave(v)) this.toast(t('ui.import.fail'));
        this.closeSheet();
        return;
      }
      case 'reset':
        this.dialog(`<p class="dlg-t">${t('ui.reset.confirm')}</p><div class="actions" style="grid-template-columns:1fr 1fr"><button class="btn ghost" data-act="closeSheet">${t('ui.cancel')}</button><button class="btn danger" data-act="doReset">${t('ui.reset')}</button></div>`);
        return;
      case 'doReset': this.actions.reset(); return;
    }
    this.actions.save();
    this.dirtyPanel = true;
    if (this.tab !== 'combat') this.renderPanel();
  }

  private setTab(tab: Tab): void {
    this.tab = tab;
    for (const b of Array.from(this.root.querySelectorAll('.tab'))) b.classList.toggle('on', (b as HTMLElement).dataset.tab === tab);
    this.els.dock!.style.display = tab === 'combat' ? '' : 'none';
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    if (tab === 'loot') this.els.lootDot!.classList.remove('show');
    this.closeSheet();
    this.dirtyPanel = true;
    this.renderPanel();
  }

  // ------------------------------------------------------------ panels
  private renderPanel(): void {
    this.dirtyPanel = false;
    const host = this.els.panels!;
    if (this.tab === 'combat') { host.innerHTML = ''; return; }
    const scroll = host.firstElementChild?.scrollTop ?? 0;
    const body = this.tab === 'hero' ? this.heroPanel() : this.tab === 'loot' ? this.lootPanel() : this.tab === 'skills' ? this.skillsPanel() : this.settingsPanel();
    host.innerHTML = `<div class="panel stone show">${body}</div>`;
    host.firstElementChild!.scrollTop = scroll;
  }

  private heroPanel(): string {
    const g = this.game, p = g.profile;
    const s = summarize(g, g.sheet);
    const rows = SUMMARY_ROWS.map((r) => `<dt>${t(r.label)}</dt><dd class="${r.key === 'dps' ? 'big' : ''}">${r.fmt(s[r.key])}</dd>`).join('');
    const extra: [string, string][] = [
      [t('ui.critMulti'), `${Math.round(g.sheet.get('crit.multi') * 100)} %`],
      [t('ui.leech'), fmtValue('leech.life', g.sheet.get('leech.life'))],
      [t('ui.findGold'), fmtValue('find.gold', g.sheet.get('find.gold'))],
      [t('ui.findXp'), fmtValue('find.xp', g.sheet.get('find.xp'))],
      [t('ui.findRarity'), fmtValue('find.rarity', g.sheet.get('find.rarity'))],
      [t('ui.kills'), compact(p.stats.kills)],
      [t('ui.maxStage'), String(p.maxStage)],
    ];
    return `
      <div class="hero-head"><div class="cls">${t(Data.cls(p.classId).name)}</div><div class="sub">${t('ui.level')} ${p.level} · ${Math.floor(p.xp)} / ${g.xpNeeded}</div></div>
      <hr class="rule" />
      <dl class="stats">${rows}</dl>
      <hr class="rule" />
      <dl class="stats">${extra.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
  }

  private lootPanel(): string {
    const p = this.game.profile;
    const order: (SlotId | null)[] = ['weapon', 'helmet', 'amulet', 'gloves', 'chest', 'ring', null, 'boots', null];
    const doll = order.map((slot) => {
      if (!slot) return '<div></div>';
      const it = p.equipment[slot];
      return `<button class="slot${it ? ' filled' : ''}" data-act="slot" data-slot="${slot}" style="--rc:${it ? RARITY_COLOR[it.rarity] : 'transparent'}">${ICON[slot]}<span class="tag">${t(`slot.${slot}`)}</span></button>`;
    }).join('');
    const filters = (['normal', 'magic', 'rare'] as RarityId[]).map((r) =>
      `<button class="${p.lootFilter === r ? 'on' : ''}" data-act="filter" data-r="${r}" style="--rc:${RARITY_COLOR[r]}">${t(`rarity.${r}`)}</button>`).join('');
    const cells: string[] = [];
    for (let i = 0; i < BALANCE.loot.inventorySize; i++) {
      const it = p.inventory[i];
      if (!it) { cells.push('<div class="cell"></div>'); continue; }
      const up = this.isUpgrade(it);
      cells.push(`<button class="cell item" data-act="item" data-uid="${it.uid}" style="--rc:${RARITY_COLOR[it.rarity]}">${ICON[it.slot]}<span class="il">${it.ilvl}</span>${it.locked ? `<span class="lk">${ICON.lock}</span>` : ''}${up ? '<span class="up"></span>' : ''}</button>`);
    }
    return `
      <h3>${t('ui.equipped')}</h3>
      <div class="doll">${doll}</div>
      <h3>${t('ui.tab.inventory')} · ${p.inventory.length}/${BALANCE.loot.inventorySize}</h3>
      <div class="bag">${cells.join('')}</div>
      <div class="row"><span class="caps" style="font-size:11px;color:var(--muted)">${t('ui.filter')}</span><button class="btn ghost" data-act="sellAll">${t('ui.sellAll')}</button></div>
      <div class="seg">${filters}</div>
      <p class="hint">${t('ui.filter.desc')}</p>`;
  }

  private isUpgrade(it: ItemInstance): boolean {
    if (!canEquip(this.game.profile, it)) return false;
    const g = this.game;
    const cur = summarize(g, g.sheet);
    const nxt = summarize(g, g.statsWith(it));
    return nxt.dps > cur.dps * 1.01 || (nxt.dps >= cur.dps * 0.99 && nxt.life + (nxt.armor + nxt.evasion) * 0.3 > cur.life + (cur.armor + cur.evasion) * 0.3);
  }

  private skillsPanel(): string {
    const g = this.game, p = g.profile;
    const cls = Data.cls(p.classId);
    const ids = [cls.basicAttack, ...cls.skills];
    const cards = ids.map((id) => {
      const s = Data.skill(id);
      const unlocked = p.level >= s.unlockLevel;
      const lvl = 1 + (p.skillInvest[id] ?? 0);
      const pr = g.paramsFor(s);
      const kv: string[] = [];
      if (pr.weaponMult > 0) kv.push(`${Math.round(pr.weaponMult * 100)} % Waffenschaden`);
      if (pr.bleedPower > 0) kv.push(`Blutung ${Math.round(pr.bleedPower * 100)} %/s`);
      if (pr.buffDamageMore > 0) kv.push(`+${Math.round(pr.buffDamageMore * 100)} % Schaden, ${pr.buffDuration.toFixed(1)} s`);
      if (pr.cooldown > 0) kv.push(`${t('ui.cooldown')} ${pr.cooldown.toFixed(1)} s`);
      if (pr.cost > 0) kv.push(`${t('ui.cost')} ${pr.cost}`);
      const canAdd = unlocked && !s.basic && p.skillPoints > 0 && lvl < BALANCE.player.maxSkillLevel;
      return `<div class="skill stone frame${unlocked ? '' : ' locked'}">
        <div class="socket${unlocked ? '' : ' locked'}">${ICON[id] ?? ''}</div>
        <div><div class="nm">${t(s.name)}${unlocked && !s.basic ? `<small>Rang ${lvl}</small>` : ''}</div>
          <div class="ds">${unlocked ? t(`${id}.desc`) : t('ui.unlockAt', s.unlockLevel)}</div>
          ${unlocked ? `<div class="kv">${kv.join(' · ')}</div>` : ''}</div>
        ${s.basic ? '<div></div>' : `<button class="btn add" data-act="point" data-skill="${id}" ${canAdd ? '' : 'disabled'}>${ICON.plus}</button>`}
      </div>`;
    }).join('');
    return `<div class="points">${t('ui.skillPoints')}: ${p.skillPoints}</div>${cards}`;
  }

  private settingsPanel(): string {
    const p = this.game.profile;
    const tog = (k: string, on: boolean, label: string, desc = '') =>
      `<div class="opt"><div class="l">${label}${desc ? `<small>${desc}</small>` : ''}</div><button class="toggle${on ? ' on' : ''}" data-act="toggle" data-k="${k}" aria-pressed="${on}"></button></div>`;
    return `
      <h3>${t('ui.stage')}</h3>
      <div class="opt"><div class="l">${t(Data.zone(p.zone).name)}<small>${t('ui.maxStage')}: ${p.maxStage}</small></div>
        <div class="stepper"><button class="btn ghost" data-act="stage" data-d="-1">${ICON.minus}</button><span class="v">${p.stage}</span><button class="btn ghost" data-act="stage" data-d="1" ${p.stage >= p.maxStage ? 'disabled' : ''}>${ICON.plus}</button></div></div>
      ${tog('autoAdvance', p.autoAdvance, t('ui.autoAdvance'), t('ui.autoAdvance.desc'))}
      <h3 style="margin-top:18px">${t('ui.tab.settings')}</h3>
      ${tog('damageNumbers', p.settings.damageNumbers, t('ui.damageNumbers'))}
      ${tog('screenShake', p.settings.screenShake, t('ui.screenShake'))}
      ${tog('reducedParticles', p.settings.reducedParticles, t('ui.particles'))}
      <div style="display:grid;gap:8px;margin-top:18px">
        <button class="btn" data-act="export">${t('ui.export')}</button>
        <button class="btn ghost" data-act="import">${t('ui.import')}</button>
        <button class="btn danger" data-act="reset">${t('ui.reset')}</button>
      </div>`;
  }

  /** In-page dialog (native confirm/prompt are unavailable in sandboxed viewers). */
  private dialog(html: string): void {
    this.selected = null;
    this.els.sheet!.innerHTML = `<button class="close-x" data-act="closeSheet">${ICON.close}</button>${html}`;
    this.els.sheet!.classList.add('show');
    this.els.sheetBg!.classList.add('show');
  }

  // ------------------------------------------------------------ item sheet
  private closeSheet(): void {
    this.selected = null;
    this.els.sheet!.classList.remove('show');
    this.els.sheetBg!.classList.remove('show');
  }

  private renderSheet(): void {
    const p = this.game.profile;
    const sel = this.selected;
    const item = sel?.uid ? p.inventory.find((i) => i.uid === sel.uid) : sel?.slot ? p.equipment[sel.slot] : undefined;
    if (!item) { this.closeSheet(); return; }
    const equipped = !!sel?.slot;
    const base = Data.baseItem(item.base);
    const maxT = maxTierForItemLevel(item.ilvl);
    const lines: string[] = [];
    if (item.weapon) {
      lines.push(`<li class="impl"><span>${t('stat.weapon.damage', `${item.weapon.min}–${item.weapon.max}`)}</span></li>`);
      lines.push(`<li class="impl"><span>${t('stat.weapon.aps', item.weapon.aps.toFixed(2))}</span></li>`);
      lines.push(`<li class="impl"><span>${t('stat.weapon.crit', `${(item.weapon.crit * 100).toFixed(0)} %`)}</span></li>`);
    }
    for (const m of item.implicits) lines.push(`<li class="impl"><span>${escapeHtml(statLine(m.stat, m.value))}</span></li>`);
    const affixLines = item.affixes.map((a) => {
      const def = Data.affix(a.id);
      return `<li><span>${escapeHtml(statLine(def.stat, a.value))}</span><span class="t${a.tier >= Math.max(1, maxT - 1) ? ' hi' : ''}">${t('ui.tier', a.tier)}</span></li>`;
    });

    let cmp = '';
    if (!equipped && canEquip(p, item)) {
      const g = this.game;
      const cur = summarize(g, g.sheet);
      const nxt = summarize(g, g.statsWith(item));
      const rows = SUMMARY_ROWS.map((r) => {
        const d = nxt[r.key] - cur[r.key];
        if (Math.abs(d) < 1e-6 || (r.key !== 'crit' && r.key !== 'block' && r.key !== 'res' && Math.abs(d) < 0.05)) return '';
        const sign = d > 0 ? '+' : '−';
        return `<li><span>${t(r.label)}</span><span class="${d > 0 ? 'pos' : 'neg'}">${sign}${r.fmt(Math.abs(d))}</span></li>`;
      }).join('');
      if (rows) cmp = `<hr class="rule" /><div class="caps" style="font-size:10px;color:var(--muted);text-align:center">${t('ui.compare')}</div><ul class="cmp">${rows}</ul>`;
    }
    const actions = equipped
      ? `<button class="btn" data-act="unequip">${t('ui.unequip')}</button>`
      : `<button class="btn" data-act="equip" ${canEquip(p, item) ? '' : 'disabled'}>${t('ui.equip')}</button>
         <button class="btn ghost" data-act="lock">${item.locked ? t('ui.unlock') : t('ui.lock')}</button>
         <button class="btn danger" data-act="sell" ${item.locked ? 'disabled' : ''}>${t('ui.sell')}<small class="price">${sellValue(item)} ${t('ui.gold')}</small></button>`;
    this.els.sheet!.innerHTML = `
      <button class="close-x" data-act="closeSheet">${ICON.close}</button>
      <div class="tip" style="--rc:${RARITY_COLOR[item.rarity]}">
        <div class="name">${escapeHtml(itemName(item))}</div>
        <div class="type">${t(`rarity.${item.rarity}`)} · ${item.name ? t(base.name) : t(`slot.${item.slot}`)}</div>
        <div class="ilvl">${t('ui.itemLevel')} ${item.ilvl}</div>
        <hr class="rule" />
        <ul>${lines.join('')}</ul>
        ${affixLines.length ? `<hr class="rule" /><ul>${affixLines.join('')}</ul>` : ''}
        ${cmp}
      </div>
      <div class="actions"${equipped ? ' style="grid-template-columns:1fr"' : ''}>${actions}</div>`;
    this.els.sheet!.classList.add('show');
    this.els.sheetBg!.classList.add('show');
  }
}

