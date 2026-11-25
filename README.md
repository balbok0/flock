# Flock PWA v0.1

Static mobile prototype: https://balbok0.github.io/flock/. Open in Safari, then Share > Add to Home Screen. Open online once to cache the app shell.

Implemented: batch photo/audio import, JPEG EXIF capture time and GPS when present, editable times, foreground microphone recording, GPS, IndexedDB media storage, time-based photo grouping, imported timestamped audio detections, manual species confirmation and count, CSV review draft and JSON metadata export. No media is uploaded.

Not implemented: automatic acoustic or visual inference, Merlin proprietary metadata parsing, HEIC EXIF parsing, visual similarity clustering, audio-only encounters, eBird submission format, media backup/restore. Missing timestamps fall back to file modification time; EXIF timestamps without timezone use device timezone. Imported audio timestamps must be checked. Nearby sound candidates are not proof of the same individual. iOS may evict browser storage; keep originals. Large imports may exceed storage or memory quotas.

Detection JSON is an array of objects with species, start, end (ISO 8601 with timezone), confidence (0–1). Convert BirdNET output into this format first.

No build step. Safari, installation and offline behavior not yet tested on an actual device.

## v0.2 experimental offline inference
BirdNET+ 3.0.1 pruned ONNX (Zenodo 24362980, Apache-2.0 + acceptable use), 32 kHz mono 3 s windows, no sigmoid (model outputs scores), bird labels only. WingCLIP 0.3 INT8 (CC BY-NC 4.0, derived from BioCLIP 2), 224 px CLIP preprocessing, average distinct-image embeddings, cosine ranking with modest nearby audio bonus. ONNX Runtime Web 1.22.0 WASM, one thread. Model cache separate from app shell. Model downloads and inference self-tests are explicit; no server inference. iOS memory/FP16 support, downloads/CORS, real prediction accuracy and offline operation are not yet device tested. Manual import fallback for model files. Model packs may be evicted. Merlin WAV BEXT and metadata chunks, MP4 moov text, candidate dates and ISO6709 location extraction, manual time correction and species confirmation. No guaranteed proprietary Merlin result decoding or direct iOS share target. Audio-only review records presence with unknown count X. CSV remains a review draft; not eBird-ready; cross-recording duplicate review needed. Sources: https://zenodo.org/records/24362980 and https://huggingface.co/johnlian/WingCLIP-0.3. WingCLIP weights noncommercial; do not use commercially without permission. BirdNET acceptable use: https://zenodo.org/records/24362980/files/ACCEPTABLE_USE.txt. No model weights redistributed in repository.

## v0.3
Fix WingCLIP external data filename (`wingclip_visual_int8.data`); add batch Run detections, import counts and progress, download byte/file progress, per-model cached/self-test status, inference progress, diagnostics, and consistent versioned service-worker shell. Existing IndexedDB and model cache retained. Device inference remains unverified.

## v0.4
BirdNET downloads try same-origin Pages assets first, then official Zenodo web and API endpoints. To enable same-origin assets, set Settings > Pages > Source to GitHub Actions and run Deploy Flock with local model assets. The workflow verifies upstream checksums and includes the model license and acceptable use. Existing model cache preserved. Manual model imports remain available.

## v0.5
Cached runtime JavaScript and module are loaded through local Blob URLs, and WASM is provided directly from Cache Storage as bytes. This avoids dependence on service-worker interception for runtime startup. Visible native photo/audio file inputs replace hidden label controls; picker events are logged, files copied to independent local Blob objects and persisted in IndexedDB. No network upload. Existing model cache and database are preserved. Actual Safari inference is still unverified.

## v0.6
Fix Emscripten relative WASM URL resolution when loaded from cached Blob URLs. The pinned runtime module uses an absolute base for import.meta.url and both mjs and wasm overrides are supplied explicitly alongside cached binary bytes. No model cache reset. Safari execution still requires verification.

## v0.7
Network-first navigation, cache-busting versioned shell files, fresh install requests with HTML version check, explicit update activation. Recovery page deletes only versioned Flock shell caches; no model or library deletion. Recovery navigation may be intercepted by older workers until updated.

## v0.9
ExifReader 4.52.0 bundled locally for HEIC/JPEG metadata; existing files re-read once, manual timestamps preserved. Filename timestamps support HHMM and HHMMSS. eBird Record Format uses capture wall time when available. CI includes a checksum-pinned HEIC GPS/date fixture from heic.fyi (CC0), synthetic WAV metadata and CSV assertions. No real Merlin exported WAV fixture or authenticated eBird import tested yet.

## v0.11
BirdNET+ Geomodel V3.0.5 (14,057 classes, FP32 for WASM compatibility) is shared by both classifiers, fetched automatically when trustworthy capture coordinates/date are available. Source https://doi.org/10.5281/zenodo.24362980 (Apache-2.0, accompanying acceptable-use terms). Audio can use a geotagged photo within 60 seconds of recording start, only when nearby locations agree within 1 km. Unknown taxonomy, missing metadata or model failures leave evidence scores unchanged. Audio candidate rank = raw confidence * (0.35 + 0.65 sqrt(occurrence)); vision rank = cosine + existing sound boost + 0.015 log(max(0.02,occurrence)); no geographic threshold, retain raw top vision alternative. These are heuristic ranking scores, not calibrated probabilities. CI verifies archive checksum, output shape and actual ONNX WASM inference at three locations/seasons. Existing model cache unchanged.

Geo deployment checks the actual ONNX terminal activation, adds sigmoid only to a linear output, ensures float32 output, and compares WASM against native CPU reference. Tiny floating point excursions are clipped; nonfinite or materially out-of-range scores fail deployment.

## v0.12
Birding regions are selected separately from exact observation GPS. Offline Natural Earth v5.1.2 public-domain boundary index auto-detects countries and first-level administrative areas for countries over 500,000 km². User can override with country or subdivision. A unique library region fills missing locations for ranking only. Mixed countries use file-specific regions, no guess for unlocated media. The model takes the maximum occurrence across up to 16 representative land points; missing trustworthy dates use four seasonal samples. These are sampled suitability estimates, not regional probabilities or complete checklists. No coordinate upload. Exact file GPS is preserved for eBird; inferred region is not used as exact location. Existing model cache unchanged.

## v0.13
Export maps each observation's actual GPS to country and first-level subdivision codes (ISO-style suffix, up to 3 characters), independently of birding-region override. For unmapped coordinates only, manually supplied fallback codes take precedence over the selected region. Small-country subdivisions may be blank. Boundary/code coverage is not an authoritative eBird crosswalk; authenticated import remains untested. Exact coordinates remain required.

## v0.14
Visible eBird fields mirror selected/inferred birding region. CI downloads eBird's official workbook linked by its spreadsheet import guide (attachment 48293281603, 18 Apr 2023), validates coverage, and bundles a crosswalk. Unmatched subdivisions use blank state codes. Actual GPS takes priority for individual records; validated fallback codes are optional. The workbook is a dated snapshot; authenticated import remains untested.
