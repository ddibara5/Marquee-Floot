import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { marqueeLegacyLock } from "../helpers/marqueeLegacyLock";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import { syncTraktHistory } from "../helpers/traktSync";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const result = await marqueeLegacyLock("trakt", () => syncTraktHistory(user.id));

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

    const status = message.includes("duplicate key")
      ? 409
      : message.includes("not connected")
        ? 400
        : 500;

    return new Response(superjson.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "trakt-sync_POST.ts", true);
