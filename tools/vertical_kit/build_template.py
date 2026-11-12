"""SHORT: scenes timed to the narration. Run with `vkit.py build <batch>/SHORT` (it sets VKIT_HOME).
Look at intake/timing.json for word and cue indices: S.c(i) is when cue i starts, S.w(k) when word k is spoken."""
import os, sys
from pathlib import Path
sys.path.insert(0, os.environ['VKIT_HOME'])
from common import Stage, at, card, icon  # also: bars, line_chart, donut, connector, photo, count, on

S = Stage(Path(__file__).resolve().parents[1])
# Scene 1 (cue 0): the hook as a kinetic heading over one card.
S.scene(0, 's1', f'<h1 class="vh">{S.kin(0, 3)}</h1>'
        + card(0, 420, 880, 520, f'<div style="padding:60px;font-size:48px;font-weight:700">{icon("zap", "ic")} Replace me</div>', S.c(0) + .4))
# Closing scene from the last cue: logo or wordmark plus the call to action in brand.json.
S.close(len(S.cues) - 1)
S.write('SHORT.css', 'SHORT')
