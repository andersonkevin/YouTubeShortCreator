(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("spoken-captions-data").textContent);
  const output = document.querySelector(".spoken-caption span");
  const baseRender = window.ShortCreatorRenderAt;
  let currentCue = null;
  let segments = [];
  function renderCaption(seconds) {
    const cue = data.cues.find(item => seconds >= item.start && seconds < item.end);
    if(data.highlight === 'measured-segment') {
      if(cue !== currentCue) {
        output.textContent = '';
        segments = [];
        if(cue) {
          const measured = data.words.slice(cue.firstWord, cue.lastWord + 1);
          measured.forEach((word,index)=>{
            if(index) output.append(document.createTextNode(' '));
            const span = document.createElement('span');
            span.className = 'caption-word';
            span.textContent = word.text.trim();
            output.append(span);
            segments.push({span,word});
          });
        }
        currentCue = cue;
      }
      for(const {span,word} of segments) {
        span.classList.toggle('active', seconds >= word.start && seconds < word.end);
      }
      return;
    }
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
