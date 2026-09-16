// Wave 03 browser QA: palettes and motion recipes over the wave 02 components.
// Usage: node qa.mjs <workspace> <run> <playwright/index.mjs> <chrome binary> --approve-write [--survey]
//
// Palette checks (every palette, a fixed sample of components):
// - every fill/stroke in the SVG belongs to the active palette's token set;
// - the rendered color set differs between every pair of palettes;
// - text is present and no page error or network request occurs.
// Motion checks (every recipe, the same sample):
// - the frame at the end of the timeline is byte-identical to the static
//   component (recipes never change the end state);
// - an early frame differs from the end frame (the recipe moves something);
// - the same time renders identically twice with other renders in between;
// - at 0.8 s every recipe produces a different frame from every other recipe.
// Writes only under <workspace>/visuals/<run>/qa/ and never overwrites.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [workspace, requested, playwrightPath, chromePath, approval, mode] = process.argv.slice(2);
assert.ok(process.argv.length === 7 || (process.argv.length === 8 && mode === '--survey'), 'Expected workspace, run ID, Playwright, Chrome and approval');
assert.equal(approval, '--approve-write', 'QA writes exports and requires explicit approval');
const SURVEY = mode === '--survey';
const survey = [];
assert.match(requested, /^[a-z][a-z0-9-]{0,47}$/, 'Invalid run ID');
const root = path.resolve(workspace);
assert.ok(fs.existsSync(root) && fs.statSync(root).isDirectory(), 'Existing workspace directory required');
const output = path.join(root, 'visuals', requested);
const qa = path.join(output, 'qa');
assert.ok(fs.existsSync(path.join(output, 'index.html')), 'Build the run first');
assert.ok(!fs.existsSync(qa), 'QA evidence already exists');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const build = JSON.parse(fs.readFileSync(path.join(output, 'build.json'), 'utf8'));
assert.equal(build.wave, 3);
const home = path.dirname(new URL(import.meta.url).pathname);
for (const [name, expected] of Object.entries(build.implementation_hashes)) {
  const file = name === 'wave02.js' ? path.join(home, '..', 'wave02', name) : path.join(home, name);
  assert.equal(sha(fs.readFileSync(file)), expected, 'Implementation changed; rebuild first');
}
const [SLOT_W, SLOT_H] = build.slot;
const {chromium} = await import(pathToFileURL(path.resolve(playwrightPath)).href);
const browser = await chromium.launch({executablePath: path.resolve(chromePath), headless: true});
const errors = [], network = [];
const report = {status: 'PASS', wave: 3, design_status: build.design_status, palettes: [], recipes: [], sample: [], color_sets: {}, motion: {}, errors, network,
  production_integration: false, browser: browser.version(), exports: []};
