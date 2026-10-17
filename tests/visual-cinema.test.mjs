import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/visual-cinema.js',import.meta.url),'utf8'),context);
const {seam,duration}=context.window.ShortCreatorCinema;
test('cinematic seams preserve direction and match velocity across the cut',()=>{
  for(const kind of ['cut-left','zoom-through']) {
    const key=kind==='cut-left'?'x':'scale',sign=kind==='cut-left'?-1:1;
    const a=seam(kind,'exit',.9999),b=seam(kind,'exit',1);
    const c=seam(kind,'entry',0),d=seam(kind,'entry',.0001);
    const outgoing=b[key]-a[key],incoming=d[key]-c[key];
    assert.ok(outgoing*sign>0&&incoming*sign>0);
    assert.ok(Math.abs(outgoing-incoming)<1e-8);
    assert.equal(b.opacity,c.opacity);assert.equal(b.blur,c.blur);
  }
  assert.equal(duration,.4);
});
test('cinematic seams settle, stay bounded, and repeat after reverse seeks',()=>{
  for(const kind of ['cut-left','zoom-through']) {
    const target=JSON.stringify(seam(kind,'entry',.27));
    seam(kind,'exit',1);seam(kind,'entry',0);
    assert.equal(JSON.stringify(seam(kind,'entry',.27)),target);
    const end=seam(kind,'entry',1);
    assert.equal(end.x,0);assert.equal(end.scale,1);assert.equal(end.opacity,1);assert.equal(end.blur,0);
    for(let i=0;i<=30;i++)for(const side of ['entry','exit']) {
      const value=seam(kind,side,i/30);
      assert.ok(value.opacity>=.31&&value.opacity<=1&&Math.abs(value.x)<=130&&value.blur<=10);
    }
  }
  assert.throws(()=>seam('arbitrary-css','entry',0));
  assert.throws(()=>seam('cut-left','entry',NaN));
});
