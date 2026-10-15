# Honest progress (audit Batch 2) - October 12, 2026

Status: preview only, not published.

## Problem (audit, Oct 12)
`released_episodes` for shows was never recalculated after the Sept 30 migration (`recalculateTitleProgress` keeps it as is). Home showed The Apothecary Diaries "48 / 48 released, 100%" next to "S1 E49, aired Oct 2". 58 of 61 current shows had no future episode in the catalog.

## Change
`helpers/refreshShowCatalogs.tsx`, called from the existing `refreshTmdbDaily` job (06:30 America/New_York; schedule unchanged), after the metadata refresh and isolated from it:
1. Catalog refresh: up to 12 shows a day through the existing `enrichTraktTmdbTitle` (seasons, episodes, air dates, status, released count). Eligible: TMDB tv mapping, status Returning Series / In Production / Planned / Pilot, at least one catalog season, not Crunchyroll-linked, catalog not refreshed in the last 3 days (max `marquee_seasons.updated_at`). Most recently watched first. A TMDB 429 stops the pass.
2. Recount: every show whose numbered catalog (season 0 excluded) has no undated episode gets `released_episodes` = episodes aired by now. Shows with undated episodes keep their synced total.
Result logged as "Marquee catalog refresh {...}".

## Expected first run (read-only dry run Oct 12)
Recount: Slow Horses 32->34, Last Seen 4->6, The Apothecary Diaries 48->50, Ted Lasso 42->44. Catalog refresh: 62 current TMDB shows, 54 with a catalog after excluding Watch List-only titles, about 12 a day.

## Validation
Typecheck clean; all 29 non-hook specs pass, including new `refreshShowCatalogs.spec.tsx` (3 cases). No UI change. Real proof: the first 06:30 Eastern run after publish (prod log line plus `marquee_titles` totals).
