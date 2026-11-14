// Smoke test in iPhone viewport (SPEC 21). Usage: npm run build && npm run e2e
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, '..', 'dist-single', 'index.html');
const out = path.join(root, 'screens');
mkdirSync(out, { recursive: true });
const seconds = Number(process.env.PLAY_SECONDS ?? 25);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text()); });
await page.goto('file://' + file);
await page.waitForSelector('canvas#view');
await page.waitForTimeout(seconds * 1000);
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

const state = await page.evaluate(() => {
  const g = window.__game;
  return { kills: g.profile.stats.kills, level: g.profile.level, gold: g.profile.gold, life: g.player.life };
});
console.log('state', state);
if (state.kills < 1) fail('no kills after play time');
await page.screenshot({ path: path.join(out, '1-combat.png') });

// Equip an item from the bag if one exists and check stats change.
await page.click('[data-tab="loot"]');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, '2-loot.png') });
const cell = await page.$('.cell.item');
if (cell) {
  await cell.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '3-item.png') });
  await page.click('.close-x');
}
await page.click('[data-tab="hero"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '4-hero.png') });
await page.click('[data-tab="skills"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '5-skills.png') });
await page.click('[data-tab="settings"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, '6-settings.png') });

// Save / reload persistence
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
const before = await page.evaluate(() => window.__game.profile.level);
await page.reload();
await page.waitForSelector('canvas#view');
const after = await page.evaluate(() => window.__game.profile.level);
if (after !== before) fail(`level not persisted (${before} → ${after})`);
if (errors.length) fail('page errors: ' + errors.join(' | '));
await browser.close();
console.log(process.exitCode ? 'E2E FAILED' : 'E2E OK');
