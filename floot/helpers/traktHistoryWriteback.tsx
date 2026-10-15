import {marqueeWriter} from "./marqueeWriter";
import { db } from "./db";
import { fetchTraktHistory, type TraktHistoryItem } from "./traktApi";

export function createTraktHistoryWriteback(database:typeof db=db, transport:typeof fetch=fetch, history:typeof fetchTraktHistory=fetchTraktHistory) {
const headers = (token: string) => ({
  Authorization: "Bearer " + token,
  "trakt-api-version": "2",
  "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
  "User-Agent": "MarqueeFloot/1.0 (https://marquee-ddibara.floot.app)",
  Accept: "application/json",
  "Content-Type": "application/json",
});

async function resolveEpisodeId(episodeId: number, titleId: number, token: string) {
  const known = await database.selectFrom("marqueeTraktMappings")
    .select(["traktId"]).where("entityType", "=", "episode")
    .where("episodeId", "=", episodeId).executeTakeFirst();
  if (known) return known.traktId;

  const episode = await database.selectFrom("marqueeEpisodes")
    .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
    .select(["marqueeEpisodes.episodeNumber as number", "marqueeEpisodes.tmdbId as tmdbId",
      "marqueeSeasons.seasonNumber as seasonNumber"])
    .where("marqueeEpisodes.id", "=", episodeId)
    .where("marqueeSeasons.titleId", "=", titleId).executeTakeFirst();
  const show = await database.selectFrom("marqueeTraktMappings")
    .select(["traktId"]).where("entityType", "=", "show")
    .where("titleId", "=", titleId).executeTakeFirst();
  if (!episode?.number || episode.seasonNumber === null || !show) return null;
  const path = "/shows/" + show.traktId + "/seasons/" +
    episode.seasonNumber + "/episodes/" + episode.number;
  const response = await transport("https://api.trakt.tv" + path, { headers: headers(token) });
  if (!response.ok) throw new Error("Trakt episode identity lookup failed (" + response.status + ")");
  const remote = await response.json() as { season?: number; number?: number; ids?: { trakt?: number; tmdb?: number } };
  if (remote.season !== episode.seasonNumber || remote.number !== episode.number ||
      !remote.ids?.trakt || (episode.tmdbId && remote.ids.tmdb &&
        episode.tmdbId !== remote.ids.tmdb)) return null;
  await database.insertInto("marqueeTraktMappings").values({
    entityType: "episode", traktId: String(remote.ids.trakt),
    titleId: null, episodeId, tmdbId: remote.ids.tmdb ?? null,
  }).onConflict(oc => oc.columns(["entityType", "traktId"]).doNothing()).execute();
  const verified = await database.selectFrom("marqueeTraktMappings")
    .select(["episodeId"]).where("entityType", "=", "episode")
    .where("traktId", "=", String(remote.ids.trakt)).executeTakeFirst();
  return verified?.episodeId === episodeId ? String(remote.ids.trakt) : null;
}

async function remoteMatches(token: string, row: {
  kind: string; traktId: string | null; watchedAt: Date;
}) {
  if (!row.traktId) return [];
  // Trakt history currently reports watched_at at minute precision.
  const minute = Math.floor(row.watchedAt.getTime() / 60000);
  const start = new Date(minute * 60000 - 1000);
  const items = await history(token, row.kind === "movie" ? "movies" : "episodes", start);
  return items.filter((item: TraktHistoryItem) =>
    String(row.kind === "movie" ? item.movie?.ids.trakt : item.episode?.ids.trakt) === row.traktId &&
    Math.floor(new Date(item.watched_at).getTime() / 60000) === minute
  );
}

async function updateState(key: string, state: string, values: {
  traktHistoryId?: string | null; traktId?: string | null; lastError?: string | null;
} = {}) {
  let query = database.updateTable("marqueeManualTraktOutbox")
    .set({ state, ...values, updatedAt: new Date() })
    .where("sourceEventKey", "=", key);
  if (state === "uncertain" || state === "conflict")
    query = query.where("state", "not in", ["remove_pending", "removed"]);
  await query.execute();
}

async function confirmAdd(userId: number, key: string, historyId: string, token: string): Promise<string> {
  const row = await database.updateTable("marqueeManualTraktOutbox")
    .set({ traktHistoryId: historyId, updatedAt: new Date() })
    .where("sourceEventKey", "=", key)
    .returning(["kind", "state"]).executeTakeFirstOrThrow();
  if (row.state === "removed") {
    await updateState(key, "remove_pending");
    return syncManualTraktEvent(userId, key, token);
  }
  if (row.state === "remove_pending")
    return syncManualTraktEvent(userId, key, token);
  await database.updateTable("marqueeManualTraktOutbox")
    .set({ state: "synced", lastError: null, updatedAt: new Date() })
    .where("sourceEventKey", "=", key).where("state", "=", "uncertain").execute();
  await database.deleteFrom(row.kind === "movie" ? "marqueeTitleWatchEvents" : "marqueeWatchEvents")
    .where("sourceEventKey", "=", "trakt:" + row.kind + ":" + historyId)
    .where("source", "=", "trakt").execute();
  return "synced";
}

async function syncManualTraktEvent(userId: number, key: string, token: string): Promise<string> {
  const row = await database.selectFrom("marqueeManualTraktOutbox")
    .selectAll().where("userId", "=", userId)
    .where("sourceEventKey", "=", key).executeTakeFirst();
  if (!row || row.state === "removed" || row.state === "synced" || row.state === "conflict")
    return row?.state ?? "removed";
  const oldAttemptedAt = row.attemptedAt;

  try {
    let traktId = row.traktId;
    if (!traktId && row.kind === "episode" && row.episodeId)
      traktId = await resolveEpisodeId(row.episodeId, row.titleId, token);
    if (!traktId && row.kind === "movie") {
      const mapping = await database.selectFrom("marqueeTraktMappings")
        .select(["traktId"]).where("entityType", "=", "movie")
        .where("titleId", "=", row.titleId).executeTakeFirst();
      traktId = mapping?.traktId ?? null;
    }
    if (!traktId && row.state !== "remove_pending") {
      await updateState(key, "mapping_needed", { lastError: "Verified Trakt ID needed" });
      return "mapping_needed";
    }
    if (traktId && !row.traktId)
      await database.updateTable("marqueeManualTraktOutbox")
        .set({ traktId, updatedAt: new Date() })
        .where("sourceEventKey", "=", key).execute();
    const candidate = { kind: row.kind, traktId, watchedAt: row.watchedAt };
    if (row.state === "remove_pending") {
      const matches = row.traktHistoryId ? [] : await remoteMatches(token, candidate);
      if (!row.traktHistoryId && matches.length > 1)
        throw new Error("Multiple Trakt plays match this check-in; manual review needed");
      const historyId = row.traktHistoryId ?? (row.attempts > 0 ? String(matches[0]?.id ?? "") : "");
      if (historyId) {
        const response = await transport("https://api.trakt.tv/sync/history/remove", {
          method: "POST", headers: headers(token),
          body: JSON.stringify({ ids: [Number(historyId)] }),
        });
        if (!response.ok) throw new Error("Trakt history removal failed (" + response.status + ")");
        await database.deleteFrom(row.kind === "movie" ? "marqueeTitleWatchEvents" : "marqueeWatchEvents")
          .where("sourceEventKey", "=", "trakt:" + row.kind + ":" + historyId)
          .where("source", "=", "trakt").execute();
      } else if (row.attempts > 0 && oldAttemptedAt &&
                 Date.now() - oldAttemptedAt.getTime() < 120000) return "remove_pending";
      await updateState(key, "removed", { lastError: null });
      return "removed";
    }

    // Claim the row before any network call so concurrent syncs cannot send it twice.
    const claimed = await database.updateTable("marqueeManualTraktOutbox")
      .set({ state: "uncertain", attemptedAt: new Date(), updatedAt: new Date() })
      .where("sourceEventKey", "=", key).where("state", "=", row.state)
      .returning("sourceEventKey").executeTakeFirst();
    if (!claimed) return "uncertain";
    const matches = await remoteMatches(token, candidate);
    if (matches.length > 1) {
      await updateState(key, "conflict", { lastError: "Multiple Trakt plays match this time" });
      return "conflict";
    }
    if (matches.length === 1) {
      if (row.attempts === 0) {
        await updateState(key, "conflict", { lastError: "A Trakt play already exists at this time" });
        return "conflict";
      }
      const historyId = String(matches[0].id);
      return confirmAdd(userId, key, historyId, token);
    }
    if (row.attempts > 0 && oldAttemptedAt &&
        Date.now() - oldAttemptedAt.getTime() < 120000) return "uncertain";
    const stillAdding = await database.selectFrom("marqueeManualTraktOutbox")
      .select("state").where("sourceEventKey", "=", key).executeTakeFirst();
    if (stillAdding?.state === "remove_pending")
      return syncManualTraktEvent(userId, key, token);
    await database.updateTable("marqueeManualTraktOutbox")
      .set({ attempts: row.attempts + 1, attemptedAt: new Date(), updatedAt: new Date() })
      .where("sourceEventKey", "=", key).execute();
    const media = row.kind === "movie" ? "movies" : "episodes";
    const response = await transport("https://api.trakt.tv/sync/history", {
      method: "POST", headers: headers(token),
      body: JSON.stringify({ [media]: [{
        ids: { trakt: Number(traktId) }, watched_at: row.watchedAt.toISOString(),
      }] }),
    });
    if (!response.ok) throw new Error("Trakt history add failed (" + response.status + ")");
    const result = await response.json() as {
      added?: Record<string, number>; not_found?: Record<string, unknown[]>;
    };
    if (result.added?.[media] !== 1 || result.not_found?.[media]?.length)
      throw new Error("Trakt did not confirm the history addition");
    const confirmed = await remoteMatches(token, candidate);
    if (confirmed.length !== 1) {
      await updateState(key, "uncertain", {
        lastError: "Trakt accepted the play; awaiting history ID confirmation",
      });
      const latest = await database.selectFrom("marqueeManualTraktOutbox")
        .select("state").where("sourceEventKey", "=", key).executeTakeFirst();
      return latest?.state ?? "uncertain";
    }
    const historyId = String(confirmed[0].id);
    return confirmAdd(userId, key, historyId, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trakt history sync failed";
    await updateState(key, row.state === "remove_pending" ? "remove_pending" : "uncertain",
      { lastError: message.slice(0, 300) });
    const latest = await database.selectFrom("marqueeManualTraktOutbox")
      .select("state").where("sourceEventKey", "=", key).executeTakeFirst();
    return latest?.state ?? "uncertain";
  }
}

async function syncPendingManualTraktEvents(userId: number, token: string) {
  const rows = await database.selectFrom("marqueeManualTraktOutbox")
    .select(["sourceEventKey"]).where("userId", "=", userId)
    .where("state", "in", ["pending", "mapping_needed", "uncertain", "remove_pending"])
    .orderBy("createdAt", "asc").limit(30).execute();
  for (const row of rows) await syncManualTraktEvent(userId, row.sourceEventKey, token);
}
return {syncManualTraktEvent,syncPendingManualTraktEvents};
}
const defaultWriteback=createTraktHistoryWriteback();
export const syncManualTraktEvent=(userId:number,key:string,token:string)=>marqueeWriter.work("provider:trakt-writeback",()=>defaultWriteback.syncManualTraktEvent(userId,key,token));
export const syncPendingManualTraktEvents=(userId:number,token:string)=>marqueeWriter.work("provider:trakt-writeback-batch",()=>defaultWriteback.syncPendingManualTraktEvents(userId,token));