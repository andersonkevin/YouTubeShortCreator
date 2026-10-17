import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-creator-intro.js',import.meta.url),'utf8'),context);
const {state,geometry,camera,cursorTrack,tap,graphemes}=context.window.ShortCreatorCreatorIntro;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('source choreography retains independent burst paths and interrupted property ownership',()=>{
  near(state(.13,12).warm.x,-820+795*.875);
  near(state(1.435,12).title.a,1-.74*(.005/.03)**3);
  assert.equal(state(1.42,12).blocks[0].a,0,'No premature source block flash');
  const p=state(2.195,12);near(p.blocks[0].s,1+(.38-1)*.5**3);
  assert.ok(p.blocks[2].a>p.blocks[0].a,'Later blocks stay visible through the asymmetric release');
  const initial=state(2.31,12).fragments[0];
  const expectedX=88+(20-88)*(1-(1-.03/.28)**4);
  near(initial.x,expectedX);near(state(2.38,12).fragments[0].x,expectedX+(28-expectedX)*.875);
  near(state(2.36,12).selection.w,640);near(state(2.62,12).wordmark.a,1);
});
test('prompt typing preserves graphemes and uses the source stagger endpoints',()=>{
  assert.deepEqual(plain(graphemes('A e\u0301 a\u0308\u0304')),['A',' ','e\u0301',' ','a\u0308\u0304']);
  assert.equal(state(4.18,4).chars[0],0);near(state(4.185,4).chars[0],.5);
  near(state(7.04,4).chars[3],1);assert.equal(state(7.02,4).chars[3],0);
  near(state(4.19,1).chars[0],1);assert.equal(state(4.17,180).chars.filter(a=>a>0).length,0);
});
test('input, result, profile and explicit action states retain source pacing',()=>{
  const mid=state(4.27,10);near(mid.input.s,1+.32*.5);near(mid.input.x,150);near(mid.input.y,-50);
  near(state(5.66,10).input.s,1);near(state(8.25,10).thinking.a,0);
  near(state(9.86,10).profile.a,0);near(state(10.46,10).profile.a,1);
  near(state(10.92,10).follow.s,1-.1*.5**3);
  near(state(11,10).before.a,.5);near(state(11.03,10).after.a,.5);
  assert.deepEqual(plain(state(600,10)),plain(state(11.76,10)));
});
test('all half frames are finite, seek independent and reject invalid clock input',()=>{
  const finite=v=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finite):Object.values(v).every(finite);
  for(let f=0;f<=706;f++) {
    const t=f/60,expected=plain(state(t,180));state(600,180);state(0,1);
    assert.deepEqual(plain(state(t,180)),expected);assert.ok(finite(expected));
  }
  for(const time of [NaN,Infinity,-Infinity])assert.throws(()=>state(time,1));
  for(const count of [0,181,2.5,NaN])assert.throws(()=>state(0,count));
});
test('four native layouts bound the camera without shrinking approved type',()=>{
  for(const [W,H] of [[1720,636],[940,1246],[960,636],[960,866]]) {
    const g=geometry(W,H);assert.ok(g.card.y>=24&&g.card.y+g.card.h<=H-24);
    for(let f=0;f<708;f++) {
      const raw=state(f/60,120).input,c=camera(g,raw);
      assert.ok(c.s>=Math.min(1,raw.s)-1e-9);
      const left=g.input.x+g.input.w*(1-c.s)/2+c.x,top=g.input.y+g.input.h*(1-c.s)/2-54*c.s+c.y;
      assert.ok(left>=24-1e-8&&left+g.input.w*c.s<=W-24+1e-8);
      assert.ok(top>=24-1e-8&&top+(g.input.h+61)*c.s<=H-24+1e-8);
    }
  }
  assert.throws(()=>geometry(400,500));
});
test('cursor enters and leaves physically and its tip lands on actual target centers',()=>{
  for(const [W,H] of [[1720,636],[940,1246],[960,636],[960,866]]) {
    const g=geometry(W,H),targets={title:{x:W/2,y:H/2},send:{x:W-180,y:H/2+100},trigger:{x:200,y:H/2-100},follow:{x:W-200,y:H/2+30}},at=cursorTrack(g,targets);
    assert.ok(at(0).y>H);assert.ok(at(3.1).x>W);
    assert.ok(at(6.92).y>H);assert.ok(at(11.76).x>W);
    for(const [t,key] of [[1.43,'title'],[7.9,'send'],[9.34,'trigger'],[10.88,'follow']]) {
      near(at(t).x,targets[key].x);near(at(t).y,targets[key].y);
      near(tap(t,t),1);near(tap(t+.1,t),.84);near(tap(t+.3,t),1);
    }
  }
});
