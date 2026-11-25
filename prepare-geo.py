"""Inspect the pinned model's actual output graph and produce a CPU reference."""
import json, pathlib, sys
import numpy as np
import onnx
from onnx import helper, TensorProto
import onnxruntime as ort
path=pathlib.Path(sys.argv[1])
m=onnx.load(path)
assert len(m.graph.output)==1, [o.name for o in m.graph.output]
o=m.graph.output[0]
nodes={name:n for n in m.graph.node for name in n.output}
name=o.name
chain=[]
while name in nodes:
    n=nodes[name]
    chain.append(n.op_type)
    if n.op_type not in {'Identity','Cast','Gather','GatherElements','Slice','Reshape','Squeeze','Unsqueeze','Transpose','Flatten'}:
        break
    name=n.input[0]
print('Output:',o.name,'type:',o.type.tensor_type.elem_type,'terminal chain:',chain,flush=True)
assert chain, 'No output producer'
# Preserve baked-in probabilities. Only add activation when the output graph
# identifies a linear classifier. Never infer activation from sample ranges.
last=chain[-1]
if last in {'Gemm','MatMul','Add'}:
    old=o.name
    new=old+'_flock_probability'
    m.graph.node.append(helper.make_node('Sigmoid',[old],[new],name='FlockOccurrenceSigmoid'))
    o.name=new
    print('Added sigmoid to linear output',flush=True)
elif last=='Sigmoid':
    print('Sigmoid already present',flush=True)
else:
    raise ValueError('Unrecognized output activation: '+str(chain))
if o.type.tensor_type.elem_type!=TensorProto.FLOAT:
    old=o.name
    new=old+'_flock_float'
    m.graph.node.append(helper.make_node('Cast',[old],[new],to=TensorProto.FLOAT))
    o.name=new
    o.type.tensor_type.elem_type=TensorProto.FLOAT
onnx.checker.check_model(m)
onnx.save(m,path)
s=ort.InferenceSession(str(path),providers=['CPUExecutionProvider'])
vectors=[]
for x in [[10.5,-61.5,44],[42.5,-76.45,20],[42.5,-76.45,2]]:
    p=s.run(None,{s.get_inputs()[0].name:np.array([x],dtype=np.float32)})[0].reshape(-1)
    print('CPU',x,'min/max',float(np.min(p)),float(np.max(p)),'nonfinite',int((~np.isfinite(p)).sum()),flush=True)
    assert len(p)==14057 and np.isfinite(p).all() and (p>=-1e-6).all() and (p<=1+1e-6).all()
    vectors.append(np.clip(p,0,1).tolist())
pathlib.Path(sys.argv[2]).write_text(json.dumps(vectors,separators=(',',':')))
