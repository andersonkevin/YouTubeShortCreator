import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const capture=fileURLToPath(new URL('../capture.mjs',import.meta.url));
function launchOptions(scene,version=3,visuals){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'shortcreator-capture-selection-'));
  try{
    const run=path.join(root,'runs','test');fs.mkdirSync(run,{recursive:true});
    const playwright=path.join(root,'playwright.mjs');
    fs.writeFileSync(playwright,'export const chromium={launch:async options=>{console.log(JSON.stringify(options));throw new Error("CAPTURE_LAUNCH_OBSERVED");}};');
    fs.writeFileSync(path.join(root,'runtime.json'),JSON.stringify({paths:{playwright,chrome:'test-only-browser'}}));
    fs.writeFileSync(path.join(run,'episode.json'),JSON.stringify({version,format:'landscape',scenes:[scene],...(visuals?{visuals}:{})}));
    const configuration={profile:{id:'landscape',width:1920,height:1080},scenes:[scene]};
    fs.writeFileSync(path.join(run,'video.html'),'<script type="application/json" id="production-scene-data">'+JSON.stringify(configuration)+'</script>');
    const result=spawnSync(process.execPath,[capture,root,run,'qa'],{encoding:'utf8'});
    assert.equal(result.status,1);assert.match(result.stderr,/CAPTURE_LAUNCH_OBSERVED/);
    return JSON.parse(result.stdout.trim());
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}

test('native glass parallax uses hardware while ordinary interface scenes retain software rasterization',()=>{
  const glass=launchOptions({kind:'interface',content:{style:'steps',variant:'glass-parallax'}});
  assert.equal(glass.args,undefined);assert.equal(glass.headless,true);
  const plain=launchOptions({kind:'interface',content:{style:'steps'}});
  assert.deepEqual(plain.args,['--disable-gpu']);
});

test('existing explicit GPU choices keep hardware and cinematic scenes retain software',()=>{
  for(const scene of [
    {kind:'backdrop',content:{style:'gpu-waves'}},
    {kind:'backdrop',content:{style:'three-galaxy'}},
    {kind:'interface',content:{variant:'liquid-glass'}},
    {kind:'interface',content:{variant:'liquid-widgets'}},
    {kind:'code-story',content:{style:'extrude'}},
    {kind:'spatial-stage',content:{}},
    {kind:'headline',content:{swap:'slice-sweep'}},
    {kind:'screen',content:{lens:'filmed'}}
  ])assert.equal(launchOptions(scene).args,undefined);
  assert.deepEqual(launchOptions({presentation:{composition:'cinematic-v1'}},2).args,['--disable-gpu']);
});

test('approved-font extrusion keeps WebGL but rasterizes page layers on CPU',()=>{
  for(const style of ['extruded-logo','wireframe-portal-title','canopy-part-title','cuboid-carousel','device-review','phone-glass','desktop-glass']){
    const options=launchOptions({kind:'spatial-stage',content:{style}});
    assert.deepEqual(options.args,['--disable-gpu-rasterization']);assert.equal(options.headless,true);
  }
});

test('retained source stages preserve GPU rendering with stable CPU page rasterization',()=>{
  for(const style of ['glass-shard','frost-orbit'])
    assert.deepEqual(launchOptions({kind:'source-stage',content:{style}}).args,['--disable-gpu-rasterization']);
});

test('opt-in editorial SVGs use software rasterization without changing ordinary legacy scenes',()=>{
  for(const kind of ['editorial','news-media'])
    assert.deepEqual(launchOptions({layout:'visual-library',visual_id:'sample'},2,{sample:{kind}}).args,['--disable-gpu']);
  assert.equal(launchOptions({layout:'visual-library',visual_id:'sample'},2,{sample:{kind:'bar'}}).args,undefined);
});
