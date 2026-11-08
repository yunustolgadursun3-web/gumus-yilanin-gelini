'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/cultist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.QA_URL||'http://127.0.0.1:51117/';
const label=process.argv[2]||'after';
const report={label,url,runs:[]};
const round=n=>Math.round(n*10)/10;
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',args:['--mute-audio']});
 try {
 for(let run=0;run<Number(process.env.QA_RUNS||3);run++){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(14000);const cdp=await context.newCDPSession(page);
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 page.on('request',r=>requests.push(new URL(r.url()).pathname));
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await page.addInitScript(()=>{
  window.deepMetrics={measureReads:0,raf:[],long:[],lcp:0};
  const d=Object.getOwnPropertyDescriptor(Element.prototype,'scrollHeight');
  Object.defineProperty(Element.prototype,'scrollHeight',{...d,get(){if(this.classList?.contains('page-text')&&this.closest('.measure-page'))deepMetrics.measureReads++;return d.get.call(this);}});
  new PerformanceObserver(l=>deepMetrics.long.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
  new PerformanceObserver(l=>{deepMetrics.lcp=l.getEntries().at(-1)?.startTime||0;}).observe({type:'largest-contentful-paint',buffered:true});
 });
 assert.equal((await page.goto(url,{waitUntil:'load'})).status(),200);
 await page.locator('#start-reading').waitFor();
 await page.waitForTimeout(300);
 const startup=await page.evaluate(()=>({lcp:deepMetrics.lcp,load:performance.getEntriesByType('navigation')[0].loadEventEnd,bytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.encodedBodySize,0),scripts:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='script').length,startupLong:deepMetrics.long.reduce((a,b)=>a+b,0)}));
 const beforeRequests=[...requests];
 const opening=await page.evaluate(()=>{const start=performance.now();document.querySelector('#start-reading').click();return{sync:performance.now()-start,reads:deepMetrics.measureReads};});
 await page.locator('.physical-cover-stage').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(350);
 const turns=await page.evaluate(async()=>{
  const initial=BookReader.location().page,reads=deepMetrics.measureReads,durations=[],frames=[];let delayed=0;
  for(const [id,amount,delta] of [['page-next',20,1],['page-previous',10,-1]]){
   for(let i=0;i<amount;i++){
    const start=performance.now(),from=BookReader.location().page;
    const button=document.getElementById(id);button.click();if(i===0)button.click();
    durations.push(performance.now()-start);
    for(let attempt=0;attempt<6&&BookReader.location().page===from;attempt++){if(attempt===0)delayed++;await new Promise(r=>setTimeout(r,100));button.click();}
    if(BookReader.location().page!==from+delta)throw Error('Mobile turn out of sequence '+id+': '+from+' → '+BookReader.location().page+'; '+button.disabled);
    let previous=start;
    do{const t=await new Promise(requestAnimationFrame);frames.push(t-previous);previous=t;}while(performance.now()-start<240);
   }
  }
  return{delta:BookReader.location().page-initial,maxSync:Math.max(...durations),medianSync:durations.sort((a,b)=>a-b)[Math.floor(durations.length/2)],frameP95:frames.sort((a,b)=>a-b)[Math.floor(frames.length*.95)],reads:deepMetrics.measureReads-reads,delayed};
 });
 assert.equal(turns.delta,10);
 const reopened=await page.evaluate(()=>{const begin=performance.now();BookReader.home();const start=performance.now(),reads=deepMetrics.measureReads;document.getElementById('start-reading').click();return{sync:performance.now()-start,reads:deepMetrics.measureReads-reads,homeSync:start-begin};});
 await page.locator('.physical-cover-stage').waitFor({state:'detached'});await page.evaluate(()=>BookReader.update({reduceMotion:true}));
 const art=await page.evaluate(()=>BookReader.illustrations().find(a=>a.chapterId==='chapter-01'));
 const seekArt=()=>page.evaluate(a=>BookReader.seek(a.offset,{anchor:{...BookReader.sourceAnchor(a.offset),leaf:a.leaf}}),art);
 const startPopup=Date.now();await seekArt();await page.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
 const popupReady=Date.now()-startPopup;
 const heaps=[];
 if(run===0){
  for(let i=0;i<5;i++){
   await page.getByRole('button',{name:'3B incele',exact:true}).click();
   await page.locator('#popup-inspector[open] canvas[data-textures-ready="1"]').waitFor();
   await page.locator('#popup-inspector').getByRole('button',{name:'Kapat',exact:true}).click();
   await page.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
   await cdp.send('HeapProfiler.collectGarbage');heaps.push((await cdp.send('Runtime.getHeapUsage')).usedSize);
  }
 }
 await page.evaluate(()=>BookReader.seek(BOOK_STORY.charLength));
 const startAtlas=Date.now();await page.locator('#reader-map-open').click();const box=page.locator('.atlas-sheet:not(.atlas-sheet--mini) .world-map');await box.waitFor();const atlasReady=Date.now()-startAtlas;
 await page.locator('[data-zoom="in"]').click();const rect=await box.boundingBox(),y=rect.y+14,x=rect.x+rect.width/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert((await box.evaluate(n=>n.closest('.atlas-sheet').atlasCamera.state().scale))>1.3);
 const atlas=await box.evaluate(async box=>{
   let writes=0;const out=box.closest('.atlas-sheet').querySelector('.atlas-tools output');
   const monitor=new MutationObserver(records=>writes+=records.length);monitor.observe(out,{childList:true});
   const r=box.getBoundingClientRect(),x=r.left+30,y=r.top+15;box.setPointerCapture=()=>{};
   const dispatch=(type,n)=>box.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:5,clientX:x+n,clientY:y+n/5}));
   dispatch('pointerdown',0);const start=performance.now();
   for(let f=0;f<12;f++){for(let i=0;i<8;i++)dispatch('pointermove',f*4+i);await new Promise(requestAnimationFrame);}
   dispatch('pointerup',50);monitor.disconnect();
   return{ms:performance.now()-start,zoomLabelMutations:writes,x:box.closest('.atlas-sheet').atlasCamera.state().x};
 });
 await page.locator('[data-zoom="reset"]').click();assert.equal(await box.evaluate(n=>n.closest('.atlas-sheet').atlasCamera.state().scale),1);
 await page.getByLabel('Haritada mekân seç',{exact:true}).selectOption('oratorium');
 await page.locator('.dossier-enter').click();await page.locator('.location-controls').getByRole('button',{name:'Tam Ekran İncele',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#illustration-studio[open] img')?.naturalWidth>0);
 await page.locator('.illustration-close').click();await page.locator('#world-close').click();await page.locator('#world-close').click();
 await seekArt();await page.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
 const location=await page.evaluate(()=>BookReader.location().offset);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>BookReader.location().offset),location);
 await page.reload();await page.locator('#continue-reading').waitFor();await page.locator('#continue-reading').evaluate(button=>button.click());assert.equal(await page.evaluate(()=>BookReader.location().offset),location);
 assert.deepEqual(errors,[]);
 report.runs.push({startup,opening,turns,reopened,popupReady,atlasReady,atlas,heaps,errors,initialOptional:beforeRequests.filter(s=>/book-mesh|popup-fold-rig|book-popup\.js|atlas-living|location-explorer/.test(s))});
 await context.close();
 }
 for(const key of ['startup','opening','turns','reopened','atlas'])report[key]=Object.fromEntries(Object.keys(report.runs[0][key]).map(k=>[k,round(median(report.runs.map(r=>r[key][k])))]));
 report.popupReady=median(report.runs.map(r=>r.popupReady));report.atlasReady=median(report.runs.map(r=>r.atlasReady));
 fs.writeFileSync('outputs/deep-perf-'+label+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,runs:undefined,heaps:report.runs[0].heaps,optional:report.runs[0].initialOptional}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
