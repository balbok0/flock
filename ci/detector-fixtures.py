"""Additional licensed motmot detector fixtures; public photos only."""
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from PIL import Image, ImageOps
import io, hashlib, json
fixtures=[
 {"name":"motmot-single.jpg","file":"Momotus bahamensis, Plymouth, Tobago.jpg","author":"The Lilac Breasted Roller","license":"CC BY 2.0","license_url":"https://creativecommons.org/licenses/by/2.0/","expected_birds":1},
 {"name":"motmot-pair.jpg","file":"Trinidad motmots (Momotus bahamensis).jpg","author":"Charles J. Sharp","license":"CC BY-SA 4.0","license_url":"https://creativecommons.org/licenses/by-sa/4.0/","expected_birds":2},
]
for f in fixtures:
    name=f["file"].replace(" ","_"); h=hashlib.md5(name.encode()).hexdigest()
    f["source"]="https://commons.wikimedia.org/wiki/File:"+quote(name)
    f["url"]=f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{quote(name)}"
    with urlopen(Request(f["url"],headers={"User-Agent":"HootDetectorQA/1.0 (https://github.com/balbok0/flock; licensed evaluation images)"}),timeout=30) as r: raw=r.read()
    f["sha256"]=hashlib.sha256(raw).hexdigest()
    with Image.open(io.BytesIO(raw)) as im:
        img=ImageOps.exif_transpose(im).convert("RGB"); img.thumbnail((1800,1800)); img.save(Path(".qa-photos")/f["name"],quality=95)
    print(f["name"],f["source"],f["author"],f["license"],flush=True)
Path("motmot-attribution.json").write_text(json.dumps(fixtures,indent=2))
