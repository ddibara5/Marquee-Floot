import { db } from "./db";
import { discoverTraktTitle } from "./discoverTraktTitle";
import { enrichTraktTmdbTitle } from "./enrichTmdbTitle";
import type { TraktHistoryItem } from "./traktApi";

// Live Trakt runs apply history inside a staged transaction that defers external calls.
// This pass runs before that transaction, so new titles and newly aired episodes exist in
// the catalog when the existing mapping logic looks for them. Titles tied to Crunchyroll mappings
// are left to the Crunchyroll rules; other shows with a verified TMDB mapping are refreshed.

export type ShowLookup = { titleId: number; tmdbId: number | null; crunchyrollLinked: boolean };
export type CatalogLookups = {
  isRecorded: (sourceEventKey: string) => Promise<boolean>;
  showTitle: (item: TraktHistoryItem) => Promise<ShowLookup | null>;
  movieTitle: (item: TraktHistoryItem) => Promise<number | null>;
  hasEpisode: (titleId: number, season: number, episode: number) => Promise<boolean>;
};
export type CatalogGap =
  | { kind: "newTitle"; mediaType: "show" | "movie"; item: TraktHistoryItem; title: string }
  | { kind: "missingEpisodes"; titleId: number; tmdbId: number; title: string };

export const MAX_CATALOG_GAPS_PER_RUN = 10;
const excluded = new Set(["one piece", "fairy tail"]);
const isExcluded = (title?: string) => excluded.has(title?.trim().toLowerCase() ?? "");

export async function planCatalogDiscovery(
  episodes: TraktHistoryItem[],
  movies: TraktHistoryItem[],
  lookups: CatalogLookups,
  limit = MAX_CATALOG_GAPS_PER_RUN
): Promise<CatalogGap[]> {
  const gaps: CatalogGap[] = [];
  const seen = new Set<string>();
  const add = (key: string, gap: CatalogGap) => {
    if (seen.has(key) || gaps.length >= limit) return;
    seen.add(key);
    gaps.push(gap);
  };

  for (const item of episodes) {
    if (gaps.length >= limit) break;
    const show = item.show, episode = item.episode;
    if (!item.id || !show || !episode || isExcluded(show.title)) continue;
    const showKey = "show:" + (show.ids.trakt ?? show.ids.tmdb ?? show.title);
    if (seen.has(showKey)) continue;
    if (await lookups.isRecorded("trakt:episode:" + item.id)) continue;
    const known = await lookups.showTitle(item);
    if (!known) {
      add(showKey, { kind: "newTitle", mediaType: "show", item, title: show.title });
      continue;
    }
    if (known.crunchyrollLinked || !known.tmdbId || known.tmdbId !== show.ids.tmdb) continue;
    if (!Number.isInteger(episode.season) || !Number.isInteger(episode.number)) continue;
    if (await lookups.hasEpisode(known.titleId, episode.season, episode.number)) continue;
    add(showKey, { kind: "missingEpisodes", titleId: known.titleId, tmdbId: known.tmdbId, title: show.title });
  }

  for (const item of movies) {
    if (gaps.length >= limit) break;
    const movie = item.movie;
    if (!item.id || !movie || isExcluded(movie.title)) continue;
    const movieKey = "movie:" + (movie.ids.trakt ?? movie.ids.tmdb ?? movie.title);
    if (seen.has(movieKey)) continue;
    if (await lookups.isRecorded("trakt:movie:" + item.id)) continue;
    if (await lookups.movieTitle(item)) continue;
    add(movieKey, { kind: "newTitle", mediaType: "movie", item, title: movie.title });
  }
  return gaps;
}

