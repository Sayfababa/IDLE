import './ui/styles.css';
import { BALANCE } from './data/balance';
import { Renderer } from './render/renderer';
import { exportSave, importSave, loadProfile, SAVE_KEY, serializeProfile } from './save/save';
import { Game } from './sim/game';
import { newProfile } from './sim/profile';
import { App } from './ui/app';

const DT = 1 / BALANCE.sim.tickRate;
const MAX_CATCHUP = 0.25;

function readSave(): string | null {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}
function writeSave(s: string): void {
  try { localStorage.setItem(SAVE_KEY, s); } catch { /* storage unavailable: play without saving */ }
}

function boot(profileJson: string | null): void {
  const root = document.getElementById('app')!;
  const game = new Game(profileJson ? loadProfile(profileJson) : newProfile());
  const save = () => writeSave(serializeProfile(game.profile));
  const app = new App(root, game, {
    save,
    exportSave: () => exportSave(game.profile),
    importSave: (s) => {
      const p = importSave(s);
      if (!p) return false;
      writeSave(serializeProfile(p));
      location.reload();
      return true;
    },
    reset: () => { writeSave(serializeProfile(newProfile())); location.reload(); },
  });
  const renderer = new Renderer(app.canvas, game);
  window.addEventListener('resize', () => renderer.resize());

  let last = performance.now();
  let acc = 0;
  let saveT = 0;
  const frame = (now: number) => {
    const real = Math.min(MAX_CATCHUP, (now - last) / 1000);
    last = now;
    acc += real;
    while (acc >= DT) {
      game.tick(DT);
      acc -= DT;
    }
    const events = game.drainEvents();
    renderer.onEvents(events);
    app.onEvents(events);
    renderer.render(real);
    app.update(real);
    saveT += real;
    if (saveT >= BALANCE.save.autosaveInterval) { saveT = 0; save(); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else last = performance.now(); });
  window.addEventListener('pagehide', save);
  (window as unknown as { __game: Game }).__game = game;
}

boot(readSave());
