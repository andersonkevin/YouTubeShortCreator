import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-maps.js',import.meta.url),'utf8'),{window});
const m=window.ShortCreatorMaps;

test('all 50 states and DC retain unique grid positions and fit all four art slots',()=>{
  assert.equal(Object.keys(m.grid).length,51);
  assert.deepEqual([...Object.keys(m.grid)].sort(),'AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split(' '));
  assert.equal(new Set(Object.values(m.grid).map(p=>p.join(','))).size,51);
  for(const [w,h] of [[1720,292],[940,814],[960,292],[960,522]]) {
    const cells=m.hexLayout(w,h);
    assert.equal(new Set(cells.map(c=>c.rank)).size,51);
    for(const cell of cells) {
      assert.ok(cell.r>17);
      assert.ok(m.hexPoints(cell).every(p=>p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h));
      // Two BrandMono letters at the fixed 22px role have a conservative 27px box.
      for(const other of cells)if(cell!==other)
        assert.ok(Math.abs(cell.x-other.x)>=27||Math.abs(cell.y-other.y)>=27);
    }
    // Separating-axis test catches the overlapping flat-top layout in the source.
    for(let i=0;i<cells.length;i++)for(const other of cells.slice(i+1)) {
      const a=m.hexPoints(cells[i]),b=m.hexPoints(other),axes=a.map((p,j)=>({x:a[(j+1)%6].y-p.y,y:p.x-a[(j+1)%6].x}));
      assert.ok(axes.some(axis=>{
        const pa=a.map(p=>p.x*axis.x+p.y*axis.y),pb=b.map(p=>p.x*axis.x+p.y*axis.y);
        return Math.max(...pa)<=Math.min(...pb)||Math.max(...pb)<=Math.min(...pa);
      }),`${cells[i].id} overlaps ${other.id}`);
    }
  }
});

test('bubble area represents the supplied value, including exact zero',()=>{
  assert.equal(m.bubbleRadius(0,100,600),0);
  const maximum=m.bubbleRadius(100,100,600);
  assert.equal(maximum,36);
  for(const value of [1,4,25,50,100])assert.ok(Math.abs((m.bubbleRadius(value,100,600)/maximum)**2-value/100)<1e-12);
  for(let i=0;i<=240;i++)assert.ok(m.pop(i/240)>=0&&m.pop(i/240)<1.11);
  assert.equal(m.pop(0),0);assert.equal(m.pop(1),1);
});

test('local-image contain mapping and curved routes preserve endpoints and bounds',()=>{
  for(const [iw,ih] of [[1920,1080],[1080,1920],[4096,32],[32,4096]]) {
    const box=m.contained(940,814,iw,ih);
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=940&&box.y+box.height<=814);
    assert.ok(Math.abs(box.width/box.height-iw/ih)<1e-9);
    const a={x:box.x+.15*box.width,y:box.y+.15*box.height},b={x:box.x+.85*box.width,y:box.y+.85*box.height};
    const path=m.arc(a,b,box.y+Math.min(6,box.height*.05));
    assert.equal(m.arcPoint(path,0).x,a.x);assert.equal(m.arcPoint(path,1).y,b.y);
    for(let i=0;i<=240;i++) {
      const p=m.arcPoint(path,i/240);
      assert.ok(p.x>=box.x&&p.x<=box.x+box.width&&p.y>=box.y&&p.y<=box.y+box.height);
      assert.equal(p.x,m.arcPoint(path,i/240).x);
    }
  }
});
