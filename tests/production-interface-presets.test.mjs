import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-interface','production-interface-presets'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const p=context.window.ShortCreatorInterfacePresets;
test('sampled sheet keeps the measured overshoot and exact final rest',()=>{
  assert.equal(p.sheetAt(0,1450).y,1450);assert.equal(p.sheetAt(0,1450).opacity,0);
  assert.equal(p.sheetAt(.423/.723,1450).y,-192);
  assert.equal(p.sheetAt(1,1450).y,0);assert.equal(p.sheetAt(1,1450).opacity,1);
  for(let frame=0;frame<=24;frame++){
    const s=p.sheetAt(frame/24,70);assert.ok(s.y>=-10&&s.y<=70);assert.ok(s.opacity>=0&&s.opacity<=1);
  }
});
test('notification spring is a damped response with an exact settled endpoint',()=>{
  assert.equal(p.springAt(0),1);assert.equal(p.springAt(1),0);
  assert.ok(Array.from({length:24},(_,i)=>p.springAt(i/24)).some(x=>x<0));
  assert.ok(Math.abs(p.springAt(.95))<.001);
});
test('every notification presentation settles inside all four boards',()=>{
  for(const H of [418,1060,418,724])for(const count of [2,3,4]){
    const gap=Math.max(16,H*.035),h=(H-gap*(count-1))/count;
    for(const kind of p.variants.notifications)for(let active=0;active<count;active++){
      const seen=[];
      for(let i=0;i<=active;i++){
        const s=p.notificationAt(kind,i,active,1,1,H,h,gap);seen.push(s.y);
        assert.ok(s.y>=-1e-8&&s.y+h<=H+1e-8);assert.equal(s.opacity,1);assert.equal(s.rotation,0);assert.equal(s.scale,1);
      }
      seen.sort((a,b)=>a-b);for(let i=1;i<seen.length;i++)assert.ok(seen[i]-seen[i-1]>=h-1e-8);
    }
  }
});
test('stack shifts reserve the next message before its typing indicator appears',()=>{
  const onsets=[.5,3.5,6.5,9.5],items=[{side:'sent'},{side:'received'},{side:'sent'},{side:'received'}];
  assert.equal(p.waitAdvance(.5,onsets,items,1,true),0);
  assert.equal(p.waitAdvance(2.5,onsets,items,1,true),1);
  assert.equal(p.waitAdvance(2.5,onsets,items,1,false),0);
  assert.equal(p.waitAdvance(5.5,onsets,items,2,true),0);
  const H=418,h=92.5,gap=16;
  const before=p.stackY(0,0,1,H,h,gap)-h-gap;
  const after=p.stackY(0,1,0,H,h,gap,1);
  assert.equal(before,after);
  for(let active=0;active<4;active++)for(let i=0;i<=active;i++)assert.ok(p.stackY(i,active,1,H,h,gap)>=0);
});
test('measured typing rhythm preserves graphemes, literal content and exact copy',()=>{
  for(const text of ['cafe\u0301 <script>','界  two spaces','A\u0308B C']){
    const valid=['',...Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),s=>text.slice(0,s.index+s.segment.length))];
    assert.equal(p.noteAt(text,0),'');assert.equal(p.noteAt(text,1),text);
    let previous=0;
    for(let f=0;f<=24;f++){const t=p.noteAt(text,f/24);assert.ok(valid.includes(t));assert.ok(t.length>=previous);previous=t.length;}
    const tokens=p.tokenState(text,1);assert.equal(tokens.map(s=>s.text).join(''),text);assert.ok(tokens.every(s=>s.visible&&s.ink===1));
    assert.ok(p.tokenState(text,0).every(s=>!s.visible));
  }
});
test('feedback shakes only an explicit error and always returns to rest',()=>{
  assert.equal(p.feedbackAt(.35,'valid').x,0);assert.notEqual(p.feedbackAt(.35,'error').x,0);
  for(const state of ['valid','error']){
    const result=p.feedbackAt(1,state);assert.equal(result.x,0);assert.equal(result.y,0);assert.equal(result.opacity,1);assert.equal(result.badge,1);assert.equal(result.hint,1);
  }
});
test('presets reconstruct the same state in reverse, including ten-minute cues',()=>{
  const onsets=[590.4,592.4,594.4,596.4],items=[{side:'sent'},{side:'received'},{side:'sent'},{side:'received'}];
  const sample=t=>JSON.stringify([p.progress(t,onsets[1]),p.waitAdvance(t,onsets,items,1,true),
    p.noteAt('Explicit content',p.progress(t,onsets[1])),p.tokenState('Explicit token text',p.progress(t,onsets[2]))]);
  const states=Array.from({length:300},(_,i)=>sample(590+i/30));
  for(let i=299;i>=0;i--)assert.equal(sample(590+i/30),states[i]);
  const cue=Math.ceil(onsets[1]*30);assert.equal(p.progress(cue/30,onsets[1]),0);assert.equal(p.progress((cue+24)/30,onsets[1]),1);
});
