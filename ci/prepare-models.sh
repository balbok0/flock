#!/usr/bin/env bash
set -euo pipefail
root="$(pwd)"
out="$root/.ci-models"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out/site/models" "$out/site/vendor" "$out/fixtures"
cd "$out/site/models"
base=https://zenodo.org/records/24362980/files
download(){ curl --fail --location --retry 4 --max-time 600 --silent --show-error "$1" -o "$2"; }
pids=()
download "$base/BirdNET%2B_V3.0_Global_12K_FP16_pruned.onnx?download=1" birdnet.onnx & pids+=("$!")
download "$base/BirdNET%2B_V3.0_Global_12K_Labels.csv?download=1" birdnet.csv & pids+=("$!")
download "$base/MODEL_LICENSE.txt?download=1" MODEL_LICENSE.txt & pids+=("$!")
download "$base/ACCEPTABLE_USE.txt?download=1" ACCEPTABLE_USE.txt & pids+=("$!")
download "$base/BirdNET%2B_Geomodel_V3.0.5_Global_14K.zip?download=1" "$tmp/geo.zip" & pids+=("$!")
download 'https://cdn.jsdelivr.net/npm/exifreader@4.52.0/dist/exif-reader.js' "$out/site/vendor/exif-reader.js" & pids+=("$!")
download 'https://cdn.jsdelivr.net/npm/exifreader@4.52.0/LICENSE' "$out/site/vendor/ExifReader-LICENSE" & pids+=("$!")
download 'https://heic.fyi/samples/exif-gps-date.heic' "$out/fixtures/exif-gps-date.heic" & pids+=("$!")
download 'https://huggingface.co/johnlian/WingCLIP-0.3/resolve/main/labels.json' "$out/fixtures/wing-labels.json" & pids+=("$!")
failed=0
for pid in "${pids[@]}"; do wait "$pid" || failed=1; done
test "$failed" = 0
printf '%s\n' '6b42d8905f25f856fb8ad91544138914  birdnet.onnx' 'bb25847af8a581e1382081382f01e762  birdnet.csv' '77b299ba50d3119cd28c5a2b6fc0ff4b  MODEL_LICENSE.txt' '92f52349d7a08f74167f096702bac26a  ACCEPTABLE_USE.txt' | md5sum -c -
echo "d30b7f51ad301889ab193a384c72f1a1  $tmp/geo.zip" | md5sum -c -
echo "01fd9fa28d09885d8482d01a5b36d88dc89fde3b7cfeaca50b70f8314d2c63d1  $out/fixtures/exif-gps-date.heic" | sha256sum -c -
python "$root/extract-geo.py" "$tmp/geo.zip" "$out/site/models"
python "$root/prepare-geo.py" "$out/site/models/geo-v305-fp32.onnx" "$out/fixtures/geo-reference.json"
printf '%s\n' 'BirdNET+ V3.0.1 by Mario Lasseck et al. https://doi.org/10.5281/zenodo.24362980' > NOTICE.txt
cd "$out"
find site fixtures -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
