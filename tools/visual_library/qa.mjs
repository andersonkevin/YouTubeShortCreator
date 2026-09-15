import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

const home=path.dirname(fileURLToPath(import.meta.url));
const [workspace,requested,playwrightPath,chromePath,approval]=process.argv.slice(2);
assert.equal(process.argv.length,7,'Expected workspace, run ID, Playwright, Chrome and approval');
assert.equal(approval,'--approve-write','QA writes exports and requires explicit approval');
assert.match(requested || '',/^[a-z][a-z0-9-]{0,47}$/);
const root=path.resolve(workspace);
for(let node=root;;node=path.dirname(node)){
  assert.ok(!fs.lstatSync(node).isSymbolicLink(),'Symlink workspace blocked');
  if(node===path.dirname(node))break;
}
const repo=path.resolve(home,'../..');
const relative=path.relative(repo,root);
assert.ok(relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||['workspace','workspaces'].includes(relative.split(path.sep)[0]),'Private workspace required');
const output=fs.realpathSync(path.join(root,'visuals',requested));
assert.equal(output,path.join(root,'visuals',requested));
const qa=path.join(output,'qa');
assert.ok(!fs.existsSync(qa),'QA evidence already exists');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const build=JSON.parse(fs.readFileSync(path.join(output,'build.json')));
assert.equal(sha(fs.readFileSync(path.join(output,'index.html'))),build.index_sha256,'Built HTML changed');
for(const [name,expected] of Object.entries(build.implementation_hashes)){
  assert.equal(path.basename(name),name);
  assert.equal(sha(fs.readFileSync(path.join(home,name))),expected,'Implementation changed; rebuild first');
}
const {chromium}=await import(pathToFileURL(path.resolve(playwrightPath)).href);
const browser=await chromium.launch({executablePath:path.resolve(chromePath),headless:true});
const errors=[];const network=[];
const report={status:'PASS',viewports:[],samples:[],errors,network,production_integration:false,browser:browser.version(),exports:[]};
fs.mkdirSync(qa);
try {
  const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route(/^https?:/,route=>{network.push(route.request().url());return route.abort();});
  await page.goto(pathToFileURL(path.join(output,'index.html')).href);
  await page.waitForFunction(()=>window.VisualLibrary);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.decode()));});
  const ids=await page.evaluate(()=>window.VisualLibrary.ids);
  assert.equal(ids.length,build.charts);
  for(const id of ids)assert.match(id,/^[a-z][a-z0-9-]{0,39}$/);
  for(const viewport of [{width:1440,height:1200},{width:390,height:844},{width:375,height:667}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    for(const id of ids){
      await page.evaluate(id=>{window.VisualLibrary.select(id);window.VisualLibrary.renderAt(4);},id);
      const problems=await page.evaluate(()=>{
        const failures=[];const frame=document.getElementById('frame').getBoundingClientRect();
        const viewport=document.querySelector('.viewport').getBoundingClientRect();
        if(Math.abs(frame.width-viewport.width)>1||Math.abs(frame.height-viewport.height)>1||Math.abs(frame.left-viewport.left)>1||Math.abs(frame.top-viewport.top)>1)failures.push('Frame is not fitted to viewport');
        if(document.documentElement.scrollWidth>innerWidth+1)failures.push('Page horizontal overflow');
        for(const el of document.querySelectorAll('#frame h1,#eyebrow,#detail,#insight,footer')){
          const box=el.getBoundingClientRect();
          if(box.left<frame.left-1||box.right>frame.right+1||box.bottom>frame.bottom+1)failures.push('Outside frame '+el.textContent);
          if(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)failures.push('Text overflow '+el.textContent);
        }
        if(document.getElementById('insight').getBoundingClientRect().bottom>document.querySelector('footer').getBoundingClientRect().top)failures.push('Insight/source overlap');
        const chart=document.getElementById('chart').getBoundingClientRect();
        for(const el of document.querySelectorAll('#chart svg text')){
          const box=el.getBoundingClientRect();
          if(box.width>0&&(box.left<chart.left-1||box.right>chart.right+1||box.top<chart.top-1||box.bottom>chart.bottom+1))failures.push('Chart text clipped '+el.textContent);
        }
        return failures;
      });
      assert.deepEqual(problems,[],id+' '+JSON.stringify(viewport));
      assert.equal(await page.locator('#chart svg').count(),1,'Missing SVG');
      assert.ok(await page.locator('#chart svg path,#chart svg rect,#chart svg text,#chart svg image').count()>3,'Empty visual');
      const before=sha(await page.locator('#chart').screenshot());
      await page.evaluate(()=>window.VisualLibrary.renderAt(0.2));
      const early=sha(await page.locator('#chart').screenshot());
      assert.notEqual(before,early,'Missing reveal motion');
      await page.evaluate(()=>window.VisualLibrary.renderAt(4));
      assert.equal(before,sha(await page.locator('#chart').screenshot()),'Non-deterministic seek');
      report.samples.push({id,...viewport,sha256:before});
      if(viewport.width===1440){
        await page.locator('.viewport').screenshot({path:path.join(qa,id+'.png')});
        const svg=await page.evaluate(()=>window.VisualLibrary.svg());
        fs.writeFileSync(path.join(qa,id+'.svg'),svg,{flag:'wx'});
        const source=await page.evaluate(id=>window.visualLibraryData.charts.find(c=>c.id===id),id);
        fs.writeFileSync(path.join(qa,id+'.json'),JSON.stringify({source,dimensions:[880,810],status:'review_required',svg_sha256:sha(svg),vendor_manifest_sha256:build.vendor_manifest_sha256},null,2)+'\n',{flag:'wx'});
        const assetPage=await browser.newPage({viewport:{width:880,height:810},deviceScaleFactor:1});
        try{
          assetPage.on('pageerror',e=>errors.push(String(e)));
          await assetPage.route(/^https?:/,route=>{network.push(route.request().url());return route.abort();});
          await assetPage.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'"><body></body>');
          // Rasterize the complete SVG after decoding; DOM screenshots can race nested image paints.
          const raster=await assetPage.evaluate(async svg=>{
            const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
            await image.decode();
            const canvas=document.createElement('canvas');canvas.width=880;canvas.height=810;
            const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
            const pixels=ctx.getImageData(0,0,880,810).data;
            let nonblack=0,bright=0,centerBright=0;
            for(let i=0;i<pixels.length;i+=4){if(Math.max(...pixels.subarray(i,i+3))>20)nonblack++;if(Math.min(...pixels.subarray(i,i+3))>180){bright++;if((i/4)%880>300)centerBright++;}}
            return {png:canvas.toDataURL('image/png').split(',')[1],nonblack,bright,centerBright};
          },svg);
          assert.ok(raster.nonblack>10000&&raster.bright>200,'Blank or incomplete asset raster: '+id);
          if(['flow','metric','comparison'].includes(source.kind))assert.ok(raster.centerBright>200,'Widget text missing from raster: '+id);
          fs.writeFileSync(path.join(qa,id+'-asset.png'),Buffer.from(raster.png,'base64'),{flag:'wx'});
          report.exports.push({id,svg_sha256:sha(svg),png_sha256:sha(fs.readFileSync(path.join(qa,id+'-asset.png'))),dimensions:[880,810],pixel_check:{nonblack:raster.nonblack,bright:raster.bright,center_bright:raster.centerBright}});
        }finally{await assetPage.close();}
      }
    }
    report.viewports.push(viewport);
  }
  await page.locator('nav button').last().click();
  assert.equal(await page.locator('nav button[aria-pressed="true"]').getAttribute('data-id'),ids.at(-1));
  await page.evaluate(()=>window.VisualLibrary.renderAt(0));
  await page.getByRole('button',{name:'Play preview',exact:true}).click();
  await page.waitForFunction(()=>Number(document.getElementById('time').value)>0.2);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.setViewportSize({width:1440,height:1200});
  await page.evaluate(id=>{window.VisualLibrary.select(id);window.VisualLibrary.renderAt(4);},ids[0]);
  await page.screenshot({path:path.join(qa,'gallery-desktop.png'),fullPage:true});
  assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  assert.equal(sha(fs.readFileSync(path.join(output,'index.html'))),build.index_sha256,'HTML changed during QA');
  console.log(`PASS: ${ids.length} visuals, 3 viewports, deterministic reveal, exports, selection/playback, no remote requests.`);
} catch(error) {
  fs.writeFileSync(path.join(qa,'failure.json'),JSON.stringify({status:'FAILED',error:String(error)},null,2),{flag:'wx'});
  throw error;
} finally {await browser.close();}
