// Wave 03 layout QA: renders every layout frame at 1080x1920 with real
// components in the visual zone and checks the zones as drawn.
// Usage: node layouts-qa.mjs <workspace> <run> <playwright/index.mjs> <chrome binary> --approve-write
//
// Checks per layout:
// - every text zone holds its placeholder at production type size without
//   overflow (scrollWidth/scrollHeight within the zone);
// - the visual image is the 824x820 export and fills the visual zone exactly;
// - no two content zones (text or visual) overlap as rendered;
// - every content zone stays inside the frame and the safe box;
// - no page errors, no network requests. Writes only under the run's qa-layouts/ directory.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [workspace, requested, playwrightPath, chromePath, approval] = process.argv.slice(2);
assert.equal(process.argv.length, 7, 'Expected workspace, run ID, Playwright, Chrome and approval');
assert.equal(approval, '--approve-write', 'QA writes exports and requires explicit approval');
assert.match(requested, /^[a-z][a-z0-9-]{0,47}$/, 'Invalid run ID');
const root = path.resolve(workspace);
assert.ok(fs.existsSync(root) && fs.statSync(root).isDirectory(), 'Existing workspace directory required');
const output = path.join(root, 'visuals', requested);
const qa = path.join(output, 'qa-layouts');
assert.ok(fs.existsSync(path.join(output, 'layouts.html')), 'Build the run first');
assert.ok(!fs.existsSync(qa), 'Layout QA evidence already exists');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const build = JSON.parse(fs.readFileSync(path.join(output, 'build.json'), 'utf8'));
assert.equal(build.wave, 3);
const home = path.dirname(new URL(import.meta.url).pathname);
for (const [name, expected] of Object.entries(build.implementation_hashes)) {
  const file = name === 'wave02.js' ? path.join(home, '..', 'wave02', name) : path.join(home, name);
  assert.equal(sha(fs.readFileSync(file)), expected, 'Implementation changed; rebuild first');
}
const layouts = JSON.parse(fs.readFileSync(path.join(home, 'layouts.json'), 'utf8'));
const SAFE = layouts.safe, [SLOT_W, SLOT_H] = layouts.slot;
const {chromium} = await import(pathToFileURL(path.resolve(playwrightPath)).href);
const browser = await chromium.launch({executablePath: path.resolve(chromePath), headless: true});
const errors = [], network = [];
const report = {status: 'PASS', wave: 3, design_status: build.design_status, palette: build.palette, layouts: [], sample: [], frames: [], errors, network, production_integration: false, browser: browser.version()};
fs.mkdirSync(qa);
try {
  // Component exports from the study page, in the build's palette, at the end of the timeline.
  const study = await browser.newPage({viewport: {width: 1440, height: 1200}, deviceScaleFactor: 1});
  study.on('pageerror', e => errors.push(String(e)));
  await study.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await study.goto(pathToFileURL(path.join(output, 'index.html')).href);
  await study.waitForFunction(() => window.VisualLibrary && document.querySelector('#chart svg'));
  const ids = await study.evaluate(() => window.VisualLibrary.ids);
  const sample = ['table', 'sequence', 'bullet'].filter(id => ids.includes(id));
  assert.equal(sample.length, 3, 'Sample components missing from the build');
  report.sample = sample;
  const svgs = {};
  for (const id of sample) {
    svgs[id] = await study.evaluate(id => { window.VisualLibrary.select(id); window.VisualLibrary.setRecipe(window.VisualLibrary.recipes[0]); window.VisualLibrary.renderAt(8); return window.VisualLibrary.svg(); }, id);
  }
  await study.close();

  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(path.join(output, 'layouts.html')).href);
  const frames = await page.evaluate(() => [...document.querySelectorAll('section.frame')].map(f => f.dataset.layout));
  assert.deepEqual(frames, build.layouts, 'Layouts differ from the build');
  const dataUrl = svg => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  for (const layoutId of frames) {
    const spec = layouts.layouts.find(l => l.id === layoutId);
    const visualZone = spec.zones.find(z => z.role === 'visual');
    spec.scale = Math.round(visualZone.w / SLOT_W * 1000) / 1000;
    for (const id of sample) {
      const failures = await page.evaluate(async ([layoutId, src, SAFE, SLOT_W, SLOT_H]) => {
        const frame = document.querySelector(`section.frame[data-layout="${layoutId}"]`);
        const image = frame.querySelector('img[data-role="visual-image"]');
        image.src = src; image.hidden = false;
        await image.decode();
        const failures = [];
        if (image.naturalWidth !== SLOT_W || image.naturalHeight !== SLOT_H) failures.push(`visual export is ${image.naturalWidth}x${image.naturalHeight}`);
        const origin = frame.getBoundingClientRect();
        const rect = el => { const r = el.getBoundingClientRect(); return {x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height, right: r.right - origin.left, bottom: r.bottom - origin.top}; };
        const visual = frame.querySelector('[data-role="visual"]'), vr = rect(visual), ir = rect(image);
        if (Math.abs(vr.x - ir.x) > 1 || Math.abs(vr.y - ir.y) > 1 || Math.abs(vr.w - ir.w) > 1 || Math.abs(vr.h - ir.h) > 1) failures.push('visual image does not fill the visual zone');
        const content = [];
        for (const zone of frame.querySelectorAll('.zone')) {
          const role = zone.dataset.role, r = rect(zone);
          if (r.x < -0.5 || r.y < -0.5 || r.right > 1080.5 || r.bottom > 1920.5) failures.push(`${role} zone leaves the frame`);
          if (zone.classList.contains('text')) {
            if (zone.scrollHeight > zone.clientHeight + 1 || zone.scrollWidth > zone.clientWidth + 1) failures.push(`${role} placeholder overflows its zone (${zone.scrollWidth}x${zone.scrollHeight} in ${zone.clientWidth}x${zone.clientHeight})`);
          }
          if (zone.classList.contains('text') || role === 'visual') {
            content.push({role, ...r});
            if (r.x < SAFE.x - 0.5 || r.y < SAFE.y - 0.5 || r.right > SAFE.x + SAFE.w + 0.5 || r.bottom > SAFE.y + SAFE.h + 0.5) failures.push(`${role} zone leaves the safe box`);
          }
        }
        for (let i = 0; i < content.length; i++) for (let j = i + 1; j < content.length; j++) {
          const a = content[i], b = content[j];
          if (a.x < b.right - 0.5 && b.x < a.right - 0.5 && a.y < b.bottom - 0.5 && b.y < a.bottom - 0.5) failures.push(`${a.role} and ${b.role} zones overlap as rendered`);
        }
        return failures;
      }, [layoutId, dataUrl(svgs[id]), SAFE, SLOT_W, SLOT_H]);
      assert.deepEqual(failures, [], `${layoutId} with ${id}`);
      const handle = await page.locator(`section.frame[data-layout="${layoutId}"]`);
      const file = path.join(qa, `layout-${layoutId}-${id}.png`);
      await handle.screenshot({path: file});
      report.frames.push({layout: layoutId, component: id, scale: spec.scale, png_sha256: sha(fs.readFileSync(file))});
    }
    report.layouts.push(layoutId);
  }
  const sheet = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
  try {
    await sheet.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const css = 'body{margin:0;background:#101214;color:#e7ecef;font:13px Arial,sans-serif;padding:24px}h1{font-size:16px;margin:0 0 16px;font-weight:normal}h1 b{color:#f2b9c9}main{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}figure{margin:0}img{width:100%;display:block;border:1px solid #353c42;border-radius:6px}figcaption{margin-top:4px;color:#b7c3cb;font-size:11px}';
    const cells = report.frames.map(f => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(qa, `layout-${f.layout}-${f.component}.png`)).toString('base64')}" alt="${f.layout} ${f.component}"><figcaption>${f.layout} · ${f.component} · ×${f.scale}</figcaption></figure>`).join('');
    await sheet.setContent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>${css}</style><h1>Wave 03 layouts · run ${requested} · palette ${build.palette} · <b>DESIGN REVIEW</b> · ${report.frames.length} frames</h1><main>${cells}</main>`);
    await sheet.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
    await sheet.screenshot({path: path.join(qa, 'layout-sheet.png'), fullPage: true});
  } finally { await sheet.close(); }
  assert.deepEqual(errors, [], 'Page errors');
  assert.deepEqual(network, [], 'Network requests attempted');
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(`=== LAYOUT QA ${requested} ===`);
  console.log(`PASS: ${report.layouts.length} layouts x ${sample.length} components at 1080x1920 (placeholders at production type sizes without overflow, visual fills its zone, no content overlap, safe box respected), ${report.frames.length} frames, no page errors, no remote requests.`);
} finally {
  await browser.close();
}
