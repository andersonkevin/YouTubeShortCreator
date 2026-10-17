import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';

const context={window:{}};
for(const name of ['production-gpu-backdrops','production-halftone-shader','production-halftone'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const effect=context.window.ShortCreatorHalftone,shader=context.window.ShortCreatorHalftoneShader;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const colors={background:'#1d0b34',accent:'#cfff69',secondary:'#66d4ff'};

test('retains the exact source shader and fixed source dial mapping',()=>{
  assert.equal(shader.source_sha256,'4b8e56dd736713db5a01274fb4fa5f96cf8ae7f4b3375772abf92d574efd3a08');
  assert.equal(crypto.createHash('sha256').update(shader.fragment).digest('hex'),'686a102e9153a128841ba5585bd34dce0f1708d704a141680ccf47ca44e0b5a6');
  near(effect.recipe.frequency,.9333333333333333);near(effect.recipe.speed,.25);
  near(effect.recipe.cell,34.90909090909091);near(effect.recipe.gamma,4.842105263157895);near(effect.recipe.bias,.1);
  assert.ok(Object.isFrozen(effect.recipe));assert.ok(Object.isFrozen(shader));
});
test('time reaches ten seconds with finite settling and exact reverse seeks near the duration limit',()=>{
  const starts=[590.415,595.415],samples=[];
  for(let frame=17700;frame<=18000;frame++)samples.push(plain(effect.clock(frame/30,starts)));
  assert.equal(samples[0].sourceTime,0);assert.equal(samples.at(-1).sourceTime,10);
  for(let i=1;i<samples.length;i++)assert.ok(samples[i].sourceTime>=samples[i-1].sourceTime);
  for(let i=samples.length-1;i>=0;i--)assert.deepEqual(plain(effect.clock((17700+i)/30,starts)),samples[i]);
  assert.deepEqual(plain(effect.clock(600,starts)),plain(effect.clock(900,starts)));
  const finalFrame=Math.ceil(starts[1]*30)+24;
  assert.equal(effect.clock(finalFrame/30,starts).sourceTime,10);
  assert.ok(effect.clock((finalFrame-1)/30,starts).sourceTime<10);
});
test('clock rejects missing anchors and undersized gaps',()=>{
  for(const [time,cues] of [[NaN,[.5,5.5]],[1,[.5]],[1,[.5,2.499]],[1,[1,Infinity]]])
    assert.throws(()=>effect.clock(time,cues));
});
test('palette takes only approved brand colors without mutating them',()=>{
  const before={...colors},p=effect.palette(colors);
  assert.deepEqual(plain(p.stops),[[102/255,212/255,1],[207/255,1,105/255],[29/255,11/255,52/255],[29/255,11/255,52/255]]);
  assert.deepEqual(colors,before);
  for(const hex of ['red','#fff','url(example)','rgba(0,0,0,1)',null])
    assert.throws(()=>effect.palette({...colors,accent:hex}));
});
test('frame boundary rejects invalid dimensions and time before touching a GPU',()=>{
  for(const [w,h,t] of [[0,100,0],[100,4097,1],[1.1,100,1],[100,100,NaN],[100,100,-1],[100,100,10.1]])
    assert.throws(()=>effect.draw({},w,h,t,colors),/Invalid halftone frame/);
  assert.deepEqual(plain(effect.stats()),{contexts:0});
});
test('missing WebGL fails explicitly instead of returning a blank frame',()=>{
  context.document={createElement:()=>({getContext:()=>null})};
  assert.throws(()=>effect.draw({},100,100,1,colors),/requires local WebGL/);
  assert.deepEqual(plain(effect.stats()),{contexts:0});
});
