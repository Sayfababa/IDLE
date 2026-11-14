/**
 * Hand-drawn line icons (24×24, stroke = currentColor). Engraved look, no emoji.
 */
const svg = (body: string, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

export const ICON: Record<string, string> = {
  // tabs
  combat: svg('<path d="M4 4l9 9M4 4v3M4 4h3M20 4l-9 9M20 4v3M20 4h-3"/><path d="M8 15l-3 3 1 1 3-3M16 15l3 3-1 1-3-3"/>'),
  hero: svg('<path d="M6 10a6 6 0 0 1 12 0v4H6z"/><path d="M6 14v4l3 2h6l3-2v-4"/><path d="M9 12h6M12 4v6"/>'),
  loot: svg('<path d="M7 8h10l2 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M10 13h4"/>'),
  skills: svg('<path d="M12 3c2 3 5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-8z"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  // skills
  'skill.warrior.slash': svg('<path d="M5 19L17 7l2-3-3 2L4 18z"/><path d="M8 16l2 2M3 21l2-2"/>'),
  'skill.warrior.rend': svg('<path d="M6 4c2 5 2 11 0 16M11 4c2 5 2 11 0 16M16 4c2 5 2 11 0 16"/><path d="M19 15v2M19 19v.5"/>'),
  'skill.warrior.whirlwind': svg('<path d="M12 12a2 2 0 1 1 2-2 4 4 0 1 1-4-4 6 6 0 1 1-6 6"/><path d="M20 18a9 9 0 0 1-8 3"/>'),
  'skill.warrior.smash': svg('<path d="M14 4l6 6-3 3-6-6z"/><path d="M12 10L4 18l2 2 8-8"/><path d="M3 14l-1-1M7 21l-1 1M2 20l2-1"/>'),
  'skill.warrior.warcry': svg('<path d="M4 10v4l5 1 6 4V5l-6 4z"/><path d="M18 9c1 1 1 5 0 6M20.5 7c2 3 2 7 0 10"/>'),
  // slots
  weapon: svg('<path d="M18 3l3 0 0 3-11 11-3-3z"/><path d="M6 15l3 3M4 17l3 3M3 21l2-2"/>'),
  ring: svg('<circle cx="12" cy="14" r="6"/><path d="M9 6l3-3 3 3-3 2z"/>'),
  amulet: svg('<path d="M5 3c0 6 3 9 7 9s7-3 7-9"/><path d="M12 12l3 4-3 5-3-5z"/>'),
  helmet: svg('<path d="M5 13a7 7 0 0 1 14 0v6h-4v-4H9v4H5z"/><path d="M12 6v5"/>'),
  chest: svg('<path d="M8 3l4 2 4-2 4 4-2 3v11H6V10L4 7z"/><path d="M12 5v16"/>'),
  boots: svg('<path d="M8 3h5v10l6 3v4H6l1-8z"/><path d="M6 17h13"/>'),
  gloves: svg('<path d="M7 21v-8L5 9l2-1 2 3V4h2v6V3h2v7V4h2v7l2-2 1 2-3 6v4z"/>'),
  coin: svg('<circle cx="12" cy="12" r="7"/><path d="M12 8v8M9.5 10.5h5"/>', 'stroke-width="1.4"'),
  lock: svg('<rect x="6" y="11" width="12" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  skull: svg('<path d="M5 11a7 7 0 0 1 14 0v3l-2 1v3H7v-3l-2-1z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M11 18v-2M13 18v-2"/>'),
};
