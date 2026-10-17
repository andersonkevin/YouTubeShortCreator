import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-interface-social.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorInterfaceSocial;
test('supplied social actions change only on the source release beat and settle exactly',()=>{
  for(const kind of ['post','discussion','follow']) {
    const threshold=kind==='follow'?(1.15-.1)/1.45:(1.62-.1)/1.92;
    assert.equal(api.cardAt(kind,threshold-1e-6).changed,false);
    assert.equal(api.cardAt(kind,threshold+1e-6).changed,true);
    const s=api.cardAt(kind,1);assert.equal(s.arrival,1);assert.equal(s.action,1);
    assert.equal(api.cardAt(kind,0).arrival,0);
    assert.ok(Array.from({length:100},(_,i)=>api.cardAt(kind,i/100).action).some(x=>x<.95));
  }
});
test('comment entry stages avatar, identity, exact graphemes and footer without changing claims',()=>{
  for(const count of [1,24,72]) {
    const start=api.cardAt('comment',0,count),end=api.cardAt('comment',1,count);
    assert.ok(start.ink.every(x=>x===0));assert.equal(start.footer,0);assert.equal(start.changed,false);
    assert.ok(end.ink.every(x=>x===1));assert.equal(end.footer,1);assert.equal(end.avatar,1);assert.equal(end.changed,false);
    let last=0;
    for(let f=0;f<=24;f++) {const s=api.cardAt('comment',f/24,count),sum=s.ink.reduce((a,b)=>a+b,0);
      assert.ok(sum>=last);assert.ok(s.ink.every(x=>x>=0&&x<=1));last=sum;}
  }
});
test('notification stack keeps two blank depth peeks, top anchor and current copy',()=>{
  for(const H of [418,724,1060])for(let active=0;active<4;active++) {
    const h=192,front=api.peekAt(active,active,1,H,h);
    assert.equal(front.scaleX,1);assert.equal(front.scaleY,1);assert.equal(front.copy,true);
    assert.ok(front.y>=0&&front.y+h<=H);
    for(let i=0;i<active;i++) {const s=api.peekAt(i,active,1,H,h),d=active-i;
      assert.equal(s.y,front.y);assert.equal(s.scaleX,1-.045*d);
      assert.ok(Math.abs(h*s.scaleY-(h+8*d))<1e-8);
      assert.equal(s.opacity,d<=2?1:0);assert.equal(s.copy,false);
    }
  }
});
test('all motions reconstruct in reverse with native ten-minute frame onsets',()=>{
  const onset=590.4,states=[];
  for(let i=0;i<=60;i++) {const p=api.progress(onset+i/30,onset);
    states.push(JSON.stringify([api.cardAt('post',p),api.cardAt('comment',p,24),api.peekAt(1,3,p,418,192)]));}
  for(let i=60;i>=0;i--) {const p=api.progress(onset+i/30,onset);
    assert.equal(JSON.stringify([api.cardAt('post',p),api.cardAt('comment',p,24),api.peekAt(1,3,p,418,192)]),states[i]);}
  assert.equal(api.progress(onset,onset),0);assert.equal(api.progress(onset+.8,onset),1);
});
