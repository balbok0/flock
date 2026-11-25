const assert=require('node:assert/strict'),G=require('./guides.js');
const row={code:'rufcha1',key:'123',by:'Photographer',sciName:'Ortalis ruficauda',name:'Rufous-vented Chachalaca',license:'CC BY-NC 4.0'};
const valid=G.normalize(row);assert.equal(valid.license,'cc-by-nc-4.0');assert.equal(G.licenseURL(valid),'https://creativecommons.org/licenses/by-nc/4.0/');assert.equal(G.url(valid,480),'https://static.avicommons.org/rufcha1-123-480.jpg');
assert.equal(G.normalize({...row,license:'all rights reserved'}),null);assert.equal(G.normalize({...row,by:''}),null);assert.equal(G.normalize({...row,key:'../../abc'}),null);
const taxon={code:row.code,scientific:row.sciName,category:'species'};
assert.equal(G.select([row],()=>taxon).length,1);assert.equal(G.select([row],()=>({...taxon,scientific:'Different bird'})).length,0);assert.equal(G.select([row],()=>taxon,{},()=>.001).length,0);assert.equal(G.select([row],()=>taxon,{},()=>.02).length,1);
console.log('Guide license validation, taxonomy identity and region selection passed');
