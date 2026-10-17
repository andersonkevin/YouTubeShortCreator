// HyperFrames liquid-glass GPU core, Apache-2.0. See THIRD_PARTY_NOTICES.md.
// Pinned source and modifications: production-liquid-glass-provenance.json.
window.ShortCreatorLiquidGlassRuntime = (() => {
  var E = Object.defineProperty;
  var D = Object.getOwnPropertyDescriptor;
  var z = Object.getOwnPropertyNames;
  var N = Object.prototype.hasOwnProperty;
  var O = (m, e) => {
      for (var t in e) E(m, t, { get: e[t], enumerable: !0 });
    },
    H = (m, e, t, r) => {
      if ((e && typeof e == "object") || typeof e == "function")
        for (let n of z(e))
          !N.call(m, n) &&
            n !== t &&
            E(m, n, { get: () => e[n], enumerable: !(r = D(e, n)) || r.enumerable });
      return m;
    };
  var I = (m) => H(E({}, "__esModule", { value: !0 }), m);
  var Y = {};
  O(Y, {
    CSS_PROPERTY_MAP: () => _,
    DEFAULTS: () => w,
    GlassRendererGPU: () => y,
  });
  var w = {
      blurAmount: 0,
      refraction: 0.69,
      chromAberration: 0.05,
      edgeHighlight: 0.05,
      specular: 0,
      fresnel: 1,
      distortion: 0,
      cornerRadius: 65,
      zRadius: 40,
      opacity: 1,
      saturation: 0,
      tintStrength: 0,
      brightness: 0,
      shadowOpacity: 0.3,
      shadowSpread: 10,
      shadowOffsetY: 1,
      bevelMode: 0,
    },
    _ = {
      "--lg-blur": "blurAmount",
      "--lg-refraction": "refraction",
      "--lg-chrom-aberration": "chromAberration",
      "--lg-edge-highlight": "edgeHighlight",
      "--lg-specular": "specular",
      "--lg-fresnel": "fresnel",
      "--lg-distortion": "distortion",
      "--lg-corner-radius": "cornerRadius",
      "--lg-z-radius": "zRadius",
      "--lg-opacity": "opacity",
      "--lg-saturation": "saturation",
      "--lg-tint": "tintStrength",
      "--lg-brightness": "brightness",
      "--lg-shadow-opacity": "shadowOpacity",
      "--lg-shadow-spread": "shadowSpread",
      "--lg-shadow-offset-y": "shadowOffsetY",
      "--lg-bevel-mode": "bevelMode",
    },
    L = 6,
    T = 20;
  var q = `// Blit shader - copy texture with UV transform

struct BlitUniforms {
  scale: vec2f,
  offset: vec2f,
}

@group(0) @binding(0) var<uniform> u: BlitUniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@location(0) pos: vec2f) -> VertexOutput {
  var out: VertexOutput;
  out.uv = pos * 0.5 + 0.5;
  out.position = vec4f(pos, 0.0, 1.0);
  return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  return textureSample(tex, texSampler, in.uv * u.scale + u.offset);
}
`,
    k = `// Blur shader - 9-tap Gaussian blur (single direction)

struct BlurUniforms {
  dir: vec2f,
  _pad: vec2f,
}

@group(0) @binding(0) var<uniform> u: BlurUniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@location(0) pos: vec2f) -> VertexOutput {
  var out: VertexOutput;
  out.uv = pos * 0.5 + 0.5;
  out.position = vec4f(pos, 0.0, 1.0);
  return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  var s = textureSample(tex, texSampler, in.uv) * 0.227027;
  s += textureSample(tex, texSampler, in.uv + u.dir * 1.0) * 0.194594;
  s += textureSample(tex, texSampler, in.uv - u.dir * 1.0) * 0.194594;
  s += textureSample(tex, texSampler, in.uv + u.dir * 2.0) * 0.121622;
  s += textureSample(tex, texSampler, in.uv - u.dir * 2.0) * 0.121622;
  s += textureSample(tex, texSampler, in.uv + u.dir * 3.0) * 0.054054;
  s += textureSample(tex, texSampler, in.uv - u.dir * 3.0) * 0.054054;
  s += textureSample(tex, texSampler, in.uv + u.dir * 4.0) * 0.016216;
  s += textureSample(tex, texSampler, in.uv - u.dir * 4.0) * 0.016216;
  return s;
}
`,
    W = `// Glass shader - the core liquid glass effect

struct GlassUniforms {
  center: vec2f,
  size: vec2f,
  res: vec2f,
  radius: f32,
  pad: f32,
  refract: f32,
  chroma: f32,
  edgeHL: f32,
  spec: f32,
  fresnel: f32,
  distort: f32,
  alpha: f32,
  sat: f32,
  tint: f32,
  zRadius: f32,
  brightness: f32,
  shadowAlpha: f32,
  shadowSpread: f32,
  shadowOffY: f32,
  bevelMode: f32,
  _pad: vec2f,
}

@group(0) @binding(0) var<uniform> u: GlassUniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var bgTex: texture_2d<f32>;
@group(0) @binding(3) var blurTex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) localPx: vec2f,
  @location(1) screenUV: vec2f,
}

@vertex
fn vertexMain(@location(0) pos: vec2f) -> VertexOutput {
  var out: VertexOutput;
  let total = u.size + vec2f(u.pad * 2.0);
  out.localPx = pos * total;
  let px = u.center + pos * total;
  out.screenUV = vec2f(px.x / u.res.x, 1.0 - px.y / u.res.y);
  var ndc = (px / u.res) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  out.position = vec4f(ndc, 0.0, 1.0);
  return out;
}

// Rounded-rect signed distance
fn rrSDF(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + vec2f(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - r;
}

// Bevel height field
fn bevelHeight(d: f32, zR: f32) -> f32 {
  if (d <= 0.0) { return 0.0; }
  if (d >= zR) { return zR; }
  return sqrt(d * (2.0 * zR - d));
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  let half_ = u.size * 0.5;
  let r = min(u.radius, min(half_.x, half_.y));
  let sdf = rrSDF(in.localPx, half_, r);

  // Anti-aliased mask
  let mask = 1.0 - smoothstep(-1.5, 0.5, sdf);

  let maxD = min(half_.x, half_.y);
  let inside = -sdf;
  let edge = (1.0 - smoothstep(0.0, maxD * 0.35, inside));

  // Surface normal via bevel height field
  let zR = u.zRadius;
  let e = 2.0;
  let dC = inside;
  let dR = -rrSDF(in.localPx + vec2f(e, 0.0), half_, r);
  let dL = -rrSDF(in.localPx - vec2f(e, 0.0), half_, r);
  let dU = -rrSDF(in.localPx + vec2f(0.0, e), half_, r);
  let dD = -rrSDF(in.localPx - vec2f(0.0, e), half_, r);
  let hC = bevelHeight(dC, zR);
  let hR = bevelHeight(dR, zR);
  let hL = bevelHeight(dL, zR);
  let hU = bevelHeight(dU, zR);
  let hD = bevelHeight(dD, zR);
  let hGrad = vec2f(hR - hL, hU - hD) / (2.0 * e);
  let N = normalize(vec3f(-hGrad, 1.0));

  let depth = smoothstep(0.0, zR, inside);

  // Refraction - compute both modes and select
  let pxToUV = vec2f(1.0, -1.0) / u.res;
  let ior = 1.5;
  let refrPow = 1.0 - 1.0 / ior;
  let thickness = hC * 2.0;
  let thickNorm = thickness / max(zR * 2.0, 1.0);

  // Biconvex mode
  let exitRefr = hGrad * refrPow;
  let entryRefr = hGrad * refrPow;
  let throughRefr = entryRefr * thickNorm * 0.5;
  var refrPxBiconvex = (exitRefr + entryRefr + throughRefr) * u.refract * 30.0;
  let centerDir = -in.localPx / max(half_, vec2f(1.0));
  refrPxBiconvex += centerDir * u.refract * 4.0 * depth;

  // Dome mode
  let refrPxDome = -in.localPx * u.refract * depth * 0.35;

  // Select based on bevel mode
  let refrPx = select(refrPxBiconvex, refrPxDome, u.bevelMode >= 0.5);
  let refr = refrPx * pxToUV;

  // Micro-distortion noise
  let ns = in.localPx * 0.08;
  let absPxToUV = vec2f(1.0) / u.res;
  let micro = (vec2f(hash(ns), hash(ns + vec2f(37.0))) - 0.5) * u.distort * 4.0 * absPxToUV;

  // Chromatic aberration
  let caS = u.chroma * 18.0 * (edge * 0.7 + 0.3) * 2.0;
  let caD = N.xy * caS * pxToUV;
  let base = in.screenUV + refr + micro;

  // Sample textures (must be in uniform control flow)
  let sharpR = textureSample(bgTex, texSampler, base + caD).r;
  let sharpG = textureSample(bgTex, texSampler, base).g;
  let sharpB = textureSample(bgTex, texSampler, base - caD).b;
  let sharp = vec3f(sharpR, sharpG, sharpB);

  let blurR = textureSample(blurTex, texSampler, base + caD).r;
  let blurG = textureSample(blurTex, texSampler, base).g;
  let blurB = textureSample(blurTex, texSampler, base - caD).b;
  let blur = vec3f(blurR, blurG, blurB);

  // Edge-weighted blur mix
  let edgeMix = 1.0 - edge * 0.15;
  var col = mix(sharp, blur, edgeMix);

  // Brightness
  col *= 1.0 + u.brightness;

  // Saturation
  let lum = dot(col, vec3f(0.299, 0.587, 0.114));
  col = mix(vec3f(lum), col, 1.0 + u.sat);

  // Cool glass tint
  col = mix(col, col * vec3f(0.92, 0.95, 1.05), u.tint);
  col *= 1.0 + 0.06 * depth;

  // Fresnel
  let fres = pow(1.0 - abs(N.z), 4.0) * u.fresnel;

  // Specular highlights (multi-light Blinn-Phong)
  let V = vec3f(0.0, 0.0, 1.0);
  let L1 = normalize(vec3f(0.4, 0.7, 1.0));
  let H1 = normalize(L1 + V);
  let sp1 = pow(max(dot(N, H1), 0.0), 90.0);
  let L2 = normalize(vec3f(-0.3, -0.5, 1.0));
  let H2 = normalize(L2 + V);
  let sp2 = pow(max(dot(N, H2), 0.0), 50.0) * 0.3;
  let L3 = normalize(vec3f(0.1, 0.3, 1.0));
  let spB = pow(max(dot(N, L3), 0.0), 6.0) * 0.1;
  let L4 = normalize(vec3f(0.0, 0.9, 0.4));
  let H4 = normalize(L4 + V);
  let sp4 = pow(max(dot(N, H4), 0.0), 120.0) * 0.6;
  let totalSpec = (sp1 + sp2 + spB + sp4) * u.spec;

  // Inner border / stroke highlight
  let borderWidth = 1.5;
  let innerStroke = smoothstep(-borderWidth - 1.0, -borderWidth, sdf)
                  * (1.0 - smoothstep(-1.0, 0.0, sdf));
  let topBias = 0.5 + 0.5 * (-in.localPx.y / half_.y);
  let innerStrokeFinal = innerStroke * (0.4 + 0.6 * topBias);

  // Edge highlight & inner glow
  let rim = edge * u.edgeHL * 0.22;
  let innerGlow = (1.0 - smoothstep(0.0, 5.0, -sdf)) * u.edgeHL * 0.15;

  // Environment-like reflection (fake)
  let envRefl = (N.y * 0.5 + 0.5) * fres * 0.08;

  // Composite glass effect
  var fin = col;
  fin += vec3f(totalSpec);
  fin += vec3f(rim + innerGlow);
  fin += vec3f(innerStrokeFinal * u.edgeHL * 0.55);
  fin += vec3f(envRefl);
  fin = mix(fin, vec3f(1.0), fres * 0.2);

  // Shadow calculation (outside panel)
  let sdfShadow = rrSDF(in.localPx - vec2f(0.0, u.shadowOffY), half_, r);
  let shadowD = max(sdfShadow - 1.0, 0.0);
  let spread = max(u.shadowSpread, 1.0);
  let falloff = 1.0 / (spread * spread);
  let outerShadow = exp(-shadowD * shadowD * falloff) * 0.65;
  let contactShadow = exp(-shadowD * 0.08 / max(spread * 0.04, 0.01)) * 0.35;
  let shadow = (outerShadow + contactShadow) * u.shadowAlpha;

  // Select between shadow (outside) and glass (inside)
  let isOutside = sdf > 0.0;
  let finalColor = select(fin, vec3f(0.0), isOutside);
  let finalAlpha = select(mask * u.alpha, shadow, isOutside);

  return vec4f(finalColor, finalAlpha);
}
`,
    y = class {
      canvas;
      device = null;
      context = null;
      format = "bgra8unorm";
      blitPipeline = null;
      blurPipeline = null;
      glassPipeline = null;
      quadBuffer = null;
      panelBuffer = null;
      blitUniformBuffer = null;
      blurUniformBuffer = null;
      glassUniformBuffer = null;
      sampler = null;
      targetCache = new Map();
      activeTargets = null;
      bgTexture = null;
      bgTextureView = null;
      width = 0;
      height = 0;
      _initPromise = null;
      _initialized = !1;
      constructor() {
        ((this.canvas = document.createElement("canvas")),
          (this.canvas.style.display = "none"),
          document.body.appendChild(this.canvas));
      }
      async init() {
        return this._initPromise
          ? this._initPromise
          : ((this._initPromise = this._doInit()), this._initPromise);
      }
      async _doInit() {
        if (!navigator.gpu) return (console.warn("WebGPU not supported"), !1);
        let e = await navigator.gpu.requestAdapter();
        return e
          ? ((this.device = await e.requestDevice()),
            this.device
              ? ((this.context = this.canvas.getContext("webgpu")),
                this.context
                  ? ((this.format = navigator.gpu.getPreferredCanvasFormat()),
                    this.context.configure({
                      device: this.device,
                      format: this.format,
                      alphaMode: "premultiplied",
                    }),
                    this._initPipelines(),
                    this._initBuffers(),
                    (this._initialized = !0),
                    !0)
                  : (console.warn("Failed to get WebGPU context"), !1))
              : (console.warn("Failed to get WebGPU device"), !1))
          : (console.warn("No WebGPU adapter found"), !1);
      }
      get initialized() {
        return this._initialized;
      }
      _initPipelines() {
        let e = this.device;
        this.sampler = e.createSampler({
          magFilter: "linear",
          minFilter: "linear",
          addressModeU: "clamp-to-edge",
          addressModeV: "clamp-to-edge",
        });
        let t = e.createShaderModule({ code: q }),
          r = e.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
              },
              { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
              { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            ],
          });
        this.blitPipeline = e.createRenderPipeline({
          layout: e.createPipelineLayout({ bindGroupLayouts: [r] }),
          vertex: {
            module: t,
            entryPoint: "vertexMain",
            buffers: [
              {
                arrayStride: 8,
                attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
              },
            ],
          },
          fragment: { module: t, entryPoint: "fragmentMain", targets: [{ format: "rgba8unorm" }] },
          primitive: { topology: "triangle-strip" },
        });
        let n = e.createShaderModule({ code: k }),
          i = e.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
              },
              { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
              { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            ],
          });
        this.blurPipeline = e.createRenderPipeline({
          layout: e.createPipelineLayout({ bindGroupLayouts: [i] }),
          vertex: {
            module: n,
            entryPoint: "vertexMain",
            buffers: [
              {
                arrayStride: 8,
                attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
              },
            ],
          },
          fragment: { module: n, entryPoint: "fragmentMain", targets: [{ format: "rgba8unorm" }] },
          primitive: { topology: "triangle-strip" },
        });
        let s = e.createShaderModule({ code: W }),
          l = e.createBindGroupLayout({
            entries: [
              {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "uniform" },
              },
              { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
              { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
              { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            ],
          });
        this.glassPipeline = e.createRenderPipeline({
          layout: e.createPipelineLayout({ bindGroupLayouts: [l] }),
          vertex: {
            module: s,
            entryPoint: "vertexMain",
            buffers: [
              {
                arrayStride: 8,
                attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
              },
            ],
          },
          fragment: {
            module: s,
            entryPoint: "fragmentMain",
            targets: [
              {
                format: this.format,
                blend: {
                  color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                    operation: "add",
                  },
                  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                },
              },
            ],
          },
          primitive: { topology: "triangle-strip" },
        });
      }
      _initBuffers() {
        let e = this.device;
        ((this.quadBuffer = e.createBuffer({
          size: 32,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: !0,
        })),
          new Float32Array(this.quadBuffer.getMappedRange()).set([-1, -1, 1, -1, -1, 1, 1, 1]),
          this.quadBuffer.unmap(),
          (this.panelBuffer = e.createBuffer({
            size: 32,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: !0,
          })),
          new Float32Array(this.panelBuffer.getMappedRange()).set([
            -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
          ]),
          this.panelBuffer.unmap(),
          (this.blitUniformBuffer = e.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          })),
          (this.blurUniformBuffer = e.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          })),
          (this.glassUniformBuffer = e.createBuffer({
            size: 112,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          })));
      }
      resize(e, t) {
        if (!(this.width === e && this.height === t)) {
          ((this.width = e), (this.height = t));
          for (let r of this.targetCache.values()) this._freeTargetSet(r);
          (this.targetCache.clear(), (this.activeTargets = null));
        }
      }
      uploadAndBlur(e, t, r, n, i, s) {
        if (!this._initialized || !this.device || !this._setActiveSize(n, i)) return;
        let l = this.device,
          a = this.width,
          u = this.height,
          o = this.activeTargets,
          d = this.nativeUploadCanvas || (this.nativeUploadCanvas = document.createElement("canvas"));
        ((d.width = a),
          (d.height = u),
          d.getContext("2d").drawImage(e, -t, -r),
          (!this.bgTexture || this.bgTexture.width !== a || this.bgTexture.height !== u) &&
            (this.bgTexture && this.bgTexture.destroy(),
            (this.bgTexture = l.createTexture({
              size: [a, u],
              format: "rgba8unorm",
              usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
            })),
            (this.bgTextureView = this.bgTexture.createView())),
          l.queue.copyExternalImageToTexture(
            { source: d, flipY: !0 },
            { texture: this.bgTexture },
            [a, u],
          ));
        let f = l.createCommandEncoder();
        this._blitPass(f, this.bgTextureView, o.bg.view, a, u, 1, 1, 0, 0);
        let h = o.blurA.w,
          b = o.blurA.h;
        if ((this._blitPass(f, o.bg.view, o.blurA.view, h, b, 1, 1, 0, 0), s > 0)) {
          let g = s * 2.5;
          for (let p = 0; p < L; p++)
            (this._blurPass(f, o.blurA.view, o.blurB.view, h, b, g / h, 0),
              this._blurPass(f, o.blurB.view, o.blurA.view, h, b, 0, g / b));
        }
        l.queue.submit([f.finish()]);
      }
      _blitPass(e, t, r, n, i, s, l, a, u) {
        let o = this.device;
        o.queue.writeBuffer(this.blitUniformBuffer, 0, new Float32Array([s, l, a, u]));
        let d = o.createBindGroup({
            layout: this.blitPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: this.blitUniformBuffer } },
              { binding: 1, resource: this.sampler },
              { binding: 2, resource: t },
            ],
          }),
          c = e.beginRenderPass({
            colorAttachments: [
              {
                view: r,
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
              },
            ],
          });
        (c.setPipeline(this.blitPipeline),
          c.setBindGroup(0, d),
          c.setVertexBuffer(0, this.quadBuffer),
          c.setViewport(0, 0, n, i, 0, 1),
          c.draw(4),
          c.end());
      }
      _blurPass(e, t, r, n, i, s, l) {
        let a = this.device;
        a.queue.writeBuffer(this.blurUniformBuffer, 0, new Float32Array([s, l, 0, 0]));
        let u = a.createBindGroup({
            layout: this.blurPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: this.blurUniformBuffer } },
              { binding: 1, resource: this.sampler },
              { binding: 2, resource: t },
            ],
          }),
          o = e.beginRenderPass({
            colorAttachments: [
              {
                view: r,
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
              },
            ],
          });
        (o.setPipeline(this.blurPipeline),
          o.setBindGroup(0, u),
          o.setVertexBuffer(0, this.quadBuffer),
          o.setViewport(0, 0, n, i, 0, 1),
          o.draw(4),
          o.end());
      }
      renderGlassPanel(e, t, r, n) {
        if (!this._initialized || !this.device || !this.context) return;
        let i = this.device,
          s = this.width,
          l = this.height,
          a = this.activeTargets,
          u = new Float32Array([
            s * 0.5,
            l * 0.5,
            t * n,
            r * n,
            s,
            l,
            e.cornerRadius * n,
            T * n,
            e.refraction,
            e.chromAberration,
            e.edgeHighlight,
            e.specular,
            e.fresnel,
            e.distortion,
            e.opacity,
            e.saturation,
            e.tintStrength,
            e.zRadius * n,
            e.brightness,
            e.shadowOpacity,
            e.shadowSpread * n,
            e.shadowOffsetY * n,
            e.bevelMode,
            0,
            0,
            0,
            0,
            0,
          ]);
        i.queue.writeBuffer(this.glassUniformBuffer, 0, u);
        let o = i.createBindGroup({
            layout: this.glassPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: this.glassUniformBuffer } },
              { binding: 1, resource: this.sampler },
              { binding: 2, resource: a.bg.view },
              { binding: 3, resource: a.blurA.view },
            ],
          }),
          d = i.createCommandEncoder(),
          c = d.beginRenderPass({
            colorAttachments: [
              {
                view: this.context.getCurrentTexture().createView(),
                loadOp: "load",
                storeOp: "store",
              },
            ],
          });
        (c.setPipeline(this.glassPipeline),
          c.setBindGroup(0, o),
          c.setVertexBuffer(0, this.panelBuffer),
          c.setViewport(0, 0, s, l, 0, 1),
          c.draw(4),
          c.end(),
          i.queue.submit([d.finish()]));
      }
      clear() {
        if (!this._initialized || !this.device || !this.context) return;
        let e = this.device.createCommandEncoder(),
          t = e.beginRenderPass({
            colorAttachments: [
              {
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
              },
            ],
          });
        (t.setViewport(0, 0, this.width, this.height, 0, 1),
          t.end(),
          this.device.queue.submit([e.finish()]));
      }
      destroy() {
        for (let e of this.targetCache.values()) this._freeTargetSet(e);
        (this.targetCache.clear(),
          this.bgTexture && this.bgTexture.destroy(),
          this.quadBuffer && this.quadBuffer.destroy(),
          this.panelBuffer && this.panelBuffer.destroy(),
          this.blitUniformBuffer && this.blitUniformBuffer.destroy(),
          this.blurUniformBuffer && this.blurUniformBuffer.destroy(),
          this.glassUniformBuffer && this.glassUniformBuffer.destroy(),
          this.device?.destroy(),
          this.canvas.remove());
      }
      _setActiveSize(e, t) {
        if (e <= 0 || t <= 0) return !1;
        ((this.width = e),
          (this.height = t),
          (this.canvas.width < e || this.canvas.height < t) &&
            ((this.canvas.width = Math.max(this.canvas.width, e)),
            (this.canvas.height = Math.max(this.canvas.height, t)),
            this.context?.configure({
              device: this.device,
              format: this.format,
              alphaMode: "premultiplied",
            })));
        let r = `${e}x${t}`,
          n = this.targetCache.get(r);
        return (
          n ||
            ((n = {
              bg: this._makeTarget(e, t),
              blurA: this._makeTarget(e, t),
              blurB: this._makeTarget(e, t),
            }),
            this.targetCache.set(r, n)),
          (this.activeTargets = n),
          !0
        );
      }
      _makeTarget(e, t) {
        let r = this.device.createTexture({
          size: [e, t],
          format: "rgba8unorm",
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        return { texture: r, view: r.createView(), w: e, h: t };
      }
      _freeTarget(e) {
        e && e.texture.destroy();
      }
      _freeTargetSet(e) {
        (this._freeTarget(e.bg), this._freeTarget(e.blurA), this._freeTarget(e.blurB));
      }
    };
  return I(Y);
})();
