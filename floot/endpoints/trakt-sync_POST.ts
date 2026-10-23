import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { marqueeLegacyLock } from "../helpers/marqueeLegacyLock";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import { syncTraktHistory } from "../helpers/traktSync";
import { runTraktSync, traktSyncErrorStatus } from "../helpers/traktSyncGate";

async function handleRequest(request: Request) {
  try {
    const { user, session, isBot } = await getServerUserSession(request);
    // AF-20261023-03: the automation account gets a result with nothing synced (helpers/traktSyncGate).
    const result = await runTraktSync(isBot, () => marqueeLegacyLock("trakt", () => syncTraktHistory(user.id)));

    const response = new Response(superjson.stringify(result), {
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

    console.error("Trakt sync error:", error);
    const message =
      error instanceof Error ? error.message : "Unable to sync Trakt history";

    const status = traktSyncErrorStatus(message);

    return new Response(superjson.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "trakt-sync_POST.ts", true);
