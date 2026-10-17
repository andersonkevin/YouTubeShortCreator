/* HyperFrames filmed-screen lens shader (Apache-2.0).
   Only out-of-screen ground is changed to the approved brand background. */
window.ShortCreatorFilmedShader=Object.freeze({
  vertex:"#version 300 es\nin vec2 a;\nvoid main(){ gl_Position = vec4(a, 0.0, 1.0); }",
  fragment:`#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec3 uGround;
uniform vec2 uRes; uniform float uTime; uniform vec2 uAim; uniform float uZoom; uniform vec3 uRot;
uniform vec2 uFocus; uniform vec4 uFocusRect; uniform float uBlur; uniform vec3 uP[5]; uniform float uTrue;
uniform float uCut; uniform float uOut; uniform float uSeed; uniform float uInv;
uniform float uVig; uniform float uCA; uniform float uLed; uniform float uCurve;
out vec4 outColor;
const float FOCAL = 1.7; const float CELL = 3.0;
const int TAPS = 36; const int GLOW_TAPS = 16;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 pal(float x) {
  float t = clamp(x, 0.0, 1.0) * 4.0;
  if (t < 1.0) return mix(uP[0], uP[1], t);
  if (t < 2.0) return mix(uP[1], uP[2], t - 1.0);
  if (t < 3.0) return mix(uP[2], uP[3], t - 2.0);
  return mix(uP[3], uP[4], t - 3.0);
}
vec3 screenAt(vec2 q) {
  float inside = step(0.0, q.x) * step(0.0, q.y) * step(q.x, uRes.x) * step(q.y, uRes.y);
  vec3 c = texture(uSrc, q / uRes).rgb;
  c = mix(c, clamp(c + (1.0 - 2.0 * dot(c, LUMA)), 0.0, 1.0), uInv);
  return mix(uGround, c, inside);
}
mat3 rotation() {
  float cx = cos(uRot.x); float sx = sin(uRot.x); float cy = cos(uRot.y); float sy = sin(uRot.y);
  float cz = cos(uRot.z); float sz = sin(uRot.z);
  mat3 rx = mat3(1.0, 0.0, 0.0,  0.0, cx, sx,  0.0, -sx, cx);
  mat3 ry = mat3(cy, 0.0, -sy,  0.0, 1.0, 0.0,  sy, 0.0, cy);
  mat3 rz = mat3(cz, sz, 0.0,  -sz, cz, 0.0,  0.0, 0.0, 1.0);
  return rz * ry * rx;
}
float wt(float l) { return 1.0 + 7.0 * l * l * l; }
void main() {
  vec2 res = uRes;
  vec2 coord = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
  vec2 frameSeed = vec2(uSeed, floor(uTime * 30.0));
  vec2 px = coord;
  if (uCut > 0.0) {
    float band = floor(coord.y / 16.0);
    float n = hash(vec2(band, frameSeed.x * 3.7 + frameSeed.y));
    px.x += step(0.93 - 0.18 * uCut, n) * (hash(vec2(band, frameSeed.y + 9.0)) - 0.5) * 220.0 * uCut;
  }
  vec2 s0 = (px - 0.5 * res) / res.y;
  // Barrel curve, normalised so the frame's corners stay put: the middle swells toward the
  // camera and straight lines bow outward, without the page edge entering the shot.
  vec2 corner = 0.5 * res / res.y;
  vec2 s = s0 * (1.0 + uCurve * dot(s0, s0)) / (1.0 + uCurve * dot(corner, corner));
  vec3 d = vec3(s.x, s.y, FOCAL);
  mat3 R = rotation();
  vec3 eu = R * vec3(1.0, 0.0, 0.0); vec3 ev = R * vec3(0.0, 1.0, 0.0); vec3 nrm = R * vec3(0.0, 0.0, 1.0);
  vec3 p0 = vec3(0.0, 0.0, 1.0);
  float dn = dot(d, nrm);
  if (dn <= 0.0001) { outColor = vec4(uGround, 1.0); return; }
  vec3 hit3 = d * (dot(p0, nrm) / dn);
  vec2 local = vec2(dot(hit3 - p0, eu), dot(hit3 - p0, ev));
  float K = FOCAL * res.y / uZoom;
  vec2 base = uAim + local * K;
  float z = hit3.z;
  vec2 fl = (uFocus - uAim) / K;
  float zf = (p0 + eu * fl.x + ev * fl.y).z;
  // The focused element stays legible: 1 inside its rect, easing to 0 over ~160 source px.
  vec2 fd = max(abs(base - (uFocusRect.xy + 0.5 * uFocusRect.zw)) - 0.5 * uFocusRect.zw, 0.0);
  float sharp = 1.0 - smoothstep(0.0, 160.0, length(fd));
  float coc = clamp(uBlur * 190.0 * abs(1.0 - zf / z), 0.0, 46.0) * (1.0 - sharp);
  float logPerPx = 1.0 / uZoom * z;
  float rLog = coc * logPerPx;
  // A trace of fringing survives on the focused text (a quarter), enough to read as glass.
  vec2 ca = (1.0 - 0.75 * sharp) * uCA * s * (0.006 + 0.008 * uCut) * (res.y / uZoom);
  float snapAmt = smoothstep(0.5 * CELL, 2.0 * CELL, rLog);
  float spin = hash(coord * 0.37 + frameSeed) * 6.2831;
  vec3 accC = vec3(0.0); float accGl = 0.0; float accRr = 0.0; float accRl = 0.0; float accBb = 0.0; float accBl = 0.0;
  float wG = 0.0; float wR = 0.0; float wB = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float a = fi * 2.39996323 + spin;
    float r = sqrt((fi + 0.5) / float(TAPS)) * rLog;
    vec2 q = base + vec2(cos(a), sin(a)) * r;
    // Snap to LED cells only where blur hides it; snapping sharp text turns glyphs to blocks.
    vec2 qs = mix(q, (floor(q / CELL) + 0.5) * CELL, snapAmt);
    vec3 c0 = screenAt(qs); vec3 cr = screenAt(qs + ca); vec3 cb = screenAt(qs - ca);
    float l0 = dot(c0, LUMA); float lr = dot(cr, LUMA); float lb = dot(cb, LUMA);
    // Each channel weighted by its own sample, or blurred texture picks up a green cast.
    float w0 = wt(l0); float wr = wt(lr); float wb = wt(lb);
    accC += c0 * w0; accGl += l0 * w0; wG += w0;
    accRr += cr.r * wr; accRl += lr * wr; wR += wr;
    accBb += cb.b * wb; accBl += lb * wb; wB += wb;
  }
  accC /= wG; accGl /= wG; accRr /= wR; accRl /= wR; accBb /= wB; accBl /= wB;
  // uTrue blends graded and true colour, so a glide between shots can cross-fade the grade.
  vec3 graded = vec3(pal(accRl).r, pal(accGl).g, pal(accBl).b);
  float red = clamp((accC.r - max(accC.g, accC.b)) * 1.4, 0.0, 1.0);
  graded = mix(graded, vec3(1.0, 0.13, 0.10), red);
  vec3 col = mix(graded, vec3(accRr, accC.g, accBb), uTrue);
  float glowR = 26.0 * logPerPx + rLog * 0.6;
  float glow = 0.0; vec3 glowC = vec3(0.0);
  for (int j = 0; j < GLOW_TAPS; j++) {
    float fj = float(j);
    float a = fj * 2.39996323 + spin * 0.5;
    float r = sqrt((fj + 0.5) / float(GLOW_TAPS)) * glowR;
    vec3 g = screenAt(base + vec2(cos(a), sin(a)) * r);
    float l = dot(g, LUMA);
    glow += l * l; glowC += g * l;
  }
  glow /= float(GLOW_TAPS); glowC /= float(GLOW_TAPS);
  vec3 glowTint = mix(pal(min(1.0, glow * 1.6)) * glow, glowC, uTrue);
  col += glowTint * 0.6 * (1.0 - 0.6 * sharp);
  vec2 cu = fract(base / CELL) - 0.5;
  vec3 sub = 0.5 + 0.5 * cos(6.2831853 * (vec3(cu.x + 0.5) - vec3(0.1667, 0.5, 0.8333)));
  float rowm = 1.0 - smoothstep(0.28, 0.5, abs(cu.y));
  float colm = 1.0 - smoothstep(0.36, 0.5, abs(cu.x));
  vec3 led = rowm * colm * (0.4 + 1.0 * sub);
  // The grid only shows once a cell spans ~4 output px; finer, it aliases into moiré.
  float ledAmt = (1.0 - smoothstep(0.8, 3.5, rLog / CELL)) * smoothstep(4.0, 6.5, CELL / logPerPx);
  col *= mix(vec3(1.0), led * 1.3, ledAmt * uLed * (1.0 - 0.7 * sharp));
  col = col * (1.0 + uCut * 1.1) + uCut * 0.06;
  vec2 v = s0 * vec2(0.85, 1.15);
  col *= max(0.0, 1.0 - uVig * dot(v, v));
  col *= 1.0 - (0.035 - 0.035 * sin(coord.y * 0.9 - uTime * 55.0));
  col += (hash(coord + frameSeed * 1.31) - 0.5) * 0.06;
  col *= 1.0 - uOut;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`
});
