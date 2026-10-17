import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-colorama','production-type'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorColorama,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('source feather, compound blur levels and cubic front have authored landmarks',()=>{
  assert.ok(context.window.ShortCreatorType.kinds.includes('colorama-wipe'));
  assert.deepEqual(plain(api.levels),[.04,.14,.3,.55,1]);
  const start=api.state(0,520,80),mid=api.state(.375/1.0625,520,80),end=api.state(1,520,80);
  near(start.front,-76.8);assert.equal(start.pad,152);assert.equal(start.feather,192);assert.equal(start.blur,12);
  near(mid.front,346.4);near(end.front,769.6);assert.equal(end.crisp,1);assert.equal(start.crisp,0);
  near(api.state((.7125+.175)/1.0625,520,80).crisp,.5);
  for(const args of [[NaN,520,80],[0,0,80],[0,520,Infinity]])assert.throws(()=>api.state(...args));
});
test('palette is closed to approved hex colors and interpolation retains exact endpoints',()=>{
  const lut=api.lut(['#100020','#80ffff','#c8ff00','#ffffff']);
  assert.equal(lut.length,768);assert.deepEqual(Array.from(lut.slice(0,3)),[16,0,32]);
  assert.deepEqual(Array.from(lut.slice(-3)),[255,255,255]);
  for(const colors of [[],['red','#000000','#000000','#ffffff'],['#000000','#ffffff']])assert.throws(()=>api.lut(colors));
});
test('pixel mixer respects empty glyphs, compound coverage and opaque whitening',()=>{
  const lut=api.lut(['#100020','#80ffff','#c8ff00','#ffffff']),map=new Uint8ClampedArray(4);
  const empty=Array.from({length:5},()=>new Uint8ClampedArray(4));
  assert.deepEqual(Array.from(api.pixels(map,empty,1,1,api.state(.5,520,80),lut,1)),[0,0,0,0]);
  const opaque=Array.from({length:5},()=>new Uint8ClampedArray([0,0,0,255]));
  assert.deepEqual(Array.from(api.pixels(map,opaque,1,1,api.state(1,520,80),lut,1)),[255,255,255,255]);
  const partial=Array.from({length:5},()=>new Uint8ClampedArray([0,0,0,64]));
  assert.deepEqual(Array.from(api.pixels(map,partial,1,1,api.state(1,520,80),lut,1)),[255,255,255,64]);
  assert.throws(()=>api.pixels(map,empty,2,1,api.state(0,520,80),lut,1));
});
test('all frame states and noise are seek-order independent across native title widths',()=>{
  for(const width of [940,960,1720]) {
    const forward=Array.from({length:25},(_,f)=>plain(api.state(f/24,width,80)));
    for(let f=24;f>=0;f--)assert.deepEqual(plain(api.state(f/24,width,80)),forward[f]);
    assert.deepEqual(plain(api.state(600,width,80)),forward[24]);
  }
  const noise=Array.from({length:32},(_,f)=>api.hash(123,37,f));
  for(let f=31;f>=0;f--)assert.equal(api.hash(123,37,f),noise[f]);
  assert.ok(noise.every(x=>x>=0&&x<1));assert.equal(new Set(noise).size,32);
});
