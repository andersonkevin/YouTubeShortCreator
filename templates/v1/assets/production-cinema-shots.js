/* Bounded photographic editing on the native frame clock. Camera poses are
   normalized crop windows, not episode-provided transforms or executable code. */
(() => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const mix = (a, b, p) => a + (b - a) * p;
  function travel(progress) {
    const p = clamp(progress), ramp = .12, velocity = 1 / (1 - ramp);
    if (p < ramp) return velocity * p * p / (2 * ramp);
    if (p > 1 - ramp) return 1 - velocity * (1 - p) ** 2 / (2 * ramp);
    return velocity * (p - ramp / 2);
  }
  function camera(shot, progress, iw, ih, width = 1920, height = 1080) {
    if (![progress, iw, ih, width, height].every(Number.isFinite) || Math.min(iw, ih, width, height) <= 0)
      throw new Error('Invalid photographic camera dimensions');
    const p = travel(progress), pose = shot.from.map((v, i) => mix(v, shot.to[i], p));
    const scale = Math.max(width / iw, height / ih) * pose[0], w = iw * scale, h = ih * scale;
    // Normalized focus cannot expose the stage, even at extreme aspect ratios.
    return {x: (width - w) * pose[1], y: (height - h) * pose[2], w, h, zoom: pose[0], progress: p};
  }
  function state(shots, onsets, end, time) {
    if (!Number.isFinite(time) || shots.length !== onsets.length) throw new Error('Invalid photographic clock');
    let index = 0;
    onsets.forEach((onset, i) => { if (time >= onset) index = i; });
    const start = index ? onsets[index] : 0, stop = onsets[index + 1] ?? end;
    const progress = clamp((time - start) / Math.max(.01, stop - start));
    let blur = 0, curtain = null, boundary = null;
    for (let i = 1; i < shots.length; i++) {
      const distance = time - onsets[i];
      if (Math.abs(distance) > .28) continue;
      boundary = i;
      if (shots[i].seam === 'focus') blur = 18 * (1 - Math.abs(distance) / .28) ** 2;
      if (shots[i].seam === 'occlude') curtain = distance / .28;
    }
    return {index, progress, blur, curtain, boundary};
  }
  function dust(ctx, time, index, zoom) {
    const width = ctx.canvas.width, height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);
    // Fixed world-space specks move through a camera path, with depth-dependent
    // parallax and defocus. No random calls or stateful particle integration.
    for (let i = 0; i < 42; i++) {
      const depth = .45 + ((i * 37) % 101) / 80;
      const x = ((i * 173 + 71) % 1100 - 70 - time * 2.1 / depth + index * 11) * (1 + (zoom - 1) * .24 / depth) * width / 960;
      const y = ((i * 97 + 47) % 660 - 60 - time * .45 / depth) * height / 540;
      const radius = (i % 9 === 0 ? 8 : 1.4) / depth;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,225,180,.20)');
      gradient.addColorStop(1, 'rgba(255,225,180,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  function mount(host, content, onsets, data, make, end) {
    const stage = host.parentElement;
    const {width, height} = data.profile;
    const screen = make('div', 'cinema-photography', null, stage);
    stage.insertBefore(screen, host);
    const frames = content.shots.map(shot => {
      const image = make('img', 'cinema-art photographic-frame', null, screen);
      image.src = data.assets[shot.image]; image.alt = shot.title || 'Cinematic sculpture detail';
      image.draggable = false;
      return image;
    });
    const air = make('canvas', 'cinema-atmosphere', null, screen);
    air.width = width / 2; air.height = height / 2;
    const ctx = air.getContext('2d');
    if (!ctx) throw new Error('Photographic atmosphere context unavailable');
    make('div', 'cinema-vignette', null, screen);
    const shade = make('div', 'cinema-title-shade', null, screen);
    const curtain = make('div', 'cinema-lens-occluder', null, screen);
    const board = make('div', 'cinema-board photographic-board', null, host);
    const title = make('h2', 'cinema-shot-title', '', board, true);
    const rule = make('div', 'cinema-shot-rule', null, board);
    return time => {
      const s = state(content.shots, onsets, end, time), shot = content.shots[s.index];
      let pose = null;
      frames.forEach((image, i) => {
        image.style.visibility = i === s.index ? 'visible' : 'hidden';
        if (i !== s.index) return;
        pose = camera(shot, s.progress, image.naturalWidth || width, image.naturalHeight || height, width, height);
        Object.assign(image.style, {width: pose.w + 'px', height: pose.h + 'px',
          transform: `translate(${pose.x}px,${pose.y}px)`, filter: s.blur ? `blur(${s.blur}px)` : 'none'});
      });
      const age = time - (s.index ? onsets[s.index] : 0);
      const titleAlpha = shot.title ? clamp((age - .4) / .7) * clamp((4.4 - age) / .65) : 0;
      title.textContent = shot.title;
      title.style.opacity = String(titleAlpha); rule.style.opacity = String(titleAlpha);
      shade.style.opacity = String(titleAlpha);
      curtain.style.visibility = s.curtain === null ? 'hidden' : 'visible';
      curtain.style.transform = `translateX(${(s.curtain ?? 0) * (width + 680)}px)`;
      dust(ctx, time, s.index, pose.zoom);
      board.dataset.cinemaTime = String(time);
      board.dataset.shotState = JSON.stringify({...s, pose});
      document.querySelector('#film .logo').style.filter = 'none';
    };
  }
  window.ShortCreatorCinemaShots = {travel, camera, state, mount};
})();
