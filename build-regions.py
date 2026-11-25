"""Create a compact, offline birding-region index from Natural Earth v5.1.2."""
import json, math, sys
from shapely.geometry import shape, Point, mapping
from shapely import make_valid
from shapely.ops import unary_union
from pyproj import Geod
from shapely.geometry.polygon import orient
from pathlib import Path
geod=Geod(ellps='WGS84')
def props(f):return {k.lower():v for k,v in f['properties'].items()}
def polygons(g):
    if g.geom_type=='Polygon':return [g]
    if hasattr(g,'geoms'):return [p for x in g.geoms for p in polygons(x)]
    return []
def area(g):
    return sum(abs(geod.geometry_area_perimeter(orient(p,sign=1))[0])/1e6 for p in polygons(g))
def rounded(v):
    if isinstance(v,(tuple,list)):return [rounded(x) for x in v]
    return round(v,4)
def sample(g,km):
    ps=sorted(polygons(g),key=area,reverse=True)
    points=[p.representative_point() for p in ps[:min(5,len(ps))]]
    target=min(16,max(3,math.ceil(km/50000)+3))
    candidates=[]
    for p in ps[:20]:
        x0,y0,x1,y1=p.bounds
        for i in range(12):
            for j in range(12):
                q=Point(x0+(i+.5)*(x1-x0)/12,y0+(j+.5)*(y1-y0)/12)
                if p.covers(q):candidates.append(q)
    def dist(a,b):
        dx=abs(a.x-b.x);dx=min(dx,360-dx)
        return (dx*math.cos(math.radians((a.y+b.y)/2)))**2+(a.y-b.y)**2
    while candidates and len(points)<target:
        p=max(candidates,key=lambda q:min(dist(q,r) for r in points))
        if min(dist(p,r) for r in points)<1e-8:break
        points.append(p);candidates.remove(p)
    return [[round(p.y,4),round(p.x,4)] for p in points]
def record(id,name,country,parent,g,km):
    g=unary_union(polygons(make_valid(g)))
    if g.is_empty:return None
    p=sample(g,km)
    simplified=g.simplify(.025 if km>5000 else .006,preserve_topology=True)
    rings=[]
    for poly in polygons(simplified):
        rings.append([rounded(poly.exterior.coords[:])]+[rounded(r.coords[:]) for r in poly.interiors])
    return {'id':id,'name':name,'country':country,'parent':parent,'area':round(km),'bounds':rounded(g.bounds),'polygons':rings,'points':p}
countries={}
for f in json.load(open(sys.argv[1]))['features']:
    p=props(f); code=p.get('iso_a2_eh') or p.get('iso_a2')
    if not isinstance(code,str) or len(code)!=2 or not code.isalpha():continue
    name=p.get('name_long') or p.get('admin') or p.get('name')
    g=shape(f['geometry'])
    if code in countries:
        old=countries[code];g=unary_union([old[1],g]);name=old[0]
    countries[code]=(name,g)
out=[]
large=set()
for code,(name,g) in sorted(countries.items()):
    km=area(g)
    r=record(code,name,code,None,g,km)
    if r:out.append(r)
    if km>500000:large.add(code)
for f in json.load(open(sys.argv[2]))['features']:
    p=props(f);code=p.get('iso_3166_2') or ''; parent=code.split('-')[0]
    if parent not in large or '-' not in code:continue
    g=shape(f['geometry']);name=p.get('name_en') or p.get('name')
    if not name:continue
    r=record(code,name,parent,parent,g,area(g))
    if r:out.append(r)
# Ignore duplicate administrative identifiers rather than silently overwrite geometry.
ids=[r['id'] for r in out]; dup={i for i in ids if ids.count(i)>1}
out=[r for r in out if r['id'] not in dup or r['parent'] is None]
assert any(r['id']=='TT' for r in out)
assert any(r['id']=='US-CA' for r in out)
assert len([r for r in out if r['parent'] is None])>170
assert len([r for r in out if r['parent']])>300
Path(sys.argv[3]).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print('Region index:',len(out),'regions;',len(large),'large countries')
