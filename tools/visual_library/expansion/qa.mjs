import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

// Browser QA for expansion previews. Mirrors the library's qa.mjs boundary:
// explicit trusted Playwright/Chrome paths, private workspace only, no network,
// no overwrite. Adds text-collision checks, palette sweeps, 824x820 exports
// and a contact sheet. Exit code alone is not the evidence; inspect the PNGs.
const home = path.dirname(fileURLToPath(import.meta.url));
const [workspace, requested, playwrightPath, chromePath, approval] = process.argv.slice(2);
assert.equal(process.argv.length, 7, 'Expected workspace, run ID, Playwright, Chrome and approval');
assert.equal(approval, '--approve-write', 'QA writes exports and requires explicit approval');
assert.match(requested || '', /^[a-z][a-z0-9-]{0,47}$/);
const root = path.resolve(workspace);
for (let node = root; ; node = path.dirname(node)) {
  assert.ok(!fs.lstatSync(node).isSymbolicLink(), 'Symlink workspace blocked');
  if (node === path.dirname(node)) break;
}
const repo = path.resolve(home, '../../..');
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
const report = {status: 'PASS', design_status: build.design_status, viewports: [], palettes: [], samples: [], errors, network, production_integration: false, browser: browser.version(), exports: []};
fs.mkdirSync(qa);
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
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]{0,39}$/);

  // Layout, overflow and text-collision checks inside the frame and the slot.
  const inspect = () => page.evaluate(([slotW, slotH]) => {
    const failures = [];
    const frame = document.getElementById('frame').getBoundingClientRect();
    const viewport = document.querySelector('.viewport').getBoundingClientRect();
    if (Math.abs(frame.width - viewport.width) > 1 || Math.abs(frame.height - viewport.height) > 1) failures.push('Frame is not fitted to viewport');
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Page horizontal overflow');
    for (const el of document.querySelectorAll('#frame h1,#eyebrow,#detail,#insight,footer')) {
      const box = el.getBoundingClientRect();
      if (box.left < frame.left - 1 || box.right > frame.right + 1 || box.bottom > frame.bottom + 1) failures.push('Outside frame ' + el.textContent);
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) failures.push('Text overflow ' + el.textContent);
    }
    if (document.getElementById('insight').getBoundingClientRect().bottom > document.querySelector('footer').getBoundingClientRect().top) failures.push('Insight/source overlap');
    const chart = document.getElementById('chart').getBoundingClientRect();
    const scale = chart.width / slotW;
    if (Math.abs(chart.height / scale - slotH) > 1) failures.push('Chart is not the production slot size');
    const texts = [...document.querySelectorAll('#chart svg text')].map(el => ({el, box: el.getBoundingClientRect(), text: el.textContent.trim()})).filter(t => t.box.width > 0 && t.text);
    for (const t of texts) {
      if (t.box.left < chart.left - 1 || t.box.right > chart.right + 1 || t.box.top < chart.top - 1 || t.box.bottom > chart.bottom + 1) failures.push('Chart text clipped: ' + t.text);
    }
    // Two text runs must not overlap each other (labels colliding = unreadable).
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].box, b = texts[j].box, tol = 3 * scale;
      if (a.left < b.right - tol && b.left < a.right - tol && a.top < b.bottom - tol && b.top < a.bottom - tol) failures.push(`Text collision: "${texts[i].text}" / "${texts[j].text}"`);
    }
    // A filled shape painted after a text run hides it. Boxes are meant to be painted before their labels.
    const svgRoot = document.querySelector('#chart svg');
    const nodes = [...svgRoot.querySelectorAll('text, path, polygon, rect')];
    const filled = el => { const f = el.getAttribute('fill'); return f && f !== 'none' && f !== 'transparent' && Number(el.getAttribute('fill-opacity') ?? 1) > 0.05; };
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].tagName !== 'text') continue;
      const a = nodes[i].getBoundingClientRect(); if (a.width === 0) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const el = nodes[j]; if (el.tagName === 'text' || !filled(el)) continue;
        if (el.tagName === 'rect' && el === svgRoot.firstElementChild) continue;
        const b = el.getBoundingClientRect(), tol = 3 * scale;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > tol && oy > tol) failures.push('Text occluded by a later shape: ' + nodes[i].textContent.trim());
      }
    }
    // A rendered ellipsis means a label did not fit: that is a validation error, never hidden content.
    for (const t of texts) if (t.text.includes('\u2026')) failures.push('Truncated label: ' + t.text);
    // Minimum readable size: 20 CSS px at 1080 width.
    for (const t of texts) { const size = parseFloat(getComputedStyle(t.el).fontSize) / scale; if (size < 20) failures.push(`Text too small (${size.toFixed(1)}px): ${t.text}`); }
    return failures;
  }, [SLOT_W, SLOT_H]);

  for (const viewport of [{width: 1440, height: 1200}, {width: 390, height: 844}, {width: 375, height: 667}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const palette of (viewport.width === 1440 ? palettes : [palettes[0]])) {
      await page.evaluate(name => window.VisualLibrary.setPalette(name), palette);
      for (const id of ids) {
        await page.evaluate(id => { window.VisualLibrary.select(id); window.VisualLibrary.renderAt(4); }, id);
        const problems = await inspect();
        assert.deepEqual(problems, [], `${id} ${palette} ${JSON.stringify(viewport)}`);
        assert.equal(await page.locator('#chart svg').count(), 1, 'Missing SVG');
        assert.ok(await page.locator('#chart svg path,#chart svg rect,#chart svg text,#chart svg image').count() > 3, 'Empty visual');
        const before = sha(await page.locator('#chart').screenshot());
        await page.evaluate(() => window.VisualLibrary.renderAt(0.2));
        const early = sha(await page.locator('#chart').screenshot());
        assert.notEqual(before, early, 'Missing reveal motion');
        await page.evaluate(() => window.VisualLibrary.renderAt(4));
        assert.equal(before, sha(await page.locator('#chart').screenshot()), 'Non-deterministic seek');
        report.samples.push({id, palette, ...viewport, sha256: before});
        if (viewport.width === 1440) {
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
              const pixels = ctx.getImageData(0, 0, w, h).data;
              let nonblack = 0, bright = 0;
              // Dimmed (de-emphasized) items are a design state, so 'bright' counts any light ink, not only white.
              for (let i = 0; i < pixels.length; i += 4) { if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 20) nonblack++; if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 140) bright++; }
              return {png: canvas.toDataURL('image/png').split(',')[1], nonblack, bright};
            }, [svg, SLOT_W, SLOT_H]);
            assert.ok(raster.nonblack > 10000 && raster.bright > 200, 'Blank or incomplete asset raster: ' + id);
            fs.writeFileSync(path.join(qa, id + suffix + '-asset.png'), Buffer.from(raster.png, 'base64'), {flag: 'wx'});
            report.exports.push({id, palette, svg_sha256: sha(svg), png_sha256: sha(fs.readFileSync(path.join(qa, id + suffix + '-asset.png'))), dimensions: [SLOT_W, SLOT_H], pixel_check: {nonblack: raster.nonblack, bright: raster.bright}});
          } finally { await assetPage.close(); }
        }
      }
      if (viewport.width === 1440) report.palettes.push(palette);
    }
    report.viewports.push(viewport);
  }
  // Transport and selection still work after the sweeps.
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

  // Contact sheet: every exported asset at a glance, rendered offline from the PNGs just written.
  const sheet = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
  try {
    await sheet.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
    const cells = report.exports.map(e => {
      const file = path.join(qa, e.id + (e.palette === palettes[0] ? '' : '-' + e.palette) + '-asset.png');
      const data = fs.readFileSync(file).toString('base64');
      return `<figure><img src="data:image/png;base64,${data}" alt="${e.id}"><figcaption>${e.id} · ${e.palette}</figcaption></figure>`;
    }).join('');
    await sheet.setContent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{margin:0;background:#101214;color:#e7ecef;font:13px Arial,sans-serif;padding:24px}h1{font-size:16px;margin:0 0 16px;font-weight:normal}h1 b{color:#f2b9c9}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0}img{width:100%;display:block;border:1px solid #353c42;border-radius:6px}figcaption{margin-top:6px;color:#b7c3cb}</style><h1>Expansion contact sheet · run ${requested} · <b>DESIGN REVIEW</b> · ${report.exports.length} exports at ${SLOT_W}x${SLOT_H}</h1><main>${cells}</main>`);
    await sheet.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => image.decode())); });
    await sheet.screenshot({path: path.join(qa, 'contact-sheet.png'), fullPage: true});
  } finally { await sheet.close(); }

  assert.deepEqual(network, []); assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  assert.equal(sha(fs.readFileSync(path.join(output, 'index.html'))), build.index_sha256, 'HTML changed during QA');
  console.log(`PASS: ${ids.length} components, ${report.palettes.length} palettes, 3 viewports, text-collision checks, deterministic reveal, ${report.exports.length} exports, contact sheet, no remote requests.`);
} catch (error) {
  fs.writeFileSync(path.join(qa, 'failure.json'), JSON.stringify({status: 'FAILED', error: String(error)}, null, 2), {flag: 'wx'});
  throw error;
} finally { await browser.close(); }
