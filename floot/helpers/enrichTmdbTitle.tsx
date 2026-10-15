import { db } from "./db";

const TMDB_BASE = "https://api.themoviedb.org/3";

type MarqueeTitleRow = {
  id: number;
  displayTitle: string;
  mediaType: "movie" | "show";
  releaseYear: number | null;
  isAnime: boolean;
};

type TmdbSearchResult = {
  id: number;
  name?: string;
  original_name?: string;
  title?: string;
  original_title?: string;
  first_air_date?: string;
  release_date?: string;
  genre_ids?: number[];
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

type TmdbSeasonSummary = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  air_date: string | null;
  episode_count: number;
};

type TmdbTvDetails = {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  status: string;
  seasons: TmdbSeasonSummary[];
};

type TmdbEpisode = {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
};

type TmdbSeasonDetails = TmdbSeasonSummary & {
  episodes: TmdbEpisode[];
};

export type TmdbMatchPreview = {
  titleId: number;
  sourceTitle: string;
  sourceYear: number | null;
  tmdbId: number | null;
  matchedTitle: string | null;
  matchedYear: number | null;
  confidence: number;
  autoApplicable: boolean;
  reasons: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const yearFromDate = (value?: string | null) => {
  if (!value) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
};

async function tmdbFetch<T>(path: string): Promise<T> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB_API_TOKEN is not configured");

  const response = await fetch(TMDB_BASE + path, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TMDB request failed: " + response.status + " " + path);
  }

  return response.json() as Promise<T>;
}

const candidateTitle = (candidate: TmdbSearchResult) =>
  candidate.name ?? candidate.title ?? "";

const candidateOriginalTitle = (candidate: TmdbSearchResult) =>
  candidate.original_name ?? candidate.original_title ?? "";

const candidateYear = (candidate: TmdbSearchResult) =>
  yearFromDate(candidate.first_air_date ?? candidate.release_date);

const scoreCandidate = (
  title: MarqueeTitleRow,
  candidate: TmdbSearchResult
): { confidence: number; reasons: string[] } => {
  const source = normalize(title.displayTitle);
  const primary = normalize(candidateTitle(candidate));
  const original = normalize(candidateOriginalTitle(candidate));
  const reasons: string[] = [];
  let score = 0;

  if (source === primary || (original && source === original)) {
    score += 0.8;
    reasons.push("exact title");
  } else if (
    primary.includes(source) ||
    source.includes(primary) ||
    (original && (original.includes(source) || source.includes(original)))
  ) {
    score += 0.5;
    reasons.push("close title");
  }

  const year = candidateYear(candidate);
  if (title.releaseYear && year) {
    if (title.releaseYear === year) {
      score += 0.15;
      reasons.push("year match");
    } else if (Math.abs(title.releaseYear - year) === 1) {
      score += 0.05;
      reasons.push("near year");
    } else {
      score -= 0.2;
      reasons.push("year conflict");
    }
  }

  if (title.isAnime && candidate.genre_ids?.includes(16)) {
    score += 0.1;
    reasons.push("animation match");
  }

  return {
    confidence: Math.max(0, Math.min(1, Math.round(score * 1000) / 1000)),
    reasons,
  };
};

const searchTitle = async (title: MarqueeTitleRow): Promise<TmdbMatchPreview> => {
  const media = title.mediaType === "movie" ? "movie" : "tv";
  const params = new URLSearchParams({
    query: title.displayTitle,
    include_adult: "false",
    language: "en-US",
  });

  if (title.releaseYear) {
    params.set(media === "tv" ? "first_air_date_year" : "year", String(title.releaseYear));
  }

  const result = await tmdbFetch<{ results: TmdbSearchResult[] }>(
    "/search/" + media + "?" + params.toString()
  );

  const scored = result.results
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(title, candidate),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (!best) {
    return {
      titleId: title.id,
      sourceTitle: title.displayTitle,
      sourceYear: title.releaseYear,
      tmdbId: null,
      matchedTitle: null,
      matchedYear: null,
      confidence: 0,
      autoApplicable: false,
      reasons: ["no results"],
    };
  }

  return {
    titleId: title.id,
    sourceTitle: title.displayTitle,
    sourceYear: title.releaseYear,
    tmdbId: best.candidate.id,
    matchedTitle: candidateTitle(best.candidate),
    matchedYear: candidateYear(best.candidate),
    confidence: best.confidence,
    autoApplicable: best.confidence >= 0.85,
    reasons: best.reasons,
  };
};

