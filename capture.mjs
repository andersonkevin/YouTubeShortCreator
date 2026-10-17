import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectChartLabels} from './chart-qa.mjs';
import {checkProduction} from './production-qa.mjs';
import {effectFrames,checkEffectSeek} from './seek-qa.mjs';

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
const composition=episode.version===3;
const cinematic=episode.version===2&&episode.scenes.every(scene=>scene.presentation?.composition==='cinematic-v1');
let configuration=null;
if(composition) {
  const html=fs.readFileSync(path.join(out,'video.html'),'utf8');
  const payload=html.match(/<script type="application\/json" id="production-scene-data">([\s\S]*?)<\/script>/);
  assert.ok(payload,'Missing compiled composition contract');configuration=JSON.parse(payload[1]);
  assert.equal(configuration.profile.id,episode.format);
  for(const axis of ['width','height'])assert.ok(Number.isInteger(configuration.profile[axis])&&configuration.profile[axis]>0&&configuration.profile[axis]<=1920);
}
const gpuBackdrops=composition&&configuration.scenes.some(scene=>scene.kind==='backdrop'&&scene.content.style.startsWith('gpu-'));
const threeBackdrops=composition&&configuration.scenes.some(scene=>scene.kind==='backdrop'&&scene.content.style.startsWith('three-'));
const liquidGlass=composition&&configuration.scenes.some(scene=>scene.kind==='interface'&&['liquid-glass','liquid-widgets'].includes(scene.content.variant));
const spatialCode=composition&&configuration.scenes.some(scene=>scene.kind==='code-story'&&['particles','dissolve','extrude'].includes(scene.content.style));
const spatialObjects=composition&&configuration.scenes.some(scene=>scene.kind==='spatial-stage');
const sourceStages=composition&&configuration.scenes.some(scene=>scene.kind==='source-stage');
const extrudedType=composition&&configuration.scenes.some(scene=>scene.kind==='spatial-stage'&&['extruded-logo','wireframe-portal-title','canopy-part-title','cuboid-carousel','device-review','phone-glass','desktop-glass'].includes(scene.content.style));
const sliceHeadlines=composition&&configuration.scenes.some(scene=>scene.kind==='headline'&&scene.content.swap==='slice-sweep');
const filmedScreens=composition&&configuration.scenes.some(scene=>scene.kind==='screen'&&scene.content.lens==='filmed');
const glassParallax=composition&&configuration.scenes.some(scene=>scene.kind==='interface'&&scene.content.variant==='glass-parallax');
const softwareRaster=(composition||cinematic)&&!gpuBackdrops&&!threeBackdrops&&!liquidGlass&&!spatialCode&&!spatialObjects&&!sourceStages&&!sliceHeadlines&&!filmedScreens&&!glassParallax;
const outputViewport=composition?{width:configuration.profile.width,height:configuration.profile.height}:{width:1080,height:1920};
const {chromium} = await import(pathToFileURL(runtime.playwright).href);
// Existing v3 and filtered v2 scenes retain software rasterization. Only an
// explicitly selected GPU composition needs hardware; every QA gate still runs.
const browser = await chromium.launch({executablePath:runtime.chrome, headless:true,
  ...(softwareRaster?{args:['--disable-gpu']}:extrudedType||sourceStages?{args:['--disable-gpu-rasterization']}:{})});
