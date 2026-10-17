import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const context={window:{},document:{getElementById:()=>null}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-scenes.js',import.meta.url),'utf8'),context);
const {phase,positionsAt,wrappedPositions,textMatch,cameraTarget}=context.window.ShortCreatorProductionMath;

test('visual progress holds exact endpoints through arbitrary backward seeks',()=>{
  const times=[0,4,4.4,4.8,6,4.2,4,0,6];
  const values=times.map(t=>phase(t,4));
  assert.equal(values[0],0);assert.equal(values[1],0);assert.equal(values[3],1);assert.equal(values[4],1);
  assert.equal(values[6],0);assert.equal(values[8],1);
  assert.ok(values[2]>values[5]&&values[5]>0);
});
test('headline match uses one continuous carrier at the cut and exact hold endpoints',()=>{
  assert.equal(textMatch(0).x,140);assert.equal(textMatch(1).x,-140);
  assert.ok(Math.abs(textMatch(.5).x)<1e-5);
  const before=textMatch(.5-1/24),cut=textMatch(.5),after=textMatch(.5+1/24);
  assert.ok(before.x>cut.x&&cut.x>after.x);
  assert.ok(Math.abs((cut.x-before.x)/(after.x-cut.x)-1)<1e-5);
  for(const p of [0,.1,.49,.5,.51,.9,1]) {
    const a=textMatch(p);textMatch(1);textMatch(0);
    assert.deepEqual(textMatch(p),a);assert.ok(a.blur>=0&&a.blur<=6);
  }
});
test('image focus uses fitted image coordinates and keeps the camera inside its surface',()=>{
  for(const [iw,ih] of [[1600,900],[900,1600],[1000,1000]]) {
    for(const [x,y] of [[0,0],[.8,0],[0,.8],[.4,.4],[.8,.8]]) {
      const r=cameraTarget(1040,520,iw,ih,{x,y,width:.2,height:.2,zoom:2});
      assert.ok(Math.abs(r.x)<=520&&Math.abs(r.y)<=260);
      const left=520+(r.left-520)*r.scale+r.x,top=260+(r.top-260)*r.scale+r.y;
      assert.ok(left>=-1e-6&&top>=-1e-6);
      assert.ok(left+r.width*r.scale<=1040+1e-6&&top+r.height*r.scale<=520+1e-6);
    }
  }
});
test('kinetic words retain their measured widths, reading order and centered group',()=>{
  for(const widths of [[120,340],[300,85,440],[80,95,110,130,170,200]]) {
    const stages=positionsAt(widths);
    stages.forEach((positions,last)=>{
      assert.ok(Math.abs((positions[0]+positions.at(-1)+widths[last])/2-860)<1e-8);
      for(let i=1;i<positions.length;i++)assert.ok(positions[i]>=positions[i-1]+widths[i-1]+24-1e-8);
    });
    assert.equal(JSON.stringify(stages),JSON.stringify(positionsAt(widths)));
  }
});

test('wrapped kinetic words retain bounds and reading order in compact layouts',()=>{
  for(const width of [940,960]) {
    const widths=[300,320,350,410,280,300];
    const stages=wrappedPositions(widths,width,750,126);
    for(const [last,positions] of stages.entries()) {
      for(const [i,p] of positions.entries()) {
        assert.ok(p.x>=0&&p.x+widths[i]<=width&&p.y>=0&&p.y+126<=750);
        if(i>0)assert.ok(p.y>positions[i-1].y||p.x>=positions[i-1].x+widths[i-1]+24);
      }
      assert.equal(positions.length,last+1);
    }
    assert.equal(JSON.stringify(stages),JSON.stringify(wrappedPositions(widths,width,750,126)));
  }
  assert.throws(()=>wrappedPositions([961],960,750,126));
  assert.throws(()=>wrappedPositions([800,800,800],960,200,126));
  for(const width of [940,960,1720]) {
    const distance=140*width/1720;
    assert.equal(textMatch(0,distance).x,distance);
    assert.equal(textMatch(1,distance).x,-distance);
    assert.ok(Math.abs(textMatch(.5,distance).x)<1e-6);
  }
});
