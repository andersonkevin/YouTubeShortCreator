/* HyperFrames vfx-shatter, Apache-2.0. Retained seeded radial Voronoi
   approximation and fixed-step physics. Source HTML and demo content excluded. */
(()=>{
  'use strict';
  const count=200,duration=12,clamp=x=>Math.max(0,Math.min(1,x));
  const source="8e74692cd23813233ad826ee1ec2379c4f6ec91128b774e8df4b8bf23bff3dbf";
  function mulberry32(seed) {
        return function () {
          seed |= 0;
          seed = (seed + 0x6d2b79f5) | 0;
          var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
  function data(aspect){
    if(!Number.isFinite(aspect)||aspect<.5||aspect>4)throw new Error('Invalid shatter aspect');
    const SHARD_COUNT=count,rng=mulberry32(42);
    // Source demo confetti consumes 60 * 5 draws before shard generation.
    for(let i=0;i<300;i++)rng();
    var seeds = [];
      for (var s = 0; s < SHARD_COUNT; s++) {
        var sx, sy;
        // 40% of points biased toward center for denser cracking there
        if (s < SHARD_COUNT * 0.4) {
          var angle = rng() * Math.PI * 2;
          var radius = rng() * 0.35;
          sx = 0.5 * aspect + Math.cos(angle) * radius * aspect;
          sy = 0.5 + Math.sin(angle) * radius;
        } else {
          sx = rng() * aspect;
          sy = rng();
        }
        seeds.push({ x: sx, y: sy });
      }
function computeShardPolygons(seeds) {
        var shards = [];
        var ANGLES = 32;

        for (var i = 0; i < seeds.length; i++) {
          var cx = seeds[i].x;
          var cy = seeds[i].y;
          var verts = [];

          for (var a = 0; a < ANGLES; a++) {
            var theta = (a / ANGLES) * Math.PI * 2;
            var dx = Math.cos(theta);
            var dy = Math.sin(theta);

            // Find closest bisector intersection along this ray
            var minT = 999;

            for (var j = 0; j < seeds.length; j++) {
              if (j === i) continue;
              // Midpoint between seeds i and j
              var mx = (cx + seeds[j].x) * 0.5;
              var my = (cy + seeds[j].y) * 0.5;
              // Normal of bisector: direction from i to j
              var nx = seeds[j].x - cx;
              var ny = seeds[j].y - cy;
              // Ray-plane intersection: t = dot(m - c, n) / dot(d, n)
              var denom = dx * nx + dy * ny;
              if (denom <= 0.0001) continue;
              var t = ((mx - cx) * nx + (my - cy) * ny) / denom;
              if (t > 0.001 && t < minT) minT = t;
            }

            // Clamp to bounding box
            if (dx > 0) {
              var tb = (aspect - cx) / dx;
              if (tb > 0 && tb < minT) minT = tb;
            }
            if (dx < 0) {
              var tb2 = -cx / dx;
              if (tb2 > 0 && tb2 < minT) minT = tb2;
            }
            if (dy > 0) {
              var tb3 = (1 - cy) / dy;
              if (tb3 > 0 && tb3 < minT) minT = tb3;
            }
            if (dy < 0) {
              var tb4 = -cy / dy;
              if (tb4 > 0 && tb4 < minT) minT = tb4;
            }

            if (minT < 998) {
              verts.push({
                x: cx + dx * minT,
                y: cy + dy * minT,
              });
            }
          }

          if (verts.length < 3) continue;

          // Sort vertices by angle from centroid
          var centX = 0,
            centY = 0;
          for (var v = 0; v < verts.length; v++) {
            centX += verts[v].x;
            centY += verts[v].y;
          }
          centX /= verts.length;
          centY /= verts.length;

          verts.sort(function (a, b) {
            return Math.atan2(a.y - centY, a.x - centX) - Math.atan2(b.y - centY, b.x - centX);
          });

          // Fan triangulation from centroid
          var triangles = [];
          for (var v2 = 0; v2 < verts.length; v2++) {
            var next = (v2 + 1) % verts.length;
            triangles.push([{ x: centX, y: centY }, verts[v2], verts[next]]);
          }

          shards.push({
            seedX: cx,
            seedY: cy,
            centroidX: centX,
            centroidY: centY,
            triangles: triangles,
            verts: verts,
          });
        }

        return shards;
      }
    const shards=computeShardPolygons(seeds);
    if(shards.length!==count)throw new Error('Incomplete shatter subdivision');
    const initial=shards.map(sd=>{
      const fromCenterX=sd.centroidX-aspect*.5,fromCenterY=sd.centroidY-.5;
      const length=Math.sqrt(fromCenterX*fromCenterX+fromCenterY*fromCenterY)+.001;
      const speed=.3+rng()*.7,upKick=.2+rng()*.5;
      return {cx:fromCenterX,cy:-fromCenterY,vx:fromCenterX/length*speed*(.5+rng()*.8),
        vy:-fromCenterY/length*speed*(.3+rng()*.6)+upKick,vz:(rng()-.5)*.3,
        rx:(rng()-.5)*4,ry:(rng()-.5)*4,rz:(rng()-.5)*6};
    });
    return {aspect,seeds,shards,initial};
  }
  function state(seconds){
    if(!Number.isFinite(seconds))throw new Error('Finite shatter time required');
    const time=Math.max(0,Math.min(duration,seconds)),phase=time<2?0:time<4?1:2,p=clamp((time-4)/1.5);
    return {time,phase,crack:phase===1?clamp((time-2)/2)**2:0,
      background:phase===2?p*p*(3-2*p):0,opacity:time<=10?1:(12-time)/2};
  }
  function physics(model,seconds){
    if(!model||model.initial?.length!==count)throw new Error('Invalid shatter model');
    const s=state(seconds),t=Math.max(0,s.time-4),shardPhysics=model.initial.map(row=>({...row}));
    const GRAVITY=-2.5,FLOOR_Y=-.8,DAMPING=.6,FRICTION=.92,DURATION=12,SHATTER_SETTLE=10,SHATTER_START=4;
    function updateShardPhysics(t) {
        // t is time since shatter start (0 at SHATTER_START)
        var dt = 1 / 30; // fixed step for determinism
        var steps = Math.floor(t / dt);

        for (var i = 0; i < shardPhysics.length; i++) {
          var sp = shardPhysics[i];

          // Reset and simulate from zero for determinism
          var px = 0,
            py = 0,
            pz = 0;
          var rx = 0,
            ry = 0,
            rz = 0;
          var vx = sp.vx,
            vy = sp.vy,
            vz = sp.vz;
          var avx = sp.rx,
            avy = sp.ry,
            avz = sp.rz;
          var settled = false;

          for (var step = 0; step < steps && !settled; step++) {
            // Apply gravity
            vy += GRAVITY * dt;

            // Update position
            px += vx * dt;
            py += vy * dt;
            pz += vz * dt;

            // Update rotation
            rx += avx * dt;
            ry += avy * dt;
            rz += avz * dt;

            // Floor collision (relative to shard centroid)
            var worldY = sp.cy + py;
            if (worldY < FLOOR_Y && vy < 0) {
              py = FLOOR_Y - sp.cy;
              vy = -vy * DAMPING;
              vx *= FRICTION;
              vz *= FRICTION;
              avx *= FRICTION;
              avy *= FRICTION;
              avz *= FRICTION;

              // Settle if velocity is very small
              if (Math.abs(vy) < 0.05) {
                vy = 0;
                settled = true;
              }
            }
          }

          sp.posX = px;
          sp.posY = py;
          sp.posZ = pz;
          sp.rotX = rx;
          sp.rotY = ry;
          sp.rotZ = rz;
          sp.settled = settled;

          // Fade out shards at the very end
          var fadeDuration = DURATION - SHATTER_SETTLE;
          var elapsed = t + SHATTER_START;
          if (elapsed > SHATTER_SETTLE) {
            sp.opacity = Math.max(0, 1.0 - (elapsed - SHATTER_SETTLE) / fadeDuration);
          } else {
            sp.opacity = 1.0;
          }
        }
      }
    updateShardPhysics(t);return shardPhysics;
  }
  function clock(time,onsets){
    if(onsets.length!==2||!onsets.every(Number.isFinite)||onsets[1]-onsets[0]<12-1e-8||
      Math.ceil(onsets[1]*30)-Math.ceil(onsets[0]*30)<360)throw new Error('Shatter needs twelve seconds between two anchors');
    return window.ShortCreatorCarousels.clock(time,onsets,duration);
  }
  function vertices(shard,aspect){
    const positions=[],uvs=[];
    for(const tri of shard.triangles)for(const p of tri){positions.push(p.x-aspect*.5,.5-p.y,0);uvs.push(p.x/aspect,1-p.y);}
    return {positions,uvs};
  }
  window.ShortCreatorShatterMotion={source,count,duration,data,state,physics,clock,vertices};
})();
