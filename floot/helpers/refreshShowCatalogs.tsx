import { sql } from "kysely";
import { marqueeWriter } from "./marqueeWriter";
import { db } from "./db";
import { enrichTraktTmdbTitle } from "./enrichTmdbTitle";

// Audit Batch 2 (Oct 12, 2026): released totals were frozen at the Sept 30 migration.
// 1. Current non-Crunchyroll shows with a TMDB mapping get their seasons and episodes refreshed
//    (air dates, new episodes, status), a few per day, oldest first.
// 2. Every show whose catalog is fully dated gets its released total recounted from that catalog.
//    Shows with undated episodes keep their synced total, because the catalog cannot prove it.

export const CATALOG_REFRESH_LIMIT = 12;
export const CATALOG_REFRESH_MIN_AGE_DAYS = 3;
const CURRENT = new Set(["returning series", "in production", "planned", "pilot"]);

export type RefreshCandidate = {
  titleId: number; title: string; tmdbId: number; tmdbStatus: string | null;
  crunchyrollLinked: boolean; catalogUpdatedAt: Date | null; lastWatchedAt: Date | null;
};

// Shows without a catalog (Watch List only) are not refreshed here; most recently watched go first.
export function selectCatalogRefresh(rows: RefreshCandidate[], now = new Date(),
  limit = CATALOG_REFRESH_LIMIT, minAgeDays = CATALOG_REFRESH_MIN_AGE_DAYS): RefreshCandidate[] {
  const cutoff = now.getTime() - minAgeDays * 86_400_000;
  return rows
    .filter((row) => !row.crunchyrollLinked && row.tmdbId > 0 && row.catalogUpdatedAt !== null &&
      CURRENT.has(row.tmdbStatus?.trim().toLowerCase() ?? "") &&
      row.catalogUpdatedAt.getTime() < cutoff)
    .sort((a, b) => (b.lastWatchedAt?.getTime() ?? 0) - (a.lastWatchedAt?.getTime() ?? 0) ||
      (a.catalogUpdatedAt?.getTime() ?? 0) - (b.catalogUpdatedAt?.getTime() ?? 0) || a.titleId - b.titleId)
    .slice(0, limit);
}

async function loadCandidates(): Promise<RefreshCandidate[]> {
  const result = await sql<{
    title_id: number; title: string; tmdb_id: number; tmdb_status: string | null;
    crunchyroll_linked: boolean; catalog_updated_at: Date | null; last_watched_at: Date | null;
  }>`
    SELECT t.id AS title_id, t.display_title AS title, m.tmdb_id, t.tmdb_status, t.last_watched_at,
      EXISTS (
        SELECT 1 FROM marquee_source_mappings sm
        LEFT JOIN marquee_episodes e ON e.id = sm.episode_id
        LEFT JOIN marquee_seasons s ON s.id = e.season_id
        WHERE sm.source = 'crunchyroll' AND (sm.title_id = t.id OR s.title_id = t.id)
      ) AS crunchyroll_linked,
      (SELECT max(s.updated_at) FROM marquee_seasons s WHERE s.title_id = t.id) AS catalog_updated_at
    FROM marquee_titles t
    JOIN marquee_tmdb_mappings m ON m.title_id = t.id AND m.media_type = 'tv'
    WHERE t.media_type = 'show'
  `.execute(db);
  return result.rows.map((row) => ({
    titleId: row.title_id, title: row.title, tmdbId: Number(row.tmdb_id), tmdbStatus: row.tmdb_status,
    crunchyrollLinked: row.crunchyroll_linked,
    catalogUpdatedAt: row.catalog_updated_at ? new Date(row.catalog_updated_at) : null,
    lastWatchedAt: row.last_watched_at ? new Date(row.last_watched_at) : null,
  }));
}

/** Recount released episodes for shows whose numbered catalog has no undated episode. */
export async function recountDatedReleasedTotals() {
  const result = await sql<{ id: number; display_title: string; before: number | null; after: number }>`
    WITH catalog AS (
      SELECT s.title_id,
        count(*) FILTER (WHERE e.aired_at <= now())::int AS aired,
        count(*) FILTER (WHERE e.aired_at IS NULL)::int AS undated,
        count(*)::int AS total
      FROM marquee_episodes e
      JOIN marquee_seasons s ON s.id = e.season_id
      WHERE COALESCE(s.season_number, 1) <> 0
      GROUP BY s.title_id
    ), before AS (
      SELECT t.id, t.released_episodes FROM marquee_titles t
      JOIN catalog c ON c.title_id = t.id
      WHERE t.media_type = 'show' AND c.total > 0 AND c.undated = 0
        AND t.released_episodes IS DISTINCT FROM c.aired
    )
    UPDATE marquee_titles t SET released_episodes = c.aired, updated_at = now()
    FROM catalog c, before b
    WHERE c.title_id = t.id AND b.id = t.id
    RETURNING t.id, t.display_title, b.released_episodes AS before, c.aired AS after
  `.execute(db);
  return result.rows.map((row) => `${row.display_title} ${row.before ?? "none"}->${row.after}`);
}

async function refreshShowCatalogsWork() {
  const chosen = selectCatalogRefresh(await loadCandidates());
  const refreshed: string[] = [], failed: string[] = [];
  for (const show of chosen) {
    try {
      await enrichTraktTmdbTitle(show.titleId, show.tmdbId, 1);
      refreshed.push(show.title);
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 80) : "unknown";
      failed.push(show.title + ": " + reason);
      if (/429/.test(reason)) break;
    }
  }
  const recounted = await recountDatedReleasedTotals();
  return { refreshed, failed, recounted };
}

export const refreshShowCatalogs = () =>
  marqueeWriter.work("task:refreshShowCatalogs", refreshShowCatalogsWork);
