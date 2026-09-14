(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("spoken-captions-data").textContent);
  const output = document.querySelector(".spoken-caption span");
  const baseRender = window.ShortCreatorRenderAt;
  function renderCaption(seconds) {
    const cue = data.cues.find(item => seconds >= item.start && seconds < item.end);
    output.textContent = cue ? cue.text : "";
  }
  // Capture uses the same time for scenes and captions, including backwards seeks.
  window.ShortCreatorRenderAt = seconds => {
    baseRender(seconds);
    renderCaption(seconds);
  };
  renderCaption(0);
  if (!window.__SHORTCREATOR_CAPTURE_MODE__) {
    const started = performance.now();
    function tick(now) {
      renderCaption(((now - started) / 1000) % data.duration);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
