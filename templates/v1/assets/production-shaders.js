/* Bounded local-still adapter for HyperFrames' shader programs.
   One context, two textures, fixed cue timing, no DOM capture or network. */
(() => {
  'use strict';
  const {vertex,fragments}=window.ShortCreatorShaderSources;
  const names=Object.freeze(Object.keys(fragments));
  function fragment(name) {
    if(!Object.hasOwn(fragments,name))throw new Error('Unknown screen shader');
    // GLSL smoothstep is undefined for reversed edges. Preserve the intended
    // descending curve explicitly, including the iris' variable radius.
    const body=fragments[name].replace('void main()', 'void effectMain()')
      .replace('smoothstep(.1,0.,ed)','(1.-smoothstep(0.,.1,ed))')
      .replace('smoothstep(.12,0.,abs(n-u_progress))','(1.-smoothstep(0.,.12,abs(n-u_progress)))')
      .replace('smoothstep(radius+fw,radius-fw,d)','(1.-smoothstep(radius-fw,radius+fw,d))')
      .replace('smoothstep(1.,0.,v_uv.y)','(1.-smoothstep(0.,1.,v_uv.y))')
      .replace('float radius=u_progress*1.2','float radius=u_progress*(length(vec2(u_resolution.x/u_resolution.y,1.))*.5+.01)');
    // Several upstream effects alter endpoint colors. Taper the first/last
    // three frames to the original stills; exact endpoints use the DOM images.
    return body+'void main(){vec4 a=texture2D(u_from,v_uv),b=texture2D(u_to,v_uv);'
      +'if(u_progress<=0.){gl_FragColor=a;return;}if(u_progress>=1.){gl_FragColor=b;return;}'
      +'effectMain();float envelope=smoothstep(0.,.12,u_progress)*smoothstep(0.,.12,1.-u_progress);'
      +'gl_FragColor=mix(mix(a,b,smoothstep(0.,1.,u_progress)),gl_FragColor,envelope);}';
  }
  function compile(gl,type,source) {
    const shader=gl.createShader(type);
    if(!shader)throw new Error('Cannot allocate screen shader');
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const info=gl.getShaderInfoLog(shader);gl.deleteShader(shader);
      throw new Error('Screen shader compilation failed: '+info);
    }
    return shader;
  }
  function link(gl,source) {
    const shaders=[];let program;
    try {
      shaders.push(compile(gl,gl.VERTEX_SHADER,vertex));
      shaders.push(compile(gl,gl.FRAGMENT_SHADER,source));
      program=gl.createProgram();if(!program)throw new Error('Cannot allocate screen shader program');
      shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Screen shader link failed: '+gl.getProgramInfoLog(program));
      return program;
    } catch(error) {if(program)gl.deleteProgram(program);throw error;}
    finally {shaders.forEach(shader=>gl.deleteShader(shader));}
  }
  function contain(width,height,imageWidth,imageHeight) {
    if(![width,height,imageWidth,imageHeight].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid screen texture dimensions');
    const scale=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*scale,h=imageHeight*scale;
    return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
  }
  function filterRadius(name,p) {
    if(!['gravitational-lens','chromatic-split','glitch','magnetic-pull','magnetic-repel'].includes(name))return 0;
    const smooth=x=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
    return 1.2*smooth(p/.12)*smooth((1-p)/.12);
  }
  function createRenderer() {
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false,antialias:false});
    if(!gl)throw new Error('WebGL is unavailable for the selected screen shader');
    const programs=new Map(),textures=[],buffer=gl.createBuffer();
    if(!buffer)throw new Error('Cannot allocate screen shader geometry');
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    for(let i=0;i<2;i++) {
      const texture=gl.createTexture();if(!texture)throw new Error('Cannot allocate screen texture');
      textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    const scratch=document.createElement('canvas'),ctx=scratch.getContext('2d',{alpha:false});
    if(!ctx)throw new Error('Cannot prepare screen textures');
    let lastPair=null;
    function assertReady() {
      if(gl.isContextLost())throw new Error('Screen shader context was lost; render cannot continue');
      const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('Screen shader WebGL error: '+error);
    }
    function program(name) {
      assertReady();
      if(!programs.has(name)) {
        const value=link(gl,fragment(name)),uniforms={};
        for(const key of ['from','to','progress','resolution','accent','accent_dark','accent_bright'])uniforms[key]=gl.getUniformLocation(value,'u_'+key);
        programs.set(name,{value,uniforms,position:gl.getAttribLocation(value,'a_pos')});
      }
      return programs.get(name);
    }
    return {
      prepare:program,
      draw(target,name,p,images,colors) {
        assertReady();const width=target.width,height=target.height;
        if(width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Screen texture exceeds local WebGL limit');
        const resized=canvas.width!==width||canvas.height!==height;
        if(resized){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
        const key=[...images,width,height,colors.background];
        if(resized||!lastPair||key.some((value,i)=>value!==lastPair[i])) {
          scratch.width=width;scratch.height=height;
          images.forEach((image,i)=>{
            if(!image.complete||!image.naturalWidth)throw new Error('Screen shader image is not decoded');
            const box=contain(width,height,image.naturalWidth,image.naturalHeight);
            ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);ctx.drawImage(image,box.x,box.y,box.width,box.height);
            gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scratch);
          });lastPair=key;
        }
        const {value,uniforms,position}=program(name);gl.useProgram(value);
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        textures.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);});
        gl.uniform1i(uniforms.from,0);gl.uniform1i(uniforms.to,1);gl.uniform1f(uniforms.progress,p);gl.uniform2f(uniforms.resolution,width,height);
        for(const key of ['accent','accent_dark','accent_bright'])gl.uniform3fv(uniforms[key],colors[key]);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.finish();assertReady();
        const output=target.getContext('2d',{alpha:false});if(!output)throw new Error('Cannot paint screen shader');
        // RGB separation creates single-pixel colored edges that 4:2:0 cannot
        // retain. A bounded pixel filter smooths those three effects only.
        // Clear first: filtered edge alpha must not depend on the previous frame.
        output.filter='none';output.fillStyle=colors.background;output.fillRect(0,0,width,height);
        const radius=filterRadius(name,p);output.filter=radius?`blur(${radius}px)`:'none';
        output.drawImage(canvas,0,0);output.filter='none';
      },
      stats:()=>({contexts:1,textures:textures.length,programs:programs.size,lost:gl.isContextLost()}),
    };
  }
  let renderer;
  const decodedImages=new Map(),decoding=[];
  function verifiedImage(image) {
    const path=image.getAttribute('src');
    if(!decodedImages.has(path)) {
      const source=window.ShortCreatorShaderImages?.[path];
      if(typeof source!=='string'||!/^data:image\/(png|jpeg);base64,/.test(source))throw new Error('Missing verified shader image');
      const texture=new Image();texture.src=source;decodedImages.set(path,texture);decoding.push(texture.decode());
    }
    return decodedImages.get(path);
  }
  function mount(view,images,onsets,kind) {
    const name=kind.slice(7);if(kind!=='shader-'+name||!names.includes(name))throw new Error('Unknown screen shader');
    if(!renderer)renderer=createRenderer();renderer.prepare(name);
    const canvas=document.createElement('canvas');canvas.className='screen-shader';canvas.setAttribute('aria-hidden','true');
    canvas.width=view.clientWidth;canvas.height=view.clientHeight;view.appendChild(canvas);
    const style=getComputedStyle(view),hex=style.getPropertyValue('--lime').trim();
    if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Screen shader requires an approved accent color');
    const accent=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const colors={background:style.backgroundColor,accent,accent_dark:accent.map(v=>v*.25),accent_bright:accent.map(v=>v*.4+.6)};
    const textures=images.map(verifiedImage);
    view.dataset.screenSwap=kind;
    return t=>{
      let active=0;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
      const p=window.ShortCreatorStory.progress(t,onsets[active]),moving=active>0&&p>0&&p<1;
      const shown=active>0&&p===0?active-1:active;
      images.forEach((image,i)=>{image.style.visibility=!moving&&i===shown?'visible':'hidden';});
      canvas.style.visibility=moving?'visible':'hidden';
      if(moving)renderer.draw(canvas,name,p,[textures[active-1],textures[active]],colors);
      view.dataset.swapIndex=String(active);view.dataset.swapProgress=String(p);
    };
  }
  window.ShortCreatorShaders={names,fragment,compile,link,contain,filterRadius,createRenderer,verifiedImage,mount,ready:()=>Promise.all(decoding),stats:()=>renderer?.stats()||{contexts:0,textures:0,programs:0,lost:false}};
})();
