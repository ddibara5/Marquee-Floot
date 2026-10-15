import {marqueeWriter} from "../helpers/marqueeWriter";
import {isMigrationWriterError} from "../helpers/migrationWriter";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { manualTitleRatingId } from "../helpers/manualTitleRatingId";
import { recalculateTitleProgress } from "../helpers/recalculateTitleProgress";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { getTraktAccessToken } from "../helpers/traktSync";
import { syncManualTraktEvent } from "../helpers/traktHistoryWriteback";
import { syncTraktPersonalState } from "../helpers/traktPersonalSync";
import { schema, type OutputType } from "./tracking_POST.schema";

class InvalidTracking extends Error {}

export function createTrackingHandler(database:typeof db=db,getSession:typeof getServerUserSession=getServerUserSession,tokenProvider:typeof getTraktAccessToken=getTraktAccessToken,writeback:typeof syncManualTraktEvent=syncManualTraktEvent,personalSync:typeof syncTraktPersonalState=syncTraktPersonalState){
 return async function handleRequest(request: Request) {
  try {
    const { user, session } = await getSession(request);
    const input = schema.parse(superjson.parse(await request.text()));
    let loggedEventId: number | undefined;
    let outboundKey: string | null = null;
    const outboundKeys: string[] = [];
    let trackingMessageOverride: string | null = null;
    let plannedQueued = false;
    let plannedUnmapped = false;
    await database.transaction().execute(async trx => {
      const title = await trx.selectFrom("marqueeTitles")
        .select(["id", "mediaType", "displayTitle", "releaseYear"])
        .where("id", "=", input.titleId).executeTakeFirst();
      if (!title) throw new InvalidTracking("Title not found");

      if (input.action === "rating") {
        const sourceId = manualTitleRatingId(user.id, title.id);
        if (input.rating === null) {
          await trx.deleteFrom("marqueeLegacyRatings")
            .where("sourceId", "=", sourceId).where("userId", "=", user.id).execute();
        } else {
          await trx.insertInto("marqueeLegacyRatings").values({
            sourceId, userId: user.id, titleId: title.id, seasonId: null,
            score: input.rating, source: "manual", sourceRecordId: null,
            sourceUpdatedAt: new Date(), manualLocked: true,
          }).onConflict(oc => oc.column("sourceId").doUpdateSet({
            score: input.rating!, sourceUpdatedAt: new Date(), manualLocked: true,
          })).execute();
        }
        return;
      }

      if (input.action === "watchlistLocal") {
        const mapping = await trx.selectFrom("marqueeTraktMappings")
          .select("traktId").where("entityType", "=", title.mediaType === "movie" ? "movie" : "show")
          .where("titleId", "=", title.id).executeTakeFirst();
        if (mapping) throw new InvalidTracking("This title is linked to Trakt; use the synced Watch List control");
        if (input.saved) {
          await trx.insertInto("marqueeLegacyWatchlist").values({
            userId: user.id, titleId: title.id, sourceId: crypto.randomUUID(),
            source: "manual", manualLocked: true, addedAt: new Date(),
          }).onConflict(oc => oc.columns(["userId", "titleId"]).doNothing()).execute();
        } else {
          await trx.deleteFrom("marqueeLegacyWatchlist")
            .where("userId", "=", user.id).where("titleId", "=", title.id)
            .where("source", "=", "manual").execute();
        }
        return;
      }

      if (input.action === "status" || input.action === "viewing") {
        if (input.status === null) {
          await trx.deleteFrom("marqueeManualTitleStatuses")
            .where("userId", "=", user.id).where("titleId", "=", title.id).execute();
        } else {
          await trx.insertInto("marqueeManualTitleStatuses").values({
            userId: user.id, titleId: title.id, status: input.status,
          }).onConflict(oc => oc.columns(["userId", "titleId"])
            .doUpdateSet({ status: input.status!, updatedAt: new Date() })).execute();
        }
        if (input.action === "viewing" || input.status === "planned") {
          const mediaType = title.mediaType === "movie" ? "movie" : "show";
          const mapping = await trx.selectFrom("marqueeTraktMappings")
            .select(["traktId", "tmdbId"]).where("entityType", "=", mediaType)
            .where("titleId", "=", title.id).executeTakeFirst();
          if (!mapping) plannedUnmapped = input.status === "planned";
          else {
            const existing = await trx.selectFrom("marqueeTraktWatchlist")
              .select(["active", "pendingAction"])
              .where("userId", "=", user.id).where("mediaType", "=", mediaType)
              .where("traktId", "=", mapping.traktId).executeTakeFirst();
            if (input.status === "planned" && (!existing?.active || existing.pendingAction === "remove")) {
              await trx.insertInto("marqueeTraktWatchlist").values({
                userId: user.id, mediaType, traktId: mapping.traktId,
                titleId: title.id, tmdbId: mapping.tmdbId,
                sourceTitle: title.displayTitle, sourceYear: title.releaseYear,
                active: true, pendingAction: "add", listedAt: new Date(),
              }).onConflict(oc => oc.columns(["userId", "mediaType", "traktId"])
                .doUpdateSet({ active: true, pendingAction: "add", updatedAt: new Date() }))
                .execute();
              plannedQueued = true;
            }
          }
        }
        return;
      }

      if (input.action === "season" || input.action === "seasonUndo") {
        if (title.mediaType !== "show") throw new InvalidTracking("Only shows have seasons");
        const season = await trx.selectFrom("marqueeSeasons").select("id")
          .where("id", "=", input.seasonId).where("titleId", "=", title.id)
          .executeTakeFirst();
        if (!season) throw new InvalidTracking("Season does not belong to this title");
        if (input.action === "seasonUndo") {
          await trx.deleteFrom("marqueeManualEpisodeCompletions")
            .where("userId", "=", user.id).where("seasonId", "=", season.id)
            .where("bulkScope", "=", "season").execute();
          await recalculateTitleProgress(trx, user.id, title.id);
          trackingMessageOverride = "Season catch-up undone. Imported watches remain intact.";
          return;
        }
        const eligible = await trx.selectFrom("marqueeEpisodes").select("id")
          .where("seasonId", "=", season.id)
          .where(eb => eb.or([eb("airedAt", "is", null), eb("airedAt", "<=", new Date())]))
          .execute();
        if (!eligible.length) throw new InvalidTracking("This season has no aired episodes to mark");
        await trx.deleteFrom("marqueeEpisodeUnwatched")
          .where("userId", "=", user.id).where("episodeId", "in", eligible.map(e => e.id))
          .execute();
        await sql`
          INSERT INTO marquee_manual_episode_completions(user_id,episode_id,season_id)
          SELECT ${user.id}, e.id, ${season.id} FROM marquee_episodes e
          WHERE e.season_id=${season.id} AND (e.aired_at IS NULL OR e.aired_at<=now())
            AND NOT EXISTS(SELECT 1 FROM marquee_watch_events w
              WHERE w.user_id=${user.id} AND w.episode_id=e.id)
            AND NOT EXISTS(SELECT 1 FROM marquee_legacy_completions c
              WHERE c.user_id=${user.id} AND c.episode_id=e.id)
          ON CONFLICT(user_id,episode_id) DO NOTHING
        `.execute(trx);
        await recalculateTitleProgress(trx, user.id, title.id);
        trackingMessageOverride = "Season marked watched in Marquee. Missing episodes were recorded without invented watch dates.";
        return;
      }

      if (input.action === "series" || input.action === "seriesUndo") {
        if (title.mediaType !== "show") throw new InvalidTracking("Only shows have episodes");
        if (input.action === "seriesUndo") {
          await trx.deleteFrom("marqueeManualEpisodeCompletions")
            .where("userId", "=", user.id).where("bulkScope", "=", "series")
            .where("seasonId", "in", trx.selectFrom("marqueeSeasons")
              .select("id").where("titleId", "=", title.id))
            .execute();
          await sql`
            INSERT INTO marquee_episode_unwatched(user_id,episode_id)
            SELECT user_id,episode_id FROM marquee_series_catchup_corrections
            WHERE user_id=${user.id} AND title_id=${title.id}
            ON CONFLICT(user_id,episode_id) DO NOTHING
          `.execute(trx);
          await trx.deleteFrom("marqueeSeriesCatchupCorrections")
            .where("userId", "=", user.id).where("titleId", "=", title.id).execute();
          await recalculateTitleProgress(trx, user.id, title.id);
          trackingMessageOverride = "Series catch-up undone. Earlier watches remain intact.";
          return;
        }
        const eligible = await trx.selectFrom("marqueeEpisodes")
          .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
          .select("marqueeEpisodes.id")
          .where("marqueeSeasons.titleId", "=", title.id)
          .where(eb => eb.or([eb("marqueeEpisodes.airedAt", "is", null), eb("marqueeEpisodes.airedAt", "<=", new Date())]))
          .execute();
        if (!eligible.length) throw new InvalidTracking("This series has no available indexed episodes");
        await sql`
          INSERT INTO marquee_series_catchup_corrections(user_id,title_id,episode_id)
          SELECT ${user.id},${title.id},u.episode_id FROM marquee_episode_unwatched u
          WHERE u.user_id=${user.id} AND u.episode_id IN (
            SELECT e.id FROM marquee_episodes e
            JOIN marquee_seasons s ON s.id=e.season_id
            WHERE s.title_id=${title.id} AND (e.aired_at IS NULL OR e.aired_at<=now())
          )
          ON CONFLICT(user_id,title_id,episode_id) DO NOTHING
        `.execute(trx);
        await trx.deleteFrom("marqueeEpisodeUnwatched")
          .where("userId", "=", user.id).where("episodeId", "in", eligible.map(e => e.id))
          .execute();
        await sql`
          INSERT INTO marquee_manual_episode_completions(user_id,episode_id,season_id,bulk_scope)
          SELECT ${user.id}, e.id, e.season_id, 'series'
          FROM marquee_episodes e JOIN marquee_seasons s ON s.id=e.season_id
          WHERE s.title_id=${title.id} AND (e.aired_at IS NULL OR e.aired_at<=now())
            AND NOT EXISTS(SELECT 1 FROM marquee_watch_events w
              WHERE w.user_id=${user.id} AND w.episode_id=e.id)
            AND NOT EXISTS(SELECT 1 FROM marquee_legacy_completions c
              WHERE c.user_id=${user.id} AND c.episode_id=e.id)
          ON CONFLICT(user_id,episode_id) DO NOTHING
        `.execute(trx);
        await recalculateTitleProgress(trx, user.id, title.id);
        trackingMessageOverride = "Released indexed episodes marked watched in Marquee without invented watch dates.";
        return;
      }

      if (input.action === "markEarlier" || input.action === "moveEarlier") {
        if (title.mediaType !== "show") throw new InvalidTracking("Only show episodes can be marked earlier");
        const episode = await trx.selectFrom("marqueeEpisodes")
          .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
          .select(["marqueeEpisodes.id", "marqueeEpisodes.seasonId", "marqueeEpisodes.airedAt"])
          .where("marqueeEpisodes.id", "=", input.episodeId)
          .where("marqueeSeasons.titleId", "=", title.id).executeTakeFirst();
        if (!episode) throw new InvalidTracking("Episode does not belong to this title");
        if (episode.airedAt && episode.airedAt > new Date())
          throw new InvalidTracking("An unaired episode cannot be marked watched");
        if (input.action === "moveEarlier") {
          const manual = await trx.selectFrom("marqueeWatchEvents")
            .select(["id", "sourceEventKey"])
            .where("id", "=", input.eventId).where("userId", "=", user.id)
            .where("episodeId", "=", episode.id).where("source", "=", "manual")
            .executeTakeFirst();
          if (!manual) throw new InvalidTracking("Manual check-in not found");
          const outbox = await trx.selectFrom("marqueeManualTraktOutbox")
            .select(["sourceEventKey", "state", "traktHistoryId", "attempts"])
            .where("userId", "=", user.id).where("kind", "=", "episode")
            .where("localEventId", "=", manual.id).executeTakeFirst();
          if (!outbox) throw new InvalidTracking("Trakt check-in record is missing; review before converting");
          await trx.insertInto("marqueeManualEpisodeCompletions")
            .values({ userId: user.id, episodeId: episode.id,
              seasonId: episode.seasonId, bulkScope: "episode" })
            .onConflict(oc => oc.columns(["userId", "episodeId"]).doNothing()).execute();
          await trx.deleteFrom("marqueeWatchEvents")
            .where("id", "=", manual.id).where("userId", "=", user.id).execute();
          const needsRemoval = Boolean(outbox.traktHistoryId) || outbox.attempts > 0 ||
            outbox.state === "uncertain";
          await trx.updateTable("marqueeManualTraktOutbox")
            .set({ state: needsRemoval ? "remove_pending" : "removed", updatedAt: new Date() })
            .where("sourceEventKey", "=", outbox.sourceEventKey).execute();
          if (needsRemoval) outboundKeys.push(outbox.sourceEventKey);
          trackingMessageOverride = needsRemoval
            ? "Moved to Earlier watches. Trakt check-in removed."
            : "Moved to Earlier watches. No watch date added.";
        } else {
          const dated = await trx.selectFrom("marqueeWatchEvents")
            .select("id").where("userId", "=", user.id).where("episodeId", "=", episode.id)
            .where("watchedAt", ">=", new Date("1980-01-01"))
            .executeTakeFirst();
          if (dated) throw new InvalidTracking("This episode already has a dated watch");
          await trx.insertInto("marqueeManualEpisodeCompletions")
            .values({ userId: user.id, episodeId: episode.id,
              seasonId: episode.seasonId, bulkScope: "episode" })
            .onConflict(oc => oc.columns(["userId", "episodeId"]).doNothing()).execute();
          trackingMessageOverride = "Marked watched earlier in Marquee. No date or Trakt play added.";
        }
        await trx.deleteFrom("marqueeEpisodeUnwatched")
          .where("userId", "=", user.id).where("episodeId", "=", episode.id).execute();
        await recalculateTitleProgress(trx, user.id, title.id);
        return;
      }

      if (input.action === "unwatch") {
        if (title.mediaType !== "show") throw new InvalidTracking("Only show episodes can be unwatched");
        const episode = await trx.selectFrom("marqueeEpisodes")
          .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
          .select("marqueeEpisodes.id")
          .where("marqueeEpisodes.id", "=", input.episodeId)
          .where("marqueeSeasons.titleId", "=", title.id).executeTakeFirst();
        if (!episode) throw new InvalidTracking("Episode does not belong to this title");
        await trx.insertInto("marqueeEpisodeUnwatched").values({
          userId: user.id, episodeId: input.episodeId,
        }).onConflict(oc => oc.columns(["userId", "episodeId"])
          .doUpdateSet({ updatedAt: new Date() })).execute();
        const manualEvents = await trx.selectFrom("marqueeWatchEvents")
          .select("id").where("userId", "=", user.id)
          .where("episodeId", "=", input.episodeId).where("source", "=", "manual")
          .execute();
        for (const event of manualEvents) {
          const outbox = await trx.selectFrom("marqueeManualTraktOutbox")
            .select(["sourceEventKey", "state", "traktHistoryId", "attempts"])
            .where("userId", "=", user.id).where("kind", "=", "episode")
            .where("localEventId", "=", event.id).executeTakeFirst();
          await trx.deleteFrom("marqueeWatchEvents")
            .where("id", "=", event.id).where("userId", "=", user.id).execute();
          if (outbox) {
            const needsRemoval = Boolean(outbox.traktHistoryId) || outbox.attempts > 0 ||
              outbox.state === "uncertain";
            await trx.updateTable("marqueeManualTraktOutbox")
              .set({ state: needsRemoval ? "remove_pending" : "removed", updatedAt: new Date() })
              .where("sourceEventKey", "=", outbox.sourceEventKey).execute();
            if (needsRemoval) outboundKeys.push(outbox.sourceEventKey);
          }
        }
        await recalculateTitleProgress(trx, user.id, title.id);
        trackingMessageOverride = "Episode marked unwatched in Marquee. Imported source history remains preserved.";
        return;
      }

      if ((input.kind === "movie") !== (title.mediaType === "movie"))
        throw new InvalidTracking("The tracking kind does not match this title");
      if (input.kind === "episode") {
        if (!input.episodeId) throw new InvalidTracking("Episode is required");
        const episode = await trx.selectFrom("marqueeEpisodes")
          .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
          .select(["marqueeEpisodes.id"])
          .where("marqueeEpisodes.id", "=", input.episodeId)
          .where("marqueeSeasons.titleId", "=", title.id).executeTakeFirst();
        if (!episode) throw new InvalidTracking("Episode does not belong to this title");
      }

      if (input.action === "log") {
        if (input.kind === "episode") {
          await trx.deleteFrom("marqueeEpisodeUnwatched")
            .where("userId", "=", user.id).where("episodeId", "=", input.episodeId!)
            .execute();
        }
        const sourceEventKey = "manual:" + input.kind + ":" + user.id + ":" + input.requestId;
        const table = input.kind === "episode" ? "marqueeWatchEvents" as const
          : "marqueeTitleWatchEvents" as const;
        if (input.kind === "episode") {
          await trx.insertInto("marqueeWatchEvents").values({
            userId: user.id, episodeId: input.episodeId!,
            sourceEventKey, source: "manual", watchedAt: new Date(),
          }).onConflict(oc => oc.column("sourceEventKey").doNothing()).execute();
        } else {
          await trx.insertInto("marqueeTitleWatchEvents").values({
            userId: user.id, titleId: title.id,
            sourceEventKey, source: "manual", watchedAt: new Date(),
          }).onConflict(oc => oc.column("sourceEventKey").doNothing()).execute();
        }
        const event = await trx.selectFrom(table).select(["id", "watchedAt"])
          .where("sourceEventKey", "=", sourceEventKey)
          .where("userId", "=", user.id).executeTakeFirstOrThrow();
        await trx.insertInto("marqueeManualTraktOutbox").values({
          sourceEventKey, userId: user.id, kind: input.kind, localEventId: event.id,
          titleId: title.id, episodeId: input.kind === "episode" ? input.episodeId! : null,
          watchedAt: event.watchedAt, state: "pending",
        }).onConflict(oc => oc.column("sourceEventKey").doNothing()).execute();
        loggedEventId = event.id;
        outboundKey = sourceEventKey;
      } else {
        const outbox = await trx.selectFrom("marqueeManualTraktOutbox")
          .select(["sourceEventKey", "state", "traktHistoryId", "attempts"])
          .where("userId", "=", user.id).where("kind", "=", input.kind)
          .where("localEventId", "=", input.eventId).executeTakeFirst();
        if (input.kind === "episode") {
          const deleted = await trx.deleteFrom("marqueeWatchEvents")
            .where("id", "=", input.eventId).where("userId", "=", user.id)
            .where("episodeId", "=", input.episodeId!)
            .where("source", "=", "manual").returning("id").executeTakeFirst();
          if (!deleted) throw new InvalidTracking("Manual check-in not found");
        } else {
          const deleted = await trx.deleteFrom("marqueeTitleWatchEvents")
            .where("id", "=", input.eventId).where("userId", "=", user.id)
            .where("titleId", "=", title.id)
            .where("source", "=", "manual").returning("id").executeTakeFirst();
          if (!deleted) throw new InvalidTracking("Manual check-in not found");
        }
        if (outbox) {
          const needsRemoval = Boolean(outbox.traktHistoryId) || outbox.attempts > 0 ||
            outbox.state === "uncertain";
          await trx.updateTable("marqueeManualTraktOutbox")
            .set({ state: needsRemoval ? "remove_pending" : "removed", updatedAt: new Date() })
            .where("sourceEventKey", "=", outbox.sourceEventKey).execute();
          if (needsRemoval) outboundKey = outbox.sourceEventKey;
        }
      }
      await recalculateTitleProgress(trx, user.id, title.id);
    });

    let synced = false;
    let message = "Tracking saved.";
    if (outboundKey || outboundKeys.length) {
      try {
        const token = await tokenProvider(user.id);
        const states = [];
        for (const key of [...outboundKeys, ...(outboundKey ? [outboundKey] : [])]) {
          states.push(await writeback(user.id, key, token));
        }
        synced = states.every(state => state === "synced" || state === "removed");
        message = synced
          ? input.action === "moveEarlier"
            ? "Moved to Earlier watches. Trakt check-in removed."
            : trackingMessageOverride
              ? "Episode marked unwatched in Marquee. Manual Trakt check-ins were removed; imported source history remains preserved."
              : "Saved and synced with Trakt."
          : states.includes("mapping_needed") ? "Saved in Marquee. A verified Trakt episode match is needed."
          : states.includes("conflict") ? "Saved in Marquee. Review the matching Trakt history before syncing."
          : input.action === "moveEarlier"
            ? "Moved to Earlier watches. Trakt removal is pending and will retry."
            : "Saved in Marquee. Trakt sync is pending and will retry.";
      } catch (error) {
        console.error("Manual Trakt edit queued:", error);
        message = input.action === "moveEarlier"
          ? "Moved to Earlier watches. Trakt removal is pending and will retry."
          : "Saved in Marquee. Trakt sync is pending and will retry.";
      }
    } else if (trackingMessageOverride) {
      message = trackingMessageOverride;
    } else if (plannedQueued) {
      try {
        const token = await tokenProvider(user.id);
        await personalSync(user.id, token);
        synced = true;
        message = input.action === "viewing" ? "Viewing choice synced with Trakt." : "Plan to watch saved and synced to Trakt watchlist.";
      } catch (error) {
        console.error("Planned watchlist edit queued:", error);
        message = input.action === "viewing" ? "Viewing choice saved. Trakt sync will retry." : "Plan to watch saved. Trakt watchlist sync will retry.";
      }
    } else if (plannedUnmapped) {
      message = "Plan to watch saved in Marquee. A verified Trakt title match is needed.";
    } else if (input.action === "watchlistLocal") {
      message = input.saved ? "Added to Watch List in Marquee. Trakt match needed for sync." : "Removed from Watch List in Marquee.";
    } else if (input.action === "rating") {
      message = input.rating === null ? "Marquee rating removed." : "Rating saved only in Marquee. Trakt sync requires a verified title match.";
    } else if (input.action === "status" || input.action === "viewing") {
      message = "Status saved in Marquee.";
    }
    const response = new Response(
      superjson.stringify({ saved: true, synced, message, eventId: loggedEventId } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } }
    );
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    if(isMigrationWriterError(error))throw error;
    const status = error instanceof NotAuthenticatedError ? 401
      : error instanceof InvalidTracking ? 400 : 500;
    if (status === 500) console.error("Tracking change error:", error);
    return new Response(superjson.stringify({
      error: status === 401 ? "Not authenticated"
        : status === 400 ? (error as Error).message : "Unable to save tracking",
    }), { status, headers: { "Content-Type": "application/json" } });
  }
}


}
const handleRequest=createTrackingHandler();
export const handle = marqueeWriter.endpoint(handleRequest, "tracking_POST.ts", true); 