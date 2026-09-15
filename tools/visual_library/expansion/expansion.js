(() => {
  'use strict';
  // Expansion renderer. Draws design_review components with the pinned ECharts
  // graphic API into the 824x820 production visual slot. Same deterministic
  // renderAt(seconds) contract as the library study: a clip reveal, never
  // interpolated data. Colors and fonts come from brand tokens, not a brand.
  const {components, icons, recipes, tokens, palette: initialPalette} = window.visualLibraryData;
  const $ = id => document.getElementById(id);
  const W = 824, H = 820, RESERVE = 74, DRAW = H - RESERVE;
  let palette = initialPalette;
  let T = tokens.palettes[palette];
  const chart = echarts.init($('chart'), null, {renderer: 'svg', width: W, height: H});
  let index = 0, seconds = 4, playing = false, last = 0;
  const text = (id, value) => { $(id).textContent = value; };

  // ---- primitives --------------------------------------------------------
  // Text that does not fit renders an ellipsis; browser QA fails on any "…", so
  // overflow is a validation error, never silently hidden content.
  const txt = (x, y, value, o = {}) => ({type: 'text', silent: true, style: {
    x, y, text: value, font: `${o.weight || 'normal'} ${o.size || 28}px ${o.mono ? T.mono : T.font}`,
    fill: o.color || T.ink, align: o.align || 'center', verticalAlign: o.vAlign || 'middle', opacity: o.opacity ?? 1,
    width: o.width, overflow: o.width ? (o.wrap ? 'break' : 'truncate') : undefined, ellipsis: '…',
    lineHeight: o.wrap ? Math.max(o.lineHeight || 0, Math.round((o.size || 28) * 1.3)) : o.lineHeight}});
  const box = (x, y, w, h, o = {}) => ({type: 'rect', silent: true, shape: {x, y, width: w, height: h, r: o.r ?? 8},
    style: {fill: o.fill || T.surface, stroke: o.stroke || T.line, lineWidth: o.lineWidth ?? 2, lineDash: o.dash, opacity: o.opacity ?? 1}});
  const line = (x1, y1, x2, y2, o = {}) => ({type: 'line', silent: true, shape: {x1, y1, x2, y2},
    style: {stroke: o.stroke || T.accent2, lineWidth: o.lineWidth || 3, lineDash: o.dash, opacity: o.opacity ?? 1}});
  const head = (x, y, angle, o = {}) => {
    const s = o.size || 11, p = (dx, dy) => [x + dx * Math.cos(angle) - dy * Math.sin(angle), y + dx * Math.sin(angle) + dy * Math.cos(angle)];
    return {type: 'polygon', silent: true, shape: {points: [p(0, 0), p(-s * 1.6, -s * 0.8), p(-s * 1.6, s * 0.8)]}, style: {fill: o.fill || o.stroke || T.accent2, opacity: o.opacity ?? 1}};
  };
  const arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return [line(x1, y1, x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8, o), head(x2, y2, a, o)];
  };
  const curve = (x1, y1, cx, cy, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - cy, x2 - cx);
    return [{type: 'bezierCurve', silent: true, shape: {x1, y1, cpx1: cx, cpy1: cy, x2: x2 - Math.cos(a) * 8, y2: y2 - Math.sin(a) * 8}, style: {stroke: o.stroke || T.accent2, lineWidth: o.lineWidth || 3, fill: 'none', opacity: o.opacity ?? 1}}, head(x2, y2, a, o)];
  };
  const dot = (cx, cy, name, color, r = 27, opacity = 1) => [
    {type: 'circle', silent: true, shape: {cx, cy, r}, style: {fill: color, opacity}},
    {type: 'image', silent: true, style: {image: icons[name], x: cx - r * 0.66, y: cy - r * 0.66, width: r * 1.32, height: r * 1.32, opacity}}];
  const glyph = (x, y, name, size = 30, opacity = 1) => ({type: 'image', silent: true, style: {image: icons[name], x, y, width: size, height: size, opacity}, z: 3});
  const chip = (x, y, value, color, o = {}) => {
    const w = o.width || (value.length * 13 + 28);
    const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    return [box(left, y - 18, w, 36, {fill: color, stroke: 'transparent', r: 18, opacity: o.opacity ?? 1}),
      txt(left + w / 2, y, value, {size: 20, weight: 'bold', color: T.background, opacity: o.opacity ?? 1})];
  };
  const fmt = v => Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
  const provenance = c => {
    const kind = c.source.kind === 'illustrative' ? 'ILLUSTRATIVE' : 'SOURCE REVIEW REQUIRED';
    return [line(0, DRAW + 12, W, DRAW + 12, {stroke: T.line, lineWidth: 1}),
      txt(0, DRAW + 12, `${kind} · ${c.source.label} · ${c.source.as_of}`, {size: 21, color: T.muted, align: 'left', vAlign: 'top', width: W, wrap: true, lineHeight: 27})];
  };
  const stateOf = (c, key) => (c.state && c.state[key] !== undefined) ? c.state[key] : null;
  const fade = (active, i) => (active === null || active === i ? 1 : 0.6);

  // ---- components: each returns graphics plus .height for vertical centering
  const draw = {};

  draw['agent-loop'] = c => {
    const g = [], steps = c.data.steps, n = steps.length, active = stateOf(c, 'active_step');
    const bw = 330, bh = 90;
    if (c.variant === 'ring') {
      // Corner cycle: clockwise around the slot with the exit condition in the middle.
      const top = 0, bottom = 560, cy = (top + bottom) / 2 + bh / 2;
      const spots = n === 3 ? [[W / 2, top + bh / 2], [W - bw / 2, bottom + bh / 2], [bw / 2, bottom + bh / 2]]
        : [[bw / 2, top + bh / 2], [W - bw / 2, top + bh / 2], [W - bw / 2, bottom + bh / 2], [bw / 2, bottom + bh / 2]];
      const edge = (from, to) => {
        const [x1, y1] = from, [x2, y2] = to, horizontal = Math.abs(y2 - y1) < 1, vertical = Math.abs(x2 - x1) < 1;
        if (horizontal) return [[x1 + Math.sign(x2 - x1) * (bw / 2 + 6), y1], [x2 - Math.sign(x2 - x1) * (bw / 2 + 8), y2]];
        if (vertical) return [[x1, y1 + Math.sign(y2 - y1) * (bh / 2 + 6)], [x2, y2 - Math.sign(y2 - y1) * (bh / 2 + 8)]];
        const a = Math.atan2(y2 - y1, x2 - x1), d = Math.min(Math.abs((bw / 2 + 10) / Math.cos(a)), Math.abs((bh / 2 + 10) / Math.sin(a)));
        return [[x1 + d * Math.cos(a), y1 + d * Math.sin(a)], [x2 - d * Math.cos(a), y2 - d * Math.sin(a)]];
      };
      spots.forEach((p, i) => { const [s0, e0] = edge(p, spots[(i + 1) % n]); g.push(...arrow(s0[0], s0[1], e0[0], e0[1], {opacity: 0.9})); });
      spots.forEach(([x, y], i) => {
        const on = active === i, o = fade(active, i);
        g.push(box(x - bw / 2, y - bh / 2, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(x - bw / 2 + 44, y, steps[i].icon, on ? T.accent : T.accent2, 25, o));
        g.push(txt(x - bw / 2 + 84, y, steps[i].label, {size: 25, weight: 'bold', align: 'left', width: bw - 96, color: on ? T.accent : T.ink, opacity: o}));
      });
      const cx = W / 2;
      g.push(box(cx - 190, cy - 56, 380, 112, {dash: [10, 8], stroke: T.accent, fill: T.background}));
      g.push(glyph(cx - 170, cy - 18, c.data.exit.icon, 36));
      g.push(txt(cx - 122, cy - 16, 'EXIT', {size: 22, weight: 'bold', color: T.accent, align: 'left'}));
      g.push(txt(cx - 122, cy + 20, c.data.exit.label, {size: 24, align: 'left', width: 300}));
      g.height = bottom + bh;
    } else {
      const x0 = 120, step = Math.min(150, (DRAW - bh - 20) / Math.max(1, n - 1));
      const ys = steps.map((_, i) => bh / 2 + 10 + i * step);
      ys.forEach((y, i) => {
        const on = active === i, o = fade(active, i);
        g.push(box(x0, y - bh / 2, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(x0 + 44, y, steps[i].icon, on ? T.accent : T.accent2, 25, o));
        g.push(txt(x0 + 84, y, steps[i].label, {size: 25, weight: 'bold', align: 'left', width: bw - 96, color: on ? T.accent : T.ink, opacity: o}));
        if (i < n - 1) g.push(...arrow(x0 + bw / 2, y + bh / 2 + 4, x0 + bw / 2, ys[i + 1] - bh / 2 - 6));
      });
      const top = ys[0], bottom = ys[n - 1], lx = x0 - 50;
      g.push(line(x0, bottom, lx, bottom, {stroke: T.accent}), line(lx, bottom, lx, top, {stroke: T.accent}), ...arrow(lx, top, x0 - 4, top, {stroke: T.accent}));
      g.push(txt(lx - 14, (top + bottom) / 2, 'LOOP', {size: 20, weight: 'bold', color: T.accent, align: 'right'}));
      const ex = x0 + bw + 30;
      g.push(box(ex, bottom - 56, W - ex, 112, {dash: [10, 8], stroke: T.accent, fill: T.background}));
      g.push(glyph(ex + 18, bottom - 18, c.data.exit.icon, 36));
      g.push(txt(ex + 66, bottom - 16, 'EXIT', {size: 22, weight: 'bold', color: T.accent, align: 'left'}));
      g.push(txt(ex + 66, bottom + 20, c.data.exit.label, {size: 24, align: 'left', width: W - ex - 80, wrap: true, lineHeight: 28}));
      g.height = bottom + bh / 2 + 10;
    }
    return g;
  };

  draw['retrieval'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_chunk'), scored = c.variant === 'scored';
    g.push(box(0, 0, W, 90, {stroke: T.accent2}), glyph(24, 27, 'search', 36), txt(80, 30, 'QUERY', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}));
    g.push(txt(80, 62, d.query, {size: 28, align: 'left', width: W - 100}));
    let y = 124;
    const rowH = 94, gap = 12;
    d.chunks.forEach((chunk, i) => {
      const rank = c.derived.ranked.indexOf(i) + 1, on = active === i, o = fade(active, i);
      g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push({type: 'circle', silent: true, shape: {cx: 46, cy: y + rowH / 2, r: 24}, style: {fill: on ? T.accent : T.line, opacity: o}});
      g.push(txt(46, y + rowH / 2, `${rank}`, {size: 26, weight: 'bold', color: on ? T.background : T.ink, opacity: o}));
      g.push(txt(92, y + (scored ? 34 : rowH / 2), chunk.label, {size: 28, align: 'left', width: scored ? W - 260 : W - 120, opacity: o}));
      if (scored) {
        const bx = 92, bw = W - 92 - 150, fill = Math.max(4, bw * chunk.score);
        g.push(box(bx, y + 58, bw, 12, {fill: T.line, stroke: 'transparent', r: 6, opacity: o}), box(bx, y + 58, fill, 12, {fill: on ? T.accent : T.accent2, stroke: 'transparent', r: 6, opacity: o}));
        g.push(txt(W - 24, y + rowH / 2, chunk.score.toFixed(2), {size: 28, mono: true, align: 'right', color: T.muted, opacity: o}));
      }
      y += rowH + gap;
    });
    y += 8;
    g.push(...arrow(W / 2, y - 6, W / 2, y + 26));
    g.push(box(0, y + 36, W, 90, {stroke: T.accent}), glyph(24, y + 63, 'file-text', 36), txt(80, y + 66, 'ANSWER', {size: 20, weight: 'bold', color: T.accent, align: 'left'}));
    g.push(txt(80, y + 98, d.answer, {size: 28, align: 'left', width: W - 100}));
    g.height = y + 126;
    return g;
  };

  draw['gate'] = c => {
    const g = [], d = c.data, outcome = stateOf(c, 'outcome');
    const o = which => (outcome === null || outcome === which ? 1 : 0.4);
    if (c.variant === 'vertical') {
      g.push(box(W / 2 - 250, 0, 500, 84, {stroke: T.accent2}), txt(W / 2, 42, d.input, {size: 28, mono: true, width: 470}));
      g.push(...arrow(W / 2, 90, W / 2, 138));
      g.push(box(W / 2 - 230, 146, 460, 104, {stroke: T.ink, lineWidth: 3}), ...dot(W / 2 - 176, 198, d.check.icon, T.accent2, 27));
      g.push(txt(W / 2 - 132, 198, d.check.label, {size: 30, weight: 'bold', align: 'left', width: 340}));
      const branches = [[d.pass, 'pass', T.accent, 190, 'YES'], [d.fail, 'fail', T.warn, W - 190, 'NO']];
      g.push(line(W / 2, 250, W / 2, 300, {stroke: T.line, lineWidth: 3}), line(190, 300, W - 190, 300, {stroke: T.line, lineWidth: 3}));
      branches.forEach(([b, key, color, x, word]) => {
        const op = o(key);
        g.push(...arrow(x, 300, x, 384, {stroke: color, opacity: op}));
        g.push(txt(x + (key === 'pass' ? -36 : 36), 342, word, {size: 22, weight: 'bold', color, align: key === 'pass' ? 'right' : 'left'}));
        g.push(box(x - 170, 392, 340, 176, {stroke: color, lineWidth: outcome === key ? 4 : 2, opacity: op}));
        g.push(...dot(x, 444, b.icon, color, 28, op));
        g.push(txt(x, 502, b.label, {size: 30, weight: 'bold', color, opacity: op}), txt(x, 542, b.hint, {size: 24, color: T.muted, width: 320, opacity: op}));
      });
      g.height = 568;
      if (outcome) { g.push(txt(W / 2, 640, outcome === 'pass' ? 'This run: allowed' : 'This run: held for review', {size: 26, color: outcome === 'pass' ? T.accent : T.warn})); g.height = 660; }
    } else {
      const y = 300;
      // Mono identifiers up to 17 characters stay on one line; longer inputs wrap at word boundaries.
      g.push(box(0, y - 50, 244, 100, {stroke: T.accent2}), txt(122, y, d.input, {size: 22, mono: true, width: 228, wrap: true, lineHeight: 27}));
      g.push(...arrow(248, y, 282, y));
      g.push(box(286, y - 64, 208, 128, {stroke: T.ink, lineWidth: 3}), glyph(300, y - 48, d.check.icon, 32), txt(300, y + 6, d.check.label, {size: 23, weight: 'bold', align: 'left', vAlign: 'top', width: 182, wrap: true, lineHeight: 28}));
      const branches = [[d.pass, 'pass', T.accent, 60, 'YES'], [d.fail, 'fail', T.warn, 400, 'NO']];
      g.push(line(494, y, 526, y, {stroke: T.line}), line(526, 60 + 80, 526, 400 + 80, {stroke: T.line}));
      branches.forEach(([b, key, color, by, word]) => {
        const op = o(key);
        g.push(...arrow(526, by + 80, 556, by + 80, {stroke: color, opacity: op}));
        g.push(txt(516, by + 80, word, {size: 20, weight: 'bold', color, align: 'right'}));
        g.push(box(560, by, W - 560, 160, {stroke: color, lineWidth: outcome === key ? 4 : 2, opacity: op}), ...dot(600, by + 40, b.icon, color, 22, op), txt(634, by + 40, b.label, {size: 24, weight: 'bold', color, align: 'left', width: W - 650, opacity: op}));
        g.push(txt(578, by + 82, b.hint, {size: 21, color: T.muted, align: 'left', vAlign: 'top', width: W - 596, wrap: true, lineHeight: 25, opacity: op}));
      });
      g.height = 520;
    }
    return g;
  };

  draw['retry-queue'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_attempt'), n = d.attempts.length;
    g.push(box(0, 0, W, 84, {stroke: T.accent2}), glyph(24, 24, 'layers', 36), txt(80, 26, 'JOB', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}), txt(80, 58, d.job, {size: 28, align: 'left', width: W - 100}));
    const rowH = n >= 5 ? 72 : 84, gap = n >= 5 ? 8 : 12, extra = n >= 5 ? 10 : 16;
    let y = 84 + 28;
    const outcomes = {ok: ['circle-check', T.accent, 'OK'], fail: ['x', T.warn, 'FAILED'], pending: ['clock', T.muted, 'WAITING']};
    d.attempts.forEach((a, i) => {
      const on = active === i, o = fade(active, i), [ic, color, word] = outcomes[a.outcome];
      g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push(txt(28, y + rowH / 2, a.label, {size: 27, weight: 'bold', align: 'left', width: 250, opacity: o}));
      g.push(...chip(300, y + rowH / 2, 'wait ' + a.wait, T.line, {opacity: o}).map((e, k) => k ? {...e, style: {...e.style, fill: T.ink}} : e));
      g.push(...dot(W - 200, y + rowH / 2, ic, color, 22, o), txt(W - 164, y + rowH / 2, word, {size: 24, weight: 'bold', color, align: 'left', opacity: o}));
      if (i < n - 1) g.push(...arrow(W / 2, y + rowH + 2, W / 2, y + rowH + gap + extra - 2, {stroke: T.line, lineWidth: 2}));
      y += rowH + gap + (i < n - 1 ? extra : 0);
    });
    const exhausted = d.attempts.every(a => a.outcome === 'fail');
    y += 24;
    g.push(...arrow(W / 2, y - 22, W / 2, y + 10, {stroke: exhausted ? T.warn : T.line, lineWidth: 2, dash: [6, 6]}));
    g.push(box(0, y + 16, W, 84, {stroke: T.warn, dash: [10, 8], fill: T.background, opacity: exhausted ? 1 : 0.55}), glyph(24, y + 40, 'triangle-alert', 36, exhausted ? 1 : 0.55));
    g.push(txt(80, y + 42, 'DEAD LETTER', {size: 20, weight: 'bold', color: T.warn, align: 'left', opacity: exhausted ? 1 : 0.55}), txt(80, y + 74, d.dead_letter, {size: 26, align: 'left', width: W - 100, opacity: exhausted ? 1 : 0.55}));
    g.height = y + 100;
    return g;
  };

  draw['tiers'] = c => {
    const g = [], d = c.data, hit = stateOf(c, 'hit'), n = d.layers.length;
    if (c.variant === 'stack') {
      g.push(box(0, 0, W, 80, {stroke: T.accent2}), glyph(24, 22, 'file-json', 36), txt(80, 24, 'REQUEST', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}), txt(80, 56, d.request, {size: 28, align: 'left', width: W - 100}));
      const rowH = 112, gap = 28;
      let y = 80 + 36;
      d.layers.forEach((layer, i) => {
        const on = hit === i, missed = hit !== null && i < hit, after = hit !== null && i > hit, o = after ? 0.35 : 1;
        g.push(...arrow(W / 2, y - gap + 2, W / 2, y - 6, {stroke: after ? T.line : T.accent2, lineWidth: 3, opacity: after ? 0.5 : 1}));
        g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(56, y + rowH / 2, layer.icon, on ? T.accent : T.accent2, 28, o));
        g.push(txt(108, y + 36, layer.label, {size: 28, weight: 'bold', align: 'left', width: 420, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(108, y + 76, layer.hint, {size: 23, color: T.muted, align: 'left', width: 420, opacity: o}));
        if (on) g.push(...chip(W - 24, y + rowH / 2, 'HIT', T.accent, {align: 'right', width: 90}));
        else if (missed) g.push(...chip(W - 24, y + rowH / 2, 'MISS', T.line, {align: 'right', width: 100}).map((e, k) => k ? {...e, style: {...e.style, fill: T.ink}} : e));
        y += rowH + gap;
      });
      g.height = y - gap;
    } else {
      const bw = (W - (n - 1) * 46) / n, y = 200, bh = 260;
      g.push(txt(0, 40, 'REQUEST', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}), txt(0, 76, d.request, {size: 28, align: 'left', width: W}));
      d.layers.forEach((layer, i) => {
        const x = i * (bw + 46), on = hit === i, after = hit !== null && i > hit, o = after ? 0.35 : 1;
        g.push(box(x, y, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(x + bw / 2, y + 58, layer.icon, on ? T.accent : T.accent2, 28, o));
        g.push(txt(x + bw / 2, y + 124, layer.label, {size: 25, weight: 'bold', width: bw - 24, wrap: true, lineHeight: 29, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(x + bw / 2, y + 200, layer.hint, {size: 22, color: T.muted, width: bw - 24, wrap: true, lineHeight: 26, opacity: o}));
        if (i < n - 1) g.push(...arrow(x + bw + 6, y + bh / 2, x + bw + 40, y + bh / 2, {stroke: after || (hit !== null && i >= hit) ? T.line : T.accent2}));
      });
      g.height = y + bh;
    }
    return g;
  };

  draw['router'] = c => {
    const g = [], d = c.data, selected = stateOf(c, 'selected'), n = d.routes.length;
    if (c.variant === 'fan') {
      const cy = 340, bw = 380, bh = 108, gap = Math.min(40, (DRAW - 40 - n * bh) / Math.max(1, n - 1));
      const top = cy - (n * bh + (n - 1) * gap) / 2;
      g.push(box(0, cy - 60, 290, 120, {stroke: T.accent2}), glyph(20, cy - 42, 'file-json', 32), txt(60, cy - 26, 'INPUT', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}));
      g.push(txt(20, cy + 14, d.input, {size: 25, align: 'left', width: 254, wrap: true, lineHeight: 29}));
      g.push(txt(0, cy + 96, 'RULE', {size: 20, weight: 'bold', color: T.muted, align: 'left'}), txt(0, cy + 118, d.rule, {size: 22, color: T.muted, align: 'left', vAlign: 'top', width: 290, wrap: true, lineHeight: 26}));
      d.routes.forEach((r, i) => {
        const y = top + i * (bh + gap), on = selected === i, o = fade(selected, i), x = W - bw;
        g.push(...curve(292, cy, 368, y + bh / 2, x - 4, y + bh / 2, {stroke: on ? T.accent : T.line, lineWidth: on ? 4 : 2, opacity: o}));
        g.push(box(x, y, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(x + 44, y + bh / 2, r.icon, on ? T.accent : T.accent2, 26, o));
        g.push(txt(x + 84, y + 38, r.label, {size: 27, weight: 'bold', align: 'left', width: bw - 100, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(x + 84, y + 74, r.hint, {size: 22, color: T.muted, align: 'left', width: bw - 100, opacity: o}));
      });
      g.height = Math.max(cy + 150, top + n * (bh + gap));
    } else {
      g.push(box(0, 0, W, 84, {stroke: T.accent2}), glyph(24, 24, 'file-json', 36), txt(80, 26, 'INPUT', {size: 20, weight: 'bold', color: T.accent2, align: 'left'}), txt(80, 58, d.input, {size: 28, align: 'left', width: W - 100}));
      g.push(txt(0, 122, 'RULE · ' + d.rule, {size: 22, color: T.muted, align: 'left', width: W}));
      const rowH = 100, gap = 14;
      let y = 156;
      d.routes.forEach((r, i) => {
        const on = selected === i, o = fade(selected, i);
        g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(...dot(48, y + rowH / 2, r.icon, on ? T.accent : T.accent2, 26, o));
        g.push(txt(92, y + 36, r.label, {size: 27, weight: 'bold', align: 'left', width: 460, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(92, y + 70, r.hint, {size: 22, color: T.muted, align: 'left', width: 460, opacity: o}));
        if (on) g.push(...chip(W - 24, y + rowH / 2, 'SELECTED', T.accent, {align: 'right', width: 150}));
        y += rowH + gap;
      });
      g.height = y - gap;
    }
    return g;
  };

  draw['contract'] = c => {
    const g = [], d = c.data, highlight = stateOf(c, 'highlight'), request = c.variant === 'request';
    g.push(box(0, 0, W, 72, {stroke: request ? T.accent2 : T.accent, fill: T.surface}), txt(24, 36, d.name, {size: 27, mono: true, align: 'left', width: 520}));
    g.push(...chip(W - 24, 36, request ? 'REQUEST' : 'RESPONSE', request ? T.accent2 : T.accent, {align: 'right', width: 150}));
    const rowH = 88;
    let y = 84;
    d.fields.forEach((f, i) => {
      const on = highlight === i, o = fade(highlight, i);
      g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push(txt(24, y + 32, f.name, {size: 27, mono: true, color: T.accent2, align: 'left', width: 300, opacity: o}));
      g.push(txt(24, y + 64, f.type, {size: 22, mono: true, color: T.muted, align: 'left', width: 300, opacity: o}));
      g.push(...(f.required ? chip(340, y + rowH / 2, 'REQUIRED', T.accent, {width: 132, opacity: o}) : chip(340, y + rowH / 2, 'OPTIONAL', T.line, {width: 132, opacity: o}).map((e, k) => k ? {...e, style: {...e.style, fill: T.ink}} : e)));
      g.push(txt(W - 24, y + rowH / 2, f.note, {size: 23, color: T.muted, align: 'right', width: 320, opacity: o}));
      y += rowH + 10;
    });
    g.height = y - 10;
    return g;
  };

  draw['stages'] = c => {
    const g = [], d = c.data, current = stateOf(c, 'current'), n = d.stages.length;
    if (c.variant === 'rail') {
      const y = 160, x0 = 90, x1 = W - 90, step = (x1 - x0) / (n - 1), labelW = Math.min(220, step - 10);
      d.stages.forEach((s, i) => {
        const x = x0 + i * step, done = current !== null && i < current, now = current === i;
        if (i < n - 1) g.push(line(x + 30, y, x + step - 30, y, {stroke: done ? T.accent : T.line, lineWidth: 4}));
        g.push({type: 'circle', silent: true, shape: {cx: x, cy: y, r: 28}, style: {fill: done || now ? T.accent : T.surface, stroke: now ? T.accent : T.line, lineWidth: now ? 6 : 3}});
        if (done) g.push(glyph(x - 15, y - 15, 'check', 30));
        else g.push(txt(x, y, String(i + 1), {size: 24, weight: 'bold', color: now ? T.background : T.muted}));
        if (now) g.push(...chip(x, y - 76, 'NOW', T.accent, {width: 78, align: 'center'}));
        g.push(txt(x, y + 66, s.label, {size: 26, weight: 'bold', width: labelW, color: now ? T.accent : T.ink}));
        g.push(txt(x, y + 118, s.gate, {size: 22, color: T.muted, width: labelW, wrap: true, lineHeight: 26}));
      });
      const legendY = 330;
      [[T.accent, 'done'], [T.accent, 'current (ring)'], [T.surface, 'pending']].forEach(([fill, label], i) => {
        const lx = 40 + i * 270;
        g.push({type: 'circle', silent: true, shape: {cx: lx, cy: legendY, r: 12}, style: {fill, stroke: i === 2 ? T.line : T.accent, lineWidth: i === 1 ? 4 : 2}});
        g.push(txt(lx + 24, legendY, label, {size: 22, color: T.muted, align: 'left'}));
      });
      g.height = 350;
    } else {
      const rowH = 96, gap = 18;
      let y = 0;
      d.stages.forEach((s, i) => {
        const done = current !== null && i < current, now = current === i, o = current !== null && i > current ? 0.45 : 1;
        g.push(box(0, y, W, rowH, {stroke: now ? T.accent : T.line, lineWidth: now ? 3 : 2, opacity: o}));
        g.push({type: 'circle', silent: true, shape: {cx: 48, cy: y + rowH / 2, r: 24}, style: {fill: done || now ? T.accent : T.surface, stroke: now ? T.accent : T.line, lineWidth: 3, opacity: o}});
        if (done) g.push(glyph(48 - 13, y + rowH / 2 - 13, 'check', 26)); else g.push(txt(48, y + rowH / 2, String(i + 1), {size: 22, weight: 'bold', color: now ? T.background : T.muted, opacity: o}));
        g.push(txt(96, y + rowH / 2, s.label, {size: 28, weight: 'bold', align: 'left', width: 250, color: now ? T.accent : T.ink, opacity: o}));
        g.push(txt(W - 24, y + rowH / 2, s.gate, {size: 23, color: T.muted, align: 'right', width: 440, opacity: o}));
        if (i < n - 1) g.push(line(48, y + rowH + 2, 48, y + rowH + gap - 2, {stroke: done ? T.accent : T.line, lineWidth: 4}));
        y += rowH + gap;
      });
      g.height = y - gap;
    }
    return g;
  };

  draw['stack'] = c => {
    const g = [], d = c.data, highlight = stateOf(c, 'highlight'), n = d.layers.length;
    if (c.variant === 'bands') {
      const rowH = Math.min(110, (DRAW - (n - 1) * 12) / n), gap = 12;
      d.layers.forEach((layer, i) => {
        const y = i * (rowH + gap), on = highlight === i, o = fade(highlight, i);
        g.push(box(0, y, W, rowH, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(txt(28, y + rowH / 2, layer.label, {size: 28, weight: 'bold', align: 'left', width: 360, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(W - 28, y + rowH / 2, layer.hint, {size: 23, mono: true, color: T.muted, align: 'right', width: 400, opacity: o}));
      });
      g.height = n * (rowH + gap) - gap;
    } else {
      const cols = 2, rows = Math.ceil(n / cols), bw = (W - 24) / cols, bh = Math.min(200, (DRAW - (rows - 1) * 24) / rows);
      d.layers.forEach((layer, i) => {
        const x = (i % cols) * (bw + 24), y = Math.floor(i / cols) * (bh + 24), on = highlight === i, o = fade(highlight, i);
        g.push(box(x, y, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
        g.push(txt(x + 24, y + 44, layer.label, {size: 28, weight: 'bold', align: 'left', width: bw - 48, color: on ? T.accent : T.ink, opacity: o}));
        g.push(txt(x + 24, y + 96, layer.hint, {size: 23, mono: true, color: T.muted, align: 'left', width: bw - 48, wrap: true, lineHeight: 27, opacity: o}));
      });
      g.height = rows * (bh + 24) - 24;
    }
    return g;
  };

  draw['annotated-code'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_line'), n = d.lines.length, inline = c.variant === 'inline';
    const rowH = inline ? 94 : 66, notes = d.lines.map((l, i) => [i, l.note.trim()]).filter(([, note]) => note);
    const panelH = 64 + 16 + n * rowH;
    g.push(box(0, 0, W, panelH, {fill: T.background, stroke: T.line}), box(0, 0, W, 64, {stroke: T.line, r: 8}));
    g.push(txt(24, 32, d.file, {size: 24, mono: true, align: 'left', width: W - 220}), txt(W - 24, 32, 'ILLUSTRATIVE', {size: 20, mono: true, color: T.accent2, align: 'right'}));
    d.lines.forEach((l, i) => {
      const y = 72 + i * rowH, on = active === i, note = notes.findIndex(([k]) => k === i);
      if (on) g.push(box(3, y, W - 6, rowH, {fill: T.surface, stroke: T.accent, lineWidth: 2, r: 4}));
      g.push(txt(24, y + (inline ? 30 : rowH / 2), String(i + 1).padStart(2, '0'), {size: 22, mono: true, color: T.muted, align: 'left'}));
      g.push(txt(72, y + (inline ? 30 : rowH / 2), l.code, {size: 26, mono: true, align: 'left', width: W - 96 - (inline ? 0 : 56)}));
      if (note >= 0) {
        if (inline) g.push(txt(72, y + 66, '▸ ' + l.note, {size: 22, color: T.accent, align: 'left', width: W - 96}));
        else g.push({type: 'circle', silent: true, shape: {cx: W - 34, cy: y + rowH / 2, r: 16}, style: {fill: T.accent}}, txt(W - 34, y + rowH / 2, String(note + 1), {size: 20, weight: 'bold', color: T.background}));
      }
    });
    let ny = panelH + 34;
    if (!inline) notes.forEach(([, note], k) => {
      g.push({type: 'circle', silent: true, shape: {cx: 16, cy: ny, r: 14}, style: {fill: T.accent}}, txt(16, ny, String(k + 1), {size: 20, weight: 'bold', color: T.background}));
      g.push(txt(44, ny, note, {size: 24, align: 'left', width: W - 44}));
      ny += 42;
    });
    g.height = inline ? panelH : (notes.length ? ny - 8 : panelH);
    return g;
  };

  draw['budget'] = c => {
    const g = [], d = c.data, used = c.derived.used, headroom = c.derived.headroom;
    const series = [T.accent, T.accent2, T.extra, T.warn];
    if (c.variant === 'bar') {
      g.push(txt(0, 30, 'CAPACITY', {size: 20, weight: 'bold', color: T.muted, align: 'left'}), txt(0, 76, `${fmt(d.capacity)} ${d.unit}`, {size: 44, weight: 'bold', align: 'left', mono: true}));
      g.push(txt(W, 30, 'HEADROOM', {size: 20, weight: 'bold', color: T.muted, align: 'right'}), txt(W, 76, `${fmt(headroom)} ${d.unit}`, {size: 44, weight: 'bold', align: 'right', mono: true, color: headroom / d.capacity < 0.1 ? T.warn : T.accent}));
      const y = 140, h = 64;
      g.push(box(0, y, W, h, {fill: T.surface, stroke: T.line, r: 10}));
      let x = 0;
      d.parts.forEach((p, i) => { const w = W * p.value / d.capacity; if (w > 0) g.push(box(x, y, Math.max(w - 3, 1), h, {fill: series[i % 4], stroke: 'transparent', r: 4})); x += w; });
      g.push(txt(0, y + h + 30, '0', {size: 22, mono: true, color: T.muted, align: 'left'}), txt(W, y + h + 30, fmt(d.capacity), {size: 22, mono: true, color: T.muted, align: 'right'}));
      let ly = y + h + 76;
      d.parts.forEach((p, i) => {
        g.push(box(0, ly - 14, 28, 28, {fill: series[i % 4], stroke: 'transparent', r: 6}), txt(44, ly, p.label, {size: 26, align: 'left', width: 400}), txt(W, ly, `${fmt(p.value)} ${d.unit}`, {size: 26, mono: true, align: 'right', color: T.muted}));
        ly += 56;
      });
      g.push(line(0, ly - 14, W, ly - 14, {stroke: T.line, lineWidth: 1}), txt(44, ly + 18, 'Used', {size: 26, weight: 'bold', align: 'left'}), txt(W, ly + 18, `${fmt(used)} of ${fmt(d.capacity)} ${d.unit}`, {size: 26, mono: true, align: 'right'}));
      g.height = ly + 40;
    } else {
      const cx = 250, cy = 300, r0 = 120, r = 200;
      let angle = -Math.PI / 2;
      g.push({type: 'sector', silent: true, shape: {cx, cy, r0, r, startAngle: 0, endAngle: Math.PI * 2}, style: {fill: T.surface, stroke: T.line, lineWidth: 2}});
      d.parts.forEach((p, i) => { const span = Math.PI * 2 * p.value / d.capacity; if (span > 0) { g.push({type: 'sector', silent: true, shape: {cx, cy, r0, r, startAngle: angle, endAngle: angle + span, clockwise: true}, style: {fill: series[i % 4], stroke: T.background, lineWidth: 3}}); angle += span; } });
      g.push(txt(cx, cy - 18, fmt(used), {size: 44, weight: 'bold', mono: true}), txt(cx, cy + 26, `of ${fmt(d.capacity)} ${d.unit}`, {size: 22, color: T.muted, width: 220}));
      let ly = 120;
      d.parts.forEach((p, i) => { g.push(box(500, ly - 14, 28, 28, {fill: series[i % 4], stroke: 'transparent', r: 6}), txt(544, ly, p.label, {size: 26, align: 'left', width: 270}), txt(544, ly + 34, `${fmt(p.value)} ${d.unit}`, {size: 22, mono: true, align: 'left', color: T.muted})); ly += 92; });
      g.push(box(500, ly - 14, 28, 28, {fill: T.surface, stroke: T.line, r: 6}), txt(544, ly, 'Headroom', {size: 26, align: 'left'}), txt(544, ly + 34, `${fmt(headroom)} ${d.unit}`, {size: 22, mono: true, align: 'left', color: headroom / d.capacity < 0.1 ? T.warn : T.accent}));
      g.height = Math.max(cy + r, ly + 50);
    }
    return g;
  };

  draw['states'] = c => {
    const g = [], labels = [], d = c.data, current = stateOf(c, 'current'), n = d.states.length;
    const centers = [];
    if (c.variant === 'linear') {
      const bw = Math.min(200, (W - (n - 1) * 24) / n), bh = 84, y = 360, total = n * bw + (n - 1) * 24, x0 = (W - total) / 2;
      d.states.forEach((s, i) => { const x = x0 + i * (bw + 24); centers.push([x + bw / 2, y, bw, bh]); });
      d.transitions.forEach(t => {
        const [ax, ay, aw] = centers[t.from], [bx, by, bw2] = centers[t.to], forward = t.to > t.from, span = Math.abs(t.to - t.from);
        const sx = ax + (forward ? aw / 2 : -aw / 2), ex = bx + (forward ? -bw2 / 2 : bw2 / 2);
        const on = current === t.from;
        if (span === 1 && forward) { g.push(...arrow(sx + 2, ay, ex - 2, by, {stroke: on ? T.accent : T.accent2, opacity: on ? 1 : 0.8})); labels.push(txt((sx + ex) / 2, ay - bh / 2 - 22, t.label, {size: 21, color: on ? T.accent : T.muted, width: 160})); }
        else {
          const dir = forward ? -1 : 1, apex = ay + dir * (bh / 2 + 60 + 44 * (span - 1)), mx = (ax + bx) / 2;
          const y1 = ay + dir * bh / 2, y2 = by + dir * bh / 2;
          g.push(...curve(ax, y1, mx, apex + dir * 40, bx, y2, {stroke: on ? T.accent : (forward ? T.accent2 : T.warn), opacity: on ? 1 : 0.8}));
          labels.push(txt(mx, apex - 0, t.label, {size: 21, color: on ? T.accent : T.muted, width: 200}));
        }
      });
      centers.forEach(([x, y, bw2, bh2], i) => {
        const on = current === i;
        g.push(box(x - bw2 / 2, y - bh2 / 2, bw2, bh2, {stroke: on ? T.accent : T.line, lineWidth: on ? 4 : 2, fill: on ? T.surface : T.background, r: 42}));
        g.push(txt(x, y, d.states[i], {size: 25, weight: 'bold', width: bw2 - 24, color: on ? T.accent : T.ink}));
      });
      g.height = 640;
      g.push(...labels);
    } else {
      const cx = W / 2, cy = 340, R = 250, bw = 190, bh = 76;
      d.states.forEach((s, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; centers.push([cx + R * Math.cos(a), cy + R * Math.sin(a), a]); });
      d.transitions.forEach(t => {
        const [ax, ay] = centers[t.from], [bx, by] = centers[t.to], on = current === t.from;
        const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
        const nx = -dy / len, ny = dx / len, bend = 46;
        const cpx = mx + nx * bend, cpy = my + ny * bend;
        const a1 = Math.atan2(cpy - ay, cpx - ax), a2 = Math.atan2(cpy - by, cpx - bx);
        const trimA = Math.min(Math.abs((bw / 2 + 10) / Math.cos(a1)), Math.abs((bh / 2 + 10) / Math.sin(a1)));
        const trimB = Math.min(Math.abs((bw / 2 + 10) / Math.cos(a2)), Math.abs((bh / 2 + 10) / Math.sin(a2)));
        g.push(...curve(ax + trimA * Math.cos(a1), ay + trimA * Math.sin(a1), cpx, cpy, bx + trimB * Math.cos(a2), by + trimB * Math.sin(a2), {stroke: on ? T.accent : T.accent2, opacity: on ? 1 : 0.75}));
        labels.push(txt(mx + nx * (bend + 22), my + ny * (bend + 22), t.label, {size: 20, color: on ? T.accent : T.muted, width: 150}));
      });
      centers.forEach(([x, y], i) => {
        const on = current === i;
        g.push(box(x - bw / 2, y - bh / 2, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 4 : 2, fill: on ? T.surface : T.background, r: 38}));
        g.push(txt(x, y, d.states[i], {size: 24, weight: 'bold', width: bw - 24, color: on ? T.accent : T.ink}));
      });
      g.height = cy + R + bh / 2 + 20;
      g.push(...labels);
    }
    return g;
  };

  draw['delta'] = c => {
    const g = [], d = c.data, n = d.rows.length;
    const tokensMap = {better: ['circle-check', T.accent], worse: ['triangle-alert', T.warn], same: ['pause', T.line], new: ['sparkles', T.accent2], removed: ['x', T.warn]};
    g.push(txt(360, 24, d.before_label.toUpperCase(), {size: 20, weight: 'bold', color: T.muted}), txt(640, 24, d.after_label.toUpperCase(), {size: 20, weight: 'bold', color: T.accent}));
    const rowH = 100, gap = 14;
    d.rows.forEach((r, i) => {
      const y = 56 + i * (rowH + gap), [ic, color] = tokensMap[r.change];
      g.push(box(0, y, W, rowH, {stroke: T.line}));
      g.push(txt(24, y + rowH / 2, r.label, {size: 26, weight: 'bold', align: 'left', width: 210}));
      g.push(box(250, y + 18, 220, 64, {fill: T.background, stroke: T.line, r: 6}), txt(360, y + rowH / 2, r.before, {size: 24, mono: true, color: T.muted, width: 200}));
      g.push(...arrow(478, y + rowH / 2, 520, y + rowH / 2, {stroke: T.line, lineWidth: 2}));
      g.push(box(530, y + 18, 220, 64, {fill: T.background, stroke: color, r: 6}), txt(640, y + rowH / 2, r.after, {size: 24, mono: true, width: 200}));
      g.push(...dot(W - 32, y + rowH / 2, ic, color, 22));
    });
    let ly = 56 + n * (rowH + gap) + 12;
    const legend = [['better', 'better'], ['worse', 'worse'], ['same', 'same'], ['new', 'new'], ['removed', 'removed']].filter(([k]) => d.rows.some(r => r.change === k));
    legend.forEach(([k, label], i) => { const [ic, color] = tokensMap[k]; const lx = i * 160; g.push(...dot(lx + 16, ly, ic, color, 14), txt(lx + 40, ly, label, {size: 21, color: T.muted, align: 'left'})); });
    g.height = ly + 20;
    return g;
  };

  draw['trace'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_span'), total = c.derived.total, n = d.spans.length;
    const left = 250, right = W - 16, scale = (right - left) / total, rowH = 74, barH = 40, top = 30;
    const depthColor = [T.accent2, T.accent, T.extra];
    for (let k = 0; k <= 4; k++) { const x = left + (right - left) * k / 4; g.push(line(x, top - 10, x, top + n * rowH - 8, {stroke: T.line, lineWidth: 1})); g.push(txt(x, top + n * rowH + 18, fmt(total * k / 4), {size: 20, mono: true, color: T.muted, align: k === 0 ? 'left' : k === 4 ? 'right' : 'center'})); }
    g.push(txt(right, top + n * rowH + 48, d.unit, {size: 20, color: T.muted, align: 'right'}));
    d.spans.forEach((s, i) => {
      const y = top + i * rowH, on = active === i, o = fade(active, i), x = left + s.start * scale, w = Math.max(6, (s.end - s.start) * scale);
      g.push(txt(s.depth * 26, y + barH / 2, s.label, {size: 24, weight: s.depth ? 'normal' : 'bold', align: 'left', width: left - 16 - s.depth * 26, color: on ? T.accent : T.ink, opacity: o}));
      g.push(box(x, y, w, barH, {fill: depthColor[s.depth], stroke: on ? T.ink : 'transparent', lineWidth: 2, r: 6, opacity: o}));
      const label = fmt(s.end - s.start) + ' ' + d.unit, inside = w > 130;
      g.push(txt(inside ? x + 12 : Math.min(x + w + 12, right - 100), y + barH / 2, label, {size: 21, mono: true, color: inside ? T.background : T.muted, align: 'left', opacity: o}));
    });
    g.height = top + n * rowH + 64;
    return g;
  };

  // ---- study plumbing (mirrors the library gallery) ----------------------
  function options(c) {
    const items = draw[c.kind](c);
    const offset = Math.max(0, Math.floor((DRAW - Math.min(DRAW, items.height || DRAW)) / 2));
    return {animation: false, backgroundColor: T.background, textStyle: {fontFamily: T.font}, aria: {enabled: true}, tooltip: {show: false},
      graphic: [{type: 'group', silent: true, x: 0, y: offset, children: items}, ...provenance(c)]};
  }
  function renderAt(t) {
    if (!Number.isFinite(t)) throw new Error('Finite timeline required');
    seconds = Math.max(0, Math.min(8, t));
    $('progress').style.width = seconds / 8 * 100 + '%';
    $('time').value = String(seconds);
    text('time-label', seconds.toFixed(1) + ' s');
    const reveal = Math.min(1, seconds / 1.6);  // wipe-right preset; values never interpolate
    $('chart').style.clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`;
  }
  function select(id) {
    const next = components.findIndex(c => c.id === id);
    if (next < 0) throw new Error('Unknown component');
    index = next;
    const c = components[index];
    text('eyebrow', String(index + 1).padStart(2, '0') + ' / ' + c.kind.toUpperCase() + ' · ' + c.variant.toUpperCase());
    text('title', c.title);
    text('insight', c.insight);
    text('source-kind', (c.source.kind === 'illustrative' ? 'ILLUSTRATIVE DATA' : 'SOURCE REVIEW REQUIRED') + ' · DESIGN REVIEW');
    text('source', c.source.label + ' | ' + c.source.as_of);
    text('reference', c.source.reference);
    text('detail', `variant = ${c.variant} | state = ${c.state ? JSON.stringify(c.state) : 'none'} | palette = ${palette}`);
    $('chart').setAttribute('aria-label', c.title + '. ' + c.insight + '. ' + JSON.stringify(c.data));
    chart.setOption(options(c), {notMerge: true, lazyUpdate: false});
    document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    renderAt(seconds);
  }
  function setPalette(name) {
    if (!tokens.palettes[name]) throw new Error('Unknown palette');
    palette = name; T = tokens.palettes[name];
    document.querySelectorAll('.palette button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.palette === name)));
    select(components[index].id);
  }
  function icon(name) { const image = document.createElement('img'); image.src = icons[name]; image.alt = ''; return image; }
  const paletteBar = document.createElement('div'); paletteBar.className = 'palette';
  Object.keys(tokens.palettes).forEach(name => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.palette = name; b.setAttribute('aria-pressed', String(name === palette));
    b.addEventListener('click', () => setPalette(name)); paletteBar.append(b);
  });
  $('studies').before(paletteBar);
  components.forEach(c => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.id = c.id;
    const small = document.createElement('small'); small.textContent = c.variant;
    button.append(icon(c.icon), document.createTextNode(c.id), small);
    button.addEventListener('click', () => select(c.id));
    $('studies').append(button);
  });
  Object.entries(recipes).forEach(([name, recipe]) => {
    const item = document.createElement('span'); item.className = 'icon recipe tone-' + recipe.tone; item.dataset.name = recipe.label; item.tabIndex = 0; item.setAttribute('aria-label', recipe.label); item.dataset.recipe = name;
    const badge = document.createElement('span'); badge.className = 'badge'; badge.append(icon(recipe.badge)); item.append(icon(recipe.base), badge); $('icons').append(item);
  });
  function playState() {
    $('play').replaceChildren(icon(playing ? 'pause' : 'arrow-right'));
    $('play').setAttribute('aria-label', playing ? 'Pause preview' : 'Play preview');
    $('play').title = playing ? 'Pause preview' : 'Play preview';
  }
  $('play').addEventListener('click', () => { playing = !playing; last = performance.now(); if (playing && seconds >= 8) renderAt(0); playState(); });
  $('time').addEventListener('input', () => { playing = false; playState(); renderAt(Number($('time').value)); });
  const resize = () => { $('frame').style.transform = `scale(${$('frame').parentElement.clientWidth / 1080})`; };
  new ResizeObserver(resize).observe($('frame').parentElement);
  window.VisualLibrary = {renderAt, select, setPalette, ids: components.map(c => c.id), palettes: Object.keys(tokens.palettes), svg: () => chart.renderToSVGString(), stop: () => { playing = false; playState(); }};
  select(components[0].id); resize(); playState();
  function tick(now) { if (playing) { renderAt(seconds + (now - last) / 1000); if (seconds >= 8) { playing = false; playState(); } } last = now; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();
