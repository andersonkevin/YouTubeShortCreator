(() => {
  "use strict";
  const film = document.getElementById("film");
  const duration = Number(film.dataset.duration);
  const scenes = [...film.querySelectorAll(".scene")].map(element => ({
    element,
    start: Number(element.dataset.start),
    end: Number(element.dataset.end),
    reveals: [...element.querySelectorAll("[data-enter]")],
    active: [...element.querySelectorAll("[data-active]")],
    fills: [...element.querySelectorAll("[data-fill]")],
    travel: [...element.querySelectorAll("[data-travel]")]
  }));
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - (1 - clamp(x)) ** 3;
  const interval = value => value.split(",").map(Number);
  function fit() {
    film.style.setProperty("--scale", Math.min(innerWidth / 1080, innerHeight / 1920));
  }
  // Every visual state is derived from time, so capture and seeking are identical.
  function renderAt(seconds) {
    if (window.__SHORTCREATOR_CAPTURE_MODE__) {
      // Discard compositor shadow caches so the same time has the same pixels after any seek.
      film.style.display = "none";
      void film.offsetWidth;
      film.style.display = "";
    }
    const t = Math.max(0, Math.min(duration - 0.000001, Number(seconds) || 0));
    for (const scene of scenes) {
      const visible = t >= scene.start && t < scene.end;
      scene.element.style.visibility = visible ? "visible" : "hidden";
      scene.element.setAttribute("aria-hidden", String(!visible));
      scene.element.style.opacity = visible ? String(ease((t - scene.start) / 0.22)) : "0";
      if (!visible) continue;
      const local = t - scene.start;
      film.dataset.scene = scene.element.dataset.name;
      for (const el of scene.reveals) {
        const amount = ease((local - Number(el.dataset.enter)) / 0.4);
        el.style.opacity = String(amount);
        el.style.transform = `translateY(${(1 - amount) * 26}px)`;
      }
      for (const el of scene.active) {
        const [start, end] = interval(el.dataset.active);
        el.classList.toggle("active", local >= start && local < end);
      }
      for (const el of scene.fills) {
        const [start, length] = interval(el.dataset.fill);
        const axis = el.parentElement.classList.contains("gate-path") ? "Y" : "X";
        el.style.transform = `scale${axis}(${ease((local - start) / length)})`;
      }
      for (const el of scene.travel) {
        const [start, length] = interval(el.dataset.travel);
        const amount = clamp((local - start) / length);
        el.style.opacity = local >= start && local < start + length + 0.25 ? "1" : "0";
        el.style.transform = `translateY(${amount * 87}px)`;
      }
    }
    film.querySelector("[data-progress]").style.width = `${100 * t / duration}%`;
  }
  window.ShortCreatorRenderAt = renderAt;
  window.addEventListener("resize", fit);
  fit();
  renderAt(0);
  if (!window.__SHORTCREATOR_CAPTURE_MODE__) {
    const start = performance.now();
    const tick = now => {
      renderAt(((now - start) / 1000) % duration);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
