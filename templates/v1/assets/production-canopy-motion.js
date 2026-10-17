/* HyperFrames canopy-part-title, Apache-2.0. Source-derived preparation:
   two seeded sweeps, retained-leaf handoffs, geometry and focus/camera state.
   See production-canopy-provenance.json. Not a selectable native scene yet. */
(() => {
  'use strict';
  const source='dd24f698d1b62ab73a85cf25bd24006b3f5f386f43f045f3a90a68629204af3a';
  const kinds=Object.freeze(['monstera','alocasia','lance','calathea','fern']);
  function create(THREE,retainedBreeze=1,aspect=16/9) {
    if(THREE?.REVISION!=='185')throw new Error('Pinned canopy runtime required');
    if(!Number.isFinite(retainedBreeze)||retainedBreeze<0||retainedBreeze>2)
      throw new Error('Bounded retained-leaf motion required');
    if(!Number.isFinite(aspect)||aspect<.5||aspect>4)throw new Error('Bounded canopy aspect required');
    const LEAF_COUNT=170,STAY_COUNT=5,DUR=12,WIND_SPEED=1.06,WIND_STRENGTH=2.5;
    const CAM_DIST=13.6,RETAINED_BREEZE=retainedBreeze,DJ=.5;
    const windows=Object.freeze({d1:3.2,s2:5.2,d2:3.2});
    const clamp=THREE.MathUtils.clamp,degToRad=THREE.MathUtils.degToRad;
    const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
    const fov=aspect>=16/9?41:2*Math.atan(Math.tan(41*Math.PI/360)*(16/9)/aspect)*180/Math.PI;
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,40);
    const cameraTarget=new THREE.Vector3(0,0,-1.5),cameraOffset=new THREE.Vector3();
    const cameraOrbit=new THREE.Euler(0,0,0,'YXZ');
function mulberry32(seed) {
          return function () {
            seed |= 0;
            seed = (seed + 0x6d2b79f5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }

        /* V1's opening sweep plus a separate depth-lift batch. Each batch has
           exactly stayCount leaves reserved for edge rest slots. The lift
           carries the opening's remaining edge leaves past the camera. */
        var rand = mulberry32(0x6a756e67);
        var TEXT_HALF_W = 8.2,
          TEXT_HALF_H = 2.0;

        function buildBatch(batchIndex) {
          var out = [];
          for (var i = 0; i < LEAF_COUNT; i++) {
            var kindRoll = rand();
            var kind =
              kindRoll < 0.22
                ? "monstera"
                : kindRoll < 0.42
                  ? "alocasia"
                  : kindRoll < 0.68
                    ? "lance"
                    : kindRoll < 0.89
                      ? "calathea"
                      : "fern";
            /* Stayers are chosen AFTER the batch is built (exactly stayCount of
               them, scattered) — here every leaf just gets wind-seed rest values
               and a LOW flight band: in front of the text plane but pushed away
               from the camera so the depth of field leaves most leaves sharp. */
            var stayer = false;
            var y0 = (rand() * 2 - 1) * 3.6 - 0.5;
            var restX = (rand() * 2 - 1) * 9.2;
            var restY = y0;
            var restRZ = rand() * Math.PI * 2;
            out.push({
              batch: batchIndex,
              kind: kind,
              stayer: stayer,
              z: -4.6 + rand() * 3.0,
              xStart: -12.5 - rand() * 5.5,
              xEnd: 12.5 + rand() * 5.0,
              restX: restX,
              restY: restY,
              restRZ: restRZ,
              y0: y0,
              delay: rand() * 0.5,
              delay2: 0, // filled for batch-1 stayers below
              bobAmp: 0.3 + rand() * 0.65,
              bobN: 1.1 + rand() * 1.6,
              spin: (rand() < 0.5 ? -1 : 1) * (1.6 + rand() * 3.0),
              phase: rand() * Math.PI * 2,
              rotation: rand() * Math.PI * 2,
              tiltX: (rand() - 0.5) * 0.42,
              tiltY: (rand() - 0.5) * 0.58,
              widthMul: 0.83 + rand() * 0.34,
              lengthMul: 0.86 + rand() * 0.25,
              scale: (0.62 + rand() * 0.85) * 0.56 * 1.9,
            });
          }
          return out;
        }

        /* Exactly STAY_COUNT leaves per batch stay behind, scattered at seeded
           random positions anywhere in frame EXCEPT the headline band — never
           lined up along the top and bottom. */
        function pickStayers(batch) {
          var placed = 0,
            guard = 0;
          while (placed < STAY_COUNT && guard++ < 600) {
            var idx = Math.floor(rand() * batch.length) % batch.length;
            var sp = batch[idx];
            if (sp.stayer) continue;
            var rx,
              ry,
              tries = 0;
            do {
              rx = (rand() * 2 - 1) * 8.6;
              ry = (rand() * 2 - 1) * 4.3;
              tries++;
            } while (
              tries < 30 &&
              Math.abs(ry) < TEXT_HALF_H + 0.7 &&
              Math.abs(rx) < TEXT_HALF_W + 0.8
            );
            sp.stayer = true;
            sp.restX = rx;
            sp.restY = ry;
            if (Math.abs(rx) > TEXT_HALF_W + 0.8 && Math.abs(ry) < TEXT_HALF_H + 1.4) {
              sp.restRZ = ((rx > 0 ? -1 : 1) * Math.PI) / 2 + (rand() - 0.5) * 0.7;
            } else if (ry >= 0) {
              sp.restRZ = (rand() - 0.5) * 0.8;
            } else {
              sp.restRZ = Math.PI + (rand() - 0.5) * 0.8;
            }
            placed++;
          }
        }

        var batch1 = buildBatch(1);
        var batch2 = buildBatch(2);
        pickStayers(batch1);
        pickStayers(batch2);
        // Sweep-away order for batch-1 stayers: left-most leave first.
        batch1.forEach(function (s) {
          s.delay2 = ((s.restX + 16) / 32) * 0.5 + rand() * 0.14;
        });
        // Independent seed: V1's opening geometry/seed sequence is unchanged.
        var liftRand = mulberry32(0x6c696674);
        batch2.forEach(function (s, i) {
          s.liftX = (liftRand() * 2 - 1) * 7.8;
          s.liftY = -5.2 + liftRand() * 5.8;
          s.liftZ = -7 + liftRand() * 4.9;
          s.liftDelay = liftRand() * 0.28;
          s.depthResponse = Math.max(0.25, Math.min(1, (s.liftZ + 7) / 14 + 0.55));
          // Keep final foliage outside the headline, including its full leaf extent.
          if (s.stayer) {
            var a = i * 2.399963;
            s.restX = Math.sin(a) * 8.5;
            s.restY = (i % 2 ? 1 : -1) * 5.5;
            s.restRZ = i % 2 ? 0 : Math.PI;
          }
        });
        const batches = [batch1, batch2];

        var DUST_COUNT = 800;
        var dustHome = new Array(DUST_COUNT * 3);
        var dustSeeds = new Array(DUST_COUNT);
        for (var d = 0; d < DUST_COUNT; d++) {
          dustHome[d * 3] = (rand() * 2 - 1) * 10;
          dustHome[d * 3 + 1] = (rand() * 2 - 1) * 6;
          dustHome[d * 3 + 2] = rand() * 12 - 5;
          dustSeeds[d] = rand();
        }
        

        // Separate per-leaf seeds leave the approved sweep/lift layout untouched.
        // Different periods and phases avoid a shared rocking or looping beat.
        [batch1, batch2].forEach(function (batch, batchIndex) {
          batch.forEach(function (s, i) {
            if (!s.stayer) return;
            var breezeRand = mulberry32(0x62726565 ^ ((batchIndex + 1) * 104729 + i * 7919));
            s.breeze = {
              phase: breezeRand() * Math.PI * 2,
              phase2: breezeRand() * Math.PI * 2,
              phase3: breezeRand() * Math.PI * 2,
              rate: 0.55 + breezeRand() * 0.45,
              driftX: 0.22 + breezeRand() * 0.24,
              driftY: 0.28 + breezeRand() * 0.28,
              driftZ: 0.35 + breezeRand() * 0.45,
              depth: (breezeRand() - 0.5) * 1.3,
              tiltX: 0.07 + breezeRand() * 0.1,
              tiltY: 0.1 + breezeRand() * 0.14,
              roll: 0.12 + breezeRand() * 0.14,
              turn: (breezeRand() < 0.5 ? -1 : 1) * (0.012 + breezeRand() * 0.022),
              arrival: breezeRand() * 0.16,
            };
          });
        });

const DIMS = {
        monstera: [2.05, 2.7],
        alocasia: [1.92, 2.85],
        lance: [0.68, 3.45],
        calathea: [1.36, 3.05],
        fern: [0.46, 1.5],
      };

    dustHome=Float32Array.from(dustHome);dustSeeds=Float32Array.from(dustSeeds);
    const leaves=batches.flat().map(spec=>{
      const dims=DIMS[spec.kind];
      if(aspect>16/9){
        const reach=Math.hypot(dims[0]*spec.widthMul*.5,dims[1]*spec.lengthMul)*spec.scale;
        const edge=Math.tan(fov*Math.PI/360)*(CAM_DIST-spec.z)*aspect+reach+2;
        spec.xStart=Math.min(spec.xStart,-edge);spec.xEnd=Math.max(spec.xEnd,edge);
      }

          if (spec.batch === 2) {
            // Start the entire leaf below the camera frustum, including its
            // tip, wind deformation and the small camera orbit. Its identity
            // persists: the lift carries it into view rather than spawning it.
            const reach =
              Math.hypot(dims[0] * spec.widthMul * 0.5, dims[1] * spec.lengthMul) * spec.scale;
            spec.liftStartY =
              -Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * (CAM_DIST - spec.liftZ) -
              reach -
              2;
          }

      const group=new THREE.Object3D();group.visible=false;
      group.position.set(spec.xStart,spec.y0,spec.z);
      group.scale.setScalar(spec.scale);group.rotation.set(spec.tiltX,spec.tiltY,spec.rotation);
      return {group,spec};
    });
    const state={sw1:0,sw2:0};
    const plane=()=>({uniforms:{uIn:{value:0},uOut:{value:0},uLift:{value:0}}});
    const plane1=plane(),plane2=plane();
    const bokehPass={uniforms:{aperture:{value:0},maxblur:{value:0}}};
    const shaderMaterials=[{userData:{timeUniform:{value:0}}}];
    const dustPositions=new Float32Array(dustHome),dust=new THREE.Object3D();
    const dustGeo={attributes:{position:{needsUpdate:false}}};
function motionClock(t) {
        const end = windows.s2 + windows.d2;
        const duration = Math.max(0.1, 10.5 - end);
        const p = clamp((t - end) / duration, 0, 1);
        return t <= end ? t : end + duration * (p - (p * p) / 2);
      }

      function openingWind(spec, t) {
        const wt = motionClock(t) * WIND_SPEED;
        const gust = Math.sin(wt * 0.23 + spec.restX * 0.42 + Math.sin(spec.y0 * 0.37 + wt * 0.11));
        const sway =
          (Math.sin(wt * 0.46 + spec.phase) * 0.011 +
            Math.sin(wt * 0.58 + spec.y0 * 0.74) * 0.007 +
            Math.max(0, gust) ** 3.6 * 0.03) *
          WIND_STRENGTH;
        return [sway, Math.sin(wt * 0.31 + spec.phase) * 0.02];
      }

      // Sample the authored incoming path, including its actual rotation/wind.
      // Only retained leaves use this path; the passing leaf wall stays intact.
      function retainedSweepPose(s, t) {
        const w = windows;
        if (s.batch === 2) {
          const p = clamp(clamp((t - w.s2) / w.d2, 0, 1) * 1.28 - s.liftDelay, 0, 1);
          const lift = smoothstep(0, 0.58, p),
            seat = smoothstep(0.38, 1, p);
          return [
            THREE.MathUtils.lerp(s.liftX, s.restX, seat),
            THREE.MathUtils.lerp(s.liftY, s.restY, seat) -
              (s.liftY - s.liftStartY) * (1 - smoothstep(0, 0.42, p)),
            THREE.MathUtils.lerp(s.liftZ, s.z, lift),
            s.tiltX + seat * 3.6 * Math.sin(s.phase),
            s.tiltY + seat * 3.6 * Math.cos(s.phase * 1.7),
            THREE.MathUtils.lerp(s.rotation, s.restRZ, seat),
          ];
        }
        const p = clamp(clamp((t - 0.4) / w.d1, 0, 1) * 1.5 - s.delay, 0, 1);
        const pe = 1 - Math.pow(1 - p, 3);
        const rz = s.rotation + pe * s.spin * 0.55;
        const turn =
          ((((s.restRZ - rz + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
        const [wind, roll] = openingWind(s, t);
        return [
          s.xStart + (s.restX - s.xStart) * pe,
          s.y0 +
            (s.restY - s.y0) * pe +
            Math.sin(pe * Math.PI * 1.4 + s.phase) * s.bobAmp * (1 - pe) * 0.8 +
            wind * 0.14,
          s.z,
          s.tiltX + wind,
          s.tiltY + wind * 0.65,
          rz + turn * smoothstep(0.55, 1, pe) + roll,
        ];
      }

      function retainedIdlePose(spec, t, handoff) {
        const b = spec.breeze,
          age = t - handoff.start,
          a = age * b.rate;
        const pose = handoff.center.slice();
        if (spec.batch === 1) {
          const [wind, roll] = openingWind(spec, t);
          pose[1] += wind * 0.14;
          pose[3] += wind;
          pose[4] += wind * 0.65;
          pose[5] += roll;
        }
        const floatX = Math.sin(a + b.phase) * 0.72 + Math.sin(a * 0.613 + b.phase2) * 0.28;
        const floatY = Math.sin(a * 0.79 + b.phase2) * 0.76 + Math.sin(a * 1.137 + b.phase3) * 0.24;
        const floatZ = Math.sin(a * 0.53 + b.phase3);
        const offsets = [
          b.driftX * floatX,
          b.driftY * floatY,
          b.depth + b.driftZ * floatZ,
          b.tiltX * Math.sin(a * 0.67 + b.phase2),
          b.tiltY * Math.sin(a * 0.47 + b.phase3),
          b.roll * floatX + b.turn * age,
        ];
        return pose.map((v, i) => v + RETAINED_BREEZE * offsets[i]);
      }

      // Join while each leaf still has momentum, before its old stop point.
      // Quintic Hermite correction matches position, velocity AND acceleration
      // at both ends. The moving breeze target is present throughout settling;
      // there is no idle timer, zero-velocity rest, or later amplitude fade-in.
      for (const { spec: s } of leaves) {
        if (!s.stayer) continue;
        const w = windows,
          first = s.batch === 1;
        const rate = first ? 1.5 / w.d1 : 1.28 / w.d2;
        const progress = (first ? 0.64 : 0.78) + s.breeze.arrival * 0.12;
        const start = (first ? 0.4 : w.s2) + (progress + (first ? s.delay : s.liftDelay)) / rate;
        const end = first ? 0.4 + w.d1 : w.s2 + w.d2;
        const center = retainedSweepPose(s, end);
        const incoming = retainedSweepPose(s, start);
        if (first) {
          const [wind, roll] = openingWind(s, end);
          center[1] -= wind * 0.14;
          center[3] -= wind;
          center[4] -= wind * 0.65;
          center[5] -= roll;
        }
        for (let i = 3; i < 6; i++)
          center[i] += Math.round((incoming[i] - center[i]) / (2 * Math.PI)) * 2 * Math.PI;
        const h = (s.handoff = { start, duration: (first ? 0.52 : 0.48) / rate, center });
        const dt = 0.001;
        const delta = (time) =>
          retainedSweepPose(s, time).map((v, i) => v - retainedIdlePose(s, time, h)[i]);
        const a = delta(start - dt),
          b = delta(start),
          c = delta(start + dt);
        h.correction = b.map((v, i) => [
          v,
          (c[i] - a[i]) / (2 * dt),
          (c[i] - 2 * v + a[i]) / (dt * dt),
        ]);
      }

      function applyRetainedMotion(group, spec, t) {
        const h = spec.handoff;
        if (!h || !group.visible) return;
        if (t < h.start) {
          // Use the same unrounded clock on both sides of the handoff; GSAP's
          // rounded scalar writes must not introduce a tiny boundary jump.
          const incoming = retainedSweepPose(spec, t);
          group.position.set(incoming[0], incoming[1], incoming[2]);
          group.rotation.set(incoming[3], incoming[4], incoming[5]);
          return;
        }
        const pose = retainedIdlePose(spec, t, h);
        const u = clamp((t - h.start) / h.duration, 0, 1);
        const u2 = u * u,
          u3 = u2 * u,
          u4 = u3 * u,
          u5 = u4 * u;
        const p = 1 - 10 * u3 + 15 * u4 - 6 * u5;
        const v = u - 6 * u3 + 8 * u4 - 3 * u5;
        const a = (u2 - 3 * u3 + 3 * u4 - u5) / 2;
        for (let i = 0; i < 6; i++) {
          const c = h.correction[i];
          pose[i] += c[0] * p + c[1] * h.duration * v + c[2] * h.duration * h.duration * a;
        }
        if (spec.batch === 1) {
          // Carry the current floating pose into takeoff, never pull it back
          // to a rest slot. Quintic lift starts with zero added speed/acceleration.
          const m = clamp((t - windows.s2) / windows.d2, 0, 1);
          const q = clamp(m * 1.5 - spec.delay2 * 0.4, 0, 1);
          const lift = q * q * q * (10 + q * (-15 + 6 * q));
          pose[1] += lift * 6;
          pose[2] += lift * 34;
          pose[5] += lift * spec.spin * 0.55;
        }
        group.position.set(pose[0], pose[1], pose[2]);
        group.rotation.set(pose[3], pose[4], pose[5]);
      }

function renderAt(t) {
        t = clamp(t, 0, DUR);
        const settleTime = windows.s2 + windows.d2;
        const settleDuration = Math.max(0.1, 10.5 - settleTime);
        const settleProgress = clamp((t - settleTime) / settleDuration, 0, 1);
        const motionTime =
          t <= settleTime
            ? t
            : settleTime +
              settleDuration * (settleProgress - (settleProgress * settleProgress) / 2);
        const wt = motionTime * WIND_SPEED;
        const m1 = state.sw1;
        const m2 = state.sw2;

        for (const { group, spec } of leaves) {
          // Depth lift: emerge from the backdrop, cross the type plane,
          // rise through the focal range, then pass the camera (source exitDistance=34).
          // No lateral sweep, frame history, pointer force, or accumulated physics.
          if (spec.batch === 2) {
            const p = clamp(m2 * 1.28 - spec.liftDelay, 0, 1);
            // At p=0 it is already below frame; at p=1 passers are behind
            // the camera. No visibility/opacity switch at either boundary.
            group.visible = true;
            const entry = smoothstep(0, 0.42, p);
            const lift = smoothstep(0, 0.58, p);
            const exit = smoothstep(0.38, 1, p);
            const seat = smoothstep(0.38, 1, p);
            const z = spec.stayer
              ? THREE.MathUtils.lerp(spec.liftZ, spec.z, lift)
              : spec.liftZ + lift * 8 * spec.depthResponse + exit * 34;
            const orbit = exit * 1.15;
            const x = spec.stayer
              ? THREE.MathUtils.lerp(spec.liftX, spec.restX, seat)
              : spec.liftX + Math.cos(spec.phase + p * 1.3) * orbit;
            const liftedY = spec.stayer
              ? THREE.MathUtils.lerp(spec.liftY, spec.restY, seat)
              : spec.liftY + lift * 2.2 + exit * 3.8;
            const y = liftedY - (spec.liftY - spec.liftStartY) * (1 - entry);
            group.position.set(x, y, z);
            group.rotation.set(
              spec.tiltX + exit * 3.6 * Math.sin(spec.phase),
              spec.tiltY + exit * 3.6 * Math.cos(spec.phase * 1.7),
              spec.stayer
                ? THREE.MathUtils.lerp(spec.rotation, spec.restRZ, seat)
                : spec.rotation + exit * 3.6 * 0.55,
            );
            continue;
          }
          const m = spec.batch === 1 ? m1 : m2;
          const p = clamp(m * (1 + DJ) - spec.delay, 0, 1);
          if (p <= 0.0005) {
            group.visible = false;
            continue;
          }
          group.visible = true;

          // Analytic wind sway, always applied (scaled up once settled).
          const gustCell = Math.sin(
            wt * 0.23 + spec.restX * 0.42 + Math.sin(spec.y0 * 0.37 + wt * 0.11),
          );
          const localGust = Math.max(0, gustCell) ** 3.6;
          const slowWind =
            (Math.sin(wt * 0.46 + spec.phase) * 0.011 +
              Math.sin(wt * 0.58 + spec.y0 * 0.74) * 0.007 +
              localGust * 0.03) *
            WIND_STRENGTH;

          let x,
            y,
            rz,
            z = spec.z;
          if (!spec.stayer) {
            const pe = p * p * (3 - 2 * p);
            x = spec.xStart + (spec.xEnd - spec.xStart) * pe;
            y = spec.y0 + Math.sin(pe * Math.PI * spec.bobN + spec.phase) * spec.bobAmp;
            rz = spec.rotation + pe * spec.spin;
          } else {
            const pe = 1 - Math.pow(1 - p, 3);
            x = spec.xStart + (spec.restX - spec.xStart) * pe;
            y =
              spec.y0 +
              (spec.restY - spec.y0) * pe +
              Math.sin(pe * Math.PI * 1.4 + spec.phase) * spec.bobAmp * (1 - pe) * 0.8;
            const travelRz = spec.rotation + pe * spec.spin * 0.55;
            const seat = smoothstep(0.55, 1, pe);
            const dRz =
              ((((spec.restRZ - travelRz + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
                (2 * Math.PI)) -
              Math.PI;
            rz = travelRz + dRz * seat;
            if (spec.batch === 1 && m2 > 0) {
              // Existing edge leaves join the same upward depth current.
              const q = clamp(m2 * 1.5 - spec.delay2 * 0.4, 0, 1);
              const qe = smoothstep(0, 1, q);
              z += qe * 34;
              y += qe * 6;
              rz += qe * spec.spin * 0.55;
            }
          }

          group.position.set(x, y + slowWind * 0.14, z);
          group.rotation.set(
            spec.tiltX + slowWind,
            spec.tiltY + slowWind * 0.65,
            rz + Math.sin(wt * 0.31 + spec.phase) * 0.02,
          );
        }

        // The background/camera can settle while retained leaves keep breathing
        // through the final hold. Use absolute t, never accumulated frame deltas.
        for (const { group, spec } of leaves) applyRetainedMotion(group, spec, t);

        /* Reveal wipes, derived from the sweep masters. Tuned so the visible wipe
           edge stays inside the dense part of the leaf band (verified visually). */
        plane1.uniforms.uIn.value = clamp((m1 - 0.3) / 0.52, 0, 1) * 1.1 - 0.05;
        plane1.uniforms.uOut.value = -0.05;
        plane2.uniforms.uIn.value = 1.05;
        plane1.uniforms.uLift.value = smoothstep(0.25, 0.43, m2) * 1.3 - 0.15;
        plane2.uniforms.uLift.value = smoothstep(0.4, 0.62, m2) * 1.3 - 0.15;
        // Source experiment DOF at lift peak; return to V1's crisp hold.
        const lens = smoothstep(0.05, 0.28, m2) * (1 - smoothstep(0.72, 1, m2));
        bokehPass.uniforms.aperture.value = 0.0016 + lens * 0.0005;
        bokehPass.uniforms.maxblur.value = 0.0055 + lens * 0.0035;
        plane2.uniforms.uOut.value = -0.05;

        for (const material of shaderMaterials) {
          material.userData.timeUniform.value = wt;
        }

        for (let i = 0; i < DUST_COUNT; i++) {
          const o = i * 3;
          const s = dustSeeds[i];
          dustPositions[o] = dustHome[o] + Math.sin(wt * 0.19 + s * 18) * 0.36;
          dustPositions[o + 1] = dustHome[o + 1] + Math.cos(wt * 0.14 + s * 27) * 0.38;
          dustPositions[o + 2] = dustHome[o + 2] + Math.sin(wt * 0.11 + s * 41) * 0.4;
        }
        dustGeo.attributes.position.needsUpdate = true;

        const swayX = Math.sin(motionTime * 0.31) * 0.6 + Math.sin(motionTime * 0.127 + 2.1) * 0.5;
        const swayY = Math.sin(motionTime * 0.083 + 1.7) * 0.7;
        cameraOrbit.set(degToRad(-swayY), degToRad(swayX), 0, "YXZ");
        cameraOffset.set(0, 0.15, CAM_DIST).applyEuler(cameraOrbit);
        camera.position.copy(cameraTarget).add(cameraOffset);
        camera.lookAt(cameraTarget);
        dust.rotation.x = degToRad(-swayY) * 0.6;
        dust.rotation.y = degToRad(swayX) * 0.6;


      }


    function sample(seconds) {
      if(!Number.isFinite(seconds))throw new Error('Finite canopy time required');
      const t=clamp(seconds,0,12);
      state.sw1=clamp((t-.4)/windows.d1,0,1);
      state.sw2=clamp((t-windows.s2)/windows.d2,0,1);
      renderAt(t);
      return {seconds:t,sweep:state.sw1,lift:state.sw2,
        camera:{position:camera.position.toArray(),rotation:camera.rotation.toArray().slice(0,3),fov:camera.fov},
        leaves:leaves.map(({group,spec})=>({kind:spec.kind,batch:spec.batch,stayer:spec.stayer,
          visible:group.visible,position:group.visible?group.position.toArray():null,
          rotation:group.visible?group.rotation.toArray().slice(0,3):null,scale:spec.scale})),
        wipes:[plane1,plane2].map(p=>Object.fromEntries(Object.entries(p.uniforms).map(([k,u])=>[k,u.value]))),
        aperture:bokehPass.uniforms.aperture.value,maxblur:bokehPass.uniforms.maxblur.value,
        windTime:shaderMaterials[0].userData.timeUniform.value,
        dust:{positions:Array.from(dustPositions),rotation:dust.rotation.toArray().slice(0,3)}};
    }
    return Object.freeze({sample,windows,batches,dustHome,dustSeeds});
  }
  function geometry(THREE,width,length) {
    if(THREE?.REVISION!=='185'||![width,length].every(v=>Number.isFinite(v)&&v>0&&v<=8))
      throw new Error('Bounded canopy leaf geometry required');
    const geometryCache=new Map();
function leafGeometry(width, length) {
        const key = `${width.toFixed(2)}-${length.toFixed(2)}`;
        if (geometryCache.has(key)) return geometryCache.get(key);
        const geo = new THREE.PlaneGeometry(width, length, 12, 22);
        geo.translate(0, length * 0.5, 0);
        const position = geo.attributes.position;
        const uv = geo.attributes.uv;
        for (let i = 0; i < position.count; i++) {
          const across = position.getX(i) / (width * 0.5);
          const along = uv.getY(i);
          const arch = (1 - Math.pow(Math.abs(across), 1.62)) * Math.sin(Math.PI * along);
          const twist = across * (along - 0.22);
          const edgeRipple =
            Math.sin(along * Math.PI * 5.4 + across * 2.1) * Math.pow(Math.abs(across), 2.2);
          position.setZ(
            i,
            arch * length * 0.052 + twist * length * 0.038 + edgeRipple * length * 0.012,
          );
        }
        position.needsUpdate = true;
        geo.computeVertexNormals();
        geometryCache.set(key, geo);
        return geo;
      }


    return leafGeometry(width,length);
  }
  function textureData(kind,seed,palette) {
    if(!kinds.includes(kind)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)
      throw new Error('Known leaf species and bounded integer seed required');
    if(!Array.isArray(palette)||palette.length!==3||!palette.every(row=>Array.isArray(row)&&row.length===3&&
        row.every(n=>Number.isFinite(n)&&n>=0&&n<=255)))throw new Error('Three approved RGB tones required');
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
    const w=384,h=768,p=palette;
    const colorImage={data:new Uint8ClampedArray(w*h*4)},bumpImage={data:new Uint8ClampedArray(w*h*4)};
function hash2(x, y, seed) {
        let n = Math.imul(x + seed * 1013, 374761393) + Math.imul(y - seed * 79, 668265263);
        n = n ^ (n >>> 13);
        n = Math.imul(n, 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
      }

function leafWidth(kind, y) {
        const s = Math.max(0, Math.sin(Math.PI * y));
        if (kind === "lance" || kind === "fern") return Math.pow(s, 1.28) * (0.66 + y * 0.12);
        if (kind === "alocasia") return Math.pow(s, 0.62) * (0.88 + 0.16 * (1 - y));
        if (kind === "calathea") return Math.pow(s, 0.82) * 0.78;
        return Math.pow(s, 0.55) * (0.82 + 0.15 * y);
      }

for (let py = 0; py < h; py++) {
          const y = py / (h - 1);
          const width = leafWidth(kind, y);
          for (let px = 0; px < w; px++) {
            const x = (px / (w - 1) - 0.5) * 2;
            const nx = Math.abs(x) / Math.max(0.001, width);
            let signed = 1 - nx;
            let inside = signed > -0.015 && y > 0.008 && y < 0.996;

            if (inside && kind === "monstera") {
              const ax = Math.abs(x);
              const side = x < 0 ? -1 : 1;
              for (let k = 0; k < 6; k++) {
                const jitter = (hash2(k, seed, 44) - 0.5) * 0.034;
                const root = 0.205 + k * 0.083 + jitter;
                const inner = 0.23 + k * 0.022 + (hash2(k, seed, 51) - 0.5) * 0.026;
                const curve =
                  root + (ax - inner) * (0.14 + k * 0.012) + Math.sin((ax + k) * 13.0) * 0.008;
                const slotWidth =
                  (0.009 + k * 0.0018) * smoothstep(inner, Math.max(inner + 0.11, width), ax);
                if (ax > inner && Math.abs(y - curve) < slotWidth && ax < width * 1.025)
                  inside = false;
                if (k < 4) {
                  const cx = side * (0.225 + k * 0.052 + (hash2(k, seed, 61) - 0.5) * 0.025);
                  const cy = 0.31 + k * 0.105 + (hash2(k, seed, 71) - 0.5) * 0.025;
                  const rx = 0.026 + k * 0.003;
                  const ry = 0.038 + k * 0.005;
                  const skewY = y - cy - (x - cx) * side * 0.26;
                  const hole = (x - cx) ** 2 / (rx * rx) + skewY ** 2 / (ry * ry) < 1;
                  if (hole) inside = false;
                }
              }
            }
            if (inside && kind === "alocasia" && y < 0.105) {
              const notch = Math.abs(x) < 0.15 * (1 - y / 0.105);
              if (notch) inside = false;
            }

            const i = (py * w + px) * 4;
            if (!inside) {
              colorImage.data[i + 3] = 0;
              bumpImage.data[i] = bumpImage.data[i + 1] = bumpImage.data[i + 2] = 112;
              bumpImage.data[i + 3] = 255;
              continue;
            }

            const n0 = hash2(px >> 2, py >> 2, seed);
            const n1 = hash2(px >> 4, py >> 4, seed + 17);
            const middle = Math.exp(-Math.abs(x) * (kind === "lance" ? 28 : 35));
            const veinFreq = kind === "lance" ? 12 : 8.5;
            const ribWave = Math.abs(((y * veinFreq + Math.abs(x) * 1.85) % 1) - 0.5);
            const sideVein = Math.exp(-ribWave * 46) * smoothstep(0.04, 0.82, Math.abs(x));
            const edge = smoothstep(0, 0.16, signed);
            const stripe =
              kind === "calathea" ? 0.5 + 0.5 * Math.cos(y * 58 + Math.abs(x) * 10) : 0;
            const mottling = (n0 - 0.5) * 0.16 + (n1 - 0.5) * 0.12 + stripe * 0.08;
            const light = clamp(
              0.42 + y * 0.12 + mottling + middle * 0.34 + sideVein * 0.16 - (1 - edge) * 0.27,
              0,
              1,
            );
            const dry = hash2(px >> 3, py >> 3, seed + 90) > 0.978 ? 0.16 : 0;

            const c0 = p[0],
              c1 = p[1],
              c2 = p[2];
            const t = smoothstep(0.08, 0.9, light);
            const hi = smoothstep(0.56, 1, t);
            for (let ch = 0; ch < 3; ch++) {
              const low = c0[ch] + (c1[ch] - c0[ch]) * t;
              const val =
                low + (c2[ch] - low) * hi * 0.58 + dry * (ch === 0 ? 56 : ch === 1 ? 35 : 10);
              colorImage.data[i + ch] = clamp(val, 0, 255);
            }
            colorImage.data[i + 3] = clamp(edge * 390, 0, 255);

            const bump = clamp(
              112 + (n0 - 0.5) * 22 + middle * 100 + sideVein * 52 - (1 - edge) * 18,
              0,
              255,
            );
            bumpImage.data[i] = bumpImage.data[i + 1] = bumpImage.data[i + 2] = bump;
            bumpImage.data[i + 3] = 255;
          }
        }


    return {width:w,height:h,color:colorImage.data,bump:bumpImage.data};
  }
  window.ShortCreatorCanopyMotion=Object.freeze({source,kinds,create,geometry,textureData});
})();
