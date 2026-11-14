# Entscheidungslog

Format: `D-<nr> (Datum) – Entscheidung. Grund.` Neue Einträge unten anhängen, nie löschen (bei Änderung: neuer Eintrag, der den alten ersetzt).

- D-01 (2026-11-14) – Browser-Spiel mit TypeScript, Vite, Vitest, Playwright. Grund: in der Cloud-Umgebung test- und sichtbar, überall spielbar.
- D-02 (2026-11-14) – Mobile-first iPhone-Hochformat 390×844; zusätzlicher Single-HTML-Build. Grund: Nutzer testet auf dem iPhone.
- D-03 (2026-11-14) – Meilenstein-Vorgehen M0–M8, Architektur von Anfang an für vollen Umfang. Grund: Umfang zu groß für einen Durchlauf.
- D-04 (2026-11-14) – Stat-Katalog + Affixe als Referenz darauf; Duplikate aus v1 zusammengelegt. Grund: eine Quelle der Wahrheit.
- D-05 (2026-11-14) – Keinerlei Kontrolleffekte (Stun, Freeze, Slow, Knockback), weder Spieler noch Gegner; zugehörige Affixe entfernt. Grund: Nutzerwunsch, schwer zu balancen.
- D-06 (2026-11-14) – Gegner verursachen nur Schaden, keine Debuffs. Grund: folgt aus D-05, vereinfacht Balancing.
- D-07 (2026-11-14) – Ressourcen: Assassin Energie, Hunter Fokus, Mage Mana, Warrior Wut.
- D-08 (2026-11-14) – Ausweichen passiv (Chance, max. 75 %); kein aktiver Dodge. Block, Barriere definiert.
- D-09 (2026-11-14) – Schadensarten Physical/Fire/Cold/Lightning/Arcane/Poison; Tags Attack/Spell + Elemente ergänzt.
- D-10 (2026-11-14) – Seltenheiten: Epic 5–6, Legendary 4–6 + fester Effekt, Mythic 6 + 2 Effekte; max. 3 Prefix / 3 Suffix.
- D-11 (2026-11-14) – Legendary = feste Unique-Items; Mythic = Legendary + Zusatzeffekt.
- D-12 (2026-11-14) – Tier-Werte per Formel pro Affix, Overrides möglich.
- D-13 (2026-11-14) – Gems: max. 4 Slots/Skill, Drops, Leveln mit Gold + Duplikaten. Automation → Kill-Trigger, Double Cast → Echo.
- D-14 (2026-11-14) – Hunter erhält Skill „Giftbolzen“.
- D-15 (2026-11-14) – „Chance auf Magic/Rare/…“-Affixe → ein Stat „Gegenstandsseltenheit“ (gedeckelt).
- D-16 (2026-11-14) – Idle: Offline berechnet (max. 12 h), Stufen mit Stufen-Boss, Tod = 1 Stufe zurück, Prestige später.
- D-17 (2026-11-14) – M1-Startklasse Warrior; M1-Grafik Canvas 2D mit einfachen Formen.
- D-18 (2026-11-14) – 4 Blickrichtungen (diagonal NO/NW/SO/SW) statt 8. Grund: Nutzerwunsch, weniger Asset-Aufwand.
- D-19 (2026-11-14) – Ein Charakter-Slot zunächst; Datenmodell mehrfähig. UI Deutsch via i18n.
- D-20 (2026-11-14) – Vite 6 / Vitest 3 / TS 5.9 (stabile, kompatible Versionen). E2E nutzt vorinstalliertes Playwright statt npm-Abhängigkeit.
- D-21 (2026-11-14) – Fester Simulations-Tick 30 Hz; Render per rAF; Catch-up max. 0,25 s (Offline-Rest folgt in M2).
- D-22 (2026-11-14) – Look: Diablo-artiges Dark Fantasy ohne Sprites: prozedurale Canvas-Figuren, Lichtmaske (Fackelradius), Nebel, Vignette; UI in Stein/Eisen/Altgold, Schriften Cinzel + EB Garamond, eigene SVG-Linien-Icons, keine Emojis/Glas/Neon.
- D-23 (2026-11-14) – Basisangriff Warrior = „Schwertschlag“; 4 Sockel = Hieb, Wirbelwind, Zerschmettern, Kriegsschrei (Freischaltung Lvl 1/3/5/8).
- D-24 (2026-11-14) – Welt-Zoom 1,3 für Handybildschirme.
- D-25 (2026-11-14) – Test-Build wird als privates Artifact veröffentlicht (Spielen per Link auf dem iPhone). Native confirm/prompt ersetzt durch In-Game-Dialoge.
