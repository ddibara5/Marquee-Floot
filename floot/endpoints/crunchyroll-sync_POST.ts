import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { marqueeLegacyLock } from "../helpers/marqueeLegacyLock";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import { syncCrunchyroll } from "../helpers/crunchyrollSync";
import { schema, type OutputType } from "./crunchyroll-sync_POST.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const input = schema.parse(superjson.parse(await request.text()));
    let output: OutputType;
    if (input.action === "confirm") {
      const preview = await db.selectFrom("marqueeCrunchyrollSyncRuns")
        .select(["status", "fetchedCount"]).where("userId", "=", user.id)
        .where("mode", "=", "preview").orderBy("startedAt", "desc")
        .executeTakeFirst();
      const state = await db.selectFrom("marqueeCrunchyrollSyncState")
        .select(["accountDigest"]).where("userId", "=", user.id).executeTakeFirst();
      if (preview?.status !== "succeeded" || !preview.fetchedCount || !state?.accountDigest)
        throw new Error("Run a successful Crunchyroll profile preview first");
      await db.updateTable("marqueeCrunchyrollSyncState")
        .set({ profileConfirmedAt: new Date(), updatedAt: new Date() })
        .where("userId", "=", user.id).where("accountDigest", "=", state.accountDigest)
        .execute();
      output = { saved: true, mode: "confirm", profileReady: true };
    } else {
      const action = input.action;
      const result = await marqueeLegacyLock("crunchyroll", () => syncCrunchyroll(user.id, action));
      output = { saved: true, ...result };
    }
    const response = new Response(superjson.stringify(output), {
      headers: { "Content-Type": "application/json" },
    });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    const unauthorized = error instanceof NotAuthenticatedError;
    const message = unauthorized ? "Not authenticated" :
      error instanceof Error ? error.message : "Crunchyroll sync failed";
    return new Response(superjson.stringify({ error: message }), {
      status: unauthorized ? 401 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "crunchyroll-sync_POST.ts", true);