const findSeasonMatch = async (
  titleId: number,
  tmdbSeason: TmdbSeasonDetails
) => {
  const seasons = await db
    .selectFrom("marqueeSeasons")
    .selectAll()
    .where("titleId", "=", titleId)
    .execute();

  const exact = seasons.find((season) => season.seasonNumber === tmdbSeason.season_number);
  if (exact) return exact;

  const unknown = seasons.filter((season) => season.seasonNumber === null);
  if (!unknown.length) return null;

  const scored: Array<{ season: (typeof seasons)[number]; score: number }> = [];
  for (const season of unknown) {
    const episodes = await db
      .selectFrom("marqueeEpisodes")
      .select(["episodeNumber", "displayTitle"])
      .where("seasonId", "=", season.id)
      .execute();

    let score = episodes.length === tmdbSeason.episodes.length ? 2 : 0;
    for (const episode of episodes) {
      if (!episode.displayTitle || episode.episodeNumber === null) continue;
      const target = tmdbSeason.episodes.find(
        (candidate) => candidate.episode_number === episode.episodeNumber
      );
      if (target && normalize(target.name) === normalize(episode.displayTitle)) score += 1;
    }

    scored.push({ season, score });
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score >= 2) return scored[0].season;
  return null;
};

const enrichTv = async (
  title: MarqueeTitleRow,
  match: TmdbMatchPreview,
  keepExistingMapping = false
) => {
  if (!match.tmdbId) throw new Error("Missing TMDB id");

  const details = await tmdbFetch<TmdbTvDetails>(
    "/tv/" + match.tmdbId + "?language=en-US"
  );
  if (details.id !== match.tmdbId) throw new Error("TMDB show identity changed");

  // A catalog refresh of an already verified mapping keeps its original match provenance.
  if (!keepExistingMapping) await db
    .insertInto("marqueeTmdbMappings")
    .values({
      titleId: title.id,
      tmdbId: details.id,
      mediaType: "tv",
      matchedTitle: details.name,
      matchedYear: yearFromDate(details.first_air_date),
      matchMethod: "title-year",
      confidence: match.confidence,
    })
    .onConflict((oc) =>
      oc.column("titleId").doUpdateSet({
        tmdbId: details.id,
        mediaType: "tv",
        matchedTitle: details.name,
        matchedYear: yearFromDate(details.first_air_date),
        matchMethod: "title-year",
        confidence: match.confidence,
        updatedAt: new Date(),
      })
    )
    .execute();

  await db
    .updateTable("marqueeTitles")
    .set({
      canonicalTitle: details.name,
      releaseYear: yearFromDate(details.first_air_date),
      overview: details.overview || null,
      tmdbPosterPath: details.poster_path,
      tmdbBackdropPath: details.backdrop_path,
      tmdbStatus: details.status,
      updatedAt: new Date(),
    })
    .where("id", "=", title.id)
    .execute();

  let seasonsTouched = 0;
  let episodesTouched = 0;

  for (const seasonSummary of details.seasons.filter((season) => season.season_number > 0)) {
    const tmdbSeason = await tmdbFetch<TmdbSeasonDetails>(
      "/tv/" + details.id + "/season/" + seasonSummary.season_number + "?language=en-US"
    );

    let season = await findSeasonMatch(title.id, tmdbSeason);

    if (!season) {
      season = await db
        .insertInto("marqueeSeasons")
        .values({
          titleId: title.id,
          sourceKey:
            "tmdb:tv:" +
            details.id +
            ":season:" +
            tmdbSeason.season_number,
          seasonNumber: tmdbSeason.season_number,
          displayTitle: tmdbSeason.name,
          releaseDate: tmdbSeason.air_date,
          tmdbId: tmdbSeason.id,
          tmdbPosterPath: tmdbSeason.poster_path,
          overview: tmdbSeason.overview || null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      await db
        .updateTable("marqueeSeasons")
        .set({
          seasonNumber: tmdbSeason.season_number,
          displayTitle: tmdbSeason.name,
          releaseDate: tmdbSeason.air_date,
          tmdbId: tmdbSeason.id,
          tmdbPosterPath: tmdbSeason.poster_path,
          overview: tmdbSeason.overview || null,
          updatedAt: new Date(),
        })
        .where("id", "=", season.id)
        .execute();

      season = {
        ...season,
        seasonNumber: tmdbSeason.season_number,
        displayTitle: tmdbSeason.name,
        releaseDate: tmdbSeason.air_date ? new Date(tmdbSeason.air_date) : null,
        tmdbId: tmdbSeason.id,
        tmdbPosterPath: tmdbSeason.poster_path,
        overview: tmdbSeason.overview || null,
      };
    }

    seasonsTouched += 1;

    for (const tmdbEpisode of tmdbSeason.episodes) {
      const existing = await db
        .selectFrom("marqueeEpisodes")
        .selectAll()
        .where("seasonId", "=", season.id)
        .where("episodeNumber", "=", tmdbEpisode.episode_number)
        .executeTakeFirst();

      if (existing) {
        await db
          .updateTable("marqueeEpisodes")
          .set({
            displayTitle: tmdbEpisode.name,
            airedAt: tmdbEpisode.air_date,
            runtimeMinutes: tmdbEpisode.runtime,
            tmdbId: tmdbEpisode.id,
            overview: tmdbEpisode.overview || null,
            tmdbStillPath: tmdbEpisode.still_path,
            updatedAt: new Date(),
          })
          .where("id", "=", existing.id)
          .execute();
      } else {
        await db
          .insertInto("marqueeEpisodes")
          .values({
            seasonId: season.id,
            sourceKey:
              "tmdb:tv:" +
              details.id +
              ":season:" +
              tmdbSeason.season_number +
              ":episode:" +
              tmdbEpisode.episode_number,
            episodeNumber: tmdbEpisode.episode_number,
            absoluteNumber: null,
            displayTitle: tmdbEpisode.name,
            airedAt: tmdbEpisode.air_date,
            runtimeMinutes: tmdbEpisode.runtime,
            tmdbId: tmdbEpisode.id,
            overview: tmdbEpisode.overview || null,
            tmdbStillPath: tmdbEpisode.still_path,
          })
          .execute();
      }

      episodesTouched += 1;
    }
  }

  const allEpisodes = await db
    .selectFrom("marqueeEpisodes")
    .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
    .select(["marqueeEpisodes.id", "marqueeEpisodes.airedAt"])
    .where("marqueeSeasons.titleId", "=", title.id)
    .execute();

  const episodeIds = allEpisodes.map((episode) => episode.id);
  const releasedEpisodes = allEpisodes.filter(
    (episode) => episode.airedAt && episode.airedAt.getTime() <= Date.now()
  ).length;

  const watchedRows = episodeIds.length
    ? await db
        .selectFrom("marqueeWatchEvents")
        .select(["episodeId", "watchedAt"])
        .where("episodeId", "in", episodeIds)
        .execute()
    : [];

  const watchedEpisodes = new Set(watchedRows.map((row) => row.episodeId)).size;
  const lastWatchedAt = watchedRows.length
    ? watchedRows.reduce(
        (latest, row) => row.watchedAt > latest ? row.watchedAt : latest,
        watchedRows[0].watchedAt
      )
    : null;

  const currentTitleState = await db
    .selectFrom("marqueeTitles")
    .select(["watchedEpisodes", "lastWatchedAt"])
    .where("id", "=", title.id)
    .executeTakeFirst();

  const effectiveWatchedEpisodes = Math.max(
    currentTitleState?.watchedEpisodes ?? 0,
    watchedEpisodes
  );
  const effectiveLastWatchedAt =
    currentTitleState?.lastWatchedAt && lastWatchedAt
      ? currentTitleState.lastWatchedAt > lastWatchedAt
        ? currentTitleState.lastWatchedAt
        : lastWatchedAt
      : currentTitleState?.lastWatchedAt ?? lastWatchedAt;

  await db
    .updateTable("marqueeTitles")
    .set({
      releasedEpisodes,
      watchedEpisodes: effectiveWatchedEpisodes,
      lastWatchedAt: effectiveLastWatchedAt,
      updatedAt: new Date(),
    })
    .where("id", "=", title.id)
    .execute();

  return {
    titleId: title.id,
    title: title.displayTitle,
    tmdbId: details.id,
    seasonsTouched,
    episodesTouched,
    releasedEpisodes,
    watchedEpisodes: effectiveWatchedEpisodes,
  };
};

/** The Trakt-provided TMDB ID is checked against TMDB before a title is created. */
export const previewTraktTmdbTitle = async (
  mediaType: "show" | "movie",
  tmdbId: number,
  sourceTitle: string,
  sourceYear: number | null
) => {
  const media = mediaType === "show" ? "tv" : "movie";
  const details = await tmdbFetch<TmdbSearchResult & {
    genres?: Array<{ id: number }>;
  }>("/" + media + "/" + tmdbId + "?language=en-US");
  if (details.id !== tmdbId) return null;
  const target = {
    ...details,
    genre_ids: details.genres?.map((genre) => genre.id) ?? [],
  };
  const scored = scoreCandidate({
    id: 0, displayTitle: sourceTitle, releaseYear: sourceYear,
    mediaType, isAnime: false,
  }, target);
  const matchedYear = candidateYear(target);
  // An exact name and matching release year are required for unattended creation.
  if (
    !scored.reasons.includes("exact title") ||
    !sourceYear || !matchedYear || sourceYear !== matchedYear ||
    scored.confidence < 0.95
  ) return null;
  // Animation is created as anime (Dave, Oct 12, 2026). Crunchyroll keeps its own mapping rules.
  return {
    tmdbId, matchedTitle: candidateTitle(target), matchedYear,
    confidence: scored.confidence,
    isAnimation: Boolean(target.genre_ids?.includes(16)),
  };
};

export const enrichTraktTmdbTitle = async (
  titleId: number,
  tmdbId: number,
  confidence: number
) => {
  const title = await db.selectFrom("marqueeTitles")
    .select(["id", "displayTitle", "mediaType", "releaseYear", "isAnime"])
    .where("id", "=", titleId).executeTakeFirstOrThrow();
  const media = title.mediaType === "show" ? "tv" : "movie";
  const existing = await db.selectFrom("marqueeTmdbMappings")
    .select(["titleId", "tmdbId"])
    .where("mediaType", "=", media).where("tmdbId", "=", tmdbId)
    .executeTakeFirst();
  const own = await db.selectFrom("marqueeTmdbMappings")
    .select(["tmdbId"]).where("titleId", "=", titleId).executeTakeFirst();
  if ((existing && existing.titleId !== titleId) ||
      (own && own.tmdbId !== tmdbId)) {
    throw new Error("Conflicting TMDB identity");
  }
  const match: TmdbMatchPreview = {
    titleId, sourceTitle: title.displayTitle, sourceYear: title.releaseYear,
    tmdbId, matchedTitle: null, matchedYear: null,
    confidence, autoApplicable: true, reasons: ["Trakt TMDB ID verified"],
  };
  if (title.mediaType === "show") return enrichTv(title, match, own?.tmdbId === tmdbId);

  const details = await tmdbFetch<TmdbSearchResult & {
    genres?: Array<{ id: number }>; status?: string;
  }>("/movie/" + tmdbId + "?language=en-US");
  if (details.id !== tmdbId) throw new Error("TMDB movie identity changed");
  await db.insertInto("marqueeTmdbMappings").values({
    titleId, tmdbId, mediaType: "movie",
    matchedTitle: details.title ?? title.displayTitle,
    matchedYear: yearFromDate(details.release_date),
    matchMethod: "trakt-tmdb-id", confidence,
  }).onConflict((oc) => oc.column("titleId").doNothing()).execute();
  await db.updateTable("marqueeTitles").set({
    canonicalTitle: details.title ?? title.displayTitle,
    releaseYear: yearFromDate(details.release_date),
    overview: details.overview || null,
    tmdbPosterPath: details.poster_path ?? null,
    tmdbBackdropPath: details.backdrop_path ?? null,
    tmdbStatus: details.status ?? null,
    updatedAt: new Date(),
  }).where("id", "=", titleId).execute();
  return { titleId, tmdbId };
};

export const previewTmdbMatches = async (titleIds: number[]) => {
  const titles = await db
    .selectFrom("marqueeTitles")
    .select(["id", "displayTitle", "mediaType", "releaseYear", "isAnime"])
    .where("id", "in", titleIds)
    .execute();

  const results: TmdbMatchPreview[] = [];
  for (const title of titles) results.push(await searchTitle(title));
  return results;
};

export const applyTmdbEnrichment = async (titleIds: number[]) => {
  const titles = await db
    .selectFrom("marqueeTitles")
    .select(["id", "displayTitle", "mediaType", "releaseYear", "isAnime"])
    .where("id", "in", titleIds)
    .execute();

  const results = [];
  for (const title of titles) {
    const match = await searchTitle(title);
    if (!match.autoApplicable || !match.tmdbId) {
      results.push({ titleId: title.id, title: title.displayTitle, skipped: true, match });
      continue;
    }

    if (title.mediaType !== "show") {
      results.push({
        titleId: title.id,
        title: title.displayTitle,
        skipped: true,
        reason: "Movie enrichment is not part of this pilot batch",
        match,
      });
      continue;
    }

    results.push({ ...(await enrichTv(title, match)), skipped: false, match });
  }

  return results;
};