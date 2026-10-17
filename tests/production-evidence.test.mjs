import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-evidence.js',import.meta.url),'utf8'),context);
const {starState,badgeState,initials}=context.window.ShortCreatorEvidence;
test('star masks encode explicit fractional values and settle without changing the scale',()=>{
  for(const maximum of [1,5,10])for(const value of [0,.25,maximum/2,maximum]) {
    let previous=0;
    for(let frame=0;frame<=24;frame++) {
      const state=starState(value,maximum,frame/24);
      assert.equal(state.scales.length,maximum);assert.ok(state.fraction>=previous&&state.fraction<=value/maximum);
      for(const scale of state.scales)assert.ok(scale>=1&&scale<=1.06);
      assert.ok(state.scales.slice(Math.ceil(value)).every(scale=>scale===1));previous=state.fraction;
    }
    assert.equal(starState(value,maximum,0).fraction,0);assert.equal(starState(value,maximum,1).fraction,value/maximum);
    assert.ok(starState(value,maximum,1).scales.every(s=>s===1));
    for(const p of [1,.2,0,.8]) {const a=JSON.stringify(starState(value,maximum,p));starState(value,maximum,1);assert.equal(a,JSON.stringify(starState(value,maximum,p)));}
  }
});
test('badge entrance has one finite pop and pulse then a still endpoint',()=>{
  assert.equal(badgeState(0).scale,0);assert.equal(badgeState(.35).opacity,0);
  assert.equal(badgeState(1).scale,1);assert.equal(badgeState(1).opacity,1);
  assert.equal(JSON.stringify(badgeState(1)),JSON.stringify(badgeState(100)));
  assert.ok(badgeState(.875).scale>1.17);
  for(let frame=0;frame<=240;frame++) {
    const a=badgeState(frame/240);assert.ok(a.scale>=0&&a.scale<=1.18);assert.ok(a.opacity>=0&&a.opacity<=1);
    badgeState(1);assert.equal(JSON.stringify(a),JSON.stringify(badgeState(frame/240)));
  }
});
test('initials are a bounded derived placeholder, not an imported avatar',()=>{
  assert.equal(initials('  Example Author  '),'EA');assert.equal(initials('Jean-Luc Picard'),'JP');
  assert.equal(initials('Éva Stone'),'ÉS');assert.ok(Array.from(initials('ßeta ßecond')).length<=2);
});
