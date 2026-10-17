/* HyperFrames notes-reveal measured typing/scroll tables, Apache-2.0.
   Supplied document text uses approved type without shrinking or substitutions. */
(() => {
  'use strict';
  const lineFrames=Object.freeze([
    [40,42,46,48,50,53,56,59,60,62,66,68,72,74,77,80],
    [106,108,110,114,116,119,120,122,125,127,131,132,134,137,139,142,144],
    [167,170,172,174,176,180,182,185,187,190,192,194,196,198,200,203,205,208,210,212,216,218,221],
    [256,258,262,264,266,269,271,274,275,277,280,281,282,284,287,288,290,293,295,298,299,301,304,306,310,311,313,316,318,320],
    [349,352,354,356,359,361,364,366,368,371,372,374,378,380,382,385,388,389,390,394,395,397,400,401,403,406,408,410,412,414,416,419,421,424,425],
    [449,450,452,455,457,460,462,466,468,469,472,474,476,479,481,482,485,487,490,492,493,496,497,499,502,504,506,509,510,512,515,517,520,522,523,526,528,530,532],
    [558,560,563,565,568,571,574,575,577,580,581,584,587,589,592,593,595,599,602,604,606]
  ]);
  // Measured displacement after frames 1..N; hard settle follows the final sample.
  const scrollFrames=Object.freeze([
    [21.74,53.93,77.33,77.33,94.06,102.95,111.73,115.18,118.01,118.01,119.35,119.87,119.87,119.87,119.87,119.87,120],
    [9.29,44.61,74.77,102.53,102.53,117.91,133.34,140.03,145.24,148.87,148.87,149.85,149.95,149.95,149.95,149.95,149.95,150],
    [9.11,9.11,31.8,73,100.53,118.84,131.65,131.65,140.05,144.79,148.7,149.91,149.95,149.95,149.95,149.95,150],
    [28.09,60.69,92.33,113.98,113.98,125.5,136.13,143.99,147.13,149.17,149.17,149.97,149.97,149.97,149.97,149.97,150],
    [25.26,61.96,93.98,105,122.63,122.63,138.9,144.2,147.27,149.63,149.95,149.95,149.95,149.95,149.95,149.95,150]
  ]);
  const graphemes=text=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].map(s=>s.segment);
  function countAt(length,line,elapsed) {
    const samples=lineFrames[line];
    if(!Number.isInteger(length)||length<1||!samples||!Number.isFinite(elapsed))throw new Error('Invalid note typing state');
    if(elapsed<0)return 0;if(elapsed>=24)return length;
    const first=samples[0],span=samples.at(-1)-first;
    let count=0;for(let i=0;i<length;i++){
      const at=length===samples.length?Math.round((samples[i]-first)*24/span):length===1?0:Math.round(24*i/(length-1));
      if(elapsed>=at)count=i+1;
    }return count;
  }
  function state(time,onsets,lengths,height) {
    if(!Number.isFinite(time)||!Number.isFinite(height)||height<400||!Array.isArray(onsets)||onsets.length<2||onsets.length>7||
       lengths.length!==onsets.length||!onsets.every(Number.isFinite))throw new Error('Invalid note sequence');
    const frame=Math.floor(time*30+1e-7),starts=onsets.map(t=>Math.ceil(t*30)),step=height*.25,first=height*.5;
    let scroll=0,caret=0;
    for(let i=1;i<starts.length;i++)if(frame>=starts[i]-18)caret=i;
    for(let i=2;i<starts.length;i++){
      const elapsed=frame-(starts[i]-18),points=scrollFrames[i-2],source=i===2?120:150,distance=i===2?step*.8:step;
      const dy=elapsed<1?0:elapsed>=points.length+1?source:points[Math.min(points.length-1,elapsed-1)];
      scroll+=distance*(dy/source);
    }
    return {first,step,scroll,caret,counts:lengths.map((length,i)=>countAt(length,i,frame-starts[i])),elapsed:starts.map(start=>frame-start)};
  }
  function mount(host,c,onsets,make) {
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board note-scroll-board',null,host);board.dataset.interfaceStyle='notes';
    const paper=make('div','note-scroll-paper',null,board),view=make('div','note-scroll-view',null,paper),doc=make('div','note-scroll-document',null,view);
    const title=make('h3','note-scroll-title',c.title,doc,true);
    const rows=c.items.map(text=>{
      const row=make('p','note-scroll-line',null,doc,true),chars=graphemes(text).map(char=>make('span','',char,row));return {row,chars};
    });
    const caret=make('i','note-scroll-caret',null,doc);
    return time=>{
      const s=state(time,onsets,rows.map(row=>row.chars.length),view.clientHeight);
      doc.style.transform=`translateY(${-s.scroll}px)`;
      title.style.visibility=title.offsetTop-s.scroll>=0&&title.offsetTop+title.offsetHeight-s.scroll<=view.clientHeight?'visible':'hidden';
      rows.forEach(({row,chars},i)=>{
        const y=s.first+i*s.step;row.style.top=y+'px';chars.forEach((char,j)=>char.style.opacity=j<s.counts[i]?'1':'0');
        row.style.visibility=s.counts[i]>0&&y-s.scroll>=0&&y+row.offsetHeight-s.scroll<=view.clientHeight?'visible':'hidden';
      });
      const current=rows[s.caret],count=s.counts[s.caret],last=count?current.chars[count-1]:null;
      const x=32+(last?last.offsetLeft+last.offsetWidth:0)+2,y=s.first+s.caret*s.step+(last?last.offsetTop:4);
      caret.style.transform=`translate(${x}px,${y}px)`;
      caret.style.visibility=y-s.scroll>=0&&y+32-s.scroll<=view.clientHeight?'visible':'hidden';
      board.dataset.noteScrollState=JSON.stringify({...s,tip:{x,y},height:view.clientHeight});
    };
  }
  window.ShortCreatorNoteScroll={lineFrames,scrollFrames,graphemes,countAt,state,mount};
})();
