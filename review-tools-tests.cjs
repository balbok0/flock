const assert=require('node:assert/strict'),V=require('./vision.js'),R=require('./review-tools.js');global.Geo=require('./geo.js');
const photos=[{id:'p1',time:'2026-01-01T12:00:00Z'},{id:'p2',time:'2026-01-01T12:00:01Z'},{id:'p3',time:'2026-01-01T12:00:02Z'}],e={id:'a',ids:['p1','p2','p3'],review:[{species:'Bird',count:2,photoId:'p2'},{species:'Other',count:1,photoId:'p3'}],reviewStatus:'done'};
const [l,r]=R.split(e,photos,2,'b',x=>x,V);assert.deepEqual(l.ids,['p1','p2']);assert.deepEqual(r.ids,['p3']);assert.equal(l.review[0].species,'Bird');assert.equal(r.review[0].species,'Other');assert.equal(l.reviewStatus,'pending');assert.throws(()=>R.split(e,photos,0,'b',x=>x,V));assert.equal(e.review.length,2);
const m=R.merge([l,{...r,review:[...r.review,{species:'Bird',count:1,photoId:'p3'}]}],photos,x=>x,V);assert.deepEqual(m.ids,e.ids);assert.equal(m.review.find(x=>x.species==='Bird').count,2);assert.equal(m.reviewStatus,'pending');
const a={id:'audio',time:'2026-01-01T12:00:00Z'},ds=[{assetId:'audio',species:'Bird',start:'2026-01-01T12:00:03Z',end:'2026-01-01T12:00:06Z',confidence:.7},{assetId:'audio',species:'Bird',start:'2026-01-01T12:00:09Z',end:'2026-01-01T12:00:12Z',confidence:.9},{assetId:'other',species:'Bird',start:'2026-01-01T12:00:00Z',end:'2026-01-01T12:00:01Z',confidence:1}];const s=R.segments(a,ds);assert.equal(s.length,1);assert.equal(s[0].items.length,2);assert.equal(s[0].best.start,9);assert.equal(s[0].best.end,12);assert.equal(R.clock(65),'1:05');
const row=(species,count,time,loc)=>[species,'','',count,'',loc,'','','1/1/2026',time,'','TT','Incidental','','','N','','',''];const g=R.groups([row('Bird',2,'12:00','TT'),row('Other','X','12:00','TT'),row('Bird',1,'12:01','TT')]);assert.equal(g.length,2);assert.equal(g[0].rows[1].count,'X');assert.equal(g[1].time,'12:01');console.log('Grouping, audio windows, and exact checklist grouping tests passed');

assert.equal(R.confirmedTime({...a,heardOffsets:{Bird:65}},'Bird'),'2026-01-01T12:01:05.000Z');assert.equal(R.confirmedTime({...a,heardOffsets:{Bird:-1}},'Bird',ds[0].start),ds[0].start);assert.equal(R.confirmedTime(a,'Bird'),a.time);

{
const photos=[{id:'p1',time:'2026-01-01T00:00:00Z',kind:'photo'},{id:'p2',time:'2026-01-01T00:00:01Z',kind:'photo'},{id:'p3',time:'2026-01-01T00:01:00Z',kind:'photo'}],audio={id:'a1',kind:'audio'};
const e={id:'e',ids:['p1','p2'],reviewStatus:'done',review:[{species:'Bird',count:2,photoId:'p1'},{species:'Other',count:1,photoId:'p2'}]},other={id:'other',ids:['p3'],confirmed:true,species:'Third',count:1};
const library={assets:[...photos,audio],encounters:[e,other],detections:[{assetId:'p1'},{assetId:'a1'}]};
const retain=R.removeMedia(library,['p1'],{keepLinked:true,V});assert.deepEqual(retain.encounters[0].ids,['p2']);assert.equal(retain.encounters[0].review[0].photoId,'p2');assert.equal(retain.encounters[0].review[0].count,2);assert.equal(retain.encounters[0].reviewStatus,'pending');assert.equal(retain.encounters[1],other);
const discard=R.removeMedia(library,['p1'],{V});assert.deepEqual(discard.encounters[0].review.map(x=>x.species),['Other']);assert.equal(discard.detections.length,1);assert.equal(discard.detections[0].assetId,'a1');
const whole=R.removeMedia(library,['p1','p2'],{V});assert.deepEqual(whole.encounters,[other]);assert.deepEqual(whole.assets.map(x=>x.id),['p3','a1']);assert.equal(library.assets.length,4);assert.equal(e.review.length,2);
console.log('Photo removal preserves other encounters, counts and audio; linked sightings require explicit retention');
}
