(() => {
  'use strict';
  const reader=window.BookReader, mesh=window.BookMesh, rigs=window.PopupFoldRig;
  const app=document.getElementById('app');
  if(!reader||!mesh||!rigs||!app)return;

  const scenes=(window.BOOK_POPUP_SCENES||[]).filter(scene=>scene.storyId===window.BOOK_PLAN?.storageId);
  const compiled=new Map(scenes.map(scene=>[scene.chapterId,{scene,rig:null}]));
  if(!compiled.size)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>media.matches||Boolean(reader.settings().reduceMotion);
  const limited=()=>app.dataset.performanceLite==='true';
  const paletteKeys={paper:'--studio-paper',edge:'--studio-edge',binding:'--binding-cover'};
  const deskLights={
    day:{direction:[-.5,1,.5],warmth:[1,.97,.9],ambient:.73},
    dusk:{direction:[.65,1,.3],warmth:[1,.68,.59],ambient:.61},
    candle:{direction:[-.77,1,.37],warmth:[1,.78,.55],ambient:.63},
    moon:{direction:[.63,1,.45],warmth:[.63,.81,1],ambient:.62},
    library:{direction:[-.46,1,.34],warmth:[.99,.86,.7],ambient:.59},
    oled:{direction:[-.44,1,.42],warmth:[.74,.7,.89],ambient:.59},
  };
  const defaultView=()=>({yaw:0,pitch:0,zoom:1});
  let active=null, turn=null, inspection=null, returnFocus=null, graphicsFailed=false;
  let parked=null, parkingTimer=0;

  function palette() {
    const style=getComputedStyle(app);
    return Object.fromEntries(Object.entries(paletteKeys).map(([key,value])=>[key,style.getPropertyValue(value).trim()]));
  }
  function element(tag,className,text) {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text)node.textContent=text;
    return node;
  }
  function control(text,run) {
    const button=element('button','popup-control',text);
    button.type='button';
    button.addEventListener('click',run);
    return button;
  }
  function display(entry,canvas,onLost,detail=false) {
    if(!entry.rig){
      try { entry.rig=rigs.create(entry.scene); } catch { return null; }
      if(!entry.rig)return null;
    }
    const render=mesh.renderer(canvas,{mobile:limited(),onLost});
    if(!render)return null;
    let paint=palette(), lighting=deskLights[app.dataset.readingLight];
    const view=defaultView();
    if(detail)view.zoom=1.04;
    let frame=0,paintFrame=0,opening=0,destroyed=false,pose=null,visible=true,motionTarget=null;
    function draw(value=opening) {
      if(destroyed||!visible||!canvas.isConnected||document.hidden)return;
      const next=mesh.clamp(value,0,1);
      if(!pose||next!==opening)pose=entry.rig.pose(next,paint,lighting,!limited());
      opening=next;
      canvas.dataset.opening=opening.toFixed(4);
      canvas.dataset.triangles=String((pose.model.bed.length+pose.model.solids.length+pose.model.textures.reduce((n,item)=>n+item.vertices.length,0))/36);
      render.draw(pose.model,view,pose.lighting);
    }
    function pause() {cancelAnimationFrame(frame);cancelAnimationFrame(paintFrame);frame=paintFrame=0;}
    function schedule(){if(!destroyed&&!paintFrame)paintFrame=requestAnimationFrame(()=>{paintFrame=0;draw();});}
    function motion(target) {
      motionTarget=target;
      pause();
      if(reduced()||document.hidden){draw(target);return;}
      const from=opening;
      const duration=180+420*Math.abs(target-from);
      const start=performance.now();
      let lastPaint=-Infinity;
      function tick(now) {
        const fraction=mesh.clamp((now-start)/duration,0,1);
        if(!limited()||now-lastPaint>=32||fraction===1){draw(from+(target-from)*fraction);lastPaint=now;}
        if(fraction<1)frame=requestAnimationFrame(tick);
        else frame=0;
      }
      frame=requestAnimationFrame(tick);
    }
    const resize=new ResizeObserver(schedule);
    resize.observe(canvas);
    const visibility=new IntersectionObserver(entries=>{if(destroyed)return;visible=entries[0].isIntersecting;if(!visible)pause();else if(motionTarget!==null&&Math.abs(opening-motionTarget)>.001)motion(motionTarget);else schedule();});
    visibility.observe(canvas);
    function refresh() {
      paint=palette();lighting=deskLights[app.dataset.readingLight];
      pose=null;
      draw();
    }
    function destroy() {
      destroyed=true;
      pause();
      resize.disconnect();visibility.disconnect();
      render.destroy();
    }
    function resume() {
      visible=true;
      if (motionTarget!==null&&Math.abs(opening-motionTarget)>.001) motion(motionTarget);
      else schedule();
    }
    return {view,draw,schedule,pause,motion,refresh,destroy,resume,get opening(){return opening;}};
  }

  function disposeActive() {
    if(!active)return;
    active.display.destroy();
    active.panel.remove();
    active=null;
  }

  function disposeParked() {
    clearTimeout(parkingTimer);
    parked?.display.destroy();
    parked=null;
  }

  function parkActive() {
    if (!active) return;
    disposeParked();
    active.display.pause();
    active.panel.remove();
    parked=active;
    active=null;
    parkingTimer=setTimeout(disposeParked, 1800);
  }

  function sync() {
    if(turn)return;
    const settings=reader.settings();
    const location=reader.location();
    if(document.hidden || document.querySelector('dialog[open]') || graphicsFailed || !location.open || settings.popupPages===false ||
       settings.bookDepth==='flat'|| !['physical','cinematic'].includes(location.mode)) {
      disposeActive();
      disposeParked();
      return;
    }
    const choices=reader.visiblePages().flatMap(page=>[...page.querySelectorAll('figure[data-chapter-art]')].map(figure=>({page,figure})));
    const current=choices.find(({page,figure})=>{
      const entry=compiled.get(figure.dataset.chapterArt);
      const image=figure.querySelector('img.illustration-image');
      return entry&&Number(page.dataset.sourceStart)>=entry.scene.unlock&&
        image?.getAttribute('src')?.replace(/^\.\//,'')===entry.scene.artwork;
    });
    if(active&&active.limited!==limited())disposeActive();
    if(active&&active.figure===current?.figure)return;
    const entry=current&&compiled.get(current.figure.dataset.chapterArt);
    if(active&&active.entry===entry) {
      Object.assign(active,current);
      current.figure.append(active.panel);
      active.display.refresh();
      return;
    }
    if(!current){parkActive();return;}
    disposeActive();
    if(parked?.entry===entry&&parked.limited===limited()){
      clearTimeout(parkingTimer);
      active=parked;
      parked=null;
      Object.assign(active,current);
      current.figure.append(active.panel);
      active.display.resume();
      return;
    }
    disposeParked();

    const panel=element('section','popup-leaf-panel');
    panel.dataset.scene=entry.scene.id;
    panel.setAttribute('aria-label',entry.scene.title);
    const canvas=element('canvas','popup-leaf-canvas');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',entry.scene.description);
    const caption=element('span','popup-leaf-caption',entry.scene.title);
    const actions=element('div','popup-leaf-actions');
    let folded=false;
    const fold=control('Katla',()=>{
      folded=!folded;
      fold.textContent=folded?'Aç':'Katla';
      view.motion(folded?0:1);
    });
    const inspect=control('3B incele',()=>openInspection(entry,inspect));
    actions.append(fold,inspect);
    panel.append(canvas,caption,actions);
    current.figure.append(panel);
    const view=display(entry,canvas,()=>{
      graphicsFailed=true;
      if(active?.panel===panel)disposeActive();
    });
    if(!view){graphicsFailed=true;panel.remove();return;}
    active={...current,entry,panel,canvas,display:view,limited:limited()};
    view.draw(reduced()?1:0);
    if(!reduced())view.motion(1);
  }

  // Freeze a real fully-folded projection onto the printed leaf during the curl.
  function beginTurn(outgoing) {
    if(!active||turn||reduced())return null;
    const item=active;
    const start=item.display.opening;
    item.display.pause();
    let print=null;
    if(item.page===outgoing) {
      item.display.draw(0);
      try {print=item.canvas.toDataURL('image/png');} catch {}
      item.display.draw(start);
    }
    turn={
      share:start>.01?.26:0,
      print(page){return page===item.page?print:null;},
      move(fraction) {
        const folded=this.share ? Math.min(1,fraction/this.share) : 1;
        const target=start*(1-folded);
        if(Math.abs(item.display.opening-target)>.0001)item.display.draw(target);
      },
      end() {
        turn=null;
        if(active===item&&item.panel.isConnected)item.display.motion(start>.01?1:0);
      },
    };
    return turn;
  }

  function closeBeforeCover(done) {
    if(!active || active.display.opening<.01 || reduced() || document.hidden)return false;
    const item=active;
    const from=item.display.opening;
    const start=performance.now();
    item.display.pause();
    function step(now) {
      if(active!==item || document.hidden){done();return;}
      const amount=mesh.clamp((now-start)/220,0,1);
      item.display.draw(from*(1-amount));
      if(amount<1)requestAnimationFrame(step);
      else done();
    }
    requestAnimationFrame(step);
    return true;
  }

  const dialog=element('dialog','popup-inspector');
  dialog.id='popup-inspector';
  dialog.setAttribute('aria-labelledby','popup-inspector-title');
  const header=element('header','popup-inspector-head');
  const title=element('h2');
  title.id='popup-inspector-title';
  const close=control('Kapat',()=>dialog.close());
  header.append(title,close);
  const frame=element('div','popup-inspector-frame');
  frame.tabIndex=0;
  frame.setAttribute('aria-label','3B inceleme alanı. Ok tuşlarıyla döndür.');
  const info=element('p','popup-inspector-copy');
  const bar=element('div','popup-inspector-controls');
  const zoomLabel=element('label','popup-zoom','Yakınlaştır');
  const zoom=element('input');
  zoom.type='range';zoom.min='100';zoom.max='165';zoom.step='1';zoom.value='104';
  zoomLabel.append(zoom);
  zoom.addEventListener('input',()=>{
    if(!inspection)return;
    inspection.view.zoom=Number(zoom.value)/100;
    inspection.schedule();
  });
  function resetView() {
    if(!inspection)return;
    Object.assign(inspection.view,defaultView());
    zoom.value='100';
    inspection.schedule();
  }
  bar.append(zoomLabel,control('Bakışı sıfırla',resetView),control('Yeniden aç',()=>{
    if(!inspection)return;
    inspection.draw(0);
    inspection.motion(1);
  }));
  dialog.append(header,frame,bar,info);
  app.append(dialog);

  const pointers=new Map();
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  frame.addEventListener('pointerdown',event=>{
    if(!inspection||pointers.size>=2)return;
    event.stopPropagation();
    frame.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  });
  frame.addEventListener('pointermove',event=>{
    const before=pointers.get(event.pointerId);
    if(!inspection||!before)return;
    const after={x:event.clientX,y:event.clientY};
    pointers.set(event.pointerId,after);
    if(pointers.size===2) {
      const other=[...pointers.entries()].find(([id])=>id!==event.pointerId)[1];
      inspection.view.zoom=mesh.clamp(inspection.view.zoom*distance(after,other)/Math.max(4,distance(before,other)),1,1.65);
      zoom.value=String(Math.round(inspection.view.zoom*100));
    } else {
      inspection.view.yaw=mesh.clamp(inspection.view.yaw+(after.x-before.x)*.006,-.76,.76);
      inspection.view.pitch=mesh.clamp(inspection.view.pitch+(after.y-before.y)*.006,-.25,.36);
    }
    inspection.schedule();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(name,event=>pointers.delete(event.pointerId));
  frame.addEventListener('keydown',event=>{
    if(!inspection||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    event.stopPropagation();
    if(event.key==='ArrowLeft'||event.key==='ArrowRight')inspection.view.yaw=mesh.clamp(inspection.view.yaw+(event.key==='ArrowLeft'?-.085:.085),-.76,.76);
    else inspection.view.pitch=mesh.clamp(inspection.view.pitch+(event.key==='ArrowUp'?.085:-.085),-.25,.36);
    inspection.schedule();
  });

  function openInspection(entry,trigger) {
    if(dialog.open)return;
    returnFocus=trigger;
    title.textContent=entry.scene.title;
    info.textContent=entry.scene.description;
    const canvas=element('canvas','popup-inspector-canvas');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',entry.scene.description);
    frame.replaceChildren(canvas);
    document.dispatchEvent(new CustomEvent('book:panel-open',{detail:'popup-inspector'}));
    dialog.showModal();
    disposeActive();
    disposeParked();
    inspection=display(entry,canvas,()=>dialog.close(),true);
    if(!inspection){dialog.close();return;}
    zoom.value='104';
    inspection.draw(reduced()?1:0);
    if(!reduced())inspection.motion(1);
    frame.focus();
  }
  dialog.addEventListener('close',()=>{
    inspection?.destroy();
    inspection=null;
    pointers.clear();
    frame.replaceChildren();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  });
  document.addEventListener('book:panel-open',event=>{
    if(dialog.open&&event.detail!=='popup-inspector')dialog.close();
  });

  function settingsChanged() {
    disposeParked();
    active?.display.refresh();
    inspection?.refresh();
    sync();
  }
  document.addEventListener('book:settings',settingsChanged);
  let syncFrame=0;
  function queueSync(){if(!syncFrame)syncFrame=requestAnimationFrame(()=>{syncFrame=0;sync();});}
  window.addEventListener('pageshow',queueSync);
  document.addEventListener('book:panel-open',queueSync);
  document.addEventListener('close',queueSync,true);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(syncFrame);syncFrame=0;disposeActive();disposeParked();inspection?.destroy();});
  document.addEventListener('book:location',sync);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&dialog.open)dialog.close();
    sync();
  });
  new MutationObserver(sync).observe(document.getElementById('reader-view'),{attributes:true,attributeFilter:['hidden']});
  media.addEventListener('change',()=>{
    if(reduced()){active?.display.pause();active?.display.draw(1);inspection?.pause();inspection?.draw(1);}
    sync();
  });
  settingsChanged();
  window.BookPopup=Object.freeze({beginTurn,closeBeforeCover});
})();
