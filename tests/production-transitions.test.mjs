import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-transitions.js',import.meta.url),'utf8'),context);
const {cover,curtainPose,gridCells,gridScale,halftoneDots,dotRadius,whipState}=context.window.ShortCreatorTransitions;
test('screen cover hides the swap at its peak and leaves both endpoints clear',()=>{
  assert.equal(cover(0),0);assert.equal(cover(.5),1);assert.equal(cover(1),0);
  for(let i=0;i<=24;i++)assert.ok(Math.abs(cover(i/24)-cover(1-i/24))<1e-12);
  for(const side of [0,1]) {
    const shut=curtainPose(0,side),open=curtainPose(1,side);
    assert.equal(shut.length,11);assert.ok(open.every(f=>f.sx===0));
    assert.ok(shut.every(f=>f.sx===1&&f.sy===1));
    const end=Math.abs(shut.at(-1).x)+shut.at(-1).width;
    assert.ok(Math.abs(end-51)<1e-10);
  }
});
test('grid center cascade covers every cell before replacing the image',()=>{
  for(const [width,height] of [[1040,520],[360,600],[900,600],[200,340]]) {
    const cells=gridCells(width,height);assert.ok(cells.length>=64&&cells.length<=640);
    for(const cell of cells) {
      assert.equal(gridScale(0,cell.delay),0);assert.equal(gridScale(1,cell.delay),0);
      assert.equal(gridScale(.5,cell.delay),1.04);
      assert.ok(cell.delay>=0&&cell.delay<.45);
    }
    assert.ok(gridScale(.2,cells[0].delay)<Math.max(...cells.map(c=>gridScale(.2,c.delay))));
  }
});
test('seeded halftone windows are monotonic and cover the viewport at the final state',()=>{
  for(const [width,height] of [[1040,520],[360,600],[900,600],[200,340]]) {
    const dots=halftoneDots(width,height);
    assert.equal(JSON.stringify(dots),JSON.stringify(halftoneDots(width,height)));
    for(const d of dots) {
      assert.equal(dotRadius(d,0),0);assert.equal(dotRadius(d,1),d.maximum);
      let previous=0;
      for(let i=0;i<=24;i++) {
        const radius=dotRadius(d,i/24);assert.ok(radius>=previous&&radius<=d.maximum);
        assert.ok(dotRadius(d,i/24,true)>=radius);previous=radius;
      }
    }
    for(let y=0;y<=height;y+=height/30)for(let x=0;x<=width;x+=width/30)
      assert.ok(dots.some(d=>Math.hypot(x-d.x,y-d.y)<=d.maximum),'Uncovered final halftone position');
  }
});
test('whip shares one monotonic strip and bounded horizontal blur through reverse seeks',()=>{
  for(const width of [200,360,900,1040]) {
    assert.equal(whipState(0,width).x,0);assert.equal(whipState(1,width).x,-width);
    assert.equal(whipState(.5,width).x,-width/2);assert.equal(whipState(.5,width).blur,16);
    assert.equal(whipState(0,width).blur,0);assert.equal(whipState(1,width).blur,0);
    let previous=1;
    for(let i=0;i<=24;i++) {
      const a=whipState(i/24,width);assert.ok(a.x<=previous);previous=a.x;
      assert.ok(a.blur>=0&&a.blur<=16);whipState(1,width);
      assert.equal(JSON.stringify(a),JSON.stringify(whipState(i/24,width)));
    }
  }
});
