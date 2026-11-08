'use strict';
const {chromium}=require('C:/Users/cultist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.QA_URL||'http://127.0.0.1:51121/';
const report={url,views:[],errors:[]};
(async()=>{const browser=await chromium.launch({channel:'msedge',args:['--mute-audio']});try{
for(const [width,height] of [[360,800],[390,844],[430,932],[1440,900]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:width<820,hasTouch:width<820,serviceWorkers:'block'});
 const p=await c.newPage();p.setDefaultTimeout(18000);
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 assert.equal((await p.goto(url)).status(),200);
 await p.locator('#start-reading').waitFor();await p.locator('.cover-art img').evaluate(n=>n.decode());
 assert.equal(await p.locator('#cover-title').textContent(),'AYIN UNUTTUĞU KRAL');
 if(width===390)await p.screenshot({path:'outputs/cover-390.png'});
 await p.locator('#start-reading').evaluate(n=>n.click());await p.locator('#reader-view').waitFor();await p.locator('.physical-cover-stage').waitFor({state:'detached'});
 const opening=await p.evaluate(()=>BookReader.location().page);
 await p.locator('#book-stage').focus();await p.keyboard.press('ArrowRight');
 await p.waitForFunction(n=>BookReader.location().page===n,opening+(width<820?1:2));
 await p.waitForTimeout(350);
 await p.evaluate(()=>BookReader.update({reduceMotion:true}));
 assert.equal(await p.evaluate(()=>BOOK_PLAN.chapters.length),16);
 assert.equal(await p.evaluate(()=>BOOK_STORY.sha256),'f473080aa942d572b288939767a3fdf1183636a265cb24d15a99c61b7d63d807');
 for(const id of ['chapter-01','chapter-12']){
  await p.evaluate(async id=>{const a=BookReader.illustrations().find(a=>a.chapterId===id);await BookReader.seek(a.offset,{anchor:{...BookReader.sourceAnchor(a.offset),leaf:a.leaf}});},id);
  await p.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
  await p.getByRole('button',{name:'3B incele',exact:true}).click();
  await p.locator('#popup-inspector[open] canvas[data-textures-ready="1"]').waitFor();
  assert.equal(await p.locator('.popup-leaf-canvas').count(),0);
  await p.locator('#popup-inspector').getByRole('button',{name:'Kapat',exact:true}).click();
  await p.locator('.popup-leaf-canvas[data-textures-ready="1"]').waitFor();
 }
 await p.evaluate(()=>BookReader.seek(BOOK_STORY.charLength));
 await p.locator('#reader-map-open').click();await p.locator('.atlas-sheet:not(.atlas-sheet--mini) .atlas-art').evaluate(n=>n.decode());
 await p.locator('[data-zoom="in"]').click();assert.equal(await p.locator('.atlas-tools output').textContent(),'120%');
 await p.getByLabel('Haritada mekân seç',{exact:true}).selectOption('greyhollow');
 await p.locator('.dossier-enter').click();await p.locator('.location-controls').getByRole('button',{name:'Tam Ekran İncele',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('#illustration-studio[open] img')?.naturalWidth>0);
 await p.locator('.illustration-close').click();await p.locator('#world-close').click();await p.locator('#world-close').click();
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(width===390){
  const imageCount=await p.evaluate(async()=>{const data=Object.values(STORY_WORLD.imageDetails);const all=[...STORY_WORLD.scenes.map(a=>a.src),...data.map(a=>a.src)];await Promise.all(all.map(src=>{const i=new Image();i.src=src;return i.decode();}));return all.length;});
  assert.equal(imageCount,40);
  const offset=await p.evaluate(()=>BookReader.location().offset);
  await p.reload();await p.locator('#continue-reading').evaluate(n=>n.click());
  assert.equal(await p.evaluate(()=>BookReader.location().offset),offset);
  await p.locator('#cover-button').click();await p.locator('.cover-library-button').click();
  assert((await p.locator('#living-library').textContent()).includes('Altı Tahtın Yedinci Sırrı'));
 }
 report.views.push({width,height,chapters:16,popups:2,atlas:true});
 await c.close();
}
assert.deepEqual(report.errors,[]);report.pass=true;console.log(JSON.stringify(report));
}finally{await browser.close();fs.writeFileSync('outputs/moon-qa.json',JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
