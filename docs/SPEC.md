# MASTER-PROJEKTSPEZIFIKATION v2.1
## Dark Fantasy Idle-ARPG – Programmierauftrag für KINDAS

> Verbindliche Spezifikation. Änderungen nur nach Absprache, dokumentiert in `docs/DECISIONS.md`.
> Version 2.1 (2026-11-14): v2 + 4 Blickrichtungen statt 8.

---

## TEIL 1 – PROJEKTDEFINITION

### 1.1 Ziel
Ein modulares Dark-Fantasy-**Idle**-ARPG mit automatischem Kampf, 4 Klassen, tag-basiertem Skill-System, Support-Gems, zufälliger Ausrüstung, Legendary- und Mythic-Effekten, Gegnerprogression, Bossen und langfristigem Fortschritt. Auch während der Spieler nicht spielt, geht es weiter (Offline-Fortschritt).

Die Spieltiefe orientiert sich an Diablo, Path of Exile, Last Epoch und Grim Dawn. Das Spiel bekommt aber eine eigene Identität mit eigenen Namen, Grafiken und Inhalten.

Es entsteht ein **tatsächlich spielbares Spiel**, keine Demo.

### 1.2 Verbindliche Designentscheidungen

| Bereich | Entscheidung |
|---|---|
| Genre | Idle-ARPG |
| Plattform | Browser, **Mobile-first (iPhone-Hochformat, 390×844)**, Desktop zentriert |
| Technik | TypeScript, Vite, Vitest, Playwright |
| Grafik | Pseudo-isometrisches 2.5D, zuerst Canvas 2D, später optional Three.js |
| Kamera | Feste isometrische Ansicht |
| Blickrichtungen | **4** (diagonal: NO, NW, SO, SW) für Spieler, Gegner, Minions |
| Kampf | Vollautomatisch |
| Kontrolleffekte | **Keine**: kein Stun, Freeze, Slow oder Knockback, weder für Spieler noch für Gegner |
| Klassen | 4, jede mit eigener Ressource |
| Waffen | Klassenspezifisch |
| Ausrüstung | 7 Slots |
| Skills | Tag-basiert, 4 aktive Skills plus Grundangriff |
| Skill-Modifikation | Support-Gems |
| Gegenstände | Zufällige Affixe, höchstens 3 Prefixe und 3 Suffixe |
| Seltenheiten | 6 Stufen |
| Affix-Tiers | T1 (schwächster) bis T8 (stärkster) |
| Idle | Offline-Fortschritt, automatischer Stufenaufstieg, Prestige (später) |
| Sprache | UI auf Deutsch, alle Texte in einer Übersetzungsdatei |
| Charaktere | Zunächst 1 Charakter, Datenmodell für mehrere ausgelegt |

### 1.3 Grundprinzipien
- **Simulation und Darstellung sind strikt getrennt.** Die gesamte Spiellogik läuft headless und ist testbar.
- **Deterministisch:** Alle Zufallswerte kommen aus einem seedbaren RNG. Gleicher Seed = gleiches Ergebnis.
- **Datengetrieben:** Alle Inhalte und Werte liegen in zentralen Datendateien.
- **Eine Quelle der Wahrheit:** Jeder Stat ist genau einmal definiert.
- **Stabile IDs** (`skill.warrior.cleave`) statt Namen als technische Schlüssel.
- Alle Werte sind balancierbar, nichts Wichtiges fest im Code.
- Neue Klassen, Skills, Affixe, Items und Gegner nur über Daten hinzufügbar.
- Jedes System wird getestet.
- Keine Platzhalter, die als fertig ausgegeben werden.

---

## TEIL 2 – TECHNISCHE ARCHITEKTUR

### 2.1 Plattform und Werkzeuge
- **TypeScript (strict)**, **Vite**, zusätzlich Build als **eine einzelne HTML-Datei** zum direkten Testen auf dem iPhone.
- **Vitest** für Logik, **Playwright** (iPhone-Emulation) für Smoke-Tests und Screenshots.
- Hochformat 390×844, Touch, Safe Areas. Desktop: zentriert in Handygröße.
- Renderer-Adapter: Canvas 2D (M1) später durch Three.js ersetzbar, ohne Logikänderung.

