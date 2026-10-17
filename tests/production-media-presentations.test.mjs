import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-type-advanced','production-carousel-rig','production-carousel-presets','production-carousels','production-media-presentations','production-news-ticker'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {sheetState,albumState,sheetClock,geometry,cuts}=context.window.ShortCreatorMediaPresentations;
const ticker=context.window.ShortCreatorNewsTicker.state;
test('localized steam preserves fourteen seeded wisps, an exact loop endpoint and absolute seeking',()=>{
  const {wisps,steam}=context.window.ShortCreatorMediaPresentations;
  assert.equal(wisps.length,14);assert.ok(wisps.every(w=>w.cycles===1||w.cycles===2));
  const initial=JSON.stringify(steam(0));assert.equal(JSON.stringify(steam(10)),initial);assert.equal(JSON.stringify(steam(600)),initial);
  assert.notEqual(JSON.stringify(steam(3)),initial);
  for(const t of [0,.1,.5,1,3,6,9.9,10]) {
    const expected=JSON.stringify(steam(t));steam(9);steam(0);assert.equal(JSON.stringify(steam(t)),expected);
    assert.ok(steam(t).every(p=>Object.values(p).every(Number.isFinite)&&p.alpha>=0&&p.alpha<=.14&&p.radius>0));
  }
  assert.throws(()=>steam(NaN));
});
test('motion windows map into actual contain-fitted pixels in every aspect ratio',()=>{
  const {windowBox}=context.window.ShortCreatorMediaPresentations,region={x:.2,y:.1,width:.4,height:.5};
  for(const [w,h] of [[1672,363],[892,798],[912,348],[912,508]])for(const [iw,ih] of [[1920,1080],[1080,1920],[1080,1080]]) {
    const b=windowBox(w,h,iw,ih,region),image=b.image;
    assert.ok(b.x>=image.x&&b.y>=image.y&&b.x+b.w<=image.x+image.w+1e-8&&b.y+b.h<=image.y+image.h+1e-8);
    assert.ok(Math.abs(b.w/b.h-(region.width*iw)/(region.height*ih))<1e-8);
  }
  for(const bad of [{...region,x:.8},{...region,width:0},{...region,y:NaN},{...region,height:.7}])assert.throws(()=>windowBox(900,400,1200,800,bad));
});
test('preview retains measured step samples, full cut order and final hold',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(sheetState(0))),{time:0,y:1450,alpha:0,index:0});
  assert.equal(sheetState(.08).y,1198);assert.equal(sheetState(.3).y,-76);assert.equal(sheetState(.44).y,-192);
  assert.equal(sheetState(.44).alpha,1);assert.equal(sheetState(.723333).y,0);
  cuts.forEach((t,i)=>{assert.equal(sheetState(t-1e-7).index,i%4);assert.equal(sheetState(t).index,(i+1)%4);});
  assert.equal(sheetState(600).index,1);assert.equal(sheetState(600).y,0);
});
test('both short and long preview scenes keep an actual final image change on the second cue',()=>{
  for(const stop of [6.4,30.4,590.4]) {
    const onsets=[.4,stop],frames=[stop-1/30,stop,stop+12/30,stop+24/30];
    const states=frames.map(t=>sheetState(sheetClock(t,onsets).time));
    assert.equal(states[0].index,3);assert.equal(states[1].index,0);assert.equal(states[2].index,1);assert.equal(states[3].time,6);
    const expected=JSON.stringify(sheetClock(stop+.2,onsets));sheetClock(599,onsets);sheetClock(0,onsets);
    assert.equal(JSON.stringify(sheetClock(stop+.2,onsets)),expected);
  }
  assert.throws(()=>sheetClock(1,[0,5.9]));
});
test('album has staggered readable content and a stable final frame',()=>{
  assert.equal(albumState(0).alpha,0);assert.equal(albumState(.3).title,0);assert.ok(albumState(.6).title>0);
  const end=albumState(1);assert.equal(end.y,0);assert.equal(end.scale,1);assert.equal(end.title,1);assert.equal(end.detail,1);assert.equal(end.source,1);
  assert.equal(JSON.stringify(albumState(2)),JSON.stringify(end));assert.throws(()=>albumState(NaN));
});
test('all four layouts reserve nonoverlapping image and text areas without shrinking the font',()=>{
  for(const [w,h,tall] of [[1720,475,false],[940,910,true],[960,460,false],[960,620,true]])for(const sheet of [true,false]) {
    const b=geometry(w,h,tall,sheet),a=b.picture,c=b.text;
    assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=w&&b.y+b.h<=h);
    for(const r of [a,c])assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=b.w&&r.y+r.h<=b.h);
    assert.ok(a.x+a.w<=c.x||c.x+c.w<=a.x||a.y+a.h<=c.y||c.y+c.h<=a.y);
    assert.ok(c.h>=(sheet?70:158));
  }
  assert.throws(()=>geometry(20,50,true,true));
});
test('ticker traverses measured copy and stops with its final item in view',()=>{
  for(const width of [860,1620])for(const track of [500,1400,4200]) {
    const first=ticker(0,width,track),last=ticker(6.67,width,track);
    assert.equal(first.y,260);assert.equal(first.trackX,width);assert.equal(last.y,0);
    assert.equal(last.entry,1);assert.equal(last.title,1);assert.ok(last.trackX+track<=width);
    assert.equal(last.flashX,4080);assert.equal(JSON.stringify(ticker(600,width,track)),JSON.stringify(last));
    let previous=Infinity;for(let frame=0;frame<=201;frame++){const s=ticker(frame/30,width,track);assert.ok(s.trackX<=previous);previous=s.trackX;}
  }
  assert.throws(()=>ticker(0,0,20));assert.throws(()=>ticker(Infinity,900,2000));
});
