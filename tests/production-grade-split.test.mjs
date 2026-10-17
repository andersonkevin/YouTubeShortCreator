import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';
const context={window:{ShortCreatorCarouselPresets:{}}};
for(const name of ['production-carousels','production-grade-split-shader','production-grade-split'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const effect=context.window.ShortCreatorGradeSplit,shader=context.window.ShortCreatorGradeSplitShader;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
test('selective shader pins the retained primary, grain and vignette pipeline',()=>{
  assert.equal(crypto.createHash('sha256').update(shader.fragment).digest('hex'),'00c8500f1815b5701c969c772e1290bc6ddc2cec43a9600060c896922a417c4c');
  assert.ok(!shader.fragment.includes('u_lut'));assert.ok(!shader.fragment.includes('u_secondaryCount'));
  assert.ok(shader.fragment.includes('grainBase + grainFine * 0.35'));
  assert.ok(shader.fragment.includes('vignetteMask * clamp(u_vignette, 0.0, 1.0) * 0.75'));
});
test('explicit source adjustments override presets rather than being added',()=>{
  const u=effect.uniforms('warm-cinematic',2);
  near(u.u_exposure,.02);near(u.u_contrast,.28);near(u.u_shadows,.08);near(u.u_saturation,.1);
  near(u.u_vignette,.3);near(u.u_vignetteFeather,.7);near(u.u_grain,.1);near(u.u_grainSize,.3);
  near(effect.uniforms('flat',2).u_tint,0);near(effect.uniforms('bleach-bypass',2).u_grain,.18);
  assert.equal(effect.uniforms('cool-teal',2).u_grainSeed-effect.uniforms('cool-teal',0).u_grainSeed,120);
  for(const [look,t] of [['other',0],['flat',-1],['flat',NaN],['flat',6.1]])assert.throws(()=>effect.uniforms(look,t));
});
test('source comparison holds, commits and reaches exact finite rest',()=>{
  const a=effect.state(0,1000);near(a.width,0);near(a.scale,1.05);near(a.before,0);near(a.after,0);
  for(const t of [2.3,2.7,3.1]){const s=effect.state(t,1000);near(s.width,620);near(s.before,.82);near(s.after,1);near(s.edge,1);}
  const s=effect.state(6,1000);near(s.width,1000);near(s.scale,1.03);near(s.before,0);near(s.edge,0);near(s.after,1);
  assert.deepEqual(plain(effect.state(600,1000)),plain(s));
  assert.equal(effect.state(2.5,999,25).hold,250);
  assert.equal(effect.state(2.5,999,85).hold,849);
});
test('source custom Bezier curves agree with an independent bisection oracle',()=>{
  const solve=(x,a,b,c,d)=>{
    let lo=0,hi=1;
    for(let i=0;i<60;i++){const t=(lo+hi)/2,z=3*(1-t)**2*t*a+3*(1-t)*t*t*c+t**3;if(z<x)lo=t;else hi=t;}
    const t=(lo+hi)/2;return 3*(1-t)**2*t*b+3*(1-t)*t*t*d+t**3;
  };
  for(let i=1;i<30;i++){
    const p=i/30,s=effect.state(.7+1.6*p,1000);
    assert.ok(Math.abs(s.width-620*solve(p,.62,0,.14,1))<.0002);
    const final=effect.state(3.1+1.2*p,1000);
    assert.ok(Math.abs(final.width-(620+380*solve(p,.4,0,.05,1)))<.0002);
  }
});
test('native plate contains its maximum scale in four formats',()=>{
  for(const [w,h] of [[1720,475],[940,910],[960,460],[960,620]]){
    const g=effect.geometry(w,h);
    assert.ok(g.x-g.w*.025>=0);assert.ok(g.x+g.w*1.025<=w);
    assert.ok(g.y-g.h*.025>=0);assert.ok(g.y+g.h*1.025<=h-52);
  }
  for(const size of [[0,200],[4097,200],[300,99]])assert.throws(()=>effect.geometry(...size));
});
test('closed style options and cue clock are reversible near ten minutes',()=>{
  const opts={look:'cool-teal',split:62,edge:'hidden',labels:false};assert.equal(effect.options(opts),opts);
  for(const bad of [{...opts,split:24},{...opts,labels:'on'},{...opts,html:'x'},{...opts,look:'flat'}])assert.throws(()=>effect.options(bad));
  const cues=[590.5,596.5],samples=Array.from({length:300},(_,i)=>plain(effect.clock(590+i/30,cues)));
  for(let i=samples.length-1;i>=0;i--)assert.deepEqual(plain(effect.clock(590+i/30,cues)),samples[i]);
  near(samples.at(-1).time,6);assert.equal(samples[0].visible,false);
  assert.throws(()=>effect.clock(0,[0,5.9]));
  assert.deepEqual(plain(effect.stats()),{contexts:0});
  context.document={createElement:()=>({getContext:()=>null})};
  assert.throws(()=>effect.draw({width:100,height:100},{complete:true,naturalWidth:100},'flat',0),/requires local WebGL/);
  assert.deepEqual(plain(effect.stats()),{contexts:0});
});
