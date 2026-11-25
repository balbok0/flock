'use strict';
const ReviewTools=(()=>{
function split(e,photos,cut,id,canonical=x=>x,V=VisionViews){
 if(!Number.isInteger(cut)||cut<=0||cut>=photos.length||!id||id===e.id)throw Error('Choose a boundary between two photos');
 const left=photos.slice(0,cut),right=photos.slice(cut),draft=V.reviewDraft(e,photos,canonical);
 const make=(items,key)=>({...e,id:key,ids:items.map(p=>p.id),review:draft.filter(r=>items.some(p=>p.id===r.photoId)),reviewStatus:'pending',confirmed:false,species:'',speciesCode:null,count:1,visual:[]});
 return [make(left,e.id),make(right,id)];
}
function merge(entries,photos,canonical=x=>x,V=VisionViews){
 if(entries.length<2)throw Error('Select another encounter');
 const ids=new Set(entries.flatMap(e=>e.ids)),ordered=photos.filter(p=>ids.has(p.id)).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)),rows=new Map();
 for(const e of entries)for(const r of V.reviewDraft(e,ordered.filter(p=>e.ids.includes(p.id)),canonical)){const old=rows.get(r.species);if(!old||r.count>old.count)rows.set(r.species,r)}
 return {...entries[0],ids:ordered.map(p=>p.id),review:[...rows.values()],reviewStatus:'pending',confirmed:false,species:'',speciesCode:null,count:1,visual:[]};
}
function segments(asset,detections,resolve=d=>d.species){
 const t=Date.parse(asset.time),by=new Map();if(!Number.isFinite(t))return [];
 for(const d of detections){if(d.assetId!==asset.id)continue;const start=Math.max(0,(Date.parse(d.start)-t)/1000),end=(Date.parse(d.end)-t)/1000,name=resolve(d);if(!name||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(d.confidence))continue;
 if(!by.has(name))by.set(name,[]);by.get(name).push({start,end,confidence:d.confidence,raw:d})}
 return [...by].map(([species,items])=>({species,items:items.sort((a,b)=>a.start-b.start),best:items.reduce((a,b)=>a.confidence>=b.confidence?a:b),local:items.some(x=>Geo.tier(x.raw.occurrence)==='local')})).sort((a,b)=>b.best.confidence-a.best.confidence)
}
function clock(s){s=Math.max(0,Math.floor(s));const m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0')}
function groups(rows){const out=new Map();for(const row of rows){const key=JSON.stringify(row.slice(5,13)),entry=out.get(key)||{name:row[5],lat:row[6],lon:row[7],date:row[8],time:row[9],region:row[10],country:row[11],protocol:row[12],rows:[]};entry.rows.push({species:row[0],count:row[3]});out.set(key,entry)}return [...out.values()]}
return {split,merge,segments,clock,groups};
})();
if(typeof module!=='undefined')module.exports=ReviewTools;
