import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-annotation-ink','production-annotations'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const {hash,pathData,penEase,fit,penPose,maskId,penTravelHeight}=context.window.ShortCreatorAnnotationInk;
const {activeAt,pointerState}=context.window.ShortCreatorAnnotations;
const plain=value=>JSON.parse(JSON.stringify(value));
test('source-backed handwriting is seeded, finite and geometrically distinct',()=>{
  const styles=['hand-circle','hand-box','hand-arrow','hand-underline','hand-strike','hand-bracket','hand-scribble'];
  const shapes=styles.map(style=>pathData(style,600,200,1));
  assert.equal(new Set(shapes).size,7);
  for(const [i,style] of styles.entries()) {
    assert.equal(pathData(style,600,200,1),shapes[i]);
    assert.notEqual(pathData(style,600,200,2),shapes[i]);
    assert.doesNotMatch(shapes[i],/NaN|Infinity|undefined/);
  }
  assert.equal((shapes[0].match(/ Q/g)||[]).length,14);
  assert.equal((shapes[6].match(/ L/g)||[]).length,21);
  assert.equal(new Set(['straight','gentle','swoop'].map(curve=>pathData('hand-arrow',600,200,1,curve))).size,3);
  assert.throws(()=>pathData('html',600,200,1));
  assert.throws(()=>pathData('hand-arrow',600,200,1,'invalid'));
  for(let i=0;i<100;i++)assert.ok(hash(i,1)>=-1&&hash(i,1)<1);
});
test('curvature pen mapping is monotone, bounded and slows around a corner',()=>{
  const line=penEase(100,x=>({x,y:0}));
  const corner=penEase(100,x=>x<20?{x,y:0}:{x:20,y:x-20});
  assert.equal(line.samples,25);assert.ok(corner.samples>25&&corner.samples<=75);
  let last=-1;
  for(let i=0;i<=100;i++) {
    const t=i/100,q=corner.ease(t);
    assert.ok(q>=last&&q>=0&&q<=1);last=q;
    assert.ok(Math.abs(line.ease(t)-t)<1e-12);
  }
  assert.ok(Math.abs(corner.ease(.2)-.2)>.01);
  assert.equal(corner.ease(0),0);assert.equal(corner.ease(1),1);
  assert.equal(penEase(0,()=>{throw new Error('No geometry expected');}).ease(.5),.5);
});
test('all output boards fit rough geometry inside the exact source-image region',()=>{
  for(const [width,height] of [[1720,418],[940,970],[960,418],[960,648],[20,10]]) {
    const region={x:30,y:20,width,height};
    for(const style of ['hand-circle','hand-underline']) {
      const bounds={x:-6,y:-3,width:width+20,height:height+12},p=fit(bounds,region,style);
      const left=p.x+bounds.x*p.scale,top=p.y+bounds.y*p.scale;
      assert.ok(p.scale>0&&Number.isFinite(p.scale));
      assert.ok(left>=region.x&&top>=region.y);
      assert.ok(left+bounds.width*p.scale<=region.x+width);
      assert.ok(top+bounds.height*p.scale<=region.y+height);
    }
  }
});
test('cursor follows the eased ink location and retraces exactly after seeking backward',()=>{
  const point=p=>({x:p<.2?p*100:20,y:p<.2?0:(p-.2)*100});
  const ease=penEase(100,x=>point(x/100)).ease;
  const frames=Array.from({length:101},(_,i)=>plain(pointerState(i/100,500,p=>point(ease(p)))));
  for(let i=100;i>=0;i--) {
    const actual=pointerState(i/100,500,p=>point(ease(p)));
    assert.deepEqual(plain(actual),frames[i]);
    if(i>=30&&i<=80)assert.deepEqual({x:actual.x,y:actual.y},point(ease(actual.draw)));
  }
  assert.equal(frames[0].y,580);assert.ok(frames[100].y>500);
});
test('annotation activation uses the same integer cue frame at fractional and late timestamps',()=>{
  for(const onset of [.1+.2,4.507,599.123]) {
    const f=Math.ceil(onset*30);
    assert.equal(activeAt((f-1)/30,[onset]),-1);
    assert.equal(activeAt(f/30,[onset]),0);
    assert.equal(activeAt((f-1)/30,[onset]),-1);
  }
});
test('whiteboard pen tracks the physical path tangent independently of seek order',()=>{
  for(const p of [0,.25,.5,1]) {
    const horizontal=penPose(100,q=>({x:100*q,y:10}),p);
    const vertical=penPose(100,q=>({x:10,y:100*q}),p);
    assert.equal(horizontal.x,100*p);assert.equal(horizontal.rotation,0);
    assert.equal(vertical.y,100*p);assert.equal(vertical.rotation,90);
  }
  assert.equal(penPose(0,()=>({x:1,y:2}),.5).rotation,0);
});
test('mask identities are unique across all scene and annotation slots',()=>{
  const ids=Array.from({length:120},(_,scene)=>Array.from({length:4},(_,mark)=>maskId(scene,mark))).flat();
  assert.equal(new Set(ids).size,480);
  for(const [scene,mark] of [[NaN,0],[120,0],[1,4],[-1,0],['1',0]])assert.throws(()=>maskId(scene,mark));
});
test('pen travel moves the whole glyph below every output board',()=>{
  for(const [w,h] of [[1720,418],[940,970],[960,418],[960,648]]) {
    const height=penTravelHeight(w,h),state=pointerState(1,height,p=>({x:200*p,y:50}));
    assert.ok(state.y-w*.0012*58>h);
    assert.ok(pointerState(0,height,p=>({x:200*p,y:50})).y-w*.0012*58>h);
  }
});
