"""Download attributed public bird photos into a disposable QA library.

The birds and source locations are real; the test capture times deliberately
simulate a burst and a later encounter. No test observations go to eBird.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import io
import json
import time
from PIL import Image, ImageOps

OUT = Path(".qa-photos")
OUT.mkdir(exist_ok=True)
fixtures = [
    dict(name="chachalaca-1.jpg", file="Ortalis_ruficauda_188205388.jpg",
         species="Rufous-vented Chachalaca", author="Stephanie Tran",
         license="CC BY 4.0", license_url="https://creativecommons.org/licenses/by/4.0/",
         lat=11.3038160766, lon=-60.5320363825, date="2022-04-13",
         test_time="2026:11:24 08:00:00"),
    dict(name="chachalaca-2.jpg", file="Ortalis_ruficauda_249416554.jpg",
         species="Rufous-vented Chachalaca", author="Dan Harville",
         license="CC BY-SA 4.0", license_url="https://creativecommons.org/licenses/by-sa/4.0/",
         lat=11.302359655, lon=-60.53317849, date="2007-12-04",
         test_time="2026:11:24 08:00:04"),
    dict(name="tanager.jpg", file="Thraupis_episcopus_-Asa_Wright_Nature_Centre,_Northern_Range,_Trinidad,_Trinidad_and_Tobago-8.jpg",
         species="Blue-gray Tanager", author="Steve Garvie",
         license="CC BY-SA 2.0", license_url="https://creativecommons.org/licenses/by-sa/2.0/",
         lat=10.724841, lon=-61.312877, date="2006-05-19",
         test_time="2026:11:24 08:10:00")
]
from urllib.parse import quote
for f in fixtures:
    name = f["file"]
    h = hashlib.md5(name.encode()).hexdigest()
    f["source"] = "https://commons.wikimedia.org/wiki/File:" + quote(name)
    f["url"] = f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{quote(name)}"
    raw = None
    for attempt in range(3):
        try:
            with urlopen(Request(f["url"], headers={"User-Agent":"HootBrowserQA/1.0 (https://github.com/balbok0/flock; public licensed test fixtures)"}), timeout=30) as r:
                raw = r.read()
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    f["original_sha256"] = hashlib.sha256(raw).hexdigest()
    with Image.open(io.BytesIO(raw)) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((1800,1800))
        # Remove GPS and replace EXIF dates for an explicit country-only test.
        exif = Image.Exif()
        exif[306] = f["test_time"]
        exif[36867] = f["test_time"]
        img.save(OUT / f["name"], quality=92, exif=exif)
    print(f["name"], f["species"], f["source"], f["license"], flush=True)
(OUT / "attribution.json").write_text(json.dumps(fixtures, indent=2))
