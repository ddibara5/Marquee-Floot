import { createHash, randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "./db";
import type {Transaction} from "kysely";
import type {DB} from "./schema";
import { recalculateTitleProgress } from "./recalculateTitleProgress";
import { recentCrunchyrollPlay, sameCrunchyrollEpisode, resumedCrunchyrollCompletion, trustedCrunchyrollTitle, uniqueCrunchyrollEpisode } from "./crunchyrollAutoMatch";

type HistoryItem = {
  id: string;
  date_played: string;
  fully_watched: boolean;
  parent_id?: string;
  panel?: {
    id?: string;
    title?: string;
    episode_metadata?: { identifier?: string; series_id?: string; episode_number?: number };
  };
  [key: string]: unknown;
};
export type Window = { accountId: string; events: HistoryItem[] };
const BASE = "https://www.crunchyroll.com";
const CLIENT_ID = "noaihdevm_6iyg0a8l0q";
// Digest from the previously reviewed Crunchyroll account in the legacy Marquee importer.
const REVIEWED_ACCOUNT_DIGEST = "74c1b81df688c8cb146890cedf0b90d6615db92b75b76599cc8868a765a178fc";
const EXCLUDED_SERIES = new Set(["GRMG8ZQZR", "G6DQDD3WR"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function completionId(eventId: string) {
  const h = digest("marquee:crunchyroll:" + eventId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function jsonRequest(url: string, init: RequestInit, stage: string) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  if (response.status === 403 && response.headers.get("cf-mitigated") === "challenge")
    throw new Error("Crunchyroll " + stage + " blocked by a browser challenge");
  if (response.status === 403 && response.headers.get("content-type")?.includes("text/html"))
    throw new Error("Crunchyroll " + stage + " blocked the server request");
  if (!response.ok) throw new Error("Crunchyroll " + stage + " failed (" + response.status + ")");
  try { return await response.json() as Record<string, unknown>; }
  catch { throw new Error("Crunchyroll response is not JSON"); }
}

function checkNext(next: unknown, accountId: string) {
  if (next === null || next === undefined || next === "") return null;
  const path = "/content/v1/watch-history/" + accountId;
  if (typeof next !== "string" || next.includes("#") ||
      !(next.startsWith(path + "?") || next.startsWith("?")))
    throw new Error("Crunchyroll pagination changed");
  const url = new URL(next.startsWith("?") ? path + next : next, BASE);
  if (url.origin !== BASE || url.pathname !== path)
    throw new Error("Crunchyroll pagination left the selected account");
  return url.toString();
}

async function fetchWindow(cookie: string): Promise<Window> {
  if (!cookie || /[\r\n;]/.test(cookie)) throw new Error("Crunchyroll cookie is missing or invalid");
  const form = new URLSearchParams({
    grant_type: "etp_rt_cookie", scope: "offline_access",
    device_id: randomUUID(), device_name: "Marquee Floot",
    device_type: "com.crunchyroll.desktop.windows",
  });
  const tokenResponse = await jsonRequest(BASE + "/auth/v1/token", {
    method: "POST", headers: {
      Authorization: "Basic " + Buffer.from(CLIENT_ID + ":").toString("base64"),
      Cookie: "etp_rt=" + cookie, "Content-Type": "application/x-www-form-urlencoded",
    }, body: form.toString(),
  }, "token exchange");
  const token = tokenResponse.access_token;
  if (typeof token !== "string" || !token) throw new Error("Crunchyroll token response changed");
  const auth = { Authorization: "Bearer " + token, Accept: "application/json" };
  const account = await jsonRequest(BASE + "/accounts/v1/me", { headers: auth }, "account lookup");
  const accountId = account.account_id;
  if (typeof accountId !== "string" || !/^[a-zA-Z0-9-]{10,128}$/.test(accountId))
    throw new Error("Crunchyroll account response changed");

  const path = "/content/v1/watch-history/" + accountId;
  let url: string | null = BASE + path + "?locale=en-US&page=1&page_size=20";
  const seenUrls = new Set<string>();
  const ids = new Set<string>();
  const events: HistoryItem[] = [];
  for (let page = 0; page < 20 && url; page++) {
    if (seenUrls.has(url)) throw new Error("Crunchyroll repeated a history page");
    seenUrls.add(url);
    const payload = await jsonRequest(url, { headers: auth }, "history page");
    const items = payload.items;
    if (!Array.isArray(items) || items.length > 20)
      throw new Error("Crunchyroll history page changed");
    for (const value of items) {
      const item = value as HistoryItem;
      if (!item || typeof item.id !== "string" || !item.id ||
          ids.has(item.id) || typeof item.date_played !== "string" ||
          !/^\d{4}-\d\d-\d\dT/.test(item.date_played) ||
          !Number.isFinite(Date.parse(item.date_played)) ||
          typeof item.fully_watched !== "boolean")
        throw new Error("Crunchyroll history event changed or repeated");
      ids.add(item.id);
      events.push(item);
    }
    url = checkNext(payload.next_page, accountId);
  }
  if (events.length < 40 || events.length > 400)
    throw new Error("Crunchyroll returned an incomplete recent window");
  return { accountId, events };
}

export type CrunchyrollResult = {
  mode: "preview" | "sync"; fetched: number; newEvents: number;
  mapped: number; held: number; profileReady: boolean;
  newDatedEvents?: number; newCompletions?: number; excluded?:number; partial?:number;
};
class ShadowRollback extends Error { constructor(public result: CrunchyrollResult){ super("SHADOW_ROLLBACK"); } }
export async function syncCrunchyroll(userId: number, mode: "preview" | "sync", supplied?: Window, shadow = false, audit?: {before?:(trx:Transaction<DB>)=>Promise<void>;after?:(trx:Transaction<DB>, result:CrunchyrollResult)=>Promise<void>}): Promise<CrunchyrollResult> {
  const run = await db.insertInto("marqueeCrunchyrollSyncRuns")
    .values({ userId, mode: shadow ? "shadow" : mode, status: "running" }).returning("id").executeTakeFirstOrThrow();
  try {
    const cookie = (process.env as Record<string, string | undefined>)["CRUNCHYROLL_ETP_RT"];
    if (!supplied && !cookie) throw new Error("Crunchyroll credential is not connected");
    const { accountId, events } = supplied ?? await fetchWindow(cookie!);
    const accountDigest = digest(accountId);
    if (supplied && accountDigest !== REVIEWED_ACCOUNT_DIGEST)
      throw new Error("Crunchyroll profile differs from the reviewed profile");
    let existing = await db.selectFrom("marqueeCrunchyrollSyncState")
      .selectAll().where("userId", "=", userId).executeTakeFirst();
    if (existing?.accountDigest && existing.accountDigest !== accountDigest)
      throw new Error("Crunchyroll profile differs from the reviewed profile");
    if (mode === "preview") {
      // Preview records only a hashed profile key. No source observations or completions are imported.
      await db.insertInto("marqueeCrunchyrollSyncState")
        .values({ userId, accountDigest, lastAttemptAt: new Date(), lastError: null })
        .onConflict(oc => oc.column("userId").doUpdateSet({
          accountDigest, lastAttemptAt: new Date(), lastError: null, updatedAt: new Date(),
        })).execute();
      await db.updateTable("marqueeCrunchyrollSyncRuns").set({
        status: "succeeded", finishedAt: new Date(), fetchedCount: events.length,
        newCount: 0, mappedCount: 0, heldCount: 0,
      }).where("id", "=", run.id).execute();
      return { mode, fetched: events.length, newEvents: 0, mapped: 0, held: 0,
        profileReady: Boolean(existing?.profileConfirmedAt) };
    }
    if (supplied && mode === "sync" && !existing?.profileConfirmedAt) {
      if(shadow) throw new Error("Confirm the Crunchyroll profile before importing");
      await db.insertInto("marqueeCrunchyrollSyncState").values({
        userId, accountDigest, profileConfirmedAt: new Date(), lastAttemptAt: new Date(),
      }).onConflict(oc => oc.column("userId").doUpdateSet({
        accountDigest, profileConfirmedAt: new Date(), updatedAt: new Date(),
      })).execute();
      existing = await db.selectFrom("marqueeCrunchyrollSyncState")
        .selectAll().where("userId", "=", userId).executeTakeFirst();
    }
    if (!existing?.profileConfirmedAt || existing.accountDigest !== accountDigest)
      throw new Error("Confirm the Crunchyroll profile before importing");

    const result = await db.transaction().execute(async trx => {
      // Lock the profile so manual and scheduled runs cannot advance the window concurrently.
      const locked = await trx.selectFrom("marqueeCrunchyrollSyncState")
        .selectAll().where("userId", "=", userId).forUpdate().executeTakeFirstOrThrow();
      if (locked.accountDigest !== accountDigest || !locked.profileConfirmedAt)
        throw new Error("Crunchyroll profile confirmation changed");
      const rawCount = await trx.selectFrom("marqueeCrunchyrollRaw")
        .select(eb => eb.fn.count<number>("id").as("n"))
        .where("userId", "=", userId).executeTakeFirstOrThrow();
      if (Number(rawCount.n) > 0) {
        const tail = events.slice(-40).map(event => event.id);
        const known = await trx.selectFrom("marqueeCrunchyrollRaw")
          .select("sourceEventId").where("userId", "=", userId)
          .where("sourceEventId", "in", tail).execute();
        if (known.length !== 40)
          throw new Error("Crunchyroll recent window missed the prior checkpoint");
      }
      if(audit?.before)await audit.before(trx);
      const ignoredRows=await sql<{itemKey:string}>`select item_key from public.marquee_enhancement_preferences where user_id=${userId} and item_key like 'review:cr:%' and value->>'ignored'='true'`.execute(trx);
      const ignoredIdentifiers=new Set(ignoredRows.rows.map(r=>r.itemKey.slice("review:cr:".length)));
      let newEvents = 0, mapped = 0, held = 0, newDatedEvents=0, newCompletions=0, excluded=0, partial=0;
      const touched = new Set<number>();
      const trustedSeries = new Map<string, number | null>();
      const trustedTitle = async (seriesId: string) => {
        if (trustedSeries.has(seriesId)) return trustedSeries.get(seriesId)!;
        const anchors = await trx.selectFrom("marqueeSourceMappings")
          .leftJoin("marqueeEpisodes", "marqueeEpisodes.id", "marqueeSourceMappings.episodeId")
          .leftJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
          .select(["marqueeSourceMappings.canonicalEntityType as kind", "marqueeSeasons.titleId as titleId"])
          .where("marqueeSourceMappings.source", "=", "crunchyroll")
          .where("marqueeSourceMappings.sourceEntityType", "=", "episode")
          .where("marqueeSourceMappings.sourceId", "like", seriesId + "|%")
          .where("marqueeSourceMappings.manualLocked", "=", true).execute();
        const titleId = trustedCrunchyrollTitle(anchors);
        trustedSeries.set(seriesId, titleId);
        return titleId;
      };
      for (const event of events) {
        const identifier = event.panel?.episode_metadata?.identifier ?? null;
        const seriesId = event.panel?.episode_metadata?.series_id ?? null;
        const parentId = event.parent_id ?? null;
        if (!seriesId && !parentId)
          throw new Error("Crunchyroll event has no series identity");
        const oldRow = await trx.selectFrom("marqueeCrunchyrollRaw")
          .select(["sourceDate", "sourceIdentifier", "sourceSeriesId", "classification", "firstSeenAt", sql<string>`payload::text`.as("sourcePayload")])
          .where("userId", "=", userId).where("sourceEventId", "=", event.id)
          .executeTakeFirst();
        // Read provider JSON as text: the DB camel-case plugin also transforms
        // nested JSON keys, but Crunchyroll's payload contract uses snake_case.
        const old = oldRow ? {...oldRow,payload:JSON.parse(oldRow.sourcePayload) as HistoryItem} : undefined;
        const changedIdentity = Boolean(old && !sameCrunchyrollEpisode(old.payload as HistoryItem,event));
        if (changedIdentity) {
          await trx.updateTable("marqueeCrunchyrollRaw")
            .set({ classification: "changed", lastSeenAt: new Date() })
            .where("userId", "=", userId).where("sourceEventId", "=", event.id).execute();
          held++;
          continue;
        }
        let classification = "held";
        let episodeId: number | null = null;
        if (EXCLUDED_SERIES.has(seriesId ?? "") || EXCLUDED_SERIES.has(parentId ?? ""))
          classification = "excluded";
        else if (identifier && ignoredIdentifiers.has(identifier)) classification = "excluded";
        else if (!event.fully_watched) classification = "partial";
        else if (identifier && seriesId && (!parentId || parentId === seriesId)) {
          let mapping = await trx.selectFrom("marqueeSourceMappings")
            .select(["episodeId", "canonicalEntityType"])
            .where("source", "=", "crunchyroll").where("sourceEntityType", "=", "episode")
            .where("sourceId", "=", identifier)
            .executeTakeFirst();
          if (!mapping) {
            const titleId = await trustedTitle(seriesId);
            const number = event.panel?.episode_metadata?.episode_number;
            const title = event.panel?.title;
            if (titleId) {
              const candidates = await trx.selectFrom("marqueeEpisodes")
                .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
                .select(["marqueeEpisodes.id as id", "marqueeEpisodes.episodeNumber as episodeNumber",
                  "marqueeEpisodes.displayTitle as title"])
                .where("marqueeSeasons.titleId", "=", titleId).execute();
              const match = uniqueCrunchyrollEpisode(
                candidates.filter((row): row is { id: number; episodeNumber: number; title: string } =>
                  row.episodeNumber !== null && row.title !== null), number, title);
              if (match) {
                await trx.insertInto("marqueeSourceMappings").values({
                  source: "crunchyroll", sourceEntityType: "episode", sourceId: identifier,
                  canonicalEntityType: "episode", episodeId: match, titleId: null, seasonId: null,
                  matchMethod: "exact_episode_title", ruleId: "trusted_series_title_number_v1",
                  confidence: "1", manualLocked: false,
                  notes: "Matched within a series anchored by three reviewed episodes; unique exact title and episode number.",
                }).onConflict(oc => oc.columns(["source", "sourceEntityType", "sourceId"])
                  .doNothing()).execute();
                mapping = await trx.selectFrom("marqueeSourceMappings")
                  .select(["episodeId", "canonicalEntityType"])
                  .where("source", "=", "crunchyroll").where("sourceEntityType", "=", "episode")
                  .where("sourceId", "=", identifier).executeTakeFirst();
              }
            }
          }
          if (mapping?.canonicalEntityType === "episode" && mapping.episodeId) {
            const target = await trx.selectFrom("marqueeEpisodes")
              .innerJoin("marqueeSeasons", "marqueeSeasons.id", "marqueeEpisodes.seasonId")
              .innerJoin("marqueeTitles", "marqueeTitles.id", "marqueeSeasons.titleId")
              .select(["marqueeSeasons.titleId as titleId", "marqueeTitles.displayTitle as title"])
              .where("marqueeEpisodes.id", "=", mapping.episodeId).executeTakeFirst();
            if (target && !["one piece", "fairy tail"].includes(target.title.toLowerCase())) {
              classification = "mapped"; episodeId = mapping.episodeId;
              touched.add(target.titleId);
            }
          }
        }
        if(classification==="excluded")excluded++;
        if(classification==="partial")partial++;
        if (!old) newEvents++;
        await trx.insertInto("marqueeCrunchyrollRaw").values({
          userId, sourceEventId: event.id, sourceDate: event.date_played,
          sourceIdentifier: identifier, sourceSeriesId: seriesId, sourceParentId: parentId,
          fullyWatched: event.fully_watched, payload: JSON.parse(JSON.stringify(event)),
          episodeId, classification,
        }).onConflict(oc => oc.columns(["userId", "sourceEventId"])
          .doUpdateSet({ lastSeenAt: new Date(), classification, episodeId,
            sourceDate:event.date_played,sourceIdentifier:identifier,sourceSeriesId:seriesId,
            sourceParentId:parentId,fullyWatched:event.fully_watched,payload:JSON.parse(JSON.stringify(event)) }))
          .execute();
        if (classification === "mapped" && episodeId) {
          const addedCompletions=await trx.insertInto("marqueeLegacyCompletions").values({
            sourceId: completionId(event.id), userId, episodeId, titleId: null,
          }).onConflict(oc => oc.doNothing()).returning("sourceId").execute();
          newCompletions+=addedCompletions.length;
          // A recently held observation can become dated once its identity
          // is resolved on the next import. Never re-date an already mapped play.
          const watchedAt = recentCrunchyrollPlay(event.date_played,
            existing.lastSuccessAt, new Date(), Boolean(old && !resumedCrunchyrollCompletion(old.payload as HistoryItem,event) && (old.classification !== "held" || !old.firstSeenAt || Date.parse(event.date_played) < old.firstSeenAt.getTime() - 48 * 3600000)));
          if (watchedAt) {
            const near = await trx.selectFrom("marqueeWatchEvents").select("id")
              .where("userId", "=", userId).where("episodeId", "=", episodeId)
              .where("watchedAt", ">=", new Date(watchedAt.getTime() - 4 * 3600000))
              .where("watchedAt", "<=", new Date(watchedAt.getTime() + 4 * 3600000))
              .executeTakeFirst();
            if (!near) { const addedDates=await trx.insertInto("marqueeWatchEvents").values({
              userId, episodeId, sourceEventKey: "crunchyroll:history_event:" + event.id,
              watchedAt, source: "crunchyroll",
            }).onConflict(oc => oc.column("sourceEventKey").doNothing()).returning("id").execute();
            newDatedEvents+=addedDates.length; }
          }
          if (identifier) await trx.deleteFrom("marqueeCrunchyrollReview")
            .where("userId", "=", userId).where("sourceIdentifier", "=", identifier).execute();
          mapped++;
        } else if (classification === "held") {
          held++;
          const key = identifier ?? "event:" + event.id;
          await trx.insertInto("marqueeCrunchyrollReview").values({
            userId, sourceIdentifier: key, reason: "Reviewed episode identity needed",
          }).onConflict(oc => oc.columns(["userId", "sourceIdentifier"])
            .doUpdateSet({ lastSeenAt: new Date() })).execute();
        }
      }
      for (const titleId of touched) await recalculateTitleProgress(trx, userId, titleId);
      await trx.updateTable("marqueeCrunchyrollSyncState").set({
        lastSuccessAt: new Date(), lastAttemptAt: new Date(),
        lastFetchedCount: events.length, lastNewCount: newEvents,
        lastError: null, updatedAt: new Date(),
      }).where("userId", "=", userId).execute();
      await trx.updateTable("marqueeCrunchyrollSyncRuns").set({
        status: "succeeded", finishedAt: new Date(), fetchedCount: events.length,
        newCount: newEvents, mappedCount: mapped, heldCount: held,
      }).where("id", "=", run.id).execute();
      const outcome = { mode, fetched: events.length, newEvents, mapped, held,
        profileReady: true, newDatedEvents, newCompletions, excluded, partial } satisfies CrunchyrollResult;
      if(audit?.after)await audit.after(trx,outcome);
      if (shadow) throw new ShadowRollback(outcome);
      return outcome;
    });
    return result;
  } catch (error) {
    if(error instanceof ShadowRollback){
      await db.updateTable("marqueeCrunchyrollSyncRuns").set({status:"succeeded",finishedAt:new Date(),fetchedCount:error.result.fetched,newCount:error.result.newEvents,mappedCount:error.result.mapped,heldCount:error.result.held}).where("id","=",run.id).execute();
      return error.result;
    }
    const rawMessage = error instanceof Error ? error.message : "";
    if(audit)console.error("CR_ROLLBACK_AUDIT_FAILED");
    const message = /^(Crunchyroll |Confirm the Crunchyroll|Reviewed episode|Source episode|FIXTURE_[A-Z_]+$)/.test(rawMessage)
      ? rawMessage : "Crunchyroll sync failed during storage";
    await db.updateTable("marqueeCrunchyrollSyncRuns").set({
      status: "failed", finishedAt: new Date(), errorSummary: message.slice(0, 240),
    }).where("id", "=", run.id).execute();
    if(!shadow)await db.insertInto("marqueeCrunchyrollSyncState")
      .values({ userId, lastAttemptAt: new Date(), lastError: message.slice(0, 240) })
      .onConflict(oc => oc.column("userId").doUpdateSet({
        lastAttemptAt: new Date(), lastError: message.slice(0, 240), updatedAt: new Date(),
      })).execute();
    throw new Error(message);
  }
}
