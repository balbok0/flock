const assert=require('node:assert/strict'),fs=require('node:fs');global.Geo=require('./geo.js');const R=require('./regions.js');R.init(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));R.initCodes(JSON.parse(fs.readFileSync(process.argv[3],'utf8')));const p={kind:'photo',location:{lat:10.65,lon:-61.4},time:'2026-11-24T12:00:00Z',timeSource:'Photo EXIF'};const t=R.locate(p.location);assert.equal(t.id,'TT');assert.equal(R.locate({lat:37.3,lon:-121.9}).id,'US-CA');assert.ok(R.get('TT').points.some(([lat,lon])=>lat>11&&lon>-61));assert.ok(R.get('TT').points.some(([lat])=>lat<11));assert.equal(R.context({kind:'audio',time:p.time},[p],null).id,'TT');assert.equal(R.context(p,[p],'US-CA').id,'US-CA');assert.equal(R.context({kind:'audio',timeSource:'File modification time'},[],'TT').weeks.length,4);assert.equal(R.context({kind:'audio'},[],null),null);assert.equal(R.inferred([p,{...p,location:{lat:37.3,lon:-121.9}}]),null);console.log('Region tests passed:',R.countries().length,'countries/territories;',R.get('TT').points.length,'TT sample points');
assert.deepEqual(R.codes(R.get('TT')),{country:'TT',region:''});assert.deepEqual(R.codes(R.get('US-CA')),{country:'US',region:'CA'});assert.deepEqual(R.exportCodes(p.location,'US-CA'),{country:'TT',region:''});assert.deepEqual(R.exportCodes({lat:0,lon:-140},'US-CA'),{country:'US',region:'CA'});assert.deepEqual(R.exportCodes({lat:0,lon:-140},'US-CA','TT',''),{country:'TT',region:''});console.log('eBird geographic code mapping tests passed');

assert.ok(R.validCodes('TT',''));assert.ok(R.validCodes('US','CA'));assert.ok(!R.validCodes('US','ZZZ'));assert.equal(R.exportCodes({lat:0,lon:-140},'TT','US','ZZZ'),null);

// Exercise actual app export with the committed region/code tables.
const vm=require('node:vm'),M=require('./metadata.js'),src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('function validLoc('),end=src.indexOf("$('export').onclick",start);
assert.ok(start>=0&&end>start);
const fields={fallbackCountry:{value:''},fallbackRegion:{value:''},protocol:{value:'Incidental'}};
const audio={id:'a',kind:'audio',time:'2026-11-24T12:00:00Z',wallTime:'2026-11-24T12:00:00',heard:['Blue-gray Tanager'],location:null};
const sandbox={...M,VisionViews:require('./vision.js'),ReviewTools:require('./review-tools.js'),Regions:R,Taxonomy:{exact:common=>({common}),model:common=>({common})},$:id=>fields[id],state:{assets:[audio],encounters:[],detections:[],birdRegion:'TT'}};
vm.createContext(sandbox);vm.runInContext(src.slice(start,end),sandbox);
let exported=sandbox.exportRows();assert.equal(exported.length,1);assert.deepEqual(Array.from(exported[0].slice(5,8)),[R.label(R.get('TT')),'','']);assert.equal(exported[0][11],'TT');
sandbox.state.birdRegion='US-CA';exported=sandbox.exportRows();assert.equal(exported[0][10],'CA');assert.equal(exported[0][11],'US');assert.deepEqual(Array.from(exported[0].slice(6,8)),['','']);
sandbox.state.assets=[{...audio,location:p.location}];exported=sandbox.exportRows();assert.equal(exported[0][11],'TT');assert.deepEqual(Array.from(exported[0].slice(6,8)),[p.location.lat,p.location.lon]);
sandbox.state.birdRegion=null;sandbox.state.assets=[audio,p];exported=sandbox.exportRows();assert.equal(exported[0][11],'TT');assert.deepEqual(Array.from(exported[0].slice(6,8)),['','']);
sandbox.state.assets=[audio];assert.throws(()=>sandbox.exportRows(),/choose a birding region in Import/);
fields.fallbackCountry.value='US';fields.fallbackRegion.value='CA';exported=sandbox.exportRows();assert.equal(exported[0][10],'CA');assert.equal(exported[0][11],'US');assert.deepEqual(Array.from(exported[0].slice(6,8)),['','']);
fields.fallbackCountry.value='';fields.fallbackRegion.value='';sandbox.state.birdRegion='TT';sandbox.state.assets=[audio,{...p,id:'p',location:null}];sandbox.state.encounters=[{confirmed:true,ids:['p'],species:'Other bird',count:1}];assert.equal(sandbox.exportRows().length,2);
console.log('Export regression tests passed: selected region, actual GPS, inferred region, manual fallback, missing region and photos without GPS');

const bird={species:'Blue-gray Tanager',confirmed:true,box:{x:.1,y:.1,w:.2,h:.2}},photo1={...p,id:'p1',autoBirds:[bird,bird]},photo2={...p,id:'p2',autoBirds:[bird,{...bird,species:'Other bird'}]};sandbox.state.assets=[photo1,photo2];sandbox.state.encounters=[{ids:['p1','p2'],confirmed:true,species:'Blue-gray Tanager',count:1}];exported=sandbox.exportRows();assert.equal(exported.length,2);assert.equal(exported.find(r=>r[0]==='Blue-gray Tanager')[3],2);assert.equal(exported.find(r=>r[0]==='Other bird')[3],1);

sandbox.state.encounters[0].review=[{species:'Other bird',count:4,photoId:'p2'}];exported=sandbox.exportRows();assert.equal(exported.length,1);assert.equal(exported[0][0],'Other bird');assert.equal(exported[0][3],4);sandbox.state.encounters[0].review=[];assert.throws(()=>sandbox.exportRows(),/Confirm sightings first/);

sandbox.state.encounters=[];sandbox.state.assets=[{...audio,heardOffsets:{'Blue-gray Tanager':65}}];sandbox.state.birdRegion='TT';exported=sandbox.exportRows();assert.equal(exported[0][9],'12:01');
