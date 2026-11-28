# Hoot

**Noncommercial • [CC BY-NC 4.0](LICENSE.txt)** for original project materials; third-party assets retain their upstream terms. [Third-party notices](THIRD_PARTY_NOTICES.md).

[Credits and references](#credits-and-references)

Live app: https://balbok0.github.io/flock/. Open in Safari, then Share > Add to Home Screen. Open online once to cache the app shell.

Implemented: batch photo/audio import, JPEG EXIF capture time and GPS when present, editable times, foreground microphone recording, GPS, IndexedDB media storage, time-based photo grouping, imported timestamped audio detections, manual species confirmation and count, CSV review draft and JSON metadata export. No media is uploaded.

Not implemented: automatic acoustic or visual inference, Merlin proprietary metadata parsing, HEIC EXIF parsing, visual similarity clustering, audio-only encounters, eBird submission format, media backup/restore. Missing timestamps fall back to file modification time; EXIF timestamps without timezone use device timezone. Imported audio timestamps must be checked. Nearby sound candidates are not proof of the same individual. iOS may evict browser storage; keep originals. Large imports may exceed storage or memory quotas.

Detection JSON is an array of objects with species, start, end (ISO 8601 with timezone), confidence (0–1). Convert BirdNET output into this format first.

No build step. Safari, installation and offline behavior not yet tested on an actual device.

## v0.2 experimental offline inference
BirdNET+ 3.0.1 pruned ONNX (Zenodo 24362980, Apache-2.0 + acceptable use), 32 kHz mono 3 s windows, no sigmoid (model outputs scores), bird labels only. WingCLIP 0.3 INT8 (CC BY-NC 4.0, derived from BioCLIP 2), 224 px CLIP preprocessing, average distinct-image embeddings, cosine ranking with modest nearby audio bonus. ONNX Runtime Web 1.22.0 WASM, one thread. Model cache separate from app shell. Model downloads and inference self-tests are explicit; no server inference. iOS memory/FP16 support, downloads/CORS, real prediction accuracy and offline operation are not yet device tested. Manual import fallback for model files. Model packs may be evicted. Merlin WAV BEXT and metadata chunks, MP4 moov text, candidate dates and ISO6709 location extraction, manual time correction and species confirmation. No guaranteed proprietary Merlin result decoding or direct iOS share target. Audio-only review records presence with unknown count X. CSV remains a review draft; not eBird-ready; cross-recording duplicate review needed. Sources: https://zenodo.org/records/24362980 and https://huggingface.co/johnlian/WingCLIP-0.3. WingCLIP weights noncommercial; do not use commercially without permission. BirdNET acceptable use: https://zenodo.org/records/24362980/files/ACCEPTABLE_USE.txt. No model weights redistributed in repository.

## v0.3
Fix WingCLIP external data filename (`wingclip_visual_int8.data`); add batch Run detections, import counts and progress, download byte/file progress, per-model cached/self-test status, inference progress, diagnostics, and consistent versioned service-worker shell. Existing IndexedDB and model cache retained. Device inference remains unverified.

## v0.4
BirdNET downloads try same-origin Pages assets first, then official Zenodo web and API endpoints. To enable same-origin assets, set Settings > Pages > Source to GitHub Actions and run Deploy Hoot with local model assets. The workflow verifies upstream checksums and includes the model license and acceptable use. Existing model cache preserved. Manual model imports remain available.

## v0.5
Cached runtime JavaScript and module are loaded through local Blob URLs, and WASM is provided directly from Cache Storage as bytes. This avoids dependence on service-worker interception for runtime startup. Visible native photo/audio file inputs replace hidden label controls; picker events are logged, files copied to independent local Blob objects and persisted in IndexedDB. No network upload. Existing model cache and database are preserved. Actual Safari inference is still unverified.

## v0.6
Fix Emscripten relative WASM URL resolution when loaded from cached Blob URLs. The pinned runtime module uses an absolute base for import.meta.url and both mjs and wasm overrides are supplied explicitly alongside cached binary bytes. No model cache reset. Safari execution still requires verification.

## v0.7
Network-first navigation, cache-busting versioned shell files, fresh install requests with HTML version check, explicit update activation. Recovery page deletes only versioned Hoot shell caches; no model or library deletion. Recovery navigation may be intercepted by older workers until updated.

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


## Credits and references

Hoot is an independent, noncommercial birding post-processing project. We thank the researchers, engineers, citizen scientists, photographers, and sound recordists whose work makes it possible. Hoot is not affiliated with or endorsed by any of the following projects.

### BirdNET+ — acoustic and geographic identification

- Lasseck, M., Eibl, M., Klinck, H., & Kahl, S. (2026). [BirdNET+ V3.0 model files, version 3.0.1](https://doi.org/10.5281/zenodo.24362980). Zenodo. Includes the pruned FP16 acoustic model and Geomodel V3.0.5 (FP32), used by Hoot.
- [BirdNET+ source and examples](https://github.com/birdnet-team/birdnet-V3.0-dev), [Geomodel training code](https://github.com/birdnet-team/geomodel), [BirdNET project](https://birdnet.cornell.edu/).
- Kahl, S., Wood, C. M., Eibl, M., & Klinck, H. (2021). [BirdNET: A deep learning solution for avian diversity monitoring](https://doi.org/10.1016/j.ecoinf.2021.101236). Ecological Informatics, 61, 101236. Foundational paper, not a paper specifically describing the V3.0.1 release.
- Model weights: Apache 2.0; consult the release's model license and acceptable-use guidance. Hoot's regional aggregation and combined ranking are its own heuristics.
- Thanks to the BirdNET contributors and training-data providers, including [Macaulay Library](https://www.macaulaylibrary.org/), [iNaturalist](https://www.inaturalist.org/), [Xeno-canto](https://xeno-canto.org/), [Animal Sound Archive Berlin](https://www.tierstimmenarchiv.de/), and [Observation.org](https://observation.org/).

### WingCLIP — visual identification

- Lian, John. [WingCLIP 0.3 model card](https://huggingface.co/johnlian/WingCLIP-0.3) and [WingDex repository](https://github.com/jlian/wingdex). Hoot uses the INT8 visual encoder and corresponding classifier embeddings and labels. WingCLIP has no separate paper; its model card specifies the following upstream references.
- Wu et al. (2023). [TinyCLIP: CLIP Distillation via Affinity Mimicking and Weight Inheritance](https://arxiv.org/abs/2309.12314). ICCV.
- Gu et al. (2025). [BioCLIP 2: Emergent Properties from Scaling Hierarchical Contrastive Learning](https://arxiv.org/abs/2505.23883). NeurIPS.
- Stevens et al. (2024). BioCLIP: A Vision Foundation Model for the Tree of Life. [CVPR paper](https://openaccess.thecvf.com/content/CVPR2024/html/Stevens_BioCLIP_A_Vision_Foundation_Model_for_the_Tree_of_Life_CVPR_2024_paper.html).
- Wortsman et al. (2022). [Robust fine-tuning of zero-shot models](https://arxiv.org/abs/2109.01903). CVPR.
- Faghri et al. (2025). [MobileCLIP2: Improving Multi-Modal Reinforced Training](https://arxiv.org/abs/2508.20691).
- Van Horn et al. (2015). Building a Bird Recognition App and Large Scale Dataset With Citizen Scientists: The Fine Print in Fine-Grained Dataset Collection. CVPR (NABirds evaluation dataset).
- Radford et al. (2021). [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020). ICML.
- Ilharco et al. (2021). [OpenCLIP](https://doi.org/10.5281/zenodo.5143773).
- Weights are [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), not the MIT license of the WingDex source. Training images come from [iNaturalist Open Data](https://github.com/inaturalist/inaturalist-open-data); see the upstream WingDex repository's per-photo attribution records and model card. Hoot does not redistribute the training images. Commercial use of these weights is not permitted under their published license.

### Merlin, eBird and Cornell Lab

- [Merlin Bird ID](https://merlin.allaboutbirds.org/) — user-supplied recordings; Hoot does not use Merlin's private models or SDK.
- [eBird](https://ebird.org/) — checklist export destination; [spreadsheet import format and official region-code workbook](https://support.ebird.org/en/support/solutions/articles/48000907878-upload-spreadsheet-data-to-ebird).
- Sullivan, B. L., Wood, C. L., Iliff, M. J., Bonney, R. E., Fink, D., & Kelling, S. (2009). eBird: a citizen-based bird observation network in the biological sciences. Biological Conservation, 142, 2282–2292. [Official citation guidance](https://science.ebird.org/en/use-ebird-data/citation).
- [Cornell Lab of Ornithology](https://www.birds.cornell.edu/home/) and [Macaulay Library](https://www.macaulaylibrary.org/) — thanks to their teams and the worldwide birding community.

### Supporting software and data

- [Natural Earth](https://www.naturalearthdata.com/) v5.1.2, public-domain geographic boundaries.
- [ONNX Runtime Web](https://onnxruntime.ai/) 1.22.0, inference runtime.
- [ExifReader](https://github.com/mattiasw/ExifReader) 4.52.0, photo metadata parsing.
- [HEIC.FYI](https://heic.fyi/) test image for metadata regression tests.

Refer to each project's license and attribution requirements; these references do not grant additional rights.

## v0.16 — Hoot
Renamed the application, manifest, recovery UI, diagnostics and export filenames. The repository and Pages URL remain `/flock/` for compatibility with installed applications. The legacy IndexedDB database name, model cache, and model self-test keys deliberately remain unchanged to preserve existing local media and downloads. Original project materials are CC BY-NC 4.0; third-party terms are unaffected.

## v0.17 — Start a new season
Settings > Clear library removes the app's local copies of photos and recordings, all detections, groups and confirmed sightings, and resets the birding region and export inputs. A confirmation dialog shows media counts. The replacement state is written atomically before the UI changes; the operation is blocked during imports and inference. Original source files, model caches, model self-test state and app shell remain untouched. Export your eBird checklist before clearing if you want to keep it. This is a destructive reset, not an archive or undo operation.

## v0.18 — Range-aware suggestions
Vision suggestions use a regional plausibility tier (occurrence >= 0.01), with stronger log occurrence reranking (weight 0.06, floor 0.00001). Other raw visual matches remain accessible in a collapsed section; absent/unknown taxonomy is not presented as region-supported. Geographic scores are model estimates, not confirmed range boundaries. Scientific name aliases and unambiguous normalized common names improve matching. The geographic label file is refreshed separately from weights. CI tests TT week 44 for Ortalis ruficauda and Sylviorthorhynchus desmurii/desmursii and checks actual WingCLIP label coverage. Existing scores require rerunning inference. Threshold and weight are heuristics, not calibrated probabilities.

## Deployment and asset preparation

- **Deploy Hoot** (`.github/workflows/pages-models.yml`): runs on main pushes or manual dispatch with read-only repository access. Validates committed asset input fingerprints and SHA-256 manifests, assembles the site, runs all regression tests, and deploys Pages. It never downloads model weights, builds geometry, modifies Git, or uses Actions asset caches.
- **Prepare Hoot assets** (`.github/workflows/prepare-assets.yml`): manual workflow, with a one-time bootstrap trigger on `prebuilt/BOOTSTRAP`. Select auto (missing/stale), models, regions, or all. This workflow alone installs Python dependencies, prepares assets, validates the complete site, and commits them using its built-in token with a non-force push. It removes the bootstrap sentinel and explicitly dispatches deployment, since built-in-token pushes do not normally trigger push workflows. Subsequent ordinary app pushes do not trigger asset preparation.
- Initial bootstrap may reuse the immutable, checksum-verified v0.16 deployment artifact. The model weights and region tables are unchanged; geographic common names are enriched using exact matches in the pinned BirdNET acoustic label file, with native/WASM references and semantic regression tests rerun. If the artifact is unavailable, preparation uses the pinned upstream release and full geo label extraction. Manual refresh uses upstream sources.
- `prebuilt/models/` and `prebuilt/regions/` hold extracted weights, labels, licenses, geographic/eBird tables and inference fixtures, along with SHA-256 manifests and input fingerprints. GitHub's 100 MiB file limit is enforced. The small upstream HEIC test fixture is not committed; it is fetched and checksum-verified on test runs. WingCLIP inference weights still download directly in the browser. Upstream licenses remain in effect.

To change an asset source or preparation script, run **Prepare Hoot assets** (auto) before deploying. To refresh external assets without changing scripts, explicitly select the relevant bundle. Never manually modify generated binary assets.

## v0.19 — Small subjects in photos
Automatic photo identification evaluates three centered square crops (90%, 55%, 32% of the shorter image dimension), retaining each species' best similarity per distinct photo and averaging scores across photos. This is a multi-view heuristic, not a calibrated probability or object detector. Tap **Focus bird** on a photo thumbnail to select a subject and crop size; saving re-runs the group using the selected crop for that image. Originals remain unchanged. A user-supplied small-subject example motivated the geometry test, but the actual photo is not committed or uploaded. Tests cover crop bounds, zoom and score aggregation, not recognition accuracy for that photo.

## v0.20 — Geography as eligibility; eBird species search
The 1% regional occurrence threshold is a candidate eligibility filter, not a ranking weight. Eligible visual candidates are ranked by visual similarity plus the existing nearby-audio bonus; sound candidates by raw acoustic confidence. Low/unknown occurrence alternatives remain accessible, and manual selection searches the full official eBird v2026 taxonomy (common/scientific names, species codes; no geographic restriction). Export validates canonical names. The taxonomy is compacted and checked into Git by the asset preparation workflow; the same workflow accepts a taxonomy-only refresh. Source: Clements et al. (2026), eBird/Clements checklist of Birds of the World, v2026, https://www.birds.cornell.edu/clementschecklist/download/. A new deployment requires a successful taxonomy bootstrap. Previously stored model rankings require rerunning inference to reflect the new rule.

The original taxonomy CSV is retained beside its compact JSON in `prebuilt/taxonomy/`. The bootstrap tries the official v2026 CSV, the official eBird API (after checking its current taxonomy version), or the official workbook. The source and JSON are checksummed; normal deployments never fetch taxonomy from the network.

## v0.21 — Region-only eBird exports

Exact GPS is optional for confirmed photo and audio observations. Keep real coordinates when present; otherwise use the selected or inferred birding region (or explicit fallback codes) with blank coordinate columns. The eBird import step can refine region-only locations. No region centroid is substituted for missing GPS.

## v0.22 — Canonical species spelling

Resolve unambiguous gray/grey spelling variants for model labels, species search, and exports. Migrate saved confirmed species names on library open without changing confirmation status or rerunning inference; keep unknown names for manual review. Audio confirmations can also be removed individually. Exact names take precedence and ambiguous spelling aliases do not auto-resolve.

## v0.23 — Automatic multi-bird focus

YOLOX-Tiny (official COCO ONNX release 0.1.1rc0, Apache-2.0, 416px BGR raw input) proposes bird boxes; overlapping 60% tiles run if the full-image pass finds none on a large image. The pinned, checksummed model is published with the site and downloaded into the existing offline model cache on first use. WingCLIP classifies every box independently using a padded square crop from the original image. Manual boxes override automatic boxes, can be added, redrawn or deleted, and are never overwritten by inference. Reset restores cached automatic boxes; older manual crops migrate on first analysis. No detection or unavailable detector falls back to centered views; an explicitly empty manual selection excludes that photo. Confirmed species export the maximum number of confirmed individuals in one photo per species per encounter, not the sum across burst photos; existing encounter-level counts remain available and are combined by maximum. This is conservative, not individual tracking. Detection and device performance need field validation.

## v0.24 — Encounter-first photo review

One photo encounter has a fixed-size photo viewer, thumbnails, box editing, and an aggregated species candidate list. Confirm a species in one tap for the entire encounter, adjust counts inline, or undo without rebuilding Review or reloading images. Candidates prioritize eligible top matches supported by distinct photos; suggested count is the maximum simultaneous top-match boxes in any one photo, never a sum across a burst. Raw alternatives and photo-specific evidence remain available. Counts and species are explicitly user-confirmed. Legacy encounter/box confirmations are preserved until the first group edit; thereafter the encounter review (including an intentionally empty list) is authoritative for export. Rerunning inference and changing boxes do not overwrite confirmed encounter species. Ungrouping a confirmed encounter requires confirmation. Browser/device usability is not yet field-tested.

## v0.25 — Focused encounter review

Review one encounter at a time with a persistent queue (To review, Later, Done, All), reviewed/total progress, previous/next and a jump index. Species confirmations remain independent of the explicit encounter completion status: Done and Review later do not create sightings, and finishing without a sighting asks for confirmation. Existing confirmations and export semantics remain unchanged; previously reviewed libraries start with pending tasks until explicitly marked done. Navigation and statuses persist in IndexedDB. A single encounter is mounted, its photo URLs are released on navigation, and the initial photo favors the strongest eligible suggestion. Swipe the displayed photo to browse its burst; edit boxes or hide overlays as needed. Audio and file metadata are tucked into a separate expandable section. In-device usability remains unverified.

## v0.26 — Review navigation polish

Completing or navigating an encounter returns the viewport to the queue header. A sticky compact Done action is always available, including when viewing photo evidence. Allow pinch zoom alongside photo swipes.

## v0.27 — Review evidence and checklist tools

View the padded bird crop used by WingCLIP (displayed at 448px), compare candidate species against explicitly requested iNaturalist research-grade, openly licensed reference photos with attribution, and open the eBird species guide. Reference lookup needs internet and transmits only the species name, not personal media, location or recording data. Split a photo encounter at any chronological photo boundary or merge with another encounter; confirmed species follow their recorded evidence photo when splitting and use maximum counts when merging. No observations are copied into both new groups; modified encounters return to pending review. Audio review groups detection windows by species, shows their positions in the recording and plays the chosen segment directly, with independent one-tap confirmation. Final export displays the exact deduplicated CSV records grouped by date/time/location, including region-only location and unknown-count warnings, before sharing the CSV. It does not invent a checklist or combine different dates and locations. All local review and export functions remain offline-capable. Reference lookup and device playback require real-browser validation.

## v0.28 — Comparison and audio evidence polish

Reference comparisons pin the local evidence photo or matching classified crop above the online reference gallery. Confirming audio saves the most recently played detection offset for that species (or the best detection if no clip was played); export uses that recording-relative offset, including after recording timestamp correction. Existing confirmations without offsets retain the previous timestamp fallback. Only an explicit lookup uses the network.

## Browser review QA

The separate Browser review QA workflow exercises Hoot in mobile-sized Chromium using real, attributed Wikimedia Commons bird photos from Trinidad and Tobago (two Rufous-vented Chachalacas and one Blue-gray Tanager). Test photo timestamps are deliberately changed to simulate a burst and another encounter, and GPS metadata is removed for a country-only export test; the original location/date and photographer/license are recorded in the fixture attribution. The review scenario uses real file inputs and UI actions for confirmation, counts, splitting, merging, deferral, reload and offline CSV download. The inference scenario uses the real browser model downloads and YOLOX/WingCLIP inference and records actual top matches, crop and reference previews. Test CSV is disposable and is never submitted to eBird. CI artifacts include screenshots and JSON results. This supplements unit tests; mobile Chromium does not reproduce iOS Safari's native share sheet or device performance.

## v0.29 — Species-first encounter index

Jump to encounter shows a thumbnail, confirmed species or top model suggestions (including multiple distinct top matches), and secondary capture time/photo count and review status. Suggestions are visibly unconfirmed; rare/unknown range matches are explicitly marked. A completed encounter without sightings is labelled accordingly. The active encounter heading uses the same label. This changes presentation only, not inference or export.

## v0.30 — Durable Safari media storage

IndexedDB now stores media as separate ArrayBuffer records keyed by asset ID, with MIME type and byte length in metadata. Fresh runtime Blobs and object URLs are reconstructed at startup; metadata-only edits do not rewrite media. Existing inline-Blob libraries are migrated when bytes remain readable. Missing files retain all metadata and confirmations and show a reconnect action; reconnecting the original preserves the asset ID. Deleting or clearing media removes its byte record in the same transaction. A WebKit browser QA scenario checks image decoding, WAV metadata, byte hashes after reload, migration and reconnection. Browser storage eviction and actual iPhone Safari behavior remain device-dependent; this is not a backup of the original Photos/Files library.

## v0.31 — Media recovery hardening

Do not turn a failed IndexedDB read into a missing-file migration; stop startup instead of overwriting the original library. Track saved asset IDs separately so clearing/deleting also removes corrupt media records. Display a reconnect action for audio decode failures. Browser tests exercise reload/reconnection in WebKit and Chromium; the legacy inline-Blob write simulation runs in Chromium because WebKit rejected the attempted old-format write even after successful byte-based reload. Both modes test offline image recovery.

## v0.32 — Remove non-bird photos directly in Review

The photo viewer's overflow menu offers Remove this photo and No birds in this encounter. Removing a photo advances within the group; removing the last photo or rejecting the group requires confirmation and removes the encounter's sightings. If a removed photo is linked to confirmed species in a surviving encounter, explicitly choose to retain those group sightings (relink to a remaining photo) or discard them; the encounter returns to pending review. Other confirmations remain untouched. The same path handles file-detail deletion. Media bytes and metadata are deleted atomically in local storage, never from the device's original Photos/Files library.

### Offline browser QA

The media scenarios now wait for an active controlling service worker and cached shell, then terminate the actual local HTTP server and verify that the origin is unreachable before reloading. This avoids a WebKit/Playwright offline-emulation navigation error without skipping the offline test. Restored media hashes and the confirmed species must still match the online library.

## v0.33 — Avicommons offline bird guides

Download a region independently of the sightings library via Import → Offline bird guides. Region membership is estimated on-device using the existing geomodel, twelve monthly samples and a conservative 0.005 occurrence threshold; this is not an authoritative checklist. Each species is matched by eBird code and scientific name against the 2025 Avicommons catalog, with photographer/license metadata. Regional guides use 480px images; worldwide thumbnails use 160px. Pack manifests and image cache are independent of app/model/sighting storage. Overlapping same-size photos are shared; downloads can pause/resume and only report complete when all requested image entries exist. Each newly downloaded image is decoded from the service-worker cache before counting it. CORS-readable and opaque image responses are supported; opaque responses may incur larger browser quota charges. Reference comparison opens local imagery first and offers online iNaturalist only on explicit request. No private media is transmitted. The full catalog is retrieved during site assembly, not on page loads. Avicommons currently offers one curated image per species, not multiple plumages. See https://github.com/rawcomposition/avicommons for catalog and photo attribution terms.

## v0.34 — Reference thumbnails and visible identification evidence

Photo and audio species rows reserve a stable reference thumbnail slot and resolve downloaded Avicommons images locally (including attribution; tap to compare). No automatic online lookups. Photo suggestions display the original cosine similarity and the range suitability of the same strongest eligible evidence, with distinct in-range/unlikely/unknown labels, and nearby-audio evidence when present. Audio rows show best detection score and that clip's range suitability. Range and visual scores remain independent; neither is a calibrated probability of species identity. Guide planning initializes the shared inference runtime independently of photo/sound model installation and resets failed geographic initialization before retrying. A cached manifest index avoids repeated full pack scans for individual thumbnails.

## v0.35 — Faster regional guide downloads

Four bounded concurrent image workers share one cursor, pause signal and failure budget. Existing verified cache entries are indexed once so resume and overlapping packs skip downloads immediately. Readable HTTP 429/503 responses stop the pool and preserve Retry-After (or a 60-second default) across reloads; HTTP errors are never retried as opaque requests. Opaque images still require successful cache decode and are subject to the five-error stop. Individual fetches have a 30-second timeout. Pause waits for active workers to settle before another download can start. Download progress includes active workers and photos per second. No additional hosting or archive files. Avicommons documents its R2 hosting but no explicit concurrency quota in its README/FAQ, so four workers is a conservative application cap, not a claimed upstream allowance. Actual throughput depends on connection, CDN, and browser storage.

## v0.36 — Unified download activity

Reference guides, inference models, ONNX runtime, geographic model and bird detector use the shared bottom activity dock. Selecting Download guide or Resume closes the guide manager; the dock provides Pause, progress, bytes received, byte throughput and estimated time remaining. The same dock is temporarily mounted in the guide manager for coverage preparation (which may itself download runtime/model files). No worker count or photos/second is displayed. Guide ETA extrapolates the completed-image rate and counts only new files; readable photo payload sizes are measured, while opaque images use a labeled estimate based on observed mean size or the existing size estimate. Model throughput measures streamed payload bytes and ETA applies to the current file when its Content-Length is usable; missing/encoded sizes show estimating rather than inventing an ETA for the entire model pack. Browser-managed service worker/app updates are not measured by this tracker. Pausing retains verified cached files. All four image workers remain active internally.

## v0.37 — Simplified guide manager

Saved/partial guides appear once, with a single photo count, a small partial-progress bar, and only applicable actions. Existing regions cannot create duplicate preview rows. Add a region is collapsed when guides exist; details about coverage/licensing are under About these guides. New-region previews show one count and a rough remaining download size, not repeated coverage messages. Completed activity notices are dismissed on entry because the guide row already conveys that status. The common bottom activity dock still handles active downloads. No data migration or cache change.

## v0.38 — Restore missing Avicommons photos

Avicommons 2025 contains 1,080 nonnumeric image IDs; the numeric-only validator incorrectly discarded 1,076 otherwise accepted catalog entries. Both catalog validation and service-worker image routing now allow safe alphanumeric IDs. Ruddy Turnstone (`rudtur`, `Arenaria interpres`) is explicitly included in TT packs using the national biodiversity checklist, without altering ML ranking. Existing guide manifests have an Update guide action: recalculate coverage, union with existing rows, keep cached image bytes, download only missing photos. A missing species can also be downloaded from its comparison dialog into an Extra species guide independently of its predicted range. No additional image hosting or cache reset. Remaining unsupported license forms still fail closed. Regional model coverage is approximate; documented additions are currently limited to TT Ruddy Turnstone.

## v0.39 — YOLOX-Tiny bird detection

Switch from Nano to Tiny (official 0.1.1rc0 ONNX, 20,219,662 bytes, SHA-256 427cc366d34e27ff7a03e2899b5e3671425c262ea2291f88bb942bc1cc70b0f7). Retain 416×416 BGR preprocessing, raw grid decode, confidence >= 0.20 and IoU > 0.45; suppress additional detections when intersection covers >=85% of the smaller box, keeping the higher-confidence box. No minimum box-area cutoff and no change to tile fallback, manual crops or WingCLIP ranking. Existing automatic boxes are replaced when reanalyzed with the new detector version; legacy confirmed boxes migrate to encounter-level review before replacement, and existing encounter reviews/manual boxes are untouched. Tiny is included when installing the photo model and is downloaded automatically on first reanalysis; a previously cached, checksum-verified Nano is usable offline if Tiny is unavailable. Old boxes survive a failed upgrade, and new photos may fall back to centered crops. No guide/library cache reset. Benchmark on five public fixture photos favored Tiny over Nano and Small (correct counts on all five with current thresholds); browser QA now also imports the single and paired motmot fixtures and checks actual box counts. Exact user-supplied motmot image was not uploaded or evaluated with model weights. The containment heuristic can still suppress genuine birds that strongly occlude one another; manual editing remains available. See detector-eval branch for benchmark.

## v0.40 — Minimum automatic bird crop quality

After existing Tiny detection and duplicate suppression (including the existing tiled fallback if no detections), require an unpadded bird box of at least 24 pixels on the shorter side and 48 pixels on the longer side, measured in original oriented image pixels. Confidence 0.20, IoU 0.45, containment 0.85, model weights, and preprocessing are unchanged. If all detected birds fail the size gate, retain the original photo without automatic boxes, warning text, or centered-crop species guesses; manual boxes and manual species entry remain available. A true no-detection result still uses the existing centered fallback. A persisted quality-rejection flag prevents cached/reloaded results from accidentally reentering fallback classification. Version bump refreshes old automatic detections on next analysis; preserve manual boxes and confirmed sightings. The threshold is a heuristic, not a calibrated image-quality measure. Field photo measurements (263×99, 47×40, 17×20 pixels) are tested as geometry regressions; private user photos are not published. Existing public fixtures continue to exercise actual browser inference.

## v0.41 — UI sanding

A small mobile usability pass inspired by Jim Nielsen’s Sanding UI: one-line photo controls at typical iPhone widths, hide unnecessary single-photo navigation and box toggle, keep count/confirmation controls aligned, move manual additions into the main species list, blur search after selection, close the encounter index after jumping, collapse score explanations while preserving the scores, remove duplicate deferred counts and zero-recording labels, remove permanent startup progress, and keep Pause disabled while cancellation settles. Focus indicators and touch targets improved. Browser review scenario repeatedly jumps between encounters and checks toolbar height, single-photo controls, manual confirmation, and late pause progress. No inference/storage changes.

## v0.42 — Second sanding pass

Remove the redundant count beside the Review heading, enlarge photo navigation hit targets, shorten the encounter status gap, and make score help and encounter navigation disclosure hit areas larger. Manual box editor shows whether drawing or redrawing, disables inapplicable add/delete actions, keeps Save/Reset/Cancel reachable, and retains drafts until Save. Audio species entry matches photo review; collapsing recording details pauses playback. Real browser regression exercises drawing, selecting, deleting and canceling a box and manual audio confirmation/undo. No model changes.

## v0.43 — Sanding pass 3

Fixed the deployment test harness to implement event registration and test actual recording-collapse pause behavior. Trim import inventory and duplicate region labels; show a single region summary in export with technical codes tucked away. Disable export until confirmed sightings exist. Clear the empty species hint as soon as a sighting is confirmed, show a no-match search state, and promote manually chosen candidates from collapsed alternative groups into the main list. Only one recording plays at a time. Sticky export actions with inline errors and duplicate-click prevention. No model, export data or persistence format changes. Browser checks cover search empty state, export enablement, compact inventory and sticky export controls.

## v0.44 — Small, distant bird recovery

The existing four-corner fallback now includes one centered 40% tile, only when the full-frame detector produces no hits and the image is large enough for tiling. Existing confidence, NMS, containment and original-pixel 24×48 quality thresholds stay unchanged. The detector version changes so old automatic boxes are recomputed on reanalysis; manual boxes and confirmed sightings are retained. For small automatic crops (longer side <=160 original pixels), classify three padded views (1.25×, 2.5× and 3× the longer box dimension) and average cosine similarities before applying the existing regional eligibility and nearby-audio logic. Larger and manual crops retain their original single view. Crop dialog exposes the actual view geometries. No new model downloads. Field tests with real pinned Tiny, WingCLIP and regional model weights and Chromium canvas preprocessing: the two private caracara images go from one accepted box plus one miss to one box each; correct species improves to fourth eligible on the recovered frame, fifth in the encounter on the tested TT seasonal/year-round priors (no nearby audio). The earlier flock remains unboxed; old black-bird and motmot full behavior unchanged by this specific change. First frame still misclassified; classifier is not reliably top-one. Private photos not committed. New thresholds and crop scales are empirical and require broader validation.
