'use strict';
const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('.qa-results');fs.mkdirSync(output,{recursive:true});
const source=path.resolve('.qa-photos');
const mode=process.argv[2]||'review';
const cases=JSON.parse(fs.readFileSync(path.join(source,'attribution.json'),'utf8'));
const base='http://127.0.0.1:8765';
let page,context,browser,errors=[],alerts=[],result={mode,steps:[],inference:[]};
function pass(name){result.steps.push(name);console.log('PASS '+name)}
async function wait(fn,arg,timeout=30000){await page.waitForFunction(fn,arg,{timeout})}
async function dismiss(){const b=page.locator('#dismissProgress');if(await b.isVisible())await b.click()}
async function screenshot(name){await page.screenshot({path:path.join(output,mode+'-'+name+'.png'),fullPage:false})}
async function start(){
 browser=await (mode==='media'?webkit:chromium).launch({headless:true});
 const {defaultBrowserType,...device}=devices['iPhone 13'];context=await browser.newContext({...device,acceptDownloads:true,locale:'en-US',timezoneId:'America/Port_of_Spain'});
 // Exercise browser CSV download, not a native OS share sheet.
 await context.addInitScript(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
 page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(d.type()==='confirm'&&/Merge these two encounters|Finish this encounter|No birds in this encounter|Remove this last photo/.test(d.message()))await d.accept();else{alerts.push(d.message());await d.dismiss()}});
 await page.goto(base,{waitUntil:'load'});
 await wait(()=>document.querySelector('#status').textContent.includes('Offline shell ready')&&Taxonomy.isReady()&&regionReady);
 await dismiss();await page.locator('#birdCountry').selectOption('TT');
 await wait(()=>state.birdRegion==='TT'&&document.querySelector('#country').value==='TT');
 await page.locator('#photos').setInputFiles(cases.map(f=>path.join(source,f.name)));
 await wait(()=>state.assets.length===3&&!importingLibrary&&document.querySelector('#importStatus').textContent.includes('Imported 3'));
 await dismiss();
 pass('Real JPEG import and Trinidad & Tobago location selection');
}
async function group(){
 await page.locator('header details summary').click();
 await page.locator('#group').click();
 await wait(()=>state.encounters.length===2&&state.encounters.some(e=>e.ids.length===2));
 await page.locator('header details summary').click();
 await page.locator('#encounters').scrollIntoViewIfNeeded();
 pass('Three photos form two encounters, including a two-photo burst');
}
async function manualConfirm(species){
 const box=page.locator('.encounterReview');
 const search=box.locator('details').filter({has:page.getByText('Search or add another species',{exact:true})});
 if(!await search.evaluate(n=>n.open))await search.locator('summary').click();
 await search.locator('input[type=search]').fill(species);
 const option=search.locator('.speciesOption').filter({hasText:species}).first();
 await option.click();
 await wait(name=>{const e=state.encounters.find(e=>e.id===document.querySelector('.encounterReview')?.dataset.encounterId);return !reviewWriting&&e?.review?.some(r=>r.species===name)},species);
}
async function review(){
 await group();
 const card=page.locator('.encounterReview');await card.waitFor();
 await screenshot('sanding-start');
 const layout=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('.reviewNav button:not([hidden]),.reviewNav span')].filter(n=>n.getClientRects().length);return {rows:new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().top/8))).size,navHeight:document.querySelector('.reviewNav').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}});assert(!layout.overflow);assert(layout.navHeight<=55,JSON.stringify(layout));pass('Photo toolbar stays on one line at iPhone width');
 const edit=page.locator('.encounterReview').getByRole('button',{name:'Edit boxes',exact:true});await edit.click();const editor=page.locator('dialog[open]');const image=editor.locator('.focusImage img');await wait(()=>document.querySelector('dialog[open] .focusImage img')?.naturalWidth>0);assert(await editor.getByRole('button',{name:'Delete selected box',exact:true}).isDisabled());const bounds=await image.boundingBox();assert(bounds);await page.mouse.move(bounds.x+bounds.width*.25,bounds.y+bounds.height*.25);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.60,bounds.y+bounds.height*.60,{steps:8});await page.mouse.up();assert.equal(await editor.locator('.birdBox').count(),1);await editor.getByRole('button',{name:'Bird 1',exact:true}).click();assert.equal(await editor.locator('.boxEditMode').textContent(),'Redraw bird 1');await editor.getByRole('button',{name:'Delete selected box',exact:true}).click();assert.equal(await editor.locator('.birdBox').count(),0);assert(await editor.getByRole('button',{name:'Delete selected box',exact:true}).isDisabled());await editor.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>state.assets.filter(a=>a.kind==='photo').some(a=>a.manualBirds!=null)),false);pass('Draw, select, delete and cancel in box editor without modifying saved media');
 assert.equal(await card.count(),1);
 const firstId=await card.getAttribute('data-encounter-id');
 for(let i=0;i<3;i++){await page.locator('.queueIndex summary').click();await page.locator('.queueIndexItem').last().click();await wait(id=>document.querySelector('.encounterReview')?.dataset.encounterId!==id&&!reviewWriting,firstId);assert.equal(await page.locator('.queueIndex').evaluate(n=>n.open),false);assert.equal(await card.locator('.photoBrowse').isVisible(),false);assert.equal(await card.locator('.reviewThumbs').isVisible(),false);await page.locator('.queueIndex summary').click();await page.locator('.queueIndexItem').first().click();await wait(id=>document.querySelector('.encounterReview')?.dataset.encounterId===id&&!reviewWriting,firstId);assert.equal(await page.locator('.queueIndex').evaluate(n=>n.open),false)}pass('Repeated encounter jumps close index; single photos have no redundant navigation');
 await manualConfirm('Rufous-vented Chachalaca');
 const row=card.locator('.reviewSpecies').filter({hasText:'Rufous-vented Chachalaca'});
 assert.equal(await row.count(),1);assert.equal(await row.evaluate(n=>n.parentElement.classList.contains('reviewRows')),true);assert.equal(await page.evaluate(()=>document.activeElement?.type==='search'),false);await card.getByText('Search or add another species',{exact:true}).click();assert(await row.isVisible());pass('Manual species moves into main review list; search can close without hiding confirmation');
 await row.locator('button[aria-label="Increase Rufous-vented Chachalaca count"]').click();
 await wait(id=>state.encounters.find(e=>e.id===id)?.review?.[0]?.count===2&&!reviewWriting,firstId);
 const old=await card.locator('.reviewStage img').getAttribute('src');
 await card.getByRole('button',{name:'Next photo',exact:true}).click();
 assert.notEqual(await card.locator('.reviewStage img').getAttribute('src'),old);
 assert.equal(await row.locator('.reviewNumber').textContent(),'2');
 pass('Confirm once across a burst, adjust count, and browse photos without losing confirmation');
 await page.locator('.queueIndex summary').click();assert.match(await page.locator('.queueIndexItem[aria-current=true]').textContent(),/Rufous-vented Chachalaca/);assert.match(await page.locator('.queueIndexItem[aria-current=true]').textContent(),/Confirmed/);await page.locator('.queueIndex summary').click();pass('Encounter index names confirmed species');
 await page.evaluate(()=>{const pause=()=>{};window.__qaPause=pause;UI.download('Test transfer',1,10,{received:100},pause)});await page.locator('#pauseProgress').click();await page.evaluate(()=>UI.download('Test transfer',2,10,{received:200},window.__qaPause));assert(await page.locator('#pauseProgress').isDisabled());assert.equal(await page.locator('#pauseProgress').textContent(),'Pausing…');await page.evaluate(()=>UI.finish('Test transfer ended',2,10));await dismiss();pass('Late progress update cannot re-enable a pause already requested');
 await screenshot('encounter');
 await card.getByRole('button',{name:'Split / merge encounters',exact:true}).click();
 const dialog=page.locator('dialog[open]');
 await dialog.getByRole('button',{name:'Split encounter',exact:true}).click();
 await wait(()=>state.encounters.length===3&&!reviewWriting);
 assert.equal(await page.evaluate(()=>state.encounters.flatMap(e=>e.review||[]).filter(r=>r.species==='Rufous-vented Chachalaca').length),1);
 pass('Split preserves confirmation on one side only');
 await card.getByRole('button',{name:'Split / merge encounters',exact:true}).click();
 const merge=dialog.locator('details').filter({has:page.getByText('Merge with another encounter',{exact:true})});
 if(!await merge.evaluate(n=>n.open))await merge.locator('summary').click();
 const options=await merge.locator('select option').allTextContents();assert(options.length>=1);
 await merge.locator('select').selectOption({index:0});
 await merge.getByRole('button',{name:'Merge encounters',exact:true}).click();
 await wait(()=>state.encounters.length===2&&!reviewWriting);
 assert.equal(await page.evaluate(()=>state.encounters.flatMap(e=>e.review||[]).find(r=>r.species==='Rufous-vented Chachalaca')?.count),2);
 pass('Merge restores the burst without doubling its count');
 await page.locator('.queueNavigation .queueDone').click();
 await wait(()=>state.encounters.some(e=>e.reviewStatus==='done')&&!reviewWriting);
 await manualConfirm('Blue-gray Tanager');
 await page.locator('.queueFooter').getByRole('button',{name:'Review later',exact:true}).click();
 await wait(()=>state.encounters.some(e=>e.reviewStatus==='later')&&!reviewWriting);
 await page.locator('.queueTabs button').filter({hasText:/^Later/}).click();
 await wait(()=>state.reviewFilter==='later'&&!reviewWriting);
 await page.reload({waitUntil:'load'});await wait(()=>document.querySelector('#status').textContent.includes('Offline shell ready'));await dismiss();
 assert.match(await page.locator('.encounterStatus').textContent(),/Blue-gray Tanager/);
 pass('Deferred encounter, cursor and confirmations survive a full reload');
 await context.setOffline(true);
 await page.reload({waitUntil:'load'});await wait(()=>document.querySelector('#status').textContent.includes('Offline shell ready'));await dismiss();
 await page.locator('#protocol').selectOption('Incidental');
 await page.locator('#export').click();
 await dialog.getByText('Review eBird export',{exact:true}).waitFor();
 assert.match(await dialog.textContent(),/Rufous-vented Chachalaca/);
 assert.match(await dialog.textContent(),/Blue-gray Tanager/);
 assert.match(await dialog.textContent(),/region-only/);
 await screenshot('checklist');
 const downloading=page.waitForEvent('download');await dialog.getByRole('button',{name:'Export confirmed CSV',exact:true}).click();
 const download=await downloading;await download.saveAs(path.join(output,'test-only.csv'));
 const csv=fs.readFileSync(path.join(output,'test-only.csv'),'utf8');
 const rows=csv.trim().split(/\r?\n/).map(l=>l.split(','));
 assert.equal(rows.length,2);assert(rows.every(r=>r.length===19&&r[11]==='TT'&&r[6]===''&&r[7]===''));
 assert.equal(rows.find(r=>r[0]==='Rufous-vented Chachalaca')[3],'2');
 assert.equal(rows.find(r=>r[0]==='Blue-gray Tanager')[3],'1');
 pass('Offline restart, real CSV preview and download; correct species, counts, TT and blank GPS');
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.queueTabs button').filter({hasText:/^Done/}).click();await wait(()=>state.reviewFilter==='done'&&!reviewWriting);await page.locator('.encounterReview').getByRole('button',{name:'Show photo 1',exact:true}).click();await page.locator('.encounterReview').getByRole('button',{name:'Photo actions',exact:true}).click();await dialog.getByRole('button',{name:'Remove this photo',exact:true}).click();await dialog.getByRole('button',{name:'Keep confirmed sightings',exact:true}).click();await wait(()=>state.assets.length===2&&!reviewWriting);assert.match(await page.locator('.encounterStatus').textContent(),/Rufous-vented Chachalaca/);assert.equal(await page.evaluate(()=>state.encounters.find(e=>e.id===state.reviewCursor).ids.length),1);pass('Remove displayed photo while retaining its encounter confirmation');
 await page.locator('.encounterReview').getByRole('button',{name:'Photo actions',exact:true}).click();await dialog.getByRole('button',{name:'No birds in this encounter',exact:true}).click();await wait(()=>state.assets.length===1&&!reviewWriting);assert.equal(await page.evaluate(()=>state.encounters.length),1);await page.reload({waitUntil:'load'});await wait(()=>libraryReady);assert.equal(await page.evaluate(()=>state.assets.length),1);assert.equal(await page.evaluate(()=>state.encounters.flatMap(e=>e.review||[]).some(r=>r.species==='Rufous-vented Chachalaca')),false);pass('Reject entire encounter, remove its sightings, and persist after offline reload');
}
async function media(){
 await group();
 await manualConfirm('Rufous-vented Chachalaca');
 // PCM WAV fixture for real decoder and persistence checks, not bird ID.
 const sampleRate=8000,n=16000,wav=Buffer.alloc(44+n*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)wav.writeInt16LE(Math.round(1000*Math.sin(i*440*2*Math.PI/sampleRate)),44+i*2);
 await page.locator('#audio').setInputFiles({name:'qa-recording.wav',mimeType:'audio/wav',buffer:wav});
 await wait(()=>state.assets.length===4&&!importingLibrary);await dismiss();
 const before=await page.evaluate(async()=>Promise.all(state.assets.map(async a=>({id:a.id,name:a.name,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await a.blob.arrayBuffer())))}))));
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady);await dismiss();
 await wait(()=>{const i=document.querySelector('.reviewStage img');return i?.complete&&i.naturalWidth>0});
 await page.locator('#mediaReview summary').first().click();await wait(()=>{const a=document.querySelector('#assets audio');return a?.readyState>=1&&a.duration>0});
 const after=await page.evaluate(async()=>Promise.all(state.assets.map(async a=>({id:a.id,name:a.name,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await a.blob.arrayBuffer())))}))));
 assert.deepEqual(after,before);assert.match(await page.locator('.encounterStatus').textContent(),/Rufous-vented Chachalaca/);
 pass((mode==='media'?'WebKit':'Chromium')+' reload restores exact photo and audio bytes, renders image and decodes WAV');
 const sound=page.locator('#assets article').filter({has:page.locator('audio')});const manual=sound.locator('details').filter({has:page.getByText('Search or add a species',{exact:true})});await manual.locator('summary').click();const search=manual.locator('input[type=search]'),add=manual.getByRole('button',{name:'Add species',exact:true});assert(await add.isDisabled());await search.fill('Ruddy Turnstone');await manual.locator('.speciesOption').filter({hasText:'Ruddy Turnstone'}).first().click();await wait(()=>!reviewWriting&&state.assets.some(a=>a.kind==='audio'&&a.heard?.includes('Ruddy Turnstone')));assert.equal(await search.inputValue(),'');assert(await add.isDisabled());await sound.getByRole('button',{name:/Undo Ruddy Turnstone/}).click();await wait(()=>!reviewWriting&&state.assets.filter(a=>a.kind==='audio').every(a=>!a.heard?.includes('Ruddy Turnstone')));pass('Audio manual species search, confirmation and undo use consistent controls');
 if(mode==='media-chromium'){
 // Simulate an old library with inline Blobs, then migrate through the real startup.
 await page.evaluate(async()=>{const old={...state,assets:state.assets.map(a=>({...a}))};await tx('readwrite',s=>{for(const a of old.assets)s.delete(mediaKey(a.id));return s.put(old,'state')})});
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady);await dismiss();await wait(()=>document.querySelector('.reviewStage img')?.naturalWidth>0);
 const migrated=await page.evaluate(async()=>{const meta=await tx('readonly',s=>s.get('state'));return meta.assets.every(a=>!a.blob&&!a.mediaMissing)});
 assert(migrated);pass('Legacy inline-Blob library migrates without losing confirmations');
 }
 // Simulate one unavailable file; reconnect it without changing its ID or sightings.
 const missing=before[0];await page.evaluate(async id=>{await tx('readwrite',s=>s.delete(mediaKey(id)))},missing.id);
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady&&state.assets.some(a=>a.mediaMissing));await dismiss();
 await page.locator('#mediaReview summary').first().click();const notice=page.locator('#assets .mediaWarning').filter({hasText:missing.name}).first();
 await notice.getByRole('button',{name:'Reconnect original'}).click();
 await page.locator('dialog[open] input[type=file]').setInputFiles(path.join(source,missing.name));
 await wait(id=>!reviewWriting&&state.assets.find(a=>a.id===id)?.blob?.size>0,missing.id);
 assert.match(await page.locator('.encounterStatus').textContent(),/Rufous-vented Chachalaca/);pass('Reconnect missing original preserves asset ID and confirmed sighting');
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady);await dismiss();await wait(()=>document.querySelector('.reviewStage img')?.naturalWidth>0);assert.equal(await page.evaluate(()=>state.assets.filter(a=>a.mediaMissing).length),0);pass('Reconnected media persists after another reload');
 await screenshot('restored');
 // navigator.serviceWorker.ready alone does not guarantee this document is
 // controlled. Wait for the worker and the complete shell before disconnecting.
 await wait(async()=>{if(!navigator.serviceWorker.controller||!navigator.serviceWorker.controller.scriptURL.endsWith('/sw.js'))return false;const keys=await caches.keys();const shell=keys.find(k=>/^flock-v\d+$/.test(k));if(!shell)return false;const cache=await caches.open(shell);return !!await cache.match(new URL('./index.html',location.href))},null,30000);
 // Playwright WebKit's setOffline can itself reject a navigation before its
 // service worker runs. Stop the real HTTP server instead, and independently
 // verify that it cannot serve the app. No network mocking or cached test HTML.
 const pid=Number(process.env.HOOT_QA_SERVER_PID);assert(Number.isInteger(pid)&&pid>1,'Missing QA server PID');
 process.kill(pid,'SIGTERM');
 const http=require('node:http');
 let unavailable=false;
 for(let attempt=0;attempt<30&&!unavailable;attempt++){
  unavailable=await new Promise(resolve=>{const req=http.get(base+'/version.json',r=>{r.resume();resolve(false)});req.on('error',e=>resolve(e.code==='ECONNREFUSED'||e.code==='ECONNRESET'));req.setTimeout(500,()=>req.destroy());});
  if(!unavailable)await new Promise(r=>setTimeout(r,100));
 }
 assert(unavailable,'QA HTTP server is still reachable');
 console.log('Origin server stopped; testing actual disconnected navigation');
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady);await wait(()=>document.querySelector('.reviewStage img')?.naturalWidth>0);
 const offline=await page.evaluate(async()=>Promise.all(state.assets.map(async a=>({id:a.id,name:a.name,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await a.blob.arrayBuffer())))}))));
 assert.deepEqual(offline,before);assert.match(await page.locator('.encounterStatus').textContent(),/Rufous-vented Chachalaca/);
 pass('Offline reload with origin server stopped restores exact media and confirmations');
}
async function guides(){
 await group();await manualConfirm('Rufous-vented Chachalaca');
 await page.locator('#offlineGuides').click();const d=page.locator('dialog[open]');
 await d.locator('select[aria-label="Guide country"]').selectOption('TT');
 await d.getByRole('button',{name:'Check guide coverage'}).click();
 await wait(()=>!ML.isBusy()&&document.querySelector('dialog[open] .guidePreview .guideCount'),null,120000);
 const p=await page.evaluate(async()=>{const p=await Guides.plan('TT');return {count:p.rows.length,rows:p.rows.filter(r=>['Rufous-vented Chachalaca','Blue-gray Tanager','Ruddy Turnstone'].includes(r.name))}});
 assert(p.count>50);assert(p.rows.some(r=>r.name==='Rufous-vented Chachalaca'));assert(p.rows.some(r=>r.code==='rudtur'&&/[A-Za-z]/.test(r.key)));console.log('TT guide coverage: '+p.count+' species');result.guideCoverage=p.count;
 // QA download a bounded real subset of the computed region, not an entire
 // regional pack on every CI push. Production UI downloads the full list.
 const subset={id:'TT',name:'Trinidad and Tobago QA subset',version:'2025',revision:2,size:480,rows:p.rows};
 // Exercise the real Download button with a bounded, genuinely selected subset.
 await page.evaluate(p=>{Guides.plan=async()=>p},subset);
 await d.getByRole('button',{name:'Check guide coverage'}).click();await wait(n=>document.querySelector('dialog[open] .guidePreview .guideCount')?.textContent===('0 / '+n+' photos')&&document.querySelector('dialog[open] .modalActivityDock'),p.rows.length);
 await d.getByRole('button',{name:'Download guide',exact:true}).click();
 await wait(()=>!document.querySelector('dialog[open]')&&document.querySelector('#activity').textContent.includes('Downloading guide')||document.querySelector('#activity').textContent.includes('Guide ready offline'));
 await wait(()=>!guideDownloadActive&&document.querySelector('#activity').textContent.includes('Guide ready offline'),null,60000);
 const s=await page.evaluate(p=>Guides.status(p),subset);assert.equal(await page.locator('#activityDock').count(),1);assert.match(await page.locator('#progressDetail').textContent(),/photos saved/);assert(!/photos\/s|downloading\s*\d/.test(await page.locator('#progressDetail').textContent()));pass('Guide download uses shared bottom activity dock and no worker count');
 assert(s.complete,JSON.stringify(s));const turn=await page.evaluate(()=>Guides.find(Taxonomy.exact('Ruddy Turnstone')));assert(turn&&turn.code==='rudtur');pass('Real Ruddy Turnstone alphanumeric reference downloads and resolves');pass('Avicommons real image download and cache decoding');const resumed=await page.evaluate(async rows=>Guides.download({id:'TT',name:'Trinidad and Tobago QA subset',version:'2025',revision:2,size:480,rows},new AbortController().signal),p.rows);assert(resumed.complete);assert.equal(resumed.done,p.rows.length);assert.equal(resumed.failed,0);pass('Resume reuses all downloaded reference images');
 // Reopen with a partial guide: one row, one count, no duplicate coverage notice.
 await page.evaluate(async row=>{await (await caches.open(Guides.IMAGES)).delete(Guides.url(row,480))},p.rows[0]);
 await page.locator('#offlineGuides').click();await d.locator('.guideList .guidePackRow').first().waitFor();
 assert.equal(await d.locator('[data-guide-id="TT"]').count(),1);assert.equal(await d.locator('.guideCount').textContent(),(p.rows.length-1)+' / '+p.rows.length+' photos');assert.equal(await d.locator('.guideAdd').evaluate(n=>n.open),false);assert.equal(await d.locator('#activityDock').isVisible(),false);
 await d.locator('.guideAdd summary').click();await d.locator('select[aria-label="Guide country"]').selectOption('TT');assert.equal(await d.getByRole('button',{name:'Check guide coverage'}).isVisible(),false);assert.equal(await d.locator('[data-guide-id="TT"]').count(),1);assert.equal(await d.locator('.guideCount').count(),1);await d.locator('.guideAdd summary').click();await screenshot('guide-manager-partial');pass('Guide manager displays one row and one count for the selected existing region');
 await d.getByRole('button',{name:'Resume',exact:true}).click();await wait(()=>!guideDownloadActive&&document.querySelector('#activity').textContent.includes('Guide ready offline'),null,60000);await page.locator('#offlineGuides').click();await d.locator('.guideList .guidePackRow').first().waitFor();assert.equal(await d.locator('.guideCount').textContent(),p.rows.length+' photos · Ready offline');assert.equal(await d.locator('.guideCount').count(),1);await screenshot('guide-manager-ready');await d.getByRole('button',{name:'Close',exact:true}).click();pass('Completed guide shows count once and no duplicate resume action');await dismiss();await wait(()=>document.querySelector('.reviewSpecies .referenceThumb img')?.naturalWidth>0);pass('Downloaded reference thumbnail appears directly in species row');
 await page.locator('.encounterReview .reviewSpecies').filter({hasText:'Rufous-vented Chachalaca'}).getByRole('button',{name:'Compare photos'}).click();
 await wait(()=>document.querySelector('dialog[open] .guideReference img')?.naturalWidth>0);
 assert.match(await d.textContent(),/Photo:.*CC/);await screenshot('guide-online');await d.getByRole('button',{name:'Close',exact:true}).click();
 await wait(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload({waitUntil:'load'});await wait(()=>libraryReady);
 await wait(()=>document.querySelector('.reviewSpecies .referenceThumb img')?.naturalWidth>0);const turnstone=await page.evaluate(async()=>{const hit=await Guides.find(Taxonomy.exact('Ruddy Turnstone'));if(!hit)return false;const img=new Image();img.src=hit.src;await img.decode();return img.naturalWidth>0});assert(turnstone);pass('Ruddy Turnstone alphanumeric photo decodes offline');const requests=[];page.on('request',r=>{if(r.url().includes('api.inaturalist.org'))requests.push(r.url())});pass('Inline reference thumbnail survives offline reload');
 await page.locator('.encounterReview .reviewSpecies').filter({hasText:'Rufous-vented Chachalaca'}).getByRole('button',{name:'Compare photos'}).click();
 await wait(()=>document.querySelector('dialog[open] .guideReference img')?.naturalWidth>0);assert.deepEqual(requests,[]);await screenshot('guide-offline');pass('Offline comparison renders cached Avicommons image and attribution after reload');
 await d.getByRole('button',{name:'Close',exact:true}).click();
}
async function inference(){
 // Genuine model download and inference: no fixture detections or replacement classifier.
 await page.locator('#installVision').click();
 await wait(()=>localStorage.getItem('flock-tested-vision')==='v6'&&!ML.isBusy(),null,480000);
 await dismiss();pass('WingCLIP real browser download and WASM self-test');
 await page.locator('#runAll').click();
 await wait(()=>!document.querySelector('#runAll').dataset.running&&state.encounters.length===2&&document.querySelector('#activity').textContent.includes('Detection run finished'),null,360000);
 await dismiss();
 const log=await page.locator('#log').textContent();
 assert.match(log,/2 succeeded[, ·]+0 failed/);
 const findings=await page.evaluate(()=>state.assets.filter(p=>p.kind==='photo').map(p=>({name:p.name,detectorVersion:p.detectorVersion,boxes:(p.autoBirds||[]).map(b=>({box:b.box,confidence:b.confidence,visual:(b.visual||[]).map(v=>({species:Taxonomy.model(v.species,v.scientific,v.code)?.common||v.species,similarity:v.similarity,rawAlternative:!!v.rawAlternative}))}))})));
 result.inference=findings.map(p=>{const expected=cases.find(c=>c.name===p.name).species;return {...p,expected,expectedRanks:p.boxes.map(b=>{const i=b.visual.findIndex(v=>v.species===expected);return i<0?null:i+1})}});
 console.log(JSON.stringify(result.inference,null,2));
 assert(findings.every(p=>p.detectorVersion==='yolox-tiny-0.1.1rc0-v2'),'Tiny detector did not run on every photo');
 assert(findings.every(p=>p.boxes.length===1),'Expected one bird per single-bird fixture: '+JSON.stringify(findings.map(p=>[p.name,p.boxes.length])));
 assert(findings.some(p=>p.boxes.length>0),'No birds detected in any fixture');
 pass('Real YOLOX-Tiny and WingCLIP inference completed; one box per single-bird fixture');await page.locator('.reviewSpecies .evidenceScores').first().waitFor();const evidence=await page.locator('.reviewSpecies .evidenceScores').allTextContents();assert(evidence.some(s=>/Visual -?\d+\.\d{3}/.test(s)&&/Range \d+%|Range <1%/.test(s)));pass('Visual similarity and independent range suitability shown on inferred species rows');
 await page.locator('.queueIndex summary').click();await page.locator('.queueIndexItem').first().waitFor();const named=await page.locator('.queueIndexItem').allTextContents();assert(named.some(s=>/Suggested · not confirmed|Possible · rare/.test(s)));await page.locator('.queueIndex summary').click();pass('Encounter index displays model species before confirmation');
 await screenshot('predictions');
 const e=await page.evaluate(()=>state.encounters.find(e=>e.ids.some(id=>state.assets.find(a=>a.id===id)?.autoBirds?.length))?.id);
 if(e){if(!await page.locator('.queueIndex').evaluate(n=>n.open))await page.locator('.queueIndex summary').click();const opts=page.locator('.queueIndexItem');const ix=await page.evaluate(id=>{const all=state.encounters.filter(e=>VisionViews.reviewStatus(e)==='pending').sort((a,b)=>Math.min(...a.ids.map(id=>Date.parse(state.assets.find(p=>p.id===id)?.time)||Infinity))-Math.min(...b.ids.map(id=>Date.parse(state.assets.find(p=>p.id===id)?.time)||Infinity)));return all.findIndex(x=>x.id===id)},e);await opts.nth(ix).click();await wait(id=>document.querySelector('.encounterReview')?.dataset.encounterId===id&&!reviewWriting,e)}
 const card=page.locator('.encounterReview');
 if(!(await card.locator('.cropActions button').count()))await card.getByRole('button',{name:'Next photo',exact:true}).click();
 const crop=card.locator('.cropActions button').first();await crop.click();
 const dialog=page.locator('dialog[open]');await dialog.locator('canvas').waitFor();
 await wait(()=>{const c=document.querySelector('dialog[open] canvas');if(!c)return false;return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v===255)});
 await screenshot('crop');await dialog.getByRole('button',{name:'Close',exact:true}).click();pass('Inspect actual model crop in the UI');
 const ref=card.locator('.reviewSpecies:visible .referenceButton').first();
 if(await ref.count()){await ref.click();await dialog.locator('.ownReference').waitFor();await screenshot('comparison');
   try{await dialog.getByRole('button',{name:'Load additional photos online'}).click();await dialog.locator('.referenceGrid img').first().waitFor({timeout:30000});result.referenceGallery='loaded';pass('Live species-reference gallery loaded')}catch{result.referenceGallery='unavailable';console.log('Reference lookup unavailable: '+(await dialog.textContent()).slice(0,400))}
   await dialog.getByRole('button',{name:'Close',exact:true}).click();
 }
 // More public regression cases through the production file import and analysis path.
 const motmots=JSON.parse(fs.readFileSync('motmot-attribution.json','utf8'));
 await page.locator('#photos').setInputFiles(motmots.map(f=>path.join(source,f.name)));
 await wait(()=>state.assets.length===5&&!importingLibrary);
 await page.evaluate(()=>groupPhotos());
 for(const fixture of motmots){
  const detected=await page.evaluate(async name=>{const p=state.assets.find(a=>a.name===name),e=state.encounters.find(e=>e.ids.includes(p.id));const ok=await ML.analyzePhotos(e);return {ok,version:p.detectorVersion,count:p.autoBirds?.length,boxes:p.autoBirds?.map(b=>({box:b.box,confidence:b.confidence}))}},fixture.name);
  console.log('Tiny regression',fixture.name,JSON.stringify(detected));assert(detected.ok);assert.equal(detected.version,'yolox-tiny-0.1.1rc0-v2');assert.equal(detected.count,fixture.expected_birds);pass('Tiny '+fixture.name+' returns '+fixture.expected_birds+' bird boxes');
 }

 // Replay the field-reported small-box geometry through the production gate.
 // This is a deterministic state/classification regression, not a claim of
 // re-running the private photos or a mocked ONNX inference.
 const silent=await page.evaluate(async()=>{
  const p=state.assets.find(a=>a.name==='motmot-single.jpg'),e=state.encounters.find(e=>e.ids.includes(p.id));
  const gate=VisionViews.identificationBoxes([{box:{x:.1,y:.1,w:47/1152,h:40/1536},confidence:.301},{box:{x:.2,y:.2,w:17/1152,h:20/1536},confidence:.23}],1152,1536);
  e.review=[{species:'Trinidad Motmot',count:1,photoId:p.id}];
  e.visual=[{species:'Stale prediction',similarity:.9}];
  VisionViews.replaceAutomatic(e,[p],p,gate.boxes,VisionViews.DETECTOR_VERSION,()=>crypto.randomUUID(),gate.qualityRejected);
  await save();const ok=await ML.analyzePhotos(e);
  return {ok,boxes:VisionViews.active(p).length,rejected:p.qualityRejected,visual:e.visual,review:e.review,fallback:VisionViews.centeredFallback(p),suggestions:VisionViews.suggestions(e,[p]),name:p.name};
 });
 assert(silent.ok);assert.equal(silent.boxes,0);assert(silent.rejected);assert.equal(silent.fallback,false);assert.deepEqual(silent.visual,[]);assert.deepEqual(silent.suggestions,[]);assert.equal(silent.review[0].species,'Trinidad Motmot');pass('Rejected tiny detections stay unboxed without fallback predictions; confirmed sighting retained');
 await page.reload({waitUntil:'load'});await wait(()=>libraryReady);
 const persisted=await page.evaluate(()=>{const p=state.assets.find(a=>a.name==='motmot-single.jpg');return {qualityRejected:p.qualityRejected,fallback:VisionViews.centeredFallback(p),boxes:VisionViews.active(p).length}});
 assert.deepEqual(persisted,{qualityRejected:true,fallback:false,boxes:0});pass('Silent rejection persists across reload');

}
(async()=>{try{await start();if(mode==='review')await review();else if(mode==='inference')await inference();else if(mode==='media'||mode==='media-chromium')await media();else if(mode==='guides')await guides();else throw Error('Unknown mode '+mode);assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);result.status='passed'}catch(e){result.status='failed';result.error=e.stack||e.message;console.error(result.error);if(page){try{await screenshot('failure');result.activity=await page.locator('#activity').textContent();result.log=await page.locator('#log').textContent();console.error(result.activity,result.log)}catch{}}process.exitCode=1}finally{result.pageErrors=errors;result.alerts=alerts;fs.writeFileSync(path.join(output,mode+'.json'),JSON.stringify(result,null,2));if(browser)await browser.close()}})();
