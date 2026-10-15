import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import type { OutputType } from "./trakt-status_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);

    const [oauth, pending, state, latestRun, personal] = await Promise.all([
      db
        .selectFrom("marqueeTraktOauth")
        .select(["expiresAt"])
        .where("userId", "=", user.id)
        .executeTakeFirst(),
      db
        .selectFrom("marqueeTraktDeviceAuth")
        .select(["userCode", "verificationUrl", "expiresAt"])
        .where("userId", "=", user.id)
        .executeTakeFirst(),
      db
        .selectFrom("marqueeTraktSyncState")
        .select(["lastSyncAt", "lastHistoryAt", "lastError"])
        .where("userId", "=", user.id)
        .executeTakeFirst(),
      db
        .selectFrom("marqueeTraktSyncRuns")
        .selectAll()
        .where("userId", "=", user.id)
        .orderBy("startedAt", "desc")
        .executeTakeFirst(),
      db.selectFrom("marqueeTraktPersonalSyncState").selectAll()
        .where("userId","=",user.id).executeTakeFirst(),
    ]);

    const activePending =
      pending && pending.expiresAt.getTime() > Date.now()
        ? {
            userCode: pending.userCode,
            verificationUrl: pending.verificationUrl,
            expiresAt: pending.expiresAt,
          }
        : null;

    const payload: OutputType = {
      connected: Boolean(oauth),
      tokenExpiresAt: oauth?.expiresAt ?? null,
      awaiting: activePending,
      lastSyncAt: state?.lastSyncAt ?? null,
      lastHistoryAt: state?.lastHistoryAt ?? null,
      lastError: state?.lastError ?? null,
      latestRun: latestRun
        ? {
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            finishedAt: latestRun.finishedAt,
            fetched: latestRun.fetchedCount,
            inserted: latestRun.insertedCount,
            updated: latestRun.updatedCount,
            skipped: latestRun.skippedCount,
            unmapped: latestRun.unmappedCount,
            error: latestRun.errorSummary,
          }
        : null,
      personal: personal ? {
        lastSuccessAt: personal.lastSuccessAt,
        lastError: personal.lastError,
        watchlistCount: personal.watchlistCount,
        ratingsCount: personal.ratingsCount,
      } : null,
    };

    const response = new Response(superjson.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });

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

    console.error("Trakt status error:", error);
    return new Response(
      superjson.stringify({
        error: error instanceof Error ? error.message : "Unable to load Trakt status",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "trakt-status_GET.ts", true);
