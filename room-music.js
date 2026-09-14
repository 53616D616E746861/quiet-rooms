const roomKeys={'The Sky Room':'sky','The Sunflower Room':'sunflower','The Moon Room':'moon','The Evening Room':'evening'};
const FADE=2.7;

function hold(parameter,time){
 if(parameter.cancelAndHoldAtTime)parameter.cancelAndHoldAtTime(time);
 else{const value=parameter.value;parameter.cancelScheduledValues(time);parameter.setValueAtTime(value,time);}
}

export class RoomMusic{
 constructor(ui){
  this.ui=ui;this.enabled=true;this.volume=.55;this.started=false;this.hidden=document.hidden;
  this.room='sky';this.hall=false;this.reading=false;this.context=null;this.master=null;
  this.current=null;this.voices=new Set();this.loading=null;this.request=0;this.error='';this.muteTimer=null;
  try{const saved=JSON.parse(localStorage.getItem('quiet-rooms-music')||'{}');if(typeof saved.enabled==='boolean')this.enabled=saved.enabled;if(Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));}catch{}
  ui.toggle.onclick=()=>this.toggle();ui.check.onchange=()=>this.setEnabled(ui.check.checked);
  ui.slider.oninput=()=>{this.volume=Number(ui.slider.value)/100;this.persist();this.level();this.render();};
  this.render();
 }
 persist(){try{localStorage.setItem('quiet-rooms-music',JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}}
 render(){
  this.ui.toggle.textContent=this.error?'Retry music':`Music: ${this.enabled?'on':'off'}`;
  this.ui.toggle.setAttribute('aria-pressed',String(this.enabled&&!this.error));
  this.ui.toggle.setAttribute('aria-label',this.error?'Retry room music':this.enabled?'Mute room music':'Enable room music');
  this.ui.check.checked=this.enabled;this.ui.slider.value=String(Math.round(this.volume*100));
  this.ui.slider.setAttribute('aria-valuetext',`${Math.round(this.volume*100)} percent`);
  this.ui.status.textContent=this.error;this.ui.status.hidden=!this.error;
 }
 start(){this.started=true;void this.activate();}
 toggle(){this.setEnabled(this.error?true:!this.enabled);}
 setEnabled(value){
  this.enabled=value;this.error='';clearTimeout(this.muteTimer);this.persist();this.render();
  if(value)void this.activate();
  else{
   this.cancelLoad();this.level(.035);
   this.muteTimer=setTimeout(()=>{if(!this.enabled)this.context?.suspend().catch(()=>{});},180);
  }
 }
 async activate(){
  if(!this.started||!this.enabled||this.hidden)return;
  clearTimeout(this.muteTimer);
  try{
   if(!this.context){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)throw new Error('Audio unavailable');
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
   }
   // Resume directly from Enter or a music control before requesting any audio file.
   await this.context.resume();
   if(!this.enabled||this.hidden){await this.context.suspend();return;}
   this.error='';this.render();this.level();void this.ensureRoom();
  }catch{this.fail();}
 }
 fail(){this.error='Music could not start. Select Music to try again.';this.render();}
 level(smoothing=.35){
  if(!this.master)return;
  const gain=this.enabled&&!this.hidden?this.volume*(this.hall?.45:this.reading?.65:1):0;
  const now=this.context.currentTime;hold(this.master.gain,now);this.master.gain.setTargetAtTime(gain,now,smoothing);
 }
 setScene(location,reading){
  const room=roomKeys[location]||this.room,hall=location==='The Passage';
  const moved=room!==this.room,changed=hall!==this.hall||reading!==this.reading;
  this.room=room;this.hall=hall;this.reading=reading;
  if(changed)this.level();
  if(moved)void this.ensureRoom();
 }
 cancelLoad(){this.request++;this.loading?.abort.abort();this.loading=null;}
 async ensureRoom(){
  if(!this.started||!this.enabled||this.hidden||this.context?.state!=='running')return;
  if(this.current?.key===this.room){if(this.loading)this.cancelLoad();return;}
  if(this.loading?.key===this.room)return;
  this.cancelLoad();const request=this.request,key=this.room,abort=new AbortController();this.loading={key,abort};
  try{
   const response=await fetch(new URL(`./audio/${key}.mp3`,import.meta.url),{signal:abort.signal});
   if(!response.ok)throw new Error('Track unavailable');
   const bytes=await response.arrayBuffer();
   if(request!==this.request)return;
   const buffer=await this.context.decodeAudioData(bytes);
   if(request!==this.request||!this.enabled||this.hidden)return;
   const context=this.context,now=context.currentTime;
   // Keep only the current room and the brief outgoing fade in memory.
   for(const voice of this.voices)if(voice!==this.current){
    hold(voice.gain.gain,now);voice.gain.gain.linearRampToValueAtTime(0,now+.06);voice.source.stop(now+.07);
   }
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.master);gain.gain.setValueAtTime(0,now);
   const voice={key,source,gain};this.voices.add(voice);
   source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};
   source.start();gain.gain.linearRampToValueAtTime(1,now+FADE);
   if(this.current){hold(this.current.gain.gain,now);this.current.gain.gain.linearRampToValueAtTime(0,now+FADE);this.current.source.stop(now+FADE+.1);}
   this.current=voice;this.error='';this.render();
  }catch{if(request===this.request&&!abort.signal.aborted)this.fail();}
  finally{if(request===this.request)this.loading=null;}
 }
 setHidden(value){
  this.hidden=value;
  if(value){this.cancelLoad();this.level(.035);this.context?.suspend().catch(()=>{});}
  else void this.activate();
 }
}