### 2.2 Schichten
```
/src
  /core      RNG, Event-Bus, Game-Loop (fester Sim-Tick), Zeit/Offline
  /data      Alle Inhalte als typisierte Daten (Klassen, Skills, Gems, Stats, Affixe,
             Basis-Items, Gegner, Gebiete, Balancing, Texte)
  /sim       Reine Spiellogik ohne DOM: Stats, Schaden, Status (DoTs/Buffs/Debuffs),
             Kampf, Zielauswahl, Bewegung, Skills, Gems, Items, Loot, Progression, Idle
  /render    Canvas-Renderer, Kamera, Tiefensortierung, Effekte, Schadenszahlen, Pools
  /ui        HUD, Menüs (DOM/CSS), Touch
  /save      Versionierter Speicherstand, Migrationen, Validierung
/tests       Unit- und Simulationstests
/e2e         Playwright-Smoke-Tests
/docs        Gedächtnis und Dokumentation
```
Die Darstellung liest Simulationszustand und Events, schreibt aber **nie** in die Simulation.

### 2.3 Logische Module
GameLoop, SaveSystem, DataRegistry, StatSystem, ClassSystem, SkillSystem (inkl. Tags), SupportGemSystem, EquipmentSystem, AffixSystem, ItemGenerator, RaritySystem, LegendaryEffectSystem, DamageSystem, StatusEffectSystem (nur DoTs/Buffs/Debuffs), CombatSystem, TargetingSystem, MovementSystem, EnemySystem, BossSystem, LootSystem, LootFilter, InventorySystem, ProgressionSystem, IdleSystem, EconomySystem, StatisticsSystem, Renderer, Camera, EffectRenderer, DamageNumbers, UI.

### 2.4 Datenmodelle (Auszug)
- **Stat:** `id`, Name, Kategorie, Wertart (flach/Prozent/Chance), Stapelart (`flat` | `increased` | `more` | `max`), Obergrenze
- **Affix:** `id`, `statId`, Prefix/Suffix, erlaubte Slots, Tag-/Klassenbeschränkung, Mindest-iLvl, Gewicht, Gruppe (max. 1 pro Gruppe je Item), Tier-Formel (Basis, Wachstum, Streuung), optionale Tier-Overrides, Seltenheitsbeschränkung
- **Skill:** `id`, Klasse, Tags, Schadensart(en), Basisschaden, Waffenanteil, Geschwindigkeit, Cooldown, Kosten, Reichweite, Radius, Dauer, Krit-Chance, Projektilanzahl, Support-Slots, Skalierungsregeln pro Level, Priorität, Bedingungen, Visual-ID
- **Item:** `uid`, Basis-ID, Slot, iLvl, Seltenheit, Basiswerte, Affixe (ID, Tier, Wert), Legendary-ID, Verkaufswert, Quelle

---

## TEIL 3 – KLASSEN

| Klasse | Waffe | Ressource | Verhalten |
|---|---|---|---|
| Assassin | Dolche | **Energie** | Hoher Pool, schnelle Regeneration |
| Hunter | Armbrust | **Fokus** | Regeneriert, Treffer geben Fokus |
| Mage | Magierstab | **Mana** | Großer Pool, langsame Regeneration |
| Warrior | Schwert | **Wut** | Start 0, steigt bei Treffern (gegeben/erhalten), sinkt außerhalb des Kampfes |

Fehlt Ressource → Skill wird nicht ausgelöst, Grundangriff läuft weiter.
Grund-Tags zusätzlich: `Attack`, `Spell`, `Physical`, `Fire`, `Cold`, `Lightning`, `Arcane`.

### 3.1 Assassin
| Skill | Tags |
|---|---|
| Doppelschlag | Attack, Melee |
| Klingenwirbel | Attack, Melee, AoE |
| Giftklinge | Attack, Melee, Poison |
| Giftwurf | Attack, Projectile, Poison |
| Klingensalve | Attack, Projectile |
| Explosivfalle | Trap, AoE, Fire |
| Giftfalle | Trap, Poison, AoE |
| Schattenstich | Attack, Melee |
| Blutiger Wurf | Attack, Projectile, Bleed |
| Todesregen | Attack, Projectile, AoE |

### 3.2 Hunter
| Skill | Tags |
|---|---|
| Präzisionsschuss | Attack, Projectile |
| Mehrfachschuss | Attack, Projectile |
| Durchschlagender Bolzen | Attack, Projectile |
| Blutbolzen | Attack, Projectile, Bleed |
| Explosivbolzen | Attack, Projectile, AoE, Fire |
| Giftbolzen | Attack, Projectile, Poison |
| Balliste | Totem, Projectile |
| Giftgeschütz | Totem, Projectile, Poison |
| Wolf beschwören | Minion, Melee |
| Bärenbegleiter | Minion, Melee |
| Jagdruf | Warcry, Minion, Totem |
| Pfeilhagel | Attack, Projectile, AoE |