const dbLookups: CatalogLookups = {
  isRecorded: async (key) => {
    const [episode, movie] = await Promise.all([
      db.selectFrom("marqueeWatchEvents").select("id").where("sourceEventKey", "=", key).executeTakeFirst(),
      db.selectFrom("marqueeTitleWatchEvents").select("id").where("sourceEventKey", "=", key).executeTakeFirst(),
    ]);
    return Boolean(episode || movie);
  },
  showTitle: async (item) => {
    const traktId = item.show?.ids.trakt, tmdbId = item.show?.ids.tmdb;
    const byTrakt = traktId ? await db.selectFrom("marqueeTraktMappings").select("titleId")
      .where("entityType", "=", "show").where("traktId", "=", String(traktId)).executeTakeFirst() : undefined;
    const byTmdb = !byTrakt?.titleId && tmdbId ? await db.selectFrom("marqueeTmdbMappings").select("titleId")
      .where("mediaType", "=", "tv").where("tmdbId", "=", tmdbId).executeTakeFirst() : undefined;
    const titleId = byTrakt?.titleId ?? byTmdb?.titleId;
    if (!titleId) return null;
    const row = await db.selectFrom("marqueeTitles as t")
      .leftJoin("marqueeTmdbMappings as m", (join) => join.onRef("m.titleId", "=", "t.id").on("m.mediaType", "=", "tv"))
      .select(["t.id", "m.tmdbId"]).where("t.id", "=", titleId).executeTakeFirst();
    if (!row) return null;
    const crunchyroll = await db.selectFrom("marqueeSourceMappings as sm")
      .leftJoin("marqueeEpisodes as e", "e.id", "sm.episodeId")
      .leftJoin("marqueeSeasons as s", "s.id", "e.seasonId")
      .select("sm.sourceId").where("sm.source", "=", "crunchyroll")
      .where((eb) => eb.or([eb("sm.titleId", "=", titleId), eb("s.titleId", "=", titleId)]))
      .executeTakeFirst();
    return { titleId: row.id, tmdbId: row.tmdbId ?? null, crunchyrollLinked: Boolean(crunchyroll) };
  },
  movieTitle: async (item) => {
    const traktId = item.movie?.ids.trakt, tmdbId = item.movie?.ids.tmdb;
    const byTrakt = traktId ? await db.selectFrom("marqueeTraktMappings").select("titleId")
      .where("entityType", "=", "movie").where("traktId", "=", String(traktId)).executeTakeFirst() : undefined;
    if (byTrakt?.titleId) return byTrakt.titleId;
    const byTmdb = tmdbId ? await db.selectFrom("marqueeTmdbMappings").select("titleId")
      .where("mediaType", "=", "movie").where("tmdbId", "=", tmdbId).executeTakeFirst() : undefined;
    return byTmdb?.titleId ?? null;
  },
  hasEpisode: async (titleId, season, episode) => Boolean(await db.selectFrom("marqueeEpisodes as e")
    .innerJoin("marqueeSeasons as s", "s.id", "e.seasonId").select("e.id")
    .where("s.titleId", "=", titleId).where("s.seasonNumber", "=", season)
    .where("e.episodeNumber", "=", episode).executeTakeFirst()),
};

export type CatalogDiscoveryResult = {
  planned: number; titlesAdded: number; titlesRefreshed: number;
  skipped: string[]; failed: string[];
};

/** Live runs only. Each gap is independent: a TMDB failure leaves that history pending and the run continues. */
export async function fillTraktCatalogGaps(
  episodes: TraktHistoryItem[],
  movies: TraktHistoryItem[]
): Promise<CatalogDiscoveryResult> {
  const gaps = await planCatalogDiscovery(episodes, movies, dbLookups);
  const result: CatalogDiscoveryResult = { planned: gaps.length, titlesAdded: 0, titlesRefreshed: 0, skipped: [], failed: [] };
  for (const gap of gaps) {
    try {
      if (gap.kind === "newTitle") {
        const titleId = await discoverTraktTitle(gap.item, gap.mediaType);
        if (titleId) result.titlesAdded += 1; else result.skipped.push(gap.title);
      } else {
        await enrichTraktTmdbTitle(gap.titleId, gap.tmdbId, 1);
        result.titlesRefreshed += 1;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 80) : "unknown";
      result.failed.push(gap.title + ": " + reason);
      console.warn("Marquee catalog discovery failed", gap.title, reason);
      if (/429/.test(reason)) break;
    }
  }
  return result;
}
