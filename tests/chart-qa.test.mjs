import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectChartLabels} from '../chart-qa.mjs';

const bounds={width:824,height:560};
const label=(text,left=10,top=10,right=70,bottom=30)=>({text,left,top,right,bottom});
test('separate labels, shared edges and empty glyphs do not collide',()=>{
  assert.deepEqual(inspectChartLabels([label('one'),label('two',70,10,130,30),label('',0,0,900,900)],bounds),[]);
  assert.deepEqual(inspectChartLabels([],null),[]);
});
test('overlap is rejected without changing input',()=>{
  const labels=[label('one'),label('two',60)];
  const before=JSON.stringify(labels);
  assert.match(inspectChartLabels(labels,bounds)[0],/Chart labels overlap: one \/ two/);
  assert.equal(JSON.stringify(labels),before);
});
test('out of bounds and zero-area labels',()=>{
  assert.match(inspectChartLabels([label('too wide',0,0,825.1,20)],bounds)[0],/outside visual/);
  assert.deepEqual(inspectChartLabels([label('hidden',0,0,0,0)],bounds),[]);
});
test('normalized subpixel contacts tolerate at most one production pixel',()=>{
  assert.deepEqual(inspectChartLabels([label('one'),label('two',69)],bounds),[]);
  assert.match(inspectChartLabels([label('one'),label('two',68.9)],bounds)[0],/overlap/);
});
