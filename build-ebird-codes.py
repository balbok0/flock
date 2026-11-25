"""Compile the official eBird region workbook into an offline crosswalk."""
import json,re,sys,unicodedata
from pathlib import Path
from openpyxl import load_workbook
def txt(v):return str(v).strip() if v is not None else ''
def norm(s):return ''.join(c for c in unicodedata.normalize('NFKD',txt(s).casefold()) if c.isalnum() and not unicodedata.combining(c))
def code(v):return txt(v).upper()
cr=re.compile(r'^[A-Z]{2}$')
sr=re.compile(r'^([A-Z]{2})-([A-Z0-9]{1,3})$')
countries={};states={}
def put(c,s,n=''):
    if cr.fullmatch(c) and re.fullmatch(r'[A-Z0-9]{1,3}',s):
        k=c+'-'+s
        if k not in states or not states[k]:states[k]=n
def col(h,names):return next((i for i,v in enumerate(h) if v in names),None)
for sheet in load_workbook(sys.argv[1],read_only=True,data_only=True):
    print('Sheet:',sheet.title,flush=True)
    header=None
    for raw in sheet.iter_rows(values_only=True):
        row=[txt(v) for v in raw];h=[norm(v) for v in row]
        c=col(h,{'countrycode','countryid','countryiso','countryisocode','countryabbreviation','countryabbrev'})
        cn=col(h,{'country','countryname','countryenglishname'})
        sc=col(h,{'statecode','provincecode','stateprovincecode','subnational1code','subnational1id','admin1code','stateprovinceabbreviation','stateprovinceabbrev'})
        sn=col(h,{'state','province','stateprovince','stateprovincename','statename','provincename','subnational1','subnational1name','admin1name'})
        rc=col(h,{'regioncode','code','regionid','ebirdregioncode'})
        rn=col(h,{'region','name','regionname'})
        if c is not None or sc is not None or rc is not None:
            header=(c,cn,sc,sn,rc,rn);print('Header:',row,flush=True);continue
        def at(i):return row[i] if i is not None and i<len(row) else ''
        if header:
            c,cn,sc,sn,rc,rn=header
            cc=code(at(c));st=code(at(sc));reg=code(at(rc))
            if cr.fullmatch(cc):countries.setdefault(cc,at(cn))
            if cr.fullmatch(reg):countries.setdefault(reg,at(rn))
            for full,name in [(st,at(sn)),(reg,at(rn) or at(sn))]:
                m=sr.fullmatch(full)
                if m:put(*m.groups(),name)
            if cr.fullmatch(cc) and st and not sr.fullmatch(st):put(cc,st,at(sn))
        for i,v in enumerate(row):
            m=sr.fullmatch(code(v))
            if m:put(*m.groups(),next((x for x in row[i+1:] if x and not re.fullmatch(r'[A-Z0-9-]{1,12}',x)),''))
        # Country-only tables may have headers such as ISO2 rather than Country Code.
        if 'countr' in sheet.title.lower() and not 'state' in sheet.title.lower() and not 'province' in sheet.title.lower():
            for i,v in enumerate(row):
                if cr.fullmatch(v) and len(row)<=10:
                    name=next((x for x in row if len(x)>3 and not sr.fullmatch(x)), '')
                    if name:countries.setdefault(v,name)
for s in states:countries.setdefault(s[:2],'')
assert {'TT','US','CA','PL'}<=countries.keys(),list(countries)[:30]
assert {'US-CA','CA-ON','AU-QLD','BR-SP'}<=states.keys(),list(states)[:30]
assert len(countries)>180 and len(states)>2000,(len(countries),len(states))
crosswalk={}
for r in json.loads(Path(sys.argv[2]).read_text()):
    cc=r['country']
    if cc not in countries:continue
    suffix=''
    if r['parent']:
        if r['id'] in states:suffix=r['id'][3:]
        else:
            matches=[s for s,n in states.items() if s.startswith(cc+'-') and norm(n) and norm(n)==norm(r['name'])]
            if len(matches)==1:suffix=matches[0][3:]
    crosswalk[r['id']]={'country':cc,'region':suffix}
Path(sys.argv[3]).write_text(json.dumps({'source':'eBird regions and region codes, 18 Apr 2023','countries':countries,'states':states,'crosswalk':crosswalk},ensure_ascii=False,separators=(',',':')))
print('eBird codes:',len(countries),'countries',len(states),'states',sum(bool(v['region']) for v in crosswalk.values()),'mapped subdivisions')