### 3.3 Mage
| Skill | Tags |
|---|---|
| Feuerball | Spell, Projectile, AoE, Fire |
| Eislanze | Spell, Projectile, Cold |
| Blitzkette | Spell, Projectile, Lightning (springt) |
| Arkaner Strahl | Spell, Ranged, Arcane |
| Meteor | Spell, AoE, Fire |
| Frostnova | Spell, AoE, Cold (reiner Schaden, kein Einfrieren) |
| Fluch der Schwäche | Spell, Curse |
| Fluch der Verwundbarkeit | Spell, Curse |
| Skelett beschwören | Spell, Minion, Melee |
| Arkaner Wächter | Spell, Minion, Ranged, Arcane |
| Magische Explosion | Spell, AoE, Arcane |

### 3.4 Warrior
| Skill | Tags |
|---|---|
| Schwertschlag | Attack, Melee |
| Doppelschlag | Attack, Melee (eigene ID) |
| Wirbelwind | Attack, Melee, AoE |
| Hieb | Attack, Melee, Bleed |
| Hinrichten | Attack, Melee |
| Erdbeben | Attack, Melee, AoE |
| Blutrausch | Attack, Melee, Bleed |
| Kriegsschrei | Warcry |
| Einschüchternder Ruf | Warcry (Gegner nehmen mehr Schaden, kein Furchteffekt) |
| Klingensturm | Attack, Melee, AoE |
| Zerschmettern | Attack, Melee |

`Ranged` = Fernwirkung **ohne** Projektil (Strahlen, Fernkampf-Minions).

---

## TEIL 4 – SKILLS
- **Tags:** Melee, Projectile, Poison, Bleed, AoE, Trap, Totem, Minion, Curse, Ranged, Warcry, Attack, Spell, Physical, Fire, Cold, Lightning, Arcane.
- **Loadout:** 4 aktive Slots + automatischer Grundangriff.
- **Freischaltung** über Charakterlevel (Datentabelle). **Skill-Punkte:** 1 pro Level. Affixe geben +Skill-Level obendrauf.
- **Eigene Skalierungsregeln** pro Skill, nie automatisch alle Werte.
- **Auto-Nutzung:** Priorität, Cooldown, Kosten, Min-/Max-Reichweite, Zieltyp, Bedingungen (z. B. „≥3 Gegner im Radius“, „Ziel ohne Fluch“, „Buff nicht aktiv“). Spieler kann Priorität und einfache Bedingungen pro Slot setzen.

---

## TEIL 5 – SUPPORT-GEMS

### 5.1 Regeln
- 1 Slot zum Start, +1 bei Skill-Level 5 und 10, +1 durch Ausrüstung → **max. 4**.
- Nur kompatible Gems (Tag-Prüfung), jedes Gem max. einmal pro Skill.
- Gems **droppen**, Leveln mit Gold + Duplikaten.
- Gem-Boni standardmäßig `more` mit zentraler Obergrenze.
- Entfernen setzt alles exakt zurück. Visuelle Änderungen sichtbar.

### 5.2 Schaden
Brutality (Melee), Multiple Projectiles (Projectile), Pierce (Projectile), Poison Empowerment (Poison), Bleed Sharpness (Bleed), AoE Expansion (AoE), Rapid Fire (Projectile, Melee), Arcane Power (Spell, Ranged), Minion Rage (Minion), Turret Master (Totem), Trap Master (Trap), Critical Precision (Melee, Projectile, Ranged)

### 5.3 Mechanik
Chain Reaction (Projectile, AoE), Explosion (Poison, Bleed, AoE), Spread (Poison, Bleed), **Echo** (wiederholt Skill einmal verzögert mit reduziertem Schaden; Melee, Projectile, Spell), Duration (Poison, Bleed, Curse), Quick Charge (Totem, Trap), Extra Minion (Minion), Enhanced Cry (Warcry), Weaken (Curse)

### 5.4 Utility
Efficiency (alle), Concentration (AoE: kleiner Radius, mehr Schaden), Range (Projectile, Ranged), Life Leech (Melee, Projectile), **Kill-Trigger** (löst zusätzlich bei Kill aus, interner Cooldown; alle), Empowerment (alle: +1 Skill-Level)

