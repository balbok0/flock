#!/usr/bin/env bash
set -euo pipefail
# Only called from the manual asset preparation workflow after prepared asset checksums pass.
mkdir -p prebuilt/models prebuilt/regions
if [[ "$MODELS_VENDORED" != true ]]; then
  rm -rf prebuilt/models
  cp -a .ci-models prebuilt/models
  # The upstream HEIC test image is not necessary in repository history.
  rm -f prebuilt/models/fixtures/exif-gps-date.heic
  (cd prebuilt/models && find site fixtures -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
  printf '%s\n' "$MODEL_KEY" > prebuilt/models/INPUTS
fi
if [[ "$REGIONS_VENDORED" != true ]]; then
  rm -rf prebuilt/regions
  cp -a .ci-regions prebuilt/regions
  printf '%s\n' "$REGION_KEY" > prebuilt/regions/INPUTS
fi
# GitHub rejects individual files over 100 MiB. Fail before pushing.
oversized="$(find prebuilt -type f -size +104857599c -print)"
if [[ -n "$oversized" ]]; then printf 'Oversized prebuilt assets:\n%s\n' "$oversized" >&2; exit 1; fi
(cd prebuilt/models && sha256sum -c SHA256SUMS)
(cd prebuilt/regions && sha256sum -c SHA256SUMS)
du -sh prebuilt/models prebuilt/regions
rm -f prebuilt/BOOTSTRAP
git add -A -- prebuilt
if git diff --cached --quiet; then exit 0; fi
git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit -m 'Vendor verified model assets and geographic tables'
# Non-force push: if main moved, do not overwrite someone else's work.
git push origin HEAD:refs/heads/main
