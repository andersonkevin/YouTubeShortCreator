// Coordinates are normalized to the chart's unscaled production pixels.
export function inspectChartLabels(labels, bounds) {
  if (!bounds) return [];
  const issues=[];
  const visible=labels.filter(label=>label.text.trim() && label.right>label.left && label.bottom>label.top);
  for(const label of visible) {
    if(label.left < -1 || label.top < -1 || label.right > bounds.width+1 || label.bottom > bounds.height+1)
      issues.push('Chart label outside visual: '+label.text);
  }
  for(let i=0;i<visible.length;i++) {
    for(let j=i+1;j<visible.length;j++) {
      const a=visible[i], b=visible[j];
      const width=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(width>1 && height>1)
        issues.push(`Chart labels overlap: ${a.text} / ${b.text}. Shorten labels or split the data.`);
    }
  }
  return issues;
}
