import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-swap-catalog.js',import.meta.url),'utf8'),context);
const {groups,kinds,activeAt,ease,track,clockPoints,burnPoints,state}=context.window.ShortCreatorSwapCatalog;
const packed=value=>JSON.stringify(value);

test('image selection shares the quantized clock at late fractional cue boundaries',()=>{
  for(const start of [2.001,65.4,150.37,598.1]) {
    const onsets=[.4,start],frame=Math.ceil(start*30);
    for(const offset of [-1,0,1,24,-1,24,0])
      assert.equal(activeAt((frame+offset)/30,onsets),offset<0?0:1);
  }
});

test('45 catalog choices have clean endpoints, finite frames and distinct behavior',()=>{
  assert.equal(Object.keys(groups).length,18);assert.equal(kinds.length,45);
  const signatures=new Set();
  for(const kind of kinds) {
    const initial=state(kind,0),end=state(kind,1),frames=[];
    assert.equal(initial.a.alpha,1);assert.equal(initial.b.alpha,0);
    assert.equal(end.a.alpha,0);assert.equal(end.b.alpha,1);
    assert.equal(end.b.clip,'none');assert.equal(end.b.blur,0);assert.equal(end.b.scale,1);
    assert.equal(end.layers.length,0);assert.equal(end.burn,0);
    for(let frame=0;frame<=240;frame++) {
      const value=state(kind,frame/240);
      for(const layer of [value.a,value.b,...value.layers])for(const [key,n] of Object.entries(layer))
        if(typeof n==='number')assert.ok(Number.isFinite(n),kind+' '+key);
      assert.ok([value.a,value.b,...value.layers].every(layer=>layer.alpha>=0&&layer.alpha<=1));
      assert.ok(value.layers.length<=12);assert.ok(value.burn>=0&&value.burn<=1);
      if(frame%10===0)frames.push(value);
    }
    signatures.add(packed(frames));
    for(const p of [0,.75,.125,1,.5,0,.99,.1]) {
      const expected=packed(state(kind,p));state(kind,1);state(kind,0);
      assert.equal(packed(state(kind,p)),expected);
    }
    assert.equal(packed(state(kind,-2)),packed(initial));assert.equal(packed(state(kind,4)),packed(end));
  }
  assert.equal(signatures.size,45);
  assert.throws(()=>state('catalog-unknown',.5));assert.throws(()=>state(kinds[0],NaN));
});

test('source power and overlapping tracks retain exact intermediate values',()=>{
  assert.equal(ease('in4',.5),.0625);assert.equal(ease('out3',.5),.875);assert.equal(ease('inout4',.5),.5);
  assert.equal(track(0,[[0,2,100],[1,1,0]],.5),25);
  assert.equal(track(0,[[0,2,100],[1,1,0]],1),50);
  assert.equal(track(0,[[0,2,100],[1,1,0]],1.5),25);
  assert.equal(track(0,[[0,2,100],[1,1,0]],2),0);
  assert.equal(track(0,[[.1,0,20],[.3,0,-10]],.2),20);
  assert.equal(track(0,[[.1,0,20],[.3,0,-10]],.3),-10);
  assert.throws(()=>ease('custom',.2));
});

test('cover swaps occur while all rectangular pixels are hidden',()=>{
  const examples=[['staggered-blocks',.32/.59],['horizontal-blinds',.5/.96],['vertical-blinds',.5/.96],
    ['grid-dissolve',.62/1.24],['shutter',.25/.55]];
  for(const [name,p] of examples) {
    const value=state('catalog-'+name,p);
    assert.equal(value.a.alpha,0);assert.equal(value.b.alpha,1);
    for(let y=.001;y<1;y+=.037)for(let x=.001;x<1;x+=.031)
      assert.ok(value.layers.some(l=>l.alpha===1&&x>=l.x&&y>=l.y&&x<=l.x+l.w&&y<=l.y+l.h),name+' uncovered at cut');
  }
  const circle=state('catalog-morph-circle',.5/.7).layers[0];
  for(const [w,h] of [[1040,520],[900,600],[200,340],[940,690]])
    assert.ok(circle.w*Math.max(w,h)/2>=Math.hypot(w,h)/2,'Circle must cover every corner before switching');
});

test('pushes share direction and flip exchanges visible front faces at ninety degrees',()=>{
  for(const name of ['push-slide','vertical-push']) {
    const axis=name==='push-slide'?'x':'y';let previous=1;
    for(let frame=0;frame<24;frame++) {
      const p=frame/24,value=state('catalog-'+name,p);
      if(p>0){assert.ok(value.a[axis]<=previous);assert.ok(Math.abs(value.b[axis]-value.a[axis]-1)<1e-12);}
      previous=value.a[axis];
    }
  }
  const middle=state('catalog-card-flip',.5);assert.equal(middle.a.rotationY,90);assert.equal(middle.b.rotationY,-90);
  assert.ok(state('catalog-card-flip',.25).a.rotationY<90);assert.ok(state('catalog-card-flip',.75).b.rotationY>-90);
});

test('clock wipe completes its final quadrant and burn noise is seek independent',()=>{
  assert.equal(packed(clockPoints(0)),packed([[.5,.5],[.5,0],[.5,0]]));
  const full=clockPoints(1);
  for(const corner of [[0,0],[1,0],[1,1],[0,1]])assert.ok(full.some(p=>packed(p)===packed(corner)));
  assert.equal(packed(full.at(-1)),packed([.5,0]));
  for(const [w,h] of [[1040,520],[940,690],[200,340]])for(const p of [.01,.3,.7,.99]) {
    const points=burnPoints(p,w,h);assert.equal(points.length,61);assert.ok(points.flat().every(Number.isFinite));
    burnPoints(1,w,h);assert.equal(packed(points),packed(burnPoints(p,w,h)));
  }
});
