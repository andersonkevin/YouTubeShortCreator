import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['visual-story','production-annotations','production-interactions'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {arc,geometry,state,menuBox}=context.window.ShortCreatorInteractions;
const plain=x=>JSON.parse(JSON.stringify(x));
const onsets=[.5,2.5,4.5,6.5,8.5];
const content=style=>({style,target:{x:.2,y:.5,width:.2,height:.1},drop:{x:.6,y:.2},to_y:.25,items:['Open','Details','Export'],pick:1});
const phaseTime=(onset,p)=>(Math.ceil(onset*30)+Math.round(p*24))/30;
test('source quadratic arc retains its exact control point and endpoints',()=>{
  const a={x:0,y:0},b={x:640,y:-138};
  assert.deepEqual(plain(arc(a,b,-.12,0)),a);assert.deepEqual(plain(arc(a,b,-.12,1)),b);
  assert.deepEqual(plain(arc(a,b,-.12,.5)),{x:311.72,y:-107.4});
});
test('image targets and context menus fit all four board geometries',()=>{
  for(const [W,H] of [[1720,418],[940,970],[960,418],[960,648]]) {
    for(const [iw,ih] of [[1920,1080],[1080,1920],[1080,1080]]) {
      const g=geometry(content('drag'),W,H,iw,ih);
      assert.ok(Math.abs(g.r.width/g.fit.width-.2)<1e-12);assert.ok(Math.abs(g.r.height/g.fit.height-.1)<1e-12);
      assert.ok(g.r.x>=g.fit.x&&g.r.y>=g.fit.y);
      for(const x of [0,W/2,W])for(const y of [0,H/2,H]) {
        const menu=menuBox({x,y},W,H,4);
        assert.ok(menu.x>=12&&menu.y>=12&&menu.x+menu.width<=W-12&&menu.y+menu.height<=H-12);
      }
    }
  }
});
test('all interactions seek independently, leave physically and reveal only supplied results',()=>{
  for(const style of ['click','drag','marquee','menu','tap','swipe']) {
    const c=content(style),g=geometry(c,960,648,1600,900),times=onsets.slice(0,style==='menu'?5:4);
    const frames=Array.from({length:300},(_,frame)=>plain(state(c,frame/30,times,g)));
    for(let frame=299;frame>=0;frame--)assert.deepEqual(plain(state(c,frame/30,times,g)),frames[frame]);
    for(const s of frames) {
      assert.ok(Number.isFinite(s.tip.x)&&Number.isFinite(s.tip.y)&&Number.isFinite(s.scale));
      assert.ok(s.contactOpacity>=0&&s.contactOpacity<=.68);
      if(s.result)assert.ok(s.acting&&style!=='marquee');
    }
    assert.equal(frames[0].result,false);assert.equal(frames.at(-1).result,style!=='marquee');
    if(style==='tap'||style==='swipe')assert.equal(frames.at(-1).contactOpacity,0);
    else {assert.ok(frames[0].tip.y>g.H);assert.ok(frames.at(-1).tip.y>g.H);}
  }
});
test('drag retains the grip through travel and lands on the supplied destination',()=>{
  const c=content('drag'),g=geometry(c,1720,418,1920,1080);
  for(let frame=0;frame<=18;frame++) {
    const s=state(c,(135+frame)/30,onsets.slice(0,4),g);
    assert.equal(s.tip.x,g.anchor.x+s.carry.x);assert.equal(s.tip.y,g.anchor.y+s.carry.y);
    assert.equal(s.result,frame===18);
  }
  const drop=state(c,phaseTime(4.5,.75),onsets.slice(0,4),g);
  assert.deepEqual(plain(drop.tip),plain(g.end));assert.equal(drop.result,true);
});
test('menu opens on an explicit cue, flips near edges and selects the explicit row',()=>{
  const c=content('menu');c.target={x:.8,y:.75,width:.15,height:.2};c.pick=2;
  const g=geometry(c,960,418,1600,900);
  assert.equal(g.menu.left,true);assert.equal(g.menu.up,true);
  const open=state(c,5.4,onsets,g);assert.equal(open.menuOpacity,1);assert.equal(open.result,false);
  const selected=state(c,phaseTime(6.5,.75),onsets,g);
  assert.deepEqual(plain(selected.tip),plain(g.item));assert.equal(selected.selected,2);assert.equal(selected.result,true);
  const ended=state(c,10,onsets,g);assert.equal(ended.menuOpacity,0);assert.equal(ended.selected,-1);
});
test('selection stays on the image after the cursor leaves, including reverse seeks',()=>{
  const c=content('marquee'),g=geometry(c,940,970,1600,900),times=onsets.slice(0,4);
  const done=state(c,10,times,g);assert.deepEqual(plain(done.rect),plain(g.r));assert.equal(done.selection,1);
  const mid=state(c,4.9,times,g);assert.ok(mid.rect.width>0&&mid.rect.width<g.r.width);
  assert.equal(state(c,0,times,g).selection,0);
});
test('late fractional cues do not act a frame before the shared clock',()=>{
  const c=content('click'),g=geometry(c,960,418,1600,900),times=[60.1,62.37,65.4,68.1];
  const first=Math.ceil(times[2]*30);
  assert.equal(state(c,(first-1)/30,times,g).acting,false);
  assert.equal(state(c,first/30,times,g).acting,true);
  assert.equal(state(c,(first+7)/30,times,g).result,false);
  assert.equal(state(c,(first+8)/30,times,g).result,true);
});
