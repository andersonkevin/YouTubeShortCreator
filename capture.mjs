import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectChartLabels} from './chart-qa.mjs';

const [workspace, requested, mode, frames] = process.argv.slice(2);
assert.ok(['qa', 'render'].includes(mode));
assert.equal(process.argv.slice(2).length, mode==='render' ? 4 : 3);
if(mode==='render') {
  assert.ok(path.isAbsolute(frames), 'Absolute scratch frame path required');
  assert.equal(fs.realpathSync(frames),frames,'Scratch path cannot contain symlinks');
  const parent=path.dirname(frames);
  assert.equal(path.dirname(parent),fs.realpathSync(os.tmpdir()),'Scratch must be in the OS temporary directory');
  assert.ok(path.basename(parent).startsWith('shortcreator-media-'));
  assert.equal(path.basename(frames),'frames');
  assert.deepEqual(fs.readdirSync(frames),[],'Scratch frames must be empty');
}
const out = fs.realpathSync(requested);
const runs = fs.realpathSync(path.join(workspace, 'runs'));
assert.ok(out.startsWith(runs + path.sep), 'Output must be a new run directory');
const runtime = JSON.parse(fs.readFileSync(path.join(workspace, 'runtime.json'))).paths;
const episode = JSON.parse(fs.readFileSync(path.join(out, 'episode.json')));
const {chromium} = await import(pathToFileURL(runtime.playwright).href);
const browser = await chromium.launch({executablePath:runtime.chrome, headless:true});
const errors = [];
const network = [];
const report = {status:'PASS', scenes:[], viewports:[], network, errors};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
try {
  const page = await browser.newPage({viewport:{width:1080,height:1920}, deviceScaleFactor:1});
  page.on('pageerror', error=>errors.push(String(error)));
  page.on('console', message=>{if(message.type()==='error') errors.push(message.text());});
  await page.route(/^https?:/, route=>{network.push(route.request().url());return route.abort();});
  await page.addInitScript(()=>window.__SHORTCREATOR_CAPTURE_MODE__=true);
  await page.goto(pathToFileURL(path.join(out, 'video.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  // Load the checked faces explicitly: a scene that never uses one of them would otherwise leave it unloaded.
  await page.evaluate(()=>Promise.all([document.fonts.load('800 68px BrandSans'), document.fonts.load('32px BrandMono')]));
  await page.evaluate(()=>window.ShortCreatorVisualReady || Promise.resolve());
  assert.equal(await page.locator('.logo').evaluate(image=>image.complete && image.naturalWidth>0), true);
  assert.equal(await page.evaluate(()=>document.fonts.check('800 68px BrandSans') && document.fonts.check('32px BrandMono')), true);
  const scenes = await page.locator('.scene').evaluateAll(nodes=>nodes.map(node=>({start:+node.dataset.start,end:+node.dataset.end,name:node.dataset.name})));
  assert.equal(scenes.length, episode.scenes.length);
  assert.ok(Math.abs(scenes.at(-1).end-episode.duration)<1e-6);
  const cues = JSON.parse(fs.readFileSync(path.join(out, 'captions.json'))).cues;
  const settledTime = (scene,index) => scene.end - (episode.scenes[index].presentation?.exit_duration || 0) - .01;
  for(const viewport of [{width:1080,height:1920},{width:1440,height:900},{width:390,height:844},{width:375,height:667}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
    for(const [index,scene] of scenes.entries()) {
      await page.evaluate(time=>window.ShortCreatorRenderAt(time), settledTime(scene,index));
      const inspected = await page.evaluate(()=>{
        const film=document.getElementById('film').getBoundingClientRect();
        const scene=document.querySelector('.scene[aria-hidden="false"]');
        const failures=[];
        for(const element of scene.querySelectorAll('h1,h2,.eyebrow,.caption,code,.label,.support,.tool,.approval,.destination,.check-row,.document-row')) {
          const box=element.getBoundingClientRect();
          if(box.left<film.left-1||box.right>film.right+1||box.top<film.top-1||box.bottom>film.bottom+1) failures.push('Outside film: '+element.textContent);
          if(element.clientWidth>0 && element.scrollWidth>element.clientWidth+2) failures.push('Text overflow: '+element.textContent);
        }
        const visual=scene.querySelector('.visual').getBoundingClientRect();
        const note=scene.querySelector('.caption').getBoundingClientRect();
        const heading=scene.querySelector('h1,h2').getBoundingClientRect();
        const narration=document.querySelector('.spoken-caption').getBoundingClientRect();
        if(heading.bottom>visual.top) failures.push('Heading overlaps central visual');
        if(visual.bottom>note.top) failures.push('Visual overlaps note');
        if(note.bottom>narration.top) failures.push('Scene note overlaps narration');
        for(const element of scene.querySelectorAll('.visual>*')) {
          if(element.getBoundingClientRect().bottom>note.top) failures.push('Visual content overlaps note');
        }
        for(const element of scene.querySelectorAll('.library-visual p')) {
          if(element.scrollWidth>element.clientWidth+2||element.scrollHeight>element.clientHeight+2) failures.push('Visual text overflow: '+element.textContent);
        }
        const chart=scene.querySelector('.visual-chart');
        const labels=[];
        let bounds=null;
        if(chart) {
          const box=chart.getBoundingClientRect();
          const scale=film.width/1080;
          bounds={width:box.width/scale,height:box.height/scale};
          if(chart.querySelectorAll('svg').length!==1)failures.push('Missing visual SVG');
          for(const element of chart.querySelectorAll('svg text')) {
            let visible=true;
            for(let node=element;node && node!==chart;node=node.parentElement) {
              const style=getComputedStyle(node);
              if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)visible=false;
            }
            if(!visible)continue;
            const textBox=element.getBoundingClientRect();
            labels.push({text:element.textContent,left:(textBox.left-box.left)/scale,
              right:(textBox.right-box.left)/scale,top:(textBox.top-box.top)/scale,bottom:(textBox.bottom-box.top)/scale});
          }
          const symbol=scene.querySelector('.visual-symbol');
          if(!symbol.complete||symbol.naturalWidth===0)failures.push('Missing visual symbol');
        }
        return {failures,labels,bounds};
      });
      const issues=[...inspected.failures,...inspectChartLabels(inspected.labels,inspected.bounds)];
      assert.deepEqual(issues, [], scene.name+': '+JSON.stringify(viewport));
    }
    for(const cue of cues) {
      await page.evaluate(time=>window.ShortCreatorRenderAt(time), (cue.start+cue.end)/2);
      const state = await page.locator('.spoken-caption').evaluate(node=>({text:node.textContent,overflow:node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2}));
      assert.equal(state.text, cue.text);
      assert.equal(state.overflow,false, 'Caption overflow');
    }
    report.viewports.push(viewport);
  }
  await page.setViewportSize({width:1080,height:1920});
  // Start capture with a fresh compositor: scaled preview layers cache different shadow rasters.
  await page.reload();
  await page.evaluate(async()=>{
    window.dispatchEvent(new Event('resize'));
    await document.fonts.ready;
    await (window.ShortCreatorVisualReady || Promise.resolve());
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  for(const [index,scene] of scenes.entries()) {
    const hashes=[];
    for(const time of [scene.start+.3, scene.start+(scene.end-scene.start)*.65]) {
      await page.evaluate(t=>window.ShortCreatorRenderAt(t), time);
      hashes.push(sha(await page.screenshot({clip:{x:100,y:650,width:824,height:820}})));
    }
    assert.notEqual(hashes[0],hashes[1], 'Static central visual: '+scene.name);
    const sample=scene.end-(episode.scenes[index].presentation?.exit_duration || 0)-.1;
    await page.evaluate(t=>window.ShortCreatorRenderAt(t),sample);
    const before=await page.screenshot({path:path.join(out,`scene-${index+1}.png`)});
    await page.evaluate(t=>window.ShortCreatorRenderAt(t),scene.start);
    await page.evaluate(t=>window.ShortCreatorRenderAt(t),sample);
    const after=await page.screenshot();
    if(sha(before)!==sha(after)) fs.writeFileSync(path.join(out,'seek-mismatch.png'),after,{flag:'wx'});
    assert.equal(sha(before),sha(after),'Non-deterministic seek');
    if(episode.scenes[index].layout==='visual-library') {
      const spec=episode.scenes[index];
      const entrance=scene.start+spec.motion.visual.fill[0]+spec.motion.visual.fill[1]/2;
      const exit=scene.end-(spec.presentation?.exit_duration || .2)/2;
      const transition=[];
      for(const t of [entrance,exit]) {
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),t);
        const a=sha(await page.screenshot());
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),scene.start);
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),t);
        assert.equal(a,sha(await page.screenshot()),'Non-deterministic visual transition');
        transition.push({time:t,sha256:a});
      }
      assert.notEqual(transition[0].sha256,sha(before),'Visual entrance is static');
      if(spec.presentation?.exit==='fade') assert.notEqual(transition[1].sha256,sha(before),'Visual exit is static');
      report.transitions ??= [];
      report.transitions.push({name:scene.name,presentation:spec.presentation || {reveal:'wipe-right'},samples:transition});
    }
    report.scenes.push({...scene,sample,sha256:sha(before),motion:true});
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(network,[]);
  if(mode==='render') {
    const count=Math.round(episode.duration*30);
    assert.ok(!fs.existsSync(path.join(out,'silent.mp4')));
    for(let frame=0;frame<count;frame++) {
      await page.evaluate(time=>window.ShortCreatorRenderAt(time),frame/30);
      await page.screenshot({path:path.join(frames,`frame-${String(frame).padStart(5,'0')}.png`)});
      if((frame+1)%150===0 || frame+1===count) console.log(`Captured ${frame+1}/${count}`);
    }
    report.frames=count;
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'visual-qa.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log('PASS: timed captions, four viewports, central motion and deterministic seeking');
} finally {
  await browser.close();
  // Python owns scratch cleanup, including capture/encoder failures.
}
