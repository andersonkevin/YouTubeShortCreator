/* Apache-2.0. Independent extraction from registry/blocks/vfx-shatter/vfx-shatter.html.
   Source SHA-256: 8e74692cd23813233ad826ee1ec2379c4f6ec91128b774e8df4b8bf23bff3dbf.
   Only DOM stubs and a callable wrapper are added; the source algorithm is retained.
   The existing third-party notices include the full source license. */
function sourceShards(aspect) {
  var W = aspect, H = 1, SHARD_COUNT = 200;
  var document = {
    getElementById: () => ({appendChild() {}}),
    createElement: () => ({style: {}}),
  };
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rng = mulberry32(42);

  // ── Generate confetti dots for Panel B ─────────────────────────────
  var confettiEl = document.getElementById("confetti-container");
  if (confettiEl) {
    var dotColors = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24"];
    for (var d = 0; d < 60; d++) {
      var dot = document.createElement("div");
      dot.className = "pb-dot";
      var sz = 4 + rng() * 12;
      dot.style.width = sz + "px";
      dot.style.height = sz + "px";
      dot.style.left = rng() * 100 + "%";
      dot.style.top = rng() * 100 + "%";
      dot.style.background = dotColors[Math.floor(rng() * dotColors.length)];
      dot.style.opacity = (0.06 + rng() * 0.12).toFixed(3);
      confettiEl.appendChild(dot);
    }
  }
  var aspect = W / H;

  // Generate seed points with weighted density toward center
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

  // For each seed, compute a convex polygon via intersection of half-planes
  // (simplified: sample angles around seed, find nearest boundary)
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

  var shardData = computeShardPolygons(seeds);
  return shardData;
}
