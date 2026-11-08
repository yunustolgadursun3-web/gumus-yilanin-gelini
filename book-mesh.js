/* Spatial primitives and a small WebGL renderer. Coordinates use y up and z toward the reader. */
(() => {
  'use strict';

  const add = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = v => {
    const length = Math.hypot(...v) || 1;
    return v.map(value => value/length);
  };
  const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

  function color(hex, alpha = 1) {
    const integer = parseInt(String(hex).replace(/^#/,''),16) || 0;
    return [(integer>>16)/255,((integer>>8)&255)/255,(integer&255)/255,alpha];
  }

  function triangle(target, a,b,c, fill, coordinates) {
    const normal = unit(cross(sub(b,a),sub(c,a)));
    for (const [index,point] of [a,b,c].entries()) {
      target.push(...point,...normal,...fill,...(coordinates?.[index] || [0,0]));
    }
  }

  function quad(target, a,b,c,d,fill) {
    triangle(target,a,b,c,fill,[[0,0],[1,0],[1,1]]);
    triangle(target,a,c,d,fill,[[0,0],[1,1],[0,1]]);
  }

  function box(target, min, max, top, side, dark = side) {
    const [x,y,z] = min, [X,Y,Z] = max;
    const a=[x,y,z], b=[X,y,z], c=[X,y,Z], d=[x,y,Z];
    const e=[x,Y,z], f=[X,Y,z], g=[X,Y,Z], h=[x,Y,Z];
    quad(target,e,h,g,f,top);
    quad(target,a,b,c,d,dark);
    quad(target,d,c,g,h,side);
    quad(target,a,e,f,b,dark);
    quad(target,a,d,h,e,side);
    quad(target,b,f,g,c,dark);
  }

  function polygonFaces(points) {
    if (points.length < 3) return [];
    let area=0;
    for (let i=0;i<points.length;i++) {
      const a=points[i], b=points[(i+1)%points.length];
      area+=a[0]*b[1]-b[0]*a[1];
    }
    const orientation = Math.sign(area) || 1;
    const determinant = (a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const contains = (a,b,c,p)=>[determinant(a,b,p),determinant(b,c,p),determinant(c,a,p)].every(value=>value*orientation >= -1e-8);
    const remaining = points.map((_,index)=>index);
    const faces=[];
    while (remaining.length>3) {
      const ear=remaining.findIndex((index,at)=>{
        const previous=remaining[(at-1+remaining.length)%remaining.length];
        const next=remaining[(at+1)%remaining.length];
        const a=points[previous],b=points[index],c=points[next];
        return determinant(a,b,c)*orientation>1e-8 &&
          remaining.every(i=>i===previous||i===index||i===next||!contains(a,b,c,points[i]));
      });
      if(ear<0) throw new Error('Invalid paper profile polygon');
      faces.push([remaining[(ear-1+remaining.length)%remaining.length],remaining[ear],remaining[(ear+1)%remaining.length]]);
      remaining.splice(ear,1);
    }
    faces.push(remaining);
    return faces;
  }

  // Every paper outline has front, back and edge triangles, including concave profiles.
  function sheet(target, points, faces, place, depth, face, edge) {
    const front=points.map(([x,y])=>place(x,y,depth/2));
    const back=points.map(([x,y])=>place(x,y,-depth/2));
    for(const [a,b,c] of faces) {
      triangle(target,front[a],front[b],front[c],face);
      triangle(target,back[c],back[b],back[a],edge);
    }
    for(let a=0;a<front.length;a++) {
      const b=(a+1)%front.length;
      quad(target,front[a],back[a],back[b],front[b],edge);
    }
  }

  function camera(width,height,view) {
    const aspect=width/height;
    const yaw=(view.yaw || 0)+.26;
    const elevation=clamp(.61+(view.pitch || 0),.31,1.06);
    const distance=Math.max(4.45,3.6/aspect)/(view.zoom || 1);
    const target=[0,.27,0];
    const eye=add(target,[Math.sin(yaw)*Math.cos(elevation)*distance,Math.sin(elevation)*distance,Math.cos(yaw)*Math.cos(elevation)*distance]);
    const back=unit(sub(eye,target));
    const right=unit(cross([0,1,0],back));
    const up=cross(back,right);
    const f=1/Math.tan(Math.PI/11.2), n=.1, far=30;
    const z=(far+n)/(n-far), d=2*far*n/(n-far);
    const offset=[-dot(right,eye),-dot(up,eye),-dot(back,eye)];
    return new Float32Array([
      f/aspect*right[0],f*up[0],z*back[0],-back[0],
      f/aspect*right[1],f*up[1],z*back[1],-back[1],
      f/aspect*right[2],f*up[2],z*back[2],-back[2],
      f/aspect*offset[0],f*offset[1],z*offset[2]+d,-offset[2],
    ]);
  }

  const vertexShader=`
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec4 tint;
    attribute vec2 uv;
    uniform mat4 camera;
    varying vec3 surface;
    varying vec4 pigment;
    varying vec2 coordinates;
    void main() {
      gl_Position = camera * vec4(position,1.0);
      surface = normal;
      pigment = tint;
      coordinates = uv;
    }`;
  const fragmentShader=`
    precision mediump float;
    varying vec3 surface;
    varying vec4 pigment;
    varying vec2 coordinates;
    uniform vec3 light;
    uniform vec3 warmth;
    uniform float ambient;
    uniform int material;
    uniform sampler2D image;
    void main() {
      vec3 direction = normalize(surface) * (gl_FrontFacing ? 1.0 : -1.0);
      float key = max(0.0,dot(direction,light));
      float fill = max(0.0,dot(direction,normalize(vec3(.8,.45,-.3))));
      vec4 sampleColor = material == 1 ? texture2D(image,coordinates) : vec4(1.0);
      if (sampleColor.a < .08) discard;
      vec3 illumination = material == 2 ? vec3(1.0) : ambient + warmth * (.34 * key) + .13 * fill;
      gl_FragColor = vec4(pigment.rgb * sampleColor.rgb * illumination, pigment.a * sampleColor.a);
    }`;

  function renderer(canvas,{mobile=false,onLost}={}) {
    let gl;
    try { gl=canvas.getContext('webgl',{alpha:false,antialias:!mobile,depth:true,preserveDrawingBuffer:true}); }
    catch { return null; }
    if (!gl) return null;

    const compile=(type,code)=>{
      const shader=gl.createShader(type);
      gl.shaderSource(shader,code);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex=compile(gl.VERTEX_SHADER,vertexShader);
    const fragment=compile(gl.FRAGMENT_SHADER,fragmentShader);
    if(!vertex||!fragment) {
      if(vertex)gl.deleteShader(vertex);
      if(fragment)gl.deleteShader(fragment);
      return null;
    }
    const program=gl.createProgram();
    gl.attachShader(program,vertex);
    gl.attachShader(program,fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [name,size,offset] of [['position',3,0],['normal',3,3],['tint',4,6],['uv',2,10]]) {
      const index=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index,size,gl.FLOAT,false,48,offset*4);
    }
    const uniforms=Object.fromEntries(['camera','light','warmth','ambient','material','image'].map(name=>[name,gl.getUniformLocation(program,name)]));
    const neutral=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,neutral);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.uniform1i(uniforms.image,0);
    const textures=new Map();
    let frame, destroyed=false,uploadedModel=null,vertexStorage=new Float32Array(0);
    const offsets=new Map();
    function upload(model){if(uploadedModel===model)return;const groups=[model.bed,model.shadows||[],model.solids,...(model.textures||[]).map(layer=>layer.vertices)];const count=groups.reduce((n,group)=>n+group.length,0);if(vertexStorage.length<count){vertexStorage=new Float32Array(Math.max(256,2**Math.ceil(Math.log2(count))));gl.bufferData(gl.ARRAY_BUFFER,vertexStorage.byteLength,gl.DYNAMIC_DRAW);}offsets.clear();let at=0;for(const group of groups){offsets.set(group,at/12);vertexStorage.set(group,at);at+=group.length;}if(count)gl.bufferSubData(gl.ARRAY_BUFFER,0,vertexStorage.subarray(0,count));uploadedModel=model;}
    const loss=event=>{ event.preventDefault(); onLost?.(); };
    canvas.addEventListener('webglcontextlost',loss);

    function texture(source) {
      if(!source)return neutral;
      if(!textures.has(source)) {
        const record={texture:null,image:new Image()};
        textures.set(source,record);
        record.image.onload=()=>{
          if(destroyed||gl.isContextLost())return;
          record.texture=gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D,record.texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          try {
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,record.image);
          } catch {
            gl.deleteTexture(record.texture);
            record.texture=null;
            return;
          }
          for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
          for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
          canvas.dataset.texturesReady=String([...textures.values()].filter(item=>item.texture).length);
          if(frame)draw(...frame);
        };
        record.image.src=source;
      }
      return textures.get(source).texture || neutral;
    }

    function batch(vertices,kind,source) {
      if(!vertices.length)return;
      gl.uniform1i(uniforms.material,kind);
      gl.bindTexture(gl.TEXTURE_2D,texture(source));
      gl.drawArrays(gl.TRIANGLES,offsets.get(vertices)||0,vertices.length/12);
    }

    function draw(model,view={},lighting={}) {
      if(destroyed||gl.isContextLost())return false;
      const box=canvas.getBoundingClientRect();
      if(box.width<2||box.height<2)return false;
      frame=[model,view,lighting];
      upload(model);
      const ratio=Math.min(window.devicePixelRatio || 1,mobile ? 1 : 1.6);
      const width=Math.round(box.width*ratio),height=Math.round(box.height*ratio);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      gl.viewport(0,0,width,height);
      gl.clearColor(.085,.069,.105,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uniforms.camera,false,camera(width,height,view));
      gl.uniform3fv(uniforms.light,unit(lighting.direction||[-.62,1,.38]));
      gl.uniform3fv(uniforms.warmth,lighting.warmth||[1,.88,.78]);
      gl.uniform1f(uniforms.ambient,lighting.ambient??.64);
      batch(model.bed,0);
      if(model.shadows?.length&&!mobile) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        batch(model.shadows,2);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      batch(model.solids,0);
      for(const layer of model.textures||[])batch(layer.vertices,1,layer.source);
      return true;
    }

    function destroy() {
      if(destroyed)return;
      destroyed=true;
      frame=null;uploadedModel=null;offsets.clear();vertexStorage=new Float32Array(0);
      canvas.removeEventListener('webglcontextlost',loss);
      for(const record of textures.values()){
        record.image.onload=null;
        if(record.texture)gl.deleteTexture(record.texture);
      }
      textures.clear();
      gl.deleteTexture(neutral);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    return {draw,destroy};
  }

  window.BookMesh=Object.freeze({color,triangle,quad,box,sheet,polygonFaces,renderer,clamp});
})();
