#!/usr/bin/env bash
set -euo pipefail
models="$1"
regions="$2"
(cd "$models" && sha256sum -c SHA256SUMS)
(cd "$regions" && sha256sum -c SHA256SUMS)
rm -rf _site
mkdir -p _site
cp -a "$models/site/." "$regions/site/." _site/
cp index.html style.css app.js ml.js merlin.js metadata.js geo.js vision.js regions.js ui.js sw.js manifest.webmanifest icon.svg recover.html version.json LICENSE.txt THIRD_PARTY_NOTICES.md _site/
for f in *.js *.cjs; do node --check "$f"; done
node library-tests.cjs
node geo-tests.cjs
node vision-tests.cjs
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
node geo-smoke.cjs /tmp/hoot-ort/node_modules/onnxruntime-web "$(pwd)/_site/models" "$models/fixtures/geo-reference.json"
node geo-semantic.cjs /tmp/hoot-ort/node_modules/onnxruntime-web "$(pwd)/_site" "$models/fixtures/wing-labels.json"
