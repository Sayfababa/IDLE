/** Headless balancing run: `npm run sim -- [minutes] [seed]` (SPEC Teil 20). */
declare const process: { argv: string[] };
import { Game } from '../src/sim/game';
import { newProfile } from '../src/sim/profile';
import { rarityIndex } from '../src/sim/items';
import { BALANCE } from '../src/data/balance';

const minutes = Number(process.argv[2] ?? 60);
const seed = Number(process.argv[3] ?? 42);
const g = new Game(newProfile('warrior', seed));
const dt = 1 / BALANCE.sim.tickRate;
const score = (u: { rarity: Parameters<typeof rarityIndex>[0]; ilvl: number }) => rarityIndex(u.rarity) * 6 + u.ilvl;
let deaths = 0;
for (let t = 0, m = 0; t < minutes * 60; t += dt) {
  g.tick(dt);
  for (const e of g.drainEvents()) if (e.type === 'playerDeath') deaths++;
  // Naive auto-gear + skill points, like an attentive player would.
  if (Math.floor(t) % 10 === 0 && Math.floor(t) !== Math.floor(t - dt)) {
    for (const it of [...g.profile.inventory]) {
      const cur = g.profile.equipment[it.slot];
      if (!cur || score(it) > score(cur)) g.equip(it.uid);
    }
    g.sellAll();
    for (const s of g.activeSkills()) while (g.spendSkillPoint(s.id));
  }
  if (t >= m * 60 * 5) {
    const p = g.profile;
    console.log(`${String(m * 5).padStart(4)}min  lvl ${String(p.level).padStart(3)}  stage ${String(p.stage).padStart(3)} (max ${p.maxStage})  kills ${p.stats.kills}  deaths ${deaths}  gold ${p.gold}  life ${g.maxLife}`);
    m++;
  }
}
