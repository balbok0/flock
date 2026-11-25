'use strict';
const VisionViews=(()=>{
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function focus(value){if(!value||![value.x,value.y,value.scale].every(Number.isFinite))return null;return {x:clamp(value.x,0,1),y:clamp(value.y,0,1),scale:clamp(value.scale,.12,.95)}}
function crop(width,height,view){if(!(width>0&&height>0))throw Error('Invalid image dimensions');const v=focus(view)||{x:.5,y:.5,scale:.9},side=Math.max(1,Math.min(width,height)*v.scale);return {x:clamp(v.x*width-side/2,0,width-side),y:clamp(v.y*height-side/2,0,height-side),side}}
function views(manual){const v=focus(manual);return v?[v]:[.9,.55,.32].map(scale=>({x:.5,y:.5,scale}))}
function accumulate(best,embedding,matrix){if(embedding.length!==768||matrix.length!==best.length*768)throw Error('Vision classifier dimension mismatch');for(let j=0;j<best.length;j++){let score=0;for(let i=0;i<768;i++)score+=embedding[i]*matrix[j*768+i];if(score>best[j])best[j]=score}}
// All boxes are normalized to the original, oriented image.
function box(b){if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite))return null;const x=clamp(b.x,0,1),y=clamp(b.y,0,1),w=clamp(b.x+b.w,0,1)-x,h=clamp(b.y+b.h,0,1)-y;return w>0&&h>0?{x,y,w,h}:null}
function boxCrop(w,h,b,padding=.25){const r=box(b);if(!r)throw Error('Invalid bird box');const side=Math.max(r.w*w,r.h*h)*(1+padding);return {x:(r.x+r.w/2)*w-side/2,y:(r.y+r.h/2)*h-side/2,side}}
function legacyBox(w,h,f){const c=crop(w,h,f);return box({x:c.x/w,y:c.y/h,w:c.side/w,h:c.side/h})}
function active(p){return p.manualBirds??p.autoBirds??[]}
function iou(a,b){const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return area/(a.w*a.h+b.w*b.h-area||1)}
function suppress(hits,threshold=.45){const out=[];for(const h of [...hits].sort((a,b)=>b.confidence-a.confidence))if(!out.some(o=>iou(o.box,h.box)>threshold))out.push(h);return out}
// Official YOLOX Nano release: 416 BGR, [1,3549,85], raw grid offsets.
const DETECTOR_SIZE=416,DETECTOR_VERSION='yolox-nano-0.1.1rc0-v1';
function decode(data,width,height,tile={x:0,y:0,w:width,h:height},threshold=.20){if(data.length!==3549*85)throw Error('YOLOX output shape mismatch');const scale=Math.min(416/tile.w,416/tile.h),hits=[];let row=0;for(const stride of [8,16,32])for(let gy=0;gy<416/stride;gy++)for(let gx=0;gx<416/stride;gx++,row++){const i=row*85,confidence=data[i+4]*data[i+5+14];if(!Number.isFinite(confidence)||confidence<threshold||confidence>1)continue;const cx=(data[i]+gx)*stride/scale,cy=(data[i+1]+gy)*stride/scale,bw=Math.exp(data[i+2])*stride/scale,bh=Math.exp(data[i+3])*stride/scale;if(![cx,cy,bw,bh].every(Number.isFinite))continue;const x1=Math.max(0,cx-bw/2),y1=Math.max(0,cy-bh/2),x2=Math.min(tile.w,cx+bw/2),y2=Math.min(tile.h,cy+bh/2);if(x2<=x1||y2<=y1)continue;const b=box({x:(tile.x+x1)/width,y:(tile.y+y1)/height,w:(x2-x1)/width,h:(y2-y1)/height});if(b)hits.push({box:b,confidence})}return suppress(hits)}
function tiles(w,h){const tw=Math.ceil(w*.6),th=Math.ceil(h*.6);return [{x:0,y:0,w:tw,h:th},{x:w-tw,y:0,w:tw,h:th},{x:0,y:h-th,w:tw,h:th},{x:w-tw,y:h-th,w:tw,h:th}]}
// Count individuals within one frame, never sum a burst across frames.
function observations(photos,canonical=x=>x){const best=new Map();for(const p of photos){const counts=new Map();for(const b of active(p)){if(!b.confirmed||!b.species)continue;const name=canonical(b.species);counts.set(name,(counts.get(name)||0)+1)}for(const [species,count] of counts){const old=best.get(species);if(!old||count>old.count)best.set(species,{species,count,photo:p})}}return [...best.values()]}
// Encounter review is authoritative once edited; an empty review is intentional.
function reviewed(e,photos,canonical=x=>x){if(Array.isArray(e.review)){const out=new Map();for(const r of e.review){const species=canonical(r.species),count=Math.max(1,Math.floor(Number(r.count)||1)),photo=photos.find(p=>p.id===r.photoId)||photos[0],old=out.get(species);if(photo&&(!old||count>old.count))out.set(species,{species,count,photo})}return [...out.values()]}const out=new Map(observations(photos,canonical).map(r=>[r.species,r]));if(e.confirmed&&e.species&&photos.length){const species=canonical(e.species),count=Math.max(1,Math.floor(Number(e.count)||1)),old=out.get(species);if(!old||count>old.count)out.set(species,{species,count,photo:photos[0]})}return [...out.values()]}
function reviewDraft(e,photos,canonical=x=>x){return reviewed(e,photos,canonical).map(r=>({species:r.species,count:r.count,photoId:r.photo.id}))}
// Count support by distinct photos; keep regional eligibility separate.
function suggestions(e,photos,resolve=v=>v.species){const all=new Map();function record(v,p,top){const species=resolve(v);if(!species||!Number.isFinite(v.similarity))return;let r=all.get(species);if(!r){r={species,similarity:-Infinity,eligible:false,support:new Set(),photos:new Set(),counts:new Map(),photoId:p?.id};all.set(species,r)}if(!v.rawAlternative){if(!r.eligible||v.similarity>r.similarity){r.similarity=v.similarity;r.photoId=p?.id}r.eligible=true;if(p)r.photos.add(p.id);if(top&&p){r.support.add(p.id);r.counts.set(p.id,(r.counts.get(p.id)||0)+1)}}else if(!r.eligible&&v.similarity>r.similarity){r.similarity=v.similarity;r.photoId=p?.id}}
for(const p of photos)for(const b of active(p)){const list=b.visual||[],first=list.find(v=>!v.rawAlternative);for(const v of list)record(v,p,v===first)}
const fallback=photos.find(p=>!active(p).length&&p.manualBirds==null);if(fallback)for(const v of e.visual||[])record(v,fallback,false);
return [...all.values()].map(r=>({species:r.species,similarity:r.similarity,eligible:r.eligible,support:r.support.size,photos:r.photos.size,count:Math.max(1,...r.counts.values()),photoId:r.photoId})).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.support-a.support||b.similarity-a.similarity||a.species.localeCompare(b.species))}
// Workflow status is independent from the confirmed observations.
function reviewStatus(e){return e.reviewStatus==='done'?'done':e.reviewStatus==='later'?'later':'pending'}
function reviewQueue(encounters,filter='pending'){return encounters.filter(e=>filter==='all'||reviewStatus(e)===filter)}
function reviewProgress(encounters){const out={total:encounters.length,pending:0,later:0,done:0};for(const e of encounters)out[reviewStatus(e)]++;return out}
function nextReview(queue,current,direction=1){if(!queue.length)return null;const i=queue.findIndex(e=>e.id===current);if(i<0)return direction<0?queue.at(-1).id:queue[0].id;return queue[Math.max(0,Math.min(queue.length-1,i+direction))].id}
// After removing a task from a filtered queue, continue at its former index.
function afterReview(queue,oldIndex){return queue.length?queue[Math.max(0,Math.min(queue.length-1,oldIndex))].id:null}
return {focus,crop,views,accumulate,box,boxCrop,legacyBox,active,iou,suppress,decode,tiles,observations,reviewed,reviewDraft,suggestions,reviewStatus,reviewQueue,reviewProgress,nextReview,afterReview,DETECTOR_SIZE,DETECTOR_VERSION};
})();
if(typeof module!=='undefined')module.exports=VisionViews;
