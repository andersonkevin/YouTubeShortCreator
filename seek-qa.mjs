import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

export function effectFrames(start,duration,dense=false) {
  assert.ok(Number.isFinite(start)&&start>=0,'Invalid effect cue start');
  assert.ok(Number.isInteger(duration)&&duration>0&&duration<=60,'Invalid effect frame duration');
  const onset=Math.ceil(start*30);
  const offsets=dense?Array.from({length:duration+3},(_,i)=>i-1):[-1,0,1,Math.floor(duration/2),duration-1,duration,duration+1];
  return [...new Set(offsets.map(offset=>onset+offset))].sort((a,b)=>a-b);
}

export async function checkEffectSeek(page,out,time,reset,label) {
  await page.evaluate(t=>window.ShortCreatorRenderAt(t),time);
  // Full-frame PNGs match export; clipped captures can alter Chromium's raster cache.
  const captured=await page.screenshot();
  await page.evaluate(t=>window.ShortCreatorRenderAt(t),reset);
  await page.evaluate(t=>window.ShortCreatorRenderAt(t),time);
  const repeated=await page.screenshot(),hash=sha(captured),repeatHash=sha(repeated);
  if(hash!==repeatHash) {
    fs.writeFileSync(path.join(out,'seek-effect-before.png'),captured,{flag:'wx'});
    fs.writeFileSync(path.join(out,'seek-effect-after.png'),repeated,{flag:'wx'});
    fs.writeFileSync(path.join(out,'seek-effect-failure.json'),JSON.stringify({
      status:'FAILED',label,time,reset,before_sha256:hash,after_sha256:repeatHash,
      assertion:'Exact full-frame PNG equality; no tolerance or retry',
    },null,2)+'\n',{flag:'wx'});
  }
  assert.equal(hash,repeatHash,'Non-deterministic visual effect: '+label);
  return {captured,hash};
}
