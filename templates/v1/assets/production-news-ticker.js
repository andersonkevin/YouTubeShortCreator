/* HyperFrames news-ticker source timing, Apache-2.0. Explicit native copy only. */
(()=>{
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(x,n)=>1-(1-clamp(x))**n;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  function state(seconds,windowWidth,trackWidth) {
    if(![seconds,windowWidth,trackWidth].every(Number.isFinite)||windowWidth<=0||trackWidth<=0)
      throw new Error('Finite ticker time and positive measured widths required');
    const t=Math.max(0,Math.min(6.67,seconds)),entry=out(t/.52,5),brand=out((t-.08)/.42,4),title=out((t-.18)/.62,4);
    const travel=clamp((t-.62)/6.05),end=Math.min(0,windowWidth-32-trackWidth);
    return {time:t,entry,y:260*(1-entry),brand,brandX:-80*(1-brand),title,titleY:26*(1-title),
      trackX:windowWidth+(end-windowWidth)*travel,travel,
      flashX:2040*(smooth((t-.34)/.86)+smooth((t-3.42)/.72))};
  }
  function mount(host,c,onsets,make,reveal) {
    const heading=make('p','prod-kicker',c.heading,host,true),board=make('div','news-ticker-board',null,host);
    const source=make('p','resource-source',c.context,host,true),shell=make('div','news-ticker-shell',null,board);
    const header=make('div','news-ticker-header',null,shell),brand=make('p','news-ticker-brand',c.name,header,true);
    const title=make('p','news-ticker-title',c.role,header,true),viewport=make('div','news-ticker-window',null,shell);
    const track=make('div','news-ticker-track',null,viewport),flash=make('div','news-ticker-flash',null,shell);
    flash.setAttribute('aria-hidden','true');
    c.items.forEach(item=>make('span','news-ticker-item',item,track));
    const width=viewport.clientWidth,trackWidth=track.scrollWidth,unit=shell.clientWidth/1728;
    if([...track.children].some(item=>item.offsetWidth>width-32))throw new Error('Ticker item does not fit at the approved font size');
    // The source fixed travel is fitted to measured content, so every supplied item passes the window.
    return time=>{
      const clock=window.ShortCreatorCarousels.clock(time,onsets,6.67),s=state(clock.time,width,trackWidth);
      const p=window.ShortCreatorStory.progress(time,onsets[0]);reveal(heading,out(p,4),16);
      source.style.opacity=String(out(p,4));shell.style.transform=`translateY(${s.y}px)`;shell.style.opacity=String(s.entry);
      brand.style.transform=`translateX(${s.brandX*unit}px)`;brand.style.opacity=String(s.brand);
      title.style.transform=`translateY(${s.titleY}px)`;title.style.opacity=String(s.title);
      title.style.clipPath=`inset(0 ${100*(1-s.title)}% 0 0)`;
      const fits=shell.offsetTop+s.y+shell.offsetHeight<=board.clientHeight;
      header.style.visibility=fits?'visible':'hidden';
      track.style.transform=`translateX(${s.trackX}px)`;
      flash.style.left=`${(-260+s.flashX)*unit}px`;flash.style.width=`${210*unit}px`;
      board.dataset.tickerState=JSON.stringify({...s,clock,width,trackWidth,unit});
    };
  }
  window.ShortCreatorNewsTicker={state,mount};
})();
