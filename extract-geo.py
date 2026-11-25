import csv, io, json, pathlib, zipfile, sys
z=zipfile.ZipFile(sys.argv[1])
out=pathlib.Path(sys.argv[2])
def one(suffix):
    matches=[n for n in z.namelist() if pathlib.PurePosixPath(n).name.lower().endswith(suffix.lower()) and not n.startswith('__MACOSX/')]
    if len(matches)!=1: raise ValueError(f'{suffix}: {matches}')
    return matches[0]
(out/'geo-v305-fp32.onnx').write_bytes(z.read(one('_FP32.onnx')))
rows=list(csv.DictReader(io.StringIO(z.read(one('_Labels.csv')).decode('utf-8-sig'))))
assert len(rows)==14057, len(rows)
def get(row,*names):
    norm={k.lower().strip().replace(' ','_'):v for k,v in row.items() if k}
    return next((norm[n].strip() for n in names if norm.get(n)), '')
labels=[]
for i,r in enumerate(rows):
    ix=get(r,'ix','index','geo_ix','class_index')
    if ix: assert int(ix)==i, (i,ix)
    sci=get(r,'scientific_name','scientific','sci_name','species')
    bid=get(r,'birdnet_id','birdnetid','id','species_code','code')
    assert sci, list(r)
    labels.append({'scientific':sci,'id':bid})
assert len({x['scientific'] for x in labels})>13000
(out/'geo-v305-labels.json').write_text(json.dumps(labels,ensure_ascii=False,separators=(',',':')))
print('Geomodel extracted:',len(labels),'labels')
