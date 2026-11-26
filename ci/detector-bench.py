"""Offline YOLOX comparison; pass one or more local photos (never uploaded).
Install: pip install numpy pillow onnxruntime
Weights: official 0.1.1rc0 release, in directory specified by --models.
"""
import argparse, json, math, time
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort

MODELS = {"nano": (416, "yolox_nano.onnx"), "tiny": (416, "yolox_tiny.onnx"), "s": (640, "yolox_s.onnx")}
POLICIES = {
    "current": (.20, .45, None),
    "confidence30": (.30, .45, None),
    "confidence40": (.40, .45, None),
    "nms35": (.20, .35, None),
    "containment85": (.20, .45, .85),
    "confidence30_containment85": (.30, .45, .85),
}
def raw(session, image, tile, size):
    x,y,w,h=tile
    scale=min(size/w,size/h)
    canvas=Image.new("RGB",(size,size),(114,114,114))
    canvas.paste(image.crop((x,y,x+w,y+h)).resize((max(1,int(w*scale)),max(1,int(h*scale))),Image.Resampling.BILINEAR),(0,0))
    inp=np.ascontiguousarray(np.asarray(canvas,dtype=np.float32)[:,:,::-1].transpose(2,0,1)[None])
    start=time.perf_counter()
    o=session.run(None,{session.get_inputs()[0].name:inp})
    elapsed=(time.perf_counter()-start)*1000
    strides=np.concatenate([np.full((size//s)**2,s) for s in (8,16,32)])
    grid=np.concatenate([np.stack(np.meshgrid(np.arange(size//s),np.arange(size//s)),axis=-1).reshape(-1,2) for s in (8,16,32)])
    rows=next((a.reshape(-1,85) for a in o if a.size==len(strides)*85),None)
    if rows is None: raise ValueError("Unexpected detector output")
    score=rows[:,4]*rows[:,19]
    boxes=[]
    for i in np.flatnonzero(np.isfinite(score)&(score>=.10)&(score<=1)):
        center=(rows[i,:2]+grid[i])*strides[i]/scale
        extent=np.exp(rows[i,2:4])*strides[i]/scale
        lo=np.maximum(0,center-extent/2)
        hi=np.minimum([w,h],center+extent/2)
        if not np.isfinite([*lo,*hi]).all() or np.any(hi<=lo): continue
        boxes.append({"xyxy":[float(lo[0]+x),float(lo[1]+y),float(hi[0]+x),float(hi[1]+y)],"score":float(score[i])})
    return boxes,elapsed
def overlap(a,b):
    ax,ay,ar,ab=a["xyxy"];bx,by,br,bb=b["xyxy"]
    inter=max(0,min(ar,br)-max(ax,bx))*max(0,min(ab,bb)-max(ay,by))
    aa=(ar-ax)*(ab-ay);ba=(br-bx)*(bb-by)
    return inter/(aa+ba-inter),inter/min(aa,ba)
def suppress(hits,policy):
    cutoff,iou,contain=policy
    out=[]
    for h in sorted(hits,key=lambda h:-h["score"]):
        if h["score"]<cutoff: continue
        duplicate=False
        for k in out:
            u,c=overlap(h,k)
            if u>iou or (contain is not None and c>=contain):
                duplicate=True;break
        if not duplicate: out.append(h)
    return out
def tiles(w,h):
    tw,th=math.ceil(.6*w),math.ceil(.6*h)
    return [(0,0,tw,th),(w-tw,0,tw,th),(0,h-th,tw,th),(w-tw,h-th,tw,th)]
def evaluate(session,image,size):
    w,h=image.size
    full,elapsed=raw(session,image,(0,0,w,h),size)
    tile_data=None
    results={}
    for name,policy in POLICIES.items():
        hits=suppress(full,policy); tiled=False; ms=elapsed
        if not hits and max(w,h)>832:
            if tile_data is None: tile_data=[raw(session,image,t,size) for t in tiles(w,h)]
            hits=suppress([h for candidates,_ in tile_data for h in suppress(candidates,policy)],policy)
            ms+=sum(t for _,t in tile_data);tiled=True
        results[name]={"count":len(hits),"boxes":hits,"tiled":tiled,"inference_ms":round(ms,1)}
    return results
def main():
    p=argparse.ArgumentParser();p.add_argument("--models",type=Path,required=True);p.add_argument("--output",type=Path,default=Path("detector-results.json"));p.add_argument("photos",type=Path,nargs="+");a=p.parse_args()
    output={}
    for name,(size,filename) in MODELS.items():
        path=a.models/filename
        options=ort.SessionOptions();options.intra_op_num_threads=1
        session=ort.InferenceSession(str(path),sess_options=options,providers=["CPUExecutionProvider"])
        # Warm-up, so first-photo timings don't include session initialization.
        session.run(None,{session.get_inputs()[0].name:np.zeros((1,3,size,size),dtype=np.float32)})
        result={}
        for photo in a.photos:
            with Image.open(photo) as img: image=ImageOps.exif_transpose(img).convert("RGB")
            result[photo.name]=evaluate(session,image,size)
            print(name,photo.name, " | ".join(f"{k}: {v['count']} ({','.join(format(b['score'],'.3f') for b in v['boxes'])})" for k,v in result[photo.name].items()),flush=True)
            print("DETAIL",name,photo.name,json.dumps(result[photo.name]["current"]),flush=True)
        output[name]={"model_bytes":path.stat().st_size,"input_size":size,"photos":result}
    a.output.write_text(json.dumps(output,indent=2))
if __name__=="__main__": main()
