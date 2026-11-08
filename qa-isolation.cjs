'use strict';
const {chromium}=require('C:/Users/cultist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const origin=process.env.QA_URL||'https://alti-tahtin-yedinci-sirri-mobil.eagerkoi67.chatgpt.site/';
const dest=process.argv[2]||'baseline';
const profile=process.argv[3]||'all';
const runs={};
(async()=>{const b=await chromium.launch({channel:'msedge',args:['--mute-audio','--disable-background-timer-throttling']});try{
for(const mode of profile==='all'?['normal','webgl-off','popup-off','effects-off']:['normal']){
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),p=await c.newPage();const d=await c.newCDPSession(p);p.setDefaultTimeout(20000);
 if(process.env.QA_PATCH_POPUP==='1')await p.route('**/book-popup.js?*',r=>r.fulfill({path:'book-popup.js',contentType:'application/javascript'}));
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await d.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.addInitScript(mode=>{
  window.qa={draws:0,contexts:0,rgbaUploads:0,readbacks:0,tasks:[]};
  new PerformanceObserver(l=>qa.tasks.push(...l.getEntries().map(x=>x.duration))).observe({type:'longtask',buffered:true});
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(name,...args){if(name==='webgl'){qa.contexts++;if(mode==='webgl-off')return null;}return get.call(this,name,...args);};
  for(const [method,key] of [['drawArrays','draws'],['texImage2D','rgbaUploads'],['readPixels','readbacks']]){
   const original=WebGLRenderingContext.prototype[method];WebGLRenderingContext.prototype[method]=function(...args){qa[key]++;return original.apply(this,args);};
  }
 },mode);
 assert.equal((await p.goto(origin)).status(),200);await p.locator('#start-reading').waitFor();await p.evaluate(()=>document.fonts.ready);
 const cold=await p.evaluate(()=>{const t=performance.now();document.getElementById('start-reading').click();return Math.round(performance.now()-t);});
 await p.locator('.physical-cover-stage').waitFor({state:'detached'});
 await p.evaluate(mode=>{BookReader.update({bookDepth:'physical',readingMode:'physical',reduceMotion:false,popupPages:mode!=='popup-off',microEffects:mode!=='effects-off',atmosphereIntensity:mode==='effects-off'?'off':'normal'});},mode);
 if(mode==='effects-off')await p.addStyleTag({content:'.scene-fx,.reading-room-light,.cover-environment img,.atlas-local-light,.session-note{animation:none!important}'});
 const art=await p.evaluate(()=>BookReader.illustrations().find(a=>a.chapterId==='chapter-01'));assert(art);
 const seek=()=>p.evaluate(a=>BookReader.seek(a.offset,{anchor:{...BookReader.sourceAnchor(a.offset),leaf:a.leaf}}),art);
 await seek();await p.waitForTimeout(850);
 const observation=await p.evaluate(async()=>{
   const start={...qa},at=BookReader.location().page;const sync=[],frames=[];
   for(let i=0;i<8;i++){
    const dir=i%2?'previous':'next';const t=performance.now();
    document.getElementById('page-'+dir).click();document.getElementById('page-'+dir).click();
    sync.push(performance.now()-t);if(BookReader.location().page!==at+(i%2?0:1))throw Error('Turn skipped or doubled '+i);
    let previous=performance.now();do{const now=await new Promise(requestAnimationFrame);frames.push(now-previous);previous=now;}while(performance.now()-t<275);
   }
   const result={p95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)],maxClick:Math.max(...sync),draws:qa.draws-start.draws,contexts:qa.contexts-start.contexts,uploads:qa.rgbaUploads-start.rgbaUploads,tasks:qa.tasks.slice(start.tasks.length).length};
   return result;
 });
 await p.waitForTimeout(800);
 const draws=await p.evaluate(()=>qa.draws);await p.waitForTimeout(450);const idleDraws=(await p.evaluate(()=>qa.draws))-draws;
 let heap=[];
 if(mode==='normal'){
  await p.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
  for(let i=0;i<3;i++){
   await p.getByRole('button',{name:'3B incele',exact:true}).click();await p.locator('#popup-inspector[open] canvas[data-textures-ready="1"]').waitFor();
   await p.locator('#popup-inspector').getByRole('button',{name:'Kapat',exact:true}).click();await p.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
   await d.send('HeapProfiler.collectGarbage');heap.push((await d.send('Runtime.getHeapUsage')).usedSize);
  }
 }
 assert.deepEqual(errors,[]);runs[mode]={cold,...observation,idleDraws,heap};console.log(JSON.stringify({mode,...runs[mode]}));await c.close();
}
fs.writeFileSync('outputs/perf-isolation-'+dest+'.json',JSON.stringify({origin,runs},null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
