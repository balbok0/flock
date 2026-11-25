'use strict';
// Reference guides have their own durable caches, independent of the app shell,
// model assets and sightings. Only explicit downloads access the image CDN.
const Guides=(()=>{
const IMAGES='hoot-avicommons-images-v1',PACKS='hoot-avicommons-packs-v1',VERSION='2025',REGIONAL_SIZE=480,WORLD_SIZE=160,CONCURRENCY=4,COOLDOWN_KEY='hoot-avicommons-retry-after';
let catalog=null,busy=false,lookupIndex=null;
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function normalize(row){
 const code=String(row.code||''),key=String(row.key||''),by=String(row.by||'').trim(),sciName=String(row.sciName||'').trim(),name=String(row.name||'').trim(),license=norm(row.license).replace(/\s+/g,'-');
 if(!/^[a-z0-9]+$/.test(code)||!/^\d+$/.test(key)||!by||!name||!sciName||!/^cc(?:0|-(?:by(?:-nc)?(?:-sa)?))(?:-\d\.\d)?$/.test(license))return null;
 return {code,key,by,sciName,name,license};
}
function matches(row,taxon){return !!taxon&&taxon.category==='species'&&row.code===taxon.code&&norm(row.sciName)===norm(taxon.scientific)}
function select(rows,resolve,prior=null,occurrence=null){const out=[];for(const raw of rows){const row=normalize(raw);if(!row||!matches(row,resolve(row.code)))continue;if(prior&&!(occurrence(prior,row.sciName,undefined,row.name)>=.005))continue;out.push(row)}return out.sort((a,b)=>a.name.localeCompare(b.name))}
function url(row,size){if(![160,240,320,480,900].includes(size))throw Error('Invalid guide image size');return 'https://static.avicommons.org/'+row.code+'-'+row.key+'-'+size+'.jpg'}
function licenseLabel(row){return row.license.replace(/^cc0/,'CC0').replace(/^cc-/,'CC ').toUpperCase()}
function licenseURL(row){const m=row.license.match(/^(cc0|cc-[a-z-]+?)(?:-(\d\.\d))?$/);if(!m||!m[2])return null;return m[1]==='cc0'?'https://creativecommons.org/publicdomain/zero/'+m[2]+'/':'https://creativecommons.org/licenses/'+m[1].slice(3)+'/'+m[2]+'/'}
const packKey=id=>new URL('./_guide-packs/'+encodeURIComponent(id)+'.json',document.baseURI).href;
async function load(){if(catalog)return catalog;const r=await fetch(new URL('./avicommons-2025.json',document.baseURI));if(!r.ok)throw Error('Avicommons catalog unavailable');const rows=await r.json();if(!Array.isArray(rows)||rows.length<9000)throw Error('Incomplete Avicommons catalog');catalog=rows;return catalog}
async function list(){const c=await caches.open(PACKS),out=[];for(const k of await c.keys()){const response=await c.match(k);if(!response)continue;const p=await response.json();if(p?.id&&Array.isArray(p.rows)&&[WORLD_SIZE,REGIONAL_SIZE].includes(p.size))out.push(p)}return out.sort((a,b)=>a.name.localeCompare(b.name))}
async function cachedURLs(c){return new Set((await c.keys()).map(r=>r.url))}
function pendingRows(p,known){const seen=new Set();return p.rows.filter(row=>{const src=url(row,p.size);if(known.has(src)||seen.has(src))return false;seen.add(src);return true})}
async function status(p){const known=await cachedURLs(await caches.open(IMAGES)),n=p.rows.filter(row=>known.has(url(row,p.size))).length;return {n,total:p.rows.length,complete:n===p.rows.length&&n>0}}
async function plan(id){const rows=await load();if(id==='world')return {id,name:'Worldwide thumbnails',size:WORLD_SIZE,version:VERSION,rows:select(rows,Taxonomy.exact)};
 const r=Regions.get(id);if(!r)throw Error('Choose a region');const prior=await ML.guidePrior(r);if(!prior)throw Error('Range model unavailable; try again while online');
 const selected=select(rows,Taxonomy.exact,prior,Geo.occurrence);if(!selected.length)throw Error('No guide photos found for this region');return {id,name:Regions.label(r),size:REGIONAL_SIZE,version:VERSION,rows:selected}
}
async function write(p){await (await caches.open(PACKS)).put(packKey(p.id),new Response(JSON.stringify(p),{headers:{'Content-Type':'application/json'}}));lookupIndex=null}
function decode(src,signal){return new Promise((resolve,reject)=>{const i=new Image();let timer;function finish(err){clearTimeout(timer);signal?.removeEventListener('abort',abort);i.onload=i.onerror=null;if(err){i.removeAttribute('src');reject(err)}else resolve()}function abort(){finish(Error('Download paused'))}if(signal?.aborted){abort();return}signal?.addEventListener('abort',abort,{once:true});i.onload=()=>i.naturalWidth>0?finish():finish(Error('Empty guide image'));i.onerror=()=>finish(Error('Guide image cannot be decoded'));timer=setTimeout(()=>finish(Error('Guide image timed out')),20000);i.src=src})}
function retryDelay(value,now=Date.now()){if(value!=null&&String(value).trim()){const n=Number(value);if(Number.isFinite(n)&&n>=0)return n*1000;const d=Date.parse(value);if(Number.isFinite(d))return Math.max(0,d-now)}return 60000}
function throttleUntil(){try{return Number(localStorage.getItem(COOLDOWN_KEY))||0}catch{return 0}}
function rememberThrottle(until){try{localStorage.setItem(COOLDOWN_KEY,String(Math.max(until,throttleUntil())))}catch{}}
function checkResponse(r){if(r.type==='opaque')return;if(!r.ok){const e=Error('Guide photo HTTP '+r.status);e.status=r.status;if(r.status===429||r.status===503){e.retryAt=Date.now()+Math.max(1000,retryDelay(r.headers.get('retry-after')));e.message+=' · retry after '+new Date(e.retryAt).toLocaleTimeString()}throw e}}
async function fetchPhoto(c,row,size,signal){
 const src=url(row,size),controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,30000);
 if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 let stored=false;
 try{
  const options={credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,cache:'no-store'};
  let response;
  // Fall back only on browser CORS/network errors, never readable HTTP errors.
  try{response=await fetch(src,{...options,mode:'cors'})}
  catch(err){if(controller.signal.aborted||err.name!=='TypeError')throw err;response=await fetch(src,{...options,mode:'no-cors'})}
  checkResponse(response);if(response.type!=='opaque'&&!(response.headers.get('content-type')||'').startsWith('image/'))throw Error('Not an image');
  if(controller.signal.aborted)throw Error('Download paused or timed out');
  await c.put(src,response);stored=true;await decode(src,controller.signal);
 }catch(err){if(stored)await c.delete(src);if(controller.signal.aborted&&!signal.aborted)throw Error('Guide photo timed out');throw err}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort)}
}
// Bounded workers share a cursor, cancellation and failure budget. Settle
// every worker before releasing the busy lock, avoiding late cache writes.
async function pool(items,task,{signal,concurrency=CONCURRENCY,onProgress=()=>{},onThrottle=()=>{},initial=0,total=items.length+initial}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>CONCURRENCY)throw Error('Invalid download concurrency');
 const controller=new AbortController(),stop=()=>controller.abort(),external=signal||new AbortController().signal;
 if(external.aborted)stop();else external.addEventListener('abort',stop,{once:true});
 let next=0,done=initial,failed=0,error='',reason='',active=0,retryAt=0;
 const started=Date.now(),report=()=>onProgress({done,failed,total,error,active,elapsedMs:Date.now()-started,downloaded:done-initial,retryAt});
 async function worker(){
  while(!controller.signal.aborted&&next<items.length){
   const item=items[next++];active++;
   try{await task(item,controller.signal);done++}
   catch(e){if(!controller.signal.aborted){failed++;error||=e?.message||String(e);
    if(e?.retryAt){retryAt=e.retryAt;reason='throttled';error=e.message;onThrottle(retryAt);stop()}
    else if(e?.name==='QuotaExceededError'){reason='storage';error='Browser storage is full. Free space before resuming.';stop()}
    else if(failed>=5){reason='errors';stop()}
   }}finally{active--;report()}
  }
 }
 try{report();const settled=await Promise.allSettled(Array.from({length:Math.min(concurrency,items.length)},worker));const unexpected=settled.find(r=>r.status==='rejected');if(unexpected)throw unexpected.reason;return {done,failed,error,reason,retryAt,paused:external.aborted,elapsedMs:Date.now()-started}}finally{external.removeEventListener('abort',stop)}
}
async function download(p,signal,onProgress=()=>{}){
 if(busy)throw Error('Another guide operation is running');busy=true;
 try{
  if(!navigator.serviceWorker.controller)throw Error('Reload Hoot once before downloading a guide');
  const until=throttleUntil();if(until>Date.now())throw Error('Image service asked us to wait. Resume after '+new Date(until).toLocaleTimeString());
  await navigator.storage?.persist?.().catch(()=>{});await write(p);
  const c=await caches.open(IMAGES),known=await cachedURLs(c),missing=pendingRows(p,known),initial=p.rows.filter(r=>known.has(url(r,p.size))).length;
  const result=await pool(missing,(row,s)=>fetchPhoto(c,row,p.size,s),{signal,initial,total:p.rows.length,onProgress,onThrottle:rememberThrottle});
  return {...result,...await status(p)}
 }finally{busy=false}
}
async function remove(id){if(busy)throw Error('Pause downloads first');busy=true;try{const old=await list(),p=old.find(x=>x.id===id);if(!p)return;const remaining=new Set(old.filter(x=>x.id!==id).flatMap(x=>x.rows.map(r=>url(r,x.size))));await (await caches.open(PACKS)).delete(packKey(id));lookupIndex=null;const c=await caches.open(IMAGES);for(const row of p.rows){const src=url(row,p.size);if(!remaining.has(src))await c.delete(src)}}finally{busy=false}}
async function index(){if(!lookupIndex){const pending=(async()=>{const out=new Map();for(const p of (await list()).sort((a,b)=>b.size-a.size))for(const row of p.rows){if(!out.has(row.code))out.set(row.code,[]);out.get(row.code).push({...row,src:url(row,p.size),size:p.size,pack:p.name})}return out})();lookupIndex=pending;pending.catch(()=>{if(lookupIndex===pending)lookupIndex=null})}return lookupIndex}
async function find(taxon){if(!taxon)return null;const c=await caches.open(IMAGES),rows=(await index()).get(taxon.code)||[];for(const row of rows)if(matches(row,taxon)&&await c.match(row.src))return row;return null}
return {normalize,matches,select,url,licenseLabel,licenseURL,load,list,status,plan,download,remove,find,pool,pendingRows,retryDelay,checkResponse,CONCURRENCY,isBusy:()=>busy,IMAGES,PACKS};
})();
if(typeof module!=='undefined')module.exports=Guides;
