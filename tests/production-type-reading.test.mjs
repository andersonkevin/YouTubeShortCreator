import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-type.js',import.meta.url),'utf8'),context);
const {readKinds,readState}=context.window.ShortCreatorType;
const plain=value=>JSON.parse(JSON.stringify(value));
test('reading treatments settle exactly and do not depend on evaluation history',()=>{
  const settled={opacity:1,x:0,y:0,scale:1,highlight:0,sweep:100,glow:0,ink:1};
  for(const kind of readKinds)for(const n of [1,4,26])for(let i=0;i<n;i++) {
    assert.deepEqual(plain(readState(kind,1,i,n)),settled);
    assert.deepEqual(plain(readState(kind,3,i,n)),settled);
    const expected=Array.from({length:25},(_,f)=>plain(readState(kind,f/24,i,n)));
    for(const f of [24,0,12,23,1,18,6,0,24])assert.deepEqual(plain(readState(kind,f/24,i,n)),expected[f]);
    for(const s of expected) {
      assert.ok(Object.values(s).every(Number.isFinite));assert.ok(s.opacity>=0&&s.opacity<=1);
      assert.ok(s.glow>=0&&s.glow<=1&&s.highlight>=0&&s.highlight<=1&&s.ink>=0&&s.ink<=1);
    }
  }
  assert.throws(()=>readState('custom',.5,0,1));
});
test('highlight grows from the left and clears; gradient has its own active sweep',()=>{
  assert.equal(readState('marker-sweep',0,0,1).scale,0);
  assert.equal(readState('marker-sweep',.6,0,1).highlight,1);
  assert.ok(readState('marker-sweep',.8,0,1).scale>1);
  assert.equal(readState('gradient-read',0,0,1).sweep,45);
  assert.equal(readState('gradient-read',.35,0,1).sweep,22.5);
  assert.equal(readState('gradient-read',.35,0,1).scale,1.04);
  assert.equal(readState('gradient-read',.9,0,1).sweep,100);
});
test('neon pulse is bounded with both attack and release',()=>{
  assert.equal(readState('neon-read',0,0,1).glow,0);
  assert.equal(readState('neon-read',.1,0,1).glow,.5);
  assert.equal(readState('neon-read',.5,0,1).glow,1);
  assert.ok(Math.abs(readState('neon-read',.9,0,1).glow-.5)<1e-12);
});
test('kinetic entrances retain four directional and spring source modes',()=>{
  assert.equal(readState('kinetic-words',0,0,4).y,-120);
  assert.equal(readState('kinetic-words',0,1,4).x,-300);
  assert.equal(readState('kinetic-words',0,2,4).x,300);
  assert.ok(Math.abs(readState('kinetic-words',0,3,4).scale-.4)<1e-12);
  assert.ok(readState('kinetic-words',.18,0,4).y>0);
  assert.equal(readState('editorial-words',0,0,4).scale,1.12);
  assert.equal(readState('editorial-words',0,0,4).opacity,0);
});
test('pill uses first-word activation and the retained 50 ms lead',()=>{
  assert.equal(readState('pill-read',0,0,4).ink,1);
  assert.equal(readState('pill-read',0,1,4).ink,0);
  assert.equal(readState('pill-read',.25,1,4).ink,.5);
  assert.equal(readState('pill-read',.3125,1,4).ink,1);
});
