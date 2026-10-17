/* HyperFrames cuboid composition, Apache-2.0. mergeVertices: Three.js MIT. */
(() => {
  'use strict';
  const metadata={"cameraFov": 11, "cameraX": -1.65, "cameraY": 8.5, "cameraZ": -8.508708, "cameraTargetFov": 34, "cameraTargetX": -7.25, "cameraTargetY": 1.15, "cameraTargetZ": 6.2, "cameraSettleFrame": 70, "heroFillIntensity": 0.55, "heroExitX": 288, "heroExitY": -234, "heroExitZ": 198, "heroScale": 1};
  function mergeVertices(geometry, tolerance = 1e-4) {
  tolerance = Math.max(tolerance, Number.EPSILON);

  // Generate an index buffer if the geometry doesn't have one, or optimize it
  // if it's already available.
  const hashToIndex = {};
  const indices = geometry.getIndex();
  const positions = geometry.getAttribute("position");
  const vertexCount = indices ? indices.count : positions.count;

  // next value for triangle indices
  let nextIndex = 0;

  // attributes and new attribute arrays
  const attributeNames = Object.keys(geometry.attributes);
  const tmpAttributes = {};
  const tmpMorphAttributes = {};
  const newIndices = [];
  const getters = ["getX", "getY", "getZ", "getW"];
  const setters = ["setX", "setY", "setZ", "setW"];

  // Initialize the arrays, allocating space conservatively. Extra
  // space will be trimmed in the last step.
  for (let i = 0, l = attributeNames.length; i < l; i++) {
    const name = attributeNames[i];
    const attr = geometry.attributes[name];

    tmpAttributes[name] = new attr.constructor(
      new attr.array.constructor(attr.count * attr.itemSize),
      attr.itemSize,
      attr.normalized,
    );

    const morphAttributes = geometry.morphAttributes[name];
    if (morphAttributes) {
      if (!tmpMorphAttributes[name]) tmpMorphAttributes[name] = [];
      morphAttributes.forEach((morphAttr, i) => {
        const array = new morphAttr.array.constructor(morphAttr.count * morphAttr.itemSize);
        tmpMorphAttributes[name][i] = new morphAttr.constructor(
          array,
          morphAttr.itemSize,
          morphAttr.normalized,
        );
      });
    }
  }

  // convert the error tolerance to an amount of decimal places to truncate to
  const halfTolerance = tolerance * 0.5;
  const exponent = Math.log10(1 / tolerance);
  const hashMultiplier = Math.pow(10, exponent);
  const hashAdditive = halfTolerance * hashMultiplier;
  for (let i = 0; i < vertexCount; i++) {
    const index = indices ? indices.getX(i) : i;

    // Generate a hash for the vertex attributes at the current index 'i'
    let hash = "";
    for (let j = 0, l = attributeNames.length; j < l; j++) {
      const name = attributeNames[j];
      const attribute = geometry.getAttribute(name);
      const itemSize = attribute.itemSize;

      for (let k = 0; k < itemSize; k++) {
        // double tilde truncates the decimal value
        hash += `${~~(attribute[getters[k]](index) * hashMultiplier + hashAdditive)},`;
      }
    }

    // Add another reference to the vertex if it's already
    // used by another index
    if (hash in hashToIndex) {
      newIndices.push(hashToIndex[hash]);
    } else {
      // copy data to the new index in the temporary attributes
      for (let j = 0, l = attributeNames.length; j < l; j++) {
        const name = attributeNames[j];
        const attribute = geometry.getAttribute(name);
        const morphAttributes = geometry.morphAttributes[name];
        const itemSize = attribute.itemSize;
        const newArray = tmpAttributes[name];
        const newMorphArrays = tmpMorphAttributes[name];

        for (let k = 0; k < itemSize; k++) {
          const getterFunc = getters[k];
          const setterFunc = setters[k];
          newArray[setterFunc](nextIndex, attribute[getterFunc](index));

          if (morphAttributes) {
            for (let m = 0, ml = morphAttributes.length; m < ml; m++) {
              newMorphArrays[m][setterFunc](nextIndex, morphAttributes[m][getterFunc](index));
            }
          }
        }
      }

      hashToIndex[hash] = nextIndex;
      newIndices.push(nextIndex);
      nextIndex++;
    }
  }

  // generate result BufferGeometry
  const result = geometry.clone();
  for (const name in geometry.attributes) {
    const tmpAttribute = tmpAttributes[name];

    result.setAttribute(
      name,
      new tmpAttribute.constructor(
        tmpAttribute.array.slice(0, nextIndex * tmpAttribute.itemSize),
        tmpAttribute.itemSize,
        tmpAttribute.normalized,
      ),
    );

    if (!(name in tmpMorphAttributes)) continue;

    for (let j = 0; j < tmpMorphAttributes[name].length; j++) {
      const tmpMorphAttribute = tmpMorphAttributes[name][j];

      result.morphAttributes[name][j] = new tmpMorphAttribute.constructor(
        tmpMorphAttribute.array.slice(0, nextIndex * tmpMorphAttribute.itemSize),
        tmpMorphAttribute.itemSize,
        tmpMorphAttribute.normalized,
      );
    }
  }

  // indices

  result.setIndex(newIndices);

  return result;
}


  function geometry(THREE) {
    if(THREE?.REVISION!=='185')throw new Error('Pinned cuboid runtime required');
    const WIDTH=1.7,HEIGHT=2.4,DEPTH=.14,CORNER_R=.105,BEVEL_SIZE=.03,BEVEL_THICK=.04,SMOOTH=32;
    function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  s.closePath();
  return s;
}

function buildCardGeometry() {
  const outerR = Math.min(CORNER_R, Math.min(WIDTH, HEIGHT) / 2 - 0.001);
  const r = Math.max(outerR, 0.002);
  const bSize = Math.max(
    0,
    Math.min(BEVEL_SIZE, r * 0.98, WIDTH / 2 - 0.005, HEIGHT / 2 - 0.005),
  );
  const maxThick = Math.max(DEPTH * 0.45, 0.0005);
  const bThick = Math.max(0, Math.min(BEVEL_THICK, maxThick));
  const sizeOn = bSize > 0.0005,
    thickOn = bThick > 0.0005;
  const bevelOn = sizeOn || thickOn;
  const innerW = sizeOn ? Math.max(WIDTH - 2 * bSize, 0.01) : WIDTH;
  const innerH = sizeOn ? Math.max(HEIGHT - 2 * bSize, 0.01) : HEIGHT;
  const innerR = sizeOn ? Math.max(r - bSize, 0.002) : r;
  const extrudeDepth = thickOn ? Math.max(DEPTH - 2 * bThick, DEPTH * 0.15, 0.002) : DEPTH;

  const shape = roundedRectShape(innerW, innerH, innerR);

  // Cap UVs span the full face so the text texture lands square on it;
  // side walls collapse to a single point, as in the source.
  const uvGenerator = {
    generateTopUV(_g, vertices, a, b, c) {
      const p = (i) =>
        new THREE.Vector2(
          (vertices[i * 3] + WIDTH / 2) / WIDTH,
          (vertices[i * 3 + 1] + HEIGHT / 2) / HEIGHT,
        );
      return [p(a), p(b), p(c)];
    },
    generateSideWallUV() {
      return [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, 0),
      ];
    },
  };

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: bevelOn,
    bevelThickness: bThick,
    bevelSize: bSize,
    bevelSegments: Math.max(16, Math.round(SMOOTH * 2)),
    curveSegments: Math.max(16, Math.round(SMOOTH)),
    steps: 1,
    UVGenerator: uvGenerator,
  });
  geo.center();
  if (bevelOn) {
    const merged = mergeVertices(geo, 1e-4);
    geo.dispose();
    merged.computeVertexNormals();
    merged.computeBoundingSphere();
    return merged;
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}


    return buildCardGeometry();
  }
  function create(THREE,count=8,hero=4,handheld=1) {
    if(THREE?.REVISION!=='185'||!Number.isInteger(count)||count<1||count>12||
      !Number.isInteger(hero)||hero<1||hero>count||![0,1].includes(handheld))throw new Error('Invalid cuboid motion inputs');
    const MOTION=window.ShortCreatorCuboidData;
    if(!MOTION||MOTION.fps!==30||MOTION.endFrame!==200)throw new Error('Pinned cuboid motion unavailable');
    const V={...metadata,handheldStrength:handheld};
    const num=(v,d,lo,hi)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):d;
    const clamp01=x=>Math.max(0,Math.min(1,x)),smooth01=x=>x*x*(3-2*x);
    const COUNT=count,HERO=hero-1,ITEMS=Array.from({length:count}),SPACING=1.73,HERO_SCALE=1,DUR=200/30;
    const CAMERA_SETTLE=70,FOV=V.cameraFov,CAM_X=V.cameraX,CAM_Y=V.cameraY,CAM_Z=V.cameraZ;
    const TARGET_FOV=V.cameraTargetFov,TARGET_X=V.cameraTargetX,TARGET_Y=V.cameraTargetY,TARGET_Z=V.cameraTargetZ;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(FOV,16/9,.1,200);
    const capMats=ITEMS.map((_,item)=>({item})),heroMat={item:HERO,emissiveIntensity:0};
    const cuboids=MOTION.tiles.map(()=>{const mesh=new THREE.Object3D();mesh.material=[];return mesh;});
    const basis = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  -Math.PI / 2,
);
const inverseBasis = basis.clone().invert();
const sourceRoot = new THREE.Matrix4().set(...MOTION.rootMatrix);
const convertedRoot = new THREE.Matrix4()
  .makeRotationFromQuaternion(basis)
  .multiply(sourceRoot)
  .multiply(new THREE.Matrix4().makeRotationFromQuaternion(inverseBasis));
