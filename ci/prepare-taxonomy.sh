#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
mkdir -p prebuilt/taxonomy
curl --fail --location --retry 3 --silent --show-error 'https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2026/11/eBird_Taxonomy_v2026-october-2026.csv' -o "$tmp"
python ci/build-taxonomy.py "$tmp" prebuilt/taxonomy/taxonomy.json
(cd prebuilt/taxonomy && sha256sum taxonomy.json > SHA256SUMS)
