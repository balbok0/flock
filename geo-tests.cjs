const assert=require('node:assert/strict'),G=require('./geo.js');
const a={kind:'audio',time:'2026-11-24T12:00:00Z',wallTime:'2026-11-24T08:00:00',timeSource:'Filename'};
assert.equal(G.week(a),44);assert.equal(G.week({...a,wallTime:'2026-12-31T08:00:00'}),48);
assert.equal(G.week({...a,timeSource:'File modification time'}),null);
const p={...a,kind:'photo',location:{lat:10.5,lon:-61.5}};
assert.equal(G.context(a,[p]).source,'nearby photo');assert.equal(G.context(a,[p,{...p,location:{lat:50,lon:10}}]),null);
assert.equal(G.context(a,[]),null);assert.equal(G.groupContext([p,{...p,location:{lat:50,lon:10}}]),null);
const m=G.labelMap([{scientific:'Turdus migratorius',id:'x'}],[.8]);assert.equal(G.occurrence(m,'TURDUS MIGRATORIUS'),.8);assert.equal(G.occurrence(m,'unknown'),null);
assert.equal(G.audioRank(.9,null),.9);assert.ok(G.audioRank(.9,0)>0);assert.equal(G.audioRank(.75,.9),G.audioRank(.75,.01));assert.equal(G.photoRank(.29,.9),G.photoRank(.29,.01));assert.ok(G.photoRank(.30,.01)>G.photoRank(.29,.9));
assert.equal(G.candidates([{similarity:1,rank:0},{similarity:.9,rank:1}],1).length,2);
console.log('Geographic ranking tests passed');

const alias=G.labelMap([{scientific:'Sylviorthorhynchus desmurii',common:'Des Murs’s Wiretail'},{scientific:'Ortalis ruficauda',common:'Rufous-vented Chachalaca'}],[0,.4]);assert.equal(G.occurrence(alias,'Sylviorthorhynchus desmursii'),0);assert.equal(G.occurrence(alias,'unmatched',undefined,"Des Murs's Wiretail"),0);const local={species:'Chachalaca',similarity:.25,occurrence:.4,rank:G.photoRank(.25,.4)},remote={species:'Wiretail',similarity:.5,occurrence:0,rank:G.photoRank(.5,0)},unknown={species:'Unknown',similarity:.6,occurrence:null,rank:G.photoRank(.6,null)};const out=G.candidates([local,remote,unknown],8,true);assert.equal(out[0].species,'Chachalaca');assert.ok(out.slice(1).every(x=>x.rawAlternative));assert.ok(G.photoRank(.25,.4)<G.photoRank(.5,0));

const rare={species:'Rare local',similarity:.61,occurrence:.011,rank:G.photoRank(.61,.011)},common={species:'Common local',similarity:.60,occurrence:.99,rank:G.photoRank(.60,.99)};assert.equal(G.candidates([common,rare,remote],8,true)[0].species,'Rare local');
