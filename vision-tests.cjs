const assert=require('node:assert/strict'),V=require('./vision.js');const a=V.views(null);assert.equal(a.length,3);const c=V.crop(1152,1536,a[2]);assert.equal(c.side,368.64);assert.ok(c.x<460&&c.x+c.side>610&&c.y<750&&c.y+c.side>930);const corner=V.crop(1152,1536,{x:1,y:0,scale:.32});assert.equal(corner.y,0);assert.ok(Math.abs(corner.x+corner.side-1152)<1e-8);assert.equal(V.views({x:.45,y:.55,scale:.2}).length,1);assert.equal(V.focus({x:NaN,y:0,scale:.2}),null);const m=new Float32Array(1536),v=new Float32Array(768),w=new Float32Array(768),best=new Float64Array(2).fill(-Infinity);m[0]=1;m[769]=1;v[0]=.2;v[1]=.7;w[0]=.8;w[1]=.1;V.accumulate(best,v,m);V.accumulate(best,w,m);assert.ok(Math.abs(best[0]-.8)<1e-6&&Math.abs(best[1]-.7)<1e-6);console.log('Vision multi-scale crop and aggregation tests passed');
const assertBox=V.box({x:.9,y:.9,w:.2,h:.2});assert.ok(Math.abs(assertBox.w-.1)<1e-8);assert.equal(V.box({x:0,y:0,w:0,h:1}),null);
const rect={x:.85,y:.02,w:.13,h:.2},crop=V.boxCrop(4000,3000,rect);assert.ok(crop.x<=rect.x*4000&&crop.x+crop.side>=(rect.x+rect.w)*4000&&crop.y<=rect.y*3000&&crop.y+crop.side>=(rect.y+rect.h)*3000);
const raw=new Float32Array(3549*85);function put(gx,gy,c){const i=(gy*52+gx)*85;raw[i]=.5;raw[i+1]=.5;raw[i+2]=Math.log(4);raw[i+3]=Math.log(4);raw[i+4]=1;raw[i+19]=c}put(10,10,.9);put(11,10,.8);put(40,20,.95);const hits=V.decode(raw,832,832);assert.equal(hits.length,2);assert.ok(hits[0].box.x>.7);assert.equal(V.decode(new Float32Array(3549*85),832,832).length,0);
const tile={x:400,y:100,w:600,h:600},mapped=V.decode(raw,1000,1000,tile);assert.ok(mapped.every(h=>h.box.x>=.4&&h.box.y>=.1));assert.equal(V.tiles(1000,2000).length,4);
const bird={species:'Bird',confirmed:true,box:rect},p1={autoBirds:[bird,bird]},p2={autoBirds:[bird,{...bird,species:'Other'}]},p3={autoBirds:[bird],manualBirds:[]};assert.deepEqual(V.observations([p1,p2,p3]).map(o=>[o.species,o.count]),[['Bird',2],['Other',1]]);assert.equal(V.active(p3).length,0);assert.equal(V.active({...p3,manualBirds:null}).length,1);console.log('Bird boxes, YOLOX decode/NMS, tiled coordinates, manual precedence and count tests passed');

{
const v=(species,similarity,rawAlternative=false)=>({species,similarity,rawAlternative});
const pA={id:'a',autoBirds:[{visual:[v('Chachalaca',.7),v('Tanager',.5)]},{visual:[v('Chachalaca',.65),v('Rare',.99,true)]}]},pB={id:'b',autoBirds:[{visual:[v('Chachalaca',.6),v('Tanager',.55)]}]};
const proposals=V.suggestions({},[pA,pB]);assert.equal(proposals[0].species,'Chachalaca');assert.equal(proposals[0].support,2);assert.equal(proposals[0].count,2);assert.equal(proposals.find(x=>x.species==='Rare').eligible,false);assert.equal(proposals.find(x=>x.species==='Tanager').count,1);
const oldGroup={confirmed:true,species:'Old',count:2},oldPhotos=[{id:'a',autoBirds:[{confirmed:true,species:'Old'},{confirmed:true,species:'Other'}]}];assert.deepEqual(V.reviewDraft(oldGroup,oldPhotos).map(r=>[r.species,r.count]),[['Old',2],['Other',1]]);assert.deepEqual(V.reviewed({...oldGroup,review:[]},oldPhotos),[]);assert.deepEqual(V.reviewDraft({...oldGroup,review:[{species:'New',count:3,photoId:'missing'}]},oldPhotos),[{species:'New',count:3,photoId:'a'}]);
console.log('Encounter review: aggregation, conservative suggested counts, old confirmations, explicit undo, authoritative review passed');
}

