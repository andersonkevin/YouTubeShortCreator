import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Uint8ClampedArray};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-gpu-backdrops.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorGpuBackdrops,plain=value=>JSON.parse(JSON.stringify(value));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('36 fixed definitions are selected without exposing source props',()=>{
  assert.equal(api.kinds.length,36);assert.equal(new Set(Object.values(api.shaders)).size,36);
  assert.equal(api.shaders['gpu-chrome-orb'],'Chrome');assert.equal(api.shaders['gpu-strands'],'Strands');
  assert.throws(()=>api.mount(null,{style:'constructor'},[],null,null));
  assert.throws(()=>api.mount(null,{style:'gpu-aurora'},[],null,null));
});
test('two caption anchors drive an absolute clock with continuous braking and exact rest',()=>{
  for(const onsets of [[.5,2.5],[1/30,101/30],[10.411,110.411]]) {
    const first=Math.ceil(onsets[0]*30),last=Math.ceil(onsets[1]*30),frames=[];
    for(let i=first-1;i<=last+30;i++) {
      const s=api.clock(i/30,onsets);frames.push(plain(s));
      assert.ok(s.seconds>=0&&s.seconds<=2);assert.ok(s.entry>=0&&s.entry<=1);
      if(i<first){assert.equal(s.seconds,0);assert.equal(s.visible,false);}
      if(i>=last+24){assert.equal(s.seconds,2);assert.equal(s.settle,1);}
    }
    assert.ok(frames.every((s,i)=>i===0||s.seconds>=frames[i-1].seconds));
    for(let i=frames.length-1;i>=0;i--)assert.deepEqual(plain(api.clock((first-1+i)/30,onsets)),frames[i]);
    const before=api.clock((last-1)/30,onsets).seconds,at=api.clock(last/30,onsets).seconds;
    const next=api.clock((last+1)/30,onsets).seconds;
    assert.ok(Math.abs((next-at)/(at-before)-1)<.003);
    assert.ok(2-api.clock((last+23)/30,onsets).seconds<.00005);
  }
  for(const onsets of [[],[0],[2,1],[0,1.9],[0,NaN]])assert.throws(()=>api.clock(1,onsets));
  assert.throws(()=>api.clock(NaN,[0,2]));
});
test('palette mapping preserves brand endpoints, opacity and pixel order',()=>{
  const colors={background:'#140b30',secondary:'#7acbd7',accent:'#beda61'},table=api.palette(colors);
  assert.equal(table.length,768);assert.deepEqual([...table.slice(0,3)],[20,11,48]);
  assert.deepEqual([...table.slice(-3)],[190,218,97]);
  const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,220,90,33,0]);api.recolor(pixels,table);
  assert.deepEqual([...pixels],[20,11,48,255,190,218,97,255,20,11,48,255]);
  for(const key of Object.keys(colors))assert.throws(()=>api.palette({...colors,[key]:'url(remote)'}));
  assert.throws(()=>api.recolor(new Uint8ClampedArray(3),table));
  assert.throws(()=>api.recolor([],table));
  assert.throws(()=>api.recolor(new Uint8ClampedArray(4),new Uint8ClampedArray(3)));
});
test('the main render entry point returns asynchronous visual completion',async()=>{
  let resolve;const pending=new Promise(r=>{resolve=r;}),progress={style:{}};
  const film={dataset:{duration:'10',width:'1080',height:'1920'},style:{setProperty(){}},offsetWidth:1080,
    querySelectorAll:()=>[],querySelector:()=>progress};
  const caption={textContent:''};
  const c={window:{__SHORTCREATOR_CAPTURE_MODE__:true,addEventListener(){},ShortCreatorVisualRenderAt:()=>pending},
    document:{getElementById:id=>id==='film'?film:{textContent:JSON.stringify({duration:10,cues:[{text:'Exact narration',start:3,end:5}]})},
      querySelector:()=>caption},innerWidth:1080,innerHeight:1920};
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/motion.js',import.meta.url),'utf8'),c);
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/spoken-captions.js',import.meta.url),'utf8'),c);
  const result=c.window.ShortCreatorRenderAt(4);assert.equal(result,pending);assert.equal(progress.style.width,'40%');
  assert.equal(caption.textContent,'Exact narration');
  let done=false;result.then(()=>{done=true;});await Promise.resolve();assert.equal(done,false);
  resolve();await result;assert.equal(done,true);
});
test('preview waits for readiness and drives captions from one non-overlapping frame loop',async()=>{
  let readyResolve,paintResolve,active=false;
  const ready=new Promise(r=>{readyResolve=r;}),paint=new Promise(r=>{paintResolve=r;}),callbacks=[],frames=[];
  const progress={style:{}},caption={textContent:''};
  const film={dataset:{duration:'10',width:'1080',height:'1920'},style:{setProperty(){}},offsetWidth:1080,
    querySelectorAll:()=>[],querySelector:()=>progress};
  const c={window:{addEventListener(){},ShortCreatorVisualReady:ready,ShortCreatorVisualRenderAt:t=>{frames.push(t);return active?paint:undefined;}},
    document:{getElementById:id=>id==='film'?film:{textContent:JSON.stringify({duration:10,cues:[{text:'Same clock',start:.25,end:1}]})},querySelector:()=>caption},
    innerWidth:1080,innerHeight:1920,performance:{now:()=>1000},requestAnimationFrame:cb=>callbacks.push(cb),console};
  for(const name of ['motion','spoken-captions'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),c);
  await Promise.resolve();assert.equal(callbacks.length,0);
  readyResolve();await ready;await Promise.resolve();assert.equal(callbacks.length,1);
  active=true;const frame=callbacks.shift()(1500);
  assert.equal(frames.at(-1),.5);assert.equal(caption.textContent,'Same clock');assert.equal(callbacks.length,0);
  paintResolve();await frame;assert.equal(callbacks.length,1);
});
