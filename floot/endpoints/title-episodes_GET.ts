import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { manualTitleRatingId } from "../helpers/manualTitleRatingId";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import { schema, type OutputType } from "./title-episodes_GET.schema";

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({
      titleId: url.searchParams.get("titleId"),
    });
    const { user, session } = await getServerUserSession(request);

    // Independent catalog reads can run together; the episode join scopes rows
    // to this title without waiting for the season-id list.
    const [seasons, episodes] = await Promise.all([
      db.selectFrom("marqueeSeasons").selectAll()
        .where("titleId", "=", input.titleId)
        .orderBy("seasonNumber", "asc").orderBy("id", "asc").execute(),
      db.selectFrom("marqueeEpisodes")
        .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
        .selectAll("marqueeEpisodes")
        .where("marqueeSeasons.titleId", "=", input.titleId)
        .orderBy("marqueeEpisodes.seasonId", "asc")
        .orderBy("marqueeEpisodes.episodeNumber", "asc")
        .orderBy("marqueeEpisodes.id", "asc")
        .execute(),
    ]);
    const seasonIds = seasons.map((season) => season.id);

    const episodeIds = episodes.map((episode) => episode.id);
    const watchEvents = episodeIds.length
      ? await db
          .selectFrom("marqueeWatchEvents")
          .selectAll()
          .where("userId", "=", user.id)
          .where("episodeId", "in", episodeIds)
          .orderBy("watchedAt", "desc")
          .execute()
      : [];
    // Trakt's 1970 timestamps represent unknown dates in the imported history.
    const datedEvents = watchEvents.filter(event => new Date(event.watchedAt).getFullYear() >= 1980);
    const sentinelEpisodeIds = watchEvents
      .filter(event => new Date(event.watchedAt).getFullYear() < 1980)
      .map(event => event.episodeId);

    const [completions, ratings, statuses, movieEvents, movieCompletion, manualStatus, traktOutbox, manualCompletions, unwatched, seriesCorrected, localRating] = await Promise.all([
      episodeIds.length
        ? db.selectFrom("marqueeLegacyCompletions").select(["episodeId"])
            .where("userId", "=", user.id).where("episodeId", "in", episodeIds).execute()
        : Promise.resolve([]),
      seasonIds.length
        ? db.selectFrom("marqueeLegacyRatings").select(["seasonId", "score", "source"])
            .where("userId", "=", user.id).where("seasonId", "in", seasonIds).execute()
        : Promise.resolve([]),
      seasonIds.length
        ? db.selectFrom("marqueeLegacyStatuses").select(["seasonId", "status"])
            .where("userId", "=", user.id).where("seasonId", "in", seasonIds).execute()
        : Promise.resolve([]),
      db.selectFrom("marqueeTitleWatchEvents").selectAll()
        .where("userId", "=", user.id).where("titleId", "=", input.titleId)
        .orderBy("watchedAt", "desc").execute(),
      db.selectFrom("marqueeLegacyCompletions").select(["sourceId"])
        .where("userId", "=", user.id).where("titleId", "=", input.titleId)
        .executeTakeFirst(),
      db.selectFrom("marqueeManualTitleStatuses").select(["status"])
        .where("userId", "=", user.id).where("titleId", "=", input.titleId)
        .executeTakeFirst(),
      db.selectFrom("marqueeManualTraktOutbox")
        .select(["localEventId", "kind", "state", "lastError"])
        .where("userId", "=", user.id).where("titleId", "=", input.titleId)
        .where("state", "not in", ["synced", "removed"]).execute(),
      episodeIds.length
        ? db.selectFrom("marqueeManualEpisodeCompletions").select(["episodeId", "bulkScope"])
            .where("userId", "=", user.id).where("episodeId", "in", episodeIds).execute()
        : Promise.resolve([]),
      episodeIds.length
        ? db.selectFrom("marqueeEpisodeUnwatched").select("episodeId")
            .where("userId", "=", user.id).where("episodeId", "in", episodeIds).execute()
        : Promise.resolve([]),
      db.selectFrom("marqueeSeriesCatchupCorrections").select("episodeId")
        .where("userId", "=", user.id).where("titleId", "=", input.titleId).execute(),
      db.selectFrom("marqueeLegacyRatings").select("score")
        .where("userId", "=", user.id)
        .where("sourceId", "=", manualTitleRatingId(user.id, input.titleId))
        .executeTakeFirst(),
    ]);
    const hidden = new Set(unwatched.map(row => row.episodeId));

    const response = new Response(
      superjson.stringify({
        seasons,
        episodes,
        watchEvents: datedEvents.filter(event => !hidden.has(event.episodeId)),
        undatedEpisodeIds: Array.from(new Set([
          ...completions.map(row => row.episodeId!).filter((id): id is number => id !== null),
          ...manualCompletions.map(row => row.episodeId),
          ...sentinelEpisodeIds,
        ])).filter(id => !hidden.has(id)),
        unwatchedEpisodeIds: [...hidden],
        manualCompletionIds: manualCompletions.map(row => row.episodeId),
        seriesCompletionIds: manualCompletions.filter(row => row.bulkScope === "series").map(row => row.episodeId),
        seriesCorrectedIds: seriesCorrected.map(row => row.episodeId),
        seasonRatings: ratings.map(row => ({
          seasonId: row.seasonId!, score: Number(row.score), source: row.source,
        })),
        seasonStatuses: statuses.map(row => ({
          seasonId: row.seasonId!, status: row.status,
        })),
        movieEvents: movieEvents.filter(event => event.watchedAt.getFullYear() >= 1980),
        movieUndated: Boolean(movieCompletion) ||
          movieEvents.some(event => event.watchedAt.getFullYear() < 1980),
        manualStatus: manualStatus?.status ?? null,
        localRating: localRating ? Number(localRating.score) : null,
        traktOutbox,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } }
    );

    await setServerSession(response, {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });

    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Episode detail load error:", error);
    return new Response(
      superjson.stringify({ error: "Unable to load episode details" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "title-episodes_GET.ts", true);
