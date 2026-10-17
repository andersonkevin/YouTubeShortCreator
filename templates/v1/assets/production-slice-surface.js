/* Adapted from HyperFrames code-slice-hero surface.js and shadows.js, Apache-2.0.
   Native resolution, approved ground, shared context; original instanced faces and projected shadows. */
(()=>{let sharedCanvas=null,sharedGl=null;
/* Local projected shadows: fixed light, spatial buckets, one extra GPU draw. */
window.ShortCreatorSliceShadows = function (gl, tiles, poses, strength, softness, W, H, perspective) {
  "use strict";
  const stride = 29,
    light = [0.65, 0.8, -1],
    bucketSize = Math.max(64, tiles[0].width);
  const states = tiles.map(() => ({
    c: new Float64Array(3),
    u: new Float64Array(3),
    v: new Float64Array(3),
    n: new Float64Array(3),
    q: new Float64Array(4),
  }));
  const buckets = new Map(),
    usedBuckets = [],
    seen = new Int32Array(tiles.length);
  let stamp = 0,
    count = 0,
    storage = new Float32Array(Math.max(64, tiles.length * 8) * stride),
    capacity = 0;
  const stats = { pairs: 0, shadows: 0 };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const shaders = [];
  function compile(kind, source) {
    const s = gl.createShader(kind);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    shaders.push(s);
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(
    program,
    compile(
      gl.VERTEX_SHADER,
      `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aCorner;
  layout(location=1) in vec3 aCenter;
  layout(location=2) in vec3 aU;
  layout(location=3) in vec3 aV;
  layout(location=4) in vec3 aReceiver;
  layout(location=5) in vec3 aReceiverU;
  layout(location=6) in vec3 aReceiverV;
  layout(location=7) in vec4 aBounds;
  layout(location=8) in vec4 aShape;
  layout(location=9) in vec3 aRay;
  out vec2 vCasterUV;
  out vec2 vReceiverXY;
  out float vRay;
  flat out vec4 vBounds;
  flat out vec4 vShape;
  void main(){
    vec2 uv=aCorner*(1.0+1.5*aShape.z/aShape.xy);
    vec3 p=aCenter+aU*uv.x+aV*uv.y;
    float w=1.0-p.z/${perspective};
    gl_Position=vec4((p.x-${(W/2).toFixed(1)})/${(W/2).toFixed(1)},-(p.y-${(H/2).toFixed(1)})/${(H/2).toFixed(1)},1.00020002*w-${2.0002/perspective},w);
    vCasterUV=uv;vReceiverXY=vec2(dot(p-aReceiver,aReceiverU),dot(p-aReceiver,aReceiverV));
    vRay=aRay.x+aRay.y*uv.x+aRay.z*uv.y;vBounds=aBounds;vShape=aShape;
  }`,
    ),
  );
  gl.attachShader(
    program,
    compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es
  precision highp float;
  in vec2 vCasterUV;
  in vec2 vReceiverXY;
  in float vRay;
  flat in vec4 vBounds;
  flat in vec4 vShape;
  out vec4 color;
  void main(){
    if(vRay<=0.2)discard;
    // Clip to the actual rounded receiver face, never the revealed void.
    vec2 q=abs(vReceiverXY)-(vBounds.xy-vBounds.z);
    float receiverDistance=length(max(q,0.0))+min(max(q.x,q.y),0.0)-vBounds.z;
    if(receiverDistance>=0.0)discard;
    vec2 edge=(abs(vCasterUV)-1.0)*vShape.xy;
    float distance=max(edge.x,edge.y);
    float alpha=(1.0-smoothstep(-vShape.z,vShape.z,distance))*vBounds.w;
    alpha*=smoothstep(0.2,3.0,vRay);
    if(alpha<0.002)discard;
    color=vec4(0.0,0.0,0.0,alpha);
  }`,
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [loc, size, offset] of [
    [1, 3, 0],
    [2, 3, 3],
    [3, 3, 6],
    [4, 3, 9],
    [5, 3, 12],
    [6, 3, 15],
    [7, 4, 18],
    [8, 4, 22],
    [9, 3, 26],
  ]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
    gl.vertexAttribDivisor(loc, 1);
  }
  function prepare() {
    for (const bucket of usedBuckets) bucket.length = 0;
    usedBuckets.length = 0;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i],
        s = states[i],
        k = i * 14;
      const cx = Math.cos(poses[k + 8]),
        sx = Math.sin(poses[k + 8]),
        cy = Math.cos(poses[k + 9]),
        sy = Math.sin(poses[k + 9]),
        cz = Math.cos(poses[k + 10]),
        sz = Math.sin(poses[k + 10]);
      s.u.set([cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz]);
      s.v.set([-cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz]);
      s.n.set([sy, -sx * cy, cx * cy]);
      s.c.set([t.cx + poses[k + 4], t.cy + poses[k + 5], poses[k + 6]]);
      s.w = (t.width * poses[k + 7]) / 2;
      s.h = (t.height * poses[k + 7]) / 2;
      s.f = poses[k + 11];
      // The visible face is also the depth-tested shadow receiver.
      const front =
        s.n[0] * (W / 2 - s.c[0]) + s.n[1] * (H / 2 - s.c[1]) + s.n[2] * (perspective - s.c[2]) >= 0
          ? 1
          : -1;
      const thickness = 1.5 * perspective / 1712.661 * s.f * poses[k + 7] * front;
      for (let a = 0; a < 3; a++) s.c[a] += s.n[a] * thickness;
      const qx = s.c[0] + light[0] * s.c[2],
        qy = s.c[1] + light[1] * s.c[2];
      const ux = (s.u[0] + light[0] * s.u[2]) * s.w,
        uy = (s.u[1] + light[1] * s.u[2]) * s.w;
      const vx = (s.v[0] + light[0] * s.v[2]) * s.h,
        vy = (s.v[1] + light[1] * s.v[2]) * s.h;
      s.q.set([
        qx - Math.abs(ux) - Math.abs(vx),
        qy - Math.abs(uy) - Math.abs(vy),
        qx + Math.abs(ux) + Math.abs(vx),
        qy + Math.abs(uy) + Math.abs(vy),
      ]);
      for (let y = Math.floor(s.q[1] / bucketSize); y <= Math.floor(s.q[3] / bucketSize); y++)
        for (let x = Math.floor(s.q[0] / bucketSize); x <= Math.floor(s.q[2] / bucketSize); x++) {
          const key = x + "," + y;
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = [];
            buckets.set(key, bucket);
          }
          if (!bucket.length) usedBuckets.push(bucket);
          bucket.push(i);
        }
    }
  }
  const delta = new Float64Array(3),
    center = new Float64Array(3),
    u = new Float64Array(3),
    v = new Float64Array(3);
  function pair(c, r) {
    stats.pairs++;
    const denom = dot(r.n, light);
    if (Math.abs(denom) < 0.12) return;
    for (let a = 0; a < 3; a++) delta[a] = r.c[a] - c.c[a];
    const ray = dot(delta, r.n) / denom,
      ru = (-dot(c.u, r.n) * c.w) / denom,
      rv = (-dot(c.v, r.n) * c.h) / denom;
    if (ray + Math.abs(ru) + Math.abs(rv) < 0.5) return;
    for (let a = 0; a < 3; a++) {
      center[a] = c.c[a] + light[a] * ray;
      u[a] = c.u[a] * c.w + light[a] * ru;
      v[a] = c.v[a] * c.h + light[a] * rv;
      delta[a] = center[a] - r.c[a];
    }
    const blur = softness * (1 + Math.max(0, ray) * 0.035);
    const rx = dot(delta, r.u),
      ry = dot(delta, r.v);
    if (
      Math.abs(rx) > r.w + Math.abs(dot(u, r.u)) + Math.abs(dot(v, r.u)) + blur * 2 ||
      Math.abs(ry) > r.h + Math.abs(dot(u, r.v)) + Math.abs(dot(v, r.v)) + blur * 2
    )
      return;
    const crossX = u[1] * v[2] - u[2] * v[1],
      crossY = u[2] * v[0] - u[0] * v[2],
      crossZ = u[0] * v[1] - u[1] * v[0];
    const area = Math.hypot(crossX, crossY, crossZ),
      altU = area / Math.hypot(...v),
      altV = area / Math.hypot(...u);
    if (!Number.isFinite(altU + altV) || altU < 0.2 || altV < 0.2) return;
    if ((count + 1) * stride > storage.length) {
      const larger = new Float32Array(storage.length * 2);
      larger.set(storage);
      storage = larger;
    }
    const offset = count++ * stride;
    storage.set(center, offset);
    storage.set(u, offset + 3);
    storage.set(v, offset + 6);
    storage.set(r.c, offset + 9);
    storage.set(r.u, offset + 12);
    storage.set(r.v, offset + 15);
    storage.set(
      [
        r.w,
        r.h,
        Math.min(r.w, r.h) * 0.12 * r.f,
        strength,
        altU,
        altV,
        Math.max(0.6, blur),
        0,
        ray,
        ru,
        rv,
      ],
      offset + 18,
    );
  }
  return {
    stats,
    draw() {
      stats.pairs = 0;
      stats.shadows = 0;
      count = 0;
      if (strength <= 0) return 0;
      prepare();
      for (let i = 0; i < states.length; i++) {
        const c = states[i];
        if (c.f < 0.002) continue;
        const pad = softness * (1 + (Math.abs(c.c[2]) + c.w + c.h) * 0.035) * 2;
        stamp++;
        for (
          let y = Math.floor((c.q[1] - pad) / bucketSize);
          y <= Math.floor((c.q[3] + pad) / bucketSize);
          y++
        )
          for (
            let x = Math.floor((c.q[0] - pad) / bucketSize);
            x <= Math.floor((c.q[2] + pad) / bucketSize);
            x++
          ) {
            const bucket = buckets.get(x + "," + y);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j === i || seen[j] === stamp) continue;
              seen[j] = stamp;
              pair(c, states[j]);
            }
          }
      }
      stats.shadows = count;
      if (!count) return 0;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (capacity < storage.byteLength) {
        capacity = storage.byteLength;
        gl.bufferData(gl.ARRAY_BUFFER, capacity, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, storage.subarray(0, count * stride));
      gl.depthMask(false);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(-1, -1);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      return 1;
    },
    dispose() {
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(corners);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
};

/* One shared pair of text atlases, one instance buffer, one surface draw and one batched shadow draw per seek. */
window.ShortCreatorSliceSurface = function (front, back, tiles, options) {
  "use strict";
  const W=front.width,H=front.height,perspective=1712.661*options.unit;
  if(!Number.isInteger(W)||!Number.isInteger(H)||W<1||H<1||W>1920||H>1920||
     back.width!==W||back.height!==H||!Number.isFinite(perspective)||perspective<=0||tiles.length>1600)
    throw new Error("Invalid native slice surface");
  if(!sharedCanvas){sharedCanvas=document.createElement("canvas");
    sharedGl=sharedCanvas.getContext("webgl2",{alpha:false,antialias:true,preserveDrawingBuffer:true});}
  const canvas=sharedCanvas,gl=sharedGl;canvas.width=W;canvas.height=H;
  if (!gl) throw new Error("Code Slice Hero requires WebGL 2 for its full tile surface.");
  const vertex = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec2 aUV;
  layout(location=2) in float aFace;
  layout(location=3) in vec4 aCell;
  layout(location=4) in vec4 aMotion;
  layout(location=5) in vec4 aAngles;
  layout(location=6) in vec2 aSurface;
  out vec2 vUV;
  out vec2 vAtlasUV;
  flat out float vFace;
  flat out float vFormation;
  flat out float vShade;
  flat out float vInk;
  void main() {
    vec3 p = vec3(aPosition.xy * aCell.zw, aPosition.z * ${3*options.unit} * aAngles.w) * aMotion.w;
    // CSS transform order is translate * Rx * Ry * Rz * scale.
    vec3 c = cos(aAngles.xyz), s = sin(aAngles.xyz);
    p.xy = vec2(c.z*p.x-s.z*p.y, s.z*p.x+c.z*p.y);
    p.xz = vec2(c.y*p.x+s.y*p.z, -s.y*p.x+c.y*p.z);
    p.yz = vec2(c.x*p.y-s.x*p.z, s.x*p.y+c.x*p.z);
    p += vec3(aCell.xy, 0.0) + aMotion.xyz;
    float w = 1.0 - p.z / ${perspective};
    gl_Position = vec4((p.x-${(W/2).toFixed(1)})/${(W/2).toFixed(1)}, -(p.y-${(H/2).toFixed(1)})/${(H/2).toFixed(1)},
      1.00020002*w - ${2.0002/perspective}, w);
    vUV = aUV;
    vAtlasUV = (aCell.xy + (aUV-0.5)*aCell.zw) / vec2(${W}.0,${H}.0);
    vFace = aFace; vFormation = aAngles.w; vShade = aSurface.x; vInk = aSurface.y;
  }`;
  const fragment = `#version 300 es
  precision highp float;
  uniform vec3 uGround;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  in vec2 vUV;
  in vec2 vAtlasUV;
  flat in float vFace;
  flat in float vFormation;
  flat in float vShade;
  flat in float vInk;
  out vec4 color;
  void main() {
    if (vFace > 1.5) {
      if (vInk < 0.5 || vFormation < 0.003) discard;
      float shade = vFace == 4.0 ? 0.910 : vFace == 5.0 ? 0.651 : 0.741;
      color = vec4(uGround*shade,1.0); return;
    }
    float radius = 0.06*vFormation;
    vec2 q = abs(vUV-0.5) - (0.5-radius);
    float distance = length(max(q,0.0)) + min(max(q.x,q.y),0.0) - radius;
    // At zero radius adjacent faces use their exact shared pixel boundary.
    float alpha = radius > 0.00001 ? 1.0-smoothstep(-fwidth(distance),0.0,distance) : 1.0;
    if (alpha < 0.01) discard;
    vec3 ink = vInk < 0.5 ? uGround :
      (vFace < 0.5 ? texture(uFront,vAtlasUV).rgb : texture(uBack,vAtlasUV).rgb);
    color = vec4(ink*vShade,alpha);
  }`;
  const shaders = [];
  function compile(kind, source) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader));
    shaders.push(shader);
    return shader;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const vertices = [];
  function quad(corners, face) {
    const uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const i of [0, 1, 2, 0, 2, 3]) vertices.push(...corners[i], ...uv[i], face);
  }
  quad(
    [
      [-0.5, -0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
    ],
    0,
  );
  // Rear UVs are reversed in local X, just like a CSS rotateY(180deg) face.
  quad(
    [
      [0.5, -0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
    ],
    1,
  );
  quad(
    [
      [-0.5, -0.5, -0.5],
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
    ],
    2,
  );
  quad(
    [
      [0.5, -0.5, 0.5],
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
    ],
    3,
  );
  quad(
    [
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
      [-0.5, -0.5, 0.5],
    ],
    4,
  );
  quad(
    [
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
      [-0.5, 0.5, -0.5],
    ],
    5,
  );
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const geometry = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  for (const [location, size, offset] of [
    [0, 3, 0],
    [1, 2, 12],
    [2, 1, 20],
  ]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 24, offset);
  }
  const data = new Float32Array(tiles.length * 14),
    instances = gl.createBuffer();
  tiles.forEach((tile, i) => {
    data.set([tile.cx, tile.cy, tile.width, tile.height], i * 14);
    data[i * 14 + 13] = tile.active ? 1 : 0;
  });
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  for (const [location, size, offset] of [
    [3, 4, 0],
    [4, 4, 16],
    [5, 4, 32],
    [6, 2, 48],
  ]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 56, offset);
    gl.vertexAttribDivisor(location, 1);
  }
  const textures = [front, back].map((source, i) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(gl.getUniformLocation(program, i === 0 ? "uFront" : "uBack"), i);
    return texture;
  });
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const rgb = options.behindColor.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const shadows = window.ShortCreatorSliceShadows(
    gl,
    tiles,
    data,
    options.shadowStrength,
    options.shadowSoftness, W, H, perspective,
  );
  gl.uniform3f(gl.getUniformLocation(program,"uGround"),...rgb);
  gl.clearColor(...rgb, 1);
  gl.viewport(0, 0, W, H);
  return {
    data, canvas,
    shadowStats: shadows.stats,
    set(index, p) {
      const offset = index * 14 + 4;
      data.set(
        [
          p.x,
          p.y,
          p.z,
          p.scale,
          (p.rx * Math.PI) / 180,
          (p.ry * Math.PI) / 180,
          (p.rz * Math.PI) / 180,
          p.formation,
          p.shade,
        ],
        offset,
      );
    },
    draw() {
      if(gl.isContextLost())throw new Error("Slice WebGL context lost");
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, tiles.length);
      return 1 + shadows.draw();
    },
    dispose() {
      shadows.dispose();
      textures.forEach((t) => gl.deleteTexture(t));
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteBuffer(instances);
      gl.deleteBuffer(geometry);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      canvas.remove();
    },
  };
};

window.addEventListener?.("pagehide",()=>{sharedGl?.getExtension("WEBGL_lose_context")?.loseContext();sharedGl=null;sharedCanvas=null;});
})();
