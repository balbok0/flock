#!/usr/bin/env bash
set -euo pipefail
root="$(pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# The successful v0.16 deployment verified the pinned Zenodo release and region tables.
# Reuse only this immutable artifact; validate the archive digest and known source checksums.
artifact=14983001251
digest=46a08e4d839d420162fdc1bbee1abe17069b3644a021db0d9a190692410a9750
if ! curl --fail --location --retry 2 --silent --show-error -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' "$GITHUB_API_URL/repos/$GITHUB_REPOSITORY/actions/artifacts/$artifact/zip" -o "$tmp/pages.zip"; then
  echo 'Previous deployment artifact unavailable; use original upstream preparation.'
  exit 0
fi
if ! echo "$digest  $tmp/pages.zip" | sha256sum -c -; then
  echo 'Previous deployment artifact digest mismatch; use original upstream preparation.'
  exit 0
fi
unzip -q "$tmp/pages.zip" -d "$tmp"
mkdir "$tmp/site"
tar -xf "$tmp/artifact.tar" -C "$tmp/site"
mkdir -p .ci-models/site/models .ci-models/site/vendor .ci-models/fixtures .ci-regions/site
cp "$tmp/site/models/"{birdnet.onnx,birdnet.csv,MODEL_LICENSE.txt,ACCEPTABLE_USE.txt,NOTICE.txt,geo-v305-fp32.onnx,geo-v305-labels.json} .ci-models/site/models/
cp "$tmp/site/vendor/"{exif-reader.js,ExifReader-LICENSE} .ci-models/site/vendor/
cp "$tmp/site/"{regions.json,ebird-codes.json} .ci-regions/site/
(cd .ci-models/site/models && printf '%s\n' '6b42d8905f25f856fb8ad91544138914  birdnet.onnx' 'bb25847af8a581e1382081382f01e762  birdnet.csv' '77b299ba50d3119cd28c5a2b6fc0ff4b  MODEL_LICENSE.txt' '92f52349d7a08f74167f096702bac26a  ACCEPTABLE_USE.txt' | md5sum -c -)
# Preserve validated weights and output order. Add common names from exact matches in
# the pinned acoustic label table, and recreate the native CPU reference.
python ci/enrich-geo-labels.py .ci-models/site/models/geo-v305-labels.json .ci-models/site/models/birdnet.csv
python prepare-geo.py .ci-models/site/models/geo-v305-fp32.onnx .ci-models/fixtures/geo-reference.json
curl --fail --location --retry 3 --silent --show-error https://huggingface.co/johnlian/WingCLIP-0.3/resolve/main/labels.json -o .ci-models/fixtures/wing-labels.json
printf '%s\n' "Seeded from verified deployment artifact $artifact (SHA256 $digest). Geographic label common names enriched from exact acoustic-label matches." > .ci-models/fixtures/PROVENANCE.txt
(cd .ci-models && find site fixtures -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
(cd .ci-regions && sha256sum site/regions.json site/ebird-codes.json > SHA256SUMS)
