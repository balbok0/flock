'use strict';
const Regions=(()=>{
let rows=[],byId=new Map();
function init(data){if(!Array.isArray(data)||!data.length)throw Error('Invalid region index');rows=data;byId=new Map(rows.map(r=>[r.id,r]));}
async function load(){const r=await fetch(new URL('./regions.json?v=1',document.baseURI));if(!r.ok)throw Error('Region index unavailable');init(await r.json())}
const get=id=>byId.get(id)||null;
const countries=()=>rows.filter(r=>!r.parent).sort((a,b)=>a.name.localeCompare(b.name));
const children=id=>rows.filter(r=>r.parent===id).sort((a,b)=>a.name.localeCompare(b.name));
function ringContains(r,x,y){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [a,b]=r[i],[c,d]=r[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside}return inside}
function contains(r,p){const [x0,y0,x1,y1]=r.bounds,x=p.lon,y=p.lat;if(x<x0||x>x1||y<y0||y>y1)return false;return r.polygons.some(poly=>ringContains(poly[0],x,y)&&!poly.slice(1).some(h=>ringContains(h,x,y)))}
function valid(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180}
function locate(p){if(!valid(p))return null;const c=rows.filter(r=>!r.parent&&contains(r,p)).sort((a,b)=>a.area-b.area)[0];if(!c)return null;return rows.filter(r=>r.parent===c.id&&contains(r,p)).sort((a,b)=>a.area-b.area)[0]||c}
function inferred(assets){const ids=new Set(assets.filter(a=>a.kind==='photo').map(a=>locate(a.location)?.id).filter(Boolean));if(!ids.size)for(const a of assets)if(a.kind==='audio'){const r=locate(a.location);if(r)ids.add(r.id)}const found=[...ids].map(get);if(found.length===1)return found[0];if(found.length&&found.every(r=>r.country===found[0].country))return get(found[0].country);return null}
function resolve(a,assets,override){return get(override)||locate(a.location)||inferred(assets)}
function context(a,assets,override){const r=resolve(a,assets,override);if(!r)return null;const week=Geo.week(a);return {id:r.id,name:r.name,points:r.points,weeks:week===null?[6,18,30,42]:[week],source:override?'selected':locate(a.location)?'file region':'library region'}}
function groupContext(a,assets,override){if(!a.length)return null;const c=a.map(x=>context(x,assets,override)).filter(Boolean);if(!c.length)return null;const r=c.every(x=>x.id===c[0].id)?get(c[0].id):c.every(x=>get(x.id).country===get(c[0].id).country)?get(get(c[0].id).country):null;if(!r)return null;const weeks=[...new Set(c.flatMap(x=>x.weeks))];return {id:r.id,name:r.name,points:r.points,weeks,source:override?'selected':'photo region'}}
function label(r){return r.parent?r.name+', '+(get(r.parent)?.name||r.parent):r.name}
return {init,load,get,countries,children,locate,inferred,resolve,context,groupContext,label};
})();
if(typeof module!=='undefined')module.exports=Regions;
