'use strict';
const VisionViews=(()=>{
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function focus(value){if(!value||![value.x,value.y,value.scale].every(Number.isFinite))return null;return {x:clamp(value.x,0,1),y:clamp(value.y,0,1),scale:clamp(value.scale,.12,.95)}}
function crop(width,height,view){if(!(width>0&&height>0))throw Error('Invalid image dimensions');const v=focus(view)||{x:.5,y:.5,scale:.9},side=Math.max(1,Math.min(width,height)*v.scale);return {x:clamp(v.x*width-side/2,0,width-side),y:clamp(v.y*height-side/2,0,height-side),side}}
function views(manual){const v=focus(manual);return v?[v]:[.9,.55,.32].map(scale=>({x:.5,y:.5,scale}))}
function accumulate(best,embedding,matrix){if(embedding.length!==768||matrix.length!==best.length*768)throw Error('Vision classifier dimension mismatch');for(let j=0;j<best.length;j++){let score=0;for(let i=0;i<768;i++)score+=embedding[i]*matrix[j*768+i];if(score>best[j])best[j]=score}}
return {focus,crop,views,accumulate};
})();
if(typeof module!=='undefined')module.exports=VisionViews;