---

## TEIL 6 – AUSRÜSTUNG

### 6.1 Slots
Weapon (W), Ring (R), Amulet (A), Helmet (H), Chest (C), Boots (B), Gloves (G). Waffen klassengebunden.

### 6.2 Basis-Items
- **W:** Dolch, Armbrust, Magierstab, Schwert (je mehrere Stufen nach iLvl)
- **R:** Einfacher Ring, Edelsteinring, Verstärkungsring
- **A:** Knochenamulett, Magisches Amulett, Runenamulett
- **H:** Lederkapuze, Eisenhelm, Magierkapuze
- **C:** Lederrüstung, Kettenrüstung, Plattenrüstung, Magierrobe
- **B:** Lederstiefel, Reisestiefel, Kampfstiefel
- **G:** Lederhandschuhe, Kampfpanzerhandschuhe, Magische Handschuhe

### 6.3 Defensiv-Mechaniken
- **Rüstung:** `DR = Rüstung / (Rüstung + K × Schaden)` (nur physische Treffer).
- **Ausweichwertung** → Ausweichchance (max. 75 %), passiv. Erfolg = Event für „nach Ausweichen“-Affixe.
- **Blockchance** (max. 75 %), **Blockstärke** (Anteil abgewehrt).
- **Barriere:** Puffer vor Leben, zerfällt.
- **Resistenzen:** Feuer, Kälte, Blitz, Arkan, Gift, je max. 75 %.

---

## TEIL 7 – STAT- UND AFFIX-KATALOG
Jeder Stat existiert **einmal**; Affixe verweisen auf Stats. Legende: W R A H C B G, **P** = Prefix, **S** = Suffix.

### 7.1 Offensiv
| Stat | Slots | P/S |
|---|---|---|
| Flacher Waffenschaden | W | P |
| Erhöhter physischer Schaden | W R A G | P |
| Erhöhter Elementarschaden | W R A G | P |
| Erhöhter Feuer-/Kälte-/Blitzschaden (je eins) | W R A | P |
| Erhöhter Arkanschaden | W R A G | P |
| Erhöhter Nahkampf-/Projektil-/AoE-Schaden (je eins) | W R G | P |
| Erhöhter Fernkampfschaden (Ranged) | W G | P |
| Erhöhter Gift-/Blutungsschaden (je eins) | W R A G | P |
| Erhöhter Schaden über Zeit | W R A G | P |
| Erhöhter Minion-/Totemschaden (je eins) | W R A G | P |
| Erhöhter Fallenschaden | W R G | P |
| Fluchstärke | W A G | P |
| Angriffsgeschwindigkeit | W R B G | S |
| Zaubergeschwindigkeit | W R B G | S |
| Krit-Chance | W R A G | S |
| Krit-Schaden | W R A G | S |
| Schaden gegen Bosse | W R A | S |
| Schaden gegen Elite | W R | S |
| Schaden gegen normale Gegner | W | S |
| Projektilgeschwindigkeit | W G | S |
| Projektilreichweite | W | S |
| Zusätzliche Projektile | W R A G | P (selten) |
| Durchschlag | W G | S |
| Chance auf Doppelangriff | W G | S |
| Chance auf zusätzlichen Angriff | W G | S |
| Schaden gegen vergiftete / blutende Gegner | W | S |
| Schaden gegen verfluchte Gegner | W G | S |
| Schaden gegen Gegner mit Debuffs | R | S |
| Krit-Chance gegen vergiftete / blutende | G | S |
| Giftchance / Blutungschance | R G | S |
| Gift-/Blutungs-/Fluchdauer | R | S |
| Dauer eigener Debuffs | A | S |
| Minion-/Totem-Angriffsgeschwindigkeit | G | S |
| Fallen-Auslösegeschwindigkeit | G | S |
| Schaden nach Kill | G | S |
| Schaden während aktivem Buff | H | S |
| Schaden bei vollem / niedrigem Leben | R A | S |

### 7.2 Skill- und Gem-Stats
| Stat | Slots | P/S |
|---|---|---|
| +Alle Skill-Level | W A (H G selten) | P |
| +Klassen-Skill-Level (je Klasse) | A | P |
| +Tag-Skill-Level (Melee, Projectile, Poison, Bleed, AoE, Totem, Minion, Curse, Warcry, Trap) | W A | P |
| Support-Gem-Effektivität | A G | S |
| +1 Support-Slot | A | P (ab Epic) |
| Cooldown-Reduktion (max. 40 % gesamt) | R A H B | S |
| Ressourcen-Regeneration | A H B | S |
| Ressourcen-Kostenreduktion | A G | S |
| Maximale Ressource | R H C | P |
| Buff-Dauer | A H B | S |

