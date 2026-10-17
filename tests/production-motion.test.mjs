import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-motion.js',import.meta.url),'utf8'),context);
const {kinds,seam}=context.window.ShortCreatorMotion;
test('new seams preserve direction and matched velocity across a hard cut',()=>{
  for(const kind of kinds.filter(k=>k!=='fade-through')) {
    const axis=kind.startsWith('cut-')?(kind==='cut-right'?'x':'y'):'scale';
    const sign=['cut-up','inverse-zoom'].includes(kind)?-1:1;
    const outgoing=seam(kind,'exit',1)[axis]-seam(kind,'exit',1-1/12)[axis];
    const incoming=seam(kind,'entry',1/12)[axis]-seam(kind,'entry',0)[axis];
    assert.ok(outgoing*sign>0&&incoming*sign>0,kind);
    assert.ok(Math.abs(outgoing/incoming-1)<1e-10,kind);
    assert.equal(seam(kind,'exit',1).blur,seam(kind,'entry',0).blur);
    assert.equal(seam(kind,'exit',1).opacity,seam(kind,'entry',0).opacity);
  }
});
test('all seams hold exact endpoints and remain bounded under reverse seeking',()=>{
  for(const kind of kinds) {
    assert.deepEqual(seam(kind,'entry',1),seam(kind,'exit',0));
    assert.equal(seam(kind,'entry',1).scale,1);assert.equal(seam(kind,'entry',1).opacity,1);
    for(const side of ['entry','exit'])for(const p of [0,.1,.5,.9,1,.3,0,1]) {
      const before=seam(kind,side,p);seam(kind,side,1-p);
      assert.deepEqual(seam(kind,side,p),before);
      assert.ok(Math.abs(before.x)<=130&&Math.abs(before.y)<=130);
      assert.ok(before.scale>=.82&&before.scale<=1.18&&before.blur>=0&&before.blur<=18);
      assert.ok(before.opacity>=0&&before.opacity<=1);
    }
  }
});
test('fade cuts on the ground and optical rack stays fully opaque',()=>{
  assert.equal(seam('fade-through','exit',1).opacity,0);
  assert.equal(seam('fade-through','entry',0).opacity,0);
  for(let i=0;i<=24;i++)for(const side of ['entry','exit']) {
    assert.equal(seam('rack-focus',side,i/24).opacity,1);
    assert.equal(seam('fade-through',side,i/24).scale,1);
  }
  for(const args of [['raw','entry',.5],['cut-up','both',.5],['cut-up','entry',NaN]])
    assert.throws(()=>seam(...args),/Invalid/);
});