const errors = [];
const network = [];
const report = {status:'PASS', scenes:[], viewports:[], network, errors};
if(softwareRaster)report.rasterization='Chrome software (--disable-gpu)';
if(gpuBackdrops)report.rasterization='Chrome hardware with bounded native WebGPU backdrops';
if(threeBackdrops)report.rasterization=gpuBackdrops?'Chrome hardware with bounded native WebGPU and WebGL backdrops':'Chrome hardware with bounded native WebGL backdrops';
if(liquidGlass)report.rasterization='Chrome hardware with bounded liquid-glass WebGPU'+(gpuBackdrops||threeBackdrops?' and selected GPU backdrops':'');
if(spatialCode)report.rasterization='Chrome hardware with bounded spatial code'+(gpuBackdrops||threeBackdrops||liquidGlass?' and selected GPU compositions':'');
if(spatialObjects)report.rasterization='Chrome hardware with bounded spatial objects'+(gpuBackdrops||threeBackdrops||liquidGlass||spatialCode?' and selected GPU compositions':'');
if(extrudedType)report.page_rasterization='CPU (--disable-gpu-rasterization); WebGL remains enabled';
if(filmedScreens)report.rasterization='Chrome hardware with bounded filmed-screen WebGL2'+(gpuBackdrops||threeBackdrops||liquidGlass||spatialCode||spatialObjects||sliceHeadlines?' and selected GPU compositions':'');
if(glassParallax)report.rasterization='Chrome hardware with bounded glass-parallax WebGL2'+(gpuBackdrops||threeBackdrops||liquidGlass||spatialCode||spatialObjects||sliceHeadlines||filmedScreens?' and selected GPU compositions':'');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
try {
  const page = await browser.newPage({viewport:outputViewport, deviceScaleFactor:1});
  page.on('pageerror', error=>errors.push(String(error)));
  page.on('console', message=>{if(message.type()==='error') errors.push(message.text());});
  await page.route(/^https?:/, route=>{network.push(route.request().url());return route.abort();});
  await page.addInitScript(()=>window.__SHORTCREATOR_CAPTURE_MODE__=true);
  await page.goto(pathToFileURL(path.join(out, 'video.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  // Load the checked faces explicitly: a scene that never uses one of them would otherwise leave it unloaded.
  await page.evaluate(()=>Promise.all([document.fonts.load('800 68px BrandSans'), document.fonts.load('32px BrandMono')]));
  await page.evaluate(()=>window.ShortCreatorVisualReady || Promise.resolve());
  assert.deepEqual(errors,[],'Browser errors during initialization');
  assert.deepEqual(network,[],'Network requests during initialization');
  assert.equal(await page.locator('.logo').evaluate(image=>image.complete && image.naturalWidth>0), true);
  assert.equal(await page.evaluate(()=>document.fonts.check('800 68px BrandSans') && document.fonts.check('32px BrandMono')), true);
  if(composition) {
    await checkProduction(page,episode,out,report,configuration);
  } else {
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
          for(const overlay of chart.querySelectorAll('[data-effect]')) {
            const effectBox=overlay.getBoundingClientRect();
            if(effectBox.left<box.left-1||effectBox.right>box.right+1||effectBox.top<box.top-1||effectBox.bottom>box.bottom+1)
              failures.push('Effect escapes chart slot');
          }
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
      const beatChecks=[...(spec.presentation?.effects || []),...(spec.presentation?.story?.cues || []).map(cue=>({
        preset:spec.presentation.story.preset,cue,duration_frames:24}))];
      for(const effect of beatChecks) {
        const dense=spec.presentation?.composition==='cinematic-v1';
        const frames=effectFrames(cues[effect.cue].start,effect.duration_frames,dense);
        const samples=[];
        for(const frame of frames) {
          const time=frame/30;
          if(time<scene.start||time>=scene.end)continue;
          const {captured,hash}=await checkEffectSeek(page,out,time,scene.end+.01,effect.preset+' frame '+frame);
          // Crop the already captured pixels in memory, without another browser capture.
          const central=await page.evaluate(async encoded=>{
            const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
            const canvas=document.createElement('canvas');canvas.width=824;canvas.height=820;
            canvas.getContext('2d').drawImage(image,100,650,824,820,0,0,824,820);
            return canvas.toDataURL('image/png');
          },captured.toString('base64'));
          samples.push({frame,sha256:hash,central_sha256:sha(central)});
        }
        assert.ok(new Set(samples.map(sample=>sample.central_sha256)).size>1,'Effect produces no visible motion');
        report.effects ??= [];
        report.effects.push({scene:scene.name,...effect,sampling:dense?'every effect frame plus boundary neighbors':'boundary and midpoint',samples});
      }
    }
    report.scenes.push({...scene,sample,sha256:sha(before),motion:true});
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(network,[]);
  if(episode.scenes.every(scene=>scene.presentation?.composition==='cinematic-v1')) {
    report.seams=[];
    for(let index=1;index<scenes.length;index++) {
      const cut=scenes[index].start,frame=Math.ceil(cut*30);
      const kind=episode.scenes[index-1].presentation.transition,samples=[];
      for(const offset of [-12,-6,-3,-2,-1,0,1,2,3,6,12]) {
        const time=(frame+offset)/30;
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),time);
        const pixels=await page.screenshot();
        const state=await page.evaluate(()=>{
          const visible=[...document.querySelectorAll('.scene')].filter(node=>getComputedStyle(node).visibility==='visible');
          const stage=visible[0].querySelector('.cinema-stage').getBoundingClientRect();
          const caption=document.querySelector('.spoken-caption').getBoundingClientRect();
          const logo=document.querySelector('.logo').getBoundingClientRect();
          return {visible:visible.length,name:visible[0].dataset.name,center:(stage.left+stage.right)/2,width:stage.width,
            caption:[caption.left,caption.top,caption.width,caption.height],logo:[logo.left,logo.top,logo.width,logo.height],
            ground:getComputedStyle(document.getElementById('film')).backgroundColor};
        });
        assert.equal(state.visible,1,'Scene overlap at cinematic seam');
        assert.deepEqual(state.caption,[100,1590,824,164],'Cinematic seam moves caption safe zone');
        assert.notEqual(state.ground,'rgba(0, 0, 0, 0)','Transparent cinematic ground');
        if(samples.length){assert.deepEqual(state.logo,samples[0].logo);assert.equal(state.ground,samples[0].ground);}
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),scenes[index].end-.5);
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),time);
        assert.equal(sha(pixels),sha(await page.screenshot()),'Non-deterministic cinematic seam: '+kind+' frame '+(frame+offset));
        samples.push({frame:frame+offset,time,offset,sha256:sha(pixels),...state});
      }
      const before=samples.filter(s=>s.offset<0),after=samples.filter(s=>s.offset>=0);
      const property=kind==='cut-left'?'center':'width',direction=kind==='cut-left'?-1:1;
      const outgoing=before.at(-1)[property]-before.at(-2)[property];
      const incoming=after[1][property]-after[0][property];
      assert.ok(outgoing*direction>1&&incoming*direction>1,'Seam loses its motion direction');
      const speedRatio=Math.abs(incoming/outgoing);
      assert.ok(speedRatio>=.4&&speedRatio<=2.5,'Seam velocity discontinuity');
      report.seams.push({kind,cut,speed_ratio:speedRatio,samples});
    }
  }
  }
  assert.deepEqual(errors,[],'Browser errors during visual validation');
  assert.deepEqual(network,[],'Network requests during visual validation');
  if(mode==='render') {
    const count=Math.round(episode.duration*30);
    assert.ok(count>0&&count<=(composition?18000:5400));
    assert.ok(!fs.existsSync(path.join(out,'silent.mp4')));
    const captureStarted=performance.now();
    let bytes=0,peakFrameBytes=0,minimumFreeBytes=Infinity;
    for(let frame=0;frame<count;frame++) {
      await page.evaluate(time=>window.ShortCreatorRenderAt(time),frame/30);
      const image=await page.screenshot();
      assert.deepEqual(errors,[],'Browser errors at capture frame '+frame);
      assert.deepEqual(network,[],'Network requests at capture frame '+frame);
      peakFrameBytes=Math.max(peakFrameBytes,image.length);
      if(composition&&(frame===0||frame%150===0)) {
        const disk=fs.statfsSync(frames),free=disk.bavail*disk.bsize;
        minimumFreeBytes=Math.min(minimumFreeBytes,free);
        const required=Math.ceil(peakFrameBytes*(count-frame)*1.5)+2_000_000_000;
        assert.ok(free>=required,'Insufficient scratch space for the remaining capture and encoding reserve');
      }
      fs.writeFileSync(path.join(frames,`frame-${String(frame).padStart(5,'0')}.png`),image,{flag:'wx'});
      bytes+=image.length;
      if((frame+1)%150===0 || frame+1===count) console.log(`Captured ${frame+1}/${count}`);
    }
    report.frames=count;
    if(composition)report.resources={capture_seconds:(performance.now()-captureStarted)/1000,
      png_bytes:bytes,largest_png_bytes:peakFrameBytes,minimum_free_bytes:minimumFreeBytes};
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(network,[]);
  fs.writeFileSync(path.join(out,'visual-qa.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log('PASS: timed captions, four viewports, central motion and deterministic seeking');
} finally {
  await browser.close();
  // Python owns scratch cleanup, including capture/encoder failures.
}