### 7.3 Defensiv
| Stat | Slots | P/S |
|---|---|---|
| Maximales Leben | R H C B | P |
| Lebensregeneration | R A H C B | S |
| Lebensraub / Ressourcenraub | W R G | S |
| Erhaltene Heilung | H C | S |
| Leben pro Kill | C | S |
| Rüstung | H C B G | P |
| Ausweichwertung | H C B | P |
| Blockchance | H C B | S |
| Blockstärke | H C | S |
| Physische Schadensreduktion | H C B | P |
| Feuer-/Kälte-/Blitz-/Arkan-/Giftresistenz (je eins) | H C B | S |
| Alle Resistenzen | H C B | S |
| Schutz gegen kritische Treffer | A H C | S |
| Schadensreduktion bei vollem / niedrigem Leben | H C | S |
| Rüstung bei vollem / niedrigem Leben | H | S |
| Rüstung im Stillstand | C | S |
| Rüstung nach Treffer / nach Bewegung | C / B | S |
| Rüstung pro Gegner in der Nähe | C | S |
| Ausweichchance nach Treffer / nach Bewegung | C / B | S |
| Barriere bei Treffer (Chance) | H C | S |
| Schadensreflexion (Chance) | C | S |
| Schutz gegen Bosse / Elite / normale Gegner | C | S |

### 7.4 Minions und Totems
| Stat | Slots | P/S |
|---|---|---|
| Minion-Leben | R H C | P |
| Totem-Leben | H C | P |
| Minion-Resistenzen | H | S |
| Minion-Schadensreduktion | C | S |
| Minion-Heilung | C | S |
| Minion-Bewegungsgeschwindigkeit | B | S |

### 7.5 Bewegung
| Stat | Slots | P/S |
|---|---|---|
| Bewegungsgeschwindigkeit | B | P |
| Bewegungsgeschw. nach Kill / nach Boss-Kill / bei vollem / bei niedrigem Leben / während Buff | B | S |
| Schaden während / nach Bewegung | B | S |
| Schaden nach Ausweichen | B | S |
| Leben pro zurückgelegter Strecke | B | S |

### 7.6 Fund und Utility (nur R, A, B; Obergrenze +100 % pro Kategorie)
| Stat | Slots | P/S |
|---|---|---|
| Goldfund | R B | S |
| Erfahrungsgewinn | R B | S |
| Gegenstandsmenge | R A | S |
| Gegenstandsseltenheit | R A | S |
| Zusätzliche Boss-Beute | A | S |

**Entfernt gegenüber v1:** Kontrolleffekt-Immunität, Verlangsamungs-Immunität, Kontrollverlust-Dauer, Statusresistenz, Fluchresistenz, Debuff-Reduktion, Ausweichdistanz, Ausweich-Cooldown.

### 7.7 Kompatibilität
- Nur erlaubte Slots, passende Klasse/Tags.
- Max. 1 Affix pro Gruppe je Item, max. 3 P + 3 S.
- Automatischer Test validiert den gesamten Katalog.

---

## TEIL 8 – TIERS, ITEM-LEVEL, SELTENHEIT
- **Tiers:** T1 schwach … T8 stark. Werte pro Affix per Formel (Basis, Wachstum, Streuung), Overrides möglich.
- **Item-Level** begrenzt max. Tier (Start: T1–2 ab iLvl 1, T3–5 ab 20, T6–7 ab 50, T8 ab 80). Höhere Tiers geringeres Gewicht.

| Seltenheit | Affixe | Besonderes | Farbe |
|---|---|---|---|
| Normal | 0 | – | Grau |
| Magic | 1–2 | – | Blau |
| Rare | 3–4 | – | Gelb |
| Epic | 5–6 | Mindest-Tier angehoben | Violett |
| Legendary | 4–6 | 1 fester Legendary-Effekt | Orange |
| Mythic | 6 | Legendary-Effekt + Mythic-Effekt | Rot |

- **Drop-Chancen** abhängig von Gegnerlevel, Gegnerart, Gebiet/Stufe, Gegenstandsseltenheit (gedeckelt). Zentral konfiguriert.

---

