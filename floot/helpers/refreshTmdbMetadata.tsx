import {marqueeWriter} from "./marqueeWriter";
import { db } from "./db";

type Details = {
  id: number;
  name?: string; title?: string;
  poster_path?: string | null; backdrop_path?: string | null;
  overview?: string | null; status?: string | null;
  first_air_date?: string | null; release_date?: string | null;
};
export type MetadataRefreshResult = {
  attempted: number; updated: number;
  failed: Array<{ titleId: number; reason: string }>;
  remainingDue: number;
};
const DAY = 86_400_000;
const REFRESH_AFTER = 30 * DAY;
const RETRY_AFTER = DAY;

async function refreshTmdbMetadataWork(limit = 25): Promise<MetadataRefreshResult> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error("Invalid refresh limit");
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB credential is not connected");

  const candidates = await db.selectFrom("marqueeTmdbMappings as mapping")
    .innerJoin("marqueeTitles as title", "title.id", "mapping.titleId")
    .leftJoin("marqueeTmdbRefreshState as state", "state.titleId", "title.id")
    .select([
      "title.id as titleId", "title.mediaType as titleMedia", "title.releaseYear",
      "title.overview", "title.tmdbPosterPath", "title.tmdbBackdropPath",
      "mapping.tmdbId", "mapping.mediaType as tmdbMedia",
      "state.lastSuccessAt", "state.lastAttemptAt", "state.lastError",
    ]).execute();
  const now = Date.now();
  const due = candidates.filter(row => {
    if (row.tmdbMedia !== (row.titleMedia === "show" ? "tv" : "movie") ||
        !Number.isInteger(row.tmdbId) || row.tmdbId <= 0) return false;
    const attempted = row.lastAttemptAt?.getTime() ?? 0;
    if (row.lastError && attempted > now - RETRY_AFTER) return false;
    return !row.lastSuccessAt || row.lastSuccessAt.getTime() < now - REFRESH_AFTER;
  }).sort((a, b) => {
    const aMissing = Number(!a.tmdbPosterPath || !a.overview);
    const bMissing = Number(!b.tmdbPosterPath || !b.overview);
    return bMissing - aMissing ||
      (a.lastSuccessAt?.getTime() ?? 0) - (b.lastSuccessAt?.getTime() ?? 0) ||
      a.titleId - b.titleId;
  });
  const failures: MetadataRefreshResult["failed"] = [];
  let updated = 0;
  for (const row of due.slice(0, limit)) {
    const timestamp = new Date();
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${row.tmdbMedia}/${row.tmdbId}?language=en-US`,
        { headers: { Authorization: "Bearer " + token, Accept: "application/json" },
          signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok) throw new Error("TMDB HTTP " + response.status);
      const details = await response.json() as Details;
      if (details.id !== row.tmdbId) throw new Error("TMDB identity mismatch");
      const date = row.titleMedia === "show" ? details.first_air_date : details.release_date;
      const year = date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null;
      await db.updateTable("marqueeTitles").set({
        tmdbPosterPath: details.poster_path || row.tmdbPosterPath,
        tmdbBackdropPath: details.backdrop_path || row.tmdbBackdropPath,
        overview: details.overview?.trim() || row.overview,
        ...(details.status ? { tmdbStatus: details.status } : {}),
        ...(row.releaseYear === null && year ? { releaseYear: year } : {}),
        updatedAt: timestamp,
      }).where("id", "=", row.titleId).execute();
      await db.insertInto("marqueeTmdbRefreshState").values({
        titleId: row.titleId, tmdbId: row.tmdbId,
        lastAttemptAt: timestamp, lastSuccessAt: timestamp, lastError: null,
      }).onConflict(oc => oc.column("titleId").doUpdateSet({
        tmdbId: row.tmdbId, lastAttemptAt: timestamp,
        lastSuccessAt: timestamp, lastError: null, updatedAt: timestamp,
      })).execute();
      updated++;
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 100) : "TMDB refresh failed";
      failures.push({ titleId: row.titleId, reason });
      await db.insertInto("marqueeTmdbRefreshState").values({
        titleId: row.titleId, tmdbId: row.tmdbId,
        lastAttemptAt: timestamp, lastError: reason,
      }).onConflict(oc => oc.column("titleId").doUpdateSet({
        tmdbId: row.tmdbId, lastAttemptAt: timestamp,
        lastError: reason, updatedAt: timestamp,
      })).execute();
      if (reason === "TMDB HTTP 429") break;
    }
  }
  return { attempted: Math.min(due.length, limit), updated, failed: failures,
    remainingDue: Math.max(0, due.length - Math.min(due.length, limit)) };
}



export const refreshTmdbMetadata = (...args: Parameters<typeof refreshTmdbMetadataWork>) => marqueeWriter.work("task:refreshTmdbMetadata", () => refreshTmdbMetadataWork(...args));
