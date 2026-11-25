const assert=require('node:assert/strict'),G=require('./guides.js');
const row={code:'rufcha1',key:'123',by:'Photographer',sciName:'Ortalis ruficauda',name:'Rufous-vented Chachalaca',license:'CC BY-NC 4.0'};
const valid=G.normalize(row);assert.equal(valid.license,'cc-by-nc-4.0');assert.equal(G.licenseURL(valid),'https://creativecommons.org/licenses/by-nc/4.0/');assert.equal(G.url(valid,480),'https://static.avicommons.org/rufcha1-123-480.jpg');
assert.equal(G.normalize({...row,license:'all rights reserved'}),null);assert.equal(G.normalize({...row,by:''}),null);assert.equal(G.normalize({...row,key:'../../abc'}),null);
const taxon={code:row.code,scientific:row.sciName,category:'species'};
assert.equal(G.select([row],()=>taxon).length,1);assert.equal(G.select([row],()=>({...taxon,scientific:'Different bird'})).length,0);assert.equal(G.select([row],()=>taxon,{},()=>.001).length,0);assert.equal(G.select([row],()=>taxon,{},()=>.02).length,1);
console.log('Guide license validation, taxonomy identity and region selection passed');

assert.equal(G.retryDelay('3',0),3000);assert.equal(G.retryDelay(null,0),60000);assert.equal(G.retryDelay('Thu, 01 Jan 1970 00:00:10 GMT',0),10000);
assert.throws(()=>G.checkResponse(new Response('',{status:429,headers:{'Retry-After':'120'}})),e=>e.status===429&&e.retryAt>Date.now()+100000);
assert.throws(()=>G.checkResponse(new Response('',{status:404})),e=>e.status===404&&!e.retryAt);
const second={...row,key:'124'};assert.deepEqual(G.pendingRows({size:480,rows:[row,second,second]},new Set([G.url(row,480)])),[second]);
(async()=>{
 const items=Array.from({length:24},(_,i)=>i),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 let active=0,peak=0,seen=[];
 const result=await G.pool(items,async i=>{active++;peak=Math.max(peak,active);seen.push(i);await sleep(4);active--;return 1000},{initial:5,total:29});
 assert.equal(peak,4);assert.equal(new Set(seen).size,24);assert.equal(result.done,29);assert.equal(active,0);assert.equal(result.measuredBytes,24000);assert.equal(result.measuredFiles,24);assert.equal(result.opaqueFiles,0);
 const controller=new AbortController();let calls=0,ended=0;
 const paused=await G.pool(items,async(i,signal)=>{calls++;if(i===0)controller.abort();await sleep(3);ended++;if(signal.aborted)throw Error('aborted')},{signal:controller.signal});
 assert(paused.paused);assert(calls<=4);assert.equal(ended,calls);assert.equal(paused.failed,0);
 let throttle=0,started=0;const limited=await G.pool(items,async(i,s)=>{started++;await sleep(2);if(i===0){const e=Error('HTTP 429');e.retryAt=Date.now()+60000;throw e}if(s.aborted)throw Error('aborted')},{onThrottle:t=>throttle=t});
 assert.equal(limited.reason,'throttled');assert(throttle>Date.now());assert(started<=4);
 let failures=0;const broken=await G.pool(items,async()=>{failures++;throw Error('bad image')});assert.equal(broken.failed,5);assert.equal(broken.reason,'errors');assert(failures<=8);
 let quota=0;const full=await G.pool(items,async()=>{quota++;const e=Error('full');e.name='QuotaExceededError';throw e});assert.equal(full.reason,'storage');assert(quota<=4);
 console.log('Guide pool: concurrency, resume dedup, pause, rate limit, quota, failure budget passed');
})().catch(e=>{console.error(e);process.exitCode=1});
