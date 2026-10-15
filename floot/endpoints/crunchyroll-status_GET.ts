import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { OutputType } from "./crunchyroll-status_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const [state, review] = await Promise.all([
      db.selectFrom("marqueeCrunchyrollSyncState").selectAll()
        .where("userId", "=", user.id).executeTakeFirst(),
      db.selectFrom("marqueeCrunchyrollReview")
        .select(eb => eb.fn.count<number>("sourceIdentifier").as("n"))
        .where("userId", "=", user.id).executeTakeFirst(),
    ]);
    const response = new Response(superjson.stringify({
      connected: Boolean((process.env as Record<string, string | undefined>)["CRUNCHYROLL_ETP_RT"]),
      profileReady: Boolean(state?.profileConfirmedAt),
      lastSuccessAt: state?.lastSuccessAt ?? null,
      lastAttemptAt: state?.lastAttemptAt ?? null,
      lastError: state?.lastError ?? null,
      fetched: state?.lastFetchedCount ?? null,
      newEvents: state?.lastNewCount ?? null,
      held: Number(review?.n ?? 0),
    } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to load Crunchyroll status",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500 });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "crunchyroll-status_GET.ts", true);
