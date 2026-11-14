// Turns dist-single/index.html into an Artifact page body (host adds doctype/head/body + safe-area padding).
import { readFileSync, writeFileSync } from 'node:fs';
const [, , src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv;
let h = readFileSync(src, 'utf8');
h = h.replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<meta name="apple-mobile[^>]*>/gi, '');
// Host pads :root by the safe-area insets → don't pad twice; fill exactly the padded box.
const override = `<style>:root{color-scheme:dark;background:#050404;box-sizing:border-box;--safe-top:0px;--safe-bottom:0px}html,body{height:100%;background:#050404}</style>`;
const title = h.match(/<title>.*?<\/title>/i)?.[0] ?? '<title>Aschenwacht</title>';
h = h.replace(title, '');
writeFileSync(out, `${title}\n${h.trim()}\n${override}\n`);
console.log('wrote', out);
