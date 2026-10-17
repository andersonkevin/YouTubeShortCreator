import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/visual-story.js',import.meta.url),'utf8'),context);
const {progress,count}=context.window.ShortCreatorStory;
test('story clock snaps onset upward and evaluates an exact 24-frame interval',()=>{
  assert.equal(progress(.101,.101),0);
  assert.equal(progress(4/30,.101),0);
  assert.equal(progress(16/30,.101),.5);
  assert.equal(progress(28/30,.101),1);
  assert.equal(progress(-100,.101),0);
  assert.equal(progress(100,.101),1);
  assert.throws(()=>progress(NaN,0));
});
test('number animation preserves exact final values and handles decimals and signs',()=>{
  for(const value of [0,4,240,1.25,-7.625,1234567.89,1.23456e-7,1e12]){
    assert.equal(count(value,1),String(value));
    assert.equal(count(value,0),'0');
    const mid=Number(count(value,.5));
    assert.ok(mid>=Math.min(0,value)&&mid<=Math.max(0,value));
  }
  assert.ok(Number(count(1.23456e-7,.5))>0);
});
test('reverse seeking never accumulates count state',()=>{
  const value=count(120,progress(.5,.1));
  count(120,progress(8,.1));count(120,progress(0,.1));
  assert.equal(count(120,progress(.5,.1)),value);
});
test('line counts interpolate from the previous datum, including descending segments',()=>{
  assert.equal(count(40,0,24),'24');
  assert.equal(count(40,.5,24),'32');
  assert.equal(count(40,1,24),'40');
  assert.equal(count(0,.5,40),'20');
  assert.equal(count(2.5,.5,1.25),'1.88');
});
