#!/usr/bin/env bash
set -euo pipefail
root="$(pwd)"
out="$root/.ci-regions"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out/site"
ne=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson
curl --fail --location --retry 3 --silent --show-error "$ne/ne_10m_admin_0_countries.geojson" -o "$tmp/countries.geojson" &
a=$!
curl --fail --location --retry 3 --silent --show-error "$ne/ne_10m_admin_1_states_provinces.geojson" -o "$tmp/subdivisions.geojson" &
b=$!
curl --fail --location --retry 3 --silent --show-error 'https://support.ebird.org/helpdesk/attachments/48293281603' -o "$tmp/ebird-regions.xlsx" &
c=$!
failed=0
wait "$a" || failed=1
wait "$b" || failed=1
wait "$c" || failed=1
test "$failed" = 0
python "$root/build-regions.py" "$tmp/countries.geojson" "$tmp/subdivisions.geojson" "$out/site/regions.json"
python "$root/build-ebird-codes.py" "$tmp/ebird-regions.xlsx" "$out/site/regions.json" "$out/site/ebird-codes.json"
cd "$out"
sha256sum site/regions.json site/ebird-codes.json > SHA256SUMS
