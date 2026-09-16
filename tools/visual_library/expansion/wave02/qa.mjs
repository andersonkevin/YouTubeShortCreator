import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

// Wave-02 browser QA. Own checks, written for these components:
// - typography is measured as design pixels (computed font-size inside the
//   1080-wide frame), never divided by the preview scale;
// - every fill/stroke in the SVG must belong to the active token set, and the
//   rendered color set must actually change between palettes;
// - no ellipsis, no text/text collision, no text hidden under a later shape,
//   no text outside the slot; deterministic reveal and seek; no network.
// Exit code is not the evidence: inspect the PNGs and the contact sheet.
const home = path.dirname(fileURLToPath(import.meta.url));
const [workspace, requested, playwrightPath, chromePath, approval] = process.argv.slice(2);
assert.ok(process.argv.length === 7 || (process.argv.length === 8 && process.argv[7] === '--survey'), 'Expected workspace, run ID, Playwright, Chrome and approval');
assert.equal(approval, '--approve-write', 'QA writes exports and requires explicit approval');
// --survey: report every layout failure in one pass (no exports are written); for iteration only, never a pass.
const SURVEY = process.argv.includes('--survey');
const survey = [];
assert.match(requested || '', /^[a-z][a-z0-9-]{0,47}$/);
const root = path.resolve(workspace);
for (let node = root; ; node = path.dirname(node)) {
  assert.ok(!fs.lstatSync(node).isSymbolicLink(), 'Symlink workspace blocked');
  if (node === path.dirname(node)) break;
}
const repo = path.resolve(home, '../../../..');
const relative = path.relative(repo, root);
assert.ok(relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || ['workspace', 'workspaces'].includes(relative.split(path.sep)[0]), 'Private workspace required');
const output = fs.realpathSync(path.join(root, 'visuals', requested));
assert.equal(output, path.join(root, 'visuals', requested));
const qa = path.join(output, 'qa');
assert.ok(!fs.existsSync(qa), 'QA evidence already exists');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const build = JSON.parse(fs.readFileSync(path.join(output, 'build.json')));
assert.equal(sha(fs.readFileSync(path.join(output, 'index.html'))), build.index_sha256, 'Built HTML changed');
for (const [name, expected] of Object.entries(build.implementation_hashes)) {
  assert.equal(path.basename(name), name);
  assert.equal(sha(fs.readFileSync(path.join(home, name))), expected, 'Implementation changed; rebuild first');
}
const [SLOT_W, SLOT_H] = build.slot;
const {chromium} = await import(pathToFileURL(path.resolve(playwrightPath)).href);
const browser = await chromium.launch({executablePath: path.resolve(chromePath), headless: true});
const errors = [], network = [];
const report = {status: 'PASS', wave: 2, design_status: build.design_status, viewports: [], palettes: [], samples: [], color_sets: {}, errors, network, production_integration: false, browser: browser.version(), exports: []};
if (!SURVEY) fs.mkdirSync(qa);
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1200}, deviceScaleFactor: 1});
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(path.join(output, 'index.html')).href);
  await page.waitForFunction(() => window.VisualLibrary);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
  const ids = await page.evaluate(() => window.VisualLibrary.ids);
  const palettes = await page.evaluate(() => window.VisualLibrary.palettes);
  assert.equal(ids.length, build.components);
  assert.deepEqual([...palettes].sort(), build.palettes);

  const inspect = () => page.evaluate(([slotW, slotH]) => {
    const failures = [];
    const frame = document.getElementById('frame').getBoundingClientRect();
    const viewport = document.querySelector('.viewport').getBoundingClientRect();
    if (Math.abs(frame.width - viewport.width) > 1 || Math.abs(frame.height - viewport.height) > 1) failures.push('Frame is not fitted to viewport');
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Page horizontal overflow');
    for (const el of document.querySelectorAll('#frame h1,#eyebrow,#detail,#insight,footer')) {
      const b = el.getBoundingClientRect();
      if (b.left < frame.left - 1 || b.right > frame.right + 1 || b.bottom > frame.bottom + 1) failures.push('Outside frame ' + el.textContent);
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) failures.push('Text overflow ' + el.textContent);
    }
    if (document.getElementById('insight').getBoundingClientRect().bottom > document.querySelector('footer').getBoundingClientRect().top) failures.push('Insight/source overlap');
    const chart = document.getElementById('chart').getBoundingClientRect();
    const scale = chart.width / slotW;
    if (Math.abs(chart.height / scale - slotH) > 1) failures.push('Chart is not the production slot size');
    const svgRoot = document.querySelector('#chart svg');
    const texts = [...svgRoot.querySelectorAll('text')].map(el => ({el, box: el.getBoundingClientRect(), text: el.textContent.trim()})).filter(t => t.box.width > 0 && t.text);
    for (const t of texts) {
      if (t.box.left < chart.left - 1 || t.box.right > chart.right + 1 || t.box.top < chart.top - 1 || t.box.bottom > chart.bottom + 1) failures.push('Chart text clipped: ' + t.text);
      if (t.text.includes('…')) failures.push('Truncated label: ' + t.text);
      // Design pixels: the frame is CSS-transformed, so computed font-size is already unscaled.
      const size = parseFloat(getComputedStyle(t.el).fontSize);
      if (!(size >= 19)) failures.push(`Text too small (${size}px): ${t.text}`);
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].box, b = texts[j].box, tol = 3 * scale;
      if (a.left < b.right - tol && b.left < a.right - tol && a.top < b.bottom - tol && b.top < a.bottom - tol) failures.push(`Text collision: "${texts[i].text}" / "${texts[j].text}"`);
    }
    const nodes = [...svgRoot.querySelectorAll('text, path, polygon, rect, circle')];
    const filled = el => { const f = el.getAttribute('fill'); return f && f !== 'none' && f !== 'transparent' && Number(el.getAttribute('fill-opacity') ?? 1) > 0.05; };
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].tagName !== 'text') continue;
      const a = nodes[i].getBoundingClientRect(); if (a.width === 0) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const el = nodes[j]; if (el.tagName === 'text' || !filled(el) || (el.tagName === 'rect' && el === svgRoot.firstElementChild)) continue;
        const b = el.getBoundingClientRect(), tol = 3 * scale;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > tol && oy > tol) failures.push('Text occluded by a later shape: ' + nodes[i].textContent.trim());
      }
    }
    // Every color must come from the active token set.
    const T = window.VisualLibrary.tokens();
    const allowed = new Set(Object.values(T).filter(v => /^#/.test(v)).map(v => v.toLowerCase()).concat(['none', 'transparent']));
    const used = new Set();
    for (const el of svgRoot.querySelectorAll('*')) {
      for (const attr of ['fill', 'stroke']) {
        const value = (el.getAttribute(attr) || '').trim().toLowerCase();
        if (!value) continue;
        used.add(value);
        if (!allowed.has(value)) failures.push(`Color outside the token set (${attr}=${value})`);
      }
    }
    return {failures, colors: [...used].sort()};
  }, [SLOT_W, SLOT_H]);

  for (const viewport of [{width: 1440, height: 1200}, {width: 390, height: 844}, {width: 375, height: 667}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const palette of (viewport.width === 1440 ? palettes : [palettes[0]])) {
      await page.evaluate(name => window.VisualLibrary.setPalette(name), palette);
      for (const id of ids) {
        await page.evaluate(id => { window.VisualLibrary.select(id); window.VisualLibrary.renderAt(4); }, id);
        const {failures, colors} = await inspect();
        if (SURVEY && failures.length) { survey.push(`${id} ${palette} ${viewport.width}x${viewport.height}: ${failures.join(' | ')}`); continue; }
        assert.deepEqual(failures, [], `${id} ${palette} ${JSON.stringify(viewport)}`);
        assert.equal(await page.locator('#chart svg').count(), 1, 'Missing SVG');
        assert.ok(await page.locator('#chart svg path,#chart svg rect,#chart svg text,#chart svg image,#chart svg circle').count() > 3, 'Empty visual');
        if (viewport.width === 1440) (report.color_sets[id] ||= {})[palette] = colors;
        const before = sha(await page.locator('#chart').screenshot());
        await page.evaluate(() => window.VisualLibrary.renderAt(0.2));
        const early = sha(await page.locator('#chart').screenshot());
        assert.notEqual(before, early, 'Missing reveal motion');
        await page.evaluate(() => window.VisualLibrary.renderAt(4));
        assert.equal(before, sha(await page.locator('#chart').screenshot()), 'Non-deterministic seek');
        report.samples.push({id, palette, ...viewport, sha256: before});
        if (viewport.width === 1440 && !SURVEY) {
          const suffix = palette === palettes[0] ? '' : '-' + palette;
          await page.locator('.viewport').screenshot({path: path.join(qa, id + suffix + '.png')});
          const svg = await page.evaluate(() => window.VisualLibrary.svg());
          fs.writeFileSync(path.join(qa, id + suffix + '.svg'), svg, {flag: 'wx'});
          const source = await page.evaluate(id => window.visualLibraryData.components.find(c => c.id === id), id);
          fs.writeFileSync(path.join(qa, id + suffix + '.json'), JSON.stringify({source, palette, dimensions: [SLOT_W, SLOT_H], status: 'design_review', svg_sha256: sha(svg), vendor_manifest_sha256: build.vendor_manifest_sha256}, null, 2) + '\n', {flag: 'wx'});
          const assetPage = await browser.newPage({viewport: {width: SLOT_W, height: SLOT_H}, deviceScaleFactor: 1});
          try {
            assetPage.on('pageerror', e => errors.push(String(e)));
            await assetPage.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
            await assetPage.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><body></body>');
            const raster = await assetPage.evaluate(async ([svg, w, h]) => {
              const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
              await image.decode();
              const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
              const p = ctx.getImageData(0, 0, w, h).data; let nonblack = 0, light = 0;
              for (let i = 0; i < p.length; i += 4) { if (Math.max(p[i], p[i + 1], p[i + 2]) > 20) nonblack++; if (Math.min(p[i], p[i + 1], p[i + 2]) > 140) light++; }
              return {png: canvas.toDataURL('image/png').split(',')[1], nonblack, light};
            }, [svg, SLOT_W, SLOT_H]);
            assert.ok(raster.nonblack > 10000 && raster.light > 200, 'Blank or incomplete asset raster: ' + id);
            fs.writeFileSync(path.join(qa, id + suffix + '-asset.png'), Buffer.from(raster.png, 'base64'), {flag: 'wx'});
            report.exports.push({id, palette, svg_sha256: sha(svg), png_sha256: sha(fs.readFileSync(path.join(qa, id + suffix + '-asset.png'))), dimensions: [SLOT_W, SLOT_H], pixel_check: {nonblack: raster.nonblack, light: raster.light}});
          } finally { await assetPage.close(); }
        }
      }
      if (viewport.width === 1440) report.palettes.push(palette);
    }
    report.viewports.push(viewport);
  }
  if (SURVEY) { console.log(survey.length ? survey.join('\n') : 'SURVEY: no layout failures'); process.exitCode = survey.length ? 1 : 0; await browser.close(); process.exit(); }
  // Palette switch must change the rendered colors of every component.
  for (const id of ids) {
    const sets = report.color_sets[id];
    for (let i = 1; i < palettes.length; i++) {
      const a = new Set(sets[palettes[0]]), b = new Set(sets[palettes[i]]);
      const changed = [...a].some(c => !b.has(c) && c !== 'none' && c !== 'transparent');
      assert.ok(changed, `Palette switch did not change colors for ${id} (${palettes[0]} vs ${palettes[i]})`);
    }
  }
  await page.setViewportSize({width: 1440, height: 1200});
  await page.evaluate(name => window.VisualLibrary.setPalette(name), palettes[0]);
  await page.locator('nav button').last().click();
  assert.equal(await page.locator('nav button[aria-pressed="true"]').getAttribute('data-id'), ids.at(-1));
  await page.evaluate(() => window.VisualLibrary.renderAt(0));
  await page.getByRole('button', {name: 'Play preview', exact: true}).click();
  await page.waitForFunction(() => Number(document.getElementById('time').value) > 0.2);
  await page.getByRole('button', {name: 'Pause preview', exact: true}).click();
  await page.evaluate(id => { window.VisualLibrary.select(id); window.VisualLibrary.renderAt(4); }, ids[0]);
  await page.screenshot({path: path.join(qa, 'gallery-desktop.png'), fullPage: true});
  await page.setViewportSize({width: 390, height: 844});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({path: path.join(qa, 'gallery-mobile.png'), fullPage: true});

  const sheet = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
  try {
    await sheet.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const cells = report.exports.map(e => {
      const file = path.join(qa, e.id + (e.palette === palettes[0] ? '' : '-' + e.palette) + '-asset.png');
      return `<figure><img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}" alt="${e.id}"><figcaption>${e.id} · ${e.palette}</figcaption></figure>`;
    }).join('');
    await sheet.setContent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;background:#101214;color:#e7ecef;font:13px Arial,sans-serif;padding:24px}h1{font-size:16px;margin:0 0 16px;font-weight:normal}h1 b{color:#f2b9c9}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0}img{width:100%;display:block;border:1px solid #353c42;border-radius:6px}figcaption{margin-top:6px;color:#b7c3cb}</style><h1>Wave 02 contact sheet · run ${requested} · <b>DESIGN REVIEW</b> · ${report.exports.length} exports at ${SLOT_W}x${SLOT_H}</h1><main>${cells}</main>`);
    await sheet.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
    await sheet.screenshot({path: path.join(qa, 'contact-sheet.png'), fullPage: true});
  } finally { await sheet.close(); }

  assert.deepEqual(network, []); assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  assert.equal(sha(fs.readFileSync(path.join(output, 'index.html'))), build.index_sha256, 'HTML changed during QA');
  console.log(`PASS: ${ids.length} components, ${report.palettes.length} palettes (token-only colors, switch verified), 3 viewports, design-pixel typography, collision/occlusion/ellipsis checks, deterministic reveal, ${report.exports.length} exports, contact sheet, no remote requests.`);
} catch (error) {
  fs.writeFileSync(path.join(qa, 'failure.json'), JSON.stringify({status: 'FAILED', error: String(error)}, null, 2), {flag: 'wx'});
  throw error;
} finally { await browser.close(); }
