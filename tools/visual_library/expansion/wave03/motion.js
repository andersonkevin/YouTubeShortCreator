(() => {
  'use strict';
  // Wave 03 motion recipes. A recipe is a pure function of (items, t, ctx) that
  // returns the ECharts graphic groups to draw at time t. Every recipe is
  // deterministic (same t, same output), changes no data or text, adds no
  // color, and returns the untouched items once its duration has elapsed, so
  // the end state of every recipe is the static component.
  const clamp = v => Math.max(0, Math.min(1, v));
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const clone = items => items.map(el => structuredClone(el));
  const withOpacity = (el, factor) => { el.style = {...(el.style || {}), opacity: (el.style && el.style.opacity !== undefined ? el.style.opacity : 1) * factor}; return el; };
  const STROKES = new Set(['line', 'polyline', 'bezierCurve', 'arc']);
  // Approximate top edge of an element, used to order reveals by position.
  const topOf = el => {
    const s = el.shape || {}, st = el.style || {};
    if (s.points) return Math.min(...s.points.map(p => p[1]));
    if (s.cy !== undefined) return s.cy - (s.r || 0);
    if (s.y1 !== undefined) return Math.min(s.y1, s.y2);
    if (s.y !== undefined) return s.y;
    if (st.y !== undefined) return st.y;
    return 0;
  };
  const group = (children, extra = {}) => ({type: 'group', silent: true, children, ...extra});
  const done = items => [group(clone(items))];

  const recipes = {};
  const define = (name, label, duration, apply) => { recipes[name] = {name, label, duration, apply}; };

  define('clip', 'Left-to-right clip reveal', 1.6, (items, t, ctx) => {
    if (t >= 1.6) return done(items);
    const p = easeOut(clamp(t / 1.6));
    return [group(clone(items), {clipPath: {type: 'rect', shape: {x: 0, y: -ctx.offset, width: Math.max(1, ctx.W * p), height: ctx.H}}})];
  });

  define('wipe-down', 'Top-to-bottom wipe', 1.6, (items, t, ctx) => {
    if (t >= 1.6) return done(items);
    const p = easeOut(clamp(t / 1.6));
    return [group(clone(items), {clipPath: {type: 'rect', shape: {x: 0, y: -ctx.offset, width: ctx.W, height: Math.max(1, ctx.H * p)}}})];
  });

  define('rise', 'Elements rise in order', 2.0, (items, t) => {
    if (t >= 2.0) return done(items);
    const n = items.length, window = 0.8, span = 2.0 - window;
    return [group(clone(items).map((el, i) => {
      const p = easeOut(clamp((t - span * i / Math.max(1, n - 1)) / window));
      el.y = (el.y || 0) + (1 - p) * 24;
      return withOpacity(el, p);
    }))];
  });

  define('stagger', 'Fade in, one element after another', 2.0, (items, t) => {
    if (t >= 2.0) return done(items);
    const n = items.length, window = 0.5, span = 2.0 - window;
    return [group(clone(items).map((el, i) => withOpacity(el, clamp((t - span * i / Math.max(1, n - 1)) / window))))];
  });

  define('draw-on', 'Strokes draw first, then fills and text', 2.2, (items, t, ctx) => {
    if (t >= 2.2) return done(items);
    const copies = clone(items), strokes = [], rest = [];
    copies.forEach(el => (STROKES.has(el.type) || (el.type === 'polygon' && el.style && el.style.fill === 'none') ? strokes : rest).push(el));
    const ps = easeOut(clamp(t / 1.3)), pr = easeOut(clamp((t - 0.9) / 1.3));
    return [group(strokes, {clipPath: {type: 'rect', shape: {x: 0, y: -ctx.offset, width: Math.max(1, ctx.W * ps), height: ctx.H}}}),
      group(rest.map(el => withOpacity(el, pr)))];
  });

  define('scale-settle', 'Whole graphic settles from a slight zoom', 1.2, (items, t, ctx) => {
    if (t >= 1.2) return done(items);
    const p = easeOut(clamp(t / 1.2)), s = 0.94 + 0.06 * p;
    return [group(clone(items).map(el => withOpacity(el, p)), {scaleX: s, scaleY: s, originX: ctx.W / 2, originY: (items.height || ctx.DRAW) / 2})];
  });

  define('slide-in', 'Slides in from the left', 1.4, (items, t) => {
    if (t >= 1.4) return done(items);
    const p = easeOut(clamp(t / 1.4));
    return [group(clone(items).map(el => withOpacity(el, p)), {x: -48 * (1 - p)})];
  });

  define('bands', 'Reveals in four horizontal bands', 1.8, (items, t, ctx) => {
    if (t >= 1.8) return done(items);
    const height = items.height || ctx.DRAW, window = 0.6, span = 1.8 - window;
    return [group(clone(items).map(el => {
      const band = Math.min(3, Math.floor(clamp(topOf(el) / Math.max(1, height)) * 4));
      return withOpacity(el, easeOut(clamp((t - span * band / 3) / window)));
    }))];
  });

  define('focus', 'Everything appears, then the rest dims to its final opacity', 2.4, (items, t) => {
    if (t >= 2.4) return done(items);
    const pin = easeOut(clamp(t / 0.8)), pdim = easeOut(clamp((t - 1.2) / 1.2));
    return [group(clone(items).map(el => {
      const final = el.style && el.style.opacity !== undefined ? el.style.opacity : 1;
      el.style = {...(el.style || {}), opacity: pin * (1 - pdim * (1 - final))};
      return el;
    }))];
  });

  define('accent-pulse', 'Fast clip reveal, then the accent elements pulse once', 2.4, (items, t, ctx) => {
    if (t >= 2.4) return done(items);
    if (t < 1.0) {
      const p = easeOut(clamp(t / 1.0));
      return [group(clone(items), {clipPath: {type: 'rect', shape: {x: 0, y: -ctx.offset, width: Math.max(1, ctx.W * p), height: ctx.H}}})];
    }
    const phase = clamp((t - 1.0) / 1.4), dip = 0.35 * Math.sin(Math.PI * phase);
    return [group(clone(items).map(el => {
      const st = el.style || {}, hit = st.fill === ctx.T.accent || st.stroke === ctx.T.accent;
      return hit ? withOpacity(el, 1 - dip) : el;
    }))];
  });

  window.VisualMotion = {version: 1, wave: 3, recipes, names: Object.keys(recipes)};
})();
