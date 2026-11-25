'use strict';
const {chromium,devices}=require('playwright');
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
 browser=await chromium.launch({headless:true});
 const {defaultBrowserType,...device}=devices['iPhone 13'];context=await browser.newContext({...device,acceptDownloads:true,locale:'en-US',timezoneId:'America/Port_of_Spain'});
 // Exercise browser CSV download, not a native OS share sheet.
 await context.addInitScript(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
 page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(d.type()==='confirm'&&/Merge these two encounters|Finish this encounter/.test(d.message()))await d.accept();else{alerts.push(d.message());await d.dismiss()}});
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
 assert.equal(await card.count(),1);
 const firstId=await card.getAttribute('data-encounter-id');
 await manualConfirm('Rufous-vented Chachalaca');
 const row=card.locator('.reviewSpecies').filter({hasText:'Rufous-vented Chachalaca'});
 await row.locator('button[aria-label="Increase Rufous-vented Chachalaca count"]').click();
 await wait(id=>state.encounters.find(e=>e.id===id)?.review?.[0]?.count===2&&!reviewWriting,firstId);
 const old=await card.locator('.reviewStage img').getAttribute('src');
 await card.getByRole('button',{name:'Next photo',exact:true}).click();
 assert.notEqual(await card.locator('.reviewStage img').getAttribute('src'),old);
 assert.equal(await row.locator('.reviewNumber').textContent(),'2');
 pass('Confirm once across a burst, adjust count, and browse photos without losing confirmation');
 await screenshot('encounter');
 await card.getByRole('button',{name:'Split / merge encounters',exact:true}).click();
 const dialog=page.locator('dialog[open]');
 await dialog.getByRole('button',{name:'Split encounter',exact:true}).click();
 await wait(()=>state.encounters.length===3&&!reviewWriting);
 assert.equal(await page.evaluate(()=>state.encounters.flatMap(e=>e.review||[]).filter(r=>r.species==='Rufous-vented Chachalaca').length),1);
 pass('Split preserves confirmation on one side only');
 await card.getByRole('button',{name:'Split / merge encounters',exact:true}).click();
 const merge=dialog.locator('details').filter({has:dialog.getByText('Merge with another encounter',{exact:true})});
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
 assert.match(log,/2 succeeded · 0 failed/);
 const findings=await page.evaluate(()=>state.assets.filter(p=>p.kind==='photo').map(p=>({name:p.name,detectorVersion:p.detectorVersion,boxes:(p.autoBirds||[]).map(b=>({box:b.box,confidence:b.confidence,visual:(b.visual||[]).map(v=>({species:Taxonomy.model(v.species,v.scientific,v.code)?.common||v.species,similarity:v.similarity,rawAlternative:!!v.rawAlternative}))}))})));
 result.inference=findings.map(p=>{const expected=cases.find(c=>c.name===p.name).species;return {...p,expected,expectedRanks:p.boxes.map(b=>{const i=b.visual.findIndex(v=>v.species===expected);return i<0?null:i+1})}});
 console.log(JSON.stringify(result.inference,null,2));
 assert(findings.every(p=>p.detectorVersion),'Detector did not run on every photo');
 assert(findings.some(p=>p.boxes.length>0),'No birds detected in any fixture');
 pass('Real YOLOX and WingCLIP inference completed on all three photos');
 await screenshot('predictions');
 const e=await page.evaluate(()=>state.encounters.find(e=>e.ids.some(id=>state.assets.find(a=>a.id===id)?.autoBirds?.length))?.id);
 if(e){await page.locator('.queueIndex summary').click();const opts=page.locator('.queueIndexItem');const ix=await page.evaluate(id=>{const all=state.encounters.filter(e=>VisionViews.reviewStatus(e)==='pending').sort((a,b)=>Math.min(...a.ids.map(id=>Date.parse(state.assets.find(p=>p.id===id)?.time)||Infinity))-Math.min(...b.ids.map(id=>Date.parse(state.assets.find(p=>p.id===id)?.time)||Infinity)));return all.findIndex(x=>x.id===id)},e);await opts.nth(ix).click();await wait(id=>document.querySelector('.encounterReview')?.dataset.encounterId===id&&!reviewWriting,e)}
 const card=page.locator('.encounterReview');
 if(!(await card.locator('.cropActions button').count()))await card.getByRole('button',{name:'Next photo',exact:true}).click();
 const crop=card.locator('.cropActions button').first();await crop.click();
 const dialog=page.locator('dialog[open]');await dialog.locator('canvas').waitFor();
 await wait(()=>{const c=document.querySelector('dialog[open] canvas');if(!c)return false;return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v===255)});
 await screenshot('crop');await dialog.getByRole('button',{name:'Close',exact:true}).click();pass('Inspect actual model crop in the UI');
 const ref=card.locator('.reviewSpecies:visible .referenceButton').first();
 if(await ref.count()){await ref.click();await dialog.locator('.ownReference').waitFor();await screenshot('comparison');
   try{await dialog.locator('.referenceGrid img').first().waitFor({timeout:30000});result.referenceGallery='loaded';pass('Live species-reference gallery loaded')}catch{result.referenceGallery='unavailable';console.log('Reference lookup unavailable: '+(await dialog.textContent()).slice(0,400))}
   await dialog.getByRole('button',{name:'Close',exact:true}).click();
 }
}
(async()=>{try{await start();if(mode==='review')await review();else if(mode==='inference')await inference();else throw Error('Unknown mode '+mode);assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);result.status='passed'}catch(e){result.status='failed';result.error=e.stack||e.message;console.error(result.error);if(page){try{await screenshot('failure');result.activity=await page.locator('#activity').textContent();result.log=await page.locator('#log').textContent();console.error(result.activity,result.log)}catch{}}process.exitCode=1}finally{result.pageErrors=errors;result.alerts=alerts;fs.writeFileSync(path.join(output,mode+'.json'),JSON.stringify(result,null,2));if(browser)await browser.close()}})();