const motionRoot = new THREE.Group();
motionRoot.name = "Blender approved Cuboid chain";
motionRoot.matrixAutoUpdate = false;
motionRoot.matrix.copy(convertedRoot);
scene.add(motionRoot);
for (const mesh of cuboids) motionRoot.add(mesh);
const heroSlot = MOTION.tiles.findIndex((tile) => tile.hero);
const sourceStart = new THREE.Vector3(...MOTION.cameraStart).applyQuaternion(basis);
const sourceEnd = new THREE.Vector3(...MOTION.cameraEnd).applyQuaternion(basis);
const startOffset = new THREE.Vector3(CAM_X, CAM_Y, CAM_Z).sub(sourceStart);
const endOffset = new THREE.Vector3(TARGET_X, TARGET_Y, TARGET_Z).sub(sourceEnd);
const hasCameraOffset = startOffset.lengthSq() + endOffset.lengthSq() > 1e-14;
const targetCamera = new THREE.Vector3(TARGET_X, TARGET_Y, TARGET_Z);
const samplePosition = new THREE.Vector3(),
  basePosition = new THREE.Vector3();
const sampleQuaternion = new THREE.Quaternion(),
  baseQuaternion = new THREE.Quaternion();
const qA = new THREE.Quaternion(),
  qB = new THREE.Quaternion(),
  qDelta = new THREE.Quaternion();