{
const groups=[{id:'a'},{id:'b',reviewStatus:'later'},{id:'c',reviewStatus:'done'},{id:'d',reviewStatus:'unknown'}];
assert.deepEqual(V.reviewProgress(groups),{total:4,pending:2,later:1,done:1});
assert.deepEqual(V.reviewQueue(groups).map(e=>e.id),['a','d']);assert.deepEqual(V.reviewQueue(groups,'later').map(e=>e.id),['b']);assert.deepEqual(V.reviewQueue(groups,'done').map(e=>e.id),['c']);
assert.equal(V.nextReview(groups,'a',-1),'a');assert.equal(V.nextReview(groups,'a',1),'b');assert.equal(V.nextReview([],null),null);
groups[0].reviewStatus='done';assert.equal(V.afterReview(V.reviewQueue(groups),0),'d');groups[3].reviewStatus='later';assert.equal(V.afterReview(V.reviewQueue(groups),0),null);
assert.equal(V.reviewStatus({review:[{species:'Bird',count:1}]}),'pending');assert.equal(V.reviewed({reviewStatus:'done',review:[]},[{id:'a'}]).length,0);
console.log('Review queue: filters, progress, navigation, deferred and empty review behavior passed');
}

{
 const p={id:'p',autoBirds:[{visual:[{species:'Chachalaca',similarity:.8},{species:'Rare',similarity:.99,rawAlternative:true}]}]};
 const e={id:'a'};
 assert.deepEqual(V.encounterLabel(e,[p]),{title:'Chachalaca',kind:'suggested',photoId:'p'});
 assert.equal(V.encounterLabel({...e,review:[{species:'Corrected',count:1,photoId:'p'}]},[p]).title,'Corrected');
 assert.equal(V.encounterLabel({...e,reviewStatus:'done',review:[]},[p]).kind,'empty');
 assert.equal(V.encounterLabel(e,[{id:'p'}]).kind,'unknown');
 assert.equal(V.encounterLabel(e,[{id:'p',autoBirds:[{visual:[{species:'Rare',similarity:.9,rawAlternative:true}]}]}]).kind,'range');
 assert.equal(V.encounterLabel(e,[{id:'p',autoBirds:[{visual:[{species:'A',similarity:.9}]},{visual:[{species:'B',similarity:.8}]}]}]).title,'A · B');
 console.log('Encounter index labels: suggestions, confirmations, multiple species and empty reviews passed');
}

{
 const p={id:'first',autoBirds:[{visual:[{species:'Bird',similarity:.73,occurrence:.86,nearAudio:true},{species:'Rare',similarity:.91,occurrence:.0001,rawAlternative:true}]}]},q={id:'second',autoBirds:[{visual:[{species:'Bird',similarity:.68,occurrence:.98},{species:'Unknown',similarity:.6,occurrence:null,rawAlternative:true}]}]};
 const rows=V.suggestions({},[p,q]),bird=rows.find(r=>r.species==='Bird');assert.equal(bird.similarity,.73);assert.equal(bird.occurrence,.86);assert.equal(bird.photoId,'first');assert.equal(bird.nearAudio,true);assert.deepEqual(V.scoreEvidence(bird),{similarity:'0.730',range:'86%',tier:'local'});assert.equal(V.scoreEvidence(rows.find(r=>r.species==='Rare')).range,'<1%');assert.equal(V.scoreEvidence(rows.find(r=>r.species==='Unknown')).tier,'unknown');assert.equal(V.scoreEvidence({occurrence:0}).range,'0%');assert.equal(V.scoreEvidence({}).range,null);
 console.log('Original visual/range evidence survives aggregation without mixing independent maxima');
}

{
 const large={x:.2,y:.15,w:.2,h:.5},nested={x:.23,y:.2,w:.08,h:.12},adjacent={x:.37,y:.17,w:.20,h:.5};
 assert(V.iou(large,nested)<.45);assert(V.containment(large,nested)>.99);
 const hits=[{box:nested,confidence:.55},{box:large,confidence:.88},{box:adjacent,confidence:.75}];
 assert.deepEqual(V.suppress(hits),[hits[1],hits[2]]);assert.equal(V.suppress(hits,.45,Infinity).length,3);
 const photo={id:'p',autoBirds:[{box:large,species:'Motmot',confirmed:true}],detectorVersion:'yolox-nano-0.1.1rc0-v1'},manual={id:'m',manualBirds:[{id:'kept',box:nested}]},e={};
 assert(V.replaceAutomatic(e,[photo,manual],photo,[hits[1]],V.DETECTOR_VERSION,()=> 'new'));
 assert.deepEqual(e.review,[{species:'Motmot',count:1,photoId:'p'}]);assert.equal(photo.detectorVersion,V.DETECTOR_VERSION);assert.equal(photo.autoBirds[0].id,'new');
 assert.equal(V.replaceAutomatic(e,[photo,manual],manual,[hits[1]],V.DETECTOR_VERSION,()=> 'wrong'),false);assert.equal(manual.manualBirds[0].id,'kept');
 const reviewed={review:[{species:'Motmot',count:2,photoId:'p'}]};const original=reviewed.review;
 V.replaceAutomatic(reviewed,[photo],photo,[],V.DETECTOR_VERSION,()=> 'unused');assert.equal(reviewed.review,original);
 console.log('Nested duplicate suppression, adjacent birds, detector migration and confirmation preservation passed');
}
