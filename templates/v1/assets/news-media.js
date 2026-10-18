/* Local editorial media. No live requests, generated evidence, or wall-clock animation. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = n => Math.max(0, Math.min(1, n));
  window.ShortCreatorNewsMedia = async (host, record, spec, payload) => {
    const asset = new Image();
    asset.src = record.local_media;
    await asset.decode();
    if (!asset.naturalWidth) throw new Error('News image did not decode');
    const d = record.data, purple = payload.colors.accent, pink = payload.colors.secondary;
    const ink=payload.colors.ink||'#ffffff', background=payload.colors.background;
    const add = (parent, tag, attrs, value) => {
      const node = document.createElementNS(NS, tag);
      for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
      if (value !== undefined) node.textContent = value;
      parent.appendChild(node); return node;
    };
    const svg = add(host, 'svg', {viewBox:'0 0 880 940', width:880, height:940, role:'img', 'aria-label':d.asset.alt});
    const frame = add(svg, 'g', {});
    add(frame, 'rect', {x:4,y:14,width:872,height:912,rx:22,fill:background,opacity:'.55'});
    add(frame, 'rect', {x:0,y:6,width:872,height:912,rx:22,fill:background,stroke:pink,'stroke-width':2});
    add(frame, 'path', {d:'M 0 70 H 872',stroke:pink,'stroke-width':2});
    [pink,pink,purple].forEach((fill,i)=>add(frame,'circle',{cx:30+i*26,cy:38,r:7,fill}));
    add(frame,'text',{x:122,y:48,fill:purple,'font-size':26,'font-family':'BrandSans','font-weight':700},record.title);
    const portrait = d.variant === 'person';
    const imageWidth = portrait ? Math.min(370, 790 * asset.naturalWidth / asset.naturalHeight) : 828;
    // Keep portrait subjects intact; landscape media shares one 16:9 aperture.
    const imageHeight = portrait ? imageWidth * asset.naturalHeight / asset.naturalWidth : imageWidth * 9 / 16;
    const clip = 'news-clip-' + record.id;
    const defs = add(svg,'defs',{});
    add(add(defs,'clipPath',{id:clip}),'rect',{x:22,y:90,width:imageWidth,height:imageHeight,rx:12});
    add(frame,'rect',{x:22,y:90,width:imageWidth,height:imageHeight,rx:12,fill:background});
    const picture = add(frame,'image',{x:22,y:90,width:imageWidth,height:imageHeight,href:record.local_media,
      preserveAspectRatio:d.fit==='cover'?'xMidYMid slice':'xMidYMid meet','clip-path':`url(#${clip})`});
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    const wrap = (parent, value, x, y, size, color, width, weight=700) => {
      ctx.font = `${weight} ${size}px BrandSans`;
      const lines = []; let line = '';
      for (const word of value.split(/\s+/)) {
        const next = line ? line+' '+word : word;
        if (ctx.measureText(next).width > width && line) {lines.push(line); line=word;} else line=next;
      }
      if (line) lines.push(line);
      lines.forEach((line,i)=>add(parent,'text',{x,y:y+i*size*1.4,fill:color,'font-family':'BrandSans','font-size':size,'font-weight':weight,'dominant-baseline':'hanging'},line));
      return y + lines.length*size*1.4;
    };
    const content = add(frame,'g',{});
    const textX = portrait ? 420 : 28, textWidth = portrait ? 420 : 810;
    let y = portrait ? 150 : 90+imageHeight+44;
    y = wrap(content,d.label,textX,y,26,purple,textWidth)+16;
    y = wrap(content,d.headline,textX,y,d.variant==='image-metric'?56:44,ink,textWidth)+14;
    y = wrap(content,d.detail,textX,y,30,ink,textWidth,600)+14;
    const beats=[];
    d.items.forEach((item,i)=>{
      const group=add(content,'g',{});
      add(group,'circle',{cx:textX+11,cy:y-10,r:6,fill:i===1?pink:purple});
      y=wrap(group,item,textX+34,y,28,ink,textWidth-34)+12;
      beats.push(group);
    });
    if (y > 920) throw new Error('News text exceeds media window: '+record.id);
    return {renderAt(local) {
      const entrance=clamp((local-spec.motion.fill[0])/spec.motion.fill[1]);
      frame.setAttribute('opacity',String(entrance));
      frame.setAttribute('transform',`translate(0 ${18*(1-entrance)})`);
      picture.setAttribute('opacity',String(.9+.1*entrance));
      content.setAttribute('opacity',String(clamp((local-.5)/.6)));
      beats.forEach((node,i)=>node.setAttribute('opacity',String(clamp((local-(spec.motion.beats?.[i]??1+i*2))/.55))));
    }};
  };
})();
