# CLAUDE.md – Projektgedächtnis (immer zuerst lesen)

Dark-Fantasy-Idle-ARPG, Browser, Mobile-first (iPhone-Hochformat 390×844).
Kommunikation mit dem Nutzer: **Deutsch**. Code, IDs, Kommentare: Englisch. UI-Texte: Deutsch über i18n-Datei.

## Sitzungsstart (Pflicht-Reihenfolge)
1. `docs/STATUS.md` lesen → aktueller Meilenstein, letzter Stand, nächster Schritt.
2. Bei Bedarf `docs/milestones/M<n>.md` (Plan des aktuellen Meilensteins).
3. `docs/SPEC.md` nur gezielt lesen (Teil-Nummer aus STATUS/Plan), nicht komplett.
4. `docs/DECISIONS.md` prüfen, bevor etwas gegen die Spezifikation entschieden wird.

## Sitzungsende / nach jedem Arbeitsschritt
- `docs/STATUS.md` aktualisieren (erledigt, nächster Schritt, Probleme).
- Neue Entscheidungen → `docs/DECISIONS.md` (nummeriert, mit Datum und Grund).
- Offenes/Ideen → `docs/BACKLOG.md`.
- Committen und auf den Arbeitsbranch pushen (Container ist flüchtig!).

## Dateien
| Datei | Zweck |
|---|---|
| `docs/SPEC.md` | Verbindliche Spezifikation v2.1 |
| `docs/STATUS.md` | Fortschritt je Meilenstein, aktueller Stand |
| `docs/DECISIONS.md` | Entscheidungslog (ADR-light) |
| `docs/BACKLOG.md` | Offene Aufgaben, bekannte Probleme, Ideen |
| `docs/ARCHITECTURE.md` | Tatsächlich gebaute Architektur (wird mit dem Code gepflegt) |
| `docs/milestones/` | Plan + Abschlussnotiz je Meilenstein |

## Harte Regeln (Kurzfassung der Spec)
- Simulation (`src/sim`, `src/core`) ist DOM-frei, deterministisch (seedbarer RNG), headless testbar.
- Render/UI lesen den Sim-Zustand, schreiben ihn nie.
- Alle Inhalte und Balancing-Werte in `src/data`; keine Magic Numbers in Logik.
- Jeder Stat genau einmal definiert; Affixe referenzieren Stats.
- Stabile IDs (`skill.warrior.cleave`, `stat.life.max`, `affix.life.max`).
- Stats bei Änderung immer komplett neu berechnen.
- **Keine Kontrolleffekte** (Stun/Freeze/Slow/Knockback) – nirgends.
- 4 Blickrichtungen (diagonal), nicht 8.
- Keine Platzhalter als fertig ausgeben; Fehlendes in BACKLOG.
- Meilenstein nur abschließen, wenn `npm test` grün und Spiel im iPhone-Viewport startet.

## Befehle (ab M0 gültig)
- `npm run dev` – Dev-Server
- `npm test` – Vitest
- `npm run e2e -- --trace off` – Playwright (iPhone)
- `npm run build` – Build inkl. Single-HTML

## Git
Arbeitsbranch: `claude/happy-gates-u4aurq`. Kein PR ohne ausdrückliche Bitte.
