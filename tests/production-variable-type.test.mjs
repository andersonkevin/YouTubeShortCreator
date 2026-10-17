import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const {state,styles}=createRequire(import.meta.url)('../templates/v1/assets/production-variable-type.js');
const axes=[{tag:'wght',minimum:300,default:300,maximum:1000},{tag:'slnt',minimum:-15,default:0,maximum:0}];
test('numeric painters stay inside real font ranges and replay exactly',()=>{
  for(const style of styles)for(let i=0;i<18;i++)for(const t of [-1,0,.05,.4,.7,1.1,2,599]){
    const a=state(style,t,i,18,axes);
    state(style,599,17,18,axes);assert.deepEqual(state(style,t,i,18,axes),a);
    a.values.forEach(([tag,value])=>{const range=axes.find(a=>a.tag===tag);assert.ok(value>=range.minimum&&value<=range.maximum);});
    for(const value of [a.opacity,a.rise,a.scale])assert.ok(Number.isFinite(value));
  }
});
test('wave has an actual per-glyph crest and returns to stillness',()=>{
  const time=.55;
  assert.notDeepEqual(state('weight-wave',time,0,12,axes),state('weight-wave',time,6,12,axes));
  assert.deepEqual(state('weight-wave',2,6,12,axes),state('weight-wave',500,6,12,axes));
  assert.throws(()=>state('weight-wave',time,0,12,axes.slice(0,1)),/slant/);
});
test('weight and flex affect real axes, not only element transforms',()=>{
  for(const mode of styles)assert.notDeepEqual(state(mode,0,5,12,axes).values,state(mode,.55,5,12,axes).values);
  assert.equal(state('axis-weight',2,0,12,axes).values[0][1],1000);
  assert.equal(state('weight-shift',2,0,12,axes).values[0][1],1000);
});