const poseEuler = new THREE.Euler(0, 0, 0, "ZYX");
const lookCamera = new THREE.PerspectiveCamera();
const zero = new THREE.Vector3();
const S = { t: 0 };
const HERO_FILL = num(V.heroFillIntensity, 0.55, 0, 2);
const HANDHELD = num(V.handheldStrength, 1, 0, 1);
const EXIT_ANGLES = [
  num(V.heroExitX, 288, -720, 720),
  num(V.heroExitY, -234, -720, 720),
  num(V.heroExitZ, 198, -720, 720),
];
const sourceExitAngles = [288, -234, 198];

function channelAt(keys, frame) {
  if (!keys || !keys.length) return 0;
  if (frame <= keys[0][0]) return keys[0][1];
  let lo = 0,
    hi = keys.length - 1;
  if (frame >= keys[hi][0]) return keys[hi][1];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid][0] <= frame) lo = mid;
    else hi = mid;
  }
  const a = keys[lo],
    b = keys[hi],
    u = (frame - a[0]) / (b[0] - a[0]);
  return a[1] + (b[1] - a[1]) * u;
}
function readCamera(frame, position, quaternion) {
  const f = Math.max(0, Math.min(MOTION.endFrame, frame));
  const i = Math.floor(f),
    j = Math.min(MOTION.endFrame, i + 1),
    u = f - i;
  const a = MOTION.camera[i],
    b = MOTION.camera[j];
  position
    .set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
    .applyQuaternion(basis);
  qA.set(a[3], a[4], a[5], a[6]);
  qB.set(b[3], b[4], b[5], b[6]);
  // Camera optical axes are already -Z forward / +Y up: convert world basis only.
  quaternion.slerpQuaternions(qA, qB, u).premultiply(basis).normalize();
  return a[7] + (b[7] - a[7]) * u;
}
function cameraAt(frame) {
  const cameraFrame =
    frame < CAMERA_SETTLE ? (frame * 70) / CAMERA_SETTLE : Math.max(70, frame);
  const sourceFov = readCamera(cameraFrame, samplePosition, sampleQuaternion);
  const inHandheld = frame > 90 && frame < 150;
  if (inHandheld) {
    readCamera(90, basePosition, baseQuaternion);
    if (HANDHELD !== 1) {
      samplePosition.lerpVectors(basePosition, samplePosition, HANDHELD);
      sampleQuaternion.slerpQuaternions(baseQuaternion, sampleQuaternion, HANDHELD);
    }
  } else {
    basePosition.copy(samplePosition);
    baseQuaternion.copy(sampleQuaternion);
  }
  const u = clamp01(
    (MOTION.cameraControls["Start FOV degrees"] - sourceFov) /
      (MOTION.cameraControls["Start FOV degrees"] - MOTION.cameraControls["End FOV degrees"]),
  );
  // A changed start must not recompute the approved settled/handheld pose.
  if (hasCameraOffset && (u < 1 || endOffset.lengthSq() > 1e-14)) {
    qDelta.copy(baseQuaternion).invert().multiply(sampleQuaternion);
    const offset = startOffset.clone().lerp(endOffset, u);
    lookCamera.position.copy(basePosition).add(offset);
    lookCamera.lookAt(zero);
    sampleQuaternion.copy(lookCamera.quaternion).multiply(qDelta);
    samplePosition.add(offset);
  }
  camera.position.copy(samplePosition);
  camera.quaternion.copy(sampleQuaternion);
  camera.fov = FOV === 65 && TARGET_FOV === 34 ? sourceFov : FOV + (TARGET_FOV - FOV) * u;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
const heroInitialX = MOTION.tiles[heroSlot].channels.location[0][0][1];
const slotOffsets = MOTION.tiles.map(
  (tile) => (tile.channels.location[0][0][1] - heroInitialX) / 1.73,
);
// One mesh owns the hero slot before and after separation. Its arrival
// must use the same transport as the constant-rate chain, not the old
// slower Blender arrival curve. Keep that transport while it first lifts
// clear, then rejoin the approved absolute path without a position jump.
const heroXKeys = MOTION.tiles[heroSlot].channels.location[0];
const chainXKeys = MOTION.tiles.find((tile) => !tile.hero).channels.location[0];
const HERO_SLOT_RELEASE = 36,
  HERO_PATH_REJOIN = 70;
const heroSlotXAt = (frame) => heroInitialX + channelAt(chainXKeys, frame) - chainXKeys[0][1];
const heroSlotDelta =
  heroSlotXAt(HERO_SLOT_RELEASE) - channelAt(heroXKeys, HERO_SLOT_RELEASE);
const heroSlotVelocityDelta =
  (heroSlotXAt(HERO_SLOT_RELEASE) -
    heroSlotXAt(HERO_SLOT_RELEASE - 0.25) -
    channelAt(heroXKeys, HERO_SLOT_RELEASE) +
    channelAt(heroXKeys, HERO_SLOT_RELEASE - 0.25)) /
  0.25;
function heroSlotCorrection(frame) {
  if (frame <= HERO_SLOT_RELEASE) return heroSlotXAt(frame) - channelAt(heroXKeys, frame);
  if (frame >= HERO_PATH_REJOIN) return 0;
  const duration = HERO_PATH_REJOIN - HERO_SLOT_RELEASE;
  const u = (frame - HERO_SLOT_RELEASE) / duration,
    u2 = u * u,
    u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * heroSlotDelta +
    (u3 - 2 * u2 + u) * duration * heroSlotVelocityDelta
  );
}
const heroExitBase = MOTION.tiles[heroSlot].channels.rotation_euler.map((keys) =>
  channelAt(keys, 150),
);
const actualPose = { frame: 0, camera: [], hero: [], heroRotation: [], visibleTiles: 0 };
function renderAt(time) {
  S.t = Math.max(0, Math.min(DUR, time));
  const frame = S.t * MOTION.fps;
  cameraAt(frame);
  const heroProgress = smooth01(clamp01((frame - 31) / 59));
  heroMat.emissiveIntensity = HERO_FILL * heroProgress;
  let visibleTiles = 0;
  for (let j = 0; j < cuboids.length; j++) {
    const mesh = cuboids[j],
      tile = MOTION.tiles[j],
      c = tile.channels;
    const p = c.location.map((keys) => channelAt(keys, frame));
    if (tile.hero) p[0] += heroSlotCorrection(frame);
    const r = c.rotation_euler.map((keys) => channelAt(keys, frame));
    if (tile.hero && frame > 150) {
      for (let axis = 0; axis < 3; axis++)
        r[axis] =
          heroExitBase[axis] +
          ((r[axis] - heroExitBase[axis]) * EXIT_ANGLES[axis]) / sourceExitAngles[axis];
    }
    mesh.position.set(p[0], p[2], -p[1]);
    if (!tile.hero) mesh.position.x += slotOffsets[j] * (SPACING - 1.73);
    // Blender XYZ is extrinsic X→Y→Z; Three's matching Euler order is ZYX.
    poseEuler.set(r[0], r[1], r[2], "ZYX");
    mesh.quaternion.setFromEuler(poseEuler).premultiply(basis).multiply(inverseBasis);
    const scale = c.scale.map((keys) => channelAt(keys, frame));
    mesh.scale.set(scale[0], scale[2], scale[1]);
    if (tile.hero) mesh.scale.multiplyScalar(1 + (HERO_SCALE - 1) * heroProgress);
    const item = ((((tile.itemIndex + HERO - 3) % COUNT) + COUNT) % COUNT) % ITEMS.length;
    mesh.material[0] = tile.hero && frame >= 31 ? heroMat : capMats[item];
    mesh.visible = frame < tile.hideFrame;
    if (mesh.visible) visibleTiles++;
    if (tile.hero) {
      actualPose.hero = mesh.position.toArray();
      actualPose.heroRotation = r;
    }
  }
  actualPose.frame = frame;
  actualPose.camera = camera.position.toArray();
  actualPose.visibleTiles = visibleTiles;

}

    function sample(seconds) {
      if(!Number.isFinite(seconds))throw new Error('Finite cuboid time required');
      renderAt(seconds);
      return {seconds:S.t,frame:actualPose.frame,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov},
        root:motionRoot.matrix.toArray(),heroSlot,heroFill:heroMat.emissiveIntensity,
        tiles:cuboids.map(mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),
          visible:mesh.visible,item:mesh.material[0].item,heroMaterial:mesh.material[0]===heroMat}))};
    }
    return Object.freeze({sample,channelAt,heroSlotCorrection});
  }
  function clock(time,onsets) {
    if(!Number.isFinite(time)||!Array.isArray(onsets)||onsets.length!==2||!onsets.every(Number.isFinite))
      throw new Error('Two finite cuboid anchors required');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[0]*30),depart=Math.ceil(onsets[1]*30);
    if(depart-start<150)throw new Error('Cuboid departure requires five seconds before it');
    const elapsed=Math.max(0,frame-start),source=frame<depart?150*Math.min(1,elapsed/(depart-start)):Math.min(200,150+frame-depart);
    return {frame:source,seconds:source/30,entry:Math.min(1,elapsed/24),visible:frame>=start};
  }
  window.ShortCreatorCuboidMotion=Object.freeze({create,geometry,clock,metadata:Object.freeze(metadata)});
})();
