import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['visual-story','production-annotations','production-pointer-styles','production-interactions'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const P=context.window.ShortCreatorPointerStyles,I=context.window.ShortCreatorInteractions;
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(style='click',W=960,H=648,onsets=[.5,2.5,4.5,6.5]) {
  const c={style,target:{x:.2,y:.5,width:.2,height:.1},drop:{x:.6,y:.2},items:['Open','Inspect'],pick:1};
  const g=I.geometry(c,W,H,1600,900);
  return {g,onsets,stateAt:t=>I.state(c,t,onsets,g)};
}
test('glyph path has a 48-segment cumulative length table and a tip-aligned reveal',()=>{
  const a={x:50,y:400},b={x:400,y:100},path=P.leg(a,b);
  assert.equal(path.points.length,49);assert.equal(path.lengths.length,49);
  assert.deepEqual(plain(path.points[0]),a);assert.deepEqual(plain(path.points.at(-1)),b);
  assert.ok(path.total>Math.hypot(b.x-a.x,b.y-a.y));
  for(let i=1;i<49;i++)assert.ok(path.lengths[i]>path.lengths[i-1]);
  assert.deepEqual(plain(P.trailAt(path,0,1920)),[]);
  assert.deepEqual(plain(P.trailAt(path,1,1920).at(-1)),b);
  assert.deepEqual(plain(P.atDistance(path,-100)),{i:1,...a});
  assert.deepEqual(plain(P.atDistance(path,path.total+100)),{i:48,...b});
  const still=P.leg(a,a);assert.equal(still.total,0);assert.deepEqual(plain(P.trailAt(still,1,1920)),[]);
});
test('echoes reconstruct history and collapse to zero when the pointer rests',()=>{
  const {g,stateAt}=fixture();
  const moving=P.echoesAt(2.8,g,stateAt);assert.ok(moving.some(e=>e.opacity>0));
  assert.deepEqual(plain(moving.map(e=>e.scale)),[.985,.97,.955,.94]);
  for(const time of [0,4.2,8])assert.ok(P.echoesAt(time,g,stateAt).every(e=>e.opacity===0));
  const first=plain(P.echoesAt(2.8,g,stateAt));P.echoesAt(7,g,stateAt);assert.deepEqual(plain(P.echoesAt(2.8,g,stateAt)),first);
});
test('dart depth uses the source dive keys and preserves the exact action tip',()=>{
  const {g,stateAt}=fixture('drag');
  assert.equal(P.dartAt(0,g,stateAt).depth,1.3);
  const middle=P.dartAt(2.8,g,stateAt);assert.ok(middle.depth>1.5&&middle.depth<1.8);
  for(let frame=135;frame<=153;frame++) {
    const t=frame/30,s=P.dartAt(t,g,stateAt);
    assert.deepEqual(plain(s.tip),plain(stateAt(t).tip));
    assert.ok(Number.isFinite(s.rotation)&&Math.abs(s.rotation)<=180&&s.smear>=0&&s.smear<=12);
  }
});
test('magnetic morph remains nonnegative even for extreme contained image ratios',()=>{
  for(const width of [1,100,900])for(const height of [1,80,400]) {
    const {g,stateAt}=fixture();g.r.width=width;g.r.height=height;
    for(let frame=0;frame<240;frame++) {
      const s=P.magneticAt(stateAt(frame/30),g);
      assert.ok(s.width>=0&&s.height>=0&&s.radius>=0&&s.opacity>=0&&s.opacity<=1);
      assert.ok(s.radius<=s.width/2&&s.radius<=s.height/2);
    }
  }
});
test('agent tags stay inside the board and never claim a generated completion',()=>{
  for(const [W,H] of [[1720,418],[940,970],[960,418],[960,648]]) {
    const {g,stateAt}=fixture('click',W,H);
    for(let frame=0;frame<240;frame++) {
      const s=P.agentTagAt(frame/30,g,stateAt,420,108);
      assert.ok(s.x>=0&&s.y>=0&&s.x+420<=W&&s.y+108<=H);
      assert.ok(s.typed>=0&&s.typed<=1&&s.opacity>=0&&s.opacity<=1);
      assert.equal('done' in s,false);
    }
    assert.equal(P.agentTagAt(8,g,stateAt,420,108).opacity,0);
  }
});
test('camera spring is seek-independent and cannot expose an outside board edge',()=>{
  for(const [W,H] of [[1720,418],[940,970],[960,418],[960,648]]) {
    const {g,onsets,stateAt}=fixture('drag',W,H),camera=P.makeCamera(onsets,g,stateAt);
    const frames=Array.from({length:240},(_,i)=>plain(camera(i/30)));
    for(let i=239;i>=0;i--)assert.deepEqual(plain(camera(i/30)),frames[i]);
    assert.deepEqual(frames[0],{x:0,y:0,z:1});assert.deepEqual(frames.at(-1),{x:0,y:0,z:1});
    assert.ok(frames.some(s=>s.z===1.8));
    for(const s of frames) {
      assert.ok(s.z>=1&&s.z<=1.8);
      assert.ok(s.x<=1e-8&&s.y<=1e-8&&s.x+W*s.z>=W-1e-8&&s.y+H*s.z>=H-1e-8);
    }
  }
});
test('late camera cues use a bounded local sample table and end at identity',()=>{
  const {g,onsets,stateAt}=fixture('click',960,648,[590.1,592.37,595.4,598.1]);
  const camera=P.makeCamera(onsets,g,stateAt);
  assert.deepEqual(plain(camera(0)),{x:0,y:0,z:1});
  assert.deepEqual(plain(camera(600)),{x:0,y:0,z:1});
  assert.ok(camera(596).z>1);
});
test('actor label yields to a visible menu and returns after selection',()=>{
  const {g,stateAt}=fixture('menu',960,648,[.5,2.5,4.5,6.5,8.5]);
  assert.ok(P.agentTagAt(4,g,stateAt,420,108).opacity>0);
  for(const t of [4.6,5,6,6.9,7.2])assert.equal(P.agentTagAt(t,g,stateAt,420,108).opacity,0);
  assert.ok(P.agentTagAt(8,g,stateAt,420,108).opacity>0);
});
