const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('function emptyLibrary('),end=src.indexOf('function render()',start);
assert.ok(start>=0&&end>start);
const controls=new Map(),node=id=>{if(!controls.has(id))controls.set(id,{disabled:false,value:'old',textContent:'old',dataset:{}});return controls.get(id)};
let consent=false,fail=false,writes=0,rendered=0,errors=0,busy=false,saved;
const initial={assets:[{kind:'photo'},{kind:'audio'}],encounters:[{confirmed:true}],detections:[{species:'Test'}],birdRegion:'TT',location:{lat:1,lon:2},futurePreference:'keep'};
const sandbox={$:node,document:{querySelectorAll:()=>[...controls.values()]},state:initial,confirm:()=>consent,ML:{isBusy:()=>busy,resetGeo(){}},UI:{resetLog(){},note(){},report(){},fail(){errors++}},render(){rendered++},tx:async(mode,fn)=>{assert.equal(mode,'readwrite');if(fail)throw Error('write failed');fn({put:(s,key)=>{assert.equal(key,'state');saved=s;writes++}})}};
vm.createContext(sandbox);vm.runInContext(src.slice(start,end)+'\nlibraryReady=true;',sandbox);
(async()=>{
await sandbox.clearLibrary();assert.equal(writes,0);
consent=true;busy=true;await sandbox.clearLibrary();assert.equal(writes,0);busy=false;
fail=true;await sandbox.clearLibrary();assert.equal(errors,1);assert.equal(sandbox.state,initial);assert.equal(writes,0);
fail=false;await sandbox.clearLibrary();assert.equal(writes,1);assert.equal(rendered,1);assert.equal(saved.assets.length,0);assert.equal(saved.encounters.length,0);assert.equal(saved.detections.length,0);assert.equal(saved.birdRegion,null);assert.equal(saved.location,null);assert.equal(saved.futurePreference,'keep');assert.equal(sandbox.state,saved);assert.equal(node('clearLibrary').disabled,true);assert.equal(node('protocol').value,'');
await sandbox.clearLibrary();assert.equal(writes,1);assert.ok(src.includes("indexedDB.open('flock',1)"));assert.ok(!src.slice(start,end).includes('caches.delete'));console.log('Clear library tests passed: cancellation, busy guard, failed write, successful reset and empty library');
})().catch(e=>{console.error(e);process.exitCode=1});
