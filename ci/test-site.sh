#!/usr/bin/env bash
set -euo pipefail
models="$1"
regions="$2"
(cd "$models" && sha256sum -c SHA256SUMS)
(cd "$regions" && sha256sum -c SHA256SUMS)
rm -rf _site
mkdir -p _site
cp -a "$models/site/." "$regions/site/." _site/
cp index.html style.css review-tools.js review-extras.js app.js ml.js merlin.js metadata.js geo.js vision.js regions.js taxonomy.js ui.js sw.js manifest.webmanifest icon.svg recover.html version.json LICENSE.txt THIRD_PARTY_NOTICES.md _site/
cp prebuilt/taxonomy/taxonomy.json _site/
(cd prebuilt/taxonomy && sha256sum -c SHA256SUMS)
node taxonomy-tests.cjs _site/taxonomy.json
for f in *.js *.cjs; do node --check "$f"; done
node library-tests.cjs
node geo-tests.cjs
node vision-tests.cjs
node review-tools-tests.cjs
# Same-origin detector asset; verify pinned upstream model bytes before publishing.
mkdir -p _site/models
curl --fail --location --retry 3 --silent --show-error https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx -o _site/models/yolox-nano-0.1.1rc0.onnx
echo 'c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d  _site/models/yolox-nano-0.1.1rc0.onnx' | sha256sum -c -
fixture="$models/fixtures/exif-gps-date.heic"
if [[ ! -f "$fixture" ]]; then
  fixture="$(mktemp)"
  trap 'rm -f "$fixture"' EXIT
  curl --fail --location --retry 3 --silent --show-error https://heic.fyi/samples/exif-gps-date.heic -o "$fixture"
fi
echo "01fd9fa28d09885d8482d01a5b36d88dc89fde3b7cfeaca50b70f8314d2c63d1  $fixture" | sha256sum -c -
TZ=UTC node tests.cjs "$fixture"
node regions-tests.cjs _site/regions.json _site/ebird-codes.json
npm install --prefix /tmp/hoot-ort --no-audit --no-fund onnxruntime-web@1.22.0
node -e 'const ort=require(process.argv[1]),fs=require("fs");(async()=>{const s=await ort.InferenceSession.create(fs.readFileSync("_site/models/yolox-nano-0.1.1rc0.onnx"),{executionProviders:["wasm"]});const o=await s.run({[s.inputNames[0]]:new ort.Tensor("float32",new Float32Array(3*416*416),[1,3,416,416])});if(!Object.values(o).some(t=>t.dims.join(",")==="1,3549,85"&&t.data.every(Number.isFinite)))throw Error("Detector output mismatch");await s.release();console.log("YOLOX WASM smoke passed")})().catch(e=>{console.error(e);process.exitCode=1})' /tmp/hoot-ort/node_modules/onnxruntime-web
node geo-smoke.cjs /tmp/hoot-ort/node_modules/onnxruntime-web "$(pwd)/_site/models" "$models/fixtures/geo-reference.json"
node geo-semantic.cjs /tmp/hoot-ort/node_modules/onnxruntime-web "$(pwd)/_site" "$models/fixtures/wing-labels.json"
