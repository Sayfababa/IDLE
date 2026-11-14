# STATUS

**Aktueller Meilenstein:** M1 abgeschlossen → nächster: M2
**Letzte Aktualisierung:** 2026-11-14

## Letzter Stand
- M0 + M1 fertig: spielbare Grundschleife mit Warrior im iPhone-Format.
- 24 Unit-/Simulationstests grün, E2E (iPhone 13) grün.
- Arbeitstitel des Spiels: **Aschenwacht** (Platzhalter, mit Nutzer klären).

## Nächster Schritt
Nutzer-Feedback zum Spielgefühl/Look einholen. Dann M2: voller Affix-Katalog (SPEC 7), Epic, Offline-Fortschritt, Gold-Ausgaben.

## Befehle
- `npm test` · `npm run typecheck` · `npm run build` (dist + dist-single)
- `npm run sim -- 60 42` (Minuten, Seed)
- `npm run build && PLAYWRIGHT_PATH=/opt/node-tools/node_modules/playwright npm run e2e`

## Meilensteine
| # | Status |
|---|---|
| M0 Setup | ✅ |
| M1 Grundschleife (Warrior) | ✅ |
| M2 Affix-Katalog, Epic, Offline | ⬜ |
| M3 Support-Gems | ⬜ |
| M4 Weitere Klassen | ⬜ |
| M5 Gegner, Elite, Bosse | ⬜ |
| M6 Legendary/Mythic | ⬜ |
| M7 Prestige, Balancing | ⬜ |
| M8 Grafik, Performance | ⬜ |

Legende: ⬜ offen · 🟨 in Arbeit · ✅ fertig (getestet)
