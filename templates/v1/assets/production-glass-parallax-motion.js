/* HyperFrames vfx-liquid-glass, Apache-2.0. Source seed/cell algorithms and
   parallax mechanics; native aspect, verified textures and finite cue clock. */
(()=>{'use strict';
const source="1c3d3eeb6d64c59dd8f7d211792de1b9abd73547c07bf3e79bd59e2a2882fa2f",duration=20,clamp=p=>Math.max(0,Math.min(1,p));
      function seededRandom(seed) {
        var v = seed >>> 0;
        return function () {
          v += 0x6d2b79f5;
          var m = v;
          m = Math.imul(m ^ (m >>> 15), m | 1);
          m ^= m + Math.imul(m ^ (m >>> 7), m | 61);
          return ((m ^ (m >>> 14)) >>> 0) / 4294967296;
        };
      }

      // ── Voronoi (self-contained, no d3) ────────────────────────────────
      function polygonArea(pts) {
        var a = 0;
        for (var i = 0; i < pts.length; i++) {
          var j = (i + 1) % pts.length;
          a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
        }
        return a * 0.5;
      }

      function polygonCentroid(pts) {
        var sa = polygonArea(pts) || 1;
        var cx = 0,
          cy = 0;
        for (var i = 0; i < pts.length; i++) {
          var j = (i + 1) % pts.length;
          var f = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
          cx += (pts[i][0] + pts[j][0]) * f;
          cy += (pts[i][1] + pts[j][1]) * f;
        }
        return { x: cx / (6 * sa), y: cy / (6 * sa) };
      }

      function clipPoly(poly, px, py, nx, ny) {
        var out = [];
        for (var i = 0; i < poly.length; i++) {
          var c = poly[i],
            n = poly[(i + 1) % poly.length];
          var dc = (c[0] - px) * nx + (c[1] - py) * ny;
          var dn = (n[0] - px) * nx + (n[1] - py) * ny;
          if (dc <= 0) out.push(c);
          if (dc <= 0 !== dn <= 0) {
            var t = dc / (dc - dn);
            out.push([c[0] + t * (n[0] - c[0]), c[1] + t * (n[1] - c[1])]);
          }
        }
        return out;
      }

      function computeVoronoi(points, xmin, ymin, xmax, ymax) {
        var cells = [];
        for (var i = 0; i < points.length; i++) {
          var px = points[i][0],
            py = points[i][1];
          var poly = [
            [xmin, ymin],
            [xmax, ymin],
            [xmax, ymax],
            [xmin, ymax],
          ];
          for (var j = 0; j < points.length; j++) {
            if (i === j) continue;
            var qx = points[j][0],
              qy = points[j][1];
            var mx = (px + qx) * 0.5,
              my = (py + qy) * 0.5;
            poly = clipPoly(poly, mx, my, qx - px, qy - py);
            if (poly.length < 3) break;
          }
          cells.push(poly.length >= 3 ? poly : null);
        }
        return cells;
      }


  function data(aspect){
    if(!Number.isFinite(aspect)||aspect<.5||aspect>4)throw new Error('Invalid glass aspect');
    const width=9.7*aspect/(16/9),height=5.78,cols=9,rows=6,rng=seededRandom(5297),points=[];
    const cw=width/cols,ch=height/rows;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const cp=1-Math.min(.62,Math.hypot((col+.5)/cols-.5,(row+.5)/rows-.5));
      const jx=(rng()-.5)*cw*(.58+cp*.16),jy=(rng()-.5)*ch*(.58+cp*.16);
      points.push([(col+.5)*cw+jx,(row+.5)*ch+jy]);
    }
    const cells=computeVoronoi(points,0,0,width,height),panes=[];
    cells.forEach((cell,index)=>{
      if(!cell||cell.length<3)throw new Error('Incomplete glass subdivision');
      const world=cell.map(p=>[p[0]-width/2,height/2-p[1]]),area=Math.abs(polygonArea(world));
      if(area<.034)throw new Error('Unsupported native glass cell');
      const cent=polygonCentroid(world),radLen=Math.max(Math.hypot(cent.x,cent.y),.001),rad={x:cent.x/radLen,y:cent.y/radLen};
      const local=world.map(p=>[(p[0]-cent.x)*.954,(p[1]-cent.y)*.954]);
      const outward=.046+rng()*.105,depthLift=area/(width*height)*1.42,phase=index*.71+rng()*4;
      const depth=.18+rng()*.1,bevel=Math.min(.108,Math.sqrt(area)*.095);
      const roughness=index%7===0?.08+rng()*.035:.012+rng()*.038,thickness=1.45+rng()*1.25;
      const basePos={x:cent.x+rad.x*outward,y:cent.y+rad.y*outward,z:.28+depthLift+rng()*.18};
      const baseRot={x:(rng()-.5)*.074,y:(rng()-.5)*.086,z:(rng()-.5)*.052};
      const speed=.28+rng()*.16,drift={x:.02+rng()*.026,y:.018+rng()*.024,z:.068+rng()*.092};
      const rotDrift={x:.016+rng()*.026,y:.018+rng()*.03,z:.008+rng()*.016},ptrWeight=.04+rng()*.052;
      panes.push({index,cell,local,area,cent,rad,depth,bevel,roughness,thickness,basePos,baseRot,phase,speed,drift,rotDrift,ptrWeight,
        edgeWBase:roughness>.08?.32:.44,edgeCBase:.18,edgePBase:.14});
    });
    return {aspect,width,height,points,cells,panes};
  }
  function pointer(seconds){
    if(!Number.isFinite(seconds))throw new Error('Finite glass time required');
    const time=Math.max(0,Math.min(duration,seconds));let x=.16,y=.04;
    for(const [start,length,tx,ty]of [[.5,3.5,.45,-.15],[4,3.5,-.35,.25],[7.5,3,.15,-.35],[10.5,3,-.45,.05],[13.5,3,.3,.2],[16.5,2.5,-.1,-.1],[19,1,.16,.04]]){
      const p=clamp((time-start)/length),e=start===19?(p<.5?4*p*p*p:1-(-2*p+2)**3/2):(1-Math.cos(Math.PI*p))/2;
      const px=x+(tx-x)*e,py=y+(ty-y)*e;
      if(time<start+length)return {time,x:px,y:py};x=tx;y=ty;
    }
    return {time,x,y};
  }
  function state(seconds,model){
    const ptr=pointer(seconds),time=ptr.time,scale=model.aspect/(16/9),wx=ptr.x*4.86*scale,wy=ptr.y*2.84;
    return {time,ptr,camera:[ptr.x*.38*scale,-ptr.y*.27,9.35],
      textPosition:[-ptr.x*.56*scale,ptr.y*.36,Math.sin(time*.28)*.018],textRotation:[ptr.y*.028,ptr.x*.042,0],
      glassRotation:[-ptr.y*.064,ptr.x*.078,0],edgeLight:[(3.1+ptr.x*.9)*scale,1.4+ptr.y*.55,3.4],warmLight:[(-4.4-ptr.x*.65)*scale,-2.2,3.2],
      panes:model.panes.map((d,i)=>{
        const t=time*d.speed+d.phase,awayX=d.basePos.x-wx,awayY=d.basePos.y-wy,awayLen=Math.max(Math.hypot(awayX,awayY),.001);
        const reveal=Math.max(0,1-Math.hypot(awayX,awayY)/2.18)**2,shatter=reveal*.36,spread=reveal*.24,shatterSpread=shatter*.68,slide=d.ptrWeight*1.9;
        return {position:[d.basePos.x+Math.sin(t*.42)*d.drift.x+ptr.x*slide+awayX/awayLen*(spread+shatterSpread),
          d.basePos.y+Math.cos(t*.38)*d.drift.y-ptr.y*slide*.72+awayY/awayLen*(spread+shatterSpread*.84),
          d.basePos.z+Math.sin(t*.52+i)*d.drift.z+reveal*.32+shatter*.74],
          rotation:[d.baseRot.x+Math.sin(t*.46)*d.rotDrift.x-ptr.y*d.ptrWeight*1.15+reveal*awayY/awayLen*.16+shatter*awayY/awayLen*.58,
          d.baseRot.y+Math.cos(t*.43)*d.rotDrift.y+ptr.x*d.ptrWeight*1.38-reveal*awayX/awayLen*.2-shatter*awayX/awayLen*.66,
          d.baseRot.z+Math.sin(t*.34)*d.rotDrift.z+reveal*Math.sin(t+i)*.028+shatter*(d.rad.x*awayY-d.rad.y*awayX)*.18],
          opacity:.76+shatter*.14,roughness:Math.min(.14,d.roughness+shatter*.048),
          edges:[d.edgeWBase+shatter*.34,d.edgeCBase+shatter*.22,d.edgePBase+shatter*.2]};
      })};
  }
  function clock(time,onsets){
    if(onsets.length!==2||!onsets.every(Number.isFinite)||onsets[1]-onsets[0]<20-1e-8||Math.ceil(onsets[1]*30)-Math.ceil(onsets[0]*30)<600)
      throw new Error('Glass parallax needs twenty seconds between two anchors');
    return window.ShortCreatorCarousels.clock(time,onsets,duration);
  }
  window.ShortCreatorGlassParallaxMotion={source,duration,data,pointer,state,clock};
})();
