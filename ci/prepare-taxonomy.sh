#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p prebuilt/taxonomy
api='https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=csv&locale=en&version=2026'
official='https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2026/11/eBird_Taxonomy_v2026-october-2026.csv'
xlsx='https://www.birds.cornell.edu/clementschecklist/wp-content/uploads/2026/11/eBird_Taxonomy_v2026-october-2026.xlsx'
download(){ curl --fail --location --retry 2 --connect-timeout 10 --max-time 90 --silent --show-error --user-agent 'Hoot birding (https://github.com/balbok0/flock)' "$1" -o "$2"; }
compile(){ python ci/build-taxonomy.py "$tmp/source.csv" "$tmp/taxonomy.json" "$1"; }
if download "$official" "$tmp/source.csv" && compile "$official"; then
  echo "Using official Cornell v2026 CSV"
elif download 'https://api.ebird.org/v2/ref/taxonomy/versions' "$tmp/versions.json" && python -c 'import json,sys; v=json.load(open(sys.argv[1])); assert any(float(x.get("authorityVer",0))==2026 and x.get("latest") for x in v),v' "$tmp/versions.json" && download "$api" "$tmp/source.csv" && compile "$api"; then
  echo "Using official eBird API CSV, verified latest version is 2026"
elif download "$xlsx" "$tmp/source.xlsx" && python -c 'import openpyxl,csv,sys; w=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True); f=open(sys.argv[2],"w",encoding="utf-8",newline=""); csv.writer(f).writerows(w.active.values); f.close()' "$tmp/source.xlsx" "$tmp/source.csv" && compile "$xlsx"; then
  echo "Using official Cornell v2026 workbook converted to CSV"
else
  echo "::error::Official eBird taxonomy downloads failed. Supply the v2026 CSV in prebuilt/taxonomy/source.csv."
  exit 1
fi
cp "$tmp/source.csv" prebuilt/taxonomy/source.csv
cp "$tmp/taxonomy.json" prebuilt/taxonomy/taxonomy.json
(cd prebuilt/taxonomy && sha256sum source.csv taxonomy.json > SHA256SUMS)
