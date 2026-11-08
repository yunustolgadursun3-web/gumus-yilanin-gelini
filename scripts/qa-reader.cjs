'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/cultist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),origin=process.env.QA_URL||'http://127.0.0.1:51115/';
const source=require('../build.js').collectSource(path.join(root,'metin')).text;
const report={origin,checks:[],errors:[],httpErrors:[],overflow:[],pass:false};
const ok=(name,value)=>{assert(value,name);report.checks.push(name);};
const output=path.join(root,'outputs/qa-reader.json');
const viewports = process.env.QA_FULL === '1'
  ? [[360,800],[390,844],[430,932],[768,1024],[1366,768],[1920,1080]]
  : [[390,844],[1440,900]];
async function integrity(page,label){const q=await page.evaluate(()=>__readerQA());ok(label+' runtime source exact',q.text===source);ok(label+' paginated reassembly exact',q.joined===source);}
async function settled(page){await page.waitForFunction(()=>!__readerQA().turning);}
async function rapidKey(page,key,delta,label){await page.locator('#book-stage').focus();const before=await page.evaluate(()=>BookReader.location().page);await page.locator('#book-stage').evaluate((n,key)=>{for(let i=0;i<5;i++)n.dispatchEvent(new KeyboardEvent('keydown',{key,code:key===' '?'Space':key,bubbles:true}));},key);await settled(page);ok(label,await page.evaluate(({before,delta})=>BookReader.location().page===before+delta,{before,delta}));}
async function swipe(page,direction=1){const r=await page.locator('#book-stage').boundingBox(),a=r.x+r.width*(direction>0?.78:.22),b=r.x+r.width*(direction>0?.22:.78),y=r.y+r.height*.52;await page.mouse.move(a,y);await page.mouse.down();await page.mouse.move(b,y,{steps:4});await page.mouse.up();}
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 try{
  for(const [width,height] of viewports){
   const narrow=width<820,context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(20000);
   page.on('pageerror',e=>report.errors.push({width,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({width,status:r.status(),url:r.url()});});
   await page.route('**/app.js*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('window.BookReader = Object.freeze({','window.__readerQA=()=>({text:state.text,joined:state.pages.filter(p=>p.type===\'text\').map(p=>p.raw).join(\'\'),turning:state.isTurning,pages:state.pages.length,bookmark:JSON.parse(localStorage.getItem(BOOKMARK_KEY)||\'null\')});window.BookReader = Object.freeze({');await route.fulfill({response,body});});
   await page.goto(origin);await page.locator('#start-reading').waitFor({state:'visible'});await page.click('#start-reading');await page.locator('#reader-view').waitFor({state:'visible'});await settled(page);
   const delta=narrow?1:2;
   await page.evaluate(()=>BookReader.seek(STORY_WORLD.chapters[6].offset+300));await settled(page);
   let before=await page.evaluate(()=>BookReader.location().page);
   if(!narrow){
    await page.click('#page-next');await page.locator('#page-next').evaluate(n=>{for(let i=0;i<5;i++)n.click();});await settled(page);
    ok(`Next arrow rapid-click lock ${width}`,await page.evaluate(({before,delta})=>BookReader.location().page===before+delta,{before,delta}));
    before=await page.evaluate(()=>BookReader.location().page);await page.click('#page-previous');await settled(page);
    ok(`Previous arrow ${width}`,await page.evaluate(({before,delta})=>BookReader.location().page===before-delta,{before,delta}));
   }else{
    ok('Mobile uses gestures with edge arrows hidden',!await page.locator('#page-next').isVisible()&&!await page.locator('#page-previous').isVisible());
    await swipe(page);await settled(page);ok('Mobile forward swipe',await page.evaluate(before=>BookReader.location().page===before+1,before));
    before=await page.evaluate(()=>BookReader.location().page);await swipe(page,-1);await settled(page);ok('Mobile previous swipe',await page.evaluate(before=>BookReader.location().page===before-1,before));
   }
   await rapidKey(page,'ArrowRight',delta,`ArrowRight repeated-key lock ${width}`);
   await rapidKey(page,' ',delta,`Space repeated-key lock ${width}`);
   before=await page.evaluate(()=>BookReader.location().page);await swipe(page);await swipe(page);await settled(page);
   ok(`Swipe rapid-input lock ${width}`,await page.evaluate(({before,delta})=>BookReader.location().page===before+delta,{before,delta}));
   await page.evaluate(()=>BookReader.update({reduceMotion:true,fontScale:1,theme:'light'}));await settled(page);
   const target=await page.evaluate(()=>STORY_WORLD.chapters[10].offset+600);await page.evaluate(at=>BookReader.seek(at),target);
   for(const scale of [.8,1.6,1]){
    await page.evaluate(fontScale=>BookReader.update({fontScale}),scale);await settled(page);
    ok(`Font ${scale} keeps source offset ${width}`,await page.evaluate(at=>BookReader.location().offset===at,target));
    ok(`Font ${scale} keeps saved bookmark ${width}`,await page.evaluate(at=>__readerQA().bookmark.offset===at,target));
    await integrity(page,`Font ${scale} ${width}`);
   }
   const resized={width:narrow?(width===430?390:430):(width===1366?1440:1366),height};await page.setViewportSize(resized);await page.waitForTimeout(350);await settled(page);
   ok(`Viewport resize keeps saved source offset ${width}`,await page.evaluate(at=>BookReader.location().offset===at&&__readerQA().bookmark.offset===at,target));
   await integrity(page,`Viewport resize ${width}`);await page.setViewportSize({width,height});await page.waitForTimeout(350);await settled(page);
   const surfaces=[];
   for(const theme of ['light','sepia','night']){
    await page.evaluate(theme=>BookReader.update({theme}),theme);ok(`Theme ${theme} applies ${width}`,await page.locator('#app').getAttribute('data-theme')===theme);
    ok(`Theme ${theme} keeps source offset ${width}`,await page.evaluate(at=>BookReader.location().offset===at,target));
    surfaces.push(await page.locator('#book-spread .book-page').first().evaluate(n=>getComputedStyle(n).backgroundColor));await integrity(page,`Theme ${theme} ${width}`);
   }
   ok(`Three distinct theme surfaces ${width}`,new Set(surfaces).size===3);
   await page.evaluate(()=>BookReader.update({theme:'light',fontScale:1}));await settled(page);
   const chapters=await page.evaluate(()=>STORY_WORLD.chapters);
   for(const c of chapters){
    await page.evaluate(at=>BookReader.seek(at),c.offset);await settled(page);
    const problems=await page.evaluate(()=>[...document.querySelectorAll('#book-spread .book-page')].flatMap((p,i)=>{const out=[],pr=p.getBoundingClientRect(),content=p.querySelector('.page-content'),cr=content.getBoundingClientRect();if(content.scrollHeight>content.clientHeight+3)out.push({page:i,type:'content-scroll',scroll:content.scrollHeight,client:content.clientHeight});for(const text of p.querySelectorAll('.page-text')){const tr=text.getBoundingClientRect();if(text.scrollHeight>text.clientHeight+3)out.push({page:i,type:'text-scroll',scroll:text.scrollHeight,client:text.clientHeight});if(tr.bottom>pr.bottom+2||tr.top<pr.top-2)out.push({page:i,type:'text-outside-page',top:tr.top,bottom:tr.bottom,pageTop:pr.top,pageBottom:pr.bottom});}if(cr.bottom>pr.bottom+2)out.push({page:i,type:'content-outside-page'});return out;}));
    if(problems.length)report.overflow.push({width,chapter:c.number,problems});
   }
   ok(`All chapter views fit vertical CSS bounds ${width}`,report.overflow.filter(o=>o.width===width).length===0);
   await page.screenshot({path:path.join(root,`outputs/qa-reader-${width}.png`)});await context.close();
  }
  ok('No reader JavaScript errors',report.errors.length===0);report.pass=true;
 }finally{await browser.close();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,errors:report.errors.length,overflow:report.overflow.length,httpErrors:report.httpErrors.length,report:output}));
})().catch(e=>{report.failure=e.stack;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.error(e.stack);process.exitCode=1;});
