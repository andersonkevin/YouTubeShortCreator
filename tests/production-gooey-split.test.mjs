import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-headlines','production-gpu-backdrops','production-gooey-split'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const goo=context.window.ShortCreatorGooeySplit,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('original split, rest, spin and remerge windows retain their authored geometry',()=>{
  for(const t of [0,.3,3.2,4.7,600])for(let i=0;i<3;i++)near(goo.piece(i,t).radius,0);
  for(const t of [.8,4]){near(goo.piece(0,t).y,-190);near(goo.piece(1,t).radius,0);near(goo.piece(2,t).y,190);}
  const expected=[[0,-197],[-197*Math.sqrt(3)/2,98.5],[197*Math.sqrt(3)/2,98.5]];
  for(let i=0;i<3;i++){
    const p=goo.piece(i,1.8);near(p.x,expected[i][0]);near(p.y,expected[i][1]);
    goo.matrix(i+3,1.8).forEach((v,j)=>near(v,[1,0,0,1,0,0][j]));
    const swell=goo.piece(i,1.29);near(swell.sx,1.15);near(swell.sy,1.7);
  }
  assert.equal(goo.centreScale(1.8),1);assert.equal(goo.centreScale(2.3),0);
});
test('blade paths retain 17 samples per edge, the two arcs and bounded actual transformed shapes',()=>{
  const paths=new Set();for(let i=0;i<3;i++){
    const d=goo.bladePath(i);paths.add(d);assert.ok(d.startsWith('M'));assert.ok(d.endsWith('Z'));
    assert.equal((d.match(/A288,288/g)||[]).length,1);assert.equal((d.match(/A128,128/g)||[]).length,1);
  }assert.equal(paths.size,3);
  for(let f=0;f<=282;f++)for(let part=0;part<7;part++){
    const m=goo.matrix(part,f/60);assert.ok(m.every(Number.isFinite));
    const radius=Math.hypot(m[4],m[5])+Math.max(Math.hypot(m[0],m[1]),Math.hypot(m[2],m[3]))*(part<3?54:part===6?70:298);
    assert.ok(radius<310,'Original geometry must stay inside the native 840-unit view');
  }
});
test('shutter includes both ends of one native frame with 17 absolute samples',()=>{
  const starts=[.5,5.5],time=2,frame=time*30,s=goo.state(time,starts,.4);
  assert.equal(s.samples.length,17);near(s.samples[0],goo.sourceAt(frame-.5,starts));near(s.samples[16],goo.sourceAt(frame+.5,starts));
  assert.equal(s.parts.length,7);assert.ok(s.parts.some(p=>p.moving));
  s.parts.forEach((p,i)=>{assert.equal(p.copies.length,17);p.copies.forEach((m,j)=>assert.deepEqual(plain(m),plain(goo.matrix(i,s.samples[j]))));});
  assert.ok(s.samples[0]<s.sourceTime&&s.samples[16]>s.sourceTime);
});
test('SVG threshold turns off during the spin and returns for both merge sequences',()=>{
  const starts=[.5,5.5];let sawSpin=false,sawReturn=false;
  for(let frame=15;frame<=189;frame++){
    const s=goo.state(frame/30,starts);assert.equal(s.goo,s.sourceTime<.95||s.sourceTime>=2.67);
    if(!s.goo)sawSpin=true;if(s.sourceTime>2.7&&s.goo)sawReturn=true;
    assert.ok(s.tile>=0&&s.tile<=1);assert.ok(s.tileAlpha>=.07&&s.tileAlpha<=.1+1e-10);
  }assert.ok(sawSpin&&sawReturn);
});
test('motion has exact settled state and backward seek is independent of history',()=>{
  const starts=[590.415,595.415],frames=Array.from({length:195},(_,i)=>plain(goo.state(590+i/30,starts,.7)));
  for(let i=194;i>=0;i--)assert.deepEqual(plain(goo.state(590+i/30,starts,.7)),frames[i]);
  const end=goo.state(600,starts,.7);assert.equal(end.sourceTime,4.7);assert.ok(end.parts.every(p=>!p.moving));
  assert.equal(end.tile,0);assert.deepEqual(plain(end),plain(goo.state(900,starts,.7)));
  assert.throws(()=>goo.state(1,[.5,5.4]));assert.throws(()=>goo.state(NaN,starts));
  assert.throws(()=>goo.piece(3,1));assert.throws(()=>goo.matrix(7,1));assert.throws(()=>goo.bladePath(-1));
});