## TEIL 9 – LEGENDARY- UND MYTHIC-EFFEKTE
- **Legendary** = benannte Unique-Items, feste Basis, fester Effekt (Wert in Spanne gewürfelt).
- **Mythic** = Legendary + zusätzlicher starker Effekt derselben Build-Familie.
- Effekte als wiederverwendbare Mechaniken über Hooks (`onHit`, `onCrit`, `onKill`, `onDotTick`, `onEnemyDeath`, `onCast`, `onEvade` …).

**Gift:** springt über · kann kritten · Explosion beim Tod · Zusatzschaden pro Tick · mehr Stapel · erhöht erlittenen Schaden · Verbreitung über Projektile
**Blutung:** springt über · zusätzliche Ticks · Explosion beim Tod · mehr Schaden bei Bewegung des Ziels · Krits verstärken · Übertragung auf mehrere
**Projektile:** zusätzliche · durchdringen · kehren zurück · teilen sich · explodieren · Bonus gegen markierte
**Totems:** zusätzliche · schneller · mehr Leben · Flächenschaden · erben X % Spielerboni · Explosion beim Tod
**Minions:** zusätzliche · erben X % Spielerschaden · erben X % Krit-Chance · Angriffsgeschwindigkeit · Explosion beim Tod · heilen Spieler · verursachen Gift/Blutung
**Flüche:** zusätzliche Ziele · Schaden beim Ablauf · Verlängerung bei Kill · Zusatzschaden · Übertragung
**Fallen:** doppelte Explosion · Projektile · Kettenauslösung · Gift · Blutung
**Nahkampf:** jeder 5. Angriff doppelt · Krit → Zusatzangriff · Schockwellen · Kill verkürzt Cooldowns · Treffer heilen
**Kriegsschrei:** verstärkt Minions · Angriffsgeschw. · Schaden · verlängert Buffs · verkürzt Cooldowns
**Global:** AoE-Radius · keine Kosten/längere Cooldowns · Boss-Schaden · Elite-Beute · Schaden pro Kill (gedeckelt) · Schaden bei vollem Leben · Defensive bei niedrigem Leben

**Sicherungen:** max. Ketten-/Explosionstiefe (Start 3), interne Cooldowns, max. DoT-Stapel, max. aktive Projektile/Minions/Totems, keine Selbst-Rekursion.

---

## TEIL 10 – SCHADENSBERECHNUNG
**Schadensarten:** Physical, Fire, Cold, Lightning, Arcane, Poison. Elementar = Fire+Cold+Lightning.

**Reihenfolge:**
1. Basis = Skill-Basis + Waffenschaden × Waffenanteil + flache Boni
2. × (1 + Σ increased) – inkl. „gegen Boss/Elite/…“
3. × Π (1 + more) – Gems, Legendaries
4. Krit (Chance max. 100 %) × Krit-Multiplikator
5. Ziel: Resistenz (max. 75 %), Rüstung (nur physisch), Schadensreduktion, Schadensaufnahme-Mods (Flüche)
6. Runden, min. 1

- **Gift/Blutung:** Tick-Schaden, Intervall, Dauer, max. Stapel, Erneuerungsregel (Gift stapelt; Blutung erneuert, stärkster Wert bleibt – konfigurierbar). Blutung ignoriert Rüstung, Gift gegen Giftresistenz.
- **Minions/Totems:** eigenes Leben, Schaden, Tempo, Reichweite, Resistenzen, Dauer/permanent, Zielauswahl; Skalierung über Minion-/Totem-Stats und Skill-Level.
- **Stats** werden bei jeder Änderung komplett neu berechnet, nie inkrementell.

---

## TEIL 11 – AUTOMATISCHER KAMPF
- **Ablauf:** erkennen → Ziel → Reichweite → bewegen → Skill nach Priorität oder Grundangriff → Cooldowns/Ressourcen → Kill → Loot (auto) → nächstes Ziel.
- **Zustände:** Idle, Searching, Moving, Attacking, Casting, Dead, Respawning.
- **Zielauswahl** (einstellbar, erweiterbar): nächster, niedrigstes Leben, Elite zuerst, Boss zuerst, mit/ohne Status.
- **Minions/Totems** greifen selbstständig an, Begleiter folgen.
- **Tod:** Respawn nach 3 s, 1 Stufe zurück, keine Item-Strafe.
- **Gegner:** nur Schaden, keine Kontrolleffekte, keine Debuffs.

---

