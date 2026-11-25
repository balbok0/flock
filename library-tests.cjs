const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('function emptyLibrary('),end=src.indexOf('function render()',start);
assert.ok(start>=0&&end>start);
const controls=new Map(),node=id=>{if(!controls.has(id))controls.set(id,{disabled:false,value:'old',textContent:'old',dataset:{}});return controls.get(id)};
let consent=false,fail=false,writes=0,rendered=0,errors=0,busy=false,saved;
const initial={assets:[{kind:'photo'},{kind:'audio'}],encounters:[{confirmed:true}],detections:[{species:'Test'}],birdRegion:'TT',location:{lat:1,lon:2},futurePreference:'keep'};
const sandbox={$:node,document:{querySelectorAll:()=>[...controls.values()]},state:initial,confirm:()=>consent,ML:{isBusy:()=>busy,resetGeo(){}},UI:{resetLog(){},note(){},report(){},fail(){errors++}},render(){rendered++},persistLibrary:async s=>{if(fail)throw Error('write failed');saved=s;writes++}};
vm.createContext(sandbox);vm.runInContext(src.slice(start,end)+'\nlibraryReady=true;',sandbox);
(async()=>{
await sandbox.clearLibrary();assert.equal(writes,0);
consent=true;busy=true;await sandbox.clearLibrary();assert.equal(writes,0);busy=false;
fail=true;await sandbox.clearLibrary();assert.equal(errors,1);assert.equal(sandbox.state,initial);assert.equal(writes,0);
fail=false;await sandbox.clearLibrary();assert.equal(writes,1);assert.equal(rendered,1);assert.equal(saved.assets.length,0);assert.equal(saved.encounters.length,0);assert.equal(saved.detections.length,0);assert.equal(saved.birdRegion,null);assert.equal(saved.location,null);assert.equal(saved.futurePreference,'keep');assert.equal(sandbox.state,saved);assert.equal(node('clearLibrary').disabled,true);assert.equal(node('protocol').value,'');
await sandbox.clearLibrary();assert.equal(writes,1);assert.ok(src.includes("indexedDB.open('flock',1)"));assert.ok(!src.slice(start,end).includes('caches.delete'));console.log('Clear library tests passed: cancellation, busy guard, failed write, successful reset and empty library');
})().catch(e=>{console.error(e);process.exitCode=1});

// Exercise the actual byte persistence helpers with a transactional in-memory store.
(async()=>{
const start=src.indexOf('const mediaKey='),end=src.indexOf('function reconnectMedia(',start),records=new Map(),keys=[];
const box={Blob,ArrayBuffer,structuredClone,UI:{note(){}},tx:async(mode,fn)=>{const r=fn({get:k=>records.get(k),put:(v,k)=>{records.set(k,structuredClone(v));keys.push(k)},delete:k=>records.delete(k)});return r},render(){}};
vm.createContext(box);vm.runInContext(src.slice(start,end),box);
const a={id:'photo',name:'bird.jpg',kind:'photo',blob:new Blob([new Uint8Array([1,2,3])],{type:'image/jpeg'})},library={assets:[a],encounters:[{id:'g',review:[{species:'Bird'}]}]};
await box.persistLibrary(library);assert.equal(records.get('state').assets[0].blob,undefined);assert.equal(records.get('media:photo').bytes.byteLength,3);
keys.length=0;await box.persistLibrary(library);assert.deepEqual(keys,['state']);
const loaded=structuredClone(records.get('state'));assert.equal(await box.restoreMedia(loaded),false);assert.deepEqual([...new Uint8Array(await loaded.assets[0].blob.arrayBuffer())],[1,2,3]);assert.equal(loaded.assets[0].blob.type,'image/jpeg');
const legacy={assets:[{id:'old',name:'old.wav',blob:new Blob(['old'],{type:'audio/wav'})}],encounters:[]};assert.equal(await box.restoreMedia(legacy),true);await box.persistLibrary(legacy);assert.equal(records.get('media:old').bytes.byteLength,3);assert.equal(records.has('media:photo'),false);
const missing={assets:[{id:'missing',mediaSize:99}],encounters:[{review:[{species:'Bird'}]}]};assert.equal(await box.restoreMedia(missing),true);assert.equal(missing.assets[0].mediaMissing,true);assert.equal(missing.assets[0].blob,null);assert.equal(missing.encounters[0].review[0].species,'Bird');
await box.persistLibrary({assets:[],encounters:[]});assert.equal(records.has('media:old'),false);console.log('Media bytes, reload, legacy migration, missing media and deletion tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
