"""Enrich the previously verified geomodel labels from BirdNET+'s acoustic labels.
Only an exact scientific-name match with a unique common name is accepted.
This bootstrap fallback does not modify label order or model weights.
"""
import csv,json,sys
from pathlib import Path
path=Path(sys.argv[1])
labels=json.loads(path.read_text())
with open(sys.argv[2],encoding='utf-8-sig') as f:
    rows=list(csv.DictReader(f))
names={}
for r in rows:
    sci=r.get('scientific_name','').strip().casefold()
    common=r.get('common_name','').strip()
    if sci and common:names.setdefault(sci,set()).add(common)
for r in labels:
    matches=names.get(r['scientific'].strip().casefold(),set())
    if len(matches)==1 and not r.get('common'):r['common']=next(iter(matches))
assert len(labels)==14057
path.write_text(json.dumps(labels,ensure_ascii=False,separators=(',',':')))
print('Bootstrap geo common-name enrichment:',sum(bool(r.get('common')) for r in labels),len(labels))
