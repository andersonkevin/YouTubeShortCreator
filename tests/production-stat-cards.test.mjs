import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-stat-cards.js',import.meta.url),'utf8'),context);
const {kinds,pose,layout}=context.window.ShortCreatorStatCards;
const plain=value=>JSON.parse(JSON.stringify(value));
test('source statistic entries retain their different motion curves',()=>{
  assert.equal(pose('grid-stat',.5).x,-25);
  assert.ok(Math.abs(pose('soft-stat',.5).scale-1.0175)<1e-12);
  assert.equal(pose('rail-stat',.5).x,-1/32);
  assert.ok(pose('sticker-stat',.4).scale>1);
  assert.equal(pose('sticker-stat',.4).rotation,8);
});
test('all four card entrances finish and hold without seek history',()=>{
  for(const style of kinds){
    const end=pose(style,1);
    assert.equal(end.alpha,1);assert.equal(end.x,0);assert.equal(end.y,0);assert.equal(end.scale,1);
    assert.deepEqual(plain(end),plain(pose(style,600)));
    const frames=Array.from({length:25},(_,i)=>plain(pose(style,i/24)));
    for(let i=24;i>=0;i--){assert.deepEqual(plain(pose(style,i/24)),frames[i]);assert.ok(frames[i].alpha>=0&&frames[i].alpha<=1);}
  }
  assert.throws(()=>pose('other',.5));assert.throws(()=>pose('grid-stat',NaN));
});
test('settled card geometry fits each actual native plot',()=>{
  for(const [W,H] of [[1160,470],[940,600],[960,360],[960,440]])for(const style of kinds){
    const g=layout(W,H,style),angle=pose(style,1).rotation*Math.PI/180;
    const w=Math.abs(Math.cos(angle))*g.width+Math.abs(Math.sin(angle))*g.height;
    const h=Math.abs(Math.sin(angle))*g.width+Math.abs(Math.cos(angle))*g.height;
    assert.ok(g.cx-w/2>=0&&g.cx+w/2<=W&&g.cy-h/2>=0&&g.cy+h/2<=H);
    if(style==='soft-stat')assert.equal(g.width,g.height);
  }
  assert.throws(()=>layout(0,360,'grid-stat'));
});
