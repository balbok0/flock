'use strict';
// Occurrence scores are relative suitability estimates, not identification probabilities.
const Geo=(()=>{
const key=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
function week(a){if(!a||a.timeSource==='File modification time')return null;const d=new Date(a.time),m=String(a.wallTime||'').match(/^\d{4}-(\d{2})-(\d{2})T/);if(!m&&!Number.isFinite(+d))return null;const month=m?+m[1]:d.getMonth()+1,day=m?+m[2]:d.getDate();return month>=1&&month<=12&&day>=1&&day<=31?(month-1)*4+Math.min(4,Math.ceil(day/7)):null}
function valid(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180}
function distance(a,b){const r=Math.PI/180,t=Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,t)))}
function context(a,assets=[]){const w=week(a);if(w===null)return null;if(valid(a.location))return {lat:a.location.lat,lon:a.location.lon,week:w,source:'file'};if(a.kind!=='audio')return null;const t=Date.parse(a.time);if(!Number.isFinite(t))return null;const near=assets.filter(p=>p.kind==='photo'&&valid(p.location)&&week(p)!==null&&Math.abs(Date.parse(p.time)-t)<=60000).sort((p,q)=>Math.abs(Date.parse(p.time)-t)-Math.abs(Date.parse(q.time)-t));if(!near.length||near.some(p=>distance(p.location,near[0].location)>1))return null;return {...near[0].location,week:w,source:'nearby photo'}}
function groupContext(a){const c=a.map(x=>context(x)).filter(Boolean);if(!c.length||c.some(x=>x.week!==c[0].week||distance(x,c[0])>1))return null;return c[0]}
const aliases=new Map([['sylviorthorhynchus desmursii','sylviorthorhynchus desmurii']]);
const sciKey=s=>aliases.get(key(s))||key(s);
const commonKey=s=>key(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function labelMap(labels,values){if(labels.length!==values.length)throw Error('Geomodel label/output mismatch');const sci=new Map(),id=new Map(),common=new Map(),ambiguous=new Set();for(let i=0;i<labels.length;i++){const raw=Number(values[i]),l=labels[i];if(!Number.isFinite(raw)||raw< -1e-6||raw>1+1e-6)throw Error('Invalid occurrence score');const p=Math.max(0,Math.min(1,raw));for(const [map,k] of [[sci,sciKey(l.scientific)],[id,key(l.id)]])if(k)map.set(k,Math.max(map.get(k)??0,p));const c=commonKey(l.common);if(c){const old=common.get(c),name=sciKey(l.scientific);if(old&&old.name!==name)ambiguous.add(c);else common.set(c,{name,p:Math.max(old?.p??0,p)})}}for(const c of ambiguous)common.delete(c);return {sci,id,common}}
function occurrence(m,scientific,id,common){if(!m)return null;return m.sci.get(sciKey(scientific))??m.id.get(key(id))??m.common?.get(commonKey(common))?.p??null}
function audioRank(s,p){return s}
const LOCAL_MIN=.01;
function photoRank(s,p,match=false){return s+(match?.025:0)}
function tier(p){return p==null?'unknown':p>=LOCAL_MIN?'local':'unlikely'}
function candidates(scores,n=8,hasPrior=false){const ranked=[...scores].sort((a,b)=>b.rank-a.rank),raw=[...scores].sort((a,b)=>b.similarity-a.similarity);if(!hasPrior){const out=ranked.slice(0,n);if(raw[0]&&!out.includes(raw[0]))out.push({...raw[0],rawAlternative:true});return out}const local=ranked.filter(s=>tier(s.occurrence)==='local').slice(0,n);const alternatives=raw.filter(s=>tier(s.occurrence)!=='local').slice(0,5);if(raw[0]&&!local.includes(raw[0])&&!alternatives.includes(raw[0]))alternatives.unshift(raw[0]);return [...local,...alternatives.map(s=>({...s,rawAlternative:true}))]}
return {week,context,groupContext,labelMap,occurrence,audioRank,photoRank,candidates,tier};
})();
if(typeof module!=='undefined')module.exports=Geo;