## TEIL 12 – IDLE-MECHANIKEN
- **Stufen:** X Kills → Stufen-Boss → nächste Stufe. Optionen „Automatisch weiter“ / „Hier farmen“.
- **Offline:** berechnet aus gemessenen Kills/XP/Gold pro Minute; max. 12 h (konfigurierbar); Loot als Zusammenfassung durch den Filter; Bericht-Fenster.
- **Hintergrund-Tab** = Offline-Zeit.
- **Geschwindigkeit** 1×/2×.
- **Prestige** später, eigener Meilenstein.

---

## TEIL 13 – GEGNER UND BOSSE
- Typen: normal, schnell, groß, Fernkampf, Elite, Boss.
- Daten: ID, Name, Level-Skalierung, Leben, Schaden, Tempo, Bewegung, Rüstung, Resistenzen, XP, Loot-Tabelle, Fähigkeiten (nur Schaden), Visual-ID.
- **Elite:** mehr Leben/Schaden, 1–2 Eigenschaften (Gepanzert, Flink, Feuerhülle, Vampirisch …; keine Kontrolleffekte), Leuchten, bessere Beute.
- **Bosse:** eigene Darstellung, Boss-Leiste, 2–3 Spezialangriffe mit Telegraph, eigene Loot-Tabelle, garantierte Seltenheit ab Stufe X.

---

## TEIL 14 – GRAFIK, KAMERA, FEEDBACK
- **M1:** Canvas 2D, iso-Boden, stilisierte Formen mit Schatten, y-Tiefensortierung, Vignette, Nebel.
- **Blickrichtungen:** **4 diagonale Richtungen** (NO, NW, SO, SW). Die Richtung wird aus dem Bewegungs-/Zielvektor auf den nächsten der 4 Quadranten gerundet. Animationen/Sprites werden nur für diese 4 Richtungen benötigt (ggf. 2 + Spiegelung).
- **Später:** Low-Poly oder Sprites (optional SpriteCook), Licht, Partikel, Three.js.
- Keine Assets als vorhanden ausgeben, die es nicht gibt.
- **Kamera:** isometrisch, fester Zoom, keine Rotation, weiches Folgen, Grenzen, optionale dezente Erschütterung.
- **Effekte nach Tag:** Melee Bogen+Funken · Projectile Flugbahn · Poison grüne Wolke · Bleed rote Partikel · AoE Ring · Trap Falle · Totem stationär · Minion Begleiter · Curse Aura · Warcry Druckwelle · Ranged Strahl · Elemente als Farbvariante.
- **Schadenszahlen:** Weiß normal, Gelb Krit (größer), Grün Gift, Rot Blutung, Violett Arkan, Orange/Blau/Hellgelb Feuer/Kälte/Blitz. Aufsteigen + ausblenden, kompakt (1.2K), max. N gleichzeitig, abschaltbar, gepoolt.

---

## TEIL 15 – LOOT, INVENTAR, WIRTSCHAFT
- Auto-Aufheben; **Loot-Filter** verkauft unter einstellbarer Seltenheit.
- **Inventar** 40 Plätze (erweiterbar); voll → schlechtestes gefiltertes Item verkaufen, nie Legendary+.
- Anzeigen, ausrüsten, ablegen, vergleichen (Diff grün/rot), verkaufen, Massenverkauf, Details mit Tiers und Legendary-Text, Sperren.
- **Gold:** Gems leveln, Inventar erweitern, Affix neu würfeln (ab Rare, steigende Kosten).
- Legendary/Mythic-Drops: auffälliger Effekt + Hinweis.

---

## TEIL 16 – PROGRESSION
Charakterlevel/XP-Kurve, Skill-Punkte, Freischaltungen, Gegnerlevel nach Stufe, Gebiete, Bosse, Stufe = Schwierigkeit, später Prestige. Level-Up: Basisleben, Basisressource, Grundschaden, +1 Skill-Punkt. Kurven zentral.

---

## TEIL 17 – UI (Mobile-first)
- **HUD:** oben Level/XP, Gebiet/Stufe, Gold · Mitte Spielfeld · unten Leben/Ressource, 4 Skill-Icons mit Cooldown, Buff-Leiste · Boss-Leiste bei Bedarf.
- **Tabs unten:** Kampf · Charakter · Inventar · Skills · Einstellungen.
- Touch-Ziele ≥ 44 px, kein Hover nötig, Details per Antippen.
- Dark-Fantasy-Stil (dunkle Töne, Goldakzente, Seltenheitsfarben), lesbar, nicht überladen.

