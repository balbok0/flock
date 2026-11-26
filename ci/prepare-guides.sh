#!/usr/bin/env bash
set -euo pipefail
dest="${1:-_site}"
mkdir -p "$dest"
curl --fail --location --retry 3 --silent --show-error https://avicommons.org/2025.json -o "$dest/avicommons-2025.json.tmp"
node - "$dest/avicommons-2025.json.tmp" <<'NODE'
const fs=require('node:fs'),G=require('./guides.js'),rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!Array.isArray(rows)||rows.length<9000)throw Error('Incomplete Avicommons catalog');
const valid=rows.map(G.normalize).filter(Boolean);
if(valid.length<10000)throw Error('Unexpected Avicommons schema or licensing: '+valid.length+' valid of '+rows.length+'; sample '+JSON.stringify(rows[0]));
const turnstone=valid.find(r=>r.code==='rudtur'&&r.sciName==='Arenaria interpres');if(!turnstone)throw Error('Ruddy Turnstone missing from validated catalog');
console.log('Avicommons catalog: '+valid.length+' licensed images; sample '+JSON.stringify(valid[0]));
NODE
mv "$dest/avicommons-2025.json.tmp" "$dest/avicommons-2025.json"
