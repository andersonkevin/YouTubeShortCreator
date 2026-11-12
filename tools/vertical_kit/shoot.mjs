// Deterministic page capture for the vertical kit. Called by vkit.py; network requests are blocked.
//   node shoot.mjs PAGE.html OUTDIR WIDTHxHEIGHT frames FPS DURATION   -> OUTDIR/f00000.jpg ...
//   node shoot.mjs PAGE.html OUTDIR WIDTHxHEIGHT stills T1 T2 ...      -> OUTDIR/still-01.png ...
// The page must define window.setTime(t). Playwright and Chrome come from YSC_PLAYWRIGHT / YSC_CHROME (vkit.py sets both).
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [page, out, size, mode, ...rest] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const {chromium} = await import(pathToFileURL(process.env.YSC_PLAYWRIGHT).href);
fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.YSC_CHROME, headless: true});
const tab = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
await tab.route(/^https?:/, route => route.abort());
await tab.goto(pathToFileURL(path.resolve(page)).href);
await tab.evaluate(() => document.fonts.ready);
await tab.waitForTimeout(500);
if (mode === 'stills') {
  let n = 1;
  for (const t of rest) {
    await tab.evaluate(t => setTime(t), +t);
    await tab.screenshot({path: path.join(out, `still-${String(n++).padStart(2, '0')}.png`)});
  }
} else {
  const fps = +rest[0], frames = Math.round(+rest[1] * fps);
  for (let f = 0; f < frames; f++) {
    await tab.evaluate(t => setTime(t), f / fps);
    await tab.screenshot({path: path.join(out, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92});
    if (f % 300 === 0) console.log('frame', f, '/', frames);
  }
}
await browser.close();
