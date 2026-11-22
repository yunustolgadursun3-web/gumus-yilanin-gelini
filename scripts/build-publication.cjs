const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pending = process.argv.includes('--allow-pending-art');
const refresh = [path.join(root, 'scripts/refresh-world.cjs')];
if (!pending) refresh.push('--strict-assets');
execFileSync(process.execPath, refresh, {cwd:root, stdio:'inherit'});
for (const script of ['build.js', 'validate.js']) {
  execFileSync(process.execPath, [path.join(root, script)], {cwd:root, stdio:'inherit'});
}
const output = path.join(root, 'dist');
fs.mkdirSync(output, {recursive:true});
const files = ['index.html','style.css','world.css','app.js','reader-comfort.js','world-data.js','story-world.js','living-world.js','manuscript.js','atlas-ui.js','story-effects.js','media-manifest.json','story-theme.json','kitap-sesleri.js','sahne-fx.js','story.js','sw.js','manifest.webmanifest','svg-sahne.js','video-manifest.json','plan.json'];
files.push('reader-modes.css', 'book-notebook.js', 'book-notebook.css');
files.push('reader-focus.js', 'reader-focus.css');
files.push('book-style-studio.js', 'book-style-studio.css', 'book-binding-studio.js');
files.push('book-room.js', 'book-room.css');
files.push('reader-notes.js', 'reader-notes.css');
files.push('book-library.js', 'book-library.css', 'book-library-data.js', 'book-offline.js', 'book-audiobook.js');
files.push('edition.css', 'edition.js', 'reading-route.js', 'scene-seals.js');
files.push('closing-letter.css', 'closing-letter.js', 'book-finale.css', 'book-finale.js');
for (const file of files) fs.copyFileSync(path.join(root,file),path.join(output,file));
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true,filter:file=>!file.endsWith('.json')||file.endsWith('muzik.json')});
const config = JSON.parse(fs.readFileSync(path.join(root,'book.config.json'),'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root,config.plan),'utf8'));
const id = String(plan.storageId || config.storyId);
const allowOffline = config.publicOffline === true;
const digest = createHash('sha256').update(JSON.stringify({id,allowOffline}));
for (const file of files) digest.update(file).update(fs.readFileSync(path.join(output,file)));
const revision = digest.digest('hex').slice(0,16);
function assets(directory) {
  return fs.readdirSync(path.join(output,directory),{withFileTypes:true}).flatMap(entry=>{
    const name = directory+'/'+entry.name;
    return entry.isDirectory() ? assets(name) : [name];
  });
}
const core = ['./', ...files.filter(file=>/\.(css|js|webmanifest)$/i.test(file) && file!=='sw.js').map(file=>'./'+file), './offline-manifest.json'];
for (const file of [plan.cover.src.replace(/\.webp$/, '-480.webp'),'assets/images/frosthold-atlas-480.webp','assets/images/reading-rabbit.webp','assets/images/sakura-letter.webp','assets/images/sakura-rabbit-story.webp','assets/images/book-sigil.svg','assets/images/favicon.svg','assets/fonts/lora.woff2','assets/fonts/lora-italic.woff2','assets/fonts/cinzel.woff2']) {
  if (fs.existsSync(path.join(output,file))) core.push('./'+file);
}
fs.writeFileSync(path.join(output,'book-worker-data.js'),'self.BOOK_WORKER_DATA = '+JSON.stringify({id,revision,core,allowOffline})+';\n');
const offlineFiles = allowOffline ? [...files,'book-worker-data.js',...assets('assets')].map(file=>({
  url:file==='index.html' ? './' : './'+file.split('/').map(encodeURIComponent).join('/'), bytes:fs.statSync(path.join(output,file)).size,
})) : [];
fs.writeFileSync(path.join(output,'offline-manifest.json'),JSON.stringify({id,revision,enabled:allowOffline,bytes:offlineFiles.reduce((size,file)=>size+file.bytes,0),files:offlineFiles}));
console.log('Bağımsız kitap çıktısı hazır.');
