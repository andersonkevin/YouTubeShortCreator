import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-interface-motion.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorInterfaceMotion,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
test('swipe keeps contact ahead of rail, carries momentum, then snaps one pitch',()=>{
 const a=api.gesture('swipe-rail',1.28/2.2),b=api.gesture('swipe-rail',1.56/2.2),end=api.gesture('swipe-rail',1);
 near(a.travel,23/50);near(a.contactX,-.28);near(a.contact,1);near(b.travel,38/50);
 near(end.travel,1);near(end.contact,0);near(end.select,1);
 assert.ok(Array.from({length:25},(_,i)=>api.gesture('swipe-rail',i/24).travel).some(v=>v>1));
});
test('velocity throw retains source braking split and exact landing',()=>{
 const begin=api.gesture('velocity-throw-snap',0),handoff=api.gesture('velocity-throw-snap',.78/1.4),end=api.gesture('velocity-throw-snap',1);
 near(begin.travel,1);near(begin.y,.07);near(handoff.travel,.16/1.4);near(handoff.y,-.014);
 near(end.travel,0);near(end.y,0);near(end.tilt,0);near(end.select,1);near(end.aura,.58);
});
test('stack arc has a zero-slope apex, small landing overshoot and no residual bump',()=>{
 near(api.land(0,.06),0);near(api.land(.62,.06),1.06);near(api.land(1,.06),1);
 near(api.gesture('spring-stack-shuffle',1).bump,0);
 const a=api.cardPose('spring-stack-shuffle',2,2,.34/1.18,4,1000,600);
 const b=api.cardPose('spring-stack-shuffle',2,2,(.34+1e-5)/1.18,4,1000,600);
 assert.ok(Math.abs(a.y-b.y)<1e-5);assert.equal(a.z,60);
 const end=api.cardPose('spring-stack-shuffle',2,2,1,4,1000,600);near(end.scale,1);near(end.veil,0);assert.equal(end.z,40);
});
test('FLIP maps both rectangles while inverse child transforms preserve glyph scale',()=>{
 const home={x:100,y:120,w:700,h:400},away={x:260,y:240,w:380,h:160};
 for(let i=0;i<=24;i++){
  const p=i/24,f=api.flip(home,away,p);near(f.sx*f.copyScaleX,1);near(f.sy*f.copyScaleY,1);
  near(f.r.x+(28+f.copyX)*f.sx,f.r.x+28);near(f.r.y+(28+f.copyY)*f.sy,f.r.y+28);
 }
 assert.deepEqual(plain(api.flip(home,away,0).r),away);assert.deepEqual(plain(api.flip(home,away,1).r),home);
 const values=Array.from({length:1001},(_,i)=>api.gesture('modal-morph-snappy',i/1000).expand);
 assert.ok(Math.max(...values)>1&&Math.max(...values)<1.02);
});
test('refresh applies nonlinear drag resistance and returns to rest before holding',()=>{
 near(api.rubberBand(0),0);near(api.rubberBand(120),66/(66/640+1));
 assert.ok(api.rubberBand(220)<api.rubberBand(120)*220/120);
 for(const name of api.variants.filter(v=>v.startsWith('pull-to-refresh'))){
  const peak=api.gesture(name,.82/2.45),end=api.gesture(name,1);
  near(peak.y,api.rubberBand(120)/640);near(end.y,0);near(end.alpha,0);near(end.replace,1);
 }
});
test('toggle anticipates, overshoots and settles with no ambient pulse',()=>{
 const press=api.gesture('toggle-flip',.4/.9);near(press.pressX,.94);near(press.pressY,1.06);
 assert.ok(Array.from({length:25},(_,i)=>api.gesture('toggle-flip',i/24).mix).some(v=>v>1));
 const end=api.gesture('toggle-flip',1);near(end.mix,1);near(end.pressX,1);near(end.pressY,1);near(end.knobScale,1);near(end.glow,0);assert.equal(end.done,true);
});
test('every settled step remains fully inside all native board sizes',()=>{
 for(const name of api.variants.filter(v=>v!=='toggle-flip'))for(const [W,H] of [[1728,418],[888,1060],[888,418],[888,724]])for(const count of [2,3,4])for(let i=0;i<count;i++) {
  const s=api.cardPose(name,i,i,1,count,W,H),r=s.flip?s.flip.r:{x:s.x+(1-s.scale)*s.w/2,y:s.y+(1-s.scale)*s.h/2,w:s.w*s.scale,h:s.h*s.scale};
  assert.ok(r.x>=-1e-8&&r.y>=-1e-8&&r.x+r.w<=W+1e-8&&r.y+r.h<=H+1e-8,name);
  near(s.opacity,1);assert.equal(s.copy,true);
 }
});
test('motion state is finite and seek-order independent at every native cue frame',()=>{
 const finite=v=>typeof v==='number'?Number.isFinite(v):v&&typeof v==='object'?Object.values(v).every(finite):true;
 for(const name of api.variants){
  const frames=Array.from({length:25},(_,i)=>plain(api.gesture(name,i/24)));assert.ok(frames.every(finite));
  for(let i=24;i>=0;i--)assert.deepEqual(plain(api.gesture(name,i/24)),frames[i]);
 }
 assert.throws(()=>api.gesture('script',.5));assert.throws(()=>api.gesture('swipe-rail',NaN));
});
test('station pans use the original 78-percent cards, 6-percent gap and sine travel',()=>{
 for(const p of [0,.25,.5,.75,1]) {
  const s=api.cardPose('pan-stations',1,1,p,3,1000,600);
  near(s.w,780);near(s.h,384);near(s.y,108);
  near(s.x,110+840*(1-(1-Math.cos(Math.PI*p))/2));
 }
 const before=api.cardPose('pan-stations',0,1,0,3,1000,600);
 near(before.x,110);assert.equal(before.copy,true);
 assert.equal(api.cardPose('pan-stations',0,1,1,3,1000,600).copy,false);
});
test('panels expand their body with power3.inOut while preserving fixed text scale',()=>{
 for(const [p,expected] of [[0,0],[.25,.03125],[.5,.5],[.75,.96875],[1,1]]) {
  const s=api.cardPose('panel-reveal',1,1,p,3,1000,600);
  near(s.h,104+(468-104)*expected);near(s.body,expected);near(s.panelOpen,expected);
  near(s.w,820);near(s.scale,1);assert.equal(s.flip,undefined);
  assert.equal(api.cardPose('panel-reveal',0,1,p,3,1000,600).opacity,0);
 }
});
