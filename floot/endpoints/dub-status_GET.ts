import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError, setServerSession } from "../helpers/getSetServerSession";
import type { OutputType } from "./dub-status_GET.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    // A stale check (the daily job stopped) shows no badge rather than an old answer.
    const rows = await sql<{ titleId: number; hasEnDub: boolean }>`
      SELECT title_id AS "titleId", has_en_dub AS "hasEnDub" FROM marquee_crunchyroll_dubs
      WHERE user_id = ${user.id} AND has_en_dub IS NOT NULL AND checked_at >= now() - interval '3 days'`.execute(db);
    const response = new Response(superjson.stringify({ dubs: rows.rows } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } });
    await setServerSession(response, {
      id: session.id, createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });
    return response;
  } catch (error) {
    return new Response(superjson.stringify({
      error: error instanceof NotAuthenticatedError ? "Not authenticated" : "Unable to load dub status",
    }), { status: error instanceof NotAuthenticatedError ? 401 : 500,
      headers: { "Content-Type": "application/json" } });
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "dub-status_GET.ts", true);