if (!SURVEY) fs.mkdirSync(qa);
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1200}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(path.join(output, 'index.html')).href);
  await page.waitForFunction(() => window.VisualLibrary && document.querySelector('#chart svg'));
  const ids = await page.evaluate(() => window.VisualLibrary.ids);
  const palettes = await page.evaluate(() => window.VisualLibrary.palettes);
  const recipeNames = await page.evaluate(() => window.VisualLibrary.recipes);
  assert.deepEqual(recipeNames, build.recipes, 'Recipes differ from the build');
  const wanted = ['terminal', 'histogram', 'queue', 'sequence', 'dag', 'bullet', 'claims', 'tree'];
  const sample = wanted.filter(id => ids.includes(id));
  assert.ok(sample.length >= 6, 'Sample components missing from the build');
  report.sample = sample;
  const inspect = () => page.evaluate(() => {
    const T = window.VisualLibrary.tokens();
    const allowed = new Set(Object.values(T).filter(v => /^#/.test(v)).map(v => v.toLowerCase()).concat(['none', 'transparent']));
    const failures = [], used = new Set();
    const svg = document.querySelector('#chart svg');
    if (!svg) return {failures: ['Missing SVG'], colors: []};
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of ['fill', 'stroke']) {
        const raw = el.getAttribute(attr);
        if (!raw) continue;
        const value = raw.trim().toLowerCase();
        if (value.startsWith('url(')) continue;
        used.add(value);
        if (!allowed.has(value)) failures.push(`Color outside the token set (${attr}=${value})`);
      }
    }
    if (svg.querySelectorAll('text').length === 0) failures.push('No text rendered');
    const bg = svg.querySelector('rect');
    if (!bg || (bg.getAttribute('fill') || '').toLowerCase() !== T.background.toLowerCase()) failures.push('Background rect is not the palette background');
    return {failures, colors: [...used].sort()};
  });
  // zrender numbers its classes and clip-path ids per render; comparisons use
  // the drawing with those counters removed, rasters use the raw SVG.
  const normalize = svg => svg.replace(/zr\d+-(cls|c)-?\d+/g, (m, kind) => kind);
  const rawFrame = async (id, recipe, t) => {
    await page.evaluate(([id, recipe, t]) => { window.VisualLibrary.select(id); window.VisualLibrary.setRecipe(recipe); window.VisualLibrary.renderAt(t); }, [id, recipe, t]);
    return page.evaluate(() => window.VisualLibrary.svg());
  };
  const frame = async (id, recipe, t) => normalize(await rawFrame(id, recipe, t));
  const raster = async (svg, file) => {
    const assetPage = await browser.newPage({viewport: {width: SLOT_W, height: SLOT_H}, deviceScaleFactor: 1});
    try {
      assetPage.on('pageerror', e => errors.push(String(e)));
      await assetPage.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
      await assetPage.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><body style="margin:0"></body>');
      const ok = await assetPage.evaluate(async ([svg, w, h]) => {
        const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        await image.decode(); image.width = w; image.height = h; document.body.append(image);
        return image.naturalWidth === w && image.naturalHeight === h;
      }, [svg, SLOT_W, SLOT_H]);
      assert.ok(ok, 'SVG export is not the slot size');
      await assetPage.screenshot({path: file, clip: {x: 0, y: 0, width: SLOT_W, height: SLOT_H}});
    } finally { await assetPage.close(); }
  };

  // ---- palettes ------------------------------------------------------------
  for (const palette of palettes) {
    await page.evaluate(name => window.VisualLibrary.setPalette(name), palette);
    for (const id of sample) {
      await frame(id, recipeNames[0], 8);
      const {failures, colors} = await inspect();
      if (SURVEY && failures.length) { survey.push(`${palette} ${id}: ${failures.join(' | ')}`); continue; }
      assert.deepEqual(failures, [], `${palette} ${id}`);
      (report.color_sets[id] ||= {})[palette] = colors;
    }
    if (!SURVEY) {
      for (const id of sample.slice(0, 2)) {
        const svg = await rawFrame(id, recipeNames[0], 8);
        const file = path.join(qa, `${id}-${palette}-asset.png`);
        await raster(svg, file);
        report.exports.push({id, palette, png_sha256: sha(fs.readFileSync(file)), svg_sha256: sha(svg), dimensions: [SLOT_W, SLOT_H]});
      }
    }
    report.palettes.push(palette);
  }
  for (const id of sample) {
    const sets = report.color_sets[id] || {};
    for (let i = 0; i < palettes.length; i++) for (let j = i + 1; j < palettes.length; j++) {
      const a = sets[palettes[i]], b = sets[palettes[j]];
      if (!a || !b) continue;
      assert.notDeepEqual(a, b, `Palettes ${palettes[i]} and ${palettes[j]} render ${id} with the same colors`);
    }
  }

  // ---- motion ----------------------------------------------------------------
  await page.evaluate(name => window.VisualLibrary.setPalette(name), palettes[0]);
  const filmstrip = [];
  for (const id of sample) {
    const baseline = await frame(id, recipeNames[0], 8);
    const early = {};
    for (const recipe of recipeNames) {
      const end = await frame(id, recipe, 8);
      const half = await frame(id, recipe, 0.5);
      const once = await frame(id, recipe, 1.0);
      await frame(id, recipe, 3.1);
      const twice = await frame(id, recipe, 1.0);
      const probe = await frame(id, recipe, 0.8);
      const failures = [];
      if (end !== baseline) failures.push('end state differs from the static component');
      if (half === baseline) failures.push('early frame equals the end state (no motion)');
      if (once !== twice) failures.push('same time renders differently (non-deterministic)');
      early[recipe] = probe;
      if (SURVEY && failures.length) { survey.push(`${id} ${recipe}: ${failures.join(' | ')}`); continue; }
      assert.deepEqual(failures, [], `${id} ${recipe}`);
      (report.motion[id] ||= {})[recipe] = {end_sha256: sha(end), early_sha256: sha(half)};
    }
    for (let i = 0; i < recipeNames.length; i++) for (let j = i + 1; j < recipeNames.length; j++) {
      const a = recipeNames[i], b = recipeNames[j];
      if (early[a] === early[b]) {
        if (SURVEY) survey.push(`${id}: recipes ${a} and ${b} produce the same frame at 0.8 s`);
        else assert.fail(`${id}: recipes ${a} and ${b} produce the same frame at 0.8 s`);
      }
    }
    if (!SURVEY && sample.indexOf(id) < 2) {
      for (const recipe of recipeNames) for (const t of [0.3, 0.8, 1.3, 8]) {
        const svg = await rawFrame(id, recipe, t);
        const file = path.join(qa, `motion-${id}-${recipe}-${String(t).replace('.', '_')}.png`);
        await raster(svg, file);
        filmstrip.push({id, recipe, t, file});
      }
    }
  }
  report.recipes = recipeNames;
  if (SURVEY) { console.log(survey.length ? survey.join('\n') : 'SURVEY: no failures'); process.exitCode = survey.length ? 1 : 0; await browser.close(); process.exit(); }

  // ---- sheets ------------------------------------------------------------------
  const sheet = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
  try {
    await sheet.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const css = 'body{margin:0;background:#101214;color:#e7ecef;font:13px Arial,sans-serif;padding:24px}h1{font-size:16px;margin:0 0 16px;font-weight:normal}h1 b{color:#f2b9c9}main{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}figure{margin:0}img{width:100%;display:block;border:1px solid #353c42;border-radius:6px}figcaption{margin-top:4px;color:#b7c3cb;font-size:11px}';
    const img = file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
    const paletteCells = report.exports.map(e => `<figure><img src="${img(path.join(qa, `${e.id}-${e.palette}-asset.png`))}" alt="${e.id} ${e.palette}"><figcaption>${e.id} · ${e.palette}</figcaption></figure>`).join('');
    await sheet.setContent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>${css}</style><h1>Wave 03 palettes · run ${requested} · <b>DESIGN REVIEW</b> · ${report.exports.length} exports</h1><main>${paletteCells}</main>`);
    await sheet.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
    await sheet.screenshot({path: path.join(qa, 'palette-contact-sheet.png'), fullPage: true});
    const motionCells = filmstrip.map(f => `<figure><img src="${img(f.file)}" alt="${f.id} ${f.recipe} ${f.t}"><figcaption>${f.id} · ${f.recipe} · ${f.t} s</figcaption></figure>`).join('');
    await sheet.setContent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>${css.replace('repeat(6,1fr)', 'repeat(8,1fr)')}</style><h1>Wave 03 motion · run ${requested} · <b>DESIGN REVIEW</b> · ${filmstrip.length} frames</h1><main>${motionCells}</main>`);
    await sheet.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
    await sheet.screenshot({path: path.join(qa, 'motion-sheet.png'), fullPage: true});
    await sheet.goto(pathToFileURL(path.join(output, 'palettes.html')).href);
    await sheet.screenshot({path: path.join(qa, 'palette-sheet.png'), fullPage: true});
  } finally { await sheet.close(); }
  await page.evaluate(name => window.VisualLibrary.setPalette(name), palettes[0]);
  await page.evaluate(() => { window.VisualLibrary.select(window.VisualLibrary.ids[0]); window.VisualLibrary.setRecipe(window.VisualLibrary.recipes[0]); window.VisualLibrary.renderAt(8); });
  await page.screenshot({path: path.join(qa, 'gallery-desktop.png'), fullPage: true});
  assert.deepEqual(errors, [], 'Page errors');
  assert.deepEqual(network, [], 'Network requests attempted');
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(`=== QA ${requested} ===`);
  console.log(`PASS: ${palettes.length} palettes and ${recipeNames.length} recipes over ${sample.length} sample components (token-only colors, pairwise distinct palettes, end-state identity, deterministic frames, distinct recipes), ${report.exports.length} palette exports, ${filmstrip.length} motion frames, no page errors, no remote requests.`);
} finally {
  await browser.close();
}
