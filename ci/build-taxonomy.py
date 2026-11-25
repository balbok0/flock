"""Compile Cornell's official 2026 eBird taxonomy for offline name selection."""
import csv,json,re,sys
from pathlib import Path
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
with open(sys.argv[1],encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f)
    names={norm(k):k for k in reader.fieldnames if k}
    print('Taxonomy headers:',reader.fieldnames)
    def col(*keys):
        for k in keys:
            if k in names:return names[k]
        raise ValueError('Missing required taxonomy column: '+str(keys))
    code=col('speciescode','taxoncode')
    common=col('primarycomname','comname','commonname','englishname','english')
    scientific=col('sciname','scientificname')
    cat=col('category','taxoncategory')
    rows=[]
    for r in reader:
        a,b,c,d=[(r[k] or '').strip() for k in (code,common,scientific,cat)]
        if a and b and c and d and d.lower()!='subspecies':rows.append([a,b,c,d.lower()])
assert len(rows)>10000,len(rows)
assert len({r[0] for r in rows})==len(rows),'Duplicate species codes'
assert any(r[1]=='Rufous-vented Chachalaca' and r[2]=='Ortalis ruficauda' for r in rows),'Missing chachalaca'
Path(sys.argv[2]).write_text(json.dumps({'version':'2026','source':'https://www.birds.cornell.edu/clementschecklist/download/','taxa':rows},ensure_ascii=False,separators=(',',':')))
print('Compiled eBird taxonomy:',len(rows),'reportable taxa')
