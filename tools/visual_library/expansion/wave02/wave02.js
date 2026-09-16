(() => {
  'use strict';
  // Wave 02 renderer. Draws components into the 824x820 production slot with
  // the pinned ECharts graphic API. Every color comes from the active token
  // set (no literals), every number renders exactly as supplied, and the only
  // motion is the study's deterministic clip reveal driven by renderAt(seconds),
  // or a wave 03 recipe when window.VisualMotion is present.
  const {components, icons, tokens, palette: initialPalette, wave = 2} = window.visualLibraryData;
  const motion = window.VisualMotion || null;
  let recipe = motion ? motion.names[0] : null, current = null;
  const $ = id => document.getElementById(id);
  const W = 824, H = 820, RESERVE = 74, DRAW = H - RESERVE;
  let palette = initialPalette;
  let T = tokens.palettes[palette];
  const chart = echarts.init($('chart'), null, {renderer: 'svg', width: W, height: H});
  let index = 0, seconds = 4, playing = false, last = 0;
  const text = (id, value) => { $(id).textContent = value; };

  // ---- primitives --------------------------------------------------------
  const txt = (x, y, value, o = {}) => ({type: 'text', silent: true, style: {
    x, y, text: value, font: `${o.weight || 'normal'} ${o.size || 26}px ${o.mono ? T.mono : T.font}`,
    fill: o.color || T.ink, align: o.align || 'left', verticalAlign: o.vAlign || 'middle', opacity: o.opacity ?? 1,
    width: o.width, overflow: o.width ? (o.wrap ? 'break' : 'truncate') : undefined, ellipsis: '…',
    lineHeight: o.wrap ? Math.max(o.lineHeight || 0, Math.round((o.size || 26) * 1.3)) : o.lineHeight}});
  const box = (x, y, w, h, o = {}) => ({type: 'rect', silent: true, shape: {x, y, width: w, height: h, r: o.r ?? 8},
    style: {fill: o.fill || T.surface, stroke: o.stroke || T.line, lineWidth: o.lineWidth ?? 2, lineDash: o.dash, opacity: o.opacity ?? 1}});
  const line = (x1, y1, x2, y2, o = {}) => ({type: 'line', silent: true, shape: {x1, y1, x2, y2},
    style: {stroke: o.stroke || T.line, lineWidth: o.lineWidth || 2, lineDash: o.dash, opacity: o.opacity ?? 1}});
  const circle = (cx, cy, r, o = {}) => ({type: 'circle', silent: true, shape: {cx, cy, r}, style: {fill: o.fill || T.surface, stroke: o.stroke || 'none', lineWidth: o.lineWidth || 0, opacity: o.opacity ?? 1}});
  const glyph = (x, y, name, size = 28, opacity = 1) => ({type: 'image', silent: true, style: {image: icons[name], x, y, width: size, height: size, opacity}, z: 3});
  const dot = (cx, cy, name, color, r = 20, opacity = 1) => [circle(cx, cy, r, {fill: color, opacity}), glyph(cx - r * 0.62, cy - r * 0.62, name, r * 1.24, opacity)];
  const chip = (x, y, value, color, o = {}) => {
    const w = o.width || (value.length * 12 + 26), left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    return [box(left, y - 16, w, 32, {fill: color, stroke: 'none', r: 16, opacity: o.opacity ?? 1, lineWidth: 0}),
      txt(left + w / 2, y, value, {size: 19, weight: 'bold', color: o.ink || T.background, align: 'center', opacity: o.opacity ?? 1})];
  };
  const fmt = v => Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)));
  const series = () => [T.accent, T.accent2, T.extra, T.warn];
  const fade = (active, i) => (active === null || active === i ? 1 : 0.6);
  const stateOf = (c, key) => (c.state && c.state[key] !== undefined) ? c.state[key] : null;
  const provenance = c => {
    const kind = c.source.kind === 'illustrative' ? 'ILLUSTRATIVE' : 'SOURCE REVIEW REQUIRED';
    return [line(0, DRAW + 12, W, DRAW + 12, {stroke: T.line, lineWidth: 1}),
      txt(0, DRAW + 12, `${kind} · ${c.source.label} · ${c.source.as_of}`, {size: 21, color: T.muted, vAlign: 'top', width: W, wrap: true, lineHeight: 27})];
  };
  // Panel with a header strip, used by the code-like widgets.
  const panel = (h, title, tag) => [box(0, 0, W, h, {fill: T.background, stroke: T.line}), box(0, 0, W, 60, {stroke: T.line}),
    txt(24, 30, title, {size: 23, mono: true, width: W - 240}), txt(W - 24, 30, tag, {size: 19, mono: true, color: T.accent2, align: 'right'})];

  // ---- components (each returns graphics plus .height for vertical centering)
  const draw = {};

  draw['terminal'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_line'), n = d.lines.length, rowH = 50;
    const tag = d.exit_code === null ? 'RUNNING' : `EXIT ${d.exit_code}`;
    g.push(...panel(76 + n * rowH, d.title, tag));
    d.lines.forEach((l, i) => {
      const y = 68 + i * rowH + rowH / 2, on = active === i;
      if (on) g.push(box(3, y - rowH / 2, W - 6, rowH, {fill: T.surface, stroke: T.accent, r: 4}));
      const color = l.kind === 'error' ? T.warn : l.kind === 'comment' ? T.muted : T.ink;
      if (l.kind === 'command') { g.push(txt(24, y, '$', {size: 24, mono: true, color: T.accent2, weight: 'bold'})); g.push(txt(52, y, l.text, {size: 24, mono: true, width: W - 76})); }
      else g.push(txt(52, y, l.text, {size: 24, mono: true, color, width: W - 76}));
    });
    if (d.exit_code !== null) g.push(...chip(W - 24, 76 + n * rowH + 30, d.exit_code === 0 ? 'exit 0 · ok' : `exit ${d.exit_code} · failed`, d.exit_code === 0 ? T.accent : T.warn, {align: 'right'}));
    g.height = 76 + n * rowH + (d.exit_code !== null ? 52 : 0);
    return g;
  };

  draw['logs'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_line'), n = d.lines.length, rowH = 62;
    const tone = {DEBUG: T.muted, INFO: T.accent2, WARN: T.accent, ERROR: T.warn};
    d.lines.forEach((l, i) => {
      const y = i * rowH + rowH / 2, on = active === i, o = fade(active, i);
      g.push(box(0, y - rowH / 2 + 3, W, rowH - 6, {fill: on ? T.surface : T.background, stroke: on ? T.accent : T.line, lineWidth: on ? 2 : 1, r: 6, opacity: o}));
      g.push(txt(20, y, l.time, {size: 21, mono: true, color: T.muted, width: 164, opacity: o}));
      g.push(...chip(194, y, l.level, tone[l.level], {width: 96, opacity: o}));
      g.push(txt(310, y, l.message, {size: 24, width: W - 330, color: l.level === 'ERROR' ? T.warn : T.ink, opacity: o}));
    });
    g.height = n * rowH;
    return g;
  };

  draw['payload'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.entries.length, raw = c.variant === 'raw', rowH = raw ? 46 : 62;
    const tone = {string: T.accent, number: T.accent2, boolean: T.extra, null: T.muted, object: T.ink, array: T.ink};
    const quote = e => e.type === 'string' ? `"${e.value}"` : e.value;
    const h = 76 + n * rowH + (raw ? 52 : 12);
    g.push(...panel(h, d.title, 'JSON'));
    if (raw) g.push(txt(24, 84, '{', {size: 24, mono: true, color: T.muted}));
    d.entries.forEach((e, i) => {
      const y = (raw ? 108 : 80) + i * rowH + rowH / 2, on = hi === i, o = fade(hi, i);
      if (on) g.push(box(3, y - rowH / 2, W - 6, rowH, {fill: T.surface, stroke: T.accent, r: 4}));
      if (raw) {
        g.push(txt(52, y, `"${e.key}": `, {size: 24, mono: true, color: T.accent2, opacity: o}));
        g.push(txt(52 + (e.key.length + 4) * 14.5, y, quote(e) + (i < n - 1 ? ',' : ''), {size: 24, mono: true, color: tone[e.type], width: W - 80 - (e.key.length + 4) * 14.5, opacity: o}));
      } else {
        g.push(txt(24, y, e.key, {size: 24, mono: true, color: T.accent2, width: 250, opacity: o}));
        g.push(txt(290, y, quote(e), {size: 24, mono: true, color: tone[e.type], width: 380, opacity: o}));
        g.push(txt(W - 24, y, e.type, {size: 19, mono: true, color: T.muted, align: 'right', opacity: o}));
      }
    });
    if (raw) g.push(txt(24, 108 + n * rowH + 8, '}', {size: 24, mono: true, color: T.muted}));
    g.height = h;
    return g;
  };

  draw['matrix'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight_row'), rows = d.rows.length, cols = d.columns.length;
    const left = 250, cellW = (W - left) / cols, rowH = Math.min(96, (DRAW - 170) / rows), top = 90;
    d.columns.forEach((label, j) => g.push(txt(left + j * cellW + cellW / 2, 40, label, {size: 21, weight: 'bold', align: 'center', width: cellW - 8, wrap: true, lineHeight: 25, color: T.muted})));
    const marks = {yes: ['check', T.accent], no: ['x', T.warn], partial: ['pause', T.extra], na: [null, T.line]};
    d.rows.forEach((label, i) => {
      const y = top + i * rowH, on = hi === i, o = fade(hi, i);
      g.push(box(0, y + 4, W, rowH - 8, {fill: on ? T.surface : T.background, stroke: on ? T.accent : T.line, lineWidth: on ? 2 : 1, r: 6, opacity: o}));
      g.push(txt(20, y + rowH / 2, label, {size: 25, weight: 'bold', width: left - 40, opacity: o}));
      d.cells[i].forEach((cell, j) => {
        const cx = left + j * cellW + cellW / 2, cy = y + rowH / 2, [icon, color] = marks[cell];
        if (icon) g.push(...dot(cx, cy, icon, color, 18, o)); else g.push(line(cx - 10, cy, cx + 10, cy, {stroke: color, lineWidth: 3, opacity: o}));
      });
    });
    const ly = top + rows * rowH + 34;
    [['yes', 'yes'], ['no', 'no'], ['partial', 'partial'], ['na', 'not applicable']].forEach(([k, label], i) => {
      const [icon, color] = marks[k], lx = i * 200 + 14;
      if (icon) g.push(...dot(lx, ly, icon, color, 12)); else g.push(line(lx - 8, ly, lx + 8, ly, {stroke: color, lineWidth: 3}));
      g.push(txt(lx + 22, ly, label, {size: 20, color: T.muted}));
    });
    g.push(txt(0, ly + 40, d.legend, {size: 21, color: T.muted, width: W}));
    g.height = ly + 56;
    return g;
  };

  draw['tree'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.nodes.length, rowH = Math.min(58, (DRAW - 20) / n), indent = 44;
    d.nodes.forEach((node, i) => {
      const y = i * rowH + rowH / 2, x = 20 + node.depth * indent, on = hi === i, o = fade(hi, i);
      if (on) g.push(box(0, y - rowH / 2 + 2, W, rowH - 4, {fill: T.surface, stroke: T.accent, r: 6}));
      if (node.depth > 0) {
        const px = x - indent + 14;
        // Vertical guide from the parent row down to this row, then an elbow.
        let parent = i - 1; while (parent >= 0 && d.nodes[parent].depth >= node.depth) parent--;
        g.push(line(px, parent * rowH + rowH, px, y, {stroke: T.line, lineWidth: 2}), line(px, y, x - 6, y, {stroke: T.line, lineWidth: 2}));
      }
      if (node.icon) g.push(glyph(x, y - 14, node.icon, 28, o));
      g.push(txt(x + (node.icon ? 40 : 0), y, node.label, {size: 24, mono: true, width: W - x - 60, color: on ? T.accent : node.depth === 0 ? T.ink : T.ink, opacity: o, weight: node.depth === 0 ? 'bold' : 'normal'}));
    });
    g.height = n * rowH;
    return g;
  };

  draw['table'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight_row'), cols = d.columns.length, rows = d.rows.length, grid = c.variant === 'grid';
    const colW = W / cols, headH = 56, rowH = Math.min(72, (DRAW - headH - 20) / rows), size = cols === 4 ? 22 : 24, inset = cols === 4 ? 12 : 18;
    const cellX = (j, align) => align === 'right' ? j * colW + colW - inset : j * colW + inset;
    if (grid) g.push(box(0, 0, W, headH + rows * rowH, {fill: T.background, stroke: T.line, r: 8}));
    g.push(box(0, 0, W, headH, {fill: T.surface, stroke: grid ? T.line : 'none', lineWidth: grid ? 1 : 0, r: 8}));
    d.columns.forEach((col, j) => g.push(txt(cellX(j, col.align), headH / 2, col.label, {size: 21, weight: 'bold', color: T.muted, align: col.align, width: colW - 2 * inset})));
    d.rows.forEach((row, i) => {
      const y = headH + i * rowH, on = hi === i, o = fade(hi, i);
      if (on) g.push(box(2, y + 2, W - 4, rowH - 4, {fill: T.surface, stroke: T.accent, r: 4}));
      else if (!grid) g.push(line(0, y, W, y, {stroke: T.line, lineWidth: 1}));
      row.forEach((cell, j) => {
        const col = d.columns[j];
        g.push(txt(cellX(j, col.align), y + rowH / 2, cell, {size, mono: col.mono, align: col.align, width: colW - 2 * inset, opacity: o, color: on ? T.accent : T.ink}));
        if (grid && j > 0) g.push(line(j * colW, y, j * colW, y + rowH, {stroke: T.line, lineWidth: 1}));
      });
      if (grid && i > 0) g.push(line(0, y, W, y, {stroke: T.line, lineWidth: 1}));
    });
    g.height = headH + rows * rowH;
    return g;
  };

  draw['histogram'] = c => {
    const g = [], d = c.data, edges = d.edges, counts = d.counts, n = counts.length;
    const left = 70, right = W - 16, top = 40, baseY = 520, span = edges[n] - edges[0], sx = v => left + (v - edges[0]) / span * (right - left);
    const max = c.derived.max, sy = v => baseY - (v / max) * (baseY - top);
    [0, 0.5, 1].forEach(f => { const y = sy(max * f); g.push(line(left, y, right, y, {stroke: T.line, lineWidth: 1})); g.push(txt(left - 12, y, fmt(max * f), {size: 20, mono: true, color: T.muted, align: 'right'})); });
    counts.forEach((count, i) => {
      const x0 = sx(edges[i]) + 3, x1 = sx(edges[i + 1]) - 3, y = sy(count), h = baseY - y;
      if (count > 0) g.push(box(x0, y, x1 - x0, h, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 4}));
      else g.push(line(x0, baseY - 2, x1, baseY - 2, {stroke: T.accent, lineWidth: 3}));
      g.push(txt((x0 + x1) / 2, (count > 0 && h > 40 ? y + 22 : y - 18), fmt(count), {size: 21, mono: true, align: 'center', color: count > 0 && h > 40 ? T.background : T.ink}));
    });
    g.push(line(left, baseY, right, baseY, {stroke: T.muted, lineWidth: 2}));
    // Crowded edges drop to a second label row instead of colliding.
    let lastLabel = -1e9, lastRow = 1;
    edges.forEach((edge, i) => {
      const x = sx(edge), align = i === 0 ? 'left' : i === n ? 'right' : 'center', label = fmt(edge), width = label.length * 12 + 12;
      const row = (x - lastLabel < width && lastRow === 0) ? 1 : 0;
      g.push(line(x, baseY, x, baseY + 10 + row * 24, {stroke: T.muted, lineWidth: 2}));
      g.push(txt(x, baseY + 32 + row * 24, label, {size: 20, mono: true, color: T.muted, align}));
      lastLabel = x; lastRow = row;
    });
    g.push(txt(right, baseY + 90, `bin edges in ${d.unit} · n = ${fmt(c.derived.total)}`, {size: 21, color: T.muted, align: 'right'}));
    if (d.marker) {
      const x = sx(d.marker.value);
      g.push(line(x, top - 10, x, baseY, {stroke: T.warn, lineWidth: 3, dash: [8, 6]}));
      g.push(txt(x + (x > W / 2 ? -10 : 10), top - 10, `${d.marker.label} = ${fmt(d.marker.value)}`, {size: 21, color: T.warn, align: x > W / 2 ? 'right' : 'left'}));
    }
    g.height = baseY + 106;
    return g;
  };

  draw['boxplot'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.groups.length;
    const left = 190, right = W - 30, low = c.derived.low, high = c.derived.high, span = high - low || 1, sx = v => left + (v - low) / span * (right - left);
    const rowH = Math.min(150, (DRAW - 90) / n), top = 20;
    [0, 0.25, 0.5, 0.75, 1].forEach(f => { const v = low + span * f, x = sx(v); g.push(line(x, top, x, top + n * rowH, {stroke: T.line, lineWidth: 1})); g.push(txt(x, top + n * rowH + 22, fmt(v), {size: 20, mono: true, color: T.muted, align: f === 0 ? 'left' : f === 1 ? 'right' : 'center'})); });
    g.push(txt(right, top + n * rowH + 54, d.unit, {size: 21, color: T.muted, align: 'right'}));
    d.groups.forEach((grp, i) => {
      const cy = top + i * rowH + rowH / 2, on = hi === i, o = fade(hi, i), bh = Math.min(64, rowH - 40), color = series()[i % 4];
      g.push(txt(0, cy, grp.label, {size: 24, weight: 'bold', width: left - 24, opacity: o, color: on ? T.accent : T.ink}));
      g.push(line(sx(grp.min), cy, sx(grp.q1), cy, {stroke: color, lineWidth: 3, opacity: o}), line(sx(grp.q3), cy, sx(grp.max), cy, {stroke: color, lineWidth: 3, opacity: o}));
      [grp.min, grp.max].forEach(v => g.push(line(sx(v), cy - 14, sx(v), cy + 14, {stroke: color, lineWidth: 3, opacity: o})));
      g.push(box(sx(grp.q1), cy - bh / 2, Math.max(4, sx(grp.q3) - sx(grp.q1)), bh, {fill: color, stroke: on ? T.ink : 'none', lineWidth: on ? 2 : 0, r: 4, opacity: o}));
      g.push(line(sx(grp.median), cy - bh / 2, sx(grp.median), cy + bh / 2, {stroke: T.background, lineWidth: 4, opacity: o}));
      g.push(txt(sx(grp.median), cy - bh / 2 - 16, `median ${fmt(grp.median)}`, {size: 20, mono: true, align: 'center', color: T.ink, opacity: o}));
    });
    g.height = top + n * rowH + 70;
    return g;
  };

  draw['waffle'] = c => {
    const g = [], d = c.data, squares = c.derived.squares, flagged = c.derived.flagged, cell = 44, gap = 6, size = 10 * cell + 9 * gap;
    const colors = series(), owner = [];
    squares.forEach((n, i) => { for (let k = 0; k < n; k++) owner.push(i); });
    for (let k = 0; k < 100; k++) {
      const row = 9 - Math.floor(k / 10), col = k % 10, x = col * (cell + gap), y = row * (cell + gap), i = owner[k];
      g.push(box(x, y, cell, cell, {fill: i === undefined ? T.surface : colors[i % 4], stroke: 'none', lineWidth: 0, r: 6}));
    }
    let ly = 24;
    d.parts.forEach((p, i) => {
      g.push(box(size + 40, ly - 14, 28, 28, {fill: colors[i % 4], stroke: 'none', lineWidth: 0, r: 6}));
      g.push(txt(size + 84, ly, p.label, {size: 23, width: W - size - 90}));
      g.push(txt(size + 84, ly + 30, `${fmt(p.percent)}%` + (flagged[i] ? ' (1 square)' : ''), {size: 19, mono: true, color: flagged[i] ? T.warn : T.muted, width: W - size - 90}));
      ly += 76;
    });
    g.push(box(size + 40, ly - 14, 28, 28, {fill: T.surface, stroke: T.line, r: 6}));
    g.push(txt(size + 84, ly, 'Remainder', {size: 23, color: T.muted}), txt(size + 84, ly + 30, `${fmt(100 - c.derived.total_percent)}%`, {size: 19, mono: true, color: T.muted}));
    g.push(txt(0, size + 18, 'Each square is 1%. Parts are rounded to whole squares; a nonzero part under 0.5% is flagged.', {size: 20, color: T.muted, vAlign: 'top', width: W, wrap: true}));
    g.height = size + 74;
    return g;
  };

  draw['funnel'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.stages.length, centered = c.variant === 'centered';
    const rowH = Math.min(110, (DRAW - 20) / n), barH = rowH - 40, maxW = W - 250;
    d.stages.forEach((s, i) => {
      const share = c.derived.share[i], w = Math.max(6, maxW * share), y = i * rowH + 30, x = centered ? 250 + (maxW - w) / 2 : 250, on = hi === i, o = fade(hi, i);
      g.push(txt(0, y + barH / 2, s.label, {size: 24, weight: 'bold', width: 230, opacity: o, color: on ? T.accent : T.ink}));
      if (s.value > 0) g.push(box(x, y, w, barH, {fill: series()[i % 4], stroke: on ? T.ink : 'none', lineWidth: on ? 2 : 0, r: 6, opacity: o}));
      else g.push(line(x, y + barH / 2, x + maxW, y + barH / 2, {stroke: T.line, lineWidth: 2, dash: [6, 6]}));
      const label = `${fmt(s.value)} ${d.unit} · ${fmt(Math.round(share * 1000) / 10)}%`, inside = w > 300;
      // Wide bars carry the label inside; narrow ones get it above the bar so nothing overlaps.
      g.push(txt(centered ? x + w / 2 : x + 14, inside ? y + barH / 2 : y - 16, label, {size: 21, mono: true, align: centered ? 'center' : 'left', color: inside ? T.background : T.ink, opacity: o}));
    });
    g.push(txt(0, n * rowH + 6, 'Percent of the first stage. Drop-off is not attributed to a cause.', {size: 20, color: T.muted, width: W}));
    g.height = n * rowH + 20;
    return g;
  };


  // ---- batch 2: systems and data -----------------------------------------
  const axisTicks = (g, x0, x1, y, low, high, unit, tall) => {
    [0, 0.25, 0.5, 0.75, 1].forEach(f => { const v = low + (high - low) * f, x = x0 + (x1 - x0) * f; g.push(line(x, y - tall, x, y, {stroke: T.line, lineWidth: 1})); g.push(txt(x, y + 22, fmt(Math.round(v * 100) / 100), {size: 20, mono: true, color: T.muted, align: f === 0 ? 'left' : f === 1 ? 'right' : 'center'})); });
    g.push(txt(x1, y + 52, unit, {size: 21, color: T.muted, align: 'right'}));
  };
  const curveRibbon = (x1, y1a, y1b, x2, y2a, y2b, color, opacity) => {
    // Closed ribbon between two cubic curves, sampled so it renders as one polygon.
    const pts = [], steps = 18, cx = (x1 + x2) / 2;
    const bez = (a, b, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * a + 3 * u * t * t * b + t * t * t * b; };
    const bx = t => { const u = 1 - t; return u * u * u * x1 + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * x2; };
    for (let i = 0; i <= steps; i++) { const t = i / steps; pts.push([bx(t), bez(y1a, y2a, t)]); }
    for (let i = steps; i >= 0; i--) { const t = i / steps; pts.push([bx(t), bez(y1b, y2b, t)]); }
    return {type: 'polygon', silent: true, shape: {points: pts}, style: {fill: color, opacity}};
  };
  const arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 10, p = (dx, dy) => [x2 + dx * Math.cos(a) - dy * Math.sin(a), y2 + dx * Math.sin(a) + dy * Math.cos(a)];
    return [line(x1, y1, x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8, {stroke: o.stroke || T.accent2, lineWidth: o.lineWidth || 3, dash: o.dash, opacity: o.opacity ?? 1}),
      {type: 'polygon', silent: true, shape: {points: [p(0, 0), p(-s * 1.6, -s * 0.8), p(-s * 1.6, s * 0.8)]}, style: {fill: o.stroke || T.accent2, opacity: o.opacity ?? 1}}];
  };
  const health = {healthy: ['circle-check', () => T.accent], degraded: ['triangle-alert', () => T.extra], down: ['x', () => T.warn], acked: ['circle-check', () => T.accent], pending: ['clock', () => T.accent2], lagging: ['triangle-alert', () => T.warn]};

  draw['queue'] = c => {
    const g = [], d = c.data, full = c.derived.full;
    const cy = 300, colH = 64;
    const column = (nodes, x, dir) => nodes.forEach((n, i) => {
      const y = cy - (nodes.length * (colH + 14) - 14) / 2 + i * (colH + 14);
      g.push(box(x, y, 190, colH, {stroke: T.line}), txt(x + 14, y + 22, n.label, {size: 22, weight: 'bold', width: 160}), txt(x + 14, y + 47, n.rate, {size: 19, mono: true, color: T.muted, width: 160}));
      if (dir > 0) g.push(...arrow(x + 194, y + colH / 2, 226, cy, {stroke: T.line})); else g.push(...arrow(598, cy, x - 4, y + colH / 2, {stroke: T.line}));
    });
    column(d.producers, 0, 1); column(d.consumers, 634, -1);
    g.push(txt(412, cy - 88, d.label, {size: 23, weight: 'bold', align: 'center', width: 360}));
    g.push(box(230, cy - 46, 364, 92, {stroke: full ? T.warn : T.accent2, lineWidth: full ? 3 : 2}));
    const shown = c.derived.shown, cell = 26, gap = 6, startX = 230 + 18;
    for (let k = 0; k < shown; k++) g.push(box(startX + k * (cell + gap), cy - cell / 2, cell, cell, {fill: T.accent2, stroke: 'none', lineWidth: 0, r: 5}));
    if (d.depth > shown) g.push(txt(startX + shown * (cell + gap) + 4, cy, `+${d.depth - shown}`, {size: 22, mono: true, color: T.ink}));
    if (d.depth === 0) g.push(txt(412, cy, 'empty', {size: 22, mono: true, color: T.muted, align: 'center'}));
    const cap = d.capacity === null ? 'no capacity limit' : `capacity ${d.capacity}`;
    g.push(txt(412, cy + 76, `depth ${d.depth} · ${cap}`, {size: 22, mono: true, color: full ? T.warn : T.muted, align: 'center', width: 360}));
    if (d.capacity !== null) {
      const ratio = Math.min(1, d.depth / d.capacity);
      g.push(box(230, cy + 100, 364, 10, {fill: T.surface, stroke: 'none', lineWidth: 0, r: 5}), box(230, cy + 100, Math.max(2, 364 * ratio), 10, {fill: full ? T.warn : T.accent2, stroke: 'none', lineWidth: 0, r: 5}));
    }
    if (full) g.push(...chip(412, cy + 140, 'FULL: producers block or drop', T.warn, {align: 'center', width: 330}));
    g.push(txt(0, cy + 190, 'Items shown up to ten; the count is exact.', {size: 20, color: T.muted, width: W}));
    g.height = cy + 210;
    return g;
  };

  draw['balancer'] = c => {
    const g = [], d = c.data, sel = stateOf(c, 'selected'), n = d.replicas.length;
    const cy = 320, bh = 86, gap = Math.min(26, (DRAW - 60 - n * bh) / Math.max(1, n - 1)), top = cy - (n * bh + (n - 1) * gap) / 2;
    g.push(box(0, cy - 60, 250, 120, {stroke: T.accent2}), glyph(20, cy - 42, 'network', 32), txt(62, cy - 26, 'BALANCER', {size: 19, weight: 'bold', color: T.accent2}));
    g.push(txt(20, cy + 8, d.label, {size: 24, weight: 'bold', width: 214}), txt(20, cy + 38, d.algorithm, {size: 20, color: T.muted, width: 214}));
    d.replicas.forEach((r, i) => {
      const y = top + i * (bh + gap), on = sel === i, o = fade(sel, i), [icon, color] = health[r.health], down = r.health === 'down';
      g.push({type: 'bezierCurve', silent: true, shape: {x1: 252, y1: cy, cpx1: 360, cpy1: y + bh / 2, x2: 470, y2: y + bh / 2}, style: {stroke: down ? T.line : on ? T.accent : T.accent2, lineWidth: on ? 4 : 2, lineDash: down ? [8, 8] : undefined, fill: 'none', opacity: o}});
      g.push(box(474, y, W - 474, bh, {stroke: on ? T.accent : down ? T.warn : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push(...dot(512, y + bh / 2, icon, color(), 18, o));
      g.push(txt(546, y + 30, r.label, {size: 24, weight: 'bold', width: 180, opacity: o, color: on ? T.accent : T.ink}));
      g.push(txt(546, y + 60, r.health, {size: 20, color: color(), opacity: o}));
      g.push(txt(W - 18, y + bh / 2, r.share, {size: 24, mono: true, align: 'right', color: T.muted, opacity: o}));
    });
    g.push(txt(0, Math.max(cy + 100, top + n * (bh + gap)) + 10, 'Shares are as configured or reported; down replicas receive no traffic.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = Math.max(cy + 100, top + n * (bh + gap)) + 64;
    return g;
  };

  draw['breaker'] = c => {
    const g = [], d = c.data, filled = c.derived.filled, open = d.state === 'open', half = d.state === 'half-open';
    g.push(txt(0, 20, 'FAILURES', {size: 19, weight: 'bold', color: T.muted}), txt(W, 20, `${fmt(d.failures)} of ${fmt(d.threshold)} · ${d.window}`, {size: 22, mono: true, align: 'right', color: filled >= d.threshold ? T.warn : T.ink}));
    const segW = (W - (d.threshold - 1) * 8) / d.threshold;
    for (let k = 0; k < d.threshold; k++) g.push(box(k * (segW + 8), 44, segW, 34, {fill: k < filled ? (filled >= d.threshold ? T.warn : T.accent) : T.surface, stroke: 'none', lineWidth: 0, r: 6}));
    const states = [['closed', 'requests pass', 'circle-check'], ['open', 'requests blocked', 'x'], ['half-open', 'one probe passes', 'clock']];
    const y = 150, bw = 236, gap = (W - 3 * bw) / 2;
    states.forEach(([name, meaning, icon], i) => {
      const x = i * (bw + gap), on = d.state === name, color = name === 'open' ? T.warn : name === 'half-open' ? T.extra : T.accent;
      g.push(box(x, y, bw, 130, {stroke: on ? color : T.line, lineWidth: on ? 4 : 2, fill: on ? T.surface : T.background, r: 14}));
      g.push(...dot(x + bw / 2, y + 38, icon, on ? color : T.line, 20));
      g.push(txt(x + bw / 2, y + 80, name.toUpperCase(), {size: 22, weight: 'bold', align: 'center', color: on ? color : T.ink}));
      g.push(txt(x + bw / 2, y + 108, meaning, {size: 19, align: 'center', color: T.muted, width: bw - 12}));
      if (i < 2) g.push(...arrow(x + bw + 4, y + 65, x + bw + gap - 4, y + 65, {stroke: T.line}));
    });
    g.push({type: 'bezierCurve', silent: true, shape: {x1: 2 * (bw + gap) + bw / 2, y1: y + 134, cpx1: W / 2, cpy1: y + 220, x2: bw / 2, y2: y + 134}, style: {stroke: T.line, lineWidth: 2, lineDash: [6, 6], fill: 'none'}});
    g.push(txt(W / 2, y + 200, 'probe succeeds: closed again · fails: open again', {size: 19, color: T.muted, align: 'center'}));
    g.push(box(0, y + 240, W, 90, {stroke: open ? T.warn : half ? T.extra : T.accent}), txt(24, y + 266, 'NOW', {size: 19, weight: 'bold', color: T.muted}), txt(24, y + 300, d.next, {size: 24, width: W - 48}));
    g.height = y + 330;
    return g;
  };

  draw['token-bucket'] = c => {
    const g = [], d = c.data, outcomes = c.derived.outcomes, cap = d.capacity, cols = Math.min(10, cap), rows = Math.ceil(cap / cols), cell = Math.min(24, Math.floor(240 / cols) - 4), gap = 4;
    const bx = 0, by = 110, gridW = cols * (cell + gap), bw = Math.max(250, gridW + 24), bhh = Math.max(120, rows * (cell + gap) + 24), gx = bx + (bw - gridW) / 2 + 2, gy = by + (bhh - rows * (cell + gap)) / 2 + 2;
    g.push(txt(bx, 22, `refill ${d.refill}`, {size: 20, color: T.accent2, width: bw}), ...arrow(bx + bw / 2, 44, bx + bw / 2, by - 8, {stroke: T.accent2}));
    g.push(box(bx, by, bw, bhh, {stroke: T.line, r: 10}));
    for (let k = 0; k < cap; k++) { const row = rows - 1 - Math.floor(k / cols), col = k % cols; g.push(box(gx + col * (cell + gap), gy + row * (cell + gap), cell, cell, {fill: k < d.tokens ? T.accent : T.surface, stroke: 'none', lineWidth: 0, r: 4})); }
    g.push(txt(bx + bw / 2, by + bhh + 28, `${fmt(d.tokens)} of ${fmt(cap)} tokens`, {size: 22, mono: true, align: 'center'}));
    const rx = bx + bw + 40, rowH = 64, top = 40;
    g.push(txt(rx, top - 20, 'REQUESTS IN ORDER', {size: 19, weight: 'bold', color: T.muted}));
    d.requests.forEach((r, i) => {
      const y = top + 10 + i * rowH, ok = outcomes[i] === 'allowed';
      g.push(box(rx, y, W - rx, rowH - 10, {stroke: T.line}), txt(rx + 16, y + (rowH - 10) / 2, r.label, {size: 23, weight: 'bold', width: 170}));
      g.push(txt(rx + 196, y + (rowH - 10) / 2, `cost ${fmt(r.cost)}`, {size: 21, mono: true, color: T.muted}));
      g.push(...chip(W - 14, y + (rowH - 10) / 2, ok ? 'ALLOWED' : 'DENIED', ok ? T.accent : T.warn, {align: 'right', width: 116}));
    });
    const bottom = Math.max(by + bhh + 50, top + 10 + d.requests.length * rowH);
    g.push(txt(0, bottom + 12, `Evaluated in order from ${fmt(d.tokens)} tokens without refill; ${fmt(c.derived.remaining)} left. Refill adds tokens over time up to capacity.`, {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = bottom + 70;
    return g;
  };

  draw['replication'] = c => {
    const g = [], d = c.data, n = d.replicas.length, bw = Math.min(190, (W - (n - 1) * 20) / n), total = n * bw + (n - 1) * 20, x0 = (W - total) / 2, ry = 330;
    g.push(box(W / 2 - 150, 40, 300, 100, {stroke: T.accent2, lineWidth: 3}), ...dot(W / 2 - 104, 90, 'database', T.accent2, 22), txt(W / 2 - 70, 74, 'PRIMARY', {size: 19, weight: 'bold', color: T.accent2}), txt(W / 2 - 70, 106, d.primary, {size: 24, weight: 'bold', width: 200}));
    d.replicas.forEach((r, i) => {
      const x = x0 + i * (bw + 20), cx = x + bw / 2, [icon, color] = health[r.status];
      g.push(line(W / 2, 142, W / 2, 200, {stroke: T.line}), line(x0 + bw / 2, 200, x0 + total - bw / 2, 200, {stroke: T.line}), ...arrow(cx, 200, cx, ry - 6, {stroke: r.status === 'lagging' ? T.warn : T.line, dash: r.status === 'acked' ? undefined : [6, 6]}));
      g.push(box(x, ry, bw, 156, {stroke: r.status === 'lagging' ? T.warn : T.line}), ...dot(cx, ry + 34, icon, color(), 18));
      g.push(txt(cx, ry + 72, r.label, {size: 22, weight: 'bold', align: 'center', width: bw - 12}), txt(cx, ry + 102, r.status, {size: 19, mono: true, align: 'center', color: color(), width: bw - 8}), txt(cx, ry + 130, `lag ${r.lag}`, {size: 19, mono: true, align: 'center', color: T.muted, width: bw - 8}));
    });
    g.push(box(0, ry + 186, W, 70, {stroke: T.line}), txt(24, ry + 221, `Quorum: ${d.quorum} · ${fmt(c.derived.acked)} of ${n} acked now`, {size: 23, width: W - 48}));
    g.push(txt(0, ry + 274, 'Lag values are as reported at capture time; they are not measured here.', {size: 20, color: T.muted, width: W}));
    g.height = ry + 294;
    return g;
  };

  draw['percentiles'] = c => {
    const g = [], d = c.data, log = c.variant === 'ladder-log', left = 16, right = W - 16, y = 300;
    const lo = log ? Math.pow(10, Math.floor(Math.log10(c.derived.low))) : 0, hi = log ? Math.pow(10, Math.ceil(Math.log10(c.derived.high))) : c.derived.high * 1.06 || 1;
    const sx = v => log ? left + (right - left) * (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : left + (right - left) * v / hi;
    g.push(line(left, y, right, y, {stroke: T.muted, lineWidth: 2}));
    if (log) {
      for (let p = Math.log10(lo); p <= Math.log10(hi) + 1e-9; p++) { const v = Math.pow(10, p), x = sx(v); g.push(line(x, y, x, y + 10, {stroke: T.line, lineWidth: 1})); g.push(txt(x, y + 32, fmt(v), {size: 20, mono: true, color: T.muted, align: p === Math.log10(lo) ? 'left' : v >= hi ? 'right' : 'center'})); }
      g.push(txt(right, y + 60, `${d.unit} · log scale`, {size: 21, color: T.muted, align: 'right'}));
    } else axisTicks(g, left, right, y + 30, 0, hi, d.unit, 0);
    d.points.forEach((p, i) => {
      const x = sx(p.value), up = i % 2 === 0;  // alternate above and below the axis
      g.push(line(x, y, x, y + (up ? -44 : 60), {stroke: T.line, lineWidth: 2}), circle(x, y, 12, {fill: T.accent, stroke: T.background, lineWidth: 3}));
      g.push(txt(x, y + (up ? -92 : 100), p.label, {size: 24, weight: 'bold', align: 'center'}), txt(x, y + (up ? -64 : 128), `${fmt(p.value)} ${d.unit}`, {size: 20, mono: true, align: 'center', color: T.muted}));
    });
    if (d.target) { const x = sx(d.target.value); g.push(line(x, y - 130, x, y + 8, {stroke: T.warn, lineWidth: 3, dash: [8, 6]})); g.push(txt(x + (x > W / 2 ? -10 : 10), y - 146, `${d.target.label} = ${fmt(d.target.value)}`, {size: 21, color: T.warn, align: x > W / 2 ? 'right' : 'left'})); }
    g.push(txt(0, y + 160, 'Same requests, sorted by latency: pN is the value below which N percent fall.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = y + 220;
    return g;
  };

  const rowAxis = (g, items, left, low, high, unit, drawRow, rowH) => {
    const right = W - 24, top = 40, sx = v => left + (right - left) * (v - low) / ((high - low) || 1);
    [0, 0.5, 1].forEach(f => { const x = left + (right - left) * f; g.push(line(x, top - 10, x, top + items.length * rowH, {stroke: T.line, lineWidth: 1})); });
    items.forEach((item, i) => drawRow(item, i, top + i * rowH + rowH / 2, sx));
    axisTicks(g, left, right, top + items.length * rowH + 10, low, high, unit, 0);
    return top + items.length * rowH + 70;
  };

  draw['dumbbell'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), rowH = Math.min(96, (DRAW - 130) / d.rows.length);
    g.push(circle(210, 14, 10, {fill: T.muted}), txt(230, 14, d.before_label, {size: 21, color: T.muted}), circle(430, 14, 10, {fill: T.accent}), txt(450, 14, d.after_label, {size: 21, color: T.muted}));
    const bottom = rowAxis(g, d.rows, 200, 0, c.derived.high, d.unit, (row, i, cy, sx) => {
      const on = hi === i, o = fade(hi, i), a = sx(row.before), b = sx(row.after);
      g.push(txt(0, cy, row.label, {size: 23, weight: 'bold', width: 180, opacity: o, color: on ? T.accent : T.ink}));
      g.push(line(a, cy, b, cy, {stroke: on ? T.accent : T.line, lineWidth: on ? 6 : 4, opacity: o}));
      g.push(circle(a, cy, 12, {fill: T.muted, stroke: T.background, lineWidth: 3, opacity: o}), circle(b, cy, 12, {fill: T.accent, stroke: T.background, lineWidth: 3, opacity: o}));
      const labelAbove = Math.abs(a - b) < 120;
      g.push(txt(a, cy - (labelAbove ? 28 : 24), fmt(row.before), {size: 19, mono: true, align: 'center', color: T.muted, opacity: o}));
      g.push(txt(b, cy + (labelAbove ? 30 : 26), fmt(row.after), {size: 19, mono: true, align: 'center', color: T.ink, opacity: o}));
    }, rowH);
    g.height = bottom;
    return g;
  };

  draw['intervals'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), rowH = Math.min(96, (DRAW - 150) / d.items.length);
    const bottom = rowAxis(g, d.items, 200, c.derived.low, c.derived.high, d.unit, (item, i, cy, sx) => {
      const on = hi === i, o = fade(hi, i), lo = sx(item.low), mid = sx(item.mid), hix = sx(item.high);
      g.push(txt(0, cy, item.label, {size: 23, weight: 'bold', width: 180, opacity: o, color: on ? T.accent : T.ink}));
      g.push(line(lo, cy, hix, cy, {stroke: on ? T.accent : T.accent2, lineWidth: 3, opacity: o}), line(lo, cy - 12, lo, cy + 12, {stroke: on ? T.accent : T.accent2, lineWidth: 3, opacity: o}), line(hix, cy - 12, hix, cy + 12, {stroke: on ? T.accent : T.accent2, lineWidth: 3, opacity: o}));
      g.push(circle(mid, cy, 11, {fill: on ? T.accent : T.ink, stroke: T.background, lineWidth: 3, opacity: o}));
      g.push(txt(mid, cy - 26, fmt(item.mid), {size: 19, mono: true, align: 'center', opacity: o}));
      if (hix - lo < 4) g.push(txt(mid, cy + 28, `${fmt(item.low)} (no spread)`, {size: 19, mono: true, align: 'center', color: T.muted, opacity: o}));
      else if (hix - lo < 90) g.push(txt(lo - 14, cy + 28, fmt(item.low), {size: 19, mono: true, align: 'right', color: T.muted, opacity: o}), txt(hix + 14, cy + 28, fmt(item.high), {size: 19, mono: true, align: 'left', color: T.muted, opacity: o}));
      else g.push(txt(lo, cy + 28, fmt(item.low), {size: 19, mono: true, align: 'center', color: T.muted, opacity: o}), txt(hix, cy + 28, fmt(item.high), {size: 19, mono: true, align: 'center', color: T.muted, opacity: o}));
    }, rowH);
    g.push(txt(0, bottom + 4, d.note, {size: 20, color: T.muted, width: W}));
    g.height = bottom + 24;
    return g;
  };

  draw['split-flow'] = c => {
    const g = [], d = c.data, total = d.total, unassigned = c.derived.unassigned, top = 60;
    const parts = [...d.targets.map((t, i) => ({label: t.label, value: t.value, color: series()[i % 4]})), ...(unassigned > 0 ? [{label: 'Unassigned', value: unassigned, color: T.line}] : [])];
    const gap = 14, H0 = 520 - (parts.length - 1) * gap, sy = v => H0 * v / total;  // both sides share one scale; gaps fit inside the slot
    g.push(txt(0, top - 30, d.source, {size: 22, weight: 'bold'}), txt(0, top + 520 + 26, `${fmt(total)} ${d.unit}`, {size: 21, mono: true, color: T.muted}));
    g.push(box(0, top, 44, H0, {fill: T.surface, stroke: T.line, r: 6}));
    let ySrc = top, yDst = top, labelBottom = top - 60;
    parts.forEach(p => {
      const h = sy(p.value);
      if (h > 0) {
        g.push(curveRibbon(44, ySrc, ySrc + h, 560, yDst, yDst + h, p.color, 0.55));
        g.push(box(0, ySrc, 44, h, {fill: p.color, stroke: 'none', lineWidth: 0, r: 0}));
        g.push(box(560, yDst, 44, h, {fill: p.color, stroke: 'none', lineWidth: 0, r: 6}));
      } else g.push(line(560, yDst, 604, yDst, {stroke: p.color, lineWidth: 3}));
      // Labels never overlap: each block sits at its bar or below the previous label, with a guide line.
      const desired = yDst + Math.max(h, 0) / 2, ly = Math.max(desired, labelBottom + 30);
      if (ly - desired > 4) g.push(line(606, desired, 616, ly, {stroke: T.line, lineWidth: 1}));
      g.push(txt(620, ly - 12, p.label, {size: 21, weight: 'bold', width: W - 622}), txt(620, ly + 14, `${fmt(p.value)} · ${fmt(Math.round(p.value / total * 1000) / 10)}%`, {size: 19, mono: true, color: T.muted, width: W - 622}));
      labelBottom = ly + 26;
      ySrc += h; yDst += Math.max(h, 8) + gap;
    });
    g.height = Math.max(top + 520 + 46, labelBottom + 10);
    return g;
  };

  draw['bullet'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(136, (DRAW - 90) / n), left = 230, right = W - 20;
    d.items.forEach((item, i) => {
      const y = i * rowH + 30, on = hi === i, o = fade(hi, i), sx = v => left + (right - left) * v / item.max, h = 48;
      g.push(txt(0, y + h / 2 - 14, item.label, {size: 23, weight: 'bold', width: 210, opacity: o, color: on ? T.accent : T.ink}));
      g.push(txt(0, y + h / 2 + 16, `of max ${fmt(item.max)} ${d.unit}`, {size: 19, mono: true, color: T.muted, width: 210, opacity: o}));
      const bands = [[0, item.bands[0], T.line], [item.bands[0], item.bands[1], T.surface], [item.bands[1], item.max, T.background]];
      bands.forEach(([a, b, fill]) => g.push(box(sx(a), y, sx(b) - sx(a), h, {fill, stroke: T.line, lineWidth: 1, r: 0, opacity: o})));
      g.push(box(sx(0), y + 14, Math.max(2, sx(item.value) - sx(0)), h - 28, {fill: on ? T.accent : T.accent2, stroke: 'none', lineWidth: 0, r: 3, opacity: o}));
      g.push(line(sx(item.target), y - 8, sx(item.target), y + h + 8, {stroke: T.ink, lineWidth: 4, opacity: o}));
      const tx = sx(item.target), tAlign = tx > right - 110 ? 'right' : tx < left + 110 ? 'left' : 'center';
      g.push(txt(tAlign === 'right' ? tx + 4 : tAlign === 'left' ? tx - 4 : tx, y - 22, `target ${fmt(item.target)}`, {size: 19, mono: true, align: tAlign, color: T.muted, opacity: o}));
      const vx = sx(item.value), vAlign = vx > right - 110 ? 'right' : 'left';
      g.push(txt(vAlign === 'right' ? vx - 8 : vx + 8, y + h + 24, `${fmt(item.value)} ${d.unit}`, {size: 19, mono: true, align: vAlign, opacity: o}));
    });
    const ly = n * rowH + 40;
    [[T.line, 'below first band'], [T.surface, 'between bands'], [T.background, 'above second band']].forEach(([fill, label], i) => { g.push(box(i * 270, ly - 12, 24, 24, {fill, stroke: T.line, lineWidth: 1, r: 4}), txt(i * 270 + 34, ly, label, {size: 19, color: T.muted})); });
    g.push(txt(0, ly + 40, 'Bar = value, tick = target. Bands are the thresholds you declared, not a judgment.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = ly + 96;
    return g;
  };


  // ---- batch 3: AI and software ----------------------------------------
  const kindTone = {request: () => T.accent2, response: () => T.accent, tool: () => T.extra, note: () => T.muted,
    system: () => T.accent2, history: () => T.muted, retrieved: () => T.accent, input: () => T.ink, output: () => T.warn,
    instruction: () => T.accent, example: () => T.extra, format: () => T.warn,
    idle: () => T.muted, working: () => T.accent2, done: () => T.accent, blocked: () => T.warn,
    major: () => T.warn, minor: () => T.accent, patch: () => T.accent2,
    supported: () => T.accent, unsupported: () => T.warn, partial: () => T.extra};
  const kindIcon = {supported: 'circle-check', unsupported: 'x', partial: 'pause', idle: 'clock', working: 'activity', done: 'circle-check', blocked: 'pause'};

  draw['sequence'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active'), n = d.roles.length, colW = W / n, cx = i => i * colW + colW / 2, rowH = 72, top = 110;
    d.roles.forEach((role, i) => { g.push(box(i * colW + 10, 0, colW - 20, 56, {stroke: T.line}), txt(cx(i), 28, role, {size: 22, weight: 'bold', align: 'center', width: colW - 32})); g.push(line(cx(i), 60, cx(i), top + d.messages.length * rowH, {stroke: T.line, lineWidth: 2, dash: [6, 6]})); });
    d.messages.forEach((m, i) => {
      const y = top + i * rowH + 30, on = active === i, o = fade(active, i), color = on ? T.accent : kindTone[m.kind](), x1 = cx(m.from), x2 = cx(m.to), dir = Math.sign(x2 - x1);
      g.push(...arrow(x1 + dir * 14, y, x2 - dir * 14, y, {stroke: color, lineWidth: on ? 4 : 3, dash: m.kind === 'note' ? [6, 6] : undefined, opacity: o}));
      const lw = Math.max(Math.abs(x2 - x1) - 24, 330), lx = Math.min(Math.max((x1 + x2) / 2, lw / 2), W - lw / 2);
      g.push(txt(lx, y - 22, m.label, {size: 20, align: 'center', width: lw, color: on ? T.accent : T.ink, opacity: o}));
    });
    g.push(txt(0, top + d.messages.length * rowH + 30, 'Time flows downward. Arrows are messages, not durations.', {size: 20, color: T.muted, width: W}));
    g.height = top + d.messages.length * rowH + 50;
    return g;
  };

  draw['context-window'] = c => {
    const g = [], d = c.data, used = c.derived.used, overflow = c.derived.overflow, scaleMax = Math.max(d.capacity, used), sx = v => W * v / scaleMax, y = 70, h = 84;
    g.push(txt(0, 20, 'CONTEXT WINDOW, IN ORDER', {size: 19, weight: 'bold', color: T.muted}), txt(W, 20, `${fmt(used)} of ${fmt(d.capacity)} ${d.unit}`, {size: 22, mono: true, align: 'right', color: overflow ? T.warn : T.ink}));
    g.push(box(0, y, W, h, {fill: T.surface, stroke: T.line, r: 8}));
    let x = 0;
    d.segments.forEach(seg => {
      const w = sx(seg.tokens), beyond = x + w > sx(d.capacity) + 0.5;
      if (w > 0) g.push(box(x, y, Math.max(w - 2, 1), h, {fill: kindTone[seg.kind](), stroke: 'none', lineWidth: 0, r: 4, opacity: beyond ? 0.35 : 1}));
      if (w > 120) g.push(txt(x + w / 2, y + h / 2, seg.label, {size: 20, weight: 'bold', align: 'center', color: T.background, width: w - 12}));
      x += w;
    });
    const capX = Math.min(sx(d.capacity), W - 2);
    g.push(line(capX, y - 14, capX, y + h + 14, {stroke: overflow ? T.warn : T.ink, lineWidth: 4}));
    g.push(txt(Math.min(capX, W - 8), y + h + 34, 'capacity', {size: 19, mono: true, align: capX > W - 120 ? 'right' : 'center', color: overflow ? T.warn : T.muted}));
    let ly = y + h + 80;
    d.segments.forEach(seg => {
      g.push(box(0, ly - 12, 24, 24, {fill: kindTone[seg.kind](), stroke: 'none', lineWidth: 0, r: 5}));
      g.push(txt(38, ly, seg.label, {size: 22, width: 360}), txt(420, ly, seg.kind, {size: 19, mono: true, color: T.muted}), txt(W, ly, `${fmt(seg.tokens)} ${d.unit}`, {size: 21, mono: true, align: 'right'}));
      ly += 44;
    });
    g.push(txt(0, ly + 8, overflow ? `Over by ${fmt(overflow)} ${d.unit}: the dimmed tail is evicted or truncated first.` : 'Order matters: the last segments are the first to be cut when the window is full.', {size: 20, color: overflow ? T.warn : T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = ly + 66;
    return g;
  };

  draw['confusion'] = c => {
    const g = [], d = c.data, cw = 280, ch = 170, left = 224, top = 90;
    const cells = [[d.tp, 'TP', 'true positive', T.accent, 1], [d.fp, 'FP', 'false positive', T.warn, 0.5], [d.fn, 'FN', 'false negative', T.warn, 0.5], [d.tn, 'TN', 'true negative', T.accent2, 1]];
    g.push(txt(left + cw, 26, 'PREDICTED', {size: 19, weight: 'bold', color: T.muted, align: 'center'}), txt(left + cw / 2, 60, d.positive, {size: 22, align: 'center', width: cw - 20}), txt(left + cw * 1.5, 60, d.negative, {size: 22, align: 'center', width: cw - 20}));
    g.push(txt(20, top + ch, 'ACTUAL', {size: 19, weight: 'bold', color: T.muted}), txt(20, top + ch / 2, d.positive, {size: 22, width: 190}), txt(20, top + ch * 1.5, d.negative, {size: 22, width: 190}));
    cells.forEach(([value, code, name, color, opacity], i) => {
      const x = left + (i % 2) * cw, y = top + Math.floor(i / 2) * ch;
      g.push(box(x + 4, y + 4, cw - 8, ch - 8, {fill: color, stroke: 'none', lineWidth: 0, r: 10, opacity: opacity * 0.9}));
      g.push(txt(x + cw / 2, y + ch / 2 - 18, fmt(value), {size: 44, weight: 'bold', mono: true, align: 'center', color: T.background}));
      g.push(txt(x + cw / 2, y + ch / 2 + 30, `${code} · ${name}`, {size: 19, align: 'center', color: T.background, width: cw - 24}));
    });
    const p = c.derived.precision, r = c.derived.recall, fmtp = v => v === null ? 'n/a (no denominator)' : `${fmt(Math.round(v * 1000) / 10)}%`;
    const by = top + 2 * ch + 40;
    g.push(box(0, by, W, 96, {stroke: T.line}), txt(24, by + 30, `precision = TP / (TP + FP) = ${fmtp(p)}`, {size: 22, mono: true, width: W - 48}), txt(24, by + 66, `recall = TP / (TP + FN) = ${fmtp(r)} · n = ${fmt(c.derived.n)}`, {size: 22, mono: true, width: W - 48}));
    g.height = by + 96;
    return g;
  };

  draw['claims'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(150, (DRAW - 20) / n);
    d.items.forEach((item, i) => {
      const y = i * rowH, on = hi === i, o = fade(hi, i), color = kindTone[item.verdict]();
      g.push(box(0, y, W, rowH - 14, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push(txt(24, y + 22, item.claim, {size: 23, vAlign: 'top', width: 560, wrap: true, opacity: o}));
      g.push(txt(24, y + rowH - 44, 'source · ' + item.source, {size: 19, mono: true, color: T.muted, width: 560, opacity: o}));
      g.push(...dot(W - 150, y + (rowH - 14) / 2 - 20, kindIcon[item.verdict], color, 18, o), txt(W - 150, y + (rowH - 14) / 2 + 20, item.verdict, {size: 19, weight: 'bold', align: 'center', color, opacity: o}));
    });
    g.push(txt(0, n * rowH + 4, 'Verdicts were assigned by the reviewer named in the source; the graphic does not verify claims.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = n * rowH + 62;
    return g;
  };

  draw['guardrails'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.layers.length, endW = 100, gap = 26, boxW = (W - 2 * endW - (n + 1) * gap) / n, y = 120, h = 120;
    g.push(box(0, y, endW, h, {stroke: T.accent2}), txt(endW / 2, y + h / 2, d.input, {size: 21, weight: 'bold', align: 'center', width: endW - 16, wrap: true}));
    let x = endW + gap;
    d.layers.forEach((layer, i) => {
      const on = hi === i, o = fade(hi, i);
      g.push(...arrow(x - gap + 4, y + h / 2, x - 6, y + h / 2, {stroke: T.line}));
      g.push(box(x, y, boxW, h, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, opacity: o}), glyph(x + boxW / 2 - 15, y + 14, 'shield-check', 30, o));
      g.push(txt(x + boxW / 2, y + 78, layer.label, {size: 21, weight: 'bold', align: 'center', width: boxW - 12, wrap: true, opacity: o, color: on ? T.accent : T.ink}));
      g.push(line(x + boxW / 2, y + h + 4, x + boxW / 2, y + h + 30, {stroke: T.line, lineWidth: 2}));
      g.push(txt(x + boxW / 2, y + h + 40, 'catches: ' + layer.catches, {size: 19, align: 'center', vAlign: 'top', color: T.muted, width: boxW + gap - 6, wrap: true, opacity: o}));
      x += boxW + gap;
    });
    g.push(...arrow(x - gap + 4, y + h / 2, x - 6, y + h / 2, {stroke: T.line}));
    g.push(box(x, y, endW, h, {stroke: T.accent}), txt(x + endW / 2, y + h / 2, d.output, {size: 21, weight: 'bold', align: 'center', width: endW - 16, wrap: true}));
    g.push(txt(0, y + h + 130, 'Each layer stops a different class of problem. A layer that catches nothing still costs latency.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = y + h + 190;
    return g;
  };

  draw['embedding-map'] = c => {
    const g = [], d = c.data, size = 520, sx = v => 10 + v * (size - 20), sy = v => 10 + (1 - v) * (size - 20), q = d.query, neighbors = c.derived.neighbors;
    g.push(box(0, 0, size, size, {fill: T.background, stroke: T.line, r: 8}));
    neighbors.forEach(i => { const p = d.points[i]; g.push(line(sx(q.x), sy(q.y), sx(p.x), sy(p.y), {stroke: T.warn, lineWidth: 2, dash: [5, 5]})); });
    d.points.forEach((p, i) => {
      const near = neighbors.includes(i);
      g.push(circle(sx(p.x), sy(p.y), near ? 11 : 8, {fill: series()[p.group % 4], stroke: near ? T.warn : T.background, lineWidth: near ? 3 : 2}));
      if (p.label) g.push(txt(sx(p.x) + 14, sy(p.y), p.label, {size: 19, color: near ? T.ink : T.muted, width: 150}));
    });
    g.push(circle(sx(q.x), sy(q.y), 13, {fill: T.warn, stroke: T.ink, lineWidth: 3}), txt(sx(q.x) + 18, sy(q.y) - 18, q.label, {size: 21, weight: 'bold', color: T.warn, width: 160}));
    let ly = 30;
    d.groups.forEach((label, i) => { g.push(circle(560, ly, 9, {fill: series()[i % 4]}), txt(580, ly, label, {size: 21, width: W - 584})); ly += 40; });
    g.push(circle(560, ly, 9, {fill: T.warn, stroke: T.ink, lineWidth: 2}), txt(580, ly, `query · ${fmt(d.k)} nearest`, {size: 21, width: W - 584}));
    g.push(txt(560, ly + 60, 'Illustrative 2D projection. Nearest neighbors are computed from these coordinates only.', {size: 19, color: T.muted, width: W - 560, wrap: true, vAlign: 'top'}));
    g.height = size + 10;
    return g;
  };

  draw['prompt-anatomy'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.sections.length, rowH = Math.min(110, (DRAW - 70) / n);
    g.push(box(0, 0, W, 60 + n * rowH, {fill: T.background, stroke: T.line}), box(0, 0, W, 60, {stroke: T.line}), txt(24, 30, 'prompt', {size: 23, mono: true}), txt(W - 24, 30, `${n} sections`, {size: 19, mono: true, color: T.accent2, align: 'right'}));
    d.sections.forEach((sec, i) => {
      const y = 60 + i * rowH, on = hi === i, o = fade(hi, i), color = kindTone[sec.kind]();
      if (on) g.push(box(3, y + 4, W - 6, rowH - 8, {fill: T.surface, stroke: T.accent, r: 4}));
      g.push(box(20, y + 12, 6, rowH - 24, {fill: color, stroke: 'none', lineWidth: 0, r: 3, opacity: o}));
      g.push(txt(44, y + 26, sec.kind.toUpperCase(), {size: 19, weight: 'bold', color, opacity: o}), txt(200, y + 26, sec.label, {size: 21, weight: 'bold', width: W - 224, opacity: o}));
      g.push(txt(44, y + 48, sec.text, {size: 21, vAlign: 'top', width: W - 70, wrap: true, color: T.ink, opacity: o}));
    });
    g.height = 60 + n * rowH;
    return g;
  };

  draw['orchestration'] = c => {
    const g = [], d = c.data, n = d.workers.length, bw = Math.min(190, (W - (n - 1) * 20) / n), total = n * bw + (n - 1) * 20, x0 = (W - total) / 2, wy = 250;
    g.push(box(W / 2 - 160, 30, 320, 100, {stroke: T.accent2, lineWidth: 3}), ...dot(W / 2 - 112, 80, 'brain-circuit', T.accent2, 22), txt(W / 2 - 76, 66, 'ORCHESTRATOR', {size: 19, weight: 'bold', color: T.accent2}), txt(W / 2 - 76, 98, d.orchestrator, {size: 24, weight: 'bold', width: 220}));
    g.push(line(W / 2, 132, W / 2, 190, {stroke: T.line}), line(x0 + bw / 2, 190, x0 + total - bw / 2, 190, {stroke: T.line}));
    d.workers.forEach((w, i) => {
      const x = x0 + i * (bw + 20), cx = x + bw / 2, color = kindTone[w.status]();
      g.push(...arrow(cx, 190, cx, wy - 6, {stroke: w.status === 'blocked' ? T.warn : T.line}));
      g.push(box(x, wy, bw, 160, {stroke: w.status === 'blocked' ? T.warn : T.line}), ...dot(cx, wy + 34, kindIcon[w.status], color, 18));
      g.push(txt(cx, wy + 64, w.label, {size: 21, weight: 'bold', align: 'center', width: bw - 12}), txt(cx, wy + 84, w.task, {size: 19, align: 'center', vAlign: 'top', color: T.muted, width: bw - 10, wrap: true}), txt(cx, wy + 146, w.status, {size: 19, mono: true, align: 'center', color}));
      g.push(line(cx, wy + 162, cx, wy + 200, {stroke: T.line, lineWidth: 2, dash: [4, 4]}));
    });
    g.push(box(0, wy + 204, W, 70, {stroke: T.accent, dash: [10, 8], fill: T.background}), glyph(20, wy + 224, 'database', 30), txt(64, wy + 239, `Shared state: ${d.shared}`, {size: 22, width: W - 90}));
    g.push(txt(0, wy + 300, 'Workers read and write the shared state; the orchestrator assigns and checks, it does not do the work.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = wy + 360;
    return g;
  };

  draw['event-bus'] = c => {
    const g = [], d = c.data, rowBox = (labels, y, dir) => {
      const n = labels.length, bw = Math.min(200, (W - (n - 1) * 20) / n), total = n * bw + (n - 1) * 20, x0 = (W - total) / 2;
      labels.forEach((label, i) => { const x = x0 + i * (bw + 20), cx = x + bw / 2; g.push(box(x, y, bw, 64, {stroke: T.line}), txt(cx, y + 32, label, {size: 21, weight: 'bold', align: 'center', width: bw - 16})); if (dir > 0) g.push(...arrow(cx, y + 68, cx, 240 - 6, {stroke: T.accent2})); else g.push(...arrow(cx, 354, cx, y - 6, {stroke: T.accent})); });
    };
    rowBox(d.publishers, 60, 1);
    g.push(box(0, 240, W, 110, {fill: T.surface, stroke: T.accent2, lineWidth: 3, r: 12}), txt(24, 268, `topic · ${d.topic}`, {size: 21, mono: true, weight: 'bold', width: W - 48}));
    let ex = 24;
    d.events.forEach(ev => { const w = ev.length * 12 + 30; g.push(...chip(ex, 316, ev, T.accent2, {width: w})); ex += w + 10; });
    rowBox(d.subscribers, 400, -1);
    g.push(txt(0, 500, 'Publishers do not know the subscribers. Every subscriber receives every event on the topic.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = 560;
    return g;
  };

  draw['lanes'] = c => {
    const g = [], d = c.data, total = c.derived.total, left = 160, right = W - 16, sx = v => left + (right - left) * v / total, rowH = 96, top = 30, n = d.lanes.length;
    if (d.lock) { const a = sx(d.lock.start), b = sx(d.lock.end); g.push(box(a, top - 4, b - a, n * rowH + 8, {fill: T.warn, stroke: 'none', lineWidth: 0, r: 4, opacity: 0.18})); g.push(txt((a + b) / 2, top - 16, d.lock.label, {size: 19, weight: 'bold', align: 'center', color: T.warn})); }
    d.lanes.forEach((lane, i) => {
      const y = top + i * rowH;
      g.push(line(left, y + rowH, right, y + rowH, {stroke: T.line, lineWidth: 1}));
      g.push(txt(0, y + rowH / 2, lane.label, {size: 22, weight: 'bold', width: left - 16}));
      lane.spans.forEach((span, k) => {
        const x1 = sx(span.start), x2 = sx(span.end), w = Math.max(6, x2 - x1);
        g.push(box(x1, y + 26, w, 44, {fill: series()[i % 4], stroke: 'none', lineWidth: 0, r: 6}));
        if (w > 110) g.push(txt(x1 + w / 2, y + 48, span.label, {size: 19, mono: true, align: 'center', color: T.background, width: w - 10}));
        else g.push(txt(Math.min(Math.max(x1 + w / 2, left + 50), right - 50), k % 2 ? y + 84 : y + 12, span.label, {size: 19, mono: true, align: 'center', color: T.ink, width: 100}));
      });
    });
    axisTicks(g, left, right, top + n * rowH + 12, 0, total, d.unit, 0);
    g.push(txt(0, top + n * rowH + 90, 'Lanes run in parallel; a shaded region is time spent holding a shared lock.', {size: 20, color: T.muted, width: W}));
    g.height = top + n * rowH + 110;
    return g;
  };

  draw['dag'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), levels = c.derived.levels, bw = 170, bh = 60, colX = l => levels === 1 ? W / 2 - bw / 2 : l * (W - bw) / (levels - 1);
    const byLevel = {}; d.nodes.forEach((n, i) => (byLevel[n.level] ||= []).push(i));
    const pos = {};
    Object.entries(byLevel).forEach(([level, ids]) => { const step = Math.min(120, (DRAW - 140 - bh) / Math.max(1, ids.length - 1)), top = (DRAW - 90 - (ids.length - 1) * step - bh) / 2; ids.forEach((id, k) => { pos[id] = [colX(Number(level)), top + k * step]; }); });
    d.edges.forEach(e => { const [x1, y1] = pos[e.from], [x2, y2] = pos[e.to], on = hi === e.to || hi === e.from; g.push({type: 'bezierCurve', silent: true, shape: {x1: x1 + bw, y1: y1 + bh / 2, cpx1: x1 + bw + 60, cpy1: y1 + bh / 2, cpx2: x2 - 60, cpy2: y2 + bh / 2, x2: x2 - 6, y2: y2 + bh / 2}, style: {stroke: on ? T.accent : T.line, lineWidth: on ? 4 : 2, fill: 'none'}}); });
    d.nodes.forEach((n, i) => { const [x, y] = pos[i], on = hi === i; g.push(box(x, y, bw, bh, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, fill: on ? T.surface : T.background}), txt(x + bw / 2, y + bh / 2, n.label, {size: 21, weight: 'bold', align: 'center', width: bw - 16, color: on ? T.accent : T.ink})); });
    g.push(txt(0, DRAW - 70, 'Edges point from dependency to dependent. A change flows right; a highlighted node shows its blast radius.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = DRAW;
    return g;
  };

  draw['diff'] = c => {
    const g = [], d = c.data, active = stateOf(c, 'active_line'), n = d.lines.length, rowH = 50;
    g.push(...panel(76 + n * rowH, d.file, `+${c.derived.added} -${c.derived.removed}`));
    d.lines.forEach((l, i) => {
      const y = 68 + i * rowH + rowH / 2, on = active === i;
      if (l.kind !== 'context') g.push(box(3, y - rowH / 2, W - 6, rowH, {fill: l.kind === 'added' ? T.accent : T.warn, stroke: 'none', lineWidth: 0, r: 0, opacity: 0.16}));
      if (on) g.push(box(3, y - rowH / 2, W - 6, rowH, {fill: 'none', stroke: T.accent, lineWidth: 2, r: 4}));
      const sign = l.kind === 'added' ? '+' : l.kind === 'removed' ? '-' : ' ', color = l.kind === 'added' ? T.accent : l.kind === 'removed' ? T.warn : T.muted;
      g.push(txt(24, y, sign, {size: 24, mono: true, weight: 'bold', color}), txt(56, y, l.text, {size: 24, mono: true, color: l.kind === 'context' ? T.muted : T.ink, width: W - 80}));
    });
    g.height = 76 + n * rowH;
    return g;
  };

  draw['pyramid'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.layers.length, lh = Math.min(130, (DRAW - 90) / n), base = 540, shrink = (base - 220) / n, cx = 280;
    d.layers.forEach((layer, i) => {
      const on = hi === i, o = fade(hi, i), wTop = base - shrink * (i + 1), wBottom = base - shrink * i, y = (n - 1 - i) * lh + 20;
      g.push({type: 'polygon', silent: true, shape: {points: [[cx - wBottom / 2, y + lh - 6], [cx + wBottom / 2, y + lh - 6], [cx + wTop / 2, y], [cx - wTop / 2, y]]}, style: {fill: series()[i % 4], stroke: on ? T.ink : 'none', lineWidth: on ? 3 : 0, opacity: o}});
      g.push(txt(cx, y + lh / 2 - 16, layer.label, {size: 22, weight: 'bold', align: 'center', color: T.background, width: wTop - 16, opacity: o}));
      g.push(txt(cx, y + lh / 2 + 14, fmt(layer.count), {size: 21, mono: true, align: 'center', color: T.background, width: wTop - 12, opacity: o}));
      g.push(line(cx + wBottom / 2 + 6, y + lh / 2, 580, y + lh / 2, {stroke: T.line, lineWidth: 1, dash: [4, 4], opacity: o}));
      g.push(txt(592, y + lh / 2, layer.note, {size: 20, color: on ? T.ink : T.muted, width: W - 592, wrap: true, opacity: o}));
    });
    g.push(txt(0, n * lh + 40, 'Widths are the conventional pyramid shape. The counts are the data.', {size: 20, color: T.muted, width: W}));
    g.height = n * lh + 60;
    return g;
  };

  draw['versions'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.tags.length, left = 70, right = W - 70, step = (right - left) / Math.max(1, n - 1), y = 170;
    g.push(line(left - 40, y, right + 40, y, {stroke: T.line, lineWidth: 3}));
    d.tags.forEach((tag, i) => {
      const x = left + i * step, on = hi === i, o = fade(hi, i), color = kindTone[tag.kind](), labelW = Math.min(200, step - 8);
      g.push(circle(x, y, on ? 16 : 12, {fill: color, stroke: on ? T.ink : T.background, lineWidth: 3, opacity: o}));
      g.push(txt(x, y - 44, tag.label, {size: 22, weight: 'bold', align: 'center', width: labelW, color: on ? T.accent : T.ink, opacity: o}));
      g.push(txt(x, y + 40, tag.date, {size: 19, mono: true, align: 'center', color: T.muted, width: labelW, opacity: o}));
      g.push(txt(x, y + 66, tag.note, {size: 19, align: 'center', vAlign: 'top', width: labelW, wrap: true, color: T.muted, opacity: o}));
    });
    const ly = y + 150;
    [['major', 'breaking'], ['minor', 'features'], ['patch', 'fixes']].forEach(([k, label], i) => { g.push(circle(14 + i * 200, ly, 10, {fill: kindTone[k]()}), txt(34 + i * 200, ly, `${k} · ${label}`, {size: 20, color: T.muted})); });
    g.push(txt(0, ly + 40, 'Spacing is even, not to scale. Dates are labels.', {size: 20, color: T.muted, width: W}));
    g.height = ly + 60;
    return g;
  };

  draw['trust-boundary'] = c => {
    const g = [], d = c.data, zoneW = 360, mid = W / 2, top = 0, zoneH = 110 + Math.max(d.inside.items.length, d.outside.items.length) * 40, crossTop = zoneH + 40;
    const zone = (z, x, stroke, dash) => { g.push(box(x, top, zoneW, zoneH, {stroke, dash, lineWidth: 2})); g.push(txt(x + 20, top + 30, z.label.toUpperCase(), {size: 19, weight: 'bold', color: stroke, width: zoneW - 40})); z.items.forEach((item, i) => g.push(txt(x + 20, top + 74 + i * 40, item, {size: 22, width: zoneW - 40}))); };
    zone(d.inside, 0, T.accent2); zone(d.outside, W - zoneW, T.muted, [10, 8]);
    g.push(line(mid, top, mid, crossTop + d.crossings.length * 90, {stroke: T.warn, lineWidth: 3, dash: [12, 8]}), txt(mid, crossTop + d.crossings.length * 90 + 22, 'trust boundary', {size: 19, weight: 'bold', align: 'center', color: T.warn}));
    d.crossings.forEach((cr, i) => {
      const y = crossTop + i * 90 + 40, inward = cr.direction === 'in', x1 = inward ? W - 40 : 40, x2 = inward ? 40 : W - 40, color = cr.guarded ? T.accent : T.warn;
      g.push(...arrow(x1, y, x2, y, {stroke: color, lineWidth: 3}));
      g.push(box(mid - 160, y - 46, 320, 30, {fill: T.background, stroke: 'none', lineWidth: 0, r: 0}), txt(mid, y - 31, cr.label, {size: 20, align: 'center', width: 316}));
      g.push(...dot(mid, y, cr.guarded ? 'lock' : 'triangle-alert', color, 16));
    });
    g.push(txt(0, crossTop + d.crossings.length * 90 + 50, 'Every crossing is either guarded (checked at the boundary) or a risk to name.', {size: 20, color: T.muted, width: W}));
    g.height = crossTop + d.crossings.length * 90 + 70;
    return g;
  };


  // ---- batch 4: the ten kinds proposed in the catalog ----------------------
  const memoryTone = {stored: () => T.accent, recalled: () => T.accent2, updated: () => T.extra, forgotten: () => T.warn};
  const memoryIcon = {stored: 'database', recalled: 'search', updated: 'activity', forgotten: 'x'};
  const typeTone = {string: () => T.accent2, number: () => T.accent, boolean: () => T.extra, array: () => T.accent2, object: () => T.extra, enum: () => T.warn};

  draw['memory-timeline'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), left = 40, right = W - 40, y = 300, sx = t => left + (right - left) * (t - 1) / Math.max(1, d.turns - 1);
    g.push(line(left, y, right, y, {stroke: T.line, lineWidth: 3}));
    for (let t = 1; t <= d.turns; t++) g.push(line(sx(t), y - 8, sx(t), y + 8, {stroke: T.line, lineWidth: 2}), txt(sx(t), y + 30, d.turns > 8 ? String(t) : 'turn ' + t, {size: 19, mono: true, align: 'center', color: T.muted}));
    // Labels alternate above and below the line; stacked when several events share a turn.
    const used = {};
    d.events.forEach((ev, i) => {
      const on = hi === i, o = fade(hi, i), color = memoryTone[ev.kind](), x = sx(ev.turn), slot = (used[ev.turn] = (used[ev.turn] || 0) + 1);
      const above = i % 2 === 0, level = Math.floor((i % 4) / 2) + (slot - 1), dy = 70 + level * 64, ly = above ? y - dy : y + dy + 30;
      g.push(line(x, y, x, above ? ly + 26 : ly - 26, {stroke: color, lineWidth: 2, dash: [4, 4], opacity: o}));
      g.push(...dot(x, y, memoryIcon[ev.kind], color, on ? 18 : 14, o));
      const lx = Math.min(Math.max(x, 130), W - 130);
      g.push(txt(lx, ly, ev.label, {size: 21, weight: 'bold', align: 'center', width: 250, color: on ? T.accent : T.ink, opacity: o}));
      g.push(txt(lx, ly + (above ? 24 : -24), ev.kind, {size: 19, mono: true, align: 'center', color, opacity: o}));
    });
    let lx = 0; const ly = 560;
    Object.keys(memoryTone).forEach(k => { g.push(...dot(lx + 12, ly, memoryIcon[k], memoryTone[k](), 12), txt(lx + 34, ly, k, {size: 20, color: T.muted})); lx += 200; });
    g.push(txt(0, ly + 34, (d.turns > 8 ? 'Axis numbers are turns. ' : '') + 'What the agent kept between turns; forgotten items are gone from later turns.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = ly + 90;
    return g;
  };

  draw['eval-scorecard'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.suites.length, rowH = Math.min(96, (DRAW - 120) / n), left = 230, right = W - 230, sx = v => left + (right - left) * v / 100;
    g.push(txt(0, 20, 'SUITE', {size: 19, weight: 'bold', color: T.muted}), txt(right, 20, `threshold ${fmt(d.threshold)}`, {size: 19, mono: true, align: 'right', color: T.warn}));
    d.suites.forEach((s, i) => {
      const y = 60 + i * rowH, on = hi === i, o = fade(hi, i), pass = c.derived.passed[i], delta = c.derived.deltas[i], color = pass ? T.accent : T.warn;
      g.push(txt(0, y + rowH / 2, s.label, {size: 22, weight: 'bold', width: left - 20, color: on ? T.accent : T.ink, opacity: o}));
      g.push(box(left, y + rowH / 2 - 16, right - left, 32, {fill: T.surface, stroke: T.line, r: 6, opacity: o}));
      g.push(box(left, y + rowH / 2 - 16, Math.max(2, sx(s.score) - left), 32, {fill: color, stroke: 'none', lineWidth: 0, r: 6, opacity: o}));
      g.push(txt(right + 12, y + rowH / 2, fmt(s.score), {size: 22, mono: true, weight: 'bold', color, opacity: o}));
      if (delta !== null) g.push(...chip(W, y + rowH / 2, (delta > 0 ? '+' : '') + fmt(delta), delta >= 0 ? T.accent2 : T.warn, {align: 'right', opacity: o}));
      else g.push(txt(W, y + rowH / 2, 'no prior run', {size: 19, mono: true, align: 'right', color: T.muted, opacity: o}));
    });
    const ty = sx(d.threshold);
    g.push(line(ty, 50, ty, 60 + n * rowH, {stroke: T.warn, lineWidth: 3, dash: [8, 6]}));
    g.push(txt(0, 60 + n * rowH + 30, `${c.derived.passed.filter(Boolean).length} of ${n} suites at or above the threshold; chips show the change from the previous run.`, {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = 60 + n * rowH + 90;
    return g;
  };

  draw['tool-schema'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.params.length, rowH = 76;
    g.push(...panel(110 + n * rowH + 60, d.name + '(...)', `${fmt(c.derived.required)} required`));
    g.push(txt(24, 86, d.description, {size: 21, color: T.muted, width: W - 48}));
    d.params.forEach((p, i) => {
      const y = 120 + i * rowH, on = hi === i, o = fade(hi, i);
      if (on) g.push(box(3, y - 4, W - 6, rowH - 4, {fill: T.surface, stroke: T.accent, r: 4}));
      g.push(line(24, y + rowH - 6, W - 24, y + rowH - 6, {stroke: T.line, lineWidth: 1}));
      g.push(circle(36, y + rowH / 2 - 2, 7, {fill: p.required ? T.warn : T.line}));
      g.push(txt(60, y + rowH / 2 - 2, p.name, {size: 23, mono: true, weight: 'bold', width: 220, opacity: o}));
      g.push(...chip(300, y + rowH / 2 - 2, p.type, typeTone[p.type](), {opacity: o}));
      g.push(txt(430, y + rowH / 2 - 2, p.note, {size: 20, color: T.muted, width: W - 454, opacity: o}));
    });
    const ly = 120 + n * rowH + 20;
    g.push(circle(36, ly, 7, {fill: T.warn}), txt(52, ly, 'required', {size: 19, color: T.muted}), circle(170, ly, 7, {fill: T.line}), txt(186, ly, 'optional', {size: 19, color: T.muted}));
    g.height = 110 + n * rowH + 60;
    return g;
  };

  draw['latency-breakdown'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), total = c.derived.total, y = 60, h = 72;
    g.push(txt(0, 20, 'ONE REQUEST, STAGE BY STAGE', {size: 19, weight: 'bold', color: T.muted}), txt(W, 20, `${fmt(total)} ${d.unit} total`, {size: 22, mono: true, align: 'right'}));
    let x = 0;
    d.stages.forEach((s, i) => {
      const w = W * c.derived.share[i], on = hi === i, o = fade(hi, i);
      if (w > 0) g.push(box(x, y, Math.max(1, w - 2), h, {fill: series()[i % 4], stroke: on ? T.ink : 'none', lineWidth: on ? 3 : 0, r: 4, opacity: o}));
      if (w > 120) g.push(txt(x + w / 2, y + h / 2, s.label, {size: 20, weight: 'bold', align: 'center', color: T.background, width: w - 12, opacity: o}));
      x += w;
    });
    d.stages.forEach((s, i) => {
      const ry = y + h + 50 + i * 46, on = hi === i, o = fade(hi, i);
      g.push(box(0, ry - 12, 24, 24, {fill: series()[i % 4], stroke: 'none', lineWidth: 0, r: 5, opacity: o}));
      g.push(txt(38, ry, s.label, {size: 22, width: 330, color: on ? T.accent : T.ink, opacity: o}), txt(520, ry, `${fmt(s.value)} ${d.unit}`, {size: 21, mono: true, align: 'right', opacity: o}));
      g.push(txt(W, ry, `${fmt(Math.round(c.derived.share[i] * 1000) / 10)}%`, {size: 21, mono: true, align: 'right', color: T.muted, opacity: o}));
    });
    const ly = y + h + 50 + d.stages.length * 46;
    g.push(txt(0, ly + 6, 'Stages run in sequence; the widest segment is where the time goes. Small stages keep their real width.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = ly + 62;
    return g;
  };

  draw['sliding-window'] = c => {
    const g = [], d = c.data, start = c.derived.start, span = d.window * 1.6, left = 20, right = W - 20, y = 300;
    const sx = t => left + (right - left) * (t - (d.now - span)) / span;
    const wx = Math.max(left, sx(start));
    g.push(box(wx, y - 90, sx(d.now) - wx, 180, {fill: T.surface, stroke: T.accent2, dash: [8, 6], r: 8}));
    g.push(txt(wx + 12, y - 66, `window · last ${fmt(d.window)} ${d.unit}`, {size: 19, mono: true, color: T.accent2}));
    g.push(line(left, y, right, y, {stroke: T.line, lineWidth: 3}));
    [0, 0.5, 1].forEach(f => { const t = d.now - span + span * f, x = sx(t); g.push(line(x, y + 8, x, y + 16, {stroke: T.line, lineWidth: 2}), txt(x, y + 40, f === 1 ? 'now' : `-${fmt(Math.round((d.now - t) * 100) / 100)} ${d.unit}`, {size: 19, mono: true, align: f === 1 ? 'right' : f === 0 ? 'left' : 'center', color: T.muted})); });
    let lastX = -99, stack = 0;
    d.events.forEach(t => {
      if (t < d.now - span) return;
      const x = sx(t), inside = t > start; stack = x - lastX < 18 ? stack + 1 : 0; lastX = x;
      g.push(circle(x, y - stack * 22, 9, {fill: inside ? T.accent : T.muted, stroke: T.background, lineWidth: 2}));
    });
    const okay = c.derived.allowed;
    g.push(txt(0, 430, `${fmt(c.derived.in_window)} of ${fmt(d.limit)} allowed in the window`, {size: 26, weight: 'bold', color: okay ? T.accent : T.warn}));
    g.push(...chip(W, 430, okay ? 'NEXT REQUEST ALLOWED' : 'NEXT REQUEST DENIED', okay ? T.accent : T.warn, {align: 'right', width: 290}));
    g.push(txt(0, 490, 'Only events inside the window count; older events drop out as the window slides forward.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = 540;
    return g;
  };

  draw['retry-budget'] = c => {
    const g = [], d = c.data, maxv = Math.max(d.requests, d.retries, c.derived.allowed) || 1, left = 200, right = W - 40, sx = v => left + (right - left) * v / maxv;
    g.push(txt(0, 20, `window · ${d.window}`, {size: 19, mono: true, color: T.muted}));
    const row = (y, label, value, color) => {
      g.push(txt(0, y + 24, label, {size: 22, weight: 'bold', width: left - 16}));
      g.push(box(left, y, right - left, 48, {fill: T.surface, stroke: T.line, r: 6}), box(left, y, Math.max(2, sx(value) - left), 48, {fill: color, stroke: 'none', lineWidth: 0, r: 6}));
      g.push(txt(right, y + 24, fmt(value), {size: 22, mono: true, weight: 'bold', align: 'right', color: T.background}));
      if (sx(value) - left < 90) g.push(txt(sx(value) + 10, y + 24, fmt(value), {size: 22, mono: true, weight: 'bold', color: T.ink}));
    };
    row(70, 'requests', d.requests, T.accent2);
    row(150, 'retries', d.retries, c.derived.within ? T.accent : T.warn);
    const bx = sx(c.derived.allowed);
    g.push(line(bx, 136, bx, 212, {stroke: T.warn, lineWidth: 3, dash: [6, 5]}), txt(Math.min(Math.max(bx, 90), W - 100), 236, `budget ${fmt(d.budget_percent)}% = ${fmt(Math.round(c.derived.allowed * 10) / 10)}`, {size: 19, mono: true, align: 'center', color: T.warn}));
    const ratio = Math.round(c.derived.ratio * 1000) / 10, load = Math.round(c.derived.load_factor * 100) / 100;
    g.push(box(0, 290, W, 140, {stroke: c.derived.within ? T.accent : T.warn, lineWidth: 3}));
    g.push(txt(24, 322, c.derived.within ? 'Within budget' : 'Over budget', {size: 26, weight: 'bold', color: c.derived.within ? T.accent : T.warn}));
    g.push(txt(24, 352, `retries are ${fmt(ratio)}% of requests · the service sees ${fmt(load)}x the client load`, {size: 21, mono: true, width: W - 48, wrap: true, vAlign: 'top'}));
    g.push(txt(0, 460, 'A retry budget caps retries as a share of requests so a slow dependency is not amplified into an outage.', {size: 20, color: T.muted, width: W, wrap: true, vAlign: 'top'}));
    g.height = 520;
    return g;
  };

  draw['heatmap'] = c => {
    const g = [], d = c.data, rows = d.rows.length, cols = d.columns.length, left = 170, top = 70, cw = Math.min(120, (W - left) / cols), ch = Math.min(96, (DRAW - top - 90) / rows), low = c.derived.low, high = c.derived.high, span = high - low || 1;
    d.columns.forEach((label, j) => g.push(txt(left + j * cw + cw / 2, top - 30, label, {size: 20, weight: 'bold', align: 'center', width: cw - 8, color: T.muted})));
    d.rows.forEach((label, i) => {
      g.push(txt(left - 16, top + i * ch + ch / 2, label, {size: 21, weight: 'bold', align: 'right', width: left - 24}));
      d.values[i].forEach((v, j) => {
        const f = (v - low) / span, x = left + j * cw, y = top + i * ch;
        g.push(box(x + 2, y + 2, cw - 4, ch - 4, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 6, opacity: 0.12 + 0.88 * f}));
        g.push(txt(x + cw / 2, y + ch / 2, fmt(v), {size: 22, mono: true, weight: 'bold', align: 'center', color: f > 0.55 ? T.background : T.ink}));
      });
    });
    const ly = top + rows * ch + 40;
    g.push(box(0, ly - 12, 24, 24, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 5, opacity: 0.12}), txt(34, ly, `${fmt(low)} ${d.unit}`, {size: 20, mono: true, color: T.muted}));
    g.push(box(240, ly - 12, 24, 24, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 5}), txt(274, ly, `${fmt(high)} ${d.unit}`, {size: 20, mono: true, color: T.muted}));
    g.push(txt(W, ly, 'shade = magnitude, numbers are the data', {size: 20, align: 'right', color: T.muted}));
    g.height = ly + 24;
    return g;
  };

  draw['slope'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), low = c.derived.low, high = c.derived.high, top = 70, bottom = 560, lx = 250, rx = W - 250, sy = v => bottom - (bottom - top) * (v - low) / (high - low);
    g.push(line(lx, top - 20, lx, bottom + 20, {stroke: T.line, lineWidth: 2}), line(rx, top - 20, rx, bottom + 20, {stroke: T.line, lineWidth: 2}));
    g.push(txt(lx, top - 44, d.left, {size: 21, weight: 'bold', align: 'center', color: T.muted}), txt(rx, top - 44, d.right, {size: 21, weight: 'bold', align: 'center', color: T.muted}));
    // Labels are pushed apart vertically so clustered values stay readable.
    const spread = (values, keyFn) => { const order = values.map((v, i) => [keyFn(v), i]).sort((a, b) => a[0] - b[0]); const out = []; let last = -99; order.forEach(([y, i]) => { const yy = Math.max(y, last + 30); out[i] = yy; last = yy; }); const over = Math.max(0, last - (bottom + 12)); return out.map(v => v - over); };
    const leftY = spread(d.items, it => sy(it.start)), rightY = spread(d.items, it => sy(it.end));
    d.items.forEach((it, i) => {
      const on = hi === i, o = fade(hi, i), up = it.end > it.start, same = it.end === it.start, color = on ? T.accent : same ? T.muted : up ? T.accent2 : T.warn;
      g.push(line(lx, sy(it.start), rx, sy(it.end), {stroke: color, lineWidth: on ? 4 : 3, opacity: o}));
      g.push(circle(lx, sy(it.start), 7, {fill: color, opacity: o}), circle(rx, sy(it.end), 7, {fill: color, opacity: o}));
      g.push(txt(lx - 16, leftY[i], `${it.label} · ${fmt(it.start)}`, {size: 20, align: 'right', width: 230, color: on ? T.accent : T.ink, opacity: o}));
      g.push(txt(rx + 16, rightY[i], `${fmt(it.end)} · ${it.label}`, {size: 20, width: 230, color: on ? T.accent : T.ink, opacity: o}));
    });
    g.push(txt(0, bottom + 60, `Values in ${d.unit}. Rising lines are the second color, falling lines the warning color.`, {size: 20, color: T.muted, width: W}));
    g.height = bottom + 80;
    return g;
  };

  draw['state-diff'] = c => {
    const g = [], d = c.data, n = d.fields.length, rowH = Math.min(70, (DRAW - 140) / n), mid = W / 2;
    g.push(...panel(76 + n * rowH + 40, d.record, `${fmt(c.derived.changed.filter(Boolean).length)} changed`));
    g.push(txt(196, 90, 'BEFORE', {size: 19, weight: 'bold', color: T.muted}), txt(mid + 110, 90, 'AFTER', {size: 19, weight: 'bold', color: T.muted}));
    d.fields.forEach((f, i) => {
      const y = 112 + i * rowH, changed = c.derived.changed[i], color = changed ? T.ink : T.muted;
      if (changed) g.push(box(186, y, mid - 196, rowH - 8, {fill: T.warn, stroke: 'none', lineWidth: 0, r: 6, opacity: 0.18}), box(mid + 10, y, W - mid - 34, rowH - 8, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 6, opacity: 0.18}));
      g.push(txt(24, y + (rowH - 8) / 2, f.key, {size: 20, mono: true, weight: 'bold', width: 160, color: changed ? T.ink : T.muted}));
      g.push(txt(196, y + (rowH - 8) / 2, f.before || '(empty)', {size: 20, mono: true, width: mid - 216, color}));
      g.push(txt(mid + 20, y + (rowH - 8) / 2, f.after || '(empty)', {size: 20, mono: true, width: W - mid - 54, color}));
      if (changed) g.push(...arrow(mid - 6, y + (rowH - 8) / 2, mid + 6, y + (rowH - 8) / 2, {stroke: T.accent, lineWidth: 2}));
    });
    g.height = 76 + n * rowH + 40;
    return g;
  };

  draw['semver-rule'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), tone = {major: () => T.warn, minor: () => T.accent, patch: () => T.accent2}, parts = d.version.split('.');
    g.push(txt(0, 20, 'CURRENT VERSION', {size: 19, weight: 'bold', color: T.muted}));
    let x = 0;
    ['major', 'minor', 'patch'].forEach((k, i) => {
      g.push(txt(x, 80, parts[i], {size: 64, mono: true, weight: 'bold', color: tone[k]()}));
      g.push(txt(x, 130, k, {size: 19, mono: true, color: tone[k]()}));
      x += parts[i].length * 40 + 10;
      if (i < 2) { g.push(txt(x, 80, '.', {size: 64, mono: true, weight: 'bold', color: T.muted})); x += 40; }
    });
    d.changes.forEach((ch, i) => {
      const y = 190 + i * 130, on = hi === i, o = fade(hi, i), color = tone[ch.kind]();
      g.push(box(0, y, W, 110, {stroke: on ? color : T.line, lineWidth: on ? 3 : 2, opacity: o}));
      g.push(...chip(24, y + 32, ch.kind.toUpperCase(), color, {opacity: o}));
      g.push(txt(140, y + 32, ch.example, {size: 22, width: 400, opacity: o}));
      g.push(...arrow(560, y + 32, 610, y + 32, {stroke: color, opacity: o}));
      g.push(txt(624, y + 32, c.derived.next[ch.kind], {size: 28, mono: true, weight: 'bold', color, opacity: o}));
      g.push(txt(24, y + 78, ch.kind === 'major' ? 'breaks existing callers: the first number moves, the rest reset' : ch.kind === 'minor' ? 'adds without breaking: the second number moves, patch resets' : 'fixes only: the last number moves', {size: 20, color: T.muted, width: W - 48, opacity: o}));
    });
    g.height = 190 + d.changes.length * 130;
    return g;
  };


  // ---- batch 5: general-purpose components for any subject ---------------
  const trendTone = {up: () => T.accent, down: () => T.warn, flat: () => T.muted, none: () => T.muted};
  const trendIcon = {up: 'chart-line', down: 'chart-line', flat: 'activity'};

  draw['quote'] = c => {
    const g = [], d = c.data;
    g.push(txt(0, 60, '“', {size: 120, weight: 'bold', color: T.accent, vAlign: 'top', lineHeight: 100}));
    g.push(txt(70, 110, d.text, {size: 32, weight: 'bold', width: W - 90, wrap: true, vAlign: 'top', lineHeight: 42}));
    const lines = Math.ceil(d.text.length / 34), y = 110 + lines * 42 + 40;
    g.push(line(70, y, 190, y, {stroke: T.accent, lineWidth: 4}));
    g.push(txt(70, y + 36, d.attribution, {size: 24, weight: 'bold', width: W - 90}));
    if (d.role) g.push(txt(70, y + 68, d.role, {size: 21, color: T.muted, width: W - 90}));
    g.height = y + (d.role ? 90 : 60);
    return g;
  };

  draw['checklist'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(84, (DRAW - 80) / n);
    d.items.forEach((item, i) => {
      const y = i * rowH, on = hi === i, o = fade(hi, i), cy = y + rowH / 2 - 4;
      if (on) g.push(box(0, y, W, rowH - 8, {fill: T.surface, stroke: T.accent, r: 8}));
      g.push(...dot(36, cy, item.done ? 'circle-check' : 'x', item.done ? T.accent : T.line, 18, o));
      g.push(txt(76, item.note ? cy - 12 : cy, item.label, {size: 24, weight: 'bold', width: W - 96, color: item.done ? T.ink : T.muted, opacity: o}));
      if (item.note) g.push(txt(76, cy + 16, item.note, {size: 19, color: T.muted, width: W - 96, opacity: o}));
    });
    g.push(txt(0, n * rowH + 26, `${fmt(c.derived.done)} of ${fmt(n)} done`, {size: 21, mono: true, color: T.muted}));
    g.height = n * rowH + 46;
    return g;
  };

  draw['stat'] = c => {
    const g = [], d = c.data, color = trendTone[d.trend]();
    g.push(txt(0, 20, d.label.toUpperCase(), {size: 21, weight: 'bold', color: T.muted, width: W}));
    g.push(txt(0, 130, d.value, {size: 120, weight: 'bold', mono: true, color: T.accent}));
    if (d.unit) g.push(txt(Math.min(W - 120, d.value.length * 74 + 16), 150, d.unit, {size: 36, weight: 'bold', color: T.muted}));
    let y = 240;
    if (d.trend !== 'none') { g.push(...dot(20, y, trendIcon[d.trend], color, 16), txt(48, y, d.trend === 'up' ? 'trending up' : d.trend === 'down' ? 'trending down' : 'no change', {size: 21, color})); y += 44; }
    if (d.context) { g.push(txt(0, y, d.context, {size: 24, width: W, wrap: true, vAlign: 'top', color: T.ink})); y += 70; }
    g.push(txt(0, y + 10, 'The number is the data; the label says what it counts.', {size: 20, color: T.muted, width: W}));
    g.height = y + 30;
    return g;
  };

  draw['before-after'] = c => {
    const g = [], d = c.data, pw = 372, gap = W - 2 * pw, n = Math.max(d.before.items.length, d.after.items.length), ph = 90 + n * 52;
    [[0, d.before, T.line, T.muted], [pw + gap, d.after, T.accent, T.ink]].forEach(([x, side, stroke, color]) => {
      g.push(box(x, 0, pw, ph, {stroke, lineWidth: stroke === T.accent ? 3 : 2}));
      g.push(txt(x + 24, 40, side.title.toUpperCase(), {size: 21, weight: 'bold', color: stroke === T.accent ? T.accent : T.muted, width: pw - 48}));
      side.items.forEach((item, i) => { g.push(circle(x + 30, 90 + i * 52, 5, {fill: color})); g.push(txt(x + 48, 90 + i * 52, item, {size: 22, color, width: pw - 72})); });
    });
    g.push(...arrow(pw + 10, ph / 2, pw + gap - 10, ph / 2, {stroke: T.accent, lineWidth: 4}));
    g.push(txt(0, ph + 34, 'Left is the starting point, right is the result. Same list, same order.', {size: 20, color: T.muted, width: W}));
    g.height = ph + 54;
    return g;
  };

  draw['steps'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(104, (DRAW - 40) / n);
    d.items.forEach((item, i) => {
      const y = i * rowH + 30, on = hi === i, o = fade(hi, i);
      if (i < n - 1) g.push(line(36, y + 26, 36, y + rowH - 26, {stroke: T.line, lineWidth: 3}));
      g.push(circle(36, y, 26, {fill: on ? T.accent : T.surface, stroke: on ? T.accent : T.line, lineWidth: 3, opacity: o}));
      g.push(txt(36, y, String(i + 1), {size: 24, weight: 'bold', mono: true, align: 'center', color: on ? T.background : T.ink, opacity: o}));
      g.push(txt(84, item.note ? y - 14 : y, item.label, {size: 25, weight: 'bold', width: W - 100, color: on ? T.accent : T.ink, opacity: o}));
      if (item.note) g.push(txt(84, y + 18, item.note, {size: 20, color: T.muted, width: W - 100, opacity: o}));
    });
    g.height = n * rowH + 20;
    return g;
  };

  draw['ranking'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(96, (DRAW - 60) / n), left = 300, right = W - 200, high = c.derived.high;
    d.items.forEach((item, i) => {
      const y = i * rowH, on = hi === i, o = fade(hi, i), w = Math.max(4, (right - left) * item.value / high), cy = y + rowH / 2 - 6;
      g.push(circle(24, cy, 20, {fill: i === 0 ? T.accent : i === 1 ? T.accent2 : i === 2 ? T.extra : T.surface, stroke: i > 2 ? T.line : 'none', lineWidth: 2, opacity: o}));
      g.push(txt(24, cy, String(i + 1), {size: 21, weight: 'bold', mono: true, align: 'center', color: i > 2 ? T.ink : T.background, opacity: o}));
      g.push(txt(60, cy, item.label, {size: 23, weight: 'bold', width: left - 72, color: on ? T.accent : T.ink, opacity: o}));
      g.push(box(left, cy - 18, w, 36, {fill: i === 0 ? T.accent : T.accent2, stroke: on ? T.ink : 'none', lineWidth: on ? 3 : 0, r: 6, opacity: o}));
      g.push(txt(left + w + 12, cy, `${fmt(item.value)}${d.unit ? ' ' + d.unit : ''}`, {size: 22, mono: true, opacity: o}));
    });
    g.push(txt(0, n * rowH + 26, 'Bars are proportional to the top value; the order is the ranking as supplied.', {size: 20, color: T.muted, width: W}));
    g.height = n * rowH + 46;
    return g;
  };

  draw['timeline'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, rowH = Math.min(110, (DRAW - 40) / n), x = 190;
    g.push(line(x, 20, x, n * rowH, {stroke: T.line, lineWidth: 3}));
    d.items.forEach((item, i) => {
      const y = i * rowH + 40, on = hi === i, o = fade(hi, i);
      g.push(txt(x - 24, y, item.when, {size: 21, mono: true, weight: 'bold', align: 'right', width: x - 32, color: T.muted, opacity: o}));
      g.push(circle(x, y, on ? 13 : 9, {fill: on ? T.accent : T.accent2, stroke: T.background, lineWidth: 3, opacity: o}));
      g.push(txt(x + 32, item.note ? y - 14 : y, item.label, {size: 24, weight: 'bold', width: W - x - 40, color: on ? T.accent : T.ink, opacity: o}));
      if (item.note) g.push(txt(x + 32, y + 18, item.note, {size: 20, color: T.muted, width: W - x - 40, opacity: o}));
    });
    g.height = n * rowH + 20;
    return g;
  };

  draw['pros-cons'] = c => {
    const g = [], d = c.data, pw = 392, n = Math.max(d.pros.length, d.cons.length), ph = 80 + n * 56;
    [[0, 'PROS', d.pros, T.accent, 'circle-check'], [W - pw, 'CONS', d.cons, T.warn, 'x']].forEach(([x, title, items, color, icon]) => {
      g.push(box(x, 0, pw, ph, {stroke: color, lineWidth: 2}));
      g.push(txt(x + 24, 38, title, {size: 21, weight: 'bold', color}));
      items.forEach((item, i) => { const y = 88 + i * 56; g.push(...dot(x + 36, y, icon, color, 14)); g.push(txt(x + 62, y, item, {size: 22, width: pw - 84})); });
    });
    g.push(txt(0, ph + 34, 'Two lists as supplied; the count on each side is not a verdict.', {size: 20, color: T.muted, width: W}));
    g.height = ph + 54;
    return g;
  };

  draw['definition'] = c => {
    const g = [], d = c.data;
    g.push(box(0, 0, W, 60, {fill: T.surface, stroke: T.line}));
    g.push(txt(24, 30, d.term, {size: 30, weight: 'bold', width: W - 220}));
    if (d.kind) g.push(txt(W - 24, 30, d.kind, {size: 21, mono: true, align: 'right', color: T.accent2}));
    g.push(txt(24, 96, d.meaning, {size: 26, width: W - 48, wrap: true, vAlign: 'top', lineHeight: 36}));
    const lines = Math.ceil(d.meaning.length / 44), y = 96 + lines * 36 + 30;
    if (d.example) { g.push(box(24, y - 12, 6, 60, {fill: T.accent, stroke: 'none', lineWidth: 0, r: 3})); g.push(txt(48, y + 18, d.example, {size: 22, color: T.muted, width: W - 72, wrap: true, vAlign: 'middle'})); }
    g.height = d.example ? y + 70 : y;
    return g;
  };

  draw['cards'] = c => {
    const g = [], d = c.data, hi = stateOf(c, 'highlight'), n = d.items.length, gap = 20, cw = (W - (n - 1) * gap) / n, ch = 300;
    d.items.forEach((item, i) => {
      const x = i * (cw + gap), on = hi === i, o = fade(hi, i);
      g.push(box(x, 0, cw, ch, {stroke: on ? T.accent : T.line, lineWidth: on ? 3 : 2, fill: on ? T.surface : T.background, opacity: o}));
      g.push(...dot(x + 44, 48, item.icon, on ? T.accent : T.accent2, 22, o));
      g.push(txt(x + 24, 110, item.title, {size: 24, weight: 'bold', width: cw - 48, wrap: true, vAlign: 'top', color: on ? T.accent : T.ink, opacity: o}));
      g.push(txt(x + 24, 170, item.text, {size: 21, color: T.muted, width: cw - 48, wrap: true, vAlign: 'top', opacity: o}));
    });
    g.height = ch;
    return g;
  };

  // ---- study plumbing (same contract as the library gallery) -------------
  function options(c, groups) {
    const items = draw[c.kind](c);
    const offset = Math.max(0, Math.floor((DRAW - Math.min(DRAW, items.height || DRAW)) / 2));
    current = {c, items, offset};
    const children = groups ? groups.map(g => ({...g, x: g.x || 0, y: offset + (g.y || 0)})) : [{type: 'group', silent: true, x: 0, y: offset, children: items}];
    return {animation: false, backgroundColor: T.background, textStyle: {fontFamily: T.font}, aria: {enabled: true}, tooltip: {show: false},
      graphic: [...children, ...provenance(c)]};
  }
  function renderAt(t) {
    if (!Number.isFinite(t)) throw new Error('Finite timeline required');
    seconds = Math.max(0, Math.min(8, t));
    $('progress').style.width = seconds / 8 * 100 + '%';
    $('time').value = String(seconds);
    text('time-label', seconds.toFixed(1) + ' s');
    if (motion && recipe) {
      // Recipes are pure functions of time over the freshly drawn items.
      $('chart').style.clipPath = '';
      const {c, items, offset} = current;
      const groups = motion.recipes[recipe].apply(items, seconds, {W, H, DRAW, offset, T});
      chart.setOption(options(c, groups), {notMerge: true, lazyUpdate: false});
      return;
    }
    const reveal = Math.min(1, seconds / 1.6);
    $('chart').style.clipPath = `inset(0 ${(1 - reveal) * 100}% 0 0)`;
  }
  function setRecipe(name) {
    if (!motion || !motion.recipes[name]) throw new Error('Unknown recipe');
    recipe = name;
    document.querySelectorAll('.recipes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.recipe === name)));
    renderAt(seconds);
  }
  function select(id) {
    const next = components.findIndex(c => c.id === id);
    if (next < 0) throw new Error('Unknown component');
    index = next;
    const c = components[index];
    text('eyebrow', String(index + 1).padStart(2, '0') + ' / ' + c.family.toUpperCase() + ' · ' + c.kind.toUpperCase() + ' · ' + c.variant.toUpperCase());
    text('title', c.title);
    text('insight', c.insight);
    text('source-kind', (c.source.kind === 'illustrative' ? 'ILLUSTRATIVE DATA' : 'SOURCE REVIEW REQUIRED') + ' · DESIGN REVIEW · WAVE ' + String(wave).padStart(2, '0'));
    text('source', c.source.label + ' | ' + c.source.as_of);
    text('reference', c.source.reference);
    text('detail', `variant = ${c.variant} | state = ${c.state ? JSON.stringify(c.state) : 'none'} | palette = ${palette}` + (recipe ? ` | motion = ${recipe}` : ''));
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
  if (motion) {
    const recipeBar = document.createElement('div'); recipeBar.className = 'recipes';
    motion.names.forEach(name => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.recipe = name; b.setAttribute('aria-pressed', String(name === recipe));
      b.addEventListener('click', () => setRecipe(name)); recipeBar.append(b);
    });
    $('studies').before(recipeBar);
  }
  components.forEach(c => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.id = c.id;
    const small = document.createElement('small'); small.textContent = c.family + ' · ' + c.variant;
    button.append(icon(c.icon), document.createTextNode(c.id), small);
    button.addEventListener('click', () => select(c.id));
    $('studies').append(button);
  });
  const families = {};
  components.forEach(c => { families[c.family] = (families[c.family] || 0) + 1; });
  const list = document.createElement('div'); list.className = 'families';
  Object.entries(families).forEach(([name, count]) => { const s = document.createElement('span'); s.innerHTML = `<b>${name}</b> · ${count}`; list.append(s); });
  $('icons').append(list);
  function playState() {
    $('play').replaceChildren(icon(playing ? 'pause' : 'arrow-right'));
    $('play').setAttribute('aria-label', playing ? 'Pause preview' : 'Play preview');
    $('play').title = playing ? 'Pause preview' : 'Play preview';
  }
  $('play').addEventListener('click', () => { playing = !playing; last = performance.now(); if (playing && seconds >= 8) renderAt(0); playState(); });
  $('time').addEventListener('input', () => { playing = false; playState(); renderAt(Number($('time').value)); });
  const resize = () => { $('frame').style.transform = `scale(${$('frame').parentElement.clientWidth / 1080})`; };
  new ResizeObserver(resize).observe($('frame').parentElement);
  window.VisualLibrary = {renderAt, select, setPalette, setRecipe, recipes: motion ? motion.names.slice() : [], recipe: () => recipe, ids: components.map(c => c.id), palettes: Object.keys(tokens.palettes), tokens: () => T, svg: () => chart.renderToSVGString(), stop: () => { playing = false; playState(); }};
  select(components[0].id); resize(); playState();
  function tick(now) { if (playing) { renderAt(seconds + (now - last) / 1000); if (seconds >= 8) { playing = false; playState(); } } last = now; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();
