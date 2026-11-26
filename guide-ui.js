'use strict';
let guideDownloadActive=false;
async function startGuideDownload(p,d){
 if(guideDownloadActive||Guides.isBusy()||reviewLocked())return;
 guideDownloadActive=true;UI.unmount(d);d.close();
 const controller=new AbortController(),controls=[...document.querySelectorAll('button,input,select')].filter(x=>!x.disabled&&!x.closest('#activityDock')&&!x.closest('dialog'));
 controls.forEach(x=>x.disabled=true);
 const pause=()=>controller.abort(),title='Downloading guide · '+p.name;
 UI.download(title,0,p.rows.length,{detail:'Checking saved photos…'},pause);
 try{
  const s=await Guides.download(p,controller.signal,x=>UI.download(title,x.done,x.total,TransferStats.guideMetrics(x,p.size),pause));
  const msg=s.complete?'Guide ready offline · '+p.name:s.paused?'Guide paused · '+p.name:s.reason==='throttled'?'Guide rate limited · '+p.name:s.reason==='storage'?'Guide storage full · '+p.name:'Guide incomplete · '+p.name;
  const metrics=TransferStats.guideMetrics({...s,done:s.n,downloaded:s.measuredFiles+s.opaqueFiles},p.size);
  UI.finish(msg,s.n,s.total,s.n+' / '+s.total+' photos saved'+(metrics.received?' · '+(metrics.estimated?'~':'')+TransferStats.bytes(metrics.received)+' received':'')+(s.error?' · '+s.error:'')+(s.complete?'':'. Open Offline bird guides to resume.'));
 }catch(err){UI.fail(err)}finally{guideDownloadActive=false;controls.forEach(x=>x.disabled=false);render()}
}
function showGuideManager(){
 if(guideDownloadActive||reviewLocked())return;
 const d=reviewDialog('Offline bird guides'),saved=el('div',undefined,'guideList'),add=el('details',undefined,'guideAdd'),country=el('select'),sub=el('select'),preview=el('div',undefined,'guidePreview'),message=el('p',undefined,'guideStatus');
 let prepared=null,planning=false,changed=false,packs=[],refreshing=false;
 const selected=Regions.get(state.birdRegion)||Regions.inferred(state.assets);
 country.setAttribute('aria-label','Guide country');sub.setAttribute('aria-label','Guide state or province');
 country.add(new Option('Choose country…',''));country.add(new Option('Worldwide thumbnails','world'));for(const r of Regions.countries())country.add(new Option(r.name,r.id));country.value=selected?.country||'';
 function subdivisions(){sub.replaceChildren();const rows=Regions.children(country.value);sub.hidden=!rows.length;if(rows.length){sub.add(new Option('Entire country',country.value));for(const r of rows)sub.add(new Option(r.name,r.id))}}
 subdivisions();if(selected?.parent)sub.value=selected.id;
 const chosen=()=>sub.hidden?country.value:sub.value;
 function dismissFinished(){const b=document.getElementById('dismissProgress');if(!b.hidden)b.click()}
 function invalidate(){prepared=null;preview.replaceChildren();message.textContent='';const existing=packs.some(p=>p.id===chosen());prepare.hidden=existing;prepare.disabled=refreshing||planning||!chosen();if(existing)message.textContent='Already in your guides.'}
 country.onchange=()=>{subdivisions();invalidate()};sub.onchange=invalidate;
 const prepare=btn('Check guide coverage',async()=>{
  if(planning||refreshing||Guides.isBusy()||reviewLocked()||packs.some(p=>p.id===chosen())||!chosen())return;
  const id=chosen();planning=true;invalidate();prepare.disabled=true;country.disabled=sub.disabled=true;message.textContent='Preparing species list…';
  try{
   const p=await Guides.plan(id),s=await Guides.status(p);if(!d.open)return;prepared=p;
   message.textContent='';preview.replaceChildren(packRow(p,s,false));dismissFinished();
  }catch(err){if(d.open){message.textContent=err.message;UI.fail(err)}}
  finally{planning=false;prepare.disabled=!chosen();country.disabled=sub.disabled=false}
 });
 function packRow(p,s,installed){
  const row=el('div',undefined,'guidePackRow'),head=el('div',undefined,'guidePackHead'),text=el('div',undefined,'guidePackText'),actions=el('div',undefined,'guidePackActions');
  row.dataset.guideId=p.id;
  const count=s.complete?s.total+' photos · Ready offline':s.n+' / '+s.total+' photos';
  text.append(el('strong',p.name),el('small',count,'guideCount'));head.append(text);
  if(!s.complete&&installed){const bar=el('progress');bar.max=s.total;bar.value=s.n;bar.setAttribute('aria-label','Downloaded photos for '+p.name);text.append(bar)}
  if(installed&&Guides.needsRefresh(p)&&p.id!=='extras'){const update=btn('Update guide',async()=>{if(planning||refreshing||reviewLocked())return;planning=true;update.disabled=true;try{const next=await Guides.refreshPack(p);planning=false;if(d.open)await startGuideDownload(next,d)}catch(err){UI.fail(err)}finally{planning=false;update.disabled=false}},'primary');actions.append(update)}else if(!s.complete||!installed){const button=btn(installed?'Resume':'Download guide',()=>startGuideDownload(p,d),'primary');actions.append(button)}
  if(installed){const remove=btn('Remove',async()=>{if(Guides.isBusy()||planning||refreshing)return;if(!confirm('Remove '+p.name+' guide? Photos used by other guides and your sightings are kept.'))return;await Guides.remove(p.id);changed=true;await refresh()},'guideRemove');remove.setAttribute('aria-label','Remove '+p.name+' guide');actions.append(remove)}
  else if(!s.complete){const n=s.total-s.n,lo=Math.ceil(n*(p.size===160?8:40)/1000),hi=Math.ceil(n*(p.size===160?30:100)/1000);text.append(el('small','~'+lo+'–'+hi+' MB to download','guideEstimate'))}
  head.append(actions);row.append(head);return row
 }
 async function refresh(first=false){
  refreshing=true;prepare.disabled=true;
  try{
   packs=await Guides.list();const rows=await Promise.all(packs.map(async p=>packRow(p,await Guides.status(p),true)));if(!d.open)return;
   saved.replaceChildren(...rows);saved.hidden=!rows.length;
   if(first){add.open=!packs.length;if(packs.some(p=>p.id===chosen())){country.value='';subdivisions()}}
   else if(!packs.length)add.open=true;
   invalidate();
  }finally{refreshing=false;prepare.disabled=planning||!chosen()}
 }
 const help=el('details',undefined,'guideHelp'),source=el('a','Avicommons');source.href='https://avicommons.org/';source.target='_blank';source.rel='noopener noreferrer';const info=el('p');info.append(source,document.createTextNode(' provides one licensed reference photo per available species. Regions use approximate year-round model coverage with documented occurrence additions; you can download an extra species from its comparison view. Downloads stay on this device; your sightings are not shared.'));
 help.append(el('summary','About these guides'),info);
 add.append(el('summary','Add a region'),country,sub,prepare,preview,message);d.append(saved,add,help);
 // A finished download or coverage notice is already represented in the list.
 // Clear it when opening the manager; the same dock still shows active downloads
 // during coverage preparation, including runtime/model assets.
 dismissFinished();UI.mount(d);
 d.addEventListener('close',()=>{UI.unmount(d);if(changed&&!reviewLocked())render()},{once:true});
 refresh(true).catch(e=>message.textContent=e.message);
}
// Reserve thumbnail space before async cache lookup, keeping the review layout stable.
function referenceThumb(species,onClick){
 const b=btn('',onClick,'referenceThumb'),caption=el('small','Reference'),slot=el('span','No photo','referenceThumbPlaceholder');
 b.setAttribute('aria-label','Compare reference photo for '+species);b.append(slot,caption);
 async function load(){try{const hit=await Guides.find(Taxonomy.exact(species));if(!b.isConnected||!hit)return;const img=el('img');img.alt=species+' reference';img.referrerPolicy='no-referrer';img.title='Photo: '+hit.by+' · '+Guides.licenseLabel(hit)+' · Avicommons';img.onerror=()=>{if(b.isConnected){img.remove();slot.hidden=false;caption.textContent='No photo'}};img.onload=()=>{if(b.isConnected){slot.hidden=true;caption.textContent=hit.by+' · '+Guides.licenseLabel(hit)}};b.insertBefore(img,caption);img.src=hit.src}catch{}}
 // A microtask permits the caller to mount the row first.
 Promise.resolve().then(load);return b
}
function evidenceScores(v,{audio=false}={}){
 const scores=VisionViews.scoreEvidence(v),row=el('div',undefined,'evidenceScores');
 if(audio&&Number.isFinite(v.confidence))row.append(el('span','Sound '+Math.round(v.confidence*100)+'%','evidenceVisual'));
 else if(scores.similarity!==null)row.append(el('span','Visual '+scores.similarity,'evidenceVisual'));
 const label=scores.tier==='local'?'In range':scores.tier==='unlikely'?'Outside likely range':'Range unknown',range=el('span',scores.range===null?label:'Range '+scores.range+' · '+label,'evidenceRange '+scores.tier);
 range.title='Geographic suitability estimate, not identification probability';row.append(range);
 if(v.nearAudio)row.append(el('span','Nearby sound match','evidenceAudio'));return row
}
async function appendOfflineReference(content,taxon){
 const hit=await Guides.find(taxon);if(!hit)return false;
 const fig=el('figure',undefined,'guideReference'),img=el('img'),cap=el('figcaption'),source=el('a','Avicommons');
 img.alt=taxon.common;img.referrerPolicy='no-referrer';source.href='https://avicommons.org/';source.target='_blank';source.rel='noopener noreferrer';cap.append(el('span','Photo: '+hit.by+' · '+Guides.licenseLabel(hit)+' · '),source);
 const license=Guides.licenseURL(hit);if(license){const a=el('a',' · License');a.href=license;a.target='_blank';a.rel='noopener noreferrer';cap.append(a)}
 const original=el('a',' · Source image');original.href=hit.src;original.target='_blank';original.rel='noopener noreferrer';cap.append(original);
 fig.append(img,cap);content.append(el('small','Downloaded · '+hit.pack+' · available offline'),fig);img.onerror=()=>{if(fig.isConnected){img.hidden=true;fig.append(el('small','Saved image unavailable. Resume the guide download.'))}};img.src=hit.src;return true
}
document.getElementById('offlineGuides').onclick=()=>showGuideManager();
