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
    const completed = baseRender(seconds);
    renderCaption(seconds);
    return completed;
  };
  renderCaption(0);
})();
