(() => {
  'use strict';
  const reader = window.BookReader;
  const panel = document.getElementById('hub-page-audio');
  const configured = window.BOOK_AUDIOBOOK?.tracks || window.BOOK_STORY?.narration?.audioTracks;
  if (!reader || !panel || !Array.isArray(configured)) return;

  const tracks = configured.flatMap(track => {
    if (typeof track?.src !== 'string' || typeof track.label !== 'string') return [];
    try {
      const url = new URL(track.src,location.href);
      if (url.origin !== location.origin || !/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) return [];
      return [{...track,src:url.href}];
    } catch { return []; }
  });
  if (!tracks.length) return;

  function make(tag,text) {
    const node = document.createElement(tag);
    if(text) node.textContent=text;
    return node;
  }
  function control(label, action) {
    const button=make('button',label);
    button.type='button';
    button.className='hub-button';
    button.addEventListener('click',action);
    return button;
  }
  const group=make('section');
  group.className='setting-group book-audiobook';
  const heading=make('h3','Sesli kitap');
  heading.className='hub-group-title';
  const trackPicker=make('select');
  trackPicker.setAttribute('aria-label','Anlatım kaydı');
  tracks.forEach((track,index)=>trackPicker.append(new Option(track.label,String(index))));
  trackPicker.hidden=tracks.length===1;
  const audio=make('audio');
  audio.controls=true;
  audio.preload='none';
  audio.playsInline=true;
  audio.setAttribute('aria-label','Hikâye anlatımı');
  const actions=make('div');
  actions.className='annotation-actions';
  const backward=control('−15 sn',()=>skip(-15));
  const forward=control('+15 sn',()=>skip(15));
  const jump=control('Metne dön',()=>void sync(true));
  actions.append(backward,forward,jump);
  const speed=make('select');
  speed.setAttribute('aria-label','Anlatım hızı');
  for(const rate of [.7,.85,1,1.15,1.3]) speed.append(new Option(rate+'×',String(rate)));
  speed.value='1';
  speed.addEventListener('change',()=>{audio.playbackRate=Number(speed.value);});
  const followLabel=make('label');
  followLabel.className='motion-toggle';
  const follow=make('input');
  follow.type='checkbox';
  followLabel.append(follow,' Metin sesle ilerlesin');
  const status=make('p');
  status.className='hub-hint';
  status.setAttribute('role','status');
  group.append(heading,trackPicker,audio,actions,speed,followLabel,status);
  panel.append(group);
  let cues=[];
  let last=-1;
  let syncing=false;

  function track() {return tracks[Number(trackPicker.value)||0];}
  function configureCues() {
    const file=track();
    const source=reader.source();
    const hash=reader.sourceAnchor(0).sourceHash;
    const proposed=Array.isArray(file.cues)?file.cues:[];
    const valid=proposed.length>0 && proposed.every((cue,index)=>{
      if (!cue || !Number.isFinite(cue.time) || cue.time<0 || !Number.isInteger(cue.offset) || cue.offset<0 || cue.offset>=source.length) return false;
      if (index && (cue.time<=proposed[index-1].time || cue.offset<proposed[index-1].offset)) return false;
      if (Number.isFinite(audio.duration) && cue.time>audio.duration) return false;
      const quote=typeof cue.quote==='string' && cue.quote.length>0;
      return quote ? source.slice(cue.offset,cue.offset+cue.quote.length)===cue.quote : Boolean(file.sourceSha256 && file.sourceSha256===hash);
    });
    cues=valid?proposed:[];
    follow.disabled=jump.disabled=!cues.length;
    if(!cues.length)follow.checked=false;
    status.textContent=cues.length ? 'Kayıt, doğrulanmış metin zamanlarıyla eşleşiyor.' : 'Bu kayıtta doğrulanmış metin zamanları yok.';
    last=-1;
  }
  function load() {
    audio.pause();
    audio.src=track().src;
    audio.playbackRate=Number(speed.value);
    configureCues();
  }
  function skip(seconds) {
    if (Number.isFinite(audio.duration)) audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+seconds));
  }
  async function sync(force=false) {
    if (syncing || (!force && !follow.checked) || !cues.length) return;
    let low=0,high=cues.length;
    while(low<high) {
      const mid=(low+high)>>1;
      if(cues[mid].time<=audio.currentTime)low=mid+1;
      else high=mid;
    }
    const index=low-1;
    if(index<0 || (!force && index===last))return;
    syncing=true;
    try {
      if(await reader.seek(cues[index].offset,{preferText:true}))last=index;
    } finally {syncing=false;}
  }
  trackPicker.addEventListener('change',load);
  audio.addEventListener('loadedmetadata',configureCues);
  audio.addEventListener('timeupdate',()=>void sync());
  audio.addEventListener('seeked',()=>void sync());
  audio.addEventListener('error',()=>{status.textContent='Anlatım dosyası açılamadı.';});
  follow.addEventListener('change',()=>{if(follow.checked)void sync(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();});
  document.addEventListener('book:location',()=>{
    if(!reader.location().open)audio.pause();
    if(!cues.length && reader.source())configureCues();
  });
  window.addEventListener('pagehide',()=>audio.pause());
  load();
})();
