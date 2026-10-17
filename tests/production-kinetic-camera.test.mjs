import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-headlines','production-kinetic-camera'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorKineticCamera,plain=v=>JSON.parse(JSON.stringify(v));
const sizes=[[230,99],[180,99],[250,99],[320,99],[270,99],[280,99]];
test('measured words grow in source aspect order and every prefix has a contained camera pose',()=>{
  for(const [width,height] of [[1720,300],[940,750],[960,350],[960,480]]) {
    const words=api.layout(sizes,width,height);
    for(const [i,word] of words.entries()) {
      const pose=api.fit(word.prefix,width,height);
      for(const previous of words.slice(0,i+1)) {
        const b=previous.bounds;
        assert.ok(pose.x+b.x0*pose.scale>=0&&pose.x+b.x1*pose.scale<=width);
        assert.ok(pose.y+b.y0*pose.scale>=0&&pose.y+b.y1*pose.scale<=height);
      }
      if(i>0) {
        const previous=words[i-1].prefix;
        if((previous.x1-previous.x0)/(previous.y1-previous.y0)<width/height)assert.ok(word.x>previous.x1);
        else assert.ok(word.y>previous.y1);
      }
    }
  }
  assert.throws(()=>api.layout([],960,350));assert.throws(()=>api.layout([[NaN,99],[200,99]],960,350));
});
test('all camera beats preserve exact rest and reverse evaluation including the final resolve',()=>{
  const words=api.layout(sizes,960,480),frames=[];
  for(let active=-1;active<words.length;active++)for(let frame=0;frame<=24;frame++) {
    const state=api.state(words,960,480,active,frame/24);frames.push([active,frame,plain(state)]);
    assert.ok(state.blur.every(v=>Number.isFinite(v)&&v>=0));
    assert.ok(Object.values(state.camera).every(Number.isFinite));
    if(frame===24) {
      assert.ok(state.blur.every(v=>v===0));
      assert.equal(state.ink,active<0?0:1);
      const expected=api.fit(words[Math.max(0,active)].prefix,960,480,active===5?1.2:1.36);
      for(const key of Object.keys(expected))assert.ok(Math.abs(state.camera[key]-expected[key])<1e-9);
    }
  }
  for(const [active,frame,expected] of frames.reverse())assert.deepEqual(plain(api.state(words,960,480,active,frame/24)),expected);
  assert.throws(()=>api.state(words,960,480,10,0));
});
test('camera blur follows distance and clears before the word hold',()=>{
  const words=api.layout(sizes,960,480),sample=api.state(words,960,480,3,.24);
  assert.ok(sample.blur.some(x=>x>0));assert.ok(new Set(sample.blur).size>1);
  assert.ok(api.state(words,960,480,3,.8).blur.every(x=>x===0));
  const before=api.state(words,960,480,5,.62/1.56),after=api.state(words,960,480,5,(.62+1e-7)/1.56);
  for(const key of ['x','y','scale'])assert.ok(Math.abs(before.camera[key]-after.camera[key])<1e-5);
});
