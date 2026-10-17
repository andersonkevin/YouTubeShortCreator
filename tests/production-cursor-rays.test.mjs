import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const file of ['production-cursor-rays-shader.js','production-cursor-rays.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const {state,geometry,logoBox,graphemes,palette,createRenderer}=context.window.ShortCreatorCursorRays;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('source light sweep, entry and exponential withdrawal keep their distinct curves',()=>{
  const at=state(.5,4);near(at.logoY,760/32);near(state(.89,4).effect,.9375);
  near(state(1.86,4).cursor,.5);near(state(3,4).logoScale,1-.6/32);near(state(3,4).canvasAlpha,31/32);
  near(state(3.1,4).canvasAlpha,0);near(state(3.1,4).logoScale,.4);near(state(3.1,4).cardScale,1.45);
  near(state(3.55,4).cardScale,1.45-.57*(-.806*.25+1.806*.5));
  near(state(4.2,4).cardScale,.86);near(state(4.2,4).cardBlur,.75);near(state(4.4,4).cardScale,.84);
});
test('measured-caret typing, slide, supporting cascade and title handoff are ordered',()=>{
  for(const count of [1,4,8]) {
    near(state(3.15,count).typed,1);
    for(let i=0;i<count;i++)assert.equal(state(3.15+i*.085,count).typed,i+1);
    const s=state(8,count);near(s.slideStart,3.15+(count-1)*.085+.25);near(s.slideEnd,s.slideStart+.05);
    near(state(s.slideStart+.025,count).wordSlide,.875);
    near(state(s.slideEnd+.21,count).support[0],31/32);
    near(state(s.exitStart+.18,count).firstExit,.125);near(state(s.secondStart,count).firstAlpha,0);
    near(state(s.secondStart+.24,count).secondEntry,31/32);assert.equal(state(s.typeEnd,count).caret,0);
    assert.ok(s.secondStart+.48<8);
  }
  assert.deepEqual(plain(graphemes('e\u0301 a\u0308\u0304')),['e\u0301',' ','a\u0308\u0304']);
});
test('all subframes rewind exactly and hold the final supplied headline',()=>{
  for(let f=0;f<=480;f++) {
    const expected=plain(state(f/60,8));state(600,8);state(0,1);assert.deepEqual(plain(state(f/60,8)),expected);
    for(const value of Object.values(expected).flat())assert.ok(Number.isFinite(value));
  }
  assert.deepEqual(plain(state(600,8)),plain(state(8,8)));
  for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>state(t,4));
  for(const count of [0,9,2.4])assert.throws(()=>state(1,count));
});
test('source magnification fits all four native boards and the approved logo keeps its aspect',()=>{
  for(const [W,H] of [[1720,636],[940,1246],[960,636],[960,866]]) {
    const g=geometry(W,H);
    for(const scale of [1.45,.88,.84]) {
      assert.ok(g.card.w*scale<=W-64+1e-8&&g.card.h*scale<=H-64+1e-8);
      assert.ok(g.travel>g.card.w);
    }
    for(const [w,h] of [[600,100],[100,600],[300,300]]) {
      const b=logoBox(W,H,w,h);near(b.w/b.h,w/h);
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=W&&b.y+b.h<=H);
    }
  }
  assert.throws(()=>geometry(400,600));assert.throws(()=>logoBox(960,600,0,10));
});
test('pinned ray shader retains the original sampling and mask/color passes with explicit brand substitutions',()=>{
  const shader=context.window.ShortCreatorCursorRayShader;
  assert.equal(shader.source_sha256,'71834bda1e5a5a45aa137e5b0eca2b9ed408cb7dc9b47a0dd4008eb7b4cfe235');
  for(const line of ['#define SAMPLES 112.0','rp += hash2(vec3(rp, i)) * 0.5 / SAMPLES;',
    'acc += readMask(rayLogoUv).r / SAMPLES;','vec4 logo = readColor(logoUv);',
    'float sweep = exp(-pow((uv.x - cursorX) * 6.2, 2.0));','c.rgb += logo.rgb * acc * 1.18;',
    'c.rgb += ground * (1.0 - logo.a);','return mix(accent, secondary, 0.5 + 0.5 * cos(x * PI));'])assert.ok(shader.fragment.includes(line),line);
  assert.ok(!/https?:|Math\.random|Date\.now/.test(shader.fragment));
});
test('palette and WebGL availability fail closed rather than showing a partial fallback',()=>{
  const colors=palette({getPropertyValue:key=>({'--purple':'#180a28','--lime':'#b4ff39','--cyan':'#36dbff'}[key])});
  near(colors.accent[0],180/255);near(colors.secondary[2],1);
  assert.throws(()=>palette({getPropertyValue:()=> 'orange'}));
  context.document={createElement:()=>({getContext:()=>null})};assert.throws(()=>createRenderer(),/WebGL is unavailable/);
});
