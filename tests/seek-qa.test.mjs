import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {effectFrames,checkEffectSeek} from '../seek-qa.mjs';

test('dense effects cover every frame and retain all original boundary samples',()=>{
  for(const duration of [12,24,60])for(const start of [0,.26666666666666666,1.001,179]) {
    const normal=effectFrames(start,duration),dense=effectFrames(start,duration,true),onset=Math.ceil(start*30);
    assert.ok(normal.every(frame=>dense.includes(frame)));assert.equal(dense.length,duration+3);
    assert.equal(dense[0],onset-1);assert.equal(dense.at(-1),onset+duration+1);
    for(let i=1;i<dense.length;i++)assert.equal(dense[i]-dense[i-1],1);
  }
  for(const start of [-1,NaN,Infinity])assert.throws(()=>effectFrames(start,24));
  for(const duration of [0,61,1.5,NaN])assert.throws(()=>effectFrames(0,duration));
});

test('seek checks retain mismatched PNG bytes and fail without tolerance or retry',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ysc-seek-test-'));t.after(()=>fs.rmSync(dir,{recursive:true}));
  const times=[],buffers=[Buffer.from('first frame'),Buffer.from('second frame')];
  const page={evaluate:async(fn,time)=>times.push(time),screenshot:async()=>buffers.shift()};
  await assert.rejects(()=>checkEffectSeek(page,dir,.5,4.01,'test frame 15'),/Non-deterministic visual effect/);
  assert.deepEqual(times,[.5,4.01,.5]);assert.deepEqual(fs.readFileSync(path.join(dir,'seek-effect-before.png')),Buffer.from('first frame'));
  assert.deepEqual(fs.readFileSync(path.join(dir,'seek-effect-after.png')),Buffer.from('second frame'));
  const record=JSON.parse(fs.readFileSync(path.join(dir,'seek-effect-failure.json')));
  assert.equal(record.label,'test frame 15');assert.notEqual(record.before_sha256,record.after_sha256);
  buffers.push(Buffer.from('third frame'),Buffer.from('fourth frame'));
  await assert.rejects(()=>checkEffectSeek(page,dir,.5,4.01,'second failure'),/EEXIST/);
  assert.deepEqual(fs.readFileSync(path.join(dir,'seek-effect-before.png')),Buffer.from('first frame'));
});

test('equal seeks return exact captured bytes without diagnostic files',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ysc-seek-test-'));t.after(()=>fs.rmSync(dir,{recursive:true}));
  const captured=Buffer.from('same frame'),page={evaluate:async()=>{},screenshot:async()=>captured};
  const result=await checkEffectSeek(page,dir,1,2,'same');assert.deepEqual(result.captured,captured);
  assert.deepEqual(fs.readdirSync(dir),[]);
});
