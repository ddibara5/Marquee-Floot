# Catch every watch (audit Batch 1) - October 12, 2026

Status: preview only, not published. Production keeps the October 3 Premiere release until Dave publishes.

## Problem (audit, Oct 12)
Live Trakt runs apply history in `runStagedTransaction`, which sets the shadow flag, so `discoverTraktTitle` never ran in production after the Sept 30 cutover. No job added episodes to known titles. Result: 0 titles and 0 episodes created since Oct 1; Lanterns S1E3-E5 and PLUTO E1-E2 sat in `marquee_trakt_pending`.

## Change
- New `helpers/traktCatalogDiscovery.tsx`. Live runs only (`marqueeTraktFinish`, native branch), after the pre-live backup and before the staged apply:
  - unknown show or movie in the run's bounded history (recent overlap plus pending keys) -> existing `discoverTraktTitle` (unchanged guards: exact title, matching year, confidence 0.95, no animation);
  - known non-anime show whose TMDB mapping equals the Trakt TMDB id, with a watched episode missing from the catalog -> existing `enrichTraktTmdbTitle` (adds seasons and episodes, sets air dates and released count).
  - At most 10 titles per run; each failure is logged and leaves that history pending; a TMDB 429 stops the pass.
- `enrichTmdbTitle.tsx`: refreshing an already verified mapping keeps its original match provenance; the show id returned by TMDB must equal the requested id.
- Run counts gain `catalog` ({planned, titlesAdded, titlesRefreshed, skipped, failed}); `discoveryDeferred` is false on live runs. No endpoint shape changed.

## Anime (Dave's decision, Oct 12, 9:58 AM Eastern)
Dave: "I want to include anime ... My Crunchyroll process is separate." Superseded rule: Trakt discovery used to reject any TMDB title with the Animation genre. It now creates such titles with `is_anime = true` (same exact-title, year and confidence guards). An existing anime title with the same name is still never merged from Trakt (`discoverTraktTitle` keeps its isAnime same-title guard), so Crunchyroll titles are not touched. Catalog refresh skips any title with a Crunchyroll mapping (title or episode), not anime as such. Today that leaves Baki, Vinland Saga and Moonrise (anime, Trakt-linked, no Crunchyroll) eligible for refresh if a watched episode is missing. Expected: PLUTO is created with its full TMDB catalog on the first live run and its 2 pending watches map.

## Not changed
Crunchyroll matching, Crunchyroll-linked catalogs, shadow runs.

## Validation
Typecheck clean. All 28 non-hook specs pass, including new `traktCatalogDiscovery.spec.tsx` (5 cases). Not exercised against TMDB or the shared database: the first real proof is the first production Trakt run after a publish (11:17 UTC), read from `marquee_import_runs.counts.catalog` and `marquee_trakt_pending`.
