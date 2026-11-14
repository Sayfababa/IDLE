# ARCHITECTURE (Ist-Stand nach M1)

Soll: `SPEC.md` Teil 2. Grundregel: `core`/`data`/`sim`/`save` sind DOM-frei und headless testbar.

| Pfad | Verantwortung |
|---|---|
| `src/core/rng.ts` | Seedbarer RNG (sfc32), Zustand im Profil gespeichert → Determinismus |
| `src/core/geometry.ts` | 4 Iso-Blickrichtungen aus Vektor, Distanz |
| `src/data/types.ts` | Alle Daten-Typen (Stat, Affix, BaseItem, Skill, Class, Enemy, Zone) |
| `src/data/stats.ts` | Stat-Katalog (jeder Stat einmal, Caps) |
| `src/data/affixes.ts` | Affixe → Stat, Slots, Gruppe, Tier-Formel |
| `src/data/items.ts` | Basis-Items, Implicits, Waffenwerte |
| `src/data/skills.ts`, `classes.ts`, `enemies.ts` | Inhalte |
| `src/data/balance/index.ts` | **Alle** Balancing-Konstanten + XP-Kurve |
| `src/data/i18n/de.ts` | Alle UI-Texte, `t(key, v)` |
| `src/data/registry.ts` | `Data`-Lookups, `validateData()` |
| `src/sim/stats.ts` | `StatSheet` (add/inc/more), `buildStats()` immer komplett neu, Skill-Level & -Parameter |
| `src/sim/damage.ts` | Zentrale Trefferformel (SPEC 10), Blutung, DPS-Schätzung |
| `src/sim/items.ts` | Item-Generierung, Tiers nach iLvl, Prefix/Suffix-Limits, Verkaufswert |
| `src/sim/inventory.ts` | Ausrüsten/Ablegen/Verkaufen/Sperren, Loot-Filter, volles Inventar |
| `src/sim/game.ts` | `Game`: Tick-Schleife, Spawning, Ebenen, Spieler-KI, Gegner-KI, Loot, XP; Events → Render/UI |
| `src/sim/profile.ts` | Neues Profil, `SAVE_VERSION` |
| `src/save/save.ts` | Laden (Migration + Validierung), Speichern, Export/Import |
| `src/render/*` | Canvas-Renderer: Iso-Projektion, Boden-Chunks (Cache), Figuren (4 Richtungen), Fx-Pools, Licht/Nebel/Vignette |
| `src/ui/*` | DOM-UI: HUD, Tabs, Panels, Item-Bottom-Sheet, Theme-Farben, SVG-Icons, CSS |
| `src/main.ts` | Fester Sim-Tick (30 Hz), rAF-Render, Autosave |
| `scripts/sim.ts` | Headless-Balancing (`npm run sim -- 60 42`) |
| `tests/*` | Vitest: core, items, combat/sim, save |
| `e2e/smoke.mjs` | Playwright iPhone-Smoke + Screenshots (`e2e/screens/`, ignoriert) |

## Datenfluss
UI-Aktion → `Game`-Methode → Profil ändert sich → `refreshStats()`.
`Game.tick()` → `events[]` → `Renderer.onEvents()` (Effekte) + `App.onEvents()` (Toasts/Panels).
