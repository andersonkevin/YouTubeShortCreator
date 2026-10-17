/* Retained HyperFrames source, Apache-2.0. Reproduced by tools/vendor_lettering.py. */
(() => { 'use strict';
const penEase = function (pathEl, opts) {
          opts = opts || {};
          var kCurve = opts.kCurve !== undefined ? opts.kCurve : 10;
          var L = pathEl.getTotalLength();
          if (L <= 0)
            return {
              ease: function (t) {
                return t;
              },
              samples: 2,
              inkTime: 1,
              len: 0,
            };
          var PRE = 48;
          var pts = [];
          for (var i = 0; i <= PRE; i++) pts.push(pathEl.getPointAtLength((L * i) / PRE));
          var curv = [0];
          for (i = 1; i < PRE; i++) {
            var ax = pts[i].x - pts[i - 1].x,
              ay = pts[i].y - pts[i - 1].y;
            var bx = pts[i + 1].x - pts[i].x,
              by = pts[i + 1].y - pts[i].y;
            var la = Math.hypot(ax, ay) || 1e-6,
              lb = Math.hypot(bx, by) || 1e-6;
            var dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
            curv.push(Math.acos(dot) / ((la + lb) / 2));
          }
          curv.push(0);
          var mass = 0;
          for (i = 0; i < curv.length; i++) mass += curv[i];
          var N = Math.max(25, Math.min(75, Math.round(25 + mass * 18)));
          var seg = L / N;
          var times = [0];
          var t = 0;
          for (i = 1; i <= N; i++) {
            var u = ((i - 0.5) / N) * PRE;
            var i0 = Math.floor(u),
              f = u - i0;
            var c = curv[Math.min(i0, PRE)] * (1 - f) + curv[Math.min(i0 + 1, PRE)] * f;
            var speed = Math.max(1 / (1 + kCurve * c * 14), 0.22);
            t += seg / speed;
            times.push(t);
          }
          var total = times[N];
          for (i = 0; i <= N; i++) times[i] /= total;
          var easeFn = function (p) {
            if (p <= 0) return 0;
            if (p >= 1) return 1;
            var lo = 0,
              hi = N;
            while (hi - lo > 1) {
              var mid = (lo + hi) >> 1;
              if (times[mid] <= p) lo = mid;
              else hi = mid;
            }
            var span = times[hi] - times[lo] || 1e-9;
            return (lo + (p - times[lo]) / span) / N;
          };
          return { ease: easeFn, samples: N, inkTime: total, len: L };
        };

        
function stitch(svg,text,coarse) {
 const SVG_NS='http://www.w3.org/2000/svg',exit='none';
 const reg=coarse?{dash:10,gap:7,width:4.2,jitter:2.3}:{dash:6.5,gap:4.5,width:2.6,jitter:1.5};
function arcPts(cx, cy, rx, ry, a0, a1) {
              var steps = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 18));
              var pts = [];
              for (var i = 0; i <= steps; i += 1) {
                var a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
                pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
              }
              return pts;
            }
            function join() {
              var out = [];
              for (var i = 0; i < arguments.length; i += 1) {
                out = out.concat(arguments[i]);
              }
              return out;
            }

            var GLYPHS = {
              A: [
                [
                  [4, 100],
                  [35, 2],
                  [66, 100],
                ],
                [
                  [15, 64],
                  [55, 64],
                ],
              ],
              B: [
                [
                  [6, 2],
                  [6, 98],
                ],
                join([[6, 2]], arcPts(36, 26, 24, 24, -90, 90), [[6, 50]]),
                join([[6, 50]], arcPts(38, 74, 26, 24, -90, 90), [[6, 98]]),
              ],
              C: [arcPts(38, 50, 30, 46, -60, -300)],
              D: [
                join(
                  [
                    [6, 2],
                    [24, 2],
                  ],
                  arcPts(24, 50, 40, 48, -90, 90),
                  [
                    [24, 98],
                    [6, 98],
                    [6, 4],
                  ],
                ),
              ],
              E: [
                [
                  [60, 2],
                  [8, 2],
                  [8, 98],
                  [60, 98],
                ],
                [
                  [8, 50],
                  [48, 50],
                ],
              ],
              F: [
                [
                  [60, 2],
                  [8, 2],
                  [8, 98],
                ],
                [
                  [8, 50],
                  [46, 50],
                ],
              ],
              G: [
                join(arcPts(38, 50, 30, 46, -60, -305), [
                  [56, 62],
                  [38, 62],
                ]),
              ],
              H: [
                [
                  [8, 2],
                  [8, 98],
                ],
                [
                  [62, 2],
                  [62, 98],
                ],
                [
                  [8, 50],
                  [62, 50],
                ],
              ],
              I: [
                [
                  [35, 2],
                  [35, 98],
                ],
                [
                  [20, 2],
                  [50, 2],
                ],
                [
                  [20, 98],
                  [50, 98],
                ],
              ],
              J: [
                join(
                  [
                    [58, 2],
                    [58, 72],
                  ],
                  arcPts(33, 72, 25, 26, 0, 180),
                ),
              ],
              K: [
                [
                  [8, 2],
                  [8, 98],
                ],
                [
                  [60, 2],
                  [8, 56],
                ],
                [
                  [24, 42],
                  [62, 98],
                ],
              ],
              L: [
                [
                  [8, 2],
                  [8, 98],
                  [60, 98],
                ],
              ],
              M: [
                [
                  [6, 98],
                  [6, 2],
                  [35, 58],
                  [64, 2],
                  [64, 98],
                ],
              ],
              N: [
                [
                  [8, 98],
                  [8, 2],
                  [62, 98],
                  [62, 2],
                ],
              ],
              O: [arcPts(35, 50, 30, 47, -90, 270)],
              P: [
                [
                  [8, 98],
                  [8, 2],
                ],
                join(
                  [
                    [8, 2],
                    [36, 2],
                  ],
                  arcPts(36, 27, 26, 25, -90, 90),
                  [
                    [36, 52],
                    [8, 52],
                  ],
                ),
              ],
              Q: [
                arcPts(35, 50, 30, 47, -90, 270),
                [
                  [46, 70],
                  [66, 96],
                ],
              ],
              R: [
                [
                  [8, 98],
                  [8, 2],
                ],
                join(
                  [
                    [8, 2],
                    [36, 2],
                  ],
                  arcPts(36, 27, 26, 25, -90, 90),
                  [
                    [36, 52],
                    [8, 52],
                  ],
                ),
                [
                  [30, 52],
                  [64, 98],
                ],
              ],
              S: [
                [
                  [58, 14],
                  [44, 3],
                  [24, 3],
                  [10, 14],
                  [10, 30],
                  [24, 42],
                  [46, 56],
                  [58, 68],
                  [58, 86],
                  [44, 97],
                  [22, 97],
                  [8, 86],
                ],
              ],
              T: [
                [
                  [6, 2],
                  [64, 2],
                ],
                [
                  [35, 2],
                  [35, 98],
                ],
              ],
              U: [
                join(
                  [
                    [8, 2],
                    [8, 68],
                  ],
                  arcPts(35, 68, 27, 29, 180, 360),
                  [
                    [62, 68],
                    [62, 2],
                  ],
                ),
              ],
              V: [
                [
                  [6, 2],
                  [35, 98],
                  [64, 2],
                ],
              ],
              W: [
                [
                  [4, 2],
                  [19, 98],
                  [35, 34],
                  [51, 98],
                  [66, 2],
                ],
              ],
              X: [
                [
                  [8, 2],
                  [62, 98],
                ],
                [
                  [62, 2],
                  [8, 98],
                ],
              ],
              Y: [
                [
                  [6, 2],
                  [35, 50],
                ],
                [
                  [64, 2],
                  [35, 50],
                  [35, 98],
                ],
              ],
              Z: [
                [
                  [8, 2],
                  [62, 2],
                  [8, 98],
                  [62, 98],
                ],
              ],
              0: [arcPts(35, 50, 27, 47, -90, 270)],
              1: [
                [
                  [20, 20],
                  [38, 4],
                  [38, 98],
                ],
              ],
              2: [
                join(arcPts(35, 26, 26, 24, -160, 10), [
                  [8, 98],
                  [62, 98],
                ]),
              ],
              3: [join(arcPts(34, 26, 24, 24, -150, 80), arcPts(36, 73, 26, 25, -100, 150))],
              4: [
                [
                  [50, 2],
                  [6, 66],
                  [66, 66],
                ],
                [
                  [50, 44],
                  [50, 98],
                ],
              ],
              5: [
                [
                  [58, 3],
                  [14, 3],
                  [11, 44],
                  [34, 38],
                  [55, 48],
                  [59, 72],
                  [46, 94],
                  [20, 96],
                  [8, 84],
                ],
              ],
              6: [
                join(
                  [
                    [52, 4],
                    [28, 26],
                    [13, 56],
                  ],
                  arcPts(35, 72, 24, 26, -180, 180),
                ),
              ],
              7: [
                [
                  [8, 3],
                  [62, 3],
                  [30, 98],
                ],
              ],
              8: [join(arcPts(35, 27, 21, 24, 90, 450), arcPts(35, 74, 26, 25, -90, 270))],
              9: [
                join(arcPts(37, 28, 25, 25, 0, 360), [
                  [62, 28],
                  [56, 64],
                  [34, 98],
                ]),
              ],
            };
            var GLYPH_W = 70;
            var SPACE_W = 40;
            var GAP = 24;

            // Fixed-seed LCG: the only randomness source, consumed in one
            // deterministic order during this build phase.
            var lcgState = 0x57174c3d;
            function next() {
              lcgState = (Math.imul(1664525, lcgState) + 1013904223) >>> 0;
              return lcgState / 4294967296;
            }

            // Resample a polyline to even stitch-scale steps, then displace
            // each point perpendicular to the local direction: seeded angle
            // jitter, so every stitch lands at a slightly different angle.
            function resampleJitter(points) {
              var STEP = 5;
              var flat = [points[0]];
              for (var i = 1; i < points.length; i += 1) {
                var ax = flat[flat.length - 1][0];
                var ay = flat[flat.length - 1][1];
                var bx = points[i][0];
                var by = points[i][1];
                var seg = Math.hypot(bx - ax, by - ay);
                var n = Math.max(1, Math.round(seg / STEP));
                for (var k = 1; k <= n; k += 1) {
                  flat.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
                }
              }
              var out = [];
              for (var p = 0; p < flat.length; p += 1) {
                var prev = flat[Math.max(0, p - 1)];
                var after = flat[Math.min(flat.length - 1, p + 1)];
                var dx = after[0] - prev[0];
                var dy = after[1] - prev[1];
                var len = Math.hypot(dx, dy) || 1;
                var edge = p === 0 || p === flat.length - 1 ? 0.5 : 1;
                var off = (next() - 0.5) * 2 * reg.jitter * edge;
                out.push([flat[p][0] + (-dy / len) * off, flat[p][1] + (dx / len) * off]);
              }
              return out;
            }

            // ---- Layout: bake letter x-offsets into the points so every
            // path shares ONE flat coordinate space (the global needle can
            // then read getPointAtLength coordinates directly). -----------
            var characters = Array.from(text);
            var letters = [];
            var cursor = 0;
            for (var ci = 0; ci < characters.length; ci += 1) {
              var ch = characters[ci];
              var glyph = GLYPHS[ch];
              if (!glyph) {
                cursor += SPACE_W + GAP;
                continue;
              }
              var strokes = [];
              for (var si = 0; si < glyph.length; si += 1) {
                var jittered = resampleJitter(glyph[si]);
                var shifted = [];
                for (var pi = 0; pi < jittered.length; pi += 1) {
                  shifted.push([jittered[pi][0] + cursor, jittered[pi][1]]);
                }
                strokes.push({ points: shifted });
              }
              letters.push({ strokes: strokes });
              cursor += GLYPH_W + GAP;
            }
            var totalWidth = Math.max(GLYPH_W, cursor - GAP);
            var PAD = 14;
            svg.setAttribute(
              "viewBox",
              -PAD + " " + -PAD + " " + (totalWidth + 2 * PAD) + " " + (100 + 2 * PAD),
            );

            // ---- Build DOM + per-stroke dash/hole tables ----------------
            function el(name) {
              return document.createElementNS(SVG_NS, name);
            }
            var holeFill = "color-mix(in srgb, var(--fg, #f8fafc) 34%, transparent)";
            var totalLength = 0;
            for (var li = 0; li < letters.length; li += 1) {
              var letter = letters[li];
              for (var sj = 0; sj < letter.strokes.length; sj += 1) {
                var stroke = letter.strokes[sj];
                var d =
                  "M " +
                  stroke.points
                    .map(function (pt) {
                      return pt[0].toFixed(2) + " " + pt[1].toFixed(2);
                    })
                    .join(" L ");
                var path = el("path");
                path.setAttribute("d", d);
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", "var(--std-accent)");
                path.setAttribute("stroke-width", String(reg.width));
                path.setAttribute("stroke-linecap", "round");
                svg.appendChild(path);

                var L = path.getTotalLength();
                stroke.el = path;
                stroke.length = L;
                totalLength += L;

                // Double-dash reveal pattern: alternating dash/gap summing
                // EXACTLY to L (ending on a dash element so the appended L
                // sits at an odd index and reads as one closing gap).
                var pattern = [];
                var sum = 0;
                while (sum + reg.dash + reg.gap < L) {
                  pattern.push(reg.dash, reg.gap);
                  sum += reg.dash + reg.gap;
                }
                pattern.push(Math.max(0.5, L - sum));
                pattern.push(L);
                stroke.dasharray = pattern
                  .map(function (v) {
                    return v.toFixed(3);
                  })
                  .join(" ");
                path.setAttribute("stroke-dasharray", stroke.dasharray);
                path.setAttribute("stroke-dashoffset", L.toFixed(3));

                // Needle holes: one dot at each stitch boundary (dash start
                // and dash end), revealed as the front passes.
                stroke.holes = [];
                var period = reg.dash + reg.gap;
                for (var s = 0; s <= L; s += period) {
                  var boundaries = [s, Math.min(L, s + reg.dash)];
                  for (var b = 0; b < boundaries.length; b += 1) {
                    var pt = path.getPointAtLength(boundaries[b]);
                    var hole = el("circle");
                    hole.setAttribute("cx", pt.x.toFixed(2));
                    hole.setAttribute("cy", pt.y.toFixed(2));
                    hole.setAttribute("r", (reg.width * 0.42).toFixed(2));
                    hole.setAttribute("fill", holeFill);
                    hole.setAttribute("opacity", "0");
                    svg.appendChild(hole);
                    stroke.holes.push({ el: hole, at: boundaries[b] });
                  }
                }

                // End pose for the thread-tail overshoot.
                var endPt = path.getPointAtLength(L);
                var backPt = path.getPointAtLength(Math.max(0, L - 2));
                var tx = endPt.x - backPt.x;
                var ty = endPt.y - backPt.y;
                var tLen = Math.hypot(tx, ty) || 1;
                stroke.end = [endPt.x, endPt.y];
                stroke.tangent = [tx / tLen, ty / tLen];
              }
            }

            // Global needle dot + thread tail (letters draw strictly in
            // sequence, so one needle serves the whole word).
            var tail = el("line");
            tail.setAttribute("stroke", "var(--std-accent)");
            tail.setAttribute("stroke-width", (reg.width * 0.8).toFixed(2));
            tail.setAttribute("stroke-linecap", "round");
            tail.setAttribute("opacity", "0");
            svg.appendChild(tail);
            var needle = el("circle");
            needle.setAttribute("r", (reg.width * 1.15).toFixed(2));
            needle.setAttribute("fill", "var(--fg, #f8fafc)");
            needle.setAttribute("stroke", "color-mix(in srgb, var(--std-accent) 60%, transparent)");
            needle.setAttribute("stroke-width", (reg.width * 0.45).toFixed(2));
            needle.setAttribute("opacity", "0");
            svg.appendChild(needle);

            // Envelope: fixed IN/OUT, elastic HOLD, never time-scaled.
            var LEAD = 0.15;
            var DRAW_BASE = 2.9;
            var MARGIN = 0.15;
            var PAUSE_BASE = 0.05;
            var IN_BASE = LEAD + DRAW_BASE + MARGIN;
            var OUT_BASE = exit === "none" ? 0 : 0.45;
            var duration = 3.2;
            var totalBase = Math.max(0.001, IN_BASE + OUT_BASE);
            var scale = duration < totalBase ? duration / totalBase : 1;
            var lead = LEAD * scale;
            var DRAW = DRAW_BASE * scale;
            var pause = PAUSE_BASE * scale;
            var IN = IN_BASE * scale;
            var OUT = OUT_BASE * scale;
            var HOLD = Math.max(0, duration - (IN + OUT));
            var OUT_START = IN + HOLD;

            // Schedule: letters sequential, each letter's window sized by
            // its share of the total stitch length; strokes sequential
            // within the letter by the same rule.
            var pauses = Math.max(0, letters.length - 1) * pause;
            var drawable = Math.max(0.05, DRAW - pauses);
            var clock = lead;
            for (var lj = 0; lj < letters.length; lj += 1) {
              var lt = letters[lj];
              var letterLen = 0;
              for (var sk = 0; sk < lt.strokes.length; sk += 1) {
                letterLen += lt.strokes[sk].length;
              }
              var letterTime = totalLength > 0 ? (drawable * letterLen) / totalLength : 0;
              for (var sm = 0; sm < lt.strokes.length; sm += 1) {
                var st = lt.strokes[sm];
                var strokeTime = letterLen > 0 ? (letterTime * st.length) / letterLen : 0;
                st.t0 = clock;
                st.t1 = clock + Math.max(0.01, strokeTime);
                clock = st.t1;
              }
              lt.t0 = lt.strokes[0].t0;
              lt.t1 = clock;
              clock += pause;
            }

            function clamp01(v) {
              return v < 0 ? 0 : v > 1 ? 1 : v;
            }
            // backOut: overshoots ~10% past 1, then settles to exactly 1.
            // The overshoot region drives the thread-tail.
            function backOut(u) {
              var c1 = 1.70158;
              var c3 = c1 + 1;
              var x = u - 1;
              return 1 + c3 * x * x * x + c1 * x * x;
            }
            var TAIL_MAX = 16;

            // Pure per-update painter (zero per-element tweens): dashoffset
            // ATTRIBUTE, hole visibility, and the needle/tail pose are all
            // functions of tl.time() alone. Idempotent writes.
            function applyTime(timeSeconds) {
              var needleOn = false;
              var needleX = 0;
              var needleY = 0;
              var tailFrom = null;
              var tailTo = null;
              for (var i = 0; i < letters.length; i += 1) {
                var letter = letters[i];
                for (var j = 0; j < letter.strokes.length; j += 1) {
                  var stroke = letter.strokes[j];
                  var span = stroke.t1 - stroke.t0;
                  var u = clamp01(span > 0 ? (timeSeconds - stroke.t0) / span : 1);
                  var L = stroke.length;
                  var visible;
                  // Round linecaps paint a zero-length-dash dot at the exact
                  // boundary sitting at the path start when dashoffset = L,
                  // so undrawn strokes are also opacity-gated.
                  stroke.el.setAttribute("opacity", u <= 0 ? "0" : "1");
                  if (u <= 0) {
                    stroke.el.setAttribute("stroke-dashoffset", L.toFixed(3));
                    visible = 0;
                  } else if (u >= 1) {
                    stroke.el.setAttribute("stroke-dashoffset", "0");
                    visible = L;
                  } else {
                    var p = backOut(u);
                    var front = clamp01(p) * L;
                    stroke.el.setAttribute("stroke-dashoffset", (L - front).toFixed(3));
                    visible = front;
                    needleOn = true;
                    if (p <= 1) {
                      var pt = stroke.el.getPointAtLength(front);
                      needleX = pt.x;
                      needleY = pt.y;
                    } else {
                      // Thread-tail overshoot: the needle carries the
                      // thread past the stroke end along its exit tangent,
                      // then the settle pulls it snug.
                      var over = Math.min((p - 1) * L, TAIL_MAX);
                      needleX = stroke.end[0] + stroke.tangent[0] * over;
                      needleY = stroke.end[1] + stroke.tangent[1] * over;
                      tailFrom = stroke.end;
                      tailTo = [needleX, needleY];
                    }
                  }
                  for (var h = 0; h < stroke.holes.length; h += 1) {
                    stroke.holes[h].el.setAttribute(
                      "opacity",
                      stroke.holes[h].at <= visible && u > 0 ? "1" : "0",
                    );
                  }
                }
              }
              if (needleOn) {
                needle.setAttribute("opacity", "1");
                needle.setAttribute("cx", needleX.toFixed(2));
                needle.setAttribute("cy", needleY.toFixed(2));
              } else {
                needle.setAttribute("opacity", "0");
              }
              if (tailFrom) {
                tail.setAttribute("opacity", "0.9");
                tail.setAttribute("x1", tailFrom[0].toFixed(2));
                tail.setAttribute("y1", tailFrom[1].toFixed(2));
                tail.setAttribute("x2", tailTo[0].toFixed(2));
                tail.setAttribute("y2", tailTo[1].toFixed(2));
              } else {
                tail.setAttribute("opacity", "0");
              }
            }

            
 return applyTime;
}
window.ShortCreatorLetteringSource={penEase,stitch};
})();
