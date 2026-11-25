'use strict';
const Taxonomy=(()=>{
let rows=[],byCode=new Map(),byCommon=new Map(),byScientific=new Map(),ready=false;
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function add(map,key,row){if(!key)return;const old=map.get(key);if(old===undefined)map.set(key,row);else if(old!==row)map.set(key,null)}
function init(data){if(!Array.isArray(data.taxa)||!data.taxa.length)throw Error('Invalid eBird taxonomy');rows=data.taxa.map(([code,common,scientific,category])=>({code,common,scientific,category,cn:norm(common),sn:norm(scientific)}));byCode=new Map();byCommon=new Map();byScientific=new Map();for(const r of rows){add(byCode,r.code.toLowerCase(),r);add(byCommon,r.cn,r);if(r.category==='species')add(byScientific,r.sn,r)}ready=true}
async function load(){const r=await fetch(new URL('./taxonomy.json?v=2026',document.baseURI));if(!r.ok)throw Error('eBird taxonomy unavailable');init(await r.json())}
function exact(value){return byCommon.get(norm(value))||byScientific.get(norm(value))||byCode.get(String(value||'').trim().toLowerCase())||null}
function model(common,scientific,code){const s=byScientific.get(norm(scientific)),c=byCommon.get(norm(common)),id=byCode.get(String(code||'').trim().toLowerCase());return s||((id&&(!scientific||id.sn===norm(scientific)))?id:null)||c||null}
function search(q,limit=12){const n=norm(q),words=n.split(' ').filter(Boolean);if(!n)return [];const out=[];for(const r of rows){let rank=100;if(r.cn===n||r.sn===n||r.code===n)rank=0;else if(r.cn.startsWith(n))rank=1;else if(r.cn.includes(n))rank=2;else if(r.sn.startsWith(n))rank=3;else if(words.every(w=>r.cn.split(' ').some(v=>v.startsWith(w))))rank=4;else if(r.sn.includes(n))rank=5;if(rank<100)out.push([rank+(r.category==='species'?0:.25),r])}return out.sort((a,b)=>a[0]-b[0]||a[1].common.localeCompare(b[1].common)).slice(0,limit).map(x=>x[1])}
return {init,load,exact,model,search,isReady:()=>ready};
})();
if(typeof module!=='undefined')module.exports=Taxonomy;
