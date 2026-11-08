/* Fold geometry. A pose is derived solely from its 0–1 opening value. */
(() => {
  'use strict';
  const mesh=window.BookMesh;
  if(!mesh)return;
  const {box,quad,sheet,polygonFaces,color,clamp}=mesh;
  const rectangle=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
  const templates=Object.freeze({
    architecture:(w,h)=>[[-w*.5,0],[w*.5,0],[w*.5,h*.69],[w*.6,h*.69],[w*.6,h*.88],[w*.39,h*.88],[w*.39,h],[w*.17,h],[w*.17,h*.88],[-w*.17,h*.88],[-w*.17,h],[-w*.39,h],[-w*.39,h*.88],[-w*.6,h*.88],[-w*.6,h*.69],[-w*.5,h*.69]],
    nature:(w,h)=>[[-w*.09,0],[w*.09,0],[w*.09,h*.23],[w*.5,h*.23],[w*.29,h*.5],[w*.39,h*.5],[0,h],[-w*.39,h*.5],[-w*.29,h*.5],[-w*.5,h*.23],[-w*.09,h*.23]],
    city:(w,h)=>[[-w/2,0],[w/2,0],[w/2,h*.48],[w*.27,h*.48],[w*.27,h*.79],[w*.1,h*.79],[w*.1,h],[-w*.13,h],[-w*.13,h*.61],[-w*.36,h*.61],[-w*.36,h*.38],[-w/2,h*.38]],
    interior:(w,h)=>[[-w/2,0],[w/2,0],[w/2,h*.63],[w*.21,h*.63],[w*.21,h],[-w*.26,h],[-w*.26,h*.55],[-w/2,h*.55]],
    illustration:rectangle,
    panorama:(w,h)=>[[-w/2,0],[w/2,0],[w/2,h*.48],[w*.31,h*.74],[w*.17,h*.49],[-w*.09,h],[-w*.31,h*.5],[-w/2,h*.68]],
  });

  function prepare(scene) {
    if(!scene || !templates[scene.type] || !Array.isArray(scene.panels) || !scene.panels.length || scene.panels.length>32) return null;
    const ids=new Set();
    const liftIds=new Set();
    const panels=[];
    for(const input of scene.panels) {
      if(!input.id || ids.has(input.id) || !['hinge','parallel','v-fold'].includes(input.fold) ||
         !Array.isArray(input.origin) || input.origin.length!==3 || !input.origin.every(Number.isFinite) ||
         !Number.isFinite(input.width) || input.width<=0 || !Number.isFinite(input.height) || input.height<=0 ||
         (input.mount && !liftIds.has(input.mount)))return null;
      ids.add(input.id);
      if(input.fold==='parallel')liftIds.add(input.id);
      const shape=templates[input.profile || scene.type];
      if(!shape)return null;
      const outline=shape(input.width,input.height);
      panels.push({
        ...input,outline,faces:polygonFaces(outline),
        face:color(input.paper || '#b69685'),edge:color(input.edge || '#6a505b'),
        angles:(input.angle ?? 87)*Math.PI/180,yaw:(input.axis ?? 0)*Math.PI/180,
      });
    }
    return panels;
  }

  function progressAt(panel,progress) {
    const begin=panel.reveal?.[0] ?? 0;
    const end=panel.reveal?.[1] ?? 1;
    const p=clamp((progress-begin)/Math.max(.01,end-begin),0,1);
    return p*p*(3-2*p);
  }

  function hinge(origin,angle,yaw) {
    const [x,y,z]=origin;
    const c=Math.cos(angle),s=Math.sin(angle),ca=Math.cos(yaw),sa=Math.sin(yaw);
    return (u,v,n=0)=>{
      const depth=v*c+n*s;
      return [x+u*ca+depth*sa,y+v*s-n*c,z-u*sa+depth*ca];
    };
  }

  function printedBook(target,palette) {
    const paper=color(palette.paper || '#e8d0af');
    const edge=color(palette.edge || '#b09880');
    const board=color(palette.binding || '#5f3c4e');
    const shadow=color('#2b1d2c');
    box(target,[-1.12,-.12,-.72],[1.12,-.074,.73],board,board,shadow);
    for(const [left,right] of [[-1.07,-.016],[.016,1.07]]) {
      box(target,[left,-.075,-.675],[right,0,.678],paper,edge,board);
      for(let level=1;level<=5;level++){
        const y=-.074+level*.012;
        quad(target,[left,y,.679],[right,y,.679],[right,y+.002,.679],[left,y+.002,.679],edge);
      }
      for(const x of [left+.045,right-.045])quad(target,[x,.001,-.625],[x+.003,.001,-.625],[x+.003,.001,.625],[x,.001,.625],edge);
      for(const z of [-.625,.625])quad(target,[left+.045,.001,z],[right-.045,.001,z],[right-.045,.001,z+.003],[left+.045,.001,z+.003],edge);
    }
    box(target,[-.019,-.085,-.684],[.019,-.022,.69],shadow,board,shadow);
  }

  function putShadow(target,points,lighting,opening) {
    if(opening<.035)return;
    const [lx,ly,lz]=lighting.direction;
    const onPaper=([x,y,z])=>[clamp(x-lx/ly*y,-1.064,1.064),.006,clamp(z-lz/ly*y,-.668,.668)];
    quad(target,...points.map(onPaper),color('#281923',.11*opening));
  }

  function create(scene) {
    const panels=prepare(scene);
    if(!panels)return null;
    let bed=[], bedPalette;
    function pose(value,palette={},lightOverride={},shadows=true) {
      const opening=clamp(Number(value)||0,0,1);
      const lighting={
        direction:scene.light?.direction || [-.62,1,.38],ambient:scene.light?.ambient ?? .65,
        warmth:scene.light?.warmth || [1,.88,.78],...lightOverride,
      };
      const paletteKey=[palette.paper,palette.edge,palette.binding].join('|');
      if(paletteKey!==bedPalette){bed=[];printedBook(bed,palette);bedPalette=paletteKey;}
      const model={bed,solids:[],shadows:[],textures:[],joints:[]};
      const lifts=new Map();
      for(const panel of panels) {
        const p=progressAt(panel,opening);
        const angle=p*panel.angles;
        const [x,y,z]=panel.origin;
        const mount=panel.mount && lifts.get(panel.mount);
        const base=[x+(mount?.[0]||0),y+(mount?.[1]||0),z+(mount?.[2]||0)];
        const width=panel.width,height=panel.height;
        const left=-width/2,right=width/2;
        if(panel.fold==='v-fold') {
          // Sliding feet and the shared ridge keep both paper panels at constant length.
          const run=height*Math.cos(angle), rise=height*Math.sin(angle);
          const [X,Y,Z]=base;
          const ridge=[X,Y+rise,Z];
          for(const direction of [-1,1]) {
            const foot=[X+direction*run,Y,Z];
            const place=(u,v,n=0)=>[foot[0]+direction*(n*Math.sin(angle)-v*Math.cos(angle)),foot[1]+v*Math.sin(angle)+n*Math.cos(angle),foot[2]+u];
            const profile=rectangle(width,height);
            sheet(model.solids,profile,[[0,1,2],[0,2,3]],place,.013,panel.face,panel.edge);
            if(shadows)putShadow(model.shadows,[place(left,0),place(right,0),place(right,height),place(left,height)],lighting,p);
            model.joints.push({id:panel.id,axis:[0,0,1],foot,ridge,angle});
          }
          continue;
        }
        if(panel.fold==='parallel') {
          const gap=panel.span || .23;
          const place=hinge(base,angle,panel.yaw);
          const roof=place(0,height);
          for(const side of [-1,1]) {
            const foot=[base[0],base[1],base[2]+side*gap/2];
            const strut=hinge(foot,angle,panel.yaw);
            const outline=rectangle(width*.78,height);
            sheet(model.solids,outline,[[0,1,2],[0,2,3]],strut,.012,panel.edge,panel.face);
          }
          box(model.solids,[roof[0]+left,roof[1],roof[2]-gap/2],[roof[0]+right,roof[1]+.018,roof[2]+gap/2],panel.face,panel.edge);
          lifts.set(panel.id,[roof[0],roof[1]+.022,roof[2]]);
          model.joints.push({id:panel.id,axis:[1,0,0],foot:base,ridge:roof,angle});
          if(shadows)putShadow(model.shadows,[[roof[0]+left,roof[1],roof[2]-gap/2],[roof[0]+right,roof[1],roof[2]-gap/2],[roof[0]+right,roof[1],roof[2]+gap/2],[roof[0]+left,roof[1],roof[2]+gap/2]],lighting,p);
          continue;
        }
        const place=hinge(base,angle,panel.yaw);
        sheet(model.solids,panel.outline,panel.faces,place,.014,panel.face,panel.edge);
        if(panel.texture) {
          const vertices=[];
          quad(vertices,place(left,0,.008),place(right,0,.008),place(right,height,.008),place(left,height,.008),color('#ffffff'));
          model.textures.push({source:panel.texture,vertices});
        }
        for(const detail of panel.ink || []) {
          const [u,v,w,h,pigment]=detail;
          quad(model.solids,place(u,v,.009),place(u+w,v,.009),place(u+w,v+h,.009),place(u,v+h,.009),color(pigment));
        }
        if(shadows)putShadow(model.shadows,[place(left,0),place(right,0),place(right,height),place(left,height)],lighting,p);
        model.joints.push({id:panel.id,axis:[Math.cos(panel.yaw),0,-Math.sin(panel.yaw)],foot:base,ridge:place(0,height),angle});
      }
      return {model,lighting};
    }
    return {pose};
  }
  window.PopupFoldRig=Object.freeze({create,templates});
})();