---

## TEIL 18 – SPEICHERN
- `localStorage`, versioniert mit Migrationen.
- Inhalt: Klasse, Level, XP, Skills/Level, Loadout, Gems, Ausrüstung, Inventar, Gold, Gebiete/Stufen, Statistiken, Einstellungen, Zeitstempel.
- Autosave alle 15 s und bei Tab-Verstecken.
- Validierung: unbekannte IDs entfernen, Defaults ergänzen, nie abstürzen.
- **Export/Import als Text.**

---

## TEIL 19 – PERFORMANCE
Pooling (Projektile, Zahlen, Partikel), Effekt-Obergrenzen, fester Sim-Tick getrennt von FPS, nur Sichtbares rendern. Ziel **60 FPS auf dem iPhone** bei 30+ Gegnern. Optionen: Partikel reduzieren, Zahlen aus, Erschütterung aus, Loot-Effekte reduzieren.

---

## TEIL 20 – BALANCING
Alles zentral in `/src/data/balance`: Klassen, Levelkurven, Skills, Gems, Affix-Formeln/Gewichte, iLvl-Grenzen, Seltenheiten, Gegner/Bosse, Loot, XP, Caps, Formelkonstanten.
**Headless-Simulationsskript** rechnet z. B. 1 h Spielzeit durch (DPS, Kills/min, Level-Tempo, Drop-Verteilung).

---

## TEIL 21 – TESTS
- **Unit:** RNG-Determinismus, Stat-Neuberechnung, Schadensformel je Schritt, Krit, Gift/Blutung, Resistenzen/Caps, Rüstung/Ausweichen, Gem-Kompatibilität/Reset, Katalog-Validierung, Item-Generierung (Slots, Tiers/iLvl, keine Duplikate, Anzahl je Seltenheit, P/S-Limit), Legendary-Sicherungen, Save-Migration/Validierung, Offline-Berechnung.
- **Simulation:** jede Klasse 10 min ohne Absturz mit Fortschritt, alle Skills lösen aus, keine NaN/Infinity.
- **E2E (iPhone-Viewport):** Start, Kampf läuft, Ausrüsten ändert Stats, Save/Load übersteht Reload, Screenshot pro Tab.

---

## TEIL 22 – MEILENSTEINE
Jeder endet **spielbar, getestet, dokumentiert**.

| # | Inhalt |
|---|---|
| **M0** | Setup (Vite, TS, Tests), Struktur, Gedächtnis/Doku, DataRegistry, RNG |
| **M1** | Grundschleife im iPhone-Format: Warrior, Grundangriff + 4 Skills, 3 Gegnertypen, 1 Gebiet mit Stufen + Stufen-Boss, Schaden inkl. Blutung, 7 Slots mit ~30 Affixen und T1–T8, Normal–Rare, Loot-Filter, Inventar, Ausrüsten, Leveln, Speichern, HUD |
| **M2** | Voller Affix-Katalog, Epic, Vergleich, Gold-Ausgaben, Offline-Fortschritt |
| **M3** | Alle Support-Gems, Gem-Drops, Skill-Prioritäten/Bedingungen |
| **M4** | Assassin, Hunter, Mage komplett; Gift, Fallen, Totems, Minions, Flüche |
| **M5** | Alle Gegnertypen, Elite, Bosse mit Telegraphs, mehrere Gebiete |
| **M6** | Legendary/Mythic mit allen Effekten und Sicherungen |
| **M7** | Prestige, Statistiken, Balancing mit Simulationsskript |
| **M8** | Grafik-Upgrade (2.5D, Partikel, ggf. Three.js/Sprites), Performance |

---

## TEIL 23 – ARBEITSREGELN
1. Vor jedem Meilenstein kurzer Plan in `/docs/milestones/`.
2. Modular, datengetrieben, stabile IDs, Logik ohne Darstellung.
3. Keine doppelten Systeme oder Datenquellen.
4. Keine Platzhalter als fertig ausgeben; Offenes in `/docs/BACKLOG.md`.
5. Tests grün vor Meilenstein-Abschluss.
6. Nach jedem Meilenstein: Doku, Changelog, offene Aufgaben aktualisieren, committen, pushen.
7. Bei Widersprüchen nachfragen, nicht raten.

**ENDZIEL:** Ein spielbares, erweiterbares, mobiltaugliches Dark-Fantasy-Idle-ARPG mit allen beschriebenen Systemen.
